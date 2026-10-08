/**
 * 普通页面的共享外壳。
 * 导航栏和页面过渡在这里统一包裹；沉浸式战斗路由会绕开这层布局。
 */

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
