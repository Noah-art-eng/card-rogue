import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Request } from 'express'
import multer from 'multer'

import type { AuthRequest } from './authMiddleware.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const AVATAR_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/avatars')

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
  fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    const authReq = req as AuthRequest
    const userId = authReq.auth?.userId ?? 'anonymous'
    const ext = path.extname(file.originalname).toLowerCase() || '.png'
    cb(null, `${userId}-${Date.now()}${ext}`)
  },
})

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed'))
    return
  }
  cb(null, true)
}

export const avatarUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
})
