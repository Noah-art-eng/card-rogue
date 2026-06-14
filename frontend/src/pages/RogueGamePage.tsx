import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Socket } from 'socket.io-client'

import {
  abandonRogueRun,
  chooseEnhancement,
  getCurrentRogueRun,
  notifyFloorLost,
  notifyFloorWon,
  saveRogueProgress,
  startRogueRun,
} from '../api/rogue'
import { createGameSocket } from '../socket/client'
import type { Element, GameState } from '../types/game'
import { isResumableRogueRun, type EnhancementOption, type RogueSnapshot } from '../types/rogue'
import { evaluateHand } from '../lib/handEvaluator'
import {
  inferAttackEffectModeFromCards,
  type AttackEffectMode,
} from '../lib/attackEffectMode'
import { useGameAudio } from '../hooks/useGameAudio'
import { getLobbyXpForUser } from '../lib/xpSystem'
import { useAuth } from '../stores/AuthContext'
import type { Card } from '../types/game'

import '../components/game/game.css'
import '../components/game/game-visual-ref.css'
import Battlefield, { type PresentationBattlePhase } from '../components/game/Battlefield'
import type { BossVideoMode } from '../components/game/BossVideoDisplay'
import GameTopBar from '../components/game/GameTopBar'
import GameToast from '../components/game/GameToast'
import Enhancement from '../components/game/Enhancement'
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

export default function RogueGamePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

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
  const [restartNonce, setRestartNonce] = useState(0)
  const [saveChoiceVisible, setSaveChoiceVisible] = useState(false)
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false)
  const [existingSave, setExistingSave] = useState<RogueSnapshot | null>(null)
  const [enhancements, setEnhancements] = useState<EnhancementOption[]>([])
  const [pendingEnhancements, setPendingEnhancements] = useState<EnhancementOption[] | null>(null)
  const [showLose, setShowLose] = useState(false)
  const [canRetryFloor, setCanRetryFloor] = useState(false)
  const [rogueReady, setRogueReady] = useState(false)

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

  const victoryTriggeredRef = useRef(false)
  const pendingLayerRef = useRef<number | null>(null)
  const pendingRestoreRef = useRef<RogueSnapshot | null>(null)
  const enhancementsRef = useRef<EnhancementOption[]>([])
  enhancementsRef.current = enhancements
  const playerHpRef = useRef(0)
  const floor = gameState?.layer ?? 1
  /** Client-side card picks for preview (SKILL/SHUFFLE) and UI; synced to server in PLAY/SHUFFLE. */
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])
  const [skillLogEvent, setSkillLogEvent] = useState<{
    kind: 'rank' | 'color'
    id: number
  } | null>(null)

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
    playerHpRef.current = gameState.player.hp
  }

  useEffect(() => {
    let cancelled = false
    getCurrentRogueRun()
      .then(async (save) => {
        if (cancelled) return

        const snapshot = save?.snapshot
        if (snapshot?.status !== 'active') {
          setRogueReady(true)
          return
        }

        if (isResumableRogueRun(snapshot)) {
          setExistingSave(snapshot)
          setSaveChoiceVisible(true)
          return
        }

        await abandonRogueRun().catch(() => {})
        if (!cancelled) setRogueReady(true)
      })
      .catch(() => {
        if (!cancelled) setRogueReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!gameState || gameState.battleResult !== 'ONGOING') return
    const timer = window.setTimeout(() => {
      saveRogueProgress({
        layer: gameState.layer,
        playerHp: gameState.player.hp,
        bossHp: gameState.boss.hp,
        enhancements,
        stats: { totalRounds: gameState.round },
      }).catch(() => {})
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [gameState?.player.hp, gameState?.round, gameState?.boss.hp, gameState?.layer, enhancements, gameState?.battleResult])

  useEffect(() => {
    const save = () => {
      if (!gameState) return
      saveRogueProgress({
        layer: gameState.layer,
        playerHp: gameState.player.hp,
        bossHp: gameState.boss.hp,
        enhancements,
        stats: { totalRounds: gameState.round },
      }).catch(() => {})
    }
    window.addEventListener('beforeunload', save)
    return () => window.removeEventListener('beforeunload', save)
  }, [gameState, enhancements])

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
    if (!rogueReady) return

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
      setDisplayedPlayerHp(0)
      setSelectedCardIds([])
      setGameState(null)
    }

    gameSocket.on('connect', () => {
      setConnected(true)
      resetSessionPresentation()
      gameSocket.emit('startRogueGame')

      const pendingRestore = pendingRestoreRef.current
      if (pendingRestore) {
        pendingRestoreRef.current = null
        const buffs = (pendingRestore.enhancements ?? [])
          .map((entry) => entry?.buff)
          .filter(Boolean)
        setEnhancements(pendingRestore.enhancements ?? [])
        gameSocket.emit('restoreFromCheckpoint', {
          layer: pendingRestore.layer ?? 1,
          playerHp: pendingRestore.playerHp ?? 20,
          bossHp: pendingRestore.bossHp ?? 543,
          buffs,
          shuffleCount: 2,
        })
      }
    })

    gameSocket.on('disconnect', () => {
      setConnected(false)
    })

    gameSocket.on('gameState', (state: GameState) => {
      if (state.battleResult === 'WIN' && prevBattleResultRef.current !== 'WIN') {
        clearWinRevealFallback()
      }
      prevBattleResultRef.current = state.battleResult
      setGameState(state)
      setError('')
    })

    gameSocket.on('battleWin', ({ layer: winLayer }: { layer?: number }) => {
      if (victoryTriggeredRef.current) return
      victoryTriggeredRef.current = true
      pendingLayerRef.current = winLayer ?? gameStateRef.current?.layer ?? 1
      notifyFloorWon(
        pendingLayerRef.current,
        playerHpRef.current,
        enhancementsRef.current,
      ).catch(console.error)
    })

    gameSocket.on('battleLose', ({ layer: loseLayer }: { layer?: number }) => {
      window.setTimeout(() => {
        setShowLose(true)
        setCanRetryFloor((loseLayer ?? gameStateRef.current?.layer ?? 1) > 1)
      }, 2500)
    })

    gameSocket.on('upgradeOptions', ({ options }: { options: EnhancementOption[] }) => {
      setPendingEnhancements(options)
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
  }, [rogueReady, restartNonce])

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
      window.setTimeout(() => setShowLose(true), LOSE_OVERLAY_DELAY_MS)
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

      const rogueFloorCleared =
        gs.roguePhase === 'UPGRADE' || (gs.boss.hp <= 0 && gs.battleResult === 'ONGOING')

      if (gs.battleResult === 'WIN' || rogueFloorCleared) {
        setBossVideoMode('defeated')
        setBattlePhase(null)
        clearWinRevealFallback()
        if (!rogueFloorCleared) {
          winRevealFallbackRef.current = window.setTimeout(() => {
            winRevealFallbackRef.current = null
          }, BOSS_DEFEATED_FALLBACK_MS)
        }
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
    if (pendingLayerRef.current != null) {
      pendingLayerRef.current = null
      socket?.emit('upgradePhaseReady')
      return
    }
    clearWinRevealFallback()
  }

  useEffect(() => {
    if (!gameState) return

    const prev = prevPhaseRef.current
    const { phase, play, battleResult } = gameState
    const shieldActive = gameState.roundState.skills.shield.active

    const rogueFloorCleared =
      gameState.roguePhase === 'UPGRADE' ||
      (gameState.boss.hp <= 0 && battleResult === 'ONGOING')

    const playerAttackEdge =
      prev === 'PLAY' &&
      play.score > 0 &&
      (phase === 'BOSS_ATTACK' || battleResult === 'WIN' || rogueFloorCleared)

    if (playerAttackEdge) {
      hitPresentationFlushedRef.current = false
      showBattleBanner('player')
      if (battleResult === 'WIN' || rogueFloorCleared) {
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

  function continueFromSave() {
    if (!existingSave) return
    pendingRestoreRef.current = existingSave
    setEnhancements(existingSave.enhancements ?? [])
    setSaveChoiceVisible(false)
    setRogueReady(true)
  }

  function startNewGame() {
    setSaveChoiceVisible(false)
    setExistingSave(null)
    pendingRestoreRef.current = null
    setRogueReady(true)
    startRogueRun()
      .then(() => {
        setRestartNonce((value) => value + 1)
      })
      .catch(console.error)
  }

  const confirmEnhancement = useCallback(
    (enhancement: EnhancementOption) => {
      const next = [...enhancementsRef.current, enhancement]
      setEnhancements(next)
      setPendingEnhancements(null)
      victoryTriggeredRef.current = false
      chooseEnhancement(enhancement).catch(console.error)
      socket?.emit('advanceLayer', {
        shuffleCount: 2,
        buffs: next.map((entry) => entry.buff).filter(Boolean),
      })
    },
    [socket],
  )

  async function handleRetryFloor() {
    if (!socket) return
    try {
      const result = await notifyFloorLost()
      if (result.action !== 'restore' || !result.checkpoint) {
        setCanRetryFloor(false)
        await handlePlayAgain()
        return
      }

      const checkpoint = result.checkpoint
      const restoredEnhancements = checkpoint.enhancements ?? []
      setEnhancements(restoredEnhancements)
      setShowLose(false)
      setCanRetryFloor(false)
      victoryTriggeredRef.current = false

      socket.emit('restoreFromCheckpoint', {
        layer: checkpoint.floor,
        playerHp: checkpoint.playerHp,
        bossHp: checkpoint.bossHp,
        buffs: restoredEnhancements.map((entry) => entry.buff).filter(Boolean),
        shuffleCount: 2,
      })
    } catch (err) {
      console.error('Failed to retry floor:', err)
    }
  }

  async function handlePlayAgain() {
    victoryTriggeredRef.current = false
    setEnhancements([])
    setPendingEnhancements(null)
    setShowLose(false)
    setCanRetryFloor(false)
    await startRogueRun().catch(console.error)
    setRestartNonce((value) => value + 1)
  }

  async function handleSaveAndExit() {
    if (gameState) {
      await saveRogueProgress({
        layer: gameState.layer,
        playerHp: gameState.player.hp,
        bossHp: gameState.boss.hp,
        enhancements,
        stats: { totalRounds: gameState.round },
      }).catch(() => {})
    }
    navigate('/lobby')
  }

  async function handleExitWithoutSaving() {
    await abandonRogueRun().catch(() => {})
    navigate('/lobby')
  }

  return (
    <div className="game-page">
      <GameTopBar
        connected={connected}
        layer={floor}
        round={gameState?.round ?? 0}
        totalDamageDealt={totalScore}
        onExit={() => setExitConfirmVisible(true)}
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
          <div className="game-battlefield">
            <div style={{ color: '#6b6580' }}>
              {connected ? 'Loading game…' : 'Connecting…'}
            </div>
          </div>
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
          buffs={enhancements}
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

      {pendingEnhancements && (
        <Enhancement
          options={pendingEnhancements}
          floor={floor}
          onConfirm={confirmEnhancement}
        />
      )}

      {saveChoiceVisible && existingSave && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-yellow-800/50 bg-stone-900 px-10 py-8 shadow-2xl shadow-black">
            <div className="text-xl font-black tracking-widest text-yellow-300">Active Run Found</div>
            <div className="text-center text-sm text-stone-400">
              Floor {existingSave.layer ?? 1} · HP {existingSave.playerHp}/{existingSave.playerMaxHp} ·{' '}
              {existingSave.enhancements?.length ?? 0} buffs
            </div>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={continueFromSave}
                className="rounded-xl bg-gradient-to-b from-yellow-600 to-yellow-800 px-6 py-2.5 text-sm font-black tracking-widest text-yellow-100 shadow-lg shadow-yellow-900/50 transition-all hover:from-yellow-500 hover:to-yellow-700 active:scale-95"
              >
                Continue Floor {existingSave.layer ?? 1}
              </button>
              <button
                type="button"
                onClick={startNewGame}
                className="rounded-xl bg-gradient-to-b from-red-700 to-red-900 px-6 py-2.5 text-sm font-black tracking-widest text-white shadow-lg transition-all hover:from-red-600 hover:to-red-800 active:scale-95"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {exitConfirmVisible && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-amber-800/50 bg-stone-900 px-10 py-8 shadow-2xl shadow-black">
            <div className="text-lg font-bold tracking-widest text-stone-300">Exit Rogue Mode?</div>
            <div className="text-sm text-stone-400">Your progress will be saved.</div>
            <div className="mt-1 flex gap-3">
              <button
                type="button"
                onClick={() => void handleSaveAndExit()}
                className="rounded-xl bg-gradient-to-b from-amber-600 to-amber-800 px-6 py-2.5 text-sm font-black tracking-widest text-amber-100 shadow-lg transition-all hover:from-amber-500 hover:to-amber-700 active:scale-95"
              >
                Save & Exit
              </button>
              <button
                type="button"
                onClick={() => void handleExitWithoutSaving()}
                className="rounded-xl bg-gradient-to-b from-stone-700 to-stone-900 px-6 py-2.5 text-sm font-black tracking-widest text-stone-300 shadow-lg transition-all hover:from-stone-600 hover:to-stone-800 active:scale-95"
              >
                Exit without Saving
              </button>
              <button
                type="button"
                onClick={() => setExitConfirmVisible(false)}
                className="rounded-xl border border-stone-600 px-6 py-2.5 text-sm text-stone-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showLose && !bossAttackPresentationHold && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-yellow-800/50 bg-stone-900 px-12 py-10 shadow-2xl shadow-black">
            <div className="text-3xl font-black tracking-widest text-red-400">GAME OVER</div>
            <div className="text-center text-sm leading-relaxed text-stone-400">
              Reached Floor <span className="font-bold text-yellow-400">{floor}</span>
              <br />
              Total Score <span className="font-bold text-yellow-400">{totalScore.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={() => void (canRetryFloor ? handleRetryFloor() : handlePlayAgain())}
              className="mt-2 rounded-xl bg-gradient-to-b from-red-700 to-red-900 px-8 py-3 text-sm font-black tracking-widest text-white shadow-lg transition-all hover:from-red-600 hover:to-red-800 active:scale-95"
            >
              {canRetryFloor ? 'Retry Floor' : 'Play Again'}
            </button>
            <button
              type="button"
              onClick={() => void notifyFloorLost().then(() => navigate('/lobby'))}
              className="text-sm text-stone-500 transition-colors hover:text-stone-300"
            >
              Exit to Lobby
            </button>
          </div>
        </div>
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
