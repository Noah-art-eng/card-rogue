/**
 * Express 最后的统一错误出口。
 * 未被路由自行处理的异常会在这里记录，并返回一致的服务器错误响应。
 */

import type { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Unhandled API error:', err)

  if (res.headersSent) {
    return
  }

  res.status(500).json({
    message: 'Internal server error',
  })
}
