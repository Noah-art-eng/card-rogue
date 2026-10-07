import apiClient from './client'
import type { MatchSummary } from '../types/match'

interface RecentMatchesResponse {
  matches: MatchSummary[]
}

// 读取当前用户的最近对局，用于大厅展示战绩摘要。
export async function getRecentMatches(): Promise<RecentMatchesResponse> {
  const response = await apiClient.get<RecentMatchesResponse>('/matches/recent')
  return response.data
}
