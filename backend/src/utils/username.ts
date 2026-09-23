import { User } from '../models/User.js'

// 获取、计算或校验 UsernameBase。
function sanitizeUsernameBase(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 16)

  if (cleaned.length >= 3) return cleaned

  const fallback = raw
    .trim()
    .split('@')[0]
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 16)

  return fallback.length >= 3 ? fallback : 'player'
}

// 创建或初始化 UniqueUsername 所需的数据。
export async function generateUniqueUsername(name: string, email: string): Promise<string> {
  const base = sanitizeUsernameBase(name || email.split('@')[0] || 'player')
  let candidate = base
  let suffix = 0

  while (await User.findOne({ username: candidate })) {
    suffix += 1
    candidate = `${base.slice(0, Math.max(3, 16 - String(suffix).length))}${suffix}`
  }

  return candidate
}
