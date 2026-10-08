/**
 * MongoDB 对局文档到公开 API 数据的转换。
 * 数据库内部字段在这里被整理为前端历史列表所需的稳定结构。
 */

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

// 移除数据库内部字段后返回可安全给客户端展示的对局记录。
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
