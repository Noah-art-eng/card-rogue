import { Router } from 'express'

import {
  getMe,
  handleAvatarUploadError,
  uploadAvatar,
} from '../controllers/usersController.js'
import type { AuthRequest } from '../middleware/authMiddleware.js'
import { avatarUpload } from '../middleware/avatarUpload.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/me', authMiddleware, getMe)
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
