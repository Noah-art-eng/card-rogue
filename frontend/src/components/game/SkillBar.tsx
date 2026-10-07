import { useState, type ReactNode } from 'react'
import '../../styles/skill-bar.css'
import type { Card, Element, RoundPhase, RoundSkillsState } from '../../types/game'

type Panel = 'color' | 'rank' | 'shield' | null
type SkillStatus = 'ready' | 'active' | 'cooldown' | null

interface SkillBarProps {
  phase: RoundPhase
  hand: Card[]
  skillState: RoundSkillsState
  onUseShield: () => void
  onUseChangeColor: (cardId: string, targetElement: Element) => void
  onUseChangeRank: (cardId: string, targetRank: number) => void
}

const ELEMENTS: Element[] = ['FIRE', 'WATER', 'GRASS']

const ELEMENT_META: Record<
  Element,
  { label: string; dot: string; bg: string }
> = {
  FIRE: { label: 'Red', dot: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  WATER: { label: 'Blue', dot: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  GRASS: { label: 'Green', dot: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
}

const ELEMENT_DOT: Record<Element, string> = {
  FIRE: '#ef4444',
  WATER: '#3b82f6',
  GRASS: '#22c55e',
}

const ELEMENT_SORT: Record<Element, number> = {
  FIRE: 0,
  WATER: 1,
  GRASS: 2,
}

const ELEMENT_SHORT: Record<Element, string> = {
  FIRE: 'Fire',
  WATER: 'Water',
  GRASS: 'Grass',
}

const DISPLAY_RANK: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }
const ALL_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
const MAX_ENERGY = 3

export default function SkillBar({
  phase,
  hand,
  skillState,
  onUseShield,
  onUseChangeColor,
  onUseChangeRank,
}: SkillBarProps) {
  const [panel, setPanel] = useState<Panel>(null)
  const [targetCardId, setTargetCardId] = useState<string | null>(null)

  const energy = skillState.energy.energy
  const { shield } = skillState
  const locked = phase !== 'SKILL' || energy <= 0
  const shieldLocked = locked || shield.onCooldown

  const sortedHand = [...hand].sort(
    (a, b) =>
      (ELEMENT_SORT[a.element] ?? 3) - (ELEMENT_SORT[b.element] ?? 3) ||
      b.chipValue - a.chipValue,
  )

  const targetCard = targetCardId
    ? hand.find((c) => c.id === targetCardId) ?? null
    : null

  function closePanel() {
    setPanel(null)
    setTargetCardId(null)
  }

  function openColorSkill() {
    if (locked) return
    setPanel(panel === 'color' ? null : 'color')
    setTargetCardId(null)
  }

  function openRankSkill() {
    if (locked) return
    setPanel(panel === 'rank' ? null : 'rank')
    setTargetCardId(null)
  }

  function openShieldSkill() {
    if (energy <= 0 || shield.onCooldown || shield.active) return
    onUseShield()
    setPanel('shield')
    window.setTimeout(() => setPanel(null), 1500)
  }

  function applyColor(next: Element) {
    if (!targetCardId) return
    onUseChangeColor(targetCardId, next)
    closePanel()
  }

  function applyRank(nextRank: number) {
    if (!targetCardId) return
    onUseChangeRank(targetCardId, nextRank)
    closePanel()
  }

  const colorStatus: SkillStatus = locked
    ? null
    : panel === 'color'
      ? 'active'
      : 'ready'

  const rankStatus: SkillStatus = locked
    ? null
    : panel === 'rank'
      ? 'active'
      : 'ready'

  let shieldStatus: SkillStatus = null
  if (shield.onCooldown) {
    shieldStatus = 'cooldown'
  } else if (shield.active || panel === 'shield') {
    shieldStatus = 'active'
  } else if (!shieldLocked) {
    shieldStatus = 'ready'
  }

  return (
    <div className="game-skillbar skill-relic-panel">
      <img
        src="/images/skillbar-top.png"
        alt=""
        className="skill-relic-panel__ornament skill-relic-panel__ornament--top"
        draggable={false}
      />

      <div className="skill-relic-panel__glass">
        <section className="skill-relic-panel__charges" aria-label="Skill charges">
          <div className="skill-relic-panel__charges-label">CHARGES</div>
          <div
            className={`skill-relic-panel__charges-value${energy > 0 ? ' skill-relic-panel__charges-value--live' : ''}`}
          >
            {energy}
          </div>
          <div className="skill-relic-panel__pips" aria-hidden="true">
            {Array.from({ length: MAX_ENERGY }).map((_, i) => (
              <div
                key={i}
                className={`skill-relic-panel__pip${i < energy ? ' skill-relic-panel__pip--active' : ''}`}
              />
            ))}
          </div>
        </section>

        <div className="skill-relic-panel__divider" aria-hidden="true" />

        <div className="skill-relic-panel__relics">
          <RefSkillSlot
            label="Color"
            iconSrc="/images/skill-color.png"
            disabled={locked}
            status={colorStatus}
            onClick={openColorSkill}
          />

          <RefSkillSlot
            label="Rank"
            iconSrc="/images/skill-changenumber.png"
            disabled={locked}
            status={rankStatus}
            onClick={openRankSkill}
          />

          <RefSkillSlot
            label="Shield"
            iconSrc="/images/skill-shield.png"
            disabled={shieldLocked}
            status={shieldStatus}
            onClick={openShieldSkill}
          />
        </div>
      </div>

      <img
        src="/images/skillbar-bottom.png"
        alt=""
        className="skill-relic-panel__ornament skill-relic-panel__ornament--bottom"
        draggable={false}
      />

      {panel === 'color' && (
        <SkillPanel title="✦ Change Color" onClose={closePanel}>
          <p className="skill-panel__hint">
            {!targetCardId ? 'Select a card to transform' : 'Choose target color'}
          </p>
          {!targetCardId ? (
            <div className="skill-panel__card-list">
              {sortedHand.map((card) => (
                <MiniCardRow
                  key={card.id}
                  card={card}
                  onClick={() => setTargetCardId(card.id)}
                />
              ))}
            </div>
          ) : (
            <div className="skill-panel__color-list">
              {ELEMENTS.filter((el) => el !== targetCard?.element).map((el) => {
                const meta = ELEMENT_META[el]
                return (
                  <button
                    key={el}
                    type="button"
                    className="skill-panel__color-btn"
                    style={{
                      borderColor: meta.dot,
                      background: meta.bg,
                      color: meta.dot,
                    }}
                    onClick={() => applyColor(el)}
                  >
                    <span
                      className="skill-panel__color-dot"
                      style={{ background: meta.dot, boxShadow: `0 0 6px ${meta.dot}` }}
                    />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          )}
        </SkillPanel>
      )}

      {panel === 'rank' && (
        <SkillPanel title="✦ Change Rank" onClose={closePanel}>
          <p className="skill-panel__hint">
            {!targetCardId ? 'Select a card to transform' : 'Choose new rank'}
          </p>
          {!targetCardId ? (
            <div className="skill-panel__card-list">
              {sortedHand.map((card) => (
                <MiniCardRow
                  key={card.id}
                  card={card}
                  onClick={() => setTargetCardId(card.id)}
                />
              ))}
            </div>
          ) : (
            <div className="skill-panel__rank-grid">
              {ALL_RANKS.map((rank) => {
                const isCurrent = rank === targetCard?.rank
                return (
                  <button
                    key={rank}
                    type="button"
                    className={`skill-panel__rank-btn${isCurrent ? ' skill-panel__rank-btn--current' : ''}`}
                    disabled={isCurrent}
                    onClick={() => applyRank(rank)}
                  >
                    {DISPLAY_RANK[rank] ?? rank}
                  </button>
                )
              })}
            </div>
          )}
        </SkillPanel>
      )}

      {panel === 'shield' && (
        <SkillPanel title="" onClose={closePanel}>
          <div className="skill-panel__shield-active">
            <img
              src="/images/skill-shield.png"
              alt=""
              className="skill-panel__shield-icon"
              draggable={false}
            />
            <div className="skill-panel__shield-title">Shield Active!</div>
            <div className="skill-panel__shield-sub">Next attack absorbed</div>
          </div>
        </SkillPanel>
      )}
    </div>
  )
}

function RefSkillSlot({
  label,
  iconSrc,
  disabled,
  status,
  onClick,
}: {
  label: string
  iconSrc: string
  disabled?: boolean
  status: SkillStatus
  onClick?: () => void
}) {
  const statusLabel =
    status === 'cooldown'
      ? 'COOLDOWN'
      : status === 'active'
        ? 'ACTIVE'
        : status === 'ready'
          ? 'READY'
          : ''

  return (
    <div
      className={[
        'skill-relic-card',
        disabled ? 'skill-relic-card--disabled' : '',
        status ? `skill-relic-card--${status}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled || !onClick) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <img src={iconSrc} alt="" className="skill-relic-card__icon" draggable={false} />
      <span className="skill-relic-card__name">{label.toUpperCase()}</span>
      {statusLabel ? (
        <span className={`skill-relic-card__status skill-relic-card__status--${status}`}>
          {statusLabel}
        </span>
      ) : null}
    </div>
  )
}

function SkillPanel({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="skill-panel">
      <div className="skill-panel__header">
        {title ? <span className="skill-panel__title">{title}</span> : <span />}
        <button type="button" className="skill-panel__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      {children}
    </div>
  )
}

function MiniCardRow({ card, onClick }: { card: Card; onClick: () => void }) {
  const dot = ELEMENT_DOT[card.element] ?? '#888'
  const name = `${ELEMENT_SHORT[card.element]}-${card.displayRank}`

  return (
    <button type="button" className="skill-panel__card-row" onClick={onClick}>
      <span className="skill-panel__card-dot" style={{ background: dot, boxShadow: `0 0 5px ${dot}` }} />
      <span className="skill-panel__card-rank">{card.displayRank}</span>
      <span className="skill-panel__card-name">{name}</span>
    </button>
  )
}
