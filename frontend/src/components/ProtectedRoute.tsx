import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

import LoadingScreen from './common/LoadingScreen'
import { useAuth } from '../stores/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

// 在渲染受保护页面前检查登录状态，未认证时跳转到登录页。
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { token, user, isLoading, fetchMe } = useAuth()

  useEffect(() => {
    if (token && !user && !isLoading) {
      void fetchMe()
    }
  }, [token, user, isLoading, fetchMe])

  if (!token) {
    return <Navigate to="/login" replace />
  }

  // token 已存在但资料尚未恢复时继续显示加载页，避免静默刷新造成页面闪回登录页。
  if (!user) {
    return <LoadingScreen message="Verifying session…" />
  }

  return children
}
