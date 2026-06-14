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

export function createCard(element: Element, rank: number): Card {
  return {
    id: `${element}_${rank}`,
    element,
    rank,
    displayRank: rankToDisplayRank(rank),
    chipValue: rank,
  }
}

export function changeCardElement(card: Card, targetElement: Element): Card {
  return {
    ...card,
    element: targetElement,
  }
}

export function changeCardRank(card: Card, targetRank: number): Card {
  return {
    ...card,
    rank: targetRank,
    displayRank: rankToDisplayRank(targetRank),
    chipValue: targetRank,
  }
}

export function createFullDeck(): Card[] {
  const deck: Card[] = []

  for (const element of ELEMENTS) {
    for (const rank of RANKS) {
      deck.push(createCard(element, rank))
    }
  }

  return deck
}

export function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

export function initDeckState(): DeckState {
  const deck = shuffle(createFullDeck())

  return {
    deck,
    discardPile: [],
    hand: [],
  }
}

function recycleDiscardPile(state: DeckState): void {
  if (state.discardPile.length === 0) {
    return
  }

  state.deck = shuffle([...state.deck, ...state.discardPile])
  state.discardPile = []
}

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

export function shuffleHandCards(state: DeckState, cardsToShuffle: Card[]): void {
  const shuffleIds = new Set(cardsToShuffle.map((card) => card.id))

  state.hand = state.hand.filter((card) => !shuffleIds.has(card.id))
  state.discardPile.push(...cardsToShuffle)
  drawCards(state, cardsToShuffle.length)
}

export function playCards(state: DeckState, cardsToPlay: Card[]): void {
  const playIds = new Set(cardsToPlay.map((card) => card.id))

  state.hand = state.hand.filter((card) => !playIds.has(card.id))
  state.discardPile.push(...cardsToPlay)

  const cardsNeeded = HAND_SIZE - state.hand.length
  if (cardsNeeded > 0) {
    drawCards(state, cardsNeeded)
  }
}
