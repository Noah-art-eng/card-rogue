import type { Element } from './card.js'

export enum BossIntent {
  ATTACK = 'ATTACK',
  CHARGE = 'CHARGE',
  DEFEND = 'DEFEND',
}

export const BOSS_INTENTS = [
  BossIntent.ATTACK,
  BossIntent.CHARGE,
  BossIntent.DEFEND,
] as const

export interface BossIntentWeights {
  ATTACK: number
  CHARGE: number
  DEFEND: number
}

export interface BossRoundState {
  intent: BossIntent | null
  isDefending: boolean
  willReleaseCharge: boolean
}

export interface BossBehaviorState {
  chargeStored: boolean
}

export interface BossLayerConfig {
  id: string
  name: string
  element: Element
  maxHp: number
  attackPerRound: number
  intentWeights: BossIntentWeights
}

export const CHARGE_ATTACK_MULTIPLIER = 2.2
