export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatar?: string
  totalGames: number
  totalWins: number
  winRate: number
}

export interface LeaderboardResponse {
  rankings: LeaderboardEntry[]
  total: number
  page: number
}

export type MyRankState =
  | { kind: 'loading' }
  | { kind: 'guest' }
  | { kind: 'idle' }
  | { kind: 'listed'; rank: number; winRate: number; totalGames: number }
  | { kind: 'outside_top'; winRate: number; totalGames: number }
  | { kind: 'ineligible'; totalGames: number; needGames: number }
  | { kind: 'stats_error' }
  | { kind: 'leaderboard_failed'; message?: string }
