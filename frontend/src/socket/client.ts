/**
 * 前端 Socket.IO 客户端创建入口。
 * 每次游戏页面建立连接时都会带上本地 token，让服务端把权威战斗状态发送给对应用户。
 */

import { io, type Socket } from 'socket.io-client'

import { getToken } from '../stores/authStorage'

// 使用认证 token 创建 Socket.IO 连接，让服务端维持权威游戏状态。
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
