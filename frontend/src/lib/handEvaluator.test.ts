/**
 * Contract tests — mirrors backend/src/pve/handEvaluator.test.ts + damage cases.
 * Run: npx tsx frontend/src/lib/handEvaluator.test.ts
 */
import assert from 'node:assert/strict'

import type { Card, Element, HandType } from '../types/game'
import { detectHandType, evaluateHand } from './handEvaluator'

function card(element: Element, rank: number): Card {
  return {
    id: `${element}_${rank}`,
    element,
    rank,
    displayRank: rank === 1 ? 'A' : String(rank),
    chipValue: rank,
  }
}

function assertHandType(cards: Card[], expected: HandType, label: string) {
  assert.equal(detectHandType(cards), expected, label)
}

// ── Backend handEvaluator.test.ts parity ─────────────────────────────────────

assertHandType(
  [card('FIRE', 1), card('WATER', 2), card('GRASS', 3), card('FIRE', 4), card('WATER', 5)],
  'STRAIGHT',
  '1-2-3-4-5 should be STRAIGHT',
)

assertHandType(
  [card('FIRE', 9), card('WATER', 10), card('GRASS', 11), card('FIRE', 12), card('WATER', 13)],
  'STRAIGHT',
  '9-10-11-12-13 should be STRAIGHT',
)

assertHandType(
  [card('FIRE', 1), card('WATER', 10), card('GRASS', 11), card('FIRE', 12), card('WATER', 13)],
  'HIGH_CARD',
  '1-10-11-12-13 should not be STRAIGHT',
)

// ── All 9 hand types ─────────────────────────────────────────────────────────

assertHandType([card('FIRE', 5)], 'HIGH_CARD', 'single card = HIGH_CARD')
assertHandType([card('FIRE', 3), card('WATER', 3)], 'PAIR', 'two same rank = PAIR')
assertHandType(
  [card('FIRE', 3), card('WATER', 3), card('GRASS', 7), card('FIRE', 7)],
  'TWO_PAIR',
  'two pairs',
)
assertHandType(
  [card('FIRE', 4), card('WATER', 4), card('GRASS', 4)],
  'THREE_OF_A_KIND',
  'three of a kind',
)
assertHandType(
  [card('FIRE', 2), card('FIRE', 5), card('FIRE', 7), card('FIRE', 9), card('FIRE', 13)],
  'FLUSH',
  'five same element non-straight = FLUSH',
)
assertHandType(
  [card('FIRE', 5), card('WATER', 6), card('GRASS', 7), card('FIRE', 8), card('WATER', 9)],
  'STRAIGHT',
  'five consecutive ranks = STRAIGHT',
)
assertHandType(
  [card('FIRE', 3), card('WATER', 3), card('GRASS', 3), card('FIRE', 7), card('WATER', 7)],
  'FULL_HOUSE',
  'full house',
)
assertHandType(
  [card('FIRE', 2), card('WATER', 2), card('GRASS', 2), card('FIRE', 2)],
  'FOUR_OF_A_KIND',
  'four of a kind',
)
// straight flush
assertHandType(
  [card('WATER', 9), card('WATER', 10), card('WATER', 11), card('WATER', 12), card('WATER', 13)],
  'STRAIGHT_FLUSH',
  'straight flush',
)

// ── Damage + DEFEND ─────────────────────────────────────────────────────────

const highCard = evaluateHand([card('FIRE', 5)])
assert.equal(highCard.handType, 'HIGH_CARD')
assert.equal(highCard.raw, Math.floor((5 + 5) * 1), 'HIGH_CARD damage')
assert.equal(highCard.total, highCard.raw)

const pair = evaluateHand([card('FIRE', 3), card('WATER', 3)])
assert.equal(pair.handType, 'PAIR')
assert.equal(pair.raw, Math.floor((10 + 6) * 2), 'PAIR damage = (10+6)*2 = 32')

const pairDefend = evaluateHand([card('FIRE', 3), card('WATER', 3)], true)
assert.equal(pairDefend.total, Math.floor(pairDefend.raw * 0.5), 'DEFEND halves damage')

console.log('handEvaluator contract tests passed')
