/**
 * 大厅经验、等级和奖励的前端计算。
 * 它把服务端战绩与本地刚获得的奖励转换为等级、称号和进度条显示，不写入战斗结算。
 */

import { getSyncedTotalXp } from './xpStorage'


// 返回升到下一等级所需的经验值。
export function xpRequiredToAdvance(level: number): number {
  const L = Math.max(1, Math.floor(Number(level)) || 1)
  return Math.floor(500 * L ** 1.35)
}

// 把等级和当前进度转换为累计经验，便于统一计算奖励。
export function computeTotalXp(input: {
  totalGames?: number
  totalWins?: number
  winRate?: number
  maxDamage?: number
} = {}): number {
  const g = Math.max(0, Number(input.totalGames) || 0)
  const w = Math.max(0, Number(input.totalWins) || 0)
  const wr = Math.max(0, Math.min(1, Number(input.winRate) || 0))
  const md = Math.max(0, Number(input.maxDamage) || 0)

  const base = g * 80 + w * 350 + md * 1.2
  const winRateBonus = Math.floor(wr * 450)

  return Math.max(0, Math.floor(base + winRateBonus))
}

// 将累计经验拆分为当前等级、段内经验和进度比例。
export function xpProgressFromTotal(totalXp: number) {
  const xp = Math.max(0, Math.floor(Number(totalXp) || 0))
  let level = 1
  let remaining = xp
  let guard = 0

  while (remaining >= xpRequiredToAdvance(level) && guard < 100_000) {
    remaining -= xpRequiredToAdvance(level)
    level += 1
    guard += 1
  }

  const nextLevelXp = xpRequiredToAdvance(level)
  const progressPercent =
    nextLevelXp > 0 ? Math.min(100, Math.max(0, (remaining / nextLevelXp) * 100)) : 0

  return {
    totalXp: xp,
    currentLevel: level,
    currentLevelXp: remaining,
    nextLevelXp,
    progressPercent,
  }
}

// 根据等级返回大厅展示的称号。
export function rankTitleForLevel(level: number): string {
  const L = Math.max(1, Math.floor(Number(level)) || 1)
  if (L <= 4) return 'Wanderer'
  if (L <= 9) return 'Ranked Adventurer'
  if (L <= 19) return 'Shadow Hunter'
  if (L <= 34) return 'Abyss Walker'
  if (L <= 49) return 'Rift Knight'
  if (L <= 74) return 'Void Reaper'
  return 'Eternal Sovereign'
}

// 为经验数字添加千位分隔，提升大厅展示可读性。
export function formatXpWithCommas(n: number): string {
  return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('en-US')
}

// 将用户统计数据转换为大厅经验条需要的完整进度信息。
export function computeLobbyXpProgress(statsInput: {
  totalGames?: number
  totalWins?: number
  winRate?: number
  maxDamage?: number
} = {}) {
  const total = computeTotalXp(statsInput)
  const prog = xpProgressFromTotal(total)
  return {
    ...prog,
    rankTitle: rankTitleForLevel(prog.currentLevel),
  }
}

// 在用户统计尚未加载时提供稳定的经验展示占位值。
export function lobbyXpFallback() {
  const nextLevelXp = xpRequiredToAdvance(1)
  return {
    totalXp: 0,
    currentLevel: 1,
    currentLevelXp: 0,
    nextLevelXp,
    progressPercent: 0,
    rankTitle: rankTitleForLevel(1),
  }
}

// 按对局结果和难度计算前端本地展示用的经验奖励。
export function computeMatchXpReward(input: {
  isWin: boolean
  layer?: number
  damageDealt?: number
}): number {
  const layer = Math.max(1, Math.floor(Number(input.layer) || 1))
  const dmg = Math.max(0, Math.floor(Number(input.damageDealt) || 0))

  if (input.isWin) {
    return Math.floor(120 + layer * 45 + dmg * 0.35)
  }

  return Math.floor(40 + layer * 15 + dmg * 0.12)
}

// 读取指定用户的大厅经验数据，并与本地结算缓存合并。
export function getLobbyXpForUser(
  userId: string | undefined,
  statsInput: {
    totalGames?: number
    totalWins?: number
    winRate?: number
    maxDamage?: number
  } | undefined,
) {
  if (!userId || !statsInput) return lobbyXpFallback()

  const totalXp = getSyncedTotalXp(userId, statsInput)
  const prog = xpProgressFromTotal(totalXp)

  return {
    ...prog,
    rankTitle: rankTitleForLevel(prog.currentLevel),
  }
}
