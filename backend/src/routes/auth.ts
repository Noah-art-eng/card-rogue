import { Router } from 'express'

import { login, register } from '../controllers/authController.js'
import { googleLogin } from '../controllers/googleAuthController.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/google', googleLogin)

export default router
