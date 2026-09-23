import apiClient from './client'
import type { MatchSummary } from '../types/match'

interface RecentMatchesResponse {
  matches: MatchSummary[]
}

// 获取、计算或校验 RecentMatches。
export async function getRecentMatches(): Promise<RecentMatchesResponse> {
  const response = await apiClient.get<RecentMatchesResponse>('/matches/recent')
  return response.data
}
