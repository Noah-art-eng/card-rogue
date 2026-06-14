const DEFAULT_AVATAR = '/images/player.png'

export const GAME_AVATAR_FRAME_SRC = '/images/avatar-frame.png'
export const GAME_AVATAR_FRAME_SHIELD_SRC = '/images/avatar-frame-shield.png'

export function getUserInitials(username: string | undefined | null): string {
  const value = username?.trim()
  if (!value) return '?'

  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2)
  }
  return value.slice(0, 2).toUpperCase()
}

export function resolveAvatarUrl(avatar: string | undefined | null): string | null {
  if (!avatar || avatar === 'default') return null
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar

  const path = avatar.startsWith('/') ? avatar : `/${avatar.replace(/^\/+/, '')}`

  if (path.startsWith('/uploads/')) {
    const apiOrigin = import.meta.env.VITE_API_ORIGIN?.trim()
    if (apiOrigin) {
      return `${apiOrigin.replace(/\/+$/, '')}${path}`
    }
  }

  return path
}

export function getAvatarDisplaySrc(avatar: string | undefined | null): string {
  return resolveAvatarUrl(avatar) ?? DEFAULT_AVATAR
}

export function hasCustomAvatar(avatar: string | undefined | null): boolean {
  return Boolean(resolveAvatarUrl(avatar))
}
