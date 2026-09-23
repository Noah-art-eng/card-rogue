import {
  Element,
  rankToDisplayRank,
  type Card,
} from '../types/card.js'

const ELEMENTS = [Element.WATER, Element.FIRE, Element.GRASS] as const
const RANKS = Array.from({ length: 13 }, (_, index) => index + 1)
export const HAND_SIZE = 7

export interface DeckState {
  deck: Card[]
  discardPile: Card[]
  hand: Card[]
}

// 创建或初始化 Card 所需的数据。
export function createCard(element: Element, rank: number): Card {
  return {
    id: `${element}_${rank}`,
    element,
    rank,
    displayRank: rankToDisplayRank(rank),
    chipValue: rank,
  }
}

// 负责 changeCardElement 的业务处理。
export function changeCardElement(card: Card, targetElement: Element): Card {
  return {
    ...card,
    element: targetElement,
  }
}

// 负责 changeCardRank 的业务处理。
export function changeCardRank(card: Card, targetRank: number): Card {
  return {
    ...card,
    rank: targetRank,
    displayRank: rankToDisplayRank(targetRank),
    chipValue: targetRank,
  }
}

// 创建或初始化 FullDeck 所需的数据。
export function createFullDeck(): Card[] {
  const deck: Card[] = []

  for (const element of ELEMENTS) {
    for (const rank of RANKS) {
      deck.push(createCard(element, rank))
    }
  }

  return deck
}

// 使用 Fisher-Yates 算法返回不修改原数组的随机牌序。
export function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

// 创建或初始化 DeckState 所需的数据。
export function initDeckState(): DeckState {
  const deck = shuffle(createFullDeck())

  return {
    deck,
    discardPile: [],
    hand: [],
  }
}

// 负责 recycleDiscardPile 的业务处理。
function recycleDiscardPile(state: DeckState): void {
  if (state.discardPile.length === 0) {
    return
  }

  state.deck = shuffle([...state.deck, ...state.discardPile])
  state.discardPile = []
}

// 从牌堆抽取指定数量的卡牌，必要时回收弃牌堆。
export function drawCards(state: DeckState, count: number): void {
  for (let index = 0; index < count; index += 1) {
    if (state.deck.length === 0) {
      recycleDiscardPile(state)
    }

    if (state.deck.length === 0) {
      break
    }

    const [card] = state.deck.splice(0, 1)
    state.hand.push(card)
  }
}

// 执行 HandCards 相关处理。
export function shuffleHandCards(state: DeckState, cardsToShuffle: Card[]): void {
  const shuffleIds = new Set(cardsToShuffle.map((card) => card.id))

  state.hand = state.hand.filter((card) => !shuffleIds.has(card.id))
  state.discardPile.push(...cardsToShuffle)
  drawCards(state, cardsToShuffle.length)
}

// 将打出的卡牌移出手牌并放入弃牌堆。
export function playCards(state: DeckState, cardsToPlay: Card[]): void {
  const playIds = new Set(cardsToPlay.map((card) => card.id))

  state.hand = state.hand.filter((card) => !playIds.has(card.id))
  state.discardPile.push(...cardsToPlay)

  const cardsNeeded = HAND_SIZE - state.hand.length
  if (cardsNeeded > 0) {
    drawCards(state, cardsNeeded)
  }
}
