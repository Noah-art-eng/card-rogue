import type { Card } from '../../types/game'
import { getCardImagePath } from '../../lib/cardImage'
import { getCardRarity } from '../../lib/cardRarity'
import { buildHandCardTransform, type HandFanLayout } from '../../lib/handFanLayout'

interface HandCardProps {
  card: Card
  selectedIndex: number
  disabled: boolean
  isHovered: boolean
  fanLayout: HandFanLayout
  onClick: () => void
  onPointerEnter: () => void
}

const COLOR_THEME = {
  FIRE: {
    borderSel: '#fca5a5',
    glow: 'rgba(239,68,68,0.7)',
    costBg: 'rgba(180,30,30,0.95)',
  },
  WATER: {
    borderSel: '#93c5fd',
    glow: 'rgba(59,130,246,0.7)',
    costBg: 'rgba(30,60,180,0.95)',
  },
  GRASS: {
    borderSel: '#86efac',
    glow: 'rgba(34,197,94,0.7)',
    costBg: 'rgba(20,120,50,0.95)',
  },
} as const

export default function HandCard({
  card,
  selectedIndex,
  disabled,
  isHovered,
  fanLayout,
  onClick,
  onPointerEnter,
}: HandCardProps) {
  const isSelected = selectedIndex >= 0
  const showHover = isHovered && !disabled
  const isRarityActive = isSelected || showHover
  const elem = card.element
  const rarity = getCardRarity(card.rank)
  const theme = COLOR_THEME[elem] ?? COLOR_THEME.WATER
  const imgSrc = getCardImagePath(elem, card.rank)

  let className = `hand-card hand-card--${elem} hand-card--${rarity}`
  if (isSelected) className += ' hand-card--selected'
  if (showHover) className += ' hand-card--hovered'
  if (isRarityActive) className += ' hand-card--rarity-active'
  if (disabled) className += ' hand-card--disabled'

  const zIndex = fanLayout.zIndex + (isSelected ? 220 : showHover ? 180 : 0)

  return (
    <div
      className={className}
      role="button"
      tabIndex={disabled ? -1 : 0}
      data-hand-card-id={card.id}
      onPointerEnter={disabled ? undefined : onPointerEnter}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      style={{
        zIndex,
        transform: buildHandCardTransform(fanLayout, {
          hovered: showHover,
          selected: isSelected,
          legendary: rarity === 'legendary',
        }),
      }}
    >
      {showHover && (
        <div className="hand-card__tooltip" role="tooltip">
          {card.displayRank} {elem} (chip +{card.chipValue})
        </div>
      )}

      <div className="hand-card__img-wrap">
        <img
          src={imgSrc}
          alt={`${card.displayRank} ${elem}`}
          className="hand-card__img"
          draggable={false}
        />
      </div>

      {showHover && !isSelected && (
        <div className="hand-card__hover-preview">
          <div className={`hand-card__hover-preview-inner hand-card__hover-preview-inner--${rarity}`}>
            <img src={imgSrc} alt="" className="hand-card__hover-preview-img" draggable={false} />
          </div>
        </div>
      )}

      {isSelected && (
        <>
          <div
            className="hand-card__sel-badge"
            style={{
              background: theme.costBg,
              borderColor: theme.borderSel,
              boxShadow: `0 0 8px ${theme.glow}`,
            }}
          >
            {selectedIndex + 1}
          </div>
          <div
            className="hand-card__sel-glow"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.borderSel}, transparent)`,
            }}
            aria-hidden="true"
          />
        </>
      )}
    </div>
  )
}
