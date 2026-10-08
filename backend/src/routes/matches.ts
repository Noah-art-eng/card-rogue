/**
 * 对局历史 API 路由表。
 * 该路由先验证用户身份，再返回只属于当前用户的最近 PvE 战绩。
 */

import { Router } from 'express'

import { getRecentMatches } from '../controllers/matchesController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/recent', authMiddleware, asyncHandler(getRecentMatches))

export default router
