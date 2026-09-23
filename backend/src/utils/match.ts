import type { IMatch } from '../models/Match.js'

export interface PublicMatch {
  id: string
  mode: IMatch['mode']
  layer: number
  bossName: string
  isWin: boolean
  roundsPlayed: number
  totalDamageDealt: number
  endedAt: string
}

// 负责 toPublicMatch 的业务处理。
export function toPublicMatch(match: IMatch): PublicMatch {
  return {
    id: match._id.toString(),
    mode: match.mode,
    layer: match.layer,
    bossName: match.bossName,
    isWin: match.isWin,
    roundsPlayed: match.roundsPlayed,
    totalDamageDealt: match.totalDamageDealt,
    endedAt: match.endedAt.toISOString(),
  }
}
