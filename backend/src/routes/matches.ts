import { Router } from 'express'

import { getRecentMatches } from '../controllers/matchesController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/recent', authMiddleware, getRecentMatches)

export default router
