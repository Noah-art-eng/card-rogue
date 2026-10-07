const TOKEN_KEY = 'card-game-token'

// 读取本地保存的认证 token。
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

// 保存认证 token，供 API 和 Socket 连接附带身份。
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

// 移除本地 token，阻止后续请求继续携带旧身份。
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
