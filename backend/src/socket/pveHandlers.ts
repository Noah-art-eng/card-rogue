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

function emitGameState(socket: Socket, context: GameContext): void {
  socket.emit('gameState', toGameState(context))
}

function getUserRoomId(userId: string): string {
  return `pve-${userId}`
}

function handleSocketError(socket: Socket, error: unknown): void {
  const message = error instanceof Error ? error.message : 'PvE action failed'
  socket.emit('gameError', { message })
}

export function registerPveHandlers(_io: Server, socket: Socket): void {
  const user = socket.data.user as AccessTokenPayload
  const roomId = getUserRoomId(user.userId)

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

  socket.on('confirmPlay', () => {
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

  socket.on('resolveAnimationComplete', () => {
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

  socket.on('disconnect', () => {
    if (socket.rooms.has(roomId)) {
      void socket.leave(roomId)
    }
  })
}
