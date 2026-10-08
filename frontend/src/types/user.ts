/**
 * 前端用户资料和统计的数据结构。
 * 认证上下文、大厅、头像和排行榜通过这些字段共享用户名、头像与经验/胜率数据。
 */

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
