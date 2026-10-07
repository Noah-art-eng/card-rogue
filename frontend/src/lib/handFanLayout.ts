export const HAND_CARD_WIDTH = 192
export const HAND_CARD_HEIGHT = 282

export interface HandFanLayout {
  translateX: number
  translateY: number
  rotate: number
  zIndex: number
}

// 计算每张手牌在扇形中的位置和旋转角度。
export function computeHandFanLayout(
  index: number,
  total: number,
  spreadScale = 1,
): HandFanLayout {
  if (total <= 0) {
    return { translateX: 0, translateY: 0, rotate: 0, zIndex: 0 }
  }

  if (total === 1) {
    return { translateX: 0, translateY: 0, rotate: 0, zIndex: 1 }
  }

  const layoutScale = HAND_CARD_WIDTH / 96
  const center = (total - 1) / 2
  const offset = index - center
  const maxOffset = Math.max(center, 1)
  const normalized = offset / maxOffset

  const maxRotation = Math.min(16, 5 + total * 1.5)
  const targetSpread = Math.min(500, 360 + total * 22) * layoutScale
  const spreadStep = (targetSpread - HAND_CARD_WIDTH) / (total - 1)
  const cardStep = Math.min(
    HAND_CARD_WIDTH * 0.58,
    Math.max(HAND_CARD_WIDTH * 0.5, spreadStep),
  )

  const arcDepth = 18 * layoutScale

  return {
    translateX: offset * cardStep * spreadScale,
    translateY: Math.pow(Math.abs(normalized), 1.75) * arcDepth,
    rotate: normalized * maxRotation,
    zIndex: index + 1,
  }
}

// 将手牌布局参数拼成 CSS transform，供单牌渲染使用。
export function buildHandCardTransform(
  layout: HandFanLayout,
  options: { hovered: boolean; selected: boolean; legendary?: boolean },
): string {
  const { hovered, selected, legendary = false } = options
  let lift = 0
  let scale = 1

  if (selected) {
    lift = legendary ? -56 : -48
    scale = legendary ? 1.08 : 1.04
  } else if (hovered) {
    if (legendary) {
      lift = -40
      scale = 1.1
    } else {
      lift = -18
    }
  }

  const rotate = selected ? 0 : layout.rotate
  const translateY = layout.translateY + lift

  return `translateX(calc(-50% + ${layout.translateX}px)) translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`
}
