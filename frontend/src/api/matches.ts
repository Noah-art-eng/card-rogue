/**
 * 最近对局接口的前端请求封装。
 * 大厅通过这里读取当前用户的 PvE 历史，而不在组件中直接处理 HTTP 细节。
 */

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
