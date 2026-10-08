/**
 * 认证相关 API 路由表。
 * 注册、密码登录和 Google 登录在这里绑定到对应控制器，保持对外路径集中可查。
 */

import { Router } from 'express'

import { login, register } from '../controllers/authController.js'
import { googleLogin } from '../controllers/googleAuthController.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.post('/register', asyncHandler(register))
router.post('/login', asyncHandler(login))
router.post('/google', asyncHandler(googleLogin))

export default router
