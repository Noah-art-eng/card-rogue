const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface LoginInput {
  email: string
  password: string
}

export function validateLoginInput(
  body: unknown,
): { valid: true; data: LoginInput } | { valid: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Request body is required' }
  }

  const { email, password } = body as Record<string, unknown>

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

  return {
    valid: true,
    data: {
      email: trimmedEmail,
      password,
    },
  }
}
