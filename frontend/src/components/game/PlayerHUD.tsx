import type { ShieldState } from '../../types/game'
import {
  GAME_AVATAR_FRAME_SHIELD_SRC,
  GAME_AVATAR_FRAME_SRC,
  getAvatarDisplaySrc,
  hasCustomAvatar,
} from '../../lib/avatar'
import './player-hud.css'

interface PlayerHUDProps {
  hp: number
  maxHp: number
  shield: ShieldState
  shakeNonce?: number
  shieldPulse?: boolean
  avatarUrl?: string | null
  username?: string | null
  playerLevel?: number
  playerRankTitle?: string
}

export default function PlayerHUD({
  hp,
  maxHp,
  shield,
  shakeNonce = 0,
  shieldPulse = false,
  avatarUrl,
  username,
  playerLevel = 1,
  playerRankTitle = 'Wanderer',
}: PlayerHUDProps) {
  const percent = maxHp > 0 ? Math.min(1, Math.max(0, hp / maxHp)) : 0
  const isCritical = percent <= 0.25
  const displayName = username?.trim() || 'Traveler'

  let shieldLabel = 'Shield'
  let shieldClass = 'player-hud__shield--off'
  if (shield.active) {
    shieldLabel = 'Active'
    shieldClass = 'player-hud__shield--active'
  } else if (shield.onCooldown) {
    shieldLabel = `CD ${shield.cooldownRounds}`
    shieldClass = 'player-hud__shield--cooldown'
  }

  const rootClass = [
    'player-hud',
    shakeNonce > 0 ? 'player-hud--shake' : '',
    shieldPulse ? 'player-hud--shield-pulse' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const avatarFrameClass = [
    'avatar-frame',
    shield.active ? 'avatar-frame--shield' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const avatarFrameSrc = shield.active ? GAME_AVATAR_FRAME_SHIELD_SRC : GAME_AVATAR_FRAME_SRC

  const hpTrackClass = [
    'player-hud__hp-track',
    isCritical ? 'player-hud__hp-track--critical' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClass} key={shakeNonce > 0 ? `shake-${shakeNonce}` : 'steady'}>
      <div className="player-hud__panel">
        <div className={avatarFrameClass}>
          <div className="avatar-frame__portrait">
            <img
              src={hasCustomAvatar(avatarUrl) ? getAvatarDisplaySrc(avatarUrl) : '/images/player.png'}
              className="avatar-frame__photo"
              alt={username ? `${username} avatar` : ''}
              draggable={false}
            />
          </div>
          <img
            src={avatarFrameSrc}
            className="avatar-frame__border"
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        </div>

        <div className="player-hud__info">
          <div className="player-hud__name">{displayName}</div>
          <div className="player-hud__meta">
            <span className="player-hud__level">Lv.{playerLevel}</span>
            <span className="player-hud__meta-sep" aria-hidden="true">
              {' '}
              ·{' '}
            </span>
            <span className="player-hud__rank">{playerRankTitle}</span>
          </div>

          <div className="player-hud__hp-meta">
            <span className="player-hud__hp-label">HP</span>
            <span className="player-hud__hp-values">
              <span className="player-hud__hp-current">{hp}</span>
              <span className="player-hud__hp-sep"> / </span>
              <span className="player-hud__hp-max">{maxHp}</span>
            </span>
          </div>

          <div
            className={hpTrackClass}
            style={{ ['--hp-percent' as string]: `${percent * 100}%` }}
            role="progressbar"
            aria-valuenow={hp}
            aria-valuemin={0}
            aria-valuemax={maxHp}
            aria-label="Player health"
          >
            <div className="player-hud__hp-fill" />
          </div>

          {shield.active || shield.onCooldown ? (
            <div className={`player-hud__shield ${shieldClass}`}>
              <img
                src="/images/skill-shield.png"
                className="player-hud__shield-icon"
                alt=""
                aria-hidden="true"
                draggable={false}
              />
              <span>{shieldLabel}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
