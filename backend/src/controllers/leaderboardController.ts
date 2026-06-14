import type { Request, Response, NextFunction } from 'express'

import { User } from '../models/User.js'

const MIN_RANKED_GAMES = 1

interface LeaderboardQuery {
  sort?: string
  page?: string
  limit?: string
}

export async function getLeaderboard(
  req: Request<object, object, object, LeaderboardQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let { sort = 'winRate', page = '1', limit = '20' } = req.query

    sort = String(sort).trim().toLowerCase()

    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1)
    const skip = (pageNum - 1) * limitNum

    const matchStage = {
      'stats.totalGames': { $gte: MIN_RANKED_GAMES },
    }

    const total = await User.countDocuments(matchStage)

    let sortStage: Record<string, 1 | -1>

    if (sort === 'winrate') {
      sortStage = {
        'stats.totalGames': -1,
        winRate: -1,
        'stats.totalWins': -1,
        createdAt: 1,
      }
    } else if (sort === 'totalwins') {
      sortStage = {
        'stats.totalGames': -1,
        'stats.totalWins': -1,
        winRate: -1,
        createdAt: 1,
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid sort parameter',
        data: null,
      })
      return
    }

    const leaderboard = await User.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          winRate: {
            $cond: [
              { $gt: ['$stats.totalGames', 0] },
              { $divide: ['$stats.totalWins', '$stats.totalGames'] },
              0,
            ],
          },
        },
      },
      { $sort: sortStage },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: 1,
          avatar: { $ifNull: ['$avatar', 'default'] },
          winRate: 1,
          totalWins: '$stats.totalWins',
          totalGames: '$stats.totalGames',
        },
      },
      { $skip: skip },
      { $limit: limitNum },
    ])

    const rankings = leaderboard.map((item, index) => ({
      rank: skip + index + 1,
      ...item,
    }))

    res.status(200).json({
      success: true,
      message: 'OK',
      data: {
        rankings,
        total,
        page: pageNum,
      },
    })
  } catch (err) {
    next(err)
  }
}
