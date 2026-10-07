import type { Socket } from 'socket.io'

import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt.js'

export interface AuthenticatedSocketData {
  user: AccessTokenPayload
}

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
