/**
 * 前端牌面稀有度映射。
 * 点数会对应普通、史诗或传说样式，用于视觉强调而不改变游戏数值。
 */

export type CardRarity = 'common' | 'epic' | 'legendary'

// 按点数映射牌的稀有度，用于页面样式和视觉强调。
export function getCardRarity(rank: number): CardRarity {
  if (rank >= 11) return 'legendary'
  if (rank >= 5) return 'epic'
  return 'common'
}
