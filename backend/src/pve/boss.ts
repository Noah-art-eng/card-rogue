/**
 * Boss 本回合意图和攻击数值的计算规则。
 * 每回合会从权重中抽取攻击、防御或蓄力意图，再生成客户端展示需要的预告和最终伤害。
 */

import {
  CHARGE_ATTACK_MULTIPLIER,
  BossIntent,
  type BossIntentWeights,
  type BossRoundState,
} from '../types/boss.js'
import type { GameContext } from '../types/state.js'

// 根据层级意图权重随机选取 Boss 下一回合行为。
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

// 按权重随机决定 Boss 下一回合的攻击、蓄力或防御意图。
export function rollBossIntent(weights: BossIntentWeights): BossIntent {
  return pickBossIntent(weights, Math.random())
}

// 按基础攻击力计算 Boss 蓄力攻击伤害。
export function calculateChargeAttack(attackPerRound: number): number {
  return Math.floor(attackPerRound * CHARGE_ATTACK_MULTIPLIER)
}

// 创建尚未预告 Boss 行动的初始回合状态。
export function createInitialBossRound(): BossRoundState {
  return {
    intent: null,
    isDefending: false,
    willReleaseCharge: false,
  }
}

// 根据意图生成回合状态，让防御和蓄力标记集中维护。
export function buildBossRoundState(intent: BossIntent): BossRoundState {
  return {
    intent,
    isDefending: intent === BossIntent.DEFEND,
    willReleaseCharge: false,
  }
}

// 蓄力完成时强制释放攻击，否则按权重生成新的行动预告。
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

// 计算当前 Boss 回合实际造成的攻击伤害。
export function getBossAttackDamage(context: GameContext): number {
  if (context.bossRound.intent !== BossIntent.ATTACK) {
    return 0
  }

  if (context.bossRound.willReleaseCharge) {
    return context.boss.chargeAttack
  }

  return context.boss.attackPerRound
}
