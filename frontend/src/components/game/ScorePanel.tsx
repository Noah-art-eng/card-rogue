import { useEffect, useRef, useState } from 'react'
import type { HandType, RoundPhase } from '../../types/game'
import type { EvaluatorResult } from '../../lib/handEvaluator'
import './score-panel.css'

const MAX_CARDS = 5
const MAX_SHUFFLE = 2
const TOTAL_SCORE_DIGITS = 5

const HAND_TYPE_LABELS: Record<HandType, string> = {
  STRAIGHT_FLUSH: 'Straight Flush',
  FOUR_OF_A_KIND: 'Four of a Kind',
  FULL_HOUSE: 'Full House',
  FLUSH: 'Flush',
  STRAIGHT: 'Straight',
  THREE_OF_A_KIND: 'Three of a Kind',
  TWO_PAIR: 'Two Pair',
  PAIR: 'Pair',
  HIGH_CARD: 'High Card',
}

interface ScorePanelProps {
  phase: RoundPhase
  round: number
  totalScore: number
  selectedCount: number
  shuffleRemaining: number
  evaluatorResult: EvaluatorResult | null
  lastPlayScore: number
  shieldActive?: boolean
  skillLogEvent?: { kind: 'rank' | 'color'; id: number } | null
  onPlayAttack: () => void
  onDiscardDraw: () => void
}

export default function ScorePanel({
  phase,
  round,
  totalScore,
  selectedCount,
  shuffleRemaining,
  evaluatorResult,
  lastPlayScore,
  shieldActive = false,
  skillLogEvent = null,
  onPlayAttack,
  onDiscardDraw,
}: ScorePanelProps) {
  const hasCards = selectedCount > 0

  const playInactive = phase === 'BOSS_ATTACK' || phase === 'ROUND_END'
  const shuffleInactive =
    phase === 'BOSS_ATTACK' ||
    phase === 'ROUND_END' ||
    phase === 'PLAY' ||
    shuffleRemaining <= 0

  const playBtnDisabled = playInactive || !hasCards
  const shuffleBtnDisabled = shuffleInactive || !hasCards

  const playBtnClass = [
    'scorepanel__img-btn',
    'scorepanel__img-btn--play',
    !playInactive && 'scorepanel__img-btn--breathing',
    playInactive && 'scorepanel__img-btn--inactive',
  ]
    .filter(Boolean)
    .join(' ')

  const shuffleBtnClass = [
    'scorepanel__img-btn',
    'scorepanel__img-btn--discard',
    !shuffleInactive && 'scorepanel__img-btn--breathing',
    shuffleInactive && 'scorepanel__img-btn--inactive',
  ]
    .filter(Boolean)
    .join(' ')

  const roundDisplay = String(Math.max(0, round)).padStart(2, '0')
  const totalDisplay = String(Math.max(0, totalScore)).padStart(TOTAL_SCORE_DIGITS, '0')

  const [combatLog, setCombatLog] = useState<{
    text: string
    tone: 'waiting' | 'damage' | 'shield' | 'skill'
  }>({
    text: 'Waiting…',
    tone: 'waiting',
  })
  const prevLastPlayRef = useRef(0)
  const prevShieldRef = useRef(false)

  useEffect(() => {
    if (lastPlayScore > 0 && lastPlayScore !== prevLastPlayRef.current) {
      setCombatLog({
        text: `+${lastPlayScore.toLocaleString()} Damage`,
        tone: 'damage',
      })
      prevLastPlayRef.current = lastPlayScore
    }
  }, [lastPlayScore])

  useEffect(() => {
    if (shieldActive && !prevShieldRef.current) {
      setCombatLog({ text: 'Shield Active', tone: 'shield' })
    }
    prevShieldRef.current = shieldActive
  }, [shieldActive])

  useEffect(() => {
    if (!skillLogEvent) return
    setCombatLog({
      text: skillLogEvent.kind === 'rank' ? 'Rank Changed' : 'Color Changed',
      tone: 'skill',
    })
  }, [skillLogEvent])

  return (
    <div className="game-scorepanel">
      <div className="scorepanel__section">
        <div className="scorepanel__label">Round</div>
        <div className="scorepanel__round-value">{roundDisplay}</div>
      </div>

      <div className="scorepanel__section">
        <div className="scorepanel__label">Total Score</div>
        <div className="scorepanel__arcade">
          <div className="scorepanel__arcade-value">{totalDisplay}</div>
        </div>
      </div>

      <div className="scorepanel__section">
        <div className="scorepanel__label">Selected</div>
        <div className="scorepanel__gems" aria-hidden="true">
          {Array.from({ length: MAX_CARDS }).map((_, i) => (
            <span
              key={i}
              className={`scorepanel__gem${i < selectedCount ? ' scorepanel__gem--filled' : ''}`}
            >
              ◆
            </span>
          ))}
        </div>
        <div className="scorepanel__selected-row">
          <span className="scorepanel__selected-count">
            {selectedCount}/{MAX_CARDS}
          </span>
        </div>
      </div>

      <div className="scorepanel__section">
        <div className="scorepanel__label">Current Hand</div>
        <div className="scorepanel__hand-card">
          {evaluatorResult ? (
            <>
              <div className="scorepanel__hand-name">
                {HAND_TYPE_LABELS[evaluatorResult.handType]}
              </div>
              <div className="scorepanel__hand-stats">
                <div className="scorepanel__hand-stat">
                  <span className="scorepanel__hand-stat-label">Damage</span>
                  <span className="scorepanel__hand-stat-value">
                    {evaluatorResult.total.toLocaleString()}
                  </span>
                </div>
                <div className="scorepanel__hand-stat">
                  <span className="scorepanel__hand-stat-label">Multiplier</span>
                  <span className="scorepanel__hand-stat-value">
                    {evaluatorResult.mult.toFixed(1)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="scorepanel__hand-name scorepanel__hand-name--empty">
                No Combination
              </div>
              <div className="scorepanel__hand-stats">
                <div className="scorepanel__hand-stat">
                  <span className="scorepanel__hand-stat-label">Damage</span>
                  <span className="scorepanel__hand-stat-value scorepanel__hand-stat-value--muted">
                    –
                  </span>
                </div>
                <div className="scorepanel__hand-stat">
                  <span className="scorepanel__hand-stat-label">Multiplier</span>
                  <span className="scorepanel__hand-stat-value scorepanel__hand-stat-value--muted">
                    –
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className={`scorepanel__combat-log scorepanel__combat-log--${combatLog.tone}`}
        aria-live="polite"
      >
        {combatLog.text}
      </div>

      <div className="scorepanel__actions">
        <button
          type="button"
          className={playBtnClass}
          onClick={onPlayAttack}
          disabled={playBtnDisabled}
          aria-label="Play & Attack"
        >
          <img
            src="/images/play-button.png"
            alt=""
            className="scorepanel__img-btn-bg"
            draggable={false}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          className={shuffleBtnClass}
          onClick={onDiscardDraw}
          disabled={shuffleBtnDisabled}
          aria-label={`Discard & Draw, ${shuffleRemaining} of ${MAX_SHUFFLE} remaining`}
        >
          <img
            src="/images/discard-button.png"
            alt=""
            className="scorepanel__img-btn-bg"
            draggable={false}
            aria-hidden="true"
          />
          <span className="scorepanel__discard-meta" aria-hidden="true">
            <span className="scorepanel__discard-badge">
              {shuffleRemaining}/{MAX_SHUFFLE}
            </span>
          </span>
        </button>
      </div>

      {phase === 'BOSS_ATTACK' && (
        <div className="scorepanel__phase-hint scorepanel__phase-hint--warn">
          Boss is acting…
        </div>
      )}
    </div>
  )
}
