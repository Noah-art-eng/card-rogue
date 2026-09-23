export type CardRarity = 'common' | 'epic' | 'legendary'

// 获取、计算或校验 CardRarity。
export function getCardRarity(rank: number): CardRarity {
  if (rank >= 11) return 'legendary'
  if (rank >= 5) return 'epic'
  return 'common'
}
