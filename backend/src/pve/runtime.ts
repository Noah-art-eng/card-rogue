/**
 * PvE 实时房间的内存状态管理。
 * 玩家手牌、Boss、血量和回合暂存在当前进程，Socket 事件不断读取和更新这些房间；MongoDB 只保存肉鸽存档和已结束战绩。
 */

import {
  BattleResult,
  RoundPhase,
  type GameContext,
} from '../types/state.js'
import { createBossForLayer } from './bossConfig.js'
import { createInitialBossRound } from './boss.js'
import { playerHpForLayer } from './layerConfig.js'
import { createInitialRoundState } from './roundState.js'

// 实时战斗状态只保存在当前进程，存档和对局记录才写入 MongoDB。
const rooms = new Map<string, GameContext>()

// 创建一局 PvE 的初始上下文，按层数准备玩家血量、Boss、牌堆和首回合状态。
function createInitialContext(roomId: string, userId: string, layer = 1, rogueMode = false): GameContext {
  const roundedLayer = Math.max(1, Math.floor(layer))
  const playerHp = playerHpForLayer(roundedLayer)

  return {
    roomId,
    userId,
    layer: roundedLayer,
    round: 1,
    phase: RoundPhase.DRAW,
    player: {
      hp: playerHp,
      maxHp: playerHp,
      buffs: [],
    },
    boss: createBossForLayer(roundedLayer),
    deck: [],
    discardPile: [],
    hand: [],
    play: {
      selectedCards: [],
      handType: null,
      score: 0,
    },
    bossRound: createInitialBossRound(),
    roundState: createInitialRoundState(),
    battleResult: BattleResult.ONGOING,
    totalDamageDealt: 0,
    matchArchived: false,
    rogueMode,
    roguePhase: rogueMode ? 'BATTLE' : undefined,
  }
}

// 为用户创建并缓存一个 PvE 或肉鸽游戏房间。
export function createRoom(
  roomId: string,
  userId: string,
  layer = 1,
  rogueMode = false,
): GameContext {
  if (rooms.has(roomId)) {
    throw new Error(`Room ${roomId} already exists`)
  }

  const context = createInitialContext(roomId, userId, layer, rogueMode)
  rooms.set(roomId, context)
  return context
}

// 判断房间是否运行在肉鸽模式。
export function isRogueRoom(roomId: string): boolean {
  return rooms.get(roomId)?.rogueMode ?? false
}

// 按房间 ID 读取内存中的游戏上下文。
export function getRoom(roomId: string): GameContext | undefined {
  return rooms.get(roomId)
}

// 用最新游戏上下文覆盖内存房间状态。
export function updateRoom(roomId: string, context: GameContext): void {
  rooms.set(roomId, context)
}

// 删除指定用户的内存游戏房间。
export function removeRoom(roomId: string): boolean {
  return rooms.delete(roomId)
}

// 返回当前进程中活跃房间数量。
export function getRoomCount(): number {
  return rooms.size
}
