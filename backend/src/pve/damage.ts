import { HAND_SCORES, HandType, type Card } from '../types/card.js'
import type { Buff } from '../types/buff.js'

const COMMON_HANDS: HandType[] = [
  HandType.HIGH_CARD,
  HandType.PAIR,
  HandType.TWO_PAIR,
  HandType.THREE_OF_A_KIND,
]
const RARE_HANDS: HandType[] = [HandType.STRAIGHT, HandType.FLUSH]
const EPIC_HANDS: HandType[] = [
  HandType.FULL_HOUSE,
  HandType.FOUR_OF_A_KIND,
  HandType.STRAIGHT_FLUSH,
]

function getHandTier(handType: HandType): 'common' | 'rare' | 'epic' {
  if (EPIC_HANDS.includes(handType)) return 'epic'
  if (RARE_HANDS.includes(handType)) return 'rare'
  if (COMMON_HANDS.includes(handType)) return 'common'
  return 'common'
}

export function calculateDamage(
  handType: HandType,
  cards: Card[],
  buffs: Buff[] = [],
  isDefending = false,
): number {
  const { chips: baseChipsFromTable, mult: baseMultFromTable } = HAND_SCORES[handType]
  let baseChips = baseChipsFromTable
  let mult = baseMultFromTable

  for (const buff of buffs) {
    if (buff.type === 'HAND_CHIPS_BONUS' && buff.handType === handType) {
      baseChips += buff.bonusChips
    }
    if (buff.type === 'HAND_MULT_BONUS' && buff.handType === handType) {
      mult += buff.bonusMult
    }
  }

  const tier = getHandTier(handType)
  for (const buff of buffs) {
    if (buff.type === 'TIERED_CHIPS_BONUS') {
      baseChips +=
        tier === 'common' ? buff.commonBonus : tier === 'rare' ? buff.rareBonus : buff.epicBonus
    }
    if (buff.type === 'TIERED_MULT_BONUS') {
      mult += tier === 'common' ? buff.commonMult : tier === 'rare' ? buff.rareMult : buff.epicMult
    }
  }

  let cardChips = 0
  for (const card of cards) {
    let chip = card.chipValue
    for (const buff of buffs) {
      if (buff.type === 'ELEMENT_CHIP_MULT' && buff.element === card.element) {
        chip *= buff.mult
      }
    }
    for (const buff of buffs) {
      if (buff.type === 'ELEMENT_CHIPS_BONUS' && buff.element === card.element) {
        chip += buff.bonusChips
      }
    }
    for (const buff of buffs) {
      if (buff.type === 'ALL_CHIPS_BONUS') {
        chip += buff.bonusChips
      }
    }
    cardChips += chip
  }

  let total = Math.floor((baseChips + cardChips) * mult)
  if (isDefending) {
    total = Math.floor(total * 0.5)
  }

  return total
}
