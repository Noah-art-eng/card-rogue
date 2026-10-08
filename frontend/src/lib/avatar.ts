/**
 * 前端头像地址、首字母和边框资源的统一处理。
 * 页面通过这些方法兼容相对路径、完整 URL 和无头像用户，避免每处重复回退规则。
 */

const DEFAULT_AVATAR = '/images/player.png'

export const GAME_AVATAR_FRAME_SRC = '/images/avatar-frame.png'
export const GAME_AVATAR_FRAME_SHIELD_SRC = '/images/avatar-frame-shield.png'

// 从昵称提取头像回退时使用的首字母。
export function getUserInitials(username: string | undefined | null): string {
  const value = username?.trim()
  if (!value) return '?'

  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2)
  }
  return value.slice(0, 2).toUpperCase()
}

// 把服务端头像字段解析为可直接使用的图片地址。
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

// 返回头像图片地址；没有有效头像时使用默认资源。
export function getAvatarDisplaySrc(avatar: string | undefined | null): string {
  return resolveAvatarUrl(avatar) ?? DEFAULT_AVATAR
}

// 判断用户是否设置了可展示的自定义头像。
export function hasCustomAvatar(avatar: string | undefined | null): boolean {
  return Boolean(resolveAvatarUrl(avatar))
}
