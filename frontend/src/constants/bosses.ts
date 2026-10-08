/**
 * 前端用于展示 Boss 的固定资料表。
 * 历史记录和大厅会从层数或旧名称解析 Boss 的显示名；真正战斗数值仍由后端决定。
 */

export interface BossDefinition {
  id: string
  name: string
  title: string
  layer: number
  /** 展示层映射前，旧对局记录或服务端可能使用的 Boss 名称。 */
  legacyNames?: readonly string[]
}

export const BOSSES = {
  FLOOR_1: {
    id: 'malakar',
    name: 'Malakar',
    title: 'The Fallen King',
    layer: 1,
    legacyNames: ['Tide Warden', 'boss-layer-1'],
  },
} as const satisfies Record<string, BossDefinition>

export type BossKey = keyof typeof BOSSES

const ALL_BOSSES: BossDefinition[] = Object.values(BOSSES)

export const BOSS_BY_LAYER: Record<number, BossDefinition> = Object.fromEntries(
  ALL_BOSSES.map((boss) => [boss.layer, boss]),
)

// 按层数查找前端展示用的固定 Boss 定义。
export function getBossForLayer(layer: number): BossDefinition | undefined {
  const normalized = Math.max(1, Math.floor(layer))
  return BOSS_BY_LAYER[normalized]
}

// 返回 Boss 的短名称，供紧凑界面展示。
export function getBossShortNameForLayer(layer: number): string | undefined {
  return getBossForLayer(layer)?.name
}

// 规范化 Boss 名称以兼容不同来源的大小写和空格差异。
function normalizeBossLookup(value: string): string {
  return value.trim().toLowerCase()
}

// 从对局记录中推断对应 Boss，兼容旧记录缺少完整字段的情况。
export function resolveBossFromMatch(match: {
  layer?: number
  bossName?: string | null
}): BossDefinition | undefined {
  if (typeof match.layer === 'number' && match.layer > 0) {
    const byLayer = getBossForLayer(match.layer)
    if (byLayer) return byLayer
  }

  const stored = match.bossName?.trim()
  if (!stored) return undefined

  const normalized = normalizeBossLookup(stored)
  return ALL_BOSSES.find(
    (boss) =>
      normalizeBossLookup(boss.id) === normalized ||
      normalizeBossLookup(boss.name) === normalized ||
      boss.legacyNames?.some((legacyName) => normalizeBossLookup(legacyName) === normalized),
  )
}

// 优先使用对局记录名称，缺失时按层数回退到预置 Boss 名称。
export function resolveBossDisplayName(params: {
  layer?: number
  bossName?: string | null
}): string {
  const mapped = resolveBossFromMatch(params)
  if (mapped) return mapped.name
  const fallback = params.bossName?.trim()
  return fallback || 'Unknown Boss'
}

// 将历史对局的对手信息整理为列表可读的标签。
export function formatMatchOpponentLabel(match: {
  mode?: string
  layer?: number
  bossName?: string | null
}): string {
  if (match.mode && match.mode !== 'PVE') {
    return 'vs Opponent'
  }

  return `vs ${resolveBossDisplayName(match)}`
}
