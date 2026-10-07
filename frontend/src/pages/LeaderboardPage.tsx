import axios from 'axios'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'

import { getLeaderboard } from '../api/leaderboard'
import LoadingScreen from '../components/common/LoadingScreen'
import UserAvatar from '../components/common/UserAvatar'
import { useAuth } from '../stores/AuthContext'
import type { LeaderboardEntry, MyRankState } from '../types/leaderboard'
import '../styles/LeaderboardPage.css'

const LEADERBOARD_BACKGROUND_VIDEO_URL = '/leaderboard/leaderboardBackground.mp4'
const LEADERBOARD_HEADER_ICON_URL = '/leaderboard/leaderboard-icon.PNG'
const LEADERBOARD_CUP_URL = '/leaderboard/leaderboard-cup.PNG'
const LEADERBOARD_PAGE_LIMIT = 100
const MIN_RANKED_GAMES = 1

const LEADERBOARD_RANK_IMG: Record<number, string> = {
  1: '/leaderboard/first.PNG',
  2: '/leaderboard/second.PNG',
  3: '/leaderboard/third.PNG',
}

const RANK_ROW_STYLES: Record<
  number,
  { border: string; boxShadow: string; bg: string }
> = {
  1: {
    border: '1px solid rgba(212, 175, 55, 0.55)',
    boxShadow:
      '0 0 0 1px rgba(212, 175, 55, 0.12), 0 0 24px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
    bg: 'linear-gradient(90deg, rgba(212, 175, 55, 0.12) 0%, rgba(26,16,42,0.45) 50%, transparent 100%)',
  },
  2: {
    border: '1px solid rgba(192, 192, 192, 0.42)',
    boxShadow:
      '0 0 0 1px rgba(192, 192, 192, 0.1), 0 0 20px rgba(147, 197, 255, 0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
    bg: 'linear-gradient(90deg, rgba(180, 200, 220, 0.1) 0%, rgba(20,14,38,0.5) 55%, transparent 100%)',
  },
  3: {
    border: '1px solid rgba(205, 127, 50, 0.5)',
    boxShadow:
      '0 0 0 1px rgba(205, 127, 50, 0.08), 0 0 18px rgba(205, 127, 50, 0.22), inset 0 1px 0 rgba(255,255,255,0.04)',
    bg: 'linear-gradient(90deg, rgba(205, 127, 50, 0.1) 0%, rgba(24,14,28,0.55) 55%, transparent 100%)',
  },
}

function SidebarIconBack({ iconClass }: { iconClass?: string }) {
  const wrap = iconClass ?? 'h-[1.125rem] w-[1.125rem] shrink-0'
  return (
    <svg
      className={`${wrap} opacity-[0.9]`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function LeaderboardClockGlyph({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  const c = className ?? 'h-6 w-6'
  return (
    <svg
      className={`${c} text-[#c89b3c]`}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.85" strokeOpacity={0.95} />
      <path d="M12 11.15V12.8l3.85 2.05" opacity={0.95} />
    </svg>
  )
}

function formatWinRate(winRate: number | undefined): string {
  if (typeof winRate !== 'number' || Number.isNaN(winRate)) return '—'
  return `${(winRate * 100).toFixed(1)}%`
}

function resolveMyRank(
  userId: string | undefined,
  rankings: LeaderboardEntry[],
  stats: { totalGames: number; totalWins: number; winRate: number } | undefined,
): MyRankState {
  if (!userId) return { kind: 'guest' }
  if (!stats) return { kind: 'stats_error' }

  const listed = rankings.find((r) => String(r.userId) === String(userId))
  if (listed) {
    return {
      kind: 'listed',
      rank: listed.rank,
      winRate: listed.winRate,
      totalGames: listed.totalGames,
    }
  }

  if (stats.totalGames < MIN_RANKED_GAMES) {
    return {
      kind: 'ineligible',
      totalGames: stats.totalGames,
      needGames: MIN_RANKED_GAMES - stats.totalGames,
    }
  }

  return {
    kind: 'outside_top',
    winRate: stats.winRate,
    totalGames: stats.totalGames,
  }
}

export default function LeaderboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [rankings, setRankings] = useState<LeaderboardEntry[]>([])
  const [rankedTotal, setRankedTotal] = useState(0)
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  const [myRank, setMyRank] = useState<MyRankState>({ kind: 'loading' })

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true)
    setLeaderboardError(null)
    setMyRank({ kind: 'loading' })

    try {
      const data = await getLeaderboard('winRate', 1, LEADERBOARD_PAGE_LIMIT)
      setRankings(data.rankings ?? [])
      setRankedTotal(typeof data.total === 'number' ? data.total : 0)
      setMyRank(resolveMyRank(user?.id, data.rankings ?? [], user?.stats))
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ||
          err.message ||
          'Failed to load leaderboard. Please try again.'
        : 'Failed to load leaderboard. Please try again.'
      setLeaderboardError(msg)
      setRankings([])
      setRankedTotal(0)
      setMyRank({ kind: 'leaderboard_failed', message: msg })
    } finally {
      setLeaderboardLoading(false)
    }
  }, [user?.id, user?.stats])

  useEffect(() => {
    if (authLoading) return
    void loadLeaderboard()
  }, [authLoading, loadLeaderboard])

  const leaderboardRankingsFrame =
    'rounded-none border border-[#c89b3c]/70 bg-black/[0.52] shadow-[0_28px_64px_-20px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(200,155,60,0.15)]'
  const leaderboardRankingsMat =
    'rounded-none border border-[#c89b3c]/70 bg-[linear-gradient(152deg,#0c0c10_0%,#0a0a0c_50%,#08080b_100%)] shadow-[inset_0_0_0_1px_rgba(200,155,60,0.09),inset_0_1px_0_rgba(255,255,255,0.035)]'
  const lbGoldCaps = 'lb-ft-gold-caps'

  if (authLoading) {
    return <LoadingScreen message="Loading leaderboard…" />
  }

  return (
    <div className="lb-dash-root cg-page relative isolate flex h-[calc(100dvh-var(--navbar-height))] min-h-[calc(100dvh-var(--navbar-height))] w-full max-w-[100vw] flex-col overflow-x-hidden bg-[#05050f] text-slate-200">
      {leaderboardLoading && rankings.length === 0 ? (
        <LoadingScreen message="Fetching rankings…" />
      ) : null}
      <video
        key={LEADERBOARD_BACKGROUND_VIDEO_URL}
        className="lb-dash-bg-video pointer-events-none absolute inset-0 z-0 h-full min-h-full w-full min-w-full object-cover"
        aria-hidden
        muted
        autoPlay
        playsInline
        preload="auto"
        src={LEADERBOARD_BACKGROUND_VIDEO_URL}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#05050f]/84 via-[#070614]/82 to-[#030308]/90"
        aria-hidden
      />
      <div
        className="lb-glow-orbs pointer-events-none absolute inset-0 z-[2] opacity-50"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 20%, rgba(88, 28, 135, 0.22), transparent 55%), radial-gradient(circle at 15% 70%, rgba(59, 130, 246, 0.12), transparent 40%), radial-gradient(circle at 88% 60%, rgba(139, 92, 246, 0.1), transparent 42%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-b from-[#05050f]/55 via-transparent to-[#030308]/88"
        aria-hidden
      />

      <div className="lb-dash-shell relative z-10 mx-auto flex min-h-0 min-w-0 w-full max-w-[1360px] flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 pb-5 pt-5 sm:px-6 md:pb-6 xl:px-12">
        <section className="lb-dash-main-stack flex min-h-0 min-w-0 flex-col gap-2 md:gap-4 lg:gap-5">
          <div
            className={`lb-dash-main-panel ${leaderboardRankingsFrame} flex min-h-0 flex-col overflow-visible p-3 sm:p-4 lg:p-6`}
          >
            <div className="lb-dash-hero-inner flex min-w-0 flex-row flex-nowrap items-start justify-between gap-2 md:gap-3 lg:gap-6">
              <div className="flex min-w-0 flex-1 gap-2 md:gap-3 lg:gap-5">
                <img
                  src={LEADERBOARD_HEADER_ICON_URL}
                  alt=""
                  draggable={false}
                  className="lb-dash-hero-banner h-14 w-auto shrink-0 select-none object-contain object-bottom drop-shadow-[0_6px_28px_rgba(200,155,60,0.25)] sm:h-24 lg:h-36"
                  aria-hidden
                />
                <div className="min-w-0 flex-1 pt-0.5">
                  <h1 className="cg-title lb-ft-display lb-dash-ft-display-tight">PVE Leaderboard</h1>
                  <p className="cg-subtitle lb-dash-hero-sub mt-1 max-w-xl font-sans text-sm leading-relaxed text-[#a0aec8] lg:text-base">
                    Rankings prioritize games played, then win rate.
                  </p>
                </div>
              </div>
              <div className="lb-dash-rank-box ml-0.5 max-w-[min(13.5rem,38vw)] shrink-0 self-start rounded-none border border-[#c89b3c]/70 bg-[#0a0a0c] py-2 px-3 text-center shadow-[inset_0_1px_0_rgba(200,155,60,0.14),0_14px_40px_-14px_rgba(0,0,0,0.55)] sm:py-2.5 sm:px-4 lg:py-4 lg:px-9">
                <p className={lbGoldCaps}>My rank</p>
                <div className="lb-ft-rank-num lb-ft-rank-num-responsive mt-1.5 text-2xl font-bold tabular-nums leading-none tracking-tight text-white sm:text-3xl lg:mt-3 lg:text-4xl">
                  {myRank.kind === 'listed' ? (
                    `#${myRank.rank}`
                  ) : myRank.kind === 'loading' || leaderboardLoading ? (
                    <span aria-hidden className="text-white/85">
                      …
                    </span>
                  ) : (
                    <span className="text-white/82">—</span>
                  )}
                </div>
                <p className="lb-dash-rank-caption mt-1.5 font-sans text-xs leading-snug text-[#92a4c9] sm:text-sm lg:mt-2.5">
                  {myRank.kind === 'leaderboard_failed' &&
                    (myRank.message || 'Leaderboard unavailable.')}
                  {myRank.kind === 'guest' && 'Sign in to track your rank'}
                  {myRank.kind === 'loading' && 'Loading your standing…'}
                  {myRank.kind === 'listed' &&
                    `${myRank.totalGames} games · ${formatWinRate(myRank.winRate)} win rate`}
                  {myRank.kind === 'outside_top' &&
                    `Qualified · not on this page (${myRank.totalGames} games · ${formatWinRate(myRank.winRate)})`}
                  {myRank.kind === 'ineligible' &&
                    (myRank.totalGames === 0
                      ? `No ranked games yet — play ${MIN_RANKED_GAMES} game to qualify`
                      : `${myRank.totalGames} game${myRank.totalGames === 1 ? '' : 's'} played — ${myRank.needGames} more to qualify`)}
                  {myRank.kind === 'stats_error' && 'Could not load your stats. Try again later.'}
                  {myRank.kind === 'idle' && !leaderboardLoading && 'Not ranked yet'}
                </p>
              </div>
            </div>

            <div className="my-3 h-px bg-gradient-to-r from-transparent via-[#c89b3c]/45 to-transparent sm:my-4" />

            <div
              className={`${leaderboardRankingsMat} lb-dash-eligibility-mat p-2.5 sm:p-3 lg:p-4`}
            >
              <div className="lb-dash-eligibility-row flex flex-row flex-nowrap items-center justify-between gap-2 md:gap-6 lg:gap-8 lg:pr-4">
                <div className="lb-dash-eligibility-copy flex min-w-0 flex-1 items-start gap-2 md:gap-4 lg:gap-6 lg:pr-5">
                  <div
                    className="relative z-[2] mt-0.5 flex shrink-0 items-center justify-center"
                    aria-hidden
                  >
                    <img
                      src={LEADERBOARD_CUP_URL}
                      alt=""
                      draggable={false}
                      className="h-10 w-auto object-contain object-center drop-shadow-[0_4px_22px_rgba(200,155,60,0.22)] sm:h-14 lg:h-20"
                    />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className={lbGoldCaps}>Eligibility</p>
                    <h2 className="lb-ft-epic-line lb-dash-eligibility-epic mt-1">
                      Climb the ranks and prove your mastery!
                    </h2>
                    <p className="lb-dash-eligibility-rules mt-1.5 font-sans text-sm leading-relaxed text-[#9aa8cb] lg:text-base">
                      Complete at least one game to appear on the leaderboard. Higher game counts
                      rank first, then win rate breaks ties.
                    </p>
                  </div>
                </div>
                <div className="lb-dash-eligibility-side flex shrink-0 items-center gap-1.5 border-l border-[#c89b3c]/35 pl-2 md:gap-2.5 md:pl-4 lg:gap-4 lg:pl-6">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c89b3c]/70 bg-[#0a0a0c] shadow-[inset_0_0_0_1px_rgba(200,155,60,0.12)] lg:h-11 lg:w-11"
                    aria-hidden
                  >
                    <LeaderboardClockGlyph className="lb-dash-eligibility-clock h-4 w-4 text-[#c89b3c] lg:h-6 lg:w-6" />
                  </div>
                  <p
                    className={`${lbGoldCaps} lb-ft-gold-caps--compact max-w-[10rem] leading-snug lg:max-w-[12rem]`}
                  >
                    Rankings update in real time
                  </p>
                </div>
              </div>
            </div>

            <div className="my-3 h-px bg-gradient-to-r from-transparent via-[#c89b3c]/35 to-transparent sm:my-4" />

            <div
              className={`${leaderboardRankingsMat} lb-rankings-mat-inner overflow-x-auto overflow-y-auto max-h-[min(52vh,42rem)]`}
              aria-busy={leaderboardLoading}
            >
              <table className="lb-rankings-table w-full min-w-[min(460px,100%)] border-collapse text-left">
                <colgroup>
                  <col className="lb-col-rank" />
                  <col className="lb-col-player" />
                  <col className="lb-col-stat" />
                  <col className="lb-col-stat" />
                  <col className="lb-col-winrate" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#c89b3c]/35 bg-[rgba(12,11,14,0.94)]">
                    <th scope="col" className="lb-ft-table-th lb-table-cell lb-th-rank">
                      Rank
                    </th>
                    <th scope="col" className="lb-ft-table-th lb-table-cell lb-th-player">
                      Player
                    </th>
                    <th scope="col" className="lb-ft-table-th lb-table-cell lb-th-stat">
                      Games
                    </th>
                    <th scope="col" className="lb-ft-table-th lb-table-cell lb-th-stat">
                      Wins
                    </th>
                    <th scope="col" className="lb-ft-table-th lb-table-cell lb-th-winrate">
                      WIN RATE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardLoading && (
                    <tr className="border-b border-[#c89b3c]/[0.08] bg-[rgba(12,11,14,0.42)]">
                      <td
                        className="lb-table-cell lb-rankings-message text-center font-sans text-[#9aa8cb]"
                        colSpan={5}
                      >
                        Loading rankings…
                      </td>
                    </tr>
                  )}
                  {!leaderboardLoading && leaderboardError && (
                    <tr className="border-b border-[#c89b3c]/[0.08] bg-[rgba(12,11,14,0.42)]">
                      <td className="lb-table-cell lb-rankings-message text-center" colSpan={5}>
                        <p className="font-sans text-sm text-rose-200/90">{leaderboardError}</p>
                        <button
                          type="button"
                          className="mt-4 rounded-none border border-[#c89b3c]/70 bg-black/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#e8dcc8] transition hover:border-[#dfc78a]/85 hover:bg-black/75"
                          onClick={() => void loadLeaderboard()}
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  )}
                  {!leaderboardLoading && !leaderboardError && rankings.length === 0 && (
                    <tr className="border-b border-[#c89b3c]/[0.08] bg-[rgba(12,11,14,0.42)]">
                      <td
                        className="lb-table-cell lb-rankings-message text-center font-sans leading-relaxed text-[#9aa8cb]"
                        colSpan={5}
                      >
                        No eligible players yet. Complete at least one game to appear on the
                        leaderboard.
                      </td>
                    </tr>
                  )}
                  {!leaderboardLoading &&
                    !leaderboardError &&
                    rankings.map((entry) => {
                      const rank = entry.rank
                      const medal = rank <= 3 ? RANK_ROW_STYLES[rank] : null
                      const uid = user?.id != null ? String(user.id) : null
                      const isSelf = uid != null && String(entry.userId) === uid
                      return (
                        <tr
                          key={`${rank}-${entry.userId}`}
                          className={`lb-row-base border-b border-[#c89b3c]/[0.08] last:border-b-0${medal ? ' lb-row-podium' : ''}${isSelf ? ' bg-[rgba(200,155,90,0.08)] ring-1 ring-inset ring-[#c89b3c]/40' : ''}`}
                          style={
                            medal
                              ? {
                                  borderBottom: '1px solid rgba(200,155,60,0.1)',
                                  borderLeft: medal.border,
                                  borderRight: medal.border,
                                  borderTop: medal.border,
                                  boxShadow: medal.boxShadow,
                                  backgroundImage: medal.bg,
                                  backgroundRepeat: 'no-repeat',
                                }
                              : {
                                  borderLeft: '1px solid transparent',
                                  borderRight: '1px solid transparent',
                                  borderTop: '1px solid transparent',
                                  backgroundColor: isSelf ? undefined : 'rgba(14, 12, 10, 0.42)',
                                }
                          }
                        >
                          <td className="lb-table-cell lb-td-rank align-middle">
                            <span className="lb-ft-rank-num inline-flex w-full min-w-0 items-center gap-2 font-bold tabular-nums text-[#f0e6d8] sm:gap-2.5">
                              {rank <= 3 ? (
                                <img
                                  src={LEADERBOARD_RANK_IMG[rank]}
                                  alt=""
                                  className="h-8 w-8 shrink-0 object-contain object-center drop-shadow-[0_0_8px_rgba(255,220,140,0.25)] sm:h-10 sm:w-10"
                                  aria-hidden
                                />
                              ) : (
                                <span
                                  className="inline-flex h-8 w-8 shrink-0 sm:h-10 sm:w-10"
                                  aria-hidden
                                />
                              )}
                              {rank}
                            </span>
                          </td>
                          <td className="lb-table-cell lb-td-player align-middle">
                            <span className="inline-flex min-w-0 max-w-full items-center gap-2.5 font-medium tabular-nums text-[#dfe6f2]">
                              <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-[#c89b3c]/25">
                                <UserAvatar
                                  username={entry.username}
                                  avatar={entry.avatar}
                                  className="h-8 w-full"
                                  imageClassName="h-8 w-8"
                                  fallbackClassName="h-8 w-8 bg-violet-950/80 text-[0.65rem]"
                                />
                              </span>
                              <span className="truncate">{entry.username ?? '—'}</span>
                            </span>
                          </td>
                          <td className="lb-table-cell lb-td-stat align-middle tabular-nums text-[#c4c9d8]">
                            {entry.totalGames ?? '—'}
                          </td>
                          <td className="lb-table-cell lb-td-stat align-middle tabular-nums text-[#c4c9d8]">
                            {entry.totalWins ?? '—'}
                          </td>
                          <td className="lb-table-cell lb-td-winrate align-middle">
                            <span className="lb-winrate-cell font-bold tabular-nums text-[#e8dcc8]">
                              {formatWinRate(entry.winRate)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            <p className="lb-ft-footnote lb-dash-table-footnote mt-4 px-3 text-center sm:px-4">
              {leaderboardLoading
                ? 'Loading · Ranked by games played, then win rate · At least 1 game required'
                : leaderboardError
                  ? 'Showing ranked players by games played, then win rate · At least 1 game required'
                  : `Showing ${rankings.length} of ${rankedTotal} ranked player${rankedTotal === 1 ? '' : 's'} (page capped at ${LEADERBOARD_PAGE_LIMIT}) · Ranked by games played, then win rate`}
            </p>
          </div>
        </section>

        <div className="lb-dash-footer mt-3 flex shrink-0 justify-end sm:mt-4">
          <button
            type="button"
            onClick={() => navigate('/lobby')}
            title="Back to Lobby"
            className="lb-btn-back cg-button cg-button-secondary w-auto min-w-[7rem] px-3 font-sans sm:px-4"
          >
            <SidebarIconBack iconClass="h-[1.0625rem] w-[1.0625rem] shrink-0" />
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
