/**
 * 服务端牌型识别规则。
 * 出牌结算会在这里识别对子、顺子、同花等牌型，作为最终伤害计算的基础。
 */

import { HandType, type Card } from '../types/card.js'

// 统计选牌中每种点数出现次数。
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

// 判断点数是否组成连续顺子。
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

// 判断所有选牌是否属于同一元素。
function isFlush(cards: Card[]): boolean {
  return cards.length >= 5 && isSameElement(cards)
}

// 同时满足顺子和同元素时判定为同花顺。
function isStraightFlush(cards: Card[]): boolean {
  return cards.length >= 5 && isSameElement(cards) && isStraight(cards)
}

// 检查是否存在四张相同点数。
function hasFourOfAKind(rankCounts: Map<number, number>): boolean {
  return [...rankCounts.values()].some((count) => count >= 4)
}

// 检查三条与一对是否同时存在。
function isFullHouse(rankCounts: Map<number, number>): boolean {
  const counts = [...rankCounts.values()].sort((a, b) => b - a)
  return counts.length === 2 && counts[0] === 3 && counts[1] === 2
}

// 检查是否存在三张相同点数。
function hasThreeOfAKind(rankCounts: Map<number, number>): boolean {
  return [...rankCounts.values()].some((count) => count >= 3)
}

// 检查是否存在两组不同对子。
function hasTwoPair(rankCounts: Map<number, number>): boolean {
  const pairCount = [...rankCounts.values()].filter((count) => count >= 2).length
  return pairCount >= 2
}

// 检查是否存在至少一组对子。
function hasPair(rankCounts: Map<number, number>): boolean {
  return [...rankCounts.values()].some((count) => count >= 2)
}

// 根据当前选牌判断牌型，供伤害计算和战斗展示共用。
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
