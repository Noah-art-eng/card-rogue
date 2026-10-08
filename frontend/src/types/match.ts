/**
 * 前端最近对局列表的数据结构。
 * 大厅读取历史接口后用这些字段展示 Boss、层数、胜负、伤害和结束时间。
 */

export interface MatchSummary {
  id: string
  mode: 'PVE'
  layer: number
  bossName: string
  isWin: boolean
  roundsPlayed: number
  totalDamageDealt: number
  endedAt: string
}
