/**
 * 玩家手牌、选牌和肉鸽强化的展示区域。
 * 它按响应式扇形布局排列卡牌，处理悬停/拖动焦点，并展示护盾、强化和受击浮字。
 */

import { useCallback, useEffect, useRef, useState } from 'react'

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

// 读取 CSS 中的手牌扇形参数，让脚本计算和响应式样式保持一致。
function readHandFanSpread(): number {
  if (typeof document === 'undefined') return 1
  const root = document.querySelector('.game-handarea')
  if (!root) return 1
  const raw = getComputedStyle(root).getPropertyValue('--cg-hand-fan-spread').trim()
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

// 监听页面宽度变化并返回当前适合手牌区域的扇形展开角度。
function useHandFanSpread(): number {
  const [spread, setSpread] = useState(1)
  useEffect(() => {
    // 将最新 CSS 扇形参数写回 Hook 状态，触发手牌重新排布。
    const update = () => setSpread(readHandFanSpread())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return spread
}

// 按元素和点数稳定排序手牌，避免重渲染时卡牌位置无故跳动。
function sortHandCards(cards: Card[]): Card[] {
  return [...cards].sort(
    (a, b) =>
      (ELEMENT_ORDER[a.element] ?? 3) - (ELEMENT_ORDER[b.element] ?? 3) ||
      b.chipValue - a.chipValue,
  )
}

// 用实际卡牌位置计算最近目标，并给当前悬停牌加权，避免扇形手牌间来回闪烁。
function findNearestCardId(
  pivot: HTMLElement,
  clientX: number,
  clientY: number,
  currentId: string | null,
): string | null {
  const cards = pivot.querySelectorAll<HTMLElement>('[data-hand-card-id]')
  let bestId: string | null = null
  let bestScore = Infinity

  cards.forEach((el) => {
    const id = el.dataset.handCardId
    if (!id) return
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return

    const padX = r.width * 0.5
    const padTop = r.height * 2.5
    const padBottom = r.height * 0.25

    if (
      clientX < r.left - padX ||
      clientX > r.right + padX ||
      clientY < r.top - padTop ||
      clientY > r.bottom + padBottom
    ) return

    const cx = r.left + r.width / 2
    let score = Math.abs(clientX - cx)
    if (id === currentId) score *= 0.7
    const z = Number.parseInt(el.style.zIndex || '0', 10)
    score -= z * 0.3

    if (score < bestScore) {
      bestScore = score
      bestId = id
    }
  })

  return bestId
}

// 在玩家受到 Boss 伤害后显示扣血浮字。
function PlayerDamageFloat({ value }: { value: number }) {
  return <div className="handarea__player-damage-float">-{value.toLocaleString()}</div>
}

// 为不同元素的肉鸽强化选择一致的强调色。
function buffAccentColor(element?: string): string {
  if (element === 'WATER') return '#4ea8ff'
  if (element === 'FIRE') return '#ff6644'
  if (element === 'GRASS') return '#5ce68c'
  return '#f0d060'
}

// 展示单个已获得强化，并在允许时响应玩家查看操作。
function BuffTag({ buff, onClick }: { buff: EnhancementOption; onClick?: (b: EnhancementOption) => void }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const label = buff.label ?? buff.id
  const desc = buff.description ?? ''
  const element = (buff.buff && 'element' in buff.buff ? buff.buff.element : undefined) ?? buff.element
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
        <div className="handarea-buff-tag__tooltip" style={{ borderColor: `${color}66` }}>
          {desc}
        </div>
      ) : null}
    </div>
  )
}

// 把本局肉鸽强化汇总为手牌区域旁的可浏览列表。
function BuffPanel({ buffs, onBuffClick }: { buffs: EnhancementOption[]; onBuffClick?: (b: EnhancementOption) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="handarea-buff-panel">
      <button type="button" className="handarea-buff-panel__toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '▾ Hide buffs' : `▸ See your ${buffs.length} buff${buffs.length !== 1 ? 's' : ''}`}
      </button>
      {open ? (
        <div className="handarea-buff-panel__list">
          {buffs.map((buff, i) => {
            const desc = buff.description ?? ''
            return (
              <div key={buff.id ?? i} className="handarea-buff-panel__item">
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

// 展示玩家手牌、选牌状态和战斗中浮动伤害等交互信息。
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
  const canInteract = phase === 'SKILL' || phase === 'PLAY' || phase === 'SHUFFLE'
  const handFanSpread = useHandFanSpread()
  const fanPivotRef = useRef<HTMLDivElement>(null)
  const currentIdRef = useRef<string | null>(null)
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)

  // 在键盘或指针操作时同步当前高亮手牌，保证视觉焦点一致。
  const updateHover = useCallback((id: string | null) => {
    currentIdRef.current = id
    setHoveredCardId((prev) => (prev === id ? prev : id))
  }, [])

  // 阶段切换到不可操作时清掉悬停状态，避免保留失效的高亮。
  useEffect(() => {
    if (!canInteract) updateHover(null)
  }, [canInteract, updateHover])

  useEffect(() => {
    if (currentIdRef.current && !hand.some((c) => c.id === currentIdRef.current)) {
      updateHover(null)
    }
  }, [hand, updateHover])

  // 扇形手牌会超出容器范围，所以监听全局指针移动来保持悬停判定准确。
  useEffect(() => {
    if (!canInteract || hand.length === 0) {
      updateHover(null)
      return
    }
    const pivot = fanPivotRef.current
    if (!pivot) return

    // 拖动手牌时根据指针位置更新悬停目标，便于快速连续选牌。
    const onMove = (e: PointerEvent) => {
      const id = findNearestCardId(pivot, e.clientX, e.clientY, currentIdRef.current)
      updateHover(id)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [canInteract, hand.length, updateHover])

  const sortedHand = sortHandCards(hand)

  return (
    <div className={`game-handarea${shield.active ? ' game-handarea--shield' : ''}`}>
      <div className="handarea__top-line" aria-hidden="true" />

      <div className="handarea__hud-slot">
        {shield.active && (
          <>
            <div className="handarea__shield-ring handarea__shield-ring--outer" aria-hidden="true" />
            <div className="handarea__shield-ring handarea__shield-ring--inner" aria-hidden="true" />
            <img src="/images/skill-shield.png" className="handarea__shield-icon" alt="" draggable={false} />
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
          <div ref={fanPivotRef} className="handarea__fan-pivot">
            {sortedHand.map((card, index) => {
              const selIdx = selectedCards.findIndex((c) => c.id === card.id)
              return (
                <HandCard
                  key={card.id}
                  card={card}
                  selectedIndex={selIdx}
                  disabled={!canInteract}
                  isHovered={hoveredCardId === card.id}
                  fanLayout={computeHandFanLayout(index, sortedHand.length, handFanSpread)}
                  onClick={() => onCardClick(card.id)}
                  onPointerEnter={() => updateHover(card.id)}
                />
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="handarea__deck-slot">
        <div className="handarea__deck-stack">
          {[3, 2, 1].map((i) => (
            <div key={i} className="handarea__deck-layer" style={{ transform: `translate(${i * 1.5}px, ${i * 1.5}px)` }} />
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
