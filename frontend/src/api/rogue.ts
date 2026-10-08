/**
 * 肉鸽存档和层级事件的 API 入口。
 * 页面通过这里开始新局、保存快照、选择强化、处理胜负和读取可恢复存档。
 */

import apiClient from './client'
import type { EnhancementOption, FloorLostResult, RogueSaveRecord } from '../types/rogue'

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

// 创建新的肉鸽流程并取得第一层存档快照。
export async function startRogueRun() {
  const response = await apiClient.post<ApiEnvelope<unknown>>('/rogue/start')
  return response.data.data
}

// 在离开页面或刷新前把当前肉鸽战斗快照写入服务端。
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

// 通知服务端本层已通关，以保存下一层的恢复检查点。
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

// 保存玩家在通关奖励阶段选中的强化项。
export async function chooseEnhancement(enhancement: EnhancementOption) {
  const response = await apiClient.post<ApiEnvelope<unknown>>('/rogue/choose-enhancement', {
    enhancement,
  })
  return response.data.data
}

// 询问服务端失败后应恢复检查点还是结束本局。
export async function notifyFloorLost(): Promise<FloorLostResult> {
  const response = await apiClient.post<ApiEnvelope<FloorLostResult>>('/rogue/floor-lost')
  return response.data.data
}

// 标记肉鸽流程完成，并清理服务端存档。
export async function notifyRogueWon() {
  const response = await apiClient.post<ApiEnvelope<null>>('/rogue/won')
  return response.data.data
}

// 主动放弃肉鸽流程并删除服务端存档。
export async function abandonRogueRun() {
  const response = await apiClient.post<ApiEnvelope<null>>('/rogue/abandon')
  return response.data.data
}

// 读取当前账号可继续的肉鸽流程。
export async function getCurrentRogueRun(): Promise<RogueSaveRecord | null> {
  try {
    const response = await apiClient.get<ApiEnvelope<RogueSaveRecord>>('/rogue/current')
    return response.data.data
  } catch {
    return null
  }
}
