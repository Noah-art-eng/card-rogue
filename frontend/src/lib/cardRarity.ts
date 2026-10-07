export type CardRarity = 'common' | 'epic' | 'legendary'

export function getCardRarity(rank: number): CardRarity {
  if (rank >= 11) return 'legendary'
  if (rank >= 5) return 'epic'
  return 'common'
}
