import { getAvatarDisplaySrc, getUserInitials, hasCustomAvatar } from '../../lib/avatar'

interface UserAvatarProps {
  username?: string | null
  avatar?: string | null
  className?: string
  imageClassName?: string
  fallbackClassName?: string
  alt?: string
}

export default function UserAvatar({
  username,
  avatar,
  className = '',
  imageClassName = '',
  fallbackClassName = '',
  alt = '',
}: UserAvatarProps) {
  const initials = getUserInitials(username)
  const showImage = hasCustomAvatar(avatar)

  if (showImage) {
    return (
      <img
        src={getAvatarDisplaySrc(avatar)}
        alt={alt || username || 'User avatar'}
        className={`object-cover ${className} ${imageClassName}`.trim()}
        draggable={false}
      />
    )
  }

  return (
    <span
      className={`flex items-center justify-center font-black tabular-nums tracking-tight text-white ${className} ${fallbackClassName}`.trim()}
      aria-hidden={!alt}
    >
      {initials}
    </span>
  )
}
