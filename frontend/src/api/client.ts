import axios from 'axios'

import { clearToken, getToken } from '../stores/authStorage'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '/api'

const apiClient = axios.create({
  baseURL: apiBaseUrl,
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
