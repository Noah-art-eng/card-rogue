import type { Response } from 'express'

import type { AuthRequest } from '../middleware/authMiddleware.js'
import { getRecentMatchesForUser } from '../services/matchArchive.js'

// 获取、计算或校验 RecentMatches。
export async function getRecentMatches(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.auth?.userId

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const matches = await getRecentMatchesForUser(userId)

  res.status(200).json({ matches })
}
