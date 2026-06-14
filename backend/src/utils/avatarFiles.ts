import fs from 'node:fs'
import path from 'node:path'

import { AVATAR_UPLOAD_DIR } from '../middleware/avatarUpload.js'

export function isManagedLocalAvatar(avatar: string | undefined | null): boolean {
  return Boolean(avatar && avatar.startsWith('/uploads/avatars/'))
}

export function deleteLocalAvatarIfManaged(avatar: string | undefined | null): void {
  if (!isManagedLocalAvatar(avatar)) return

  const filename = path.basename(avatar!)
  const absolutePath = path.join(AVATAR_UPLOAD_DIR, filename)

  if (!absolutePath.startsWith(AVATAR_UPLOAD_DIR)) return

  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath)
    }
  } catch {
    // ignore cleanup failures
  }
}
