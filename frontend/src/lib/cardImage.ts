import type { Element } from '../types/game'

const ELEMENT_OFFSETS: Record<Element, number> = {
  FIRE: 0,
  WATER: 13,
  GRASS: 26,
}

// 按牌图资源编号选择正确的图片扩展名。
function cardExtension(index: number): 'jpg' | 'png' {
  return index >= 14 && index <= 17 ? 'jpg' : 'png'
}

// 根据元素和点数生成牌面图片路径。
export function getCardImagePath(element: Element, rank: number): string {
  const offset = ELEMENT_OFFSETS[element]
  const index = offset + rank
  const padded = String(index).padStart(2, '0')
  const ext = cardExtension(index)
  return `/cards/card_${padded}.${ext}`
}
