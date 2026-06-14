/** Hand card size: 1.5× the original 128×188 baseline. */
export const HAND_CARD_WIDTH = 192
export const HAND_CARD_HEIGHT = 282

const LAYOUT_SCALE = HAND_CARD_WIDTH / 96

export interface HandFanLayout {
  translateX: number
  translateY: number
  rotate: number
  zIndex: number
}

/**
 * Compact arc fan: cards touch at the base, rotate outward, center card highest.
 * Spread stays in the original hand-zone width (not full-screen wide).
 */
export function computeHandFanLayout(index: number, total: number): HandFanLayout {
  if (total <= 0) {
    return { translateX: 0, translateY: 0, rotate: 0, zIndex: 0 }
  }

  if (total === 1) {
    return { translateX: 0, translateY: 0, rotate: 0, zIndex: 1 }
  }

  const center = (total - 1) / 2
  const offset = index - center
  const maxOffset = Math.max(center, 1)
  const normalized = offset / maxOffset

  const maxRotation = Math.min(16, 5 + total * 1.5)
  const targetSpread = Math.min(500, 360 + total * 22) * LAYOUT_SCALE
  const spreadStep = (targetSpread - HAND_CARD_WIDTH) / (total - 1)
  const cardStep = Math.min(
    HAND_CARD_WIDTH * 0.58,
    Math.max(HAND_CARD_WIDTH * 0.5, spreadStep),
  )

  const arcDepth = 18 * LAYOUT_SCALE

  return {
    translateX: offset * cardStep,
    translateY: Math.pow(Math.abs(normalized), 1.75) * arcDepth,
    rotate: normalized * maxRotation,
    zIndex: index + 1,
  }
}

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
