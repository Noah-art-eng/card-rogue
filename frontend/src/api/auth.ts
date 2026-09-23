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

// 负责 login 的业务处理。
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', { email, password })
  return response.data
}

// 执行  相关处理。
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

// 负责 loginWithGoogle 的业务处理。
export async function loginWithGoogle(credential: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/google', { credential })
  return response.data
}
