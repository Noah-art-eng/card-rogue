import assert from 'node:assert/strict'

import { Element, HandType } from '../types/card.js'
import { createCard } from './deck.js'
import { detectHandType } from './handEvaluator.js'

function card(element: Element, rank: number) {
  return createCard(element, rank)
}

function assertHandType(cards: ReturnType<typeof card>[], expected: HandType, label: string) {
  const actual = detectHandType(cards)
  assert.equal(actual, expected, label)
}

assertHandType(
  [
    card(Element.FIRE, 1),
    card(Element.WATER, 2),
    card(Element.GRASS, 3),
    card(Element.FIRE, 4),
    card(Element.WATER, 5),
  ],
  HandType.STRAIGHT,
  '1-2-3-4-5 should be STRAIGHT',
)

assertHandType(
  [
    card(Element.FIRE, 9),
    card(Element.WATER, 10),
    card(Element.GRASS, 11),
    card(Element.FIRE, 12),
    card(Element.WATER, 13),
  ],
  HandType.STRAIGHT,
  '9-10-11-12-13 should be STRAIGHT',
)

assertHandType(
  [
    card(Element.FIRE, 3),
    card(Element.WATER, 4),
    card(Element.GRASS, 5),
    card(Element.FIRE, 6),
    card(Element.WATER, 7),
    card(Element.GRASS, 8),
  ],
  HandType.STRAIGHT,
  '3-4-5-6-7-8 should be STRAIGHT',
)

assertHandType(
  [
    card(Element.FIRE, 2),
    card(Element.WATER, 3),
    card(Element.GRASS, 3),
    card(Element.FIRE, 4),
    card(Element.WATER, 5),
  ],
  HandType.STRAIGHT,
  '2-3-3-4-5 should be STRAIGHT',
)

assertHandType(
  [
    card(Element.FIRE, 1),
    card(Element.WATER, 10),
    card(Element.GRASS, 11),
    card(Element.FIRE, 12),
    card(Element.WATER, 13),
  ],
  HandType.HIGH_CARD,
  '1-10-11-12-13 should not be STRAIGHT',
)

console.log('handEvaluator tests passed')
