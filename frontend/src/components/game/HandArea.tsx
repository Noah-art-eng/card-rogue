import { useState } from 'react'

import type { Card, Element, RoundPhase, ShieldState } from '../../types/game'
import type { EnhancementOption } from '../../types/rogue'
import { computeHandFanLayout } from '../../lib/handFanLayout'
import HandCard from './HandCard'
import PlayerHUD from './PlayerHUD'

interface HandAreaProps {
  phase: RoundPhase
  displayedPlayerHp: number
  playerMaxHp: number
  shield: ShieldState
  hand: Card[]
  selectedCards: Card[]
  deckCount: number
  discardCount: number
  playerDamageAmount: number
  playerDamageFloatVisible: boolean
  playerDamageFloatKey: number
  playerHudShakeNonce: number
  shieldPulse: boolean
  playerAvatarUrl?: string | null
  playerUsername?: string | null
  playerLevel?: number
  playerRankTitle?: string
  onCardClick: (cardId: string) => void
  buffs?: EnhancementOption[]
  onBuffClick?: (buff: EnhancementOption) => void
}

const ELEMENT_ORDER: Record<Element, number> = {
  FIRE: 0,
  WATER: 1,
  GRASS: 2,
}

function PlayerDamageFloat({ value }: { value: number }) {
  return (
    <div className="handarea__player-damage-float">
      -{value.toLocaleString()}
    </div>
  )
}

function buffAccentColor(element?: string): string {
  if (element === 'WATER') return '#4ea8ff'
  if (element === 'FIRE') return '#ff6644'
  if (element === 'GRASS') return '#5ce68c'
  return '#f0d060'
}

function BuffTag({
  buff,
  onClick,
}: {
  buff: EnhancementOption
  onClick?: (buff: EnhancementOption) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const label = buff.label ?? buff.id
  const desc = buff.description ?? ''
  const element =
    (buff.buff && 'element' in buff.buff ? buff.buff.element : undefined) ?? buff.element
  const color = buffAccentColor(element)

  return (
    <div
      className="handarea-buff-tag"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={() => onClick?.(buff)}
        title={desc}
        className="handarea-buff-tag__button"
        style={{ borderColor: `${color}55`, color }}
      >
        {label}
      </button>
      {showTooltip && desc ? (
        <div
          className="handarea-buff-tag__tooltip"
          style={{ borderColor: `${color}66` }}
        >
          {desc}
        </div>
      ) : null}
    </div>
  )
}

function BuffPanel({
  buffs,
  onBuffClick,
}: {
  buffs: EnhancementOption[]
  onBuffClick?: (buff: EnhancementOption) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="handarea-buff-panel">
      <button type="button" className="handarea-buff-panel__toggle" onClick={() => setOpen((v) => !v)}>
        {open
          ? '▾ Hide buffs'
          : `▸ See your ${buffs.length} buff${buffs.length !== 1 ? 's' : ''}`}
      </button>

      {open ? (
        <div className="handarea-buff-panel__list">
          {buffs.map((buff, index) => {
            const desc = buff.description ?? ''
            return (
              <div key={buff.id ?? index} className="handarea-buff-panel__item">
                <BuffTag buff={buff} onClick={onBuffClick} />
                {desc ? <p className="handarea-buff-panel__desc">{desc}</p> : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default function HandArea({
  phase,
  displayedPlayerHp,
  playerMaxHp,
  shield,
  hand,
  selectedCards,
  deckCount,
  playerDamageAmount,
  playerDamageFloatVisible,
  playerDamageFloatKey,
  playerHudShakeNonce,
  shieldPulse,
  playerAvatarUrl,
  playerUsername,
  playerLevel,
  playerRankTitle,
  onCardClick,
  buffs = [],
  onBuffClick,
}: HandAreaProps) {
  const canInteract =
    phase === 'SKILL' || phase === 'PLAY' || phase === 'SHUFFLE'

  const sortedHand = [...hand].sort(
    (a, b) =>
      (ELEMENT_ORDER[a.element] ?? 3) - (ELEMENT_ORDER[b.element] ?? 3) ||
      b.chipValue - a.chipValue,
  )

  return (
    <div
      className={`game-handarea${shield.active ? ' game-handarea--shield' : ''}`}
    >
      <div className="handarea__top-line" aria-hidden="true" />

      <div className="handarea__hud-slot">
        {shield.active && (
          <>
            <div className="handarea__shield-ring handarea__shield-ring--outer" aria-hidden="true" />
            <div className="handarea__shield-ring handarea__shield-ring--inner" aria-hidden="true" />
            <img
              src="/images/skill-shield.png"
              className="handarea__shield-icon"
              alt=""
              draggable={false}
            />
          </>
        )}
        <div className="handarea__hud-inner">
          {playerDamageFloatVisible && playerDamageAmount > 0 && (
            <PlayerDamageFloat key={playerDamageFloatKey} value={playerDamageAmount} />
          )}
          <PlayerHUD
            hp={displayedPlayerHp}
            maxHp={playerMaxHp}
            shield={shield}
            shakeNonce={playerHudShakeNonce}
            shieldPulse={shieldPulse}
            avatarUrl={playerAvatarUrl}
            username={playerUsername}
            playerLevel={playerLevel}
            playerRankTitle={playerRankTitle}
          />
          {buffs.length > 0 ? <BuffPanel buffs={buffs} onBuffClick={onBuffClick} /> : null}
        </div>
      </div>

      {sortedHand.length > 0 ? (
        <div className="handarea__fan" aria-label="Player hand">
          <div className="handarea__fan-pivot">
            {sortedHand.map((card, index) => {
              const selIdx = selectedCards.findIndex((c) => c.id === card.id)
              return (
                <HandCard
                  key={card.id}
                  card={card}
                  selectedIndex={selIdx}
                  disabled={!canInteract}
                  fanLayout={computeHandFanLayout(index, sortedHand.length)}
                  onClick={() => onCardClick(card.id)}
                />
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="handarea__deck-slot">
        <div className="handarea__deck-stack">
          {[3, 2, 1].map((i) => (
            <div
              key={i}
              className="handarea__deck-layer"
              style={{
                transform: `translate(${i * 1.5}px, ${i * 1.5}px)`,
              }}
            />
          ))}
          <div className="handarea__deck-face">
            <span className="handarea__deck-count">{deckCount}</span>
          </div>
        </div>
        <span className="handarea__deck-label">DECK</span>
      </div>
    </div>
  )
}
