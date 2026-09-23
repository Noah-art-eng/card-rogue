import { Match } from '../models/Match.js'
import { User } from '../models/User.js'
import { BattleResult, type GameContext } from '../types/state.js'
import { toPublicMatch, type PublicMatch } from '../utils/match.js'

// 判断对局是否已结束且尚未写入历史记录。
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

// 从已结束游戏上下文构造 MongoDB 对局历史文档。
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

// 原子更新用户的总局数、胜场、胜率与最高伤害统计。
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

// 在对局结束时保存战绩并返回带归档标记的上下文。
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

// 从 MongoDB 查询用户最近的对局历史。
export async function getRecentMatchesForUser(
  userId: string,
  limit = 10,
): Promise<PublicMatch[]> {
  const matches = await Match.find({ userId })
    .sort({ endedAt: -1 })
    .limit(limit)

  return matches.map(toPublicMatch)
}
