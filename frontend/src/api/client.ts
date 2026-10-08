/**
 * 前端 Axios 客户端的统一配置。
 * 每次请求会带上本地 token；收到未认证响应时清除旧身份，避免页面继续使用失效登录状态。
 */

import axios from 'axios'

import { clearToken, getToken } from '../stores/authStorage'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '/api'

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
    }

    return Promise.reject(error)
  },
)

export default apiClient
