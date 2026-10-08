/**
 * 登录 JWT 的签发与验证工具。
 * 认证控制器生成只含用户 ID 的短期 token，HTTP 与 Socket 中间件再用同一密钥验证它。
 */

import jwt from 'jsonwebtoken'

export interface AccessTokenPayload {
  userId: string
  username: string
  email: string
}

const JWT_EXPIRES_IN = '7d'

// 为登录成功的用户签发服务端认可的访问令牌。
export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables')
  }

  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN })
}

// 验证访问令牌并还原路由和 Socket 共用的用户身份。
export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables')
  }

  return jwt.verify(token, secret) as AccessTokenPayload
}
