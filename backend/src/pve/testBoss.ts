import { BossIntent } from '../types/boss.js'
import { Element } from '../types/card.js'
import { BattleResult, RoundPhase, type BossState } from '../types/state.js'
import { calculateChargeAttack } from './boss.js'

export function createTestBoss(overrides: Partial<BossState> = {}): BossState {
  const attackPerRound = overrides.attackPerRound ?? 3

  return {
    id: 'boss-test',
    name: 'Test Boss',
    element: Element.WATER,
    hp: 500,
    maxHp: 500,
    attackPerRound,
    chargeAttack: calculateChargeAttack(attackPerRound),
    intentWeights: {
      ATTACK: 5,
      CHARGE: 3,
      DEFEND: 2,
    },
    behavior: { chargeStored: false },
    ...overrides,
  }
}

export const defaultTestBossRound = {
  intent: BossIntent.ATTACK,
  isDefending: false,
  willReleaseCharge: false,
} as const

export const defaultTestBattle = {
  roomId: 'pve-test',
  userId: 'user-test',
  layer: 1,
  round: 1,
  phase: RoundPhase.PLAY,
  player: { hp: 100, maxHp: 100 },
  battleResult: BattleResult.ONGOING,
  totalDamageDealt: 0,
  matchArchived: false,
} as const

export const defaultRoundState = {
  skills: {
    energy: {
      energy: 3,
    },
    shield: {
      active: false,
      onCooldown: false,
      cooldownRounds: 0,
    },
  },
  shuffle: {
    remaining: 2,
  },
} as const
