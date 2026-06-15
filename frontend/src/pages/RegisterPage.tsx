import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { login, register } from '../api/auth'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import LoadingScreen from '../components/common/LoadingScreen'
import { useAuth } from '../stores/AuthContext'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Inline SVG glyphs for input leading cells — stays file-local only */
function IconUserMini() {
  return (
    <svg className="h-[1.125rem] w-[1.125rem] text-violet-300/90 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12c2.485 0 4.5-2.015 4.5-4.5S14.485 3 12 3 7.5 5.015 7.5 7.5 9.515 12 12 12Z"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M4.5 20.25v-.75c0-2.9 3.582-5.25 8-5.25 4.418 0 8 2.35 8 5.25v.75"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMailMini() {
  return (
    <svg className="h-[1.125rem] w-[1.125rem] text-violet-300/90 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5h16v11H4v-11Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path d="M4 8 12 14l8-6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function IconLockMini() {
  return (
    <svg className="h-[1.125rem] w-[1.125rem] text-violet-300/90 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.25 11.25v-2a3.75 3.75 0 017.5 0v2"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <rect x="6" y="11.25" width="12" height="9.75" rx="1.75" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="12" cy="15.5" r="1" fill="currentColor" />
    </svg>
  );
}

function validate(username: string, email: string, password: string): string | null {
  const trimmedUsername = username.trim()
  if (!trimmedUsername) return 'Username is required.'
  if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
    return 'Username must be 3–20 characters.'
  }
  if (!email.trim()) return 'Email is required.'
  if (!EMAIL_REGEX.test(email)) return 'Enter a valid email address.'
  if (!password) return 'Password is required.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  return null
}

function getRegisterErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Registration failed. Please try again.'
}

const BENEFITS = [
  {
    element: 'nature',
    icon: '/images/icon-nature.png',
    alt: '',
    title: 'Build Your Strength',
    desc: 'Collect powerful cards and strengthen your deck.',
  },
  {
    element: 'fire',
    icon: '/images/icon-fire.png',
    alt: '',
    title: 'Compete & Rise',
    desc: 'Challenge players worldwide and climb the leaderboard.',
  },
  {
    element: 'water',
    icon: '/images/icon-water.png',
    alt: '',
    title: 'Become a Legend',
    desc: 'Prove your skill and become the ultimate Card Rogue.',
  },
];

export default function RegisterPage() {
  const { isAuthenticated, setAuth } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/lobby" replace />
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const validationError = validate(username, email, password)
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setLoading(true)

    const trimmedEmail = email.trim()
    const trimmedUsername = username.trim()

    try {
      await register(trimmedUsername, trimmedEmail, password)
      const loginResponse = await login(trimmedEmail, password)
      setAuth(loginResponse.token, loginResponse.user)
      navigate('/lobby', { replace: true })
    } catch (err) {
      setError(getRegisterErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const inputShell =
    'flex min-h-0 w-full items-stretch overflow-hidden rounded-xl border border-violet-500/22 bg-black/48 shadow-inner shadow-black/30 backdrop-blur-md transition focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/45 focus-within:shadow-[0_0_16px_rgba(139,92,246,0.18)]';
  const inputField =
    'cg-input min-w-0 flex-1 border-0 bg-transparent px-3.5 py-3 text-[0.95rem] text-white placeholder:text-slate-500 disabled:opacity-55 sm:px-4 sm:py-3 lg:max-xl:px-3 lg:max-xl:py-2.5 lg:max-xl:text-[0.88rem] xl:min-h-[2.5rem] xl:px-[0.625rem] xl:py-2 xl:text-[0.8125rem] xl:leading-snug xl:placeholder:text-[0.76rem] min-[1440px]:min-h-[3rem] min-[1440px]:px-[0.9375rem] min-[1440px]:py-3 min-[1440px]:text-[0.95rem] min-[1440px]:leading-relaxed min-[1440px]:placeholder:text-[0.9rem]';

  return (
    <div className="register-page-root cg-page relative isolate min-h-[calc(100dvh_-_var(--navbar-height))] w-full overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#060312] text-slate-200">
      {loading ? <LoadingScreen message="Creating your account…" /> : null}
      <style>{`
        .register-submit-btn {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          transform-origin: center center;
          animation: registerSubmitBreathe 3.2s ease-in-out infinite;
        }
        @keyframes registerSubmitBreathe {
          0%, 100% {
            transform: scale(1);
            box-shadow:
              0 0 0 1px rgba(249, 115, 22, 0.28),
              inset 0 1px 0 rgba(255, 255, 255, 0.16),
              0 0 18px rgba(168, 85, 247, 0.45),
              0 0 36px rgba(249, 115, 22, 0.22);
          }
          50% {
            transform: scale(1.035);
            box-shadow:
              0 0 0 1px rgba(249, 115, 22, 0.38),
              inset 0 1px 0 rgba(255, 255, 255, 0.22),
              0 0 34px rgba(168, 85, 247, 0.85),
              0 0 76px rgba(249, 115, 22, 0.48);
          }
        }
        .register-submit-btn::before {
          content: '';
          position: absolute;
          top: -35%;
          left: -65%;
          width: 52%;
          height: 170%;
          z-index: 0;
          pointer-events: none;
          border-radius: inherit;
          background: linear-gradient(
            105deg,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 38%,
            rgba(237, 233, 254, 0.18) 50%,
            rgba(216, 180, 254, 0.1) 62%,
            transparent 78%
          );
          filter: blur(1px);
          mix-blend-mode: soft-light;
          opacity: 0;
          animation: registerSubmitShimmer 4.25s ease-in-out infinite;
        }
        .register-submit-btn:disabled::before {
          animation: none !important;
          opacity: 0 !important;
        }
        .register-submit-btn:disabled {
          animation: none !important;
          transform: scale(1) !important;
          box-shadow:
            0 0 0 1px rgba(249, 115, 22, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 0 12px rgba(124, 58, 237, 0.22),
            0 0 20px rgba(249, 115, 22, 0.12) !important;
        }
        @keyframes registerSubmitShimmer {
          0% {
            transform: translateX(-5%) skewX(-16deg);
            opacity: 0;
          }
          12% {
            opacity: 0.75;
          }
          52% {
            transform: translateX(240%) skewX(-16deg);
            opacity: 0.55;
          }
          82%,
          100% {
            transform: translateX(240%);
            opacity: 0;
          }
        }
        /* Single stronger pulse — nature / fire / water via --icon-glow only */
        @keyframes elementalIconBreathe {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1.05) drop-shadow(0 0 12px var(--icon-glow));
          }
          50% {
            transform: scale(1.16);
            filter: brightness(1.45) drop-shadow(0 0 34px var(--icon-glow));
          }
        }
        .register-benefit-icon-slot {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 0;
          background: none;
          border: none;
          box-shadow: none;
          backdrop-filter: none;
          outline: none;
        }
        .register-benefit-icon-img {
          display: block;
          width: 72px;
          height: 72px;
          object-fit: contain;
          transform-origin: center center;
          animation: elementalIconBreathe 3.1s ease-in-out infinite;
        }
        @media (min-width: 1280px) {
          .register-benefit-icon-img {
            width: 96px;
            height: 96px;
          }
        }
        .register-benefit-icon-img--nature {
          --icon-glow: rgba(52, 211, 153, 0.95);
        }
        .register-benefit-icon-img--fire {
          --icon-glow: rgba(251, 113, 60, 0.98);
        }
        .register-benefit-icon-img--water {
          --icon-glow: rgba(56, 189, 248, 0.95);
        }
        @media (prefers-reduced-motion: reduce) {
          .register-submit-btn:not(:disabled) {
            animation: none !important;
            transform: none !important;
            box-shadow:
              0 0 0 1px rgba(249, 115, 22, 0.28),
              inset 0 1px 0 rgba(255, 255, 255, 0.15),
              0 0 22px rgba(168, 85, 247, 0.48),
              0 0 42px rgba(249, 115, 22, 0.24) !important;
          }
          .register-submit-btn:not(:disabled)::before {
            animation: none !important;
            opacity: 0 !important;
          }
          .register-benefit-icon-img {
            animation: none !important;
            transform: none !important;
            filter: brightness(1.1) drop-shadow(0 0 20px var(--icon-glow)) !important;
          }
        }
        /* 1024–1279 — narrower left scrim so center crystal shows between form and benefits */
        @media (min-width: 1024px) and (max-width: 1279px) {
          .register-hero-scrim {
            background: linear-gradient(
              105deg,
              rgba(6, 3, 18, 0.94) 0%,
              rgba(6, 3, 18, 0.72) min(26%, 300px),
              rgba(12, 10, 48, 0.18) 44%,
              transparent 80%
            ) !important;
          }
          .register-crystal-glow {
            opacity: 0 !important;
          }
          .register-crystal-stage {
            width: auto !important;
            height: auto !important;
            max-height: min(48dvh, 360px) !important;
            max-width: min(210px, 22vw) !important;
            overflow: visible !important;
            background: transparent !important;
          }
          .register-crystal-video {
            width: auto !important;
            height: auto !important;
            max-height: min(48dvh, 360px) !important;
            max-width: min(210px, 22vw) !important;
            object-fit: contain !important;
            mix-blend-mode: normal !important;
            opacity: 0.94 !important;
            filter: drop-shadow(0 0 28px rgba(168, 85, 247, 0.28));
            -webkit-mask-image: radial-gradient(
              ellipse at center,
              black 0%,
              black 28%,
              rgba(0, 0, 0, 0.75) 42%,
              rgba(0, 0, 0, 0.35) 58%,
              transparent 82%
            ) !important;
            mask-image: radial-gradient(
              ellipse at center,
              black 0%,
              black 28%,
              rgba(0, 0, 0, 0.75) 42%,
              rgba(0, 0, 0, 0.35) 58%,
              transparent 82%
            ) !important;
          }
        }
      `}</style>
      {/* Hero background — full area below navbar (cover, bias right); not a boxed image */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/register/register-backgroud.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* Readability scrim — strong on the left where the form sits */}
        <div
          className="register-hero-scrim absolute inset-0"
          aria-hidden
          style={{
            background:
              'linear-gradient(105deg, rgba(6,3,18,0.94) 0%, rgba(6,3,18,0.78) min(42%,520px), rgba(12,10,48,0.35) 58%, transparent 92%)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,transparent_35%,rgba(2,4,14,0.55)_92%)]" aria-hidden />
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 72% 45%, rgba(124,58,237,0.18) 0%, transparent 60%)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/55" aria-hidden />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[min(98vw,1360px)] flex-col px-4 py-8 sm:px-6 sm:py-10 lg:grid lg:min-h-[calc(100dvh_-_var(--navbar-height))] lg:grid-cols-[minmax(0,0.68fr)_minmax(150px,200px)_minmax(200px,260px)] lg:items-center lg:gap-x-4 lg:px-5 lg:py-7 lg:max-xl:max-w-[min(900px,92vw)] lg:max-xl:grid-cols-[minmax(0,264px)_minmax(130px,1fr)_228px] lg:max-xl:gap-x-4 lg:max-xl:px-8 lg:max-xl:py-7 xl:max-w-[min(98vw,1360px)] xl:grid-cols-[1.02fr_minmax(min(292px,28vw),1.08fr)_0.96fr] xl:gap-x-[clamp(0.5rem,1.35vw,1.25rem)] xl:pl-[clamp(3.35rem,6vw,5.25rem)] xl:pr-[clamp(1rem,2vw,1.625rem)] xl:py-[clamp(1.5rem,2.8dvh,2.25rem)] min-[1440px]:grid-cols-[1.03fr_minmax(min(312px,27vw),1.06fr)_0.97fr] min-[1440px]:gap-x-[clamp(0.625rem,1.55vw,1.65rem)] min-[1440px]:pl-14 min-[1440px]:pr-8 min-[1440px]:py-9">
        {/* Left — form */}
        <section className="order-1 lg:min-w-0 lg:justify-self-start lg:self-center lg:max-xl:pl-1 xl:order-1">
          <div className="mx-auto w-full max-w-[min(440px,100%)] lg:mx-0 lg:max-w-[min(300px,100%)] xl:max-w-[min(418px,100%)] min-[1440px]:max-w-[min(452px,100%)]">
            <p className="cg-label text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-violet-200/95 sm:text-[0.74rem] lg:max-xl:text-[0.66rem] lg:max-xl:tracking-[0.26em] xl:text-[0.685rem] xl:tracking-[0.28em]">
              CREATE YOUR ACCOUNT
            </p>
            <h1 className="cg-title mt-2 font-serif text-[1.9rem] font-bold leading-snug tracking-tight text-white sm:text-4xl lg:max-xl:mt-1 lg:max-xl:text-[1.5rem] xl:mt-1.5 xl:text-[1.75rem] xl:leading-tight min-[1440px]:mt-2 min-[1440px]:text-[2.125rem]">
              Begin Your Adventure
            </h1>
            <p className="cg-subtitle mt-2 max-w-[28rem] text-[0.95rem] leading-relaxed text-slate-300 sm:mt-3.5 sm:text-[1rem] lg:max-xl:mt-1 lg:max-xl:text-[0.84rem] lg:max-xl:leading-snug xl:text-[0.92rem] xl:leading-snug min-[1440px]:mt-3 min-[1440px]:text-[0.95rem] min-[1440px]:leading-snug">
              Create your account and step into the arena.
              <br />
              Your legend starts here.
            </p>

            <div className="relative my-6 flex items-center lg:max-xl:my-3 xl:my-5 min-[1440px]:my-6" aria-hidden>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/45 to-violet-400/25" />
              <div className="mx-3 h-2.5 w-2.5 rotate-45 border border-violet-400/75 bg-violet-500/20 shadow-[0_0_10px_rgba(167,139,250,0.5)]" />
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-violet-500/45 to-violet-400/25" />
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[1.1rem] sm:gap-5 lg:max-xl:gap-3 xl:gap-3.5 min-[1440px]:gap-[0.98rem]">
              <div className="flex flex-col gap-2 lg:max-xl:gap-1.5 xl:gap-1">
                <label
                  htmlFor="username"
                  className="text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-violet-200/95 sm:text-[0.72rem] lg:max-xl:text-[0.66rem] xl:text-[0.7rem] xl:tracking-[0.24em]"
                >
                  Username
                </label>
                <div className={inputShell}>
                  <div className="flex h-[3rem] w-[3rem] shrink-0 items-center justify-center self-stretch border-r border-white/[0.09] bg-white/[0.05] lg:max-xl:h-11 lg:max-xl:w-11 lg:max-xl:[&_svg]:h-4 lg:max-xl:[&_svg]:w-4 xl:min-h-[2.5rem] xl:w-10 xl:[&_svg]:h-[0.9rem] xl:[&_svg]:w-[0.9rem] min-[1440px]:min-h-[3rem] min-[1440px]:w-[3rem] min-[1440px]:[&_svg]:h-[1.125rem] min-[1440px]:[&_svg]:w-[1.125rem]">
                    <IconUserMini />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    placeholder="player01"
                    autoComplete="username"
                    minLength={3}
                    maxLength={20}
                    className={`${inputField} focus:outline-none`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:max-xl:gap-1.5 xl:gap-1">
                <label
                  htmlFor="email"
                  className="text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-violet-200/95 sm:text-[0.72rem] lg:max-xl:text-[0.66rem] xl:text-[0.7rem] xl:tracking-[0.24em]"
                >
                  Email
                </label>
                <div className={inputShell}>
                  <div className="flex h-[3rem] w-[3rem] shrink-0 items-center justify-center self-stretch border-r border-white/[0.09] bg-white/[0.05] lg:max-xl:h-11 lg:max-xl:w-11 lg:max-xl:[&_svg]:h-4 lg:max-xl:[&_svg]:w-4 xl:min-h-[2.5rem] xl:w-10 xl:[&_svg]:h-[0.9rem] xl:[&_svg]:w-[0.9rem] min-[1440px]:min-h-[3rem] min-[1440px]:w-[3rem] min-[1440px]:[&_svg]:h-[1.125rem] min-[1440px]:[&_svg]:w-[1.125rem]">
                    <IconMailMini />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`${inputField} focus:outline-none`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:max-xl:gap-1.5 xl:gap-1">
                <label
                  htmlFor="password"
                  className="text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-violet-200/95 sm:text-[0.72rem] lg:max-xl:text-[0.66rem] xl:text-[0.7rem] xl:tracking-[0.24em]"
                >
                  Password
                </label>
                <div className={inputShell}>
                  <div className="flex h-[3rem] w-[3rem] shrink-0 items-center justify-center self-stretch border-r border-white/[0.09] bg-white/[0.05] lg:max-xl:h-11 lg:max-xl:w-11 lg:max-xl:[&_svg]:h-4 lg:max-xl:[&_svg]:w-4 xl:min-h-[2.5rem] xl:w-10 xl:[&_svg]:h-[0.9rem] xl:[&_svg]:w-[0.9rem] min-[1440px]:min-h-[3rem] min-[1440px]:w-[3rem] min-[1440px]:[&_svg]:h-[1.125rem] min-[1440px]:[&_svg]:w-[1.125rem]">
                    <IconLockMini />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="min 8 characters"
                    autoComplete="new-password"
                    className={`${inputField} focus:outline-none`}
                  />
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-[0.95rem] leading-snug text-red-100 backdrop-blur-sm xl:py-2 xl:text-[0.8125rem] xl:leading-snug min-[1440px]:py-[0.6rem] min-[1440px]:text-[0.9rem]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="register-submit-btn cg-button cg-button-primary mt-1 w-full rounded-xl px-6 py-[0.85rem] text-[0.85rem] font-bold uppercase tracking-[0.26em] text-white outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060312] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-55 disabled:active:brightness-100 lg:max-xl:py-3 lg:max-xl:text-[0.78rem] lg:max-xl:tracking-[0.22em] xl:rounded-xl xl:px-4 xl:py-[0.68rem] xl:text-[0.78rem] xl:tracking-[0.19em] min-[1440px]:px-[1.2rem] min-[1440px]:py-[0.78rem] min-[1440px]:text-[0.805rem] min-[1440px]:tracking-[0.22em]"
                style={{
                  background: 'linear-gradient(125deg, #7c3aed 0%, #a855f7 38%, #d946ef 62%, #f97316 100%)',
                }}
              >
                <span className="relative z-[1] inline-block">{loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}</span>
              </button>
            </form>

            <div className="relative my-5 flex items-center xl:my-4" aria-hidden>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/45 to-violet-400/25" />
              <span className="mx-3 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                or
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-violet-500/45 to-violet-400/25" />
            </div>

            <GoogleSignInButton variant="register" />

            <p className="mt-8 text-center text-[0.95rem] text-slate-300 xl:mt-5 xl:text-left xl:text-[0.9rem] min-[1440px]:mt-6 min-[1440px]:text-[0.94rem]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-violet-300 underline decoration-violet-500/55 underline-offset-2 transition hover:text-violet-200 hover:decoration-violet-400"
              >
                Login
              </Link>
            </p>
          </div>
        </section>

        {/* Center — crystal video in-grid (desktop); visible from lg so 1024 shows center crystal */}
        <div
          aria-hidden
          className="pointer-events-none order-3 hidden min-h-0 min-w-0 lg:order-2 lg:flex lg:flex-col lg:items-center lg:justify-center lg:self-center xl:order-2"
        >
          <div className="register-crystal-stage relative flex w-full max-w-full items-center justify-center lg:h-[clamp(240px,min(48dvh,360px),360px)] lg:w-[min(100%,clamp(170px,19vw,210px))] xl:h-[clamp(380px,min(58dvh,620px),620px)] xl:w-[min(100%,clamp(420px,34vw,560px))] min-[1440px]:h-[clamp(400px,min(60dvh,620px),620px)] min-[1440px]:w-[min(100%,clamp(420px,33vw,580px))]">
            <div
              className="register-crystal-glow absolute z-0"
              style={{
                inset: '-12%',
                background:
                  'radial-gradient(circle at center, rgba(168,85,247,0.26) 0%, rgba(139,92,246,0.1) 38%, transparent 66%)',
              }}
            />
            <div
              className="absolute z-0 hidden"
              style={{
                inset: '-14%',
                background:
                  'radial-gradient(circle at center, rgba(168,85,247,0.3) 0%, rgba(139,92,246,0.12) 40%, transparent 68%)',
              }}
            />
            <video
              src="/register/register-crystal-loop-full.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="register-crystal-video relative z-[1] h-full w-full object-contain opacity-[0.78] mix-blend-screen"
              style={{
                maskImage:
                  'radial-gradient(ellipse at center, black 0%, black 42%, rgba(0,0,0,0.65) 56%, transparent 74%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse at center, black 0%, black 42%, rgba(0,0,0,0.65) 56%, transparent 74%)',
                maskSize: '100% 100%',
                WebkitMaskSize: '100% 100%',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
              }}
            />
          </div>
        </div>

        <aside className="order-2 mt-11 max-lg:border-t max-lg:border-white/[0.08] max-lg:pt-10 lg:order-3 lg:mt-0 lg:min-w-0 lg:w-full lg:self-center lg:max-xl:justify-self-stretch lg:max-xl:pr-1 xl:justify-self-end">
          <ul className="flex w-full flex-col xl:max-w-[min(100%,480px)]">
            {BENEFITS.map((b, idx) => (
              <li key={b.title}>
                {idx > 0 ? (
                  <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-violet-500/35 to-transparent lg:max-xl:my-3.5 lg:my-4 xl:my-6" />
                ) : null}
                <div className="flex items-center gap-6 max-lg:items-start lg:max-xl:gap-3.5 xl:gap-6">
                  <div className="register-benefit-icon-slot max-lg:self-start lg:max-xl:scale-[0.88] xl:-translate-y-0.5" aria-hidden>
                    <img
                      src={b.icon}
                      alt={b.alt}
                      className={`register-benefit-icon-img register-benefit-icon-img--${b.element}`}
                      style={{ animationDelay: `${idx * 0.35}s` }}
                      draggable={false}
                    />
                  </div>
                  <div className="min-w-0 max-lg:pt-1">
                    <h2 className="font-serif text-[1.05rem] font-semibold text-white lg:max-xl:text-[0.95rem]">
                      {b.title}
                    </h2>
                    <p className="mt-2 text-[0.9rem] leading-relaxed text-slate-400 lg:max-xl:mt-1.5 lg:max-xl:text-[0.82rem] lg:max-xl:leading-snug">
                      {b.desc}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

