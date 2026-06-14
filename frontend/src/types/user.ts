export interface UserStats {
  totalGames: number
  totalWins: number
  winRate: number
  maxDamage: number
}

export interface User {
  id: string
  username: string
  email: string
  avatar: string
  stats: UserStats
  createdAt: string
  updatedAt: string
}
