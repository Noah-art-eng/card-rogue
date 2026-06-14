export enum Element {
  WATER = 'WATER',
  FIRE = 'FIRE',
  GRASS = 'GRASS',
}

export enum HandType {
  STRAIGHT_FLUSH = 'STRAIGHT_FLUSH',
  FOUR_OF_A_KIND = 'FOUR_OF_A_KIND',
  FULL_HOUSE = 'FULL_HOUSE',
  FLUSH = 'FLUSH',
  STRAIGHT = 'STRAIGHT',
  THREE_OF_A_KIND = 'THREE_OF_A_KIND',
  TWO_PAIR = 'TWO_PAIR',
  PAIR = 'PAIR',
  HIGH_CARD = 'HIGH_CARD',
}

export interface Card {
  id: string
  element: Element
  rank: number
  displayRank: string
  chipValue: number
}

export interface HandScore {
  chips: number
  mult: number
}

export const HAND_SCORES: Record<HandType, HandScore> = {
  [HandType.STRAIGHT_FLUSH]: { chips: 100, mult: 8 },
  [HandType.FOUR_OF_A_KIND]: { chips: 60, mult: 7 },
  [HandType.FULL_HOUSE]: { chips: 40, mult: 6 },
  [HandType.FLUSH]: { chips: 35, mult: 4 },
  [HandType.STRAIGHT]: { chips: 30, mult: 4 },
  [HandType.THREE_OF_A_KIND]: { chips: 30, mult: 3 },
  [HandType.TWO_PAIR]: { chips: 20, mult: 2 },
  [HandType.PAIR]: { chips: 10, mult: 2 },
  [HandType.HIGH_CARD]: { chips: 5, mult: 1 },
}

export function rankToDisplayRank(rank: number): string {
  switch (rank) {
    case 1:
      return 'A'
    case 11:
      return 'J'
    case 12:
      return 'Q'
    case 13:
      return 'K'
    default:
      return String(rank)
  }
}
