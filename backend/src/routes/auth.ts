import { Router } from 'express'

import { login, register } from '../controllers/authController.js'
import { googleLogin } from '../controllers/googleAuthController.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.post('/register', asyncHandler(register))
router.post('/login', asyncHandler(login))
router.post('/google', asyncHandler(googleLogin))

export default router
