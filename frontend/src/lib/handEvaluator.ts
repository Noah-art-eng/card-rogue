/**
 * Frontend damage evaluator — mirrors backend pve/handEvaluator.ts + pve/damage.ts exactly.
 *
 * HAND_SCORES must stay in sync with backend/src/types/card.ts HAND_SCORES.
 * calculateDamage formula: Math.floor((chips + cardChips) * mult)
 * DEFEND reduction:        Math.floor(raw * 0.5)
 */

import type { Card, HandType } from '../types/game'

export interface EvaluatorResult {
  handType: HandType
  chips: number
  cardChips: number
  mult: number
  raw: number
  total: number  // raw after optional DEFEND halving
  isDefendReduced: boolean
}

// ── HAND_SCORES (mirror of backend/src/types/card.ts) ────────────────────────

const HAND_SCORES: Record<HandType, { chips: number; mult: number }> = {
  STRAIGHT_FLUSH:  { chips: 100, mult: 8 },
  FOUR_OF_A_KIND:  { chips: 60,  mult: 7 },
  FULL_HOUSE:      { chips: 40,  mult: 6 },
  FLUSH:           { chips: 35,  mult: 4 },
  STRAIGHT:        { chips: 30,  mult: 4 },
  THREE_OF_A_KIND: { chips: 30,  mult: 3 },
  TWO_PAIR:        { chips: 20,  mult: 2 },
  PAIR:            { chips: 10,  mult: 2 },
  HIGH_CARD:       { chips: 5,   mult: 1 },
}

// ── Hand detection (mirror of backend/src/pve/handEvaluator.ts) ──────────────

function countRanks(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1)
  }
  return counts
}

function isSameElement(cards: Card[]): boolean {
  return cards.every((c) => c.element === cards[0].element)
}

function isStraight(cards: Card[]): boolean {
  if (cards.length < 5) return false
  const ranks = [...new Set(cards.map((c) => c.rank))].sort((a, b) => a - b)
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] - ranks[i - 1] !== 1) return false
  }
  return true
}

export function detectHandType(cards: Card[]): HandType {
  if (cards.length === 0) return 'HIGH_CARD'

  const rankCounts = countRanks(cards)
  const isFlush = cards.length >= 5 && isSameElement(cards)
  const isStraightHand = isStraight(cards)

  if (isFlush && isStraightHand) return 'STRAIGHT_FLUSH'
  if ([...rankCounts.values()].some((c) => c >= 4)) return 'FOUR_OF_A_KIND'

  const sortedCounts = [...rankCounts.values()].sort((a, b) => b - a)
  if (
    cards.length >= 5 &&
    sortedCounts.length === 2 &&
    sortedCounts[0] === 3 &&
    sortedCounts[1] === 2
  ) {
    return 'FULL_HOUSE'
  }

  if (isFlush) return 'FLUSH'
  if (isStraightHand) return 'STRAIGHT'
  if ([...rankCounts.values()].some((c) => c >= 3)) return 'THREE_OF_A_KIND'

  const pairCount = [...rankCounts.values()].filter((c) => c >= 2).length
  if (pairCount >= 2) return 'TWO_PAIR'
  if (pairCount >= 1) return 'PAIR'

  return 'HIGH_CARD'
}

// ── Damage calculation ────────────────────────────────────────────────────────

export function evaluateHand(
  cards: Card[],
  isDefending = false,
): EvaluatorResult {
  const handType = detectHandType(cards)
  const { chips, mult } = HAND_SCORES[handType]
  const cardChips = cards.reduce((sum, c) => sum + c.chipValue, 0)
  const raw = Math.floor((chips + cardChips) * mult)
  const total = isDefending ? Math.floor(raw * 0.5) : raw

  return {
    handType,
    chips,
    cardChips,
    mult,
    raw,
    total,
    isDefendReduced: isDefending,
  }
}
