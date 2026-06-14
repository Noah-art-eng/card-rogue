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
