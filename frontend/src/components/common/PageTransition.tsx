import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: React.ReactNode
}

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
