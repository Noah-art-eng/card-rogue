import {
  CHARGE_ATTACK_MULTIPLIER,
  BossIntent,
  type BossIntentWeights,
  type BossRoundState,
} from '../types/boss.js'
import type { GameContext } from '../types/state.js'

export function pickBossIntent(
  weights: BossIntentWeights,
  randomValue: number,
): BossIntent {
  const total = weights.ATTACK + weights.CHARGE + weights.DEFEND
  let roll = randomValue * total

  if (roll < weights.ATTACK) {
    return BossIntent.ATTACK
  }

  roll -= weights.ATTACK

  if (roll < weights.CHARGE) {
    return BossIntent.CHARGE
  }

  return BossIntent.DEFEND
}

export function rollBossIntent(weights: BossIntentWeights): BossIntent {
  return pickBossIntent(weights, Math.random())
}

export function calculateChargeAttack(attackPerRound: number): number {
  return Math.floor(attackPerRound * CHARGE_ATTACK_MULTIPLIER)
}

export function createInitialBossRound(): BossRoundState {
  return {
    intent: null,
    isDefending: false,
    willReleaseCharge: false,
  }
}

export function buildBossRoundState(intent: BossIntent): BossRoundState {
  return {
    intent,
    isDefending: intent === BossIntent.DEFEND,
    willReleaseCharge: false,
  }
}

export function generateBossTelegraph(
  context: GameContext,
  forcedIntent?: BossIntent,
): BossRoundState {
  if (context.boss.behavior.chargeStored) {
    return {
      intent: BossIntent.ATTACK,
      isDefending: false,
      willReleaseCharge: true,
    }
  }

  return buildBossRoundState(
    forcedIntent ?? rollBossIntent(context.boss.intentWeights),
  )
}

export function applyDefendDamageReduction(
  rawDamage: number,
  isDefending: boolean,
): number {
  if (!isDefending) {
    return rawDamage
  }

  return Math.floor(rawDamage * 0.5)
}

export function getBossAttackDamage(context: GameContext): number {
  if (context.bossRound.intent !== BossIntent.ATTACK) {
    return 0
  }

  if (context.bossRound.willReleaseCharge) {
    return context.boss.chargeAttack
  }

  return context.boss.attackPerRound
}
