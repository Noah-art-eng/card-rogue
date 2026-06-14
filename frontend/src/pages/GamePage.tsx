import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Socket } from 'socket.io-client'

import { createGameSocket } from '../socket/client'
import LoadingScreen from '../components/common/LoadingScreen'
import { useGameAudio } from '../hooks/useGameAudio'
import { awardMatchXp } from '../lib/xpStorage'
import { computeMatchXpReward, getLobbyXpForUser } from '../lib/xpSystem'
import { useAuth } from '../stores/AuthContext'
import type { Element, GameState } from '../types/game'
import { evaluateHand } from '../lib/handEvaluator'
import {
  inferAttackEffectModeFromCards,
  type AttackEffectMode,
} from '../lib/attackEffectMode'
import type { Card } from '../types/game'

import '../components/game/game.css'
import '../components/game/game-visual-ref.css'
import Battlefield, { type PresentationBattlePhase } from '../components/game/Battlefield'
import type { BossVideoMode } from '../components/game/BossVideoDisplay'
import GameTopBar from '../components/game/GameTopBar'
import GameOverlay from '../components/game/GameOverlay'
import GameToast from '../components/game/GameToast'
import HandArea from '../components/game/HandArea'
import ScorePanel from '../components/game/ScorePanel'
import SkillBar from '../components/game/SkillBar'

const BOSS_ATTACK_VIDEO_FALLBACK_MS = 12_500
const BATTLE_BANNER_MS = 1500
const ATTACK_EFFECT_VISIBLE_MS = 1050
const BOSS_DEFEATED_FALLBACK_MS = 14000
const PLAYER_DAMAGE_FLOAT_MS = 1200
const LOSE_OVERLAY_DELAY_MS = 400
const SHIELD_PULSE_MS = 1500
const MAX_SELECT = 5

export default function GamePage() {
  const navigate = useNavigate()
  const { user, fetchMe } = useAuth()
  const [searchParams] = useSearchParams()
  const layerParam = searchParams.get('layer')
  const layer = layerParam ? Number(layerParam) : 1

  const playerXp = useMemo(
    () => getLobbyXpForUser(user?.id, user?.stats),
    [user?.id, user?.stats],
  )

  const [socket, setSocket] = useState<Socket | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [bossResolving, setBossResolving] = useState(false)
  const [battlePhase, setBattlePhase] = useState<PresentationBattlePhase>(null)
  const [bossVideoMode, setBossVideoMode] = useState<BossVideoMode>('idle')
  const [lastPlayScore, setLastPlayScore] = useState(0)
  const [attackEffectMode, setAttackEffectMode] = useState<AttackEffectMode>('normal')
  const [attackEffectVisible, setAttackEffectVisible] = useState(false)
  const [attackEffectKey, setAttackEffectKey] = useState(0)
  const [damageFloatVisible, setDamageFloatVisible] = useState(false)
  const [damageFloatKey, setDamageFloatKey] = useState(0)
  const [presentationLastScore, setPresentationLastScore] = useState(0)
  const [displayedPlayerHp, setDisplayedPlayerHp] = useState(0)
  const [playerDamageAmount, setPlayerDamageAmount] = useState(0)
  const [playerDamageFloatVisible, setPlayerDamageFloatVisible] = useState(false)
  const [playerDamageFloatKey, setPlayerDamageFloatKey] = useState(0)
  const [playerHudShakeNonce, setPlayerHudShakeNonce] = useState(0)
  const [shieldPulse, setShieldPulse] = useState(false)
  const [bossAttackPresentationHold, setBossAttackPresentationHold] = useState(false)
  const [loseOverlayUnlocked, setLoseOverlayUnlocked] = useState(true)
  const [winRevealUnlocked, setWinRevealUnlocked] = useState(false)
  const [restartNonce, setRestartNonce] = useState(0)
  const matchSessionRef = useRef(crypto.randomUUID())
  const xpAwardedRef = useRef(false)
  const [matchXpEarned, setMatchXpEarned] = useState(0)
  /** Client-side card picks for preview (SKILL/SHUFFLE) and UI; synced to server in PLAY/SHUFFLE. */
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])
  const [skillLogEvent, setSkillLogEvent] = useState<{
    kind: 'rank' | 'color'
    id: number
  } | null>(null)

  const {
    muted: audioMuted,
    unlock: unlockAudio,
    toggleMute: toggleAudioMute,
    playSelect,
    playDiscard,
    playPlay,
    playSkillShield,
    playSkillChange,
  } = useGameAudio()
  const audioUnlockedRef = useRef(false)

  const ensureAudioUnlocked = useCallback(() => {
    if (audioUnlockedRef.current) return
    audioUnlockedRef.current = true
    unlockAudio()
  }, [unlockAudio])

  // ── totalScore: authoritative source is play.score committed per round ───────
  // Accumulate when phase enters BOSS_ATTACK (boss survived) or battleResult=WIN.
  // Use a round-keyed Set to prevent double counting on re-renders.
  const [totalScore, setTotalScore] = useState(0)
  const scoredRoundsRef = useRef(new Set<string>())

  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hitFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const postPlayerAttackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const winRevealFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const battleBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attackEffectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emittedBossAttackKeyRef = useRef<string | null>(null)
  const attackEffectShownRef = useRef(new Set<string>())
  const lastPlayedCardsRef = useRef<Card[]>([])
  const prevPhaseRef = useRef<GameState['phase'] | null>(null)
  const prevBattleResultRef = useRef<GameState['battleResult']>('ONGOING')
  const prevShieldActiveRef = useRef(false)
  const gameStateRef = useRef<GameState | null>(null)
  gameStateRef.current = gameState

  const hitPresentationFlushedRef = useRef(false)
  const postPlayerAttackFlushedRef = useRef(false)
  const bossAttackPresentationKeyRef = useRef<string | null>(null)
  const pendingConfirmRef = useRef(false)
  const truthHpRef = useRef(0)
  const displayedPlayerHpLiveRef = useRef(0)
  const holdHpSyncDuringBossAttackRef = useRef(false)
  const displayedHpSnapAtBossAttackRef = useRef(0)
  const bossAttackUxFlushedRef = useRef(true)
  const bossAttackUxFlushRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playerDamageFloatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shieldPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  displayedPlayerHpLiveRef.current = displayedPlayerHp
  if (gameState) {
    truthHpRef.current = gameState.player.hp
  }

  // ── totalScore accumulation ───────────────────────────────────────────────
  useEffect(() => {
    if (!gameState) return
    const { phase, round, battleResult, play } = gameState
    const score = play.score

    if (score <= 0) return

    const isBossAttack = phase === 'BOSS_ATTACK'
    const isWin = battleResult === 'WIN'

    if (!isBossAttack && !isWin) return

    const key = isWin ? `r${round}-WIN` : `r${round}-BOSS_ATTACK`
    if (!scoredRoundsRef.current.has(key)) {
      scoredRoundsRef.current.add(key)
      setTotalScore((prev) => prev + score)
      setLastPlayScore(score)
    }
  }, [gameState?.phase, gameState?.round, gameState?.battleResult])

  const previewSelectedCards = useMemo(() => {
    if (!gameState) return []
    return selectedCardIds
      .map((id) => gameState.hand.find((c) => c.id === id))
      .filter((c): c is Card => Boolean(c))
  }, [gameState?.hand, selectedCardIds])

  const previewSelectedCardsRef = useRef(previewSelectedCards)
  previewSelectedCardsRef.current = previewSelectedCards

  const serverSelectedKey =
    gameState?.play.selectedCards.map((card) => card.id).join('|') ?? ''
  const localSelectedKey = selectedCardIds.join('|')
  const playPhase = gameState?.phase ?? ''

  useEffect(() => {
    if (!gameState) return
    setSelectedCardIds((prev) => prev.filter((id) => gameState.hand.some((c) => c.id === id)))
  }, [gameState?.hand])

  // ── Pending auto-confirm: after enterPlay + selectCard sync reaches PLAY ──
  useEffect(() => {
    if (!socket || !gameState) return
    if (
      !pendingConfirmRef.current ||
      gameState.phase !== 'PLAY' ||
      selectedCardIds.length === 0
    ) {
      return
    }

    const serverSelected = new Set(gameState.play.selectedCards.map((card) => card.id))
    const allSynced = selectedCardIds.every((id) => serverSelected.has(id))

    if (!allSynced) {
      for (const cardId of selectedCardIds) {
        if (!serverSelected.has(cardId)) {
          socket.emit('selectCard', { cardId })
        }
      }
      return
    }

    pendingConfirmRef.current = false
    snapshotPlayedCards(previewSelectedCardsRef.current)
    playPlay()
    socket.emit('confirmPlay')
    setSelectedCardIds([])
  }, [playPhase, serverSelectedKey, localSelectedKey, socket, gameState, selectedCardIds.length, playPlay])

  // ── Socket setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    const gameSocket = createGameSocket()

    function resetSessionPresentation() {
      setTotalScore(0)
      setLastPlayScore(0)
      scoredRoundsRef.current = new Set()
      emittedBossAttackKeyRef.current = null
      attackEffectShownRef.current = new Set()
      lastPlayedCardsRef.current = []
      hitPresentationFlushedRef.current = false
      clearResolveTimer()
      clearHitFallbackTimer()
      clearPostPlayerAttackTimer()
      clearWinRevealFallback()
      clearBattleBannerTimer()
      clearAttackEffectTimer()
      clearPlayerDamageFloatTimer()
      clearBossAttackUxFlushRetry()
      clearShieldPulseTimer()
      postPlayerAttackFlushedRef.current = false
      bossAttackPresentationKeyRef.current = null
      pendingConfirmRef.current = false
      prevBattleResultRef.current = 'ONGOING'
      bossAttackUxFlushedRef.current = true
      holdHpSyncDuringBossAttackRef.current = false
      setBattlePhase(null)
      setBossVideoMode('idle')
      setBossResolving(false)
      setAttackEffectVisible(false)
      setDamageFloatVisible(false)
      setPlayerDamageFloatVisible(false)
      setShieldPulse(false)
      setBossAttackPresentationHold(false)
      setLoseOverlayUnlocked(true)
      setWinRevealUnlocked(false)
      setDisplayedPlayerHp(0)
      setSelectedCardIds([])
      setGameState(null)
    }

    gameSocket.on('connect', () => {
      setConnected(true)
      resetSessionPresentation()
      gameSocket.emit('startPveGame', { layer })
    })

    gameSocket.on('disconnect', () => {
      setConnected(false)
    })

    gameSocket.on('gameState', (state: GameState) => {
      if (state.battleResult === 'WIN' && prevBattleResultRef.current !== 'WIN') {
        setWinRevealUnlocked(false)
        clearWinRevealFallback()
      }
      prevBattleResultRef.current = state.battleResult
      setGameState(state)
      setError('')
    })

    gameSocket.on('battleWin', (_payload: { message: string }) => {
      // victory handled by overlay
    })

    gameSocket.on('battleLose', (_payload: { message: string }) => {
      // defeat handled by overlay
    })

    gameSocket.on('gameError', (payload: { message: string }) => {
      setError(payload.message)
      setTimeout(() => setError(''), 3000)
    })

    gameSocket.on('connect_error', (connectError) => {
      setError(connectError.message)
      setConnected(false)
    })

    gameSocket.connect()
    setSocket(gameSocket)

    return () => {
      gameSocket.disconnect()
    }
  }, [layer, restartNonce])

  useEffect(() => {
    matchSessionRef.current = crypto.randomUUID()
    xpAwardedRef.current = false
    setMatchXpEarned(0)
  }, [restartNonce])

  useEffect(() => {
    if (!user?.id || !gameState) return

    const result = gameState.battleResult
    if (result === 'ONGOING') {
      xpAwardedRef.current = false
      setMatchXpEarned(0)
      return
    }

    const overlayReady =
      (result === 'WIN' && winRevealUnlocked) ||
      (result === 'LOSE' && !bossAttackPresentationHold && loseOverlayUnlocked)

    if (!overlayReady || xpAwardedRef.current) return

    xpAwardedRef.current = true
    const reward = computeMatchXpReward({
      isWin: result === 'WIN',
      layer: gameState.layer,
      damageDealt: totalScore,
    })
    const gained = awardMatchXp(user.id, matchSessionRef.current, reward)
    setMatchXpEarned(gained)
  }, [
    user?.id,
    gameState?.battleResult,
    gameState?.layer,
    winRevealUnlocked,
    loseOverlayUnlocked,
    bossAttackPresentationHold,
    totalScore,
  ])

  // ── Battle presentation (boss video + phase banners) ─────────────────────
  function clearResolveTimer() {
    if (resolveTimerRef.current) {
      clearTimeout(resolveTimerRef.current)
      resolveTimerRef.current = null
    }
  }

  function clearHitFallbackTimer() {
    if (hitFallbackTimerRef.current) {
      clearTimeout(hitFallbackTimerRef.current)
      hitFallbackTimerRef.current = null
    }
  }

  function clearPostPlayerAttackTimer() {
    if (postPlayerAttackTimerRef.current) {
      clearTimeout(postPlayerAttackTimerRef.current)
      postPlayerAttackTimerRef.current = null
    }
  }

  function clearWinRevealFallback() {
    if (winRevealFallbackRef.current) {
      clearTimeout(winRevealFallbackRef.current)
      winRevealFallbackRef.current = null
    }
  }

  function clearBattleBannerTimer() {
    if (battleBannerTimerRef.current) {
      clearTimeout(battleBannerTimerRef.current)
      battleBannerTimerRef.current = null
    }
  }

  function clearAttackEffectTimer() {
    if (attackEffectTimerRef.current) {
      clearTimeout(attackEffectTimerRef.current)
      attackEffectTimerRef.current = null
    }
  }

  function clearPlayerDamageFloatTimer() {
    if (playerDamageFloatTimerRef.current) {
      clearTimeout(playerDamageFloatTimerRef.current)
      playerDamageFloatTimerRef.current = null
    }
  }

  function clearBossAttackUxFlushRetry() {
    if (bossAttackUxFlushRetryRef.current) {
      clearTimeout(bossAttackUxFlushRetryRef.current)
      bossAttackUxFlushRetryRef.current = null
    }
  }

  function clearShieldPulseTimer() {
    if (shieldPulseTimerRef.current) {
      clearTimeout(shieldPulseTimerRef.current)
      shieldPulseTimerRef.current = null
    }
  }

  function beginBossAttackHpHold() {
    bossAttackUxFlushedRef.current = false
    holdHpSyncDuringBossAttackRef.current = true
    displayedHpSnapAtBossAttackRef.current = displayedPlayerHpLiveRef.current
    setBossAttackPresentationHold(true)
    setLoseOverlayUnlocked(false)
  }

  function flushBossAttackPresentation() {
    if (bossAttackUxFlushedRef.current) return
    bossAttackUxFlushedRef.current = true
    holdHpSyncDuringBossAttackRef.current = false
    clearBossAttackUxFlushRetry()

    const snap = displayedHpSnapAtBossAttackRef.current
    const truth = truthHpRef.current
    const dmg = Math.max(0, Math.round(snap - truth))

    setDisplayedPlayerHp(truth)
    setBossAttackPresentationHold(false)

    const gs = gameStateRef.current
    if (gs?.battleResult === 'LOSE') {
      window.setTimeout(() => setLoseOverlayUnlocked(true), LOSE_OVERLAY_DELAY_MS)
    } else {
      setLoseOverlayUnlocked(true)
    }

    if (dmg > 0) {
      const floatKey = Date.now()
      setPlayerDamageAmount(dmg)
      setPlayerDamageFloatKey(floatKey)
      setPlayerDamageFloatVisible(true)
      setPlayerHudShakeNonce((n) => n + 1)
      clearPlayerDamageFloatTimer()
      playerDamageFloatTimerRef.current = setTimeout(() => {
        playerDamageFloatTimerRef.current = null
        setPlayerDamageFloatVisible(false)
      }, PLAYER_DAMAGE_FLOAT_MS)
    }
  }

  function tryFlushBossAttackUx(): boolean {
    if (bossAttackUxFlushedRef.current) return true
    if (!holdHpSyncDuringBossAttackRef.current) return false

    const gs = gameStateRef.current
    if (!gs) return false

    const snap = displayedHpSnapAtBossAttackRef.current
    const hpDropped = gs.player.hp < snap
    const phaseAdvanced = gs.phase !== 'BOSS_ATTACK'
    const isLose = gs.battleResult === 'LOSE'
    const shieldAbsorbed =
      phaseAdvanced && gs.player.hp === snap && !gs.roundState.skills.shield.active

    if (!hpDropped && !isLose && !shieldAbsorbed && gs.phase === 'BOSS_ATTACK') {
      return false
    }

    flushBossAttackPresentation()
    return true
  }

  function requestBossAttackUxFlush() {
    if (tryFlushBossAttackUx()) return

    clearBossAttackUxFlushRetry()
    bossAttackUxFlushRetryRef.current = window.setTimeout(() => {
      bossAttackUxFlushRetryRef.current = null
      if (tryFlushBossAttackUx()) return
      bossAttackUxFlushRetryRef.current = window.setTimeout(() => {
        bossAttackUxFlushRetryRef.current = null
        tryFlushBossAttackUx()
      }, 180)
    }, 80)
  }

  function schedulePostPlayerAttackPresentation() {
    clearPostPlayerAttackTimer()
    postPlayerAttackFlushedRef.current = false

    postPlayerAttackTimerRef.current = window.setTimeout(() => {
      postPlayerAttackTimerRef.current = null
      if (postPlayerAttackFlushedRef.current) return
      postPlayerAttackFlushedRef.current = true

      const gs = gameStateRef.current
      if (!gs) return

      if (gs.battleResult === 'WIN') {
        setBossVideoMode('defeated')
        setBattlePhase(null)
        setWinRevealUnlocked(false)
        clearWinRevealFallback()
        winRevealFallbackRef.current = window.setTimeout(() => {
          winRevealFallbackRef.current = null
          setWinRevealUnlocked(true)
        }, BOSS_DEFEATED_FALLBACK_MS)
        return
      }

      if (gs.phase === 'BOSS_ATTACK') {
        beginBossAttackPresentation()
      }
    }, ATTACK_EFFECT_VISIBLE_MS)
  }

  function snapshotPlayedCards(cards: Card[]) {
    lastPlayedCardsRef.current = [...cards]
  }

  function triggerPlayerAttackPresentation(round: number, score: number) {
    const effectKey = `r${round}-fx-${score}`
    if (attackEffectShownRef.current.has(effectKey)) return
    attackEffectShownRef.current.add(effectKey)

    const mode = inferAttackEffectModeFromCards(lastPlayedCardsRef.current)
    const fxKey = Date.now()

    setPresentationLastScore(score)
    setAttackEffectMode(mode)
    setAttackEffectKey(fxKey)
    setAttackEffectVisible(true)
    setDamageFloatKey(fxKey)
    setDamageFloatVisible(true)

    clearAttackEffectTimer()
    attackEffectTimerRef.current = setTimeout(() => {
      attackEffectTimerRef.current = null
      setAttackEffectVisible(false)
      setDamageFloatVisible(false)
    }, ATTACK_EFFECT_VISIBLE_MS)
  }

  function showBattleBanner(next: PresentationBattlePhase) {
    setBattlePhase(next)
    clearBattleBannerTimer()
    battleBannerTimerRef.current = setTimeout(() => {
      battleBannerTimerRef.current = null
      setBattlePhase((current) => (current === next ? null : current))
    }, BATTLE_BANNER_MS)
  }

  function getBossAttackKey(state: GameState): string {
    return `${state.round}:BOSS_ATTACK`
  }

  function emitResolveAnimationComplete() {
    const gs = gameStateRef.current
    if (!socket || !gs) return
    if (gs.phase !== 'BOSS_ATTACK' || gs.battleResult !== 'ONGOING') return
    const attackKey = getBossAttackKey(gs)
    if (emittedBossAttackKeyRef.current === attackKey) return
    emittedBossAttackKeyRef.current = attackKey
    clearResolveTimer()
    setBossResolving(false)
    socket.emit('resolveAnimationComplete')
  }

  function scheduleBossAttackResolveFallback() {
    const gs = gameStateRef.current
    if (!gs || gs.phase !== 'BOSS_ATTACK' || gs.battleResult !== 'ONGOING') return

    const attackKey = getBossAttackKey(gs)
    if (emittedBossAttackKeyRef.current === attackKey) return

    clearResolveTimer()
    resolveTimerRef.current = window.setTimeout(() => {
      resolveTimerRef.current = null
      handleBossAttackEnded()
    }, BOSS_ATTACK_VIDEO_FALLBACK_MS)
  }

  function beginBossAttackPresentation() {
    const gs = gameStateRef.current
    if (!gs) return

    const attackKey = getBossAttackKey(gs)
    if (bossAttackPresentationKeyRef.current === attackKey) return
    bossAttackPresentationKeyRef.current = attackKey

    showBattleBanner('boss')
    setBossVideoMode('attack')
    setBossResolving(true)
    beginBossAttackHpHold()
    scheduleBossAttackResolveFallback()
  }

  function handleBossAttackEnded() {
    clearResolveTimer()
    emitResolveAnimationComplete()
    setBossVideoMode('idle')
    requestBossAttackUxFlush()
  }

  function handleBossDefeatedAnimationEnd() {
    clearWinRevealFallback()
    setWinRevealUnlocked(true)
  }

  useEffect(() => {
    if (!gameState) return

    const prev = prevPhaseRef.current
    const { phase, play, battleResult } = gameState
    const shieldActive = gameState.roundState.skills.shield.active

    const playerAttackEdge =
      prev === 'PLAY' &&
      play.score > 0 &&
      (phase === 'BOSS_ATTACK' || battleResult === 'WIN')

    if (playerAttackEdge) {
      hitPresentationFlushedRef.current = false
      showBattleBanner('player')
      if (battleResult === 'WIN') {
        setWinRevealUnlocked(false)
        clearWinRevealFallback()
      }
      triggerPlayerAttackPresentation(gameState.round, play.score)
      schedulePostPlayerAttackPresentation()
    }

    if (
      prev === 'BOSS_ATTACK' &&
      phase === 'ROUND_END' &&
      prevShieldActiveRef.current &&
      !shieldActive
    ) {
      showBattleBanner('shield_break')
      setShieldPulse(true)
      clearShieldPulseTimer()
      shieldPulseTimerRef.current = window.setTimeout(() => {
        shieldPulseTimerRef.current = null
        setShieldPulse(false)
      }, SHIELD_PULSE_MS)
      requestBossAttackUxFlush()
    }

    if (phase === 'SKILL' && battleResult === 'ONGOING') {
      setBossVideoMode((mode) => (mode === 'idle' ? mode : 'idle'))
      setBattlePhase(null)
      setBossResolving(false)
      clearResolveTimer()
      clearWinRevealFallback()
    }

    prevPhaseRef.current = phase
    prevShieldActiveRef.current = shieldActive
  }, [gameState])

  useEffect(() => {
    if (!gameState) return

    if (holdHpSyncDuringBossAttackRef.current && !bossAttackUxFlushedRef.current) {
      tryFlushBossAttackUx()
      return
    }

    if (!holdHpSyncDuringBossAttackRef.current) {
      setDisplayedPlayerHp(gameState.player.hp)
    }
  }, [gameState?.player.hp, gameState?.phase, gameState?.battleResult])

  useEffect(() => {
    return () => {
      clearResolveTimer()
      clearHitFallbackTimer()
      clearPostPlayerAttackTimer()
      clearWinRevealFallback()
      clearBattleBannerTimer()
      clearAttackEffectTimer()
      clearPlayerDamageFloatTimer()
      clearBossAttackUxFlushRetry()
      clearShieldPulseTimer()
    }
  }, [])


  // ── Damage preview evaluator ──────────────────────────────────────────────
  const evaluatorResult = useMemo(() => {
    if (!gameState || previewSelectedCards.length === 0) return null
    return evaluateHand(previewSelectedCards, gameState.bossRound.isDefending)
  }, [gameState?.bossRound.isDefending, previewSelectedCards])

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleCardClick(cardId: string) {
    if (!gameState) return
    const { phase } = gameState
    if (phase !== 'SKILL' && phase !== 'SHUFFLE' && phase !== 'PLAY') return

    ensureAudioUnlocked()

    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) {
        if (phase === 'PLAY' || phase === 'SHUFFLE') {
          socket?.emit('selectCard', { cardId })
        }
        playSelect()
        return prev.filter((id) => id !== cardId)
      }
      if (prev.length >= MAX_SELECT) return prev
      if (phase === 'PLAY' || phase === 'SHUFFLE') {
        socket?.emit('selectCard', { cardId })
      }
      playSelect()
      return [...prev, cardId]
    })
  }

  /**
   * Play & Attack — preview picks are local until confirm:
   * - PLAY: confirmPlay immediately
   * - SKILL/SHUFFLE: enterPlay, sync picks, auto-confirm in PLAY (pendingConfirmRef)
   */
  function handlePlayAttack() {
    if (!socket || !gameState || selectedCardIds.length === 0) return
    ensureAudioUnlocked()
    const { phase, play } = gameState

    const serverSelected = new Set(play.selectedCards.map((card) => card.id))
    const allSynced = selectedCardIds.every((id) => serverSelected.has(id))

    if (phase === 'PLAY') {
      if (!allSynced) {
        pendingConfirmRef.current = true
        for (const cardId of selectedCardIds) {
          if (!serverSelected.has(cardId)) {
            socket.emit('selectCard', { cardId })
          }
        }
        return
      }

      pendingConfirmRef.current = false
      snapshotPlayedCards(previewSelectedCards)
      playPlay()
      socket.emit('confirmPlay')
      setSelectedCardIds([])
      return
    }

    if (phase === 'SKILL' || phase === 'SHUFFLE') {
      pendingConfirmRef.current = true
      socket.emit('enterPlay')
    }
  }

  /**
   * Discard & Draw — one click from SKILL (like original playHand pattern):
   * enterShuffle → sync picks → shuffleCards on the server in order.
   */
  function handleDiscardDraw() {
    if (!socket || !gameState || selectedCardIds.length === 0) return
    ensureAudioUnlocked()
    const { phase, roundState, play } = gameState
    if (roundState.shuffle.remaining <= 0) return

    function emitShuffleWithSelection() {
      const serverIds = new Set(play.selectedCards.map((c) => c.id))
      const localIds = new Set(selectedCardIds)

      for (const cardId of selectedCardIds) {
        if (!serverIds.has(cardId)) {
          socket!.emit('selectCard', { cardId })
        }
      }
      for (const card of play.selectedCards) {
        if (!localIds.has(card.id)) {
          socket!.emit('selectCard', { cardId: card.id })
        }
      }
      playDiscard()
      socket!.emit('shuffleCards')
      setSelectedCardIds([])
    }

    if (phase === 'SKILL') {
      socket.emit('enterShuffle')
      selectedCardIds.forEach((cardId) => {
        socket.emit('selectCard', { cardId })
      })
      playDiscard()
      socket.emit('shuffleCards')
      setSelectedCardIds([])
      return
    }

    if (phase === 'SHUFFLE') {
      emitShuffleWithSelection()
    }
  }

  function handleUseShield() {
    if (!socket || gameState?.phase !== 'SKILL') return
    ensureAudioUnlocked()
    playSkillShield()
    socket.emit('useSkill', { skillId: 'shield' })
  }

  function handleUseChangeColor(cardId: string, targetElement: Element) {
    if (!socket || gameState?.phase !== 'SKILL' || !cardId) return
    ensureAudioUnlocked()
    playSkillChange()
    setSkillLogEvent({ kind: 'color', id: Date.now() })
    socket.emit('useSkill', { skillId: 'changeColor', cardId, targetElement })
  }

  function handleUseChangeRank(cardId: string, targetRank: number) {
    if (!socket || gameState?.phase !== 'SKILL' || !cardId) return
    if (targetRank < 1 || targetRank > 13) return
    ensureAudioUnlocked()
    playSkillChange()
    setSkillLogEvent({ kind: 'rank', id: Date.now() })
    socket.emit('useSkill', { skillId: 'changeRank', cardId, targetRank })
  }

  function handleRestartGame() {
    setRestartNonce((value) => value + 1)
  }

  async function handleExitToLobby() {
    await fetchMe()
    navigate('/lobby')
  }

  const showGameOverlay =
    gameState &&
    ((gameState.battleResult === 'WIN' && winRevealUnlocked) ||
      (gameState.battleResult === 'LOSE' &&
        !bossAttackPresentationHold &&
        loseOverlayUnlocked))

  return (
    <div className="game-page cg-page-enter-subtle">
      {!gameState ? (
        <LoadingScreen
          message={connected ? 'Preparing battle…' : 'Connecting to server…'}
        />
      ) : null}
      <GameTopBar
        connected={connected}
        layer={layer}
        round={gameState?.round ?? 0}
        totalDamageDealt={totalScore}
        onExit={() => void handleExitToLobby()}
        muted={audioMuted}
        onToggleMute={toggleAudioMute}
      />

      <div className="game-mid">
        <SkillBar
          phase={gameState?.phase ?? 'SKILL'}
          hand={gameState?.hand ?? []}
          skillState={
            gameState?.roundState.skills ?? {
              energy: { energy: 0 },
              shield: { active: false, onCooldown: false, cooldownRounds: 0 },
            }
          }
          onUseShield={handleUseShield}
          onUseChangeColor={handleUseChangeColor}
          onUseChangeRank={handleUseChangeRank}
        />

        {gameState ? (
          <Battlefield
            layer={gameState.layer}
            boss={gameState.boss}
            bossRound={gameState.bossRound}
            bossResolving={bossResolving}
            phase={gameState.phase}
            battlePhase={battlePhase}
            bossVideoMode={bossVideoMode}
            attackEffectMode={attackEffectMode}
            attackEffectVisible={attackEffectVisible}
            attackEffectKey={attackEffectKey}
            lastScore={presentationLastScore}
            damageFloatVisible={damageFloatVisible}
            damageFloatKey={damageFloatKey}
            onBossAttackEnded={handleBossAttackEnded}
            onBossDefeatedAnimationEnd={handleBossDefeatedAnimationEnd}
          />
        ) : (
          <div className="game-battlefield" aria-hidden />
        )}

        <ScorePanel
          phase={gameState?.phase ?? 'SKILL'}
          round={gameState?.round ?? 0}
          totalScore={totalScore}
          selectedCount={previewSelectedCards.length}
          shuffleRemaining={gameState?.roundState.shuffle.remaining ?? 0}
          evaluatorResult={evaluatorResult}
          lastPlayScore={lastPlayScore}
          shieldActive={gameState?.roundState.skills.shield.active ?? false}
          skillLogEvent={skillLogEvent}
          onPlayAttack={handlePlayAttack}
          onDiscardDraw={handleDiscardDraw}
        />
      </div>

      {gameState ? (
        <HandArea
          phase={gameState.phase}
          displayedPlayerHp={displayedPlayerHp}
          playerMaxHp={gameState.player.maxHp}
          shield={gameState.roundState.skills.shield}
          hand={gameState.hand}
          selectedCards={previewSelectedCards}
          deckCount={gameState.deckCount}
          discardCount={gameState.discardCount}
          playerDamageAmount={playerDamageAmount}
          playerDamageFloatVisible={playerDamageFloatVisible}
          playerDamageFloatKey={playerDamageFloatKey}
          playerHudShakeNonce={playerHudShakeNonce}
          shieldPulse={shieldPulse}
          playerAvatarUrl={user?.avatar}
          playerUsername={user?.username}
          playerLevel={playerXp.currentLevel}
          playerRankTitle={playerXp.rankTitle}
          onCardClick={handleCardClick}
        />
      ) : (
        <div
          className="game-handarea"
          style={{ justifyContent: 'center', alignItems: 'center' }}
        >
          <span style={{ color: '#4a4a60' }}>Waiting for game state…</span>
        </div>
      )}

      {showGameOverlay && (
        <GameOverlay
          battleResult={gameState.battleResult}
          layer={gameState.layer}
          totalScore={totalScore}
          xpEarned={matchXpEarned}
          onPlayAgain={handleRestartGame}
          onExitToLobby={() => void handleExitToLobby()}
        />
      )}

      <GameToast message={error} />

      {/* Dev debug panel — raw JSON is hidden behind a <details> element */}
      {gameState && (
        <details className="game-debug">
          <summary>Dev Debug State</summary>
          <pre>{JSON.stringify(gameState, null, 2)}</pre>
        </details>
      )}
    </div>
  )
}
