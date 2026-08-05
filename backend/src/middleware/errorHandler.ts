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
