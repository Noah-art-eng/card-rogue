import { io, type Socket } from 'socket.io-client'

import { getToken } from '../stores/authStorage'

export function createGameSocket(): Socket {
  const socketOptions = {
    auth: {
      token: getToken(),
    },
    autoConnect: false,
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL?.trim()
  if (socketUrl) {
    return io(socketUrl, socketOptions)
  }

  return io(socketOptions)
}
