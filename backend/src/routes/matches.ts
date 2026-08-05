import { Router } from 'express'

import { getRecentMatches } from '../controllers/matchesController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/recent', authMiddleware, asyncHandler(getRecentMatches))

export default router
