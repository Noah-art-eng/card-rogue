/**
 * PvE 战场的 Boss、伤害和阶段提示区域。
 * 它把服务端状态转换为 Boss 血量、意图、攻击浮字和双方行动提示。
 */

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

// 在 Boss 受击时显示本次伤害浮字。
function DamageFloat({ value }: { value: number }) {
  return (
    <div className="battlefield__damage-float">
      -{value.toLocaleString()}
    </div>
  )
}

// 将 Boss 血量格式化为更易阅读的紧凑数字。
function formatBossHp(hp: number): string {
  if (hp > 9999) return `${Math.round(hp / 1000)}k`
  if (hp > 999) return `${(hp / 1000).toFixed(1)}k`
  return String(hp)
}

// 按 Boss 本回合意图显示攻击、防御或蓄力提示。
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

// 在玩家攻击或 Boss 行动切换时展示短暂的阶段横幅。
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

// 组合 Boss、玩家和战斗提示，呈现当前 PvE 回合状态。
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
