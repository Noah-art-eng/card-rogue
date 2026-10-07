import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { getMe } from '../api/users'
import type { User } from '../types/user'
import { clearToken, getToken, setToken } from './authStorage'

interface AuthContextValue {
  token: string | null
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  updateUser: (user: User) => void
  logout: () => void
  fetchMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// 在应用内统一保存登录令牌、用户资料和首次身份恢复状态。
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getToken()))
  const userRef = useRef<User | null>(null)

  userRef.current = user

  // 清除 token 和用户资料，使全站立即回到未登录状态。
  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    setUser(null)
    setIsLoading(false)
  }, [])

  // 保存新 token 与用户资料，建立登录成功后的全局认证状态。
  const setAuth = useCallback((nextToken: string, nextUser: User) => {
    setToken(nextToken)
    setTokenState(nextToken)
    setUser(nextUser)
    setIsLoading(false)
  }, [])

  // 用服务端返回的新用户资料覆盖认证上下文，供页面立即刷新头像和统计。
  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser)
  }, [])

  // 验证本地 token 并重新拉取用户资料；失效时主动退出登录。
  const fetchMe = useCallback(async () => {
    const storedToken = getToken()

    if (!storedToken) {
      setUser(null)
      setIsLoading(false)
      return
    }

    setTokenState(storedToken)

    // 只有首次恢复身份时阻塞页面；后台刷新不能让已登录页面重新进入加载态。
    const isBootstrap = userRef.current === null
    if (isBootstrap) {
      setIsLoading(true)
    }

    try {
      const response = await getMe()
      setUser(response.user)
    } catch {
      logout()
    } finally {
      if (isBootstrap) {
        setIsLoading(false)
      }
    }
  }, [logout])

  useEffect(() => {
    if (getToken()) {
      void fetchMe()
    }
  }, [fetchMe])

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      isAuthenticated: Boolean(token && user),
      setAuth,
      updateUser,
      logout,
      fetchMe,
    }),
    [token, user, isLoading, setAuth, updateUser, logout, fetchMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// 读取认证上下文；脱离 AuthProvider 使用时立即报错。
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
