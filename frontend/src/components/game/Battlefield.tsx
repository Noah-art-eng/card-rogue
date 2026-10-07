import { resolveBossDisplayName } from '../../constants/bosses'
import '../../styles/battlefield.css'
import type { AttackEffectMode } from '../../lib/attackEffectMode'
import type { BossState, BossRoundState, RoundPhase } from '../../types/game'
import AttackEffect from './AttackEffect'
import BattlefieldVideoBackground from './BattlefieldVideoBackground'
import BossVideoDisplay, { type BossVideoMode } from './BossVideoDisplay'

export type PresentationBattlePhase = null | 'player' | 'boss' | 'shield_break'

interface BattlefieldProps {
  phase: RoundPhase
  boss: BossState
  bossRound: BossRoundState
  layer: number
  bossResolving: boolean
  battlePhase: PresentationBattlePhase
  bossVideoMode: BossVideoMode
  attackEffectMode: AttackEffectMode
  attackEffectVisible: boolean
  attackEffectKey: number
  lastScore: number
  damageFloatVisible: boolean
  damageFloatKey: number
  onBossAttackEnded?: () => void
  onBossDefeatedAnimationEnd?: () => void
}

function DamageFloat({ value }: { value: number }) {
  return (
    <div className="battlefield__damage-float">
      -{value.toLocaleString()}
    </div>
  )
}

function formatBossHp(hp: number): string {
  if (hp > 9999) return `${Math.round(hp / 1000)}k`
  if (hp > 999) return `${(hp / 1000).toFixed(1)}k`
  return String(hp)
}

function IntentIcon({ intent, attackValue }: { intent: string; attackValue: number }) {
  const isAttack = intent === 'ATTACK'
  const mod =
    intent === 'CHARGE'
      ? 'battlefield__intent-icon--charge'
      : intent === 'DEFEND'
        ? 'battlefield__intent-icon--defend'
        : 'battlefield__intent-icon--attack'

  return (
    <div className={`battlefield__intent-icon ${mod}`} title={intent}>
      {isAttack ? (
        <>
          <span className="battlefield__intent-icon-glyph">🗡</span>
          <span className="battlefield__intent-icon-val">{attackValue}</span>
        </>
      ) : (
        <span className="battlefield__intent-icon-glyph battlefield__intent-icon-glyph--solo">
          {intent === 'CHARGE' ? '⚡' : '🛡'}
        </span>
      )}
    </div>
  )
}

function BattlePhaseBanner({ battlePhase }: { battlePhase: PresentationBattlePhase }) {
  if (!battlePhase) return null

  const labels: Record<Exclude<PresentationBattlePhase, null>, string> = {
    player: '⚔  PLAYER ATTACK',
    boss: '💀  BOSS TURN',
    shield_break: '🛡️  SHIELD ABSORB',
  }

  return (
    <div className="battlefield__battle-banner-wrap">
      <div className={`battlefield__battle-banner battlefield__battle-banner--${battlePhase}`}>
        {labels[battlePhase]}
      </div>
    </div>
  )
}

export default function Battlefield({
  phase,
  boss,
  bossRound,
  layer,
  bossResolving,
  battlePhase,
  bossVideoMode,
  attackEffectMode,
  attackEffectVisible,
  attackEffectKey,
  lastScore,
  damageFloatVisible,
  damageFloatKey,
  onBossAttackEnded,
  onBossDefeatedAnimationEnd,
}: BattlefieldProps) {
  const intent = bossRound.intent ?? 'ATTACK'
  const attackValue = bossRound.willReleaseCharge
    ? boss.chargeAttack
    : boss.attackPerRound

  const showBossFlash = battlePhase === 'boss' || (bossResolving && phase === 'BOSS_ATTACK')
  const bossDisplayName = resolveBossDisplayName({ layer, bossName: boss.name })

  return (
    <div
      className={`game-battlefield${showBossFlash ? ' game-battlefield--boss-flash' : ''}`}
    >
      <BattlefieldVideoBackground bossPhaseActive={showBossFlash} />
      <div className="battlefield__overlay" />

      <div className="battlefield__floor-plaque">
        <span className="battlefield__floor-text">Floor {layer}</span>
      </div>

      <BattlePhaseBanner battlePhase={battlePhase} />

      <div className="battlefield-boss-area">
        <div className="battlefield-attack-effects-host" aria-hidden>
          <AttackEffect
            key={attackEffectKey}
            mode={attackEffectMode}
            visible={attackEffectVisible}
          />
        </div>

        {damageFloatVisible && lastScore > 0 && (
          <DamageFloat key={damageFloatKey} value={lastScore} />
        )}

        <div className="battlefield-boss-glow" aria-hidden="true" />

        <div className="battlefield-boss-stack">
          <div className="battlefield-boss-video-frame">
            <BossVideoDisplay
              mode={bossVideoMode}
              alt={bossDisplayName}
              onAttackEnded={onBossAttackEnded}
              onDefeatedAnimationEnd={onBossDefeatedAnimationEnd}
            />
            <div className="battlefield-boss-video-frame__vignette" aria-hidden="true" />
            <div className="battlefield-boss-video-frame__fade" aria-hidden="true" />
          </div>

          <div className="battlefield-boss-info-row">
            <IntentIcon intent={intent} attackValue={attackValue} />

            <div className="battlefield-boss-name-pill">
              <span className="battlefield-boss-name-inline">{bossDisplayName}</span>
            </div>

            <div
              className="battlefield__hp-badge"
              title={`${boss.hp} / ${boss.maxHp}`}
            >
              {formatBossHp(boss.hp)}
            </div>
          </div>
        </div>

        {bossRound.isDefending && (
          <span className="battlefield__status-tag battlefield__status-tag--defend">
            Defending
          </span>
        )}
        {bossRound.willReleaseCharge && (
          <span className="battlefield__status-tag battlefield__status-tag--charge">
            Charge Stored
          </span>
        )}
      </div>
    </div>
  )
}
