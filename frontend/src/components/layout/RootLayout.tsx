import { Outlet, useLocation } from 'react-router-dom'

import PageTransition from '../common/PageTransition'
import Navbar from './Navbar'

// 为全部路由提供导航栏、页面过渡和统一背景结构。
export default function RootLayout() {
  const { pathname } = useLocation()
  const immersiveRoute = pathname === '/game' || pathname === '/rogue'

  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      {!immersiveRoute && <Navbar />}
      <main
        className={
          immersiveRoute
            ? 'min-h-[100dvh]'
            : 'min-h-[100dvh] bg-[#040410] pt-[var(--navbar-height)]'
        }
      >
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}
