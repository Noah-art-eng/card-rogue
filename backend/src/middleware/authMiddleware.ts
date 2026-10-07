import type { NextFunction, Request, Response } from 'express'

import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt.js'

export interface AuthRequest extends Request {
  auth?: AccessTokenPayload
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const token = authHeader.slice(7)

  try {
    req.auth = verifyAccessToken(token)
    next()
  } catch {
    res.status(401).json({ message: 'Unauthorized' })
  }
}
