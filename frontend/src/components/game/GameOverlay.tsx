/**
 * PvE 胜负后的覆盖层。
 * 它根据最终战斗结果展示重开、继续肉鸽或返回大厅等下一步操作。
 */

import type { BattleResult } from '../../types/game'

interface GameOverlayProps {
  battleResult: BattleResult
  layer: number
  totalScore: number
  xpEarned?: number
  onPlayAgain: () => void
  onExitToLobby: () => void
}

// 根据胜负结果展示结算、重开或返回大厅操作。
export default function GameOverlay({
  battleResult,
  layer,
  totalScore,
  xpEarned = 0,
  onPlayAgain,
  onExitToLobby,
}: GameOverlayProps) {
  if (battleResult === 'ONGOING') {
    return null
  }

  const isWin = battleResult === 'WIN'

  return (
    <div className="game-overlay">
      <div className="game-overlay__card">
        <div className="game-overlay__icon" aria-hidden="true">
          {isWin ? '🏆' : '💀'}
        </div>

        <div className={`game-overlay__title game-overlay__title--${isWin ? 'win' : 'lose'}`}>
          {isWin ? 'VICTORY!' : 'GAME OVER'}
        </div>

        {!isWin && (
          <div className="game-overlay__summary">
            Reached Floor <span>{layer}</span>
            <br />
            Total Score <span>{totalScore.toLocaleString()}</span>
          </div>
        )}

        {xpEarned > 0 && (
          <div className="game-overlay__xp">+{xpEarned.toLocaleString()} XP</div>
        )}

        <div className="game-overlay__actions">
          <button
            type="button"
            className="game-overlay__btn game-overlay__btn--primary"
            onClick={onPlayAgain}
          >
            Play Again
          </button>
          <button
            type="button"
            className="game-overlay__btn game-overlay__btn--secondary"
            onClick={onExitToLobby}
          >
            Exit to Lobby
          </button>
        </div>
      </div>
    </div>
  )
}
