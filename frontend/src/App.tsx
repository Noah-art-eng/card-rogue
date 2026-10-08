/**
 * 前端路由总入口。
 * 这里把认证 Provider、公共布局、公开页和受保护的大厅/PvE/肉鸽页面组合成一条路由树。
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import RootLayout from './components/layout/RootLayout'
import ProtectedRoute from './components/ProtectedRoute'
import GamePage from './pages/GamePage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import LeaderboardPage from './pages/LeaderboardPage'
import LobbyPage from './pages/LobbyPage'
import RegisterPage from './pages/RegisterPage'
import RogueGamePage from './pages/RogueGamePage'
import { AuthProvider } from './stores/AuthContext'

// 应用路由入口，统一挂载公共布局和各个页面。
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/lobby"
              element={
                <ProtectedRoute>
                  <LobbyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game"
              element={
                <ProtectedRoute>
                  <GamePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rogue"
              element={
                <ProtectedRoute>
                  <RogueGamePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
