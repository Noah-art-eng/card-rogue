import { HandType, type Card } from '../types/card.js'

function countRanks(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>()

  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1)
  }

  return counts
}

function isSameElement(cards: Card[]): boolean {
  return cards.every((card) => card.element === cards[0].element)
}

function isStraight(cards: Card[]): boolean {
  if (cards.length < 5) {
    return false
  }

  const ranks = [...new Set(cards.map((card) => card.rank))].sort((a, b) => a - b)

  for (let index = 1; index < ranks.length; index += 1) {
    if (ranks[index] - ranks[index - 1] !== 1) {
      return false
    }
  }

  return true
}

function isFlush(cards: Card[]): boolean {
  return cards.length >= 5 && isSameElement(cards)
}

function isStraightFlush(cards: Card[]): boolean {
  return cards.length >= 5 && isSameElement(cards) && isStraight(cards)
}

function hasFourOfAKind(rankCounts: Map<number, number>): boolean {
  return [...rankCounts.values()].some((count) => count >= 4)
}

function isFullHouse(rankCounts: Map<number, number>): boolean {
  const counts = [...rankCounts.values()].sort((a, b) => b - a)
  return counts.length === 2 && counts[0] === 3 && counts[1] === 2
}

function hasThreeOfAKind(rankCounts: Map<number, number>): boolean {
  return [...rankCounts.values()].some((count) => count >= 3)
}

function hasTwoPair(rankCounts: Map<number, number>): boolean {
  const pairCount = [...rankCounts.values()].filter((count) => count >= 2).length
  return pairCount >= 2
}

function hasPair(rankCounts: Map<number, number>): boolean {
  return [...rankCounts.values()].some((count) => count >= 2)
}

export function detectHandType(cards: Card[]): HandType {
  if (cards.length === 0) {
    throw new Error('Cannot detect hand type for empty card selection')
  }

  const rankCounts = countRanks(cards)

  if (isStraightFlush(cards)) {
    return HandType.STRAIGHT_FLUSH
  }

  if (hasFourOfAKind(rankCounts)) {
    return HandType.FOUR_OF_A_KIND
  }

  if (cards.length >= 5 && isFullHouse(rankCounts)) {
    return HandType.FULL_HOUSE
  }

  if (isFlush(cards)) {
    return HandType.FLUSH
  }

  if (isStraight(cards)) {
    return HandType.STRAIGHT
  }

  if (hasThreeOfAKind(rankCounts)) {
    return HandType.THREE_OF_A_KIND
  }

  if (hasTwoPair(rankCounts)) {
    return HandType.TWO_PAIR
  }

  if (hasPair(rankCounts)) {
    return HandType.PAIR
  }

  return HandType.HIGH_CARD
}
