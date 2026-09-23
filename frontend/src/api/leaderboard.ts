import apiClient from './client'
import type { LeaderboardResponse } from '../types/leaderboard'

interface LeaderboardApiPayload {
  data: LeaderboardResponse
}

// 获取、计算或校验 Leaderboard。
export async function getLeaderboard(
  sort: 'winRate' | 'totalWins' = 'winRate',
  page = 1,
  limit = 20,
): Promise<LeaderboardResponse> {
  const response = await apiClient.get<LeaderboardApiPayload>('/leaderboard', {
    params: { sort, page, limit },
  })
  return response.data.data
}
