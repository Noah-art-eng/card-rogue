/**
 * 排行榜接口的前端请求封装。
 * 排行榜页面通过这里传入排序和分页参数，并取得统一的数据结构。
 */

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
