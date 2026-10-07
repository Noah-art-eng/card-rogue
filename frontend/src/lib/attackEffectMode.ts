import type { Card } from '../types/game'

export type AttackEffectMode = 'fire' | 'water' | 'nature' | 'normal'

// 根据本次打出的牌推断攻击特效，仅影响前端表现而不参与伤害结算。
export function inferAttackEffectModeFromCards(cards: Card[]): AttackEffectMode {
  if (!Array.isArray(cards) || cards.length === 0) return 'normal'

  const elements = cards.map((card) => card.element)
  if (elements.every((e) => e === 'FIRE')) return 'fire'
  if (elements.every((e) => e === 'WATER')) return 'water'
  if (elements.every((e) => e === 'GRASS')) return 'nature'
  return 'normal'
}
