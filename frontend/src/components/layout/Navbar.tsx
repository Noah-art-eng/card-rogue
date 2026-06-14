import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../stores/AuthContext'

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const dashboardShell = pathname === '/lobby' || pathname === '/leaderboard'
  const hideCenterNav = isAuthenticated && dashboardShell
  const showHomeLink = !isAuthenticated || !dashboardShell

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  const linkBase =
    'text-slate-300 hover:text-white text-base min-[1512px]:text-lg font-medium transition-colors duration-200'

  return (
    <>
      <style>{`
        :root {
          --navbar-height: 3.5rem;
        }
        @media (min-width: 768px) {
          :root {
            --navbar-height: 4rem;
          }
        }
        @media (min-width: 1512px) {
          :root {
            --navbar-height: 5rem;
          }
        }
      `}</style>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-8 min-[1512px]:px-16 h-14 md:h-16 min-[1512px]:h-20 text-slate-200"
        style={{
          background: 'linear-gradient(180deg, #0c071c 0%, #06051a 42%, #040410 100%)',
        }}
      >
        <Link to="/" className="flex shrink-0 items-center gap-2 md:gap-3">
          <img
            src="/logo/logo-icon-transparent.png"
            alt=""
            className="h-8 w-8 shrink-0 object-contain min-[1512px]:h-9 min-[1512px]:w-9"
            draggable={false}
          />
          <span className="text-base font-bold tracking-wide text-white md:text-lg min-[1512px]:text-xl">
            Card Rogue
          </span>
        </Link>

        {!hideCenterNav && (
          <div className="hidden items-center gap-8 min-[1512px]:gap-12 md:flex">
            {showHomeLink && (
              <Link to="/" className={linkBase}>
                Home
              </Link>
            )}
            <Link to="/lobby" className={linkBase}>
              Lobby
            </Link>
            <Link to="/leaderboard" className={linkBase}>
              Leaderboard
            </Link>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2 sm:gap-3 min-[1512px]:gap-4">
          {!isAuthenticated && (
            <>
              <Link
                to="/login"
                className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-white/45 hover:bg-violet-500/[0.08] hover:text-white min-[1512px]:px-7 min-[1512px]:py-3 min-[1512px]:text-lg"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full px-4 py-2 text-sm font-bold text-white transition-all duration-200 hover:brightness-110 min-[1512px]:px-7 min-[1512px]:py-3 min-[1512px]:text-lg"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #dc2626)',
                  boxShadow: '0 0 16px rgba(249,115,22,0.28)',
                }}
              >
                Register
              </Link>
            </>
          )}

          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/25 px-3 py-3 text-xs font-semibold text-slate-200 transition-all duration-200 hover:border-white/45 hover:bg-violet-500/[0.08] hover:text-white sm:px-4 sm:text-sm min-[1512px]:px-6 min-[1512px]:py-2 min-[1512px]:text-lg"
            >
              Sign out
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
