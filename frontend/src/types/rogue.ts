import type { Buff } from './buff'

export interface EnhancementOption {
  id: string
  label: string
  description: string
  buff: Buff
  color?: string
  element?: string
  icon?: string
}

export interface RogueSnapshot {
  layer?: number
  playerHp?: number
  playerMaxHp?: number
  bossHp?: number
  enhancements?: EnhancementOption[]
  status?: string
  stats?: { totalRounds?: number }
}

export function isResumableRogueRun(snapshot: RogueSnapshot): boolean {
  const layer = snapshot.layer ?? 1
  const buffCount = snapshot.enhancements?.length ?? 0
  const totalRounds = snapshot.stats?.totalRounds ?? 0

  if (layer > 1) return true
  if (buffCount > 0) return true
  if (totalRounds > 0) return true

  if (
    snapshot.playerHp != null &&
    snapshot.playerMaxHp != null &&
    snapshot.playerHp < snapshot.playerMaxHp
  ) {
    return true
  }

  return false
}

export interface RogueSaveRecord {
  snapshot?: RogueSnapshot
}

export interface RogueCheckpoint {
  floor: number
  playerHp: number
  playerMaxHp: number
  bossHp: number
  enhancements?: EnhancementOption[]
}

export interface FloorLostResult {
  action: 'restore' | 'end'
  checkpoint?: RogueCheckpoint
}
