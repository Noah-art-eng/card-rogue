import type { Socket } from 'socket.io'

import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt.js'

export interface AuthenticatedSocketData {
  user: AccessTokenPayload
}

// 在 Socket 建连时验证令牌并把用户身份写入连接数据。
export function socketAuthMiddleware(
  socket: Socket,
  next: (error?: Error) => void,
): void {
  const token = socket.handshake.auth?.token

  if (!token || typeof token !== 'string') {
    next(new Error('Unauthorized'))
    return
  }

  try {
    const user = verifyAccessToken(token)
    socket.data.user = user
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
}
