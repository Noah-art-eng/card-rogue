import {
  BattleResult,
  RoundPhase,
  type GameContext,
} from '../types/state.js'
import { createBossForLayer } from './bossConfig.js'
import { createInitialBossRound } from './boss.js'
import { playerHpForLayer } from './layerConfig.js'
import { createInitialRoundState } from './roundState.js'

// Live combat contexts stay process-local; durable saves and archives live in MongoDB instead.
const rooms = new Map<string, GameContext>()

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

export function getRoomCount(): number {
  return rooms.size
}
