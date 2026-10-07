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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getToken()))
  const userRef = useRef<User | null>(null)

  userRef.current = user

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    setUser(null)
    setIsLoading(false)
  }, [])

  const setAuth = useCallback((nextToken: string, nextUser: User) => {
    setToken(nextToken)
    setTokenState(nextToken)
    setUser(nextUser)
    setIsLoading(false)
  }, [])

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser)
  }, [])

  const fetchMe = useCallback(async () => {
    const storedToken = getToken()

    if (!storedToken) {
      setUser(null)
      setIsLoading(false)
      return
    }

    setTokenState(storedToken)

    // Only block the app on the initial bootstrap when no user is cached yet.
    // Background refreshes must not flip isLoading back to true.
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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
