import { computeTotalXp } from './xpSystem'

const KEY_PREFIX = 'card-rogue-xp:'
const MAX_AWARDED_KEYS = 100

interface XpRecord {
  totalXp: number
  awardedKeys: string[]
}

// 从本地经验缓存读取用户记录，缺失或损坏时安全回退为空记录。
function readRecord(userId: string): XpRecord {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${userId}`)
    if (!raw) return { totalXp: 0, awardedKeys: [] }
    const parsed = JSON.parse(raw) as Partial<XpRecord>
    return {
      totalXp: Math.max(0, Math.floor(Number(parsed.totalXp) || 0)),
      awardedKeys: Array.isArray(parsed.awardedKeys) ? parsed.awardedKeys.map(String) : [],
    }
  } catch {
    return { totalXp: 0, awardedKeys: [] }
  }
}

// 将用户经验记录写入本地缓存，供大厅立即展示进度。
function writeRecord(userId: string, record: XpRecord): void {
  localStorage.setItem(
    `${KEY_PREFIX}${userId}`,
    JSON.stringify({
      totalXp: record.totalXp,
      awardedKeys: record.awardedKeys.slice(-MAX_AWARDED_KEYS),
    }),
  )
}

// 合并服务端经验与本地未同步奖励，避免结算后进度条延迟更新。
export function getSyncedTotalXp(
  userId: string,
  stats: {
    totalGames?: number
    totalWins?: number
    winRate?: number
    maxDamage?: number
  },
): number {
  const record = readRecord(userId)
  const fromStats = computeTotalXp(stats)
  const merged = Math.max(record.totalXp, fromStats)

  if (merged !== record.totalXp) {
    writeRecord(userId, { ...record, totalXp: merged })
  }

  return merged
}

// 按对局唯一键追加本地经验，重复结算时不会重复发放。
export function awardMatchXp(userId: string, matchKey: string, amount: number): number {
  const gain = Math.max(0, Math.floor(Number(amount) || 0))
  if (gain <= 0 || !matchKey) return 0

  const record = readRecord(userId)
  if (record.awardedKeys.includes(matchKey)) return 0

  writeRecord(userId, {
    totalXp: record.totalXp + gain,
    awardedKeys: [...record.awardedKeys, matchKey],
  })

  return gain
}

// 用户退出或切换账号时清除对应的本地经验缓存。
export function clearUserXp(userId: string): void {
  localStorage.removeItem(`${KEY_PREFIX}${userId}`)
}
