export interface BossDefinition {
  id: string
  name: string
  title: string
  layer: number
  /** Runtime/backend names used before display-layer mapping */
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

export function getBossForLayer(layer: number): BossDefinition | undefined {
  const normalized = Math.max(1, Math.floor(layer))
  return BOSS_BY_LAYER[normalized]
}

export function getBossShortNameForLayer(layer: number): string | undefined {
  return getBossForLayer(layer)?.name
}

function normalizeBossLookup(value: string): string {
  return value.trim().toLowerCase()
}

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

export function resolveBossDisplayName(params: {
  layer?: number
  bossName?: string | null
}): string {
  const mapped = resolveBossFromMatch(params)
  if (mapped) return mapped.name
  const fallback = params.bossName?.trim()
  return fallback || 'Unknown Boss'
}

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
