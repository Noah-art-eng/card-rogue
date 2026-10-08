/**
 * 路由内容的过渡动画容器。
 * 页面路径变化时由这里切换进出场状态，布局组件无需各自维护动画时机。
 */

import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: React.ReactNode
}

// 为路由内容提供统一的进出场动画容器。
export default function PageTransition({ children }: PageTransitionProps) {
  const { pathname } = useLocation()
  const isGameRoute = pathname === '/game' || pathname === '/rogue'
  const enterClass = isGameRoute ? 'cg-page-enter-subtle' : 'cg-page-enter'

  return (
    <div key={pathname} className={enterClass}>
      {children}
    </div>
  )
}
