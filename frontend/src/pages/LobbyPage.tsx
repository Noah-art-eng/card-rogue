import axios from 'axios'
import { useEffect, useMemo, useRef, useState, useCallback, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { getRecentMatches } from '../api/matches'
import { uploadAvatar } from '../api/users'
import LoadingScreen from '../components/common/LoadingScreen'
import UserAvatar from '../components/common/UserAvatar'
import { hasCustomAvatar } from '../lib/avatar'
import {
  formatXpWithCommas,
  getLobbyXpForUser,
} from '../lib/xpSystem'
import { formatMatchOpponentLabel } from '../constants/bosses'
import { useAuth } from '../stores/AuthContext'
import '../styles/LobbyPage.css'

const LOBBY_SOLO_CARD_VIDEO_URL = '/lobby/lobby-card.mp4'
const LOBBY_ROGUE_CARD_VIDEO_URL = '/lobby/lobbyBackground-1.mp4'
const LOBBY_VICTORY_ICON_URL = '/lobby/victory-icon.PNG'
const LOBBY_LOSE_ICON_URL = '/lobby/lose-icon.PNG'
const LOBBY_SEASON_ICON_URL = '/lobby/season-icon.PNG'
const LOBBY_BACKGROUND_VIDEO_URL = '/lobby/lobbyBackground.mp4'
const SEASON_END_MS = new Date('2026-09-01T00:00:00Z').getTime()

function formatSeasonCountdown(msRemaining: number): string | null {
  if (msRemaining <= 0) return null
  const totalMinutes = Math.floor(msRemaining / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  return `${days}d ${hours}h ${minutes}m`
}

interface RecentMatchRow {
  key: string
  resultLabel: string
  opp: string
  ago: string
  tone: string
  isWin: boolean
}

function formatMatchEndedRelative(endedAtInput: string | null | undefined): string {
  if (endedAtInput == null || endedAtInput === '') return ''
  const d = new Date(endedAtInput)
  if (Number.isNaN(d.getTime())) return ''

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'Just now'

  const min = Math.floor(sec / 60)
  if (min < 60) return min === 1 ? '1 minute ago' : `${min} minutes ago`

  const hr = Math.floor(min / 60)
  if (hr < 24) return hr === 1 ? '1 hour ago' : `${hr} hours ago`

  const sod = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
  const calendarDays = Math.round((sod(now) - sod(d)) / 86_400_000)
  if (calendarDays === 1) return 'Yesterday'
  if (calendarDays > 1) return `${calendarDays} days ago`
  return `${Math.max(1, Math.floor(hr / 24))} days ago`
}

export default function LobbyPage() {
  const { user, isLoading, fetchMe, updateUser } = useAuth()
  const navigate = useNavigate()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [recentMatchRows, setRecentMatchRows] = useState<RecentMatchRow[]>([])
  const [recentMatchesLoading, setRecentMatchesLoading] = useState(false)
  const [recentMatchesError, setRecentMatchesError] = useState(false)
  const [startingGame, setStartingGame] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [seasonCountdown, setSeasonCountdown] = useState(
    () => formatSeasonCountdown(SEASON_END_MS - Date.now()) ?? 'Season Ended',
  )
  const seasonEnded = seasonCountdown === 'Season Ended'

  const displayName = user?.username?.trim() || 'Traveler'
  const displayNameCaps = displayName.toUpperCase()
  const hasAvatarImage = hasCustomAvatar(user?.avatar)

  const handleAvatarPick = useCallback(() => {
    if (avatarUploading) return
    avatarInputRef.current?.click()
  }, [avatarUploading])

  const handleAvatarChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      setAvatarError('')
      setAvatarUploading(true)

      try {
        const response = await uploadAvatar(file)
        updateUser(response.user)
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? (typeof error.response?.data?.message === 'string'
              ? error.response.data.message
              : 'Failed to upload avatar. Please try again.')
          : 'Failed to upload avatar. Please try again.'
        setAvatarError(message)
      } finally {
        setAvatarUploading(false)
      }
    },
    [updateUser],
  )

  const stats = user?.stats
  const winsLabel = stats?.totalWins ?? 0
  const gamesLabel = stats?.totalGames ?? 0
  const rateLabel =
    stats && stats.totalGames > 0
      ? `${(stats.winRate * 100).toFixed(1)}%`
      : '—'

  const lobbyXp = useMemo(() => {
    return getLobbyXpForUser(user?.id, stats)
  }, [user?.id, stats])

  useEffect(() => {
    if (user) void fetchMe()
  }, [user?.id, fetchMe])

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    function tick() {
      const next = formatSeasonCountdown(SEASON_END_MS - Date.now())
      if (next === null) {
        setSeasonCountdown('Season Ended')
        if (timer !== null) {
          window.clearInterval(timer)
          timer = null
        }
        return
      }
      setSeasonCountdown(next)
    }

    tick()
    timer = window.setInterval(tick, 60_000)
    return () => {
      if (timer !== null) window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadRecent() {
      if (!user) {
        if (!cancelled) {
          setRecentMatchRows([])
          setRecentMatchesLoading(false)
          setRecentMatchesError(false)
        }
        return
      }

      setRecentMatchesLoading(true)
      setRecentMatchesError(false)

      try {
        const data = await getRecentMatches()
        if (cancelled) return

        const rows = data.matches
          .map((m) => ({
            key: m.id,
            resultLabel: m.isWin ? 'Victory' : 'Defeat',
            opp: formatMatchOpponentLabel(m),
            ago: formatMatchEndedRelative(m.endedAt),
            tone: m.isWin ? 'text-emerald-400/95' : 'text-rose-400/90',
            isWin: m.isWin,
          }))
          .filter((r) => r.key)

        setRecentMatchRows(rows)
      } catch {
        if (!cancelled) {
          setRecentMatchRows([])
          setRecentMatchesError(true)
        }
      } finally {
        if (!cancelled) setRecentMatchesLoading(false)
      }
    }

    void loadRecent()
    return () => {
      cancelled = true
    }
  }, [user])

  const panelSurface =
    'cg-panel rounded-2xl bg-white/[0.055] shadow-[0_0_40px_rgba(88,28,135,0.16),0_10px_36px_rgba(0,0,0,0.42)] backdrop-blur-xl'
  const padStd = 'p-5 md:p-6'
  const labelUi =
    'cg-label font-sans text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cyan-400/95'
  const actionCardBase = `${panelSurface} ${padStd} cg-card group relative min-h-0 overflow-hidden transition hover:shadow-[0_0_44px_rgba(139,92,246,0.2)]`
  const soloCardGlow =
    'shadow-[0_0_36px_rgba(139,92,246,0.32),0_10px_36px_rgba(0,0,0,0.45)]'

  const handleStartSolo = useCallback(async () => {
    if (startingGame) return
    setStartingGame(true)
    await new Promise((resolve) => window.setTimeout(resolve, 650))
    navigate('/game?layer=1')
  }, [navigate, startingGame])

  if (isLoading) {
    return <LoadingScreen message="Loading lobby…" />
  }

  if (!user) {
    return null
  }

  return (
    <div className="lobby-dash-root cg-page relative isolate flex h-[calc(100dvh-var(--navbar-height))] min-h-[calc(100dvh-var(--navbar-height))] w-full max-w-[100vw] flex-col overflow-x-hidden bg-[#05050f] text-slate-200">
      {startingGame ? <LoadingScreen message="Entering the arena…" /> : null}
      <video
        className="pointer-events-none absolute inset-0 z-0 h-full min-h-full w-full min-w-full object-cover"
        aria-hidden
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        src={LOBBY_BACKGROUND_VIDEO_URL}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#05050f]/82 via-[#070712]/88 to-[#030308]/92"
        aria-hidden
      />
      <div
        className="lobby-glow-orb pointer-events-none absolute inset-0 z-[2]"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.1), transparent 38%), radial-gradient(circle at 85% 55%, rgba(59, 130, 246, 0.06), transparent 42%)',
        }}
      />

      <div className="lobby-dash-shell relative z-10 mx-auto flex min-h-0 min-w-0 w-full max-w-[1360px] flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 pb-5 pt-5 sm:px-6 md:pb-6 xl:px-12 min-[1601px]:max-w-[min(98vw,1720px)] min-[1601px]:px-5">
        <div className="lobby-dash-grid grid min-h-0 min-w-0 max-w-full flex-1 grid-cols-1 gap-8 pb-3 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(300px,360px)] lg:items-stretch lg:gap-12 xl:gap-12 min-[1601px]:gap-10 min-[1601px]:lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(300px,340px)]">
          {/* LEFT — profile / stats / recent matches */}
          <aside
            className={`lobby-sidebar-left ${panelSurface} ${padStd} flex min-h-0 min-w-0 flex-col overflow-y-auto`}
          >
            <div className="lobby-sidebar-inner flex flex-col gap-6">
              <div className="lobby-sidebar-rail-top flex flex-col items-center gap-5 text-center lg:flex-row lg:items-start lg:gap-5 lg:text-left">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={handleAvatarPick}
                    disabled={avatarUploading}
                    className="lobby-sidebar-avatar group relative flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-violet-400/45 ring-offset-[3px] ring-offset-[rgba(8,6,18,0.85)] transition hover:ring-violet-300/70 disabled:cursor-wait"
                    style={{
                      background: hasAvatarImage
                        ? '#120f1f'
                        : 'linear-gradient(152deg, rgba(156, 117, 246, 0.58) 0%, rgba(99, 91, 246, 0.32) 45%, rgba(59, 130, 246, 0.28) 100%)',
                      boxShadow:
                        '0 0 32px rgba(139, 92, 246, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
                    }}
                    title="Upload avatar"
                    aria-label="Upload avatar"
                  >
                    <UserAvatar
                      username={displayName}
                      avatar={user.avatar}
                      className="h-full w-full"
                      imageClassName="h-full w-full"
                      fallbackClassName="text-[1.35rem]"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-violet-100 opacity-0 transition group-hover:opacity-100">
                      {avatarUploading ? 'Uploading…' : 'Change'}
                    </span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => void handleAvatarChange(event)}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 lg:items-stretch lg:pt-0.5">
                  <div className="flex w-full items-center justify-center gap-2 lg:justify-start">
                    <h2 className="truncate font-sans text-xl font-semibold tracking-tight text-white">
                      {displayName}
                    </h2>
                    <span
                      className="shrink-0 text-sm text-violet-400/50 transition hover:text-violet-300/80"
                      aria-hidden
                      title="Display name"
                    >
                      ✎
                    </span>
                  </div>
                  <p className="lobby-sidebar-label text-violet-400/72">
                    {lobbyXp.rankTitle}
                  </p>
                  {avatarError ? (
                    <p
                      role="alert"
                      className="mt-2 rounded-lg border border-red-500/35 bg-red-950/45 px-3 py-2 text-left text-xs text-red-100"
                    >
                      {avatarError}
                    </p>
                  ) : null}
                  <div className="mt-3 w-full lg:mt-4">
                    <div className="lobby-sidebar-xp-row mb-1.5 flex justify-between gap-3 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <span>XP</span>
                      <span className="min-w-0 truncate tabular-nums tracking-normal text-violet-100/90">
                        {formatXpWithCommas(lobbyXp.currentLevelXp)} /{' '}
                        {formatXpWithCommas(lobbyXp.nextLevelXp)}
                      </span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-black/55 shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.07]"
                      role="progressbar"
                      aria-valuenow={Math.round(lobbyXp.progressPercent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Level ${lobbyXp.currentLevel} progress`}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.45)]"
                        style={{ width: `${lobbyXp.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lobby-sidebar-stats rounded-xl bg-black/25 px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="grid grid-cols-3 gap-2 text-center font-sans sm:gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="lobby-sidebar-stat-value text-lg font-bold tabular-nums leading-none text-white">
                      {winsLabel}
                    </div>
                    <div className="lobby-sidebar-stat-caption text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-500">
                      Wins
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1 px-0.5">
                    <div className="lobby-sidebar-stat-value text-lg font-bold tabular-nums leading-none text-white">
                      {gamesLabel}
                    </div>
                    <div className="lobby-sidebar-stat-caption text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-500">
                      Games
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="lobby-sidebar-stat-value lobby-sidebar-stat-winrate font-bold tabular-nums leading-none text-violet-100">
                      {rateLabel}
                    </div>
                    <div className="lobby-sidebar-stat-caption text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-500">
                      Win %
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`lobby-recent-panel ${padStd} flex min-h-0 flex-1 flex-col`}>
              <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-violet-50 sm:text-[0.74rem]">
                RECENT MATCHES
              </h3>
              {recentMatchesLoading ? (
                <p className="mt-2 text-[0.75rem] leading-relaxed text-violet-200/95 sm:text-sm">
                  Loading recent matches...
                </p>
              ) : null}
              {!recentMatchesLoading && recentMatchesError ? (
                <p className="mt-2 text-[0.75rem] leading-relaxed text-violet-200/95 sm:text-sm">
                  Unable to load recent matches
                </p>
              ) : null}
              {!recentMatchesLoading && !recentMatchesError && recentMatchRows.length === 0 ? (
                <p className="mt-2 text-[0.75rem] leading-relaxed text-violet-200/95 sm:text-sm">
                  No recent matches yet
                </p>
              ) : null}
              {!recentMatchesLoading && !recentMatchesError && recentMatchRows.length > 0 ? (
                <ul className="lobby-recent-list mt-4 flex flex-col gap-3 overflow-y-auto text-[0.9rem] sm:text-[0.95rem]">
                  {recentMatchRows.map((row) => (
                    <li
                      key={row.key}
                      className="flex items-center gap-3 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0"
                    >
                      <img
                        src={row.isWin ? LOBBY_VICTORY_ICON_URL : LOBBY_LOSE_ICON_URL}
                        alt=""
                        className="h-10 w-10 shrink-0 object-contain mix-blend-screen brightness-105 contrast-105 drop-shadow-[0_0_12px_rgba(139,92,246,0.35)] sm:h-11 sm:w-11"
                      />
                      <div className="min-w-0 flex-1 leading-snug">
                        <div className="text-pretty">
                          <span className={`font-semibold ${row.tone}`}>{row.resultLabel}</span>
                          <span className="text-violet-100/92"> · {row.opp}</span>
                        </div>
                        <div className="mt-1 text-[0.8rem] font-medium tracking-wide text-violet-50/92 sm:text-[0.875rem]">
                          {row.ago}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </aside>

          {/* CENTER — welcome hero */}
          <main className="lobby-dash-main flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-8 lg:gap-10">
            <section className="lobby-welcome-hero relative w-full shrink-0 self-start min-h-[11rem] sm:min-h-[13rem] lg:min-h-[15rem]">
              <div className="relative z-10 flex h-full flex-col justify-center p-5 md:p-7 lg:p-8">
                <p className={`${labelUi} mb-2 text-cyan-300/90`}>WELCOME BACK,</p>
                <h1 className="lobby-dash-hero-title lobby-display-serif text-[clamp(1.75rem,4.2vw,3rem)] font-bold uppercase leading-[1.05] tracking-[0.04em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
                  {displayNameCaps}
                </h1>
                <p className="mt-3 text-base font-medium italic tracking-wide text-violet-200/95 sm:text-lg">
                  ✧ Battle. Strategy. Victory. ✧
                </p>
                <p className="mt-3 max-w-none text-sm leading-relaxed text-slate-400/95">
                  Step into the arena — sharpen your decks in Solo PvE runs.
                </p>
              </div>
            </section>
          </main>

          {/* RIGHT — Solo / Rogue / Leaderboard */}
          <aside
            className={`lobby-dash-aside ${panelSurface} ${padStd} flex min-h-0 min-w-0 flex-col justify-center gap-4 overflow-y-auto`}
          >
            <button
              type="button"
              onClick={() => void handleStartSolo()}
              disabled={startingGame}
              aria-busy={startingGame}
              className={`lobby-action-card lobby-action-card--tall ${actionCardBase} ${soloCardGlow} flex min-h-[9rem] flex-col justify-between gap-3 self-stretch text-left font-sans${startingGame ? ' opacity-70' : ''}`}
            >
              <div
                className="lobby-action-card__media pointer-events-none absolute inset-0 z-0 overflow-hidden"
                aria-hidden
              >
                <video
                  className="lobby-action-card__video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  src={LOBBY_SOLO_CARD_VIDEO_URL}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#07060f]/88 via-[#07060f]/45 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(7,6,15,0.82)_0%,rgba(7,6,15,0.52)_42%,rgba(7,6,15,0.15)_72%,transparent_98%)]" />
              </div>
              <div
                className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-violet-600/14 via-transparent to-cyan-500/08"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-6 top-4 z-[1] h-24 w-24 rounded-full bg-violet-500/15 blur-2xl"
                aria-hidden
              />
              <div className="relative z-[2] min-w-0">
                <p className={labelUi}>SOLO</p>
                <h3 className="mt-1.5 text-base font-black uppercase tracking-wide text-white md:text-lg">
                  START SOLO PVE
                </h3>
                <p className="mt-1.5 text-xs text-slate-400">
                  Challenge the AI and test your skills.
                </p>
              </div>
              <span className="relative z-[2] self-start text-[0.75rem] font-bold uppercase tracking-[0.22em] drop-shadow-[0_0_12px_rgba(34,211,238,0.22)]">
                {startingGame ? 'PREPARING…' : 'START SOLO PVE'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/rogue')}
              className={`lobby-action-card lobby-action-card--tall ${actionCardBase} shadow-[0_0_36px_rgba(251,191,36,0.22),0_10px_36px_rgba(0,0,0,0.45)] flex min-h-[9rem] flex-col justify-between gap-3 self-stretch text-left font-sans`}
            >
              <div
                className="lobby-action-card__media pointer-events-none absolute inset-0 z-0 overflow-hidden"
                aria-hidden
              >
                <video
                  className="lobby-action-card__video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  src={LOBBY_ROGUE_CARD_VIDEO_URL}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#07060f]/88 via-[#07060f]/45 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(7,6,15,0.82)_0%,rgba(7,6,15,0.52)_42%,rgba(7,6,15,0.15)_72%,transparent_98%)]" />
              </div>
              <div
                className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-amber-600/14 via-transparent to-orange-500/08"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-6 top-4 z-[1] h-24 w-24 rounded-full bg-amber-500/15 blur-2xl"
                aria-hidden
              />
              <div className="relative z-[2] min-w-0">
                <p className={`${labelUi} !text-amber-400/95`}>ROGUE</p>
                <h3 className="mt-1.5 text-base font-black uppercase tracking-wide text-white md:text-lg">
                  ROGUE MODE
                </h3>
                <p className="mt-1.5 text-xs text-slate-400">
                  Challenge 10 floors. Grow stronger with each victory.
                </p>
              </div>
              <span className="relative z-[2] self-start text-[0.75rem] font-bold uppercase tracking-[0.22em] drop-shadow-[0_0_12px_rgba(34,211,238,0.22)]">
                START ROGUE
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/leaderboard')}
              className={`lobby-action-card ${actionCardBase} flex min-h-[7rem] flex-col justify-between text-left font-sans`}
            >
              <div className="lobby-action-card__media pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div
                  className="lobby-action-card__bg absolute inset-0 bg-no-repeat"
                  style={{
                    backgroundImage: "url('/lobby/goldCup.png')",
                    opacity: 0.46,
                    filter: 'brightness(1.08) contrast(1.06) saturate(1.04)',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-violet-950/25 via-transparent to-amber-950/15" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(7,6,13,0.94)_0%,rgba(7,6,13,0.82)_18%,rgba(7,6,13,0.55)_38%,rgba(7,6,13,0.28)_56%,rgba(7,6,13,0.1)_74%,transparent_96%)]" />
                <div className="absolute -right-[10%] top-1/2 h-[95%] w-[70%] -translate-y-1/2 rounded-full bg-amber-400/8 blur-[3.75rem]" />
              </div>
              <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-between gap-2 pt-px pr-3">
                <div className="min-w-0 pr-2">
                  <p className={`${labelUi} !tracking-[0.27em]`}>BOARD</p>
                  <h3 className="lobby-display-serif mt-1.5 text-base font-bold uppercase leading-tight tracking-[0.12em] text-white md:text-lg">
                    LEADERBOARD
                  </h3>
                  <p className="mt-2 text-[0.85rem] font-medium leading-snug text-slate-400/95">
                    See how you rank against players
                  </p>
                </div>
                <span className="self-start text-[0.8rem] font-bold uppercase tracking-[0.22em] drop-shadow-[0_0_12px_rgba(34,211,238,0.22)]">
                  VIEW RANKINGS →
                </span>
              </div>
            </button>

            <div
              className={`lobby-action-card lobby-action-card--season ${actionCardBase} flex min-h-[7rem] flex-col justify-between text-left font-sans ring-1 ring-fuchsia-500/25`}
              aria-label="Current season information"
            >
              <div className="lobby-action-card__media pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div
                  className="lobby-action-card__bg lobby-action-card__bg--season absolute inset-0 bg-no-repeat"
                  style={{
                    backgroundImage: `url('${LOBBY_SEASON_ICON_URL}')`,
                    opacity: 0.52,
                    filter: 'brightness(1.12) contrast(1.05) saturate(1.08)',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-violet-950/35 via-transparent to-fuchsia-950/20" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(7,6,13,0.94)_0%,rgba(7,6,13,0.82)_18%,rgba(7,6,13,0.55)_38%,rgba(7,6,13,0.28)_56%,rgba(7,6,13,0.1)_74%,transparent_96%)]" />
                <div className="absolute -right-[10%] top-1/2 h-[95%] w-[70%] -translate-y-1/2 rounded-full bg-fuchsia-400/10 blur-[3.75rem]" />
              </div>
              <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-between gap-2 pt-px pr-3">
                <div className="min-w-0 pr-2">
                  <p className={`${labelUi} !text-fuchsia-300/95 !tracking-[0.27em]`}>SEASON</p>
                  <h3 className="lobby-display-serif mt-1.5 text-base font-bold uppercase leading-tight tracking-[0.12em] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)] md:text-lg">
                    SHADOW AWAKENING
                  </h3>
                  <p className="mt-2 text-[0.85rem] font-medium leading-snug text-slate-400/95">
                    {seasonEnded
                      ? 'Season 1 has concluded. Rewards are being tallied.'
                      : 'Season 1 — climb the ranks before time runs out.'}
                  </p>
                </div>
                <span className="self-start text-[0.8rem] font-bold uppercase tracking-[0.22em] tabular-nums drop-shadow-[0_0_12px_rgba(244,114,182,0.28)]">
                  {seasonEnded ? 'SEASON ENDED' : `${seasonCountdown} LEFT →`}
                </span>
              </div>
            </div>
          </aside>
        </div>

        <footer className="lobby-dash-footer mt-auto flex shrink-0 flex-wrap items-center justify-center gap-8 px-4 py-5 font-sans text-[0.7rem] text-slate-500 sm:gap-10">
          <p>Card Rogue © {new Date().getFullYear()} All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
