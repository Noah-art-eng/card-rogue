import type { Card } from '../types/game'

export type AttackEffectMode = 'fire' | 'water' | 'nature' | 'normal'

export function inferAttackEffectModeFromCards(cards: Card[]): AttackEffectMode {
  if (!Array.isArray(cards) || cards.length === 0) return 'normal'

  const elements = cards.map((card) => card.element)
  if (elements.every((e) => e === 'FIRE')) return 'fire'
  if (elements.every((e) => e === 'WATER')) return 'water'
  if (elements.every((e) => e === 'GRASS')) return 'nature'
  return 'normal'
}
