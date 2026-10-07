import './game-topbar.css'

interface GameTopBarProps {
  connected: boolean
  layer: number
  round: number
  totalDamageDealt: number
  onExit: () => void
  muted?: boolean
  onToggleMute?: () => void
}

export default function GameTopBar({
  connected,
  layer,
  round,
  totalDamageDealt,
  onExit,
  muted = false,
  onToggleMute,
}: GameTopBarProps) {
  const connLabel = connected ? 'CONNECTED' : 'DISCONNECTED'

  return (
    <header className="game-topbar">
      <div className="game-topbar__brand">
        CARD&nbsp;&nbsp;ROGUE
      </div>

      <div className="game-topbar__stats">
        <span className="game-topbar__stat-inline game-topbar__stat-inline--muted">
          {connLabel}
        </span>
        <span className="game-topbar__stat-inline">ROUND&nbsp;{round || 1}</span>
        <span className="game-topbar__stat-inline">FLOOR&nbsp;{layer}</span>
        <span className="game-topbar__stat-inline game-topbar__stat-inline--score">
          SCORE&nbsp;{totalDamageDealt.toLocaleString()}
        </span>
      </div>

      <div className="game-topbar__actions">
        {onToggleMute ? (
          <button
            type="button"
            className="game-topbar__img-btn game-topbar__img-btn--mute"
            onClick={onToggleMute}
            title={muted ? 'Sound off — click to enable' : 'Sound on — click to mute'}
            aria-label={muted ? 'Sound off' : 'Sound on'}
            aria-pressed={!muted}
          >
            <img
              src={muted ? '/images/volume-off.png' : '/images/volume-on.png'}
              alt=""
              className="game-topbar__img-btn-bg"
              draggable={false}
              aria-hidden="true"
            />
          </button>
        ) : null}
        <button
          type="button"
          className="game-topbar__img-btn game-topbar__img-btn--exit"
          onClick={onExit}
          aria-label="Exit"
        >
          <img
            src="/images/exit-button.png"
            alt=""
            className="game-topbar__img-btn-bg"
            draggable={false}
            aria-hidden="true"
          />
        </button>
      </div>
    </header>
  )
}
