/**
 * 最近对局查询的控制器。
 * 认证用户只能读取自己的对局历史，数据由归档服务整理后以公开字段返回。
 */

import type { Response } from 'express'

import type { AuthRequest } from '../middleware/authMiddleware.js'
import { getRecentMatchesForUser } from '../services/matchArchive.js'

// 读取当前登录用户最近的对局历史。
export async function getRecentMatches(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.auth?.userId

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const matches = await getRecentMatchesForUser(userId)

  res.status(200).json({ matches })
}
