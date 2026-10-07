import apiClient from './client'
import type { LeaderboardResponse } from '../types/leaderboard'

interface LeaderboardApiPayload {
  data: LeaderboardResponse
}

// 按指定排序和分页参数从服务端读取排行榜数据。
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
