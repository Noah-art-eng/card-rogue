import type { Server, Socket } from 'socket.io'

import {
  advanceRogueLayer,
  confirmPlay,
  enterPlay,
  enterShuffle,
  resolveAnimationComplete,
  restoreRogueCheckpoint,
  selectCard,
  shuffleCards,
  startPveGameSetup,
  useSkill,
} from '../pve/actions.js'
import type { SkillId, UseSkillOptions } from '../types/state.js'
import { normalizeLayer } from '../pve/layerConfig.js'
import { createRoom, getRoom, isRogueRoom, removeRoom, updateRoom } from '../pve/runtime.js'
import { archiveGameIfEnded } from '../services/matchArchive.js'
import {
  FIRST_LAYER_UPGRADES,
  ONE_TIME_BUFF_TYPES,
  generateUpgradePool,
} from '../types/buff.js'
import type { Buff } from '../types/buff.js'
import { BattleResult, type GameContext } from '../types/state.js'
import type { Element } from '../types/card.js'
import { Element as ElementEnum } from '../types/card.js'
import type { AccessTokenPayload } from '../utils/jwt.js'

// 将服务端游戏上下文裁剪为可通过 Socket.IO 同步给客户端的状态。
function toGameState(context: GameContext) {
  return {
    roomId: context.roomId,
    userId: context.userId,
    layer: context.layer,
    round: context.round,
    phase: context.phase,
    player: context.player,
    boss: context.boss,
    bossRound: context.bossRound,
    deck: context.deck,
    discardPile: context.discardPile,
    hand: context.hand,
    play: context.play,
    roundState: context.roundState,
    battleResult: context.battleResult,
    rogueMode: context.rogueMode ?? false,
    roguePhase: context.roguePhase ?? null,
    deckCount: context.deck.length,
    discardCount: context.discardPile.length,
  }
}

// 向当前 Socket 客户端发送最新游戏状态。
function emitGameState(socket: Socket, context: GameContext): void {
  socket.emit('gameState', toGameState(context))
}

// 获取、计算或校验 UserRoomId。
function getUserRoomId(userId: string): string {
  return `pve-${userId}`
}

// 处理 SocketError 事件。
function handleSocketError(socket: Socket, error: unknown): void {
  const message = error instanceof Error ? error.message : 'PvE action failed'
  socket.emit('gameError', { message })
}

// 注册 PvE/肉鸽模式的 Socket.IO 事件处理器。
export function registerPveHandlers(_io: Server, socket: Socket): void {
  const user = socket.data.user as AccessTokenPayload
  const roomId = getUserRoomId(user.userId)

  // 处理 startPveGame 事件：重建 PvE 房间并同步初始游戏状态。
  socket.on('startPveGame', (payload?: { layer?: number }) => {
    try {
      if (getRoom(roomId)) {
        removeRoom(roomId)
      }

      const layer = normalizeLayer(payload?.layer)
      let context = createRoom(roomId, user.userId, layer, false)
      context = startPveGameSetup(context)
      updateRoom(roomId, context)

      void socket.join(roomId)
      emitGameState(socket, context)
    } catch (error) {
      handleSocketError(socket, error)
    }
  })

  // 处理 startRogueGame 事件：创建新的肉鸽模式房间并同步状态。
  socket.on('startRogueGame', () => {
    try {
      if (getRoom(roomId)) {
        removeRoom(roomId)
      }

      let context = createRoom(roomId, user.userId, 1, true)
      context = startPveGameSetup(context)
      updateRoom(roomId, context)

      void socket.join(roomId)
      emitGameState(socket, context)
    } catch (error) {
      handleSocketError(socket, error)
    }
  })

  // 处理 selectCard 事件：更新玩家本回合选择并向客户端同步状态。
  socket.on('selectCard', (payload: { cardId?: string }) => {
    try {
      const context = getRoom(roomId)
      if (!context) {
        throw new Error('PvE room not found')
      }

      if (!payload?.cardId) {
        throw new Error('cardId is required')
      }

      const nextContext = selectCard(context, payload.cardId)
      updateRoom(roomId, nextContext)
      emitGameState(socket, nextContext)
    } catch (error) {
      handleSocketError(socket, error)
    }
  })

  // 处理 confirmPlay 事件：结算出牌，并在需要时归档已结束对局。
  socket.on('confirmPlay', () => {
    // 异步完成出牌结算、战绩持久化与胜利事件同步。
    void (async () => {
      try {
        const context = getRoom(roomId)
        if (!context) {
          throw new Error('PvE room not found')
        }

        let nextContext = confirmPlay(context)

        if (nextContext.rogueMode && nextContext.roguePhase === 'UPGRADE') {
          updateRoom(roomId, nextContext)
          socket.emit('battleWin', { layer: nextContext.layer })
          emitGameState(socket, nextContext)
          return
        }

        nextContext = await archiveGameIfEnded(nextContext)
        updateRoom(roomId, nextContext)

        if (nextContext.battleResult === BattleResult.WIN) {
          socket.emit('battleWin', {
            message: 'Boss defeated',
            layer: nextContext.layer,
            gameState: toGameState(nextContext),
          })
        }

        emitGameState(socket, nextContext)
      } catch (error) {
        handleSocketError(socket, error)
      }
    })()
  })

  // 处理 resolveAnimationComplete 事件：在攻击动画完成后推进回合状态。
  socket.on('resolveAnimationComplete', () => {
    // 异步完成动画结算、战绩持久化与失败事件同步。
    void (async () => {
      try {
        const context = getRoom(roomId)
        if (!context) {
          throw new Error('PvE room not found')
        }

        const resolvedContext = resolveAnimationComplete(context)
        if (!resolvedContext) {
          return
        }

        const nextContext = await archiveGameIfEnded(resolvedContext)
        updateRoom(roomId, nextContext)

        if (nextContext.battleResult === BattleResult.LOSE) {
          socket.emit('battleLose', {
            message: 'Player defeated',
            layer: nextContext.layer,
            gameState: toGameState(nextContext),
          })
        }

        emitGameState(socket, nextContext)
      } catch (error) {
        handleSocketError(socket, error)
      }
    })()
  })

  // 处理 useSkill 事件：校验技能参数、应用技能效果并同步状态。
  socket.on('useSkill', (payload: UseSkillOptions & { skillId?: SkillId }) => {
    try {
      const context = getRoom(roomId)
      if (!context) {
        throw new Error('PvE room not found')
      }

      if (!payload?.skillId) {
        throw new Error('skillId is required')
      }

      const { skillId, cardId, targetElement, targetRank } = payload
      const nextContext = useSkill(context, skillId, { cardId, targetElement, targetRank })
      updateRoom(roomId, nextContext)
      emitGameState(socket, nextContext)
    } catch (error) {
      handleSocketError(socket, error)
    }
  })

  // 处理 enterShuffle 事件：进入洗牌阶段并同步状态。
  socket.on('enterShuffle', () => {
    try {
      const context = getRoom(roomId)
      if (!context) {
        throw new Error('PvE room not found')
      }

      const nextContext = enterShuffle(context)
      updateRoom(roomId, nextContext)
      emitGameState(socket, nextContext)
    } catch (error) {
      handleSocketError(socket, error)
    }
  })

  // 处理 shuffleCards 事件：执行洗牌操作并同步状态。
  socket.on('shuffleCards', () => {
    try {
      const context = getRoom(roomId)
      if (!context) {
        throw new Error('PvE room not found')
      }

      const nextContext = shuffleCards(context)
      updateRoom(roomId, nextContext)
      emitGameState(socket, nextContext)
    } catch (error) {
      handleSocketError(socket, error)
    }
  })

  // 处理 enterPlay 事件：进入出牌阶段并同步状态。
  socket.on('enterPlay', () => {
    try {
      const context = getRoom(roomId)
      if (!context) {
        throw new Error('PvE room not found')
      }

      const nextContext = enterPlay(context)
      updateRoom(roomId, nextContext)
      emitGameState(socket, nextContext)
    } catch (error) {
      handleSocketError(socket, error)
    }
  })

  // 处理 upgradePhaseReady 事件：生成当前肉鸽层可选强化项。
  socket.on('upgradePhaseReady', () => {
    try {
      const context = getRoom(roomId)
      if (!context) {
        throw new Error('Room not found')
      }
      if (!isRogueRoom(roomId)) {
        throw new Error('Not a rogue session')
      }
      if (context.roguePhase !== 'UPGRADE') {
        throw new Error('Not in upgrade phase')
      }

      const layer = context.layer
      const elementOrder: Element[] = [ElementEnum.WATER, ElementEnum.FIRE, ElementEnum.GRASS]
      const chosenElement =
        context.player.chosenElement ?? elementOrder[(layer - 1) % elementOrder.length]
      const ownedOneTimeTypes = (context.player.buffs ?? [])
        .filter((buff) => ONE_TIME_BUFF_TYPES.has(buff.type))
        .map((buff) => buff.type)
      const options =
        layer === 1
          ? FIRST_LAYER_UPGRADES
          : generateUpgradePool(chosenElement, layer, ownedOneTimeTypes)

      socket.emit('upgradeOptions', { options })
    } catch (error) {
      handleSocketError(socket, error)
    }
  })

  // 处理 advanceLayer 事件：应用强化并初始化下一肉鸽层。
  socket.on('advanceLayer', (payload?: { shuffleCount?: number; buffs?: Buff[] }) => {
    try {
      const context = getRoom(roomId)
      if (!context) {
        throw new Error('Room not found')
      }
      if (!isRogueRoom(roomId)) {
        throw new Error('Not a rogue session')
      }

      const incoming = Array.isArray(payload?.buffs) ? payload.buffs : []
      const nextContext = advanceRogueLayer(context, incoming)
      updateRoom(roomId, nextContext)
      emitGameState(socket, nextContext)
    } catch (error) {
      handleSocketError(socket, error)
    }
  })

  // 处理 restoreFromCheckpoint 事件：从肉鸽存档检查点恢复战斗状态。
  socket.on(
    'restoreFromCheckpoint',
    (payload: {
      layer: number
      playerHp: number
      bossHp: number
      buffs?: Buff[]
      shuffleCount?: number
      fullHeal?: boolean
    }) => {
      try {
        const context = getRoom(roomId)
        if (!context) {
          throw new Error('Room not found')
        }
        if (!isRogueRoom(roomId)) {
          throw new Error('Not a rogue session')
        }

        const nextContext = restoreRogueCheckpoint(context, payload)
        updateRoom(roomId, nextContext)
        emitGameState(socket, nextContext)
      } catch (error) {
        handleSocketError(socket, error)
      }
    },
  )

  // 处理 disconnect 事件：将断开的客户端离开其游戏房间。
  socket.on('disconnect', () => {
    if (socket.rooms.has(roomId)) {
      void socket.leave(roomId)
    }
  })
}
