import type { HandType } from '../../types/game'
import type { EvaluatorResult } from '../../lib/handEvaluator'

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

interface HandTypeDisplayProps {
  evaluation: EvaluatorResult
}

export default function HandTypeDisplay({ evaluation }: HandTypeDisplayProps) {
  const { handType, chips, cardChips, mult, total, isDefendReduced } = evaluation

  return (
    <div className="handtype-display">
      <div className="handtype-display__name">{HAND_TYPE_LABELS[handType]}</div>

      <div className="handtype-display__formula" aria-label="Score formula">
        <span className="handtype-display__base">{chips}</span>
        {cardChips > 0 && (
          <>
            <span className="handtype-display__op">+</span>
            <span className="handtype-display__bonus">{cardChips}</span>
          </>
        )}
        <span className="handtype-display__op">×</span>
        <span className="handtype-display__mult">{mult.toFixed(1)}</span>
      </div>

      <div className="handtype-display__total">
        <span className="handtype-display__damage-num">{total.toLocaleString()}</span>
        <span className="handtype-display__damage-pts">pts</span>
        {isDefendReduced && (
          <span className="handtype-display__defend-tag">DEFEND</span>
        )}
      </div>
    </div>
  )
}
