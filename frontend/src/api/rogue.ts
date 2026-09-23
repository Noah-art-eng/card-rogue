import apiClient from './client'
import type { EnhancementOption, FloorLostResult, RogueSaveRecord } from '../types/rogue'

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

// 创建或初始化 RogueRun 所需的数据。
export async function startRogueRun() {
  const response = await apiClient.post<ApiEnvelope<unknown>>('/rogue/start')
  return response.data.data
}

// 执行 RogueProgress 相关处理。
export async function saveRogueProgress(gameState: {
  layer: number
  playerHp: number
  bossHp: number
  enhancements: EnhancementOption[]
  stats?: { totalRounds: number }
}) {
  const response = await apiClient.put<ApiEnvelope<unknown>>('/rogue/save', {
    layer: gameState.layer,
    playerHp: gameState.playerHp,
    bossHp: gameState.bossHp,
    enhancements: gameState.enhancements,
    stats: gameState.stats,
  })
  return response.data.data
}

// 负责 notifyFloorWon 的业务处理。
export async function notifyFloorWon(
  layer: number,
  playerHp: number,
  enhancements: EnhancementOption[],
) {
  const response = await apiClient.post<ApiEnvelope<unknown>>('/rogue/floor-won', {
    layer,
    playerHp,
    enhancements,
  })
  return response.data.data
}

// 负责 chooseEnhancement 的业务处理。
export async function chooseEnhancement(enhancement: EnhancementOption) {
  const response = await apiClient.post<ApiEnvelope<unknown>>('/rogue/choose-enhancement', {
    enhancement,
  })
  return response.data.data
}

// 负责 notifyFloorLost 的业务处理。
export async function notifyFloorLost(): Promise<FloorLostResult> {
  const response = await apiClient.post<ApiEnvelope<FloorLostResult>>('/rogue/floor-lost')
  return response.data.data
}

// 负责 notifyRogueWon 的业务处理。
export async function notifyRogueWon() {
  const response = await apiClient.post<ApiEnvelope<null>>('/rogue/won')
  return response.data.data
}

// 负责 abandonRogueRun 的业务处理。
export async function abandonRogueRun() {
  const response = await apiClient.post<ApiEnvelope<null>>('/rogue/abandon')
  return response.data.data
}

// 获取、计算或校验 CurrentRogueRun。
export async function getCurrentRogueRun(): Promise<RogueSaveRecord | null> {
  try {
    const response = await apiClient.get<ApiEnvelope<RogueSaveRecord>>('/rogue/current')
    return response.data.data
  } catch {
    return null
  }
}
