import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

import LoadingScreen from './common/LoadingScreen'
import { useAuth } from '../stores/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

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

  // Once we have a user, keep the page mounted even during silent background refresh.
  if (!user) {
    return <LoadingScreen message="Verifying session…" />
  }

  return children
}
