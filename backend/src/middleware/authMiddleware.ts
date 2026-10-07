import type { NextFunction, Request, Response } from 'express'

import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt.js'

export interface AuthRequest extends Request {
  auth?: AccessTokenPayload
}

// 从请求令牌恢复用户身份，未登录请求不能进入受保护路由。
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
