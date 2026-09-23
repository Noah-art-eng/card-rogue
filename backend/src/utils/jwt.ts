import jwt from 'jsonwebtoken'

export interface AccessTokenPayload {
  userId: string
  username: string
  email: string
}

const JWT_EXPIRES_IN = '7d'

// 执行 AccessToken 相关处理。
export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables')
  }

  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN })
}

// 执行 AccessToken 相关处理。
export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables')
  }

  return jwt.verify(token, secret) as AccessTokenPayload
}
