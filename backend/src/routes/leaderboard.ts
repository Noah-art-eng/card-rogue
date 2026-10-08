/**
 * 排行榜 API 路由表。
 * 公开请求在这里进入排行榜控制器，并通过异步错误包装交给全局错误处理。
 */

import { Router } from 'express'

import { getLeaderboard } from '../controllers/leaderboardController.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/', asyncHandler(getLeaderboard))

export default router
