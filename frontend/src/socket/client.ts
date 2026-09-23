import { io, type Socket } from 'socket.io-client'

import { getToken } from '../stores/authStorage'

// 创建或初始化 GameSocket 所需的数据。
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
