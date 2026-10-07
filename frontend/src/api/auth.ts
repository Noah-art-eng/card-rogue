import apiClient from './client'
import type { User } from '../types/user'

interface LoginResponse {
  message: string
  token: string
  user: User
}

interface RegisterResponse {
  message: string
  user: User
}

// 提交邮箱和密码，换取当前用户的登录令牌。
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', { email, password })
  return response.data
}

// 创建本地账号；注册成功后的登录由页面继续完成。
export async function register(
  username: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/auth/register', {
    username,
    email,
    password,
  })
  return response.data
}

// 把 Google 返回的凭据交给服务端换取本站登录令牌。
export async function loginWithGoogle(credential: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/google', { credential })
  return response.data
}
