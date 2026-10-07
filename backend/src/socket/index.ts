import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'

import { getFrontendCorsConfig } from '../config/corsOrigin.js'
import { socketAuthMiddleware } from './auth.js'
import { registerPveHandlers } from './pveHandlers.js'

// 创建 Socket.IO 服务并注册认证和 PvE 事件。
export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: getFrontendCorsConfig(),
  })

  io.use(socketAuthMiddleware)

  io.on('connection', (socket) => {
    registerPveHandlers(io, socket)
  })

  return io
}
