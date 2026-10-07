import type { Element } from '../types/game'

/**
 * Card image mapping: 39 images for 3 elements × 13 ranks.
 *
 * Assumed order (verify against original Card Game if images look wrong):
 *   FIRE   → card_01–13  (rank 1 → card_01, rank 13 → card_13)
 *   WATER  → card_14–26  (rank 1 → card_14, rank 13 → card_26)
 *   GRASS  → card_27–39  (rank 1 → card_27, rank 13 → card_39)
 *
 * card_14–17 are JPG (different source); all others are PNG.
 * To fix the mapping, only change ELEMENT_OFFSETS below.
 */
const ELEMENT_OFFSETS: Record<Element, number> = {
  FIRE: 0,
  WATER: 13,
  GRASS: 26,
}

function cardExtension(index: number): 'jpg' | 'png' {
  return index >= 14 && index <= 17 ? 'jpg' : 'png'
}

export function getCardImagePath(element: Element, rank: number): string {
  const offset = ELEMENT_OFFSETS[element]
  const index = offset + rank
  const padded = String(index).padStart(2, '0')
  const ext = cardExtension(index)
  return `/cards/card_${padded}.${ext}`
}
