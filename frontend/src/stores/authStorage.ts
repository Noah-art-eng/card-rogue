const TOKEN_KEY = 'card-game-token'

// 获取、计算或校验 Token。
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

// 执行 Token 相关处理。
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

// 清理或重置 Token 相关状态。
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
