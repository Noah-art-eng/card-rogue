/**
 * 注册请求的字段校验。
 * 昵称、邮箱和密码会在创建账号前检查长度和格式，避免无效数据进入数据库。
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface RegisterInput {
  username: string
  email: string
  password: string
}

// 在创建账号前检查用户名、邮箱和密码格式。
export function validateRegisterInput(
  body: unknown,
): { valid: true; data: RegisterInput } | { valid: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Request body is required' }
  }

  const { username, email, password } = body as Record<string, unknown>

  if (typeof username !== 'string' || !username.trim()) {
    return { valid: false, message: 'Username is required' }
  }

  const trimmedUsername = username.trim()

  if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
    return { valid: false, message: 'Username must be between 3 and 30 characters' }
  }

  if (typeof email !== 'string' || !email.trim()) {
    return { valid: false, message: 'Email is required' }
  }

  const trimmedEmail = email.trim().toLowerCase()

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { valid: false, message: 'Email format is invalid' }
  }

  if (typeof password !== 'string' || !password) {
    return { valid: false, message: 'Password is required' }
  }

  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' }
  }

  return {
    valid: true,
    data: {
      username: trimmedUsername,
      email: trimmedEmail,
      password,
    },
  }
}
