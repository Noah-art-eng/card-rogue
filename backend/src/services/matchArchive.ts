import { Match } from '../models/Match.js'
import { User } from '../models/User.js'
import { BattleResult, type GameContext } from '../types/state.js'
import { toPublicMatch, type PublicMatch } from '../utils/match.js'

export function shouldArchiveMatch(context: GameContext): boolean {
  if (context.matchArchived) {
    return false
  }

  if (context.rogueMode && context.battleResult === BattleResult.WIN) {
    return false
  }

  return context.battleResult === BattleResult.WIN
    || context.battleResult === BattleResult.LOSE
}

export function buildMatchPayload(context: GameContext) {
  return {
    userId: context.userId,
    mode: 'PVE' as const,
    layer: context.layer,
    bossName: context.boss.name,
    isWin: context.battleResult === BattleResult.WIN,
    roundsPlayed: context.round,
    totalDamageDealt: context.totalDamageDealt,
    endedAt: new Date(),
  }
}

async function updateUserStats(
  userId: string,
  isWin: boolean,
  totalDamageDealt: number,
): Promise<void> {
  const inc: Record<string, number> = { 'stats.totalGames': 1 }
  if (isWin) {
    inc['stats.totalWins'] = 1
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    [
      {
        $set: {
          'stats.totalGames': { $add: ['$stats.totalGames', 1] },
          'stats.totalWins': isWin
            ? { $add: ['$stats.totalWins', 1] }
            : '$stats.totalWins',
          'stats.maxDamage': {
            $max: ['$stats.maxDamage', totalDamageDealt],
          },
        },
      },
      {
        $set: {
          'stats.winRate': {
            $cond: [
              { $gt: ['$stats.totalGames', 0] },
              { $divide: ['$stats.totalWins', '$stats.totalGames'] },
              0,
            ],
          },
        },
      },
    ],
    { returnDocument: 'after', updatePipeline: true },
  )

  if (!updated) {
    console.warn(`updateUserStats: user ${userId} not found`)
  }
}

export async function archiveGameIfEnded(context: GameContext): Promise<GameContext> {
  if (!shouldArchiveMatch(context)) {
    return context
  }

  const isWin = context.battleResult === BattleResult.WIN
  await Match.create(buildMatchPayload(context))
  await updateUserStats(context.userId, isWin, context.totalDamageDealt)

  return {
    ...context,
    matchArchived: true,
  }
}

export async function getRecentMatchesForUser(
  userId: string,
  limit = 10,
): Promise<PublicMatch[]> {
  const matches = await Match.find({ userId })
    .sort({ endedAt: -1 })
    .limit(limit)

  return matches.map(toPublicMatch)
}
