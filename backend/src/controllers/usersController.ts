import type { Response } from 'express'
import type { NextFunction } from 'express'
import multer from 'multer'

import type { AuthRequest } from '../middleware/authMiddleware.js'
import { User } from '../models/User.js'
import { deleteLocalAvatarIfManaged } from '../utils/avatarFiles.js'
import { toPublicUser } from '../utils/user.js'

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.auth?.userId

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const user = await User.findById(userId)

  if (!user) {
    res.status(404).json({ message: 'User not found' })
    return
  }

  res.status(200).json({
    user: toPublicUser(user),
  })
}

export async function uploadAvatar(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.auth?.userId

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  if (!req.file) {
    res.status(400).json({ message: 'Avatar file is required' })
    return
  }

  const user = await User.findById(userId)

  if (!user) {
    res.status(404).json({ message: 'User not found' })
    return
  }

  const previousAvatar = user.avatar
  const avatarUrl = `/uploads/avatars/${req.file.filename}`

  user.avatar = avatarUrl
  await user.save()

  deleteLocalAvatarIfManaged(previousAvatar)

  res.status(200).json({
    message: 'Avatar updated',
    user: toPublicUser(user),
  })
}

export function handleAvatarUploadError(
  err: unknown,
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Avatar must be 5MB or smaller' })
      return
    }
    res.status(400).json({ message: err.message })
    return
  }

  if (err instanceof Error) {
    res.status(400).json({ message: err.message })
    return
  }

  next(err)
}
