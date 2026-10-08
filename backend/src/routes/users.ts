/**
 * 当前用户资料和头像 API 路由表。
 * 受保护请求在这里进入用户控制器，头像上传会先经过文件类型和大小校验。
 */

import { Router } from 'express'

import {
  getMe,
  handleAvatarUploadError,
  uploadAvatar,
} from '../controllers/usersController.js'
import type { AuthRequest } from '../middleware/authMiddleware.js'
import { avatarUpload } from '../middleware/avatarUpload.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/me', authMiddleware, asyncHandler(getMe))
router.patch('/me/avatar', authMiddleware, (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      handleAvatarUploadError(err, req as AuthRequest, res, next)
      return
    }
    void uploadAvatar(req as AuthRequest, res).catch(next)
  })
})

export default router
