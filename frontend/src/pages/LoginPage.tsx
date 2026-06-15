import axios from 'axios'
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { login } from '../api/auth'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import LoadingScreen from '../components/common/LoadingScreen'
import { useAuth } from '../stores/AuthContext'

// Basic email format check — full validation happens server-side.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHARACTER_IMAGES = [
  '/loginpage-images/login-page1.PNG',
  '/loginpage-images/login-page2.PNG',
  '/loginpage-images/login-page3.PNG',
  '/loginpage-images/login-page4.PNG',
  '/loginpage-images/login-page5.PNG',
  '/loginpage-images/login-page6.PNG',
];

const CAROUSEL_TOTAL = CHARACTER_IMAGES.length;
const AUTOPLAY_MS = 4500;

/** Purple-first ambience per slide — accent tints feel like coloured light in a violet fantasy hall. */
const FIRE_THEME = {
  frameKind: 'fire',
  frameMain: 'rgba(196, 181, 253, 0.38)',
  frameSecondary: 'rgba(251, 146, 60, 0.42)',
  frameGlow: 'rgba(234, 88, 12, 0.22)',
  frameShadow: 'rgba(55, 15, 28, 0.65)',
  base: '#090414',
  shadow: 'rgba(15, 5, 25, 0.92)',
  heroPrimary: 'rgba(168, 85, 247, 0.18)',
  heroSecondary: 'rgba(220, 38, 38, 0.24)',
  heroTertiary: 'rgba(249, 115, 22, 0.16)',
  formWash: 'rgba(147, 51, 234, 0.12)',
  formAccent: 'rgba(251, 113, 133, 0.08)',
  floorTint: 'rgba(126, 34, 206, 0.14)',
};

const ICE_THEME = {
  frameKind: 'ice',
  frameMain: 'rgba(187, 168, 255, 0.4)',
  frameSecondary: 'rgba(99, 102, 241, 0.45)',
  frameGlow: 'rgba(34, 211, 238, 0.18)',
  frameShadow: 'rgba(8, 12, 40, 0.72)',
  base: '#07051a',
  shadow: 'rgba(5, 7, 22, 0.94)',
  heroPrimary: 'rgba(124, 58, 237, 0.22)',
  heroSecondary: 'rgba(79, 70, 229, 0.24)',
  heroTertiary: 'rgba(34, 211, 238, 0.10)',
  formWash: 'rgba(139, 92, 246, 0.14)',
  formAccent: 'rgba(34, 211, 238, 0.10)',
  floorTint: 'rgba(79, 70, 229, 0.14)',
};

const NATURE_THEME = {
  frameKind: 'nature',
  frameMain: 'rgba(196, 181, 253, 0.36)',
  frameSecondary: 'rgba(52, 211, 153, 0.34)',
  frameGlow: 'rgba(45, 212, 191, 0.2)',
  frameShadow: 'rgba(6, 22, 18, 0.68)',
  base: '#060714',
  shadow: 'rgba(4, 14, 12, 0.92)',
  heroPrimary: 'rgba(124, 58, 237, 0.20)',
  heroSecondary: 'rgba(16, 185, 129, 0.16)',
  heroTertiary: 'rgba(20, 184, 166, 0.12)',
  formWash: 'rgba(167, 139, 250, 0.10)',
  formAccent: 'rgba(52, 211, 153, 0.10)',
  floorTint: 'rgba(124, 58, 237, 0.12)',
};

/** Image 1 fire, 2 ice, 3 nature, 4 fire, 5 nature, 6 ice */
const carouselThemes = [FIRE_THEME, ICE_THEME, NATURE_THEME, FIRE_THEME, NATURE_THEME, ICE_THEME];

/** Per-character vertical nudge by slot — compensates PNG framing (indices: 0/3 fire, 2 grass, 4 turtle). */
const CHARACTER_SLOT_NUDGE_Y: Readonly<
  Record<number, Partial<Record<'active' | 'prev' | 'next', string>>>
> = {
  0: { active: 'clamp(1.25rem, 3dvh, 2.5rem)' },
  2: { prev: 'clamp(-0.85rem, -1.8dvh, -1.25rem)' },
  3: { active: 'clamp(1.25rem, 3dvh, 2.5rem)' },
  4: { active: 'clamp(1.5rem, 3.5dvh, 2.75rem)' },
};

function characterSlotNudgeY(
  index: number,
  slot: 'active' | 'prev' | 'next' | 'hidden',
): string {
  if (slot === 'hidden') return '0';
  return CHARACTER_SLOT_NUDGE_Y[index]?.[slot] ?? '0';
}

function validate(email: string, password: string): string | null {
  if (!email.trim()) return 'Email is required.'
  if (!EMAIL_REGEX.test(email)) return 'Enter a valid email address.'
  if (!password) return 'Password is required.'
  return null
}

function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Login failed. Please try again.'
}

// Stacked carousel: only prev / active / next are visible — overlap near center behind hero.
function getCarouselLayout(index: number, activeIndex: number, total: number): {
  slot: 'active' | 'prev' | 'next' | 'hidden'
  style: CSSProperties
} {
  const prevIdx = (activeIndex - 1 + total) % total;
  const nextIdx = (activeIndex + 1) % total;

  if (index === activeIndex) {
    return {
      slot: 'active',
      style: {
        '--carousel-tx': '0',
        '--carousel-scale': '1',
        '--carousel-character-nudge-y': characterSlotNudgeY(index, 'active'),
        opacity: 1,
        zIndex: 10,
        pointerEvents: 'auto',
        filter: 'none',
      } as CSSProperties,
    };
  }
  if (index === prevIdx) {
    return {
      slot: 'prev',
      style: {
        '--carousel-tx': 'var(--carousel-prev-tx)',
        '--carousel-scale': 'var(--carousel-side-scale)',
        '--carousel-character-nudge-y': characterSlotNudgeY(index, 'prev'),
        opacity: 0.38,
        zIndex: 4,
        pointerEvents: 'none',
        filter: 'brightness(0.87) blur(0.45px)',
      } as CSSProperties,
    };
  }
  if (index === nextIdx) {
    return {
      slot: 'next',
      style: {
        '--carousel-tx': 'var(--carousel-next-tx)',
        '--carousel-scale': 'var(--carousel-side-scale)',
        '--carousel-character-nudge-y': characterSlotNudgeY(index, 'next'),
        opacity: 0.38,
        zIndex: 6,
        pointerEvents: 'none',
        filter: 'brightness(0.87) blur(0.45px)',
      } as CSSProperties,
    };
  }
  return {
    slot: 'hidden',
    style: {
      '--carousel-tx': '0',
      '--carousel-scale': '0.92',
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none',
      filter: 'none',
    } as CSSProperties,
  };
}

export default function LoginPage() {
  const { isAuthenticated, setAuth } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = useCallback((idx: number) => {
    setActiveIndex(((idx % CAROUSEL_TOTAL) + CAROUSEL_TOTAL) % CAROUSEL_TOTAL)
  }, [])

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + CAROUSEL_TOTAL) % CAROUSEL_TOTAL)
  }, [])

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % CAROUSEL_TOTAL)
  }, [])

  // Stop any stray media audio (e.g. leftover BGM from reference build tabs).
  useEffect(() => {
    document.querySelectorAll('audio').forEach((node) => {
      node.pause()
      node.currentTime = 0
    })
  }, [])

  // Autoplay — skipped if the user prefers reduced motion.
  useEffect(() => {
    const mq = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    if (mq?.matches) return;
    const timer = setInterval(goNext, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [goNext]);

  const pageTheme = useMemo(
    () => carouselThemes[activeIndex] ?? carouselThemes[0],
    [activeIndex],
  );

  // ── Guard: already authenticated ───────────────────────────────────────────
  if (isAuthenticated) {
    return <Navigate to="/lobby" replace />
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const validationError = validate(email, password)
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await login(email.trim(), password)
      setAuth(response.token, response.user)
      navigate('/lobby', { replace: true })
    } catch (err) {
      setError(getLoginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="login-page-root cg-page relative isolate min-h-[calc(100dvh_-_var(--navbar-height))] w-full overflow-x-hidden overflow-y-auto overscroll-y-contain pb-2 pt-2 sm:pb-3 sm:pt-3 lg:pb-5 lg:pt-5"
      style={{ backgroundColor: pageTheme.base }}
    >
      {loading ? <LoadingScreen message="Signing in…" /> : null}
      <style>{`
        /* Root page — base tint follows theme */
        .login-page-root {
          transition: background-color 800ms ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .login-page-root {
            transition: none;
          }
        }

        @keyframes login-bg-breathe-kf {
          0%, 100% {
            opacity: 0.86;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.035);
          }
        }

        /* Subtle ambient pulse on large glows only — slow, low contrast */
        .login-bg-breathe {
          animation: login-bg-breathe-kf 6.5s ease-in-out infinite;
          will-change: transform, opacity;
        }
        .login-bg-breathe--hero {
          transform-origin: 76% 40%;
          animation-duration: 6.75s;
        }
        .login-bg-breathe--form {
          transform-origin: 12% 50%;
          animation-duration: 7.25s;
          animation-delay: -2.4s;
        }
        .login-bg-breathe--floor {
          transform-origin: 50% 118%;
          animation-duration: 5.875s;
          animation-delay: -1.35s;
        }
        @media (prefers-reduced-motion: reduce) {
          .login-bg-breathe {
            animation: none !important;
            opacity: 0.93;
            transform: none !important;
          }
        }

        @property --frame-main {
          syntax: '<color>';
          inherits: true;
          initial-value: rgba(196, 181, 253, 0.35);
        }
        @property --frame-secondary {
          syntax: '<color>';
          inherits: true;
          initial-value: rgba(139, 92, 246, 0.35);
        }
        @property --frame-glow {
          syntax: '<color>';
          inherits: true;
          initial-value: rgba(124, 58, 237, 0.2);
        }
        @property --frame-shadow {
          syntax: '<color>';
          inherits: true;
          initial-value: rgba(15, 5, 25, 0.55);
        }

        /* Left login card — themed fantasy frame (CSS vars from active carousel theme) */
        .login-form-fantasy-card {
          position: relative;
          border-radius: 1.75rem;
          isolation: isolate;
          transition:
            --frame-main 820ms cubic-bezier(0.4, 0, 0.2, 1),
            --frame-secondary 820ms cubic-bezier(0.4, 0, 0.2, 1),
            --frame-glow 820ms cubic-bezier(0.4, 0, 0.2, 1),
            --frame-shadow 820ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .login-form-fantasy-card {
            transition: none;
          }
        }

        .login-form-fantasy-card > .login-form-frame-stack {
          pointer-events: none;
          border-radius: inherit;
        }

        /* Content above decorative frame */
        .login-form-fantasy-card > *:not(.login-form-frame-stack) {
          position: relative;
          z-index: 1;
        }

        .login-form-frame-stack {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          border-radius: inherit;
        }

        /* Soft outward glow */
        .login-form-frame-blur {
          position: absolute;
          inset: -10px;
          border-radius: inherit;
          opacity: 0.55;
          filter: blur(14px);
          background: radial-gradient(
            ellipse 96% 88% at 78% 86%,
            var(--frame-glow) 0%,
            transparent 58%
          );
          transition: opacity 820ms ease, filter 820ms ease;
        }

        /* Hairline rim + depth */
        .login-form-frame-rim {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          box-shadow:
            inset 0 0 0 1px var(--frame-main),
            inset 0 1px 0 rgba(255, 255, 255, 0.075),
            inset 0 -12px 28px var(--frame-shadow),
            0 0 0 1px rgba(24, 12, 48, 0.55),
            0 0 24px var(--frame-glow),
            0 20px 42px rgba(0, 0, 0, 0.42);
        }

        /* Animated accent wash (no layout impact) */
        .login-form-frame-pulse {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0.38;
          mix-blend-mode: screen;
          animation: login-form-frame-breathe 5.5s ease-in-out infinite;
        }
        .login-form-frame-pulse--fire {
          background:
            radial-gradient(ellipse 85% 70% at 100% 100%, var(--frame-secondary) 0%, transparent 55%),
            radial-gradient(ellipse 55% 45% at 0% 0%, var(--frame-secondary) 0%, transparent 62%);
          animation-duration: 5.6s;
        }
        .login-form-frame-pulse--ice {
          background: conic-gradient(
            from 210deg at 68% 28%,
            transparent 0deg,
            var(--frame-glow) 32deg,
            transparent 54deg,
            var(--frame-secondary) 110deg,
            transparent 148deg,
            transparent 360deg
          );
          animation: login-form-frame-breathe-ice 7.2s ease-in-out infinite;
          mix-blend-mode: soft-light;
          opacity: 0.28;
        }
        .login-form-frame-pulse--nature {
          background:
            radial-gradient(ellipse 70% 92% at 12% 58%, var(--frame-secondary) 0%, transparent 58%),
            radial-gradient(ellipse 78% 48% at 94% 12%, var(--frame-glow) 0%, transparent 55%);
          animation-duration: 6.4s;
        }

        @keyframes login-form-frame-breathe {
          0%, 100% { opacity: 0.3; filter: brightness(0.96); }
          50% { opacity: 0.52; filter: brightness(1.05); }
        }
        @keyframes login-form-frame-breathe-ice {
          0%, 100% { opacity: 0.22; filter: brightness(0.98); }
          35% { opacity: 0.34; filter: brightness(1.06); }
          70% { opacity: 0.28; filter: brightness(1.02); }
        }
        @media (prefers-reduced-motion: reduce) {
          .login-form-frame-pulse,
          .login-form-frame-pulse--ice {
            animation: none !important;
            opacity: 0.38;
            transform: none !important;
            filter: none !important;
          }
        }

        /* Two-column shell (siblings — no shared card border) */
        .login-page-layout {
          width: min(94vw, var(--cg-page-max-width, 1360px));
        }
        .login-form-card {
          width: 100%;
          max-height: min(78dvh, calc(100dvh - var(--navbar-height) - 0.5rem));
        }
        /* Small / mid laptop: portrait card — narrow width, height from viewport (not aggressive dvh caps) */
        @media (min-width: 1024px) and (max-width: 1279px) {
          .login-form-card {
            flex: 0 0 auto;
            width: clamp(400px, 34vw, 500px);
            max-width: clamp(400px, 34vw, 500px);
            max-height: calc(100dvh - var(--navbar-height) - 2rem);
          }
        }
        @media (min-width: 1280px) {
          .login-form-card {
            flex: 0 0 auto;
            width: clamp(440px, 36vw, 560px);
            max-width: clamp(440px, 36vw, 560px);
            max-height: calc(100dvh - var(--navbar-height) - 2rem);
          }
        }

        /* Carousel column — shorter on laptop so hero does not dominate */
        .login-carousel-shell {
          min-height: min(58dvh, 480px);
        }
        @media (min-width: 1280px) {
          .login-carousel-shell {
            min-height: min(64dvh, 560px);
          }
        }
        @media (min-width: 1512px) {
          .login-carousel-shell {
            min-height: min(68dvh, 620px);
          }
        }

        /* Whole-page theme layers — hue crossfade on slide change */
        .login-page-amb-layer {
          transition:
            background 850ms cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 850ms cubic-bezier(0.4, 0, 0.2, 1),
            filter 850ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .login-page-amb-layer {
            transition: none;
          }
        }

        /* ── Submit button: premium slow breath + soft glow + drifting inner shimmer ─ */
        @keyframes loginButtonBreathe {
          0%, 100% {
            transform: scale(1);
            box-shadow:
              0 0 0 1px rgba(196, 181, 254, 0.34),
              0 0 10px rgba(124, 58, 237, 0.24),
              0 0 22px rgba(37, 99, 235, 0.12),
              0 0 36px rgba(59, 130, 246, 0.06),
              inset 0 1px 0 rgba(255, 255, 255, 0.11),
              inset 0 -8px 22px rgba(15, 23, 42, 0.38);
            filter: brightness(1);
          }
          45%,
          55% {
            transform: scale(1.015);
            box-shadow:
              0 0 0 1px rgba(214, 201, 255, 0.44),
              0 0 16px rgba(139, 92, 246, 0.32),
              0 0 30px rgba(124, 58, 237, 0.2),
              0 0 48px rgba(37, 99, 235, 0.12),
              inset 0 1px 0 rgba(255, 255, 255, 0.15),
              inset 0 -8px 20px rgba(15, 23, 42, 0.32);
            filter: brightness(1.045);
          }
        }
        @keyframes loginButtonBloom {
          0%, 100% {
            opacity: 0.2;
            transform: translate(-50%, 0) scale(0.98, 0.9);
          }
          50% {
            opacity: 0.5;
            transform: translate(-50%, 0) scale(1.03, 1.05);
          }
        }
        @keyframes loginButtonShimmer {
          0% {
            transform: translateX(-120%) skewX(-10deg);
            opacity: 0;
          }
          35% {
            opacity: 0.15;
          }
          65% {
            opacity: 0.08;
          }
          100% {
            transform: translateX(120%) skewX(-10deg);
            opacity: 0;
          }
        }
        .login-submit-btn {
          position: relative;
          isolation: isolate;
          transform-origin: center center;
          background: linear-gradient(90deg, #6d28d9 0%, #5b21b6 28%, #4338ca 55%, #2563eb 100%);
          animation: loginButtonBreathe 4.8s ease-in-out infinite;
        }
        .login-submit-btn::before {
          content: '';
          position: absolute;
          top: -15%;
          left: 0;
          width: 55%;
          height: 130%;
          border-radius: inherit;
          z-index: 1;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.04) 36%,
            rgba(224, 231, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.04) 64%,
            transparent 100%
          );
          filter: blur(4px);
          mix-blend-mode: soft-light;
          animation: loginButtonShimmer 6.75s ease-in-out infinite;
          animation-delay: -1.4s;
        }
        .login-submit-btn:disabled {
          animation: none;
          transform: none;
          filter: brightness(0.92);
          box-shadow:
            0 0 0 1px rgba(196, 181, 254, 0.22),
            0 0 12px rgba(91, 33, 182, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            inset 0 -8px 18px rgba(15, 23, 42, 0.45);
        }
        .login-submit-btn:disabled::before {
          animation: none;
          opacity: 0;
        }
        .login-submit-btn:hover:not(:disabled) {
          filter: brightness(1.2);
          animation-play-state: paused;
        }
        .login-submit-btn:hover:not(:disabled) .login-submit-btn__bloom {
          animation-play-state: paused;
        }
        .login-submit-btn:hover:not(:disabled)::before {
          animation-play-state: paused;
        }
        .login-submit-btn:active:not(:disabled) {
          transform: scale(0.985);
          filter: brightness(0.96);
          animation-play-state: paused;
        }
        .login-submit-btn:active:not(:disabled) .login-submit-btn__bloom {
          animation-play-state: paused;
        }
        .login-submit-btn:active:not(:disabled)::before {
          animation-play-state: paused;
        }
        /* Glow extends below paint box — keep register line out of decal overlap */
        @media (min-width: 1024px) and (max-width: 1511px) {
          .login-form-card .login-submit-btn {
            margin-bottom: 12px;
          }
        }

        .login-submit-btn__bloom {
          position: absolute;
          left: 50%;
          bottom: -35%;
          width: 130%;
          height: 85%;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          transform-origin: center bottom;
          background: radial-gradient(
            closest-side at 50% 100%,
            rgba(210, 195, 255, 0.62) 0%,
            rgba(124, 58, 237, 0.4) 38%,
            transparent 72%
          );
          mix-blend-mode: screen;
          filter: blur(0.5px);
          animation: loginButtonBloom 4.8s ease-in-out infinite;
        }
        .login-submit-btn:disabled .login-submit-btn__bloom {
          animation: none;
          opacity: 0.12;
          transform: translate(-50%, 0) scale(1);
        }
        @media (prefers-reduced-motion: reduce) {
          .login-submit-btn:not(:disabled) {
            animation: none !important;
            transform: none !important;
            filter: none;
            box-shadow:
              0 0 0 1px rgba(196, 181, 254, 0.45),
              0 0 22px rgba(124, 58, 237, 0.42),
              0 0 48px rgba(37, 99, 235, 0.22),
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              inset 0 -8px 18px rgba(15, 23, 42, 0.35);
          }
          .login-submit-btn:not(:disabled)::before {
            animation: none !important;
            opacity: 0;
          }
          .login-submit-btn__bloom {
            animation: none !important;
            transform: translate(-50%, 0) scale(1) !important;
            opacity: 0.38;
            filter: none;
          }
          .login-submit-btn:hover:not(:disabled) {
            filter: brightness(1.08);
          }
          .login-submit-btn:active:not(:disabled) {
            transform: none !important;
          }
        }

        /* Stacked carousel — same overlap/spread at all lg+ widths (matches 1024 laptop) */
        .login-carousel-visual {
          --carousel-prev-tx: -24%;
          --carousel-next-tx: 24%;
          --carousel-side-scale: 0.64;
        }
        @media (min-width: 1024px) and (max-height: 820px) {
          .login-carousel-visual {
            --carousel-prev-tx: -20%;
            --carousel-next-tx: 20%;
            --carousel-side-scale: 0.6;
          }
        }
        /* Hero character — fixed caps; do not grow on ultra-wide (same as 1024) */
        .login-carousel-character {
          width: auto;
          max-width: min(100%, clamp(360px, 50vw, 560px));
          height: auto;
          max-height: min(86%, clamp(380px, 58dvh, 600px));
          object-position: 50% 52%;
        }
        @media (min-width: 1512px) {
          .login-carousel-character {
            max-width: min(100%, 540px);
            max-height: min(88%, 480px);
          }
        }

        /* Layout positioning — stacked prev / active / next */
        .login-carousel-slide {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transform: translateX(var(--carousel-tx, 0)) translateY(var(--carousel-ty, 2%))
            scale(var(--carousel-scale, 1));
          transform-origin: var(--carousel-origin-x, 50%) var(--carousel-origin-y, 50%);
          transition:
            transform 0.62s cubic-bezier(0.38, 0, 0.24, 1),
            opacity 0.58s ease,
            filter 0.52s ease;
          will-change: transform, opacity;
        }
        .login-carousel-slide .login-carousel-character {
          transition: transform 0.62s cubic-bezier(0.38, 0, 0.24, 1);
        }
        .login-carousel-slide[data-slot='prev'] .login-carousel-character,
        .login-carousel-slide[data-slot='next'] .login-carousel-character,
        .login-carousel-slide[data-slot='active'] .login-carousel-character {
          transform: translateY(var(--carousel-character-nudge-y, 0));
        }
        .login-carousel-slide[data-slot='active'] .login-carousel-character {
          filter:
            drop-shadow(0 18px 36px rgba(0, 0, 0, 0.45))
            drop-shadow(0 0 52px rgba(120, 55, 220, 0.22));
        }
        @media (prefers-reduced-motion: reduce) {
          .login-carousel-slide {
            transition: opacity 0.22s ease, filter 0.22s ease, transform 0.22s ease !important;
          }
          .login-carousel-visual {
            --carousel-prev-tx: -24%;
            --carousel-next-tx: 24%;
            --carousel-side-scale: 0.8;
          }
          .login-carousel-slide[data-slot='hidden'] {
            opacity: 0 !important;
            pointer-events: none !important;
          }
        }
      `}</style>

      {/* ── Whole-page themed ambience (activeIndex): purple hall + tint + breathe ─ */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className="login-page-amb-layer login-page-amb-base absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 128% 120% at 52% 48%, ${pageTheme.base} 0%, rgba(8, 4, 18, 0.96) 52%, rgba(2, 1, 8, 0.98) 100%)`,
            boxShadow: `
              inset 0 0 200px rgba(0, 0, 0, 0.5),
              inset 0 -60px 120px ${pageTheme.shadow}`,
          }}
        />
        <div
          className="login-page-amb-layer login-bg-breathe login-bg-breathe--hero absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 102% 92% at 76% 40%, ${pageTheme.heroPrimary} 0%, transparent 58%),
              radial-gradient(ellipse 78% 72% at 70% 36%, ${pageTheme.heroSecondary} 0%, transparent 52%),
              radial-gradient(ellipse 62% 58% at 84% 48%, ${pageTheme.heroTertiary} 0%, transparent 50%)`,
          }}
        />
        <div
          className="login-page-amb-layer login-bg-breathe login-bg-breathe--form absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 92% 100% at 12% 48%, ${pageTheme.formWash} 0%, transparent 56%),
              radial-gradient(ellipse 52% 58% at 24% 32%, ${pageTheme.formAccent} 0%, transparent 48%)`,
          }}
        />
        <div
          className="login-page-amb-layer login-bg-breathe login-bg-breathe--floor absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 132% 88% at 50% 112%, ${pageTheme.floorTint} 0%, transparent 52%),
              radial-gradient(ellipse 118% 70% at 50% 100%, ${pageTheme.shadow} 0%, transparent 45%)`,
            boxShadow: 'inset 0 -90px 160px rgba(0, 0, 0, 0.35)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 142% 124% at 48% 42%, transparent 20%, rgba(1, 0, 6, 0.94) 100%)',
          }}
        />
      </div>

      {/* ── Layout: siblings — form card (left) + open carousel (right) ─────── */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh_-_var(--navbar-height))] w-full items-center justify-center px-3 py-2 sm:px-5 sm:py-4 lg:px-5 lg:py-4 xl:px-6">
        <div className="login-page-layout flex min-h-0 w-full min-w-0 flex-col items-stretch gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-5 xl:gap-7">
          {/* ── Left — standalone fantasy login card (~42–48% desktop) ─────── */}
          <div
            className="login-form-card login-form-fantasy-card cg-panel cg-glow mx-auto flex w-full min-h-0 max-w-lg min-w-0 flex-col justify-start overflow-y-auto overflow-x-hidden overscroll-contain rounded-[1.75rem] border border-transparent bg-[rgba(6,7,22,0.45)] px-5 py-5 pb-7 shadow-[0_22px_56px_rgba(0,0,0,0.45)] backdrop-blur-[11px] sm:px-8 sm:py-7 lg:mx-0 lg:max-w-none lg:px-6 lg:py-6 lg:pb-8 xl:px-7 xl:py-6 xl:pb-8"
            data-frame-kind={pageTheme.frameKind}
            style={
              {
                '--frame-main': pageTheme.frameMain,
                '--frame-secondary': pageTheme.frameSecondary,
                '--frame-glow': pageTheme.frameGlow,
                '--frame-shadow': pageTheme.frameShadow,
              } as CSSProperties
            }
          >
            <div className="login-form-frame-stack" aria-hidden="true">
              <div className="login-form-frame-blur" />
              <div className="login-form-frame-rim" />
              <div className={`login-form-frame-pulse login-form-frame-pulse--${pageTheme.frameKind}`} />
            </div>
            {/* Brand */}
            <div className="mb-3 flex shrink-0 items-center gap-2 sm:gap-3 lg:mb-3 lg:gap-2.5 xl:mb-4">
              <img
                src="/logo/logo-icon-transparent.png"
                alt=""
                className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11 lg:h-9 lg:w-9 xl:h-10 xl:w-10"
                draggable={false}
                width={56}
                height={56}
              />
              <span className="font-serif text-base font-semibold tracking-[0.18em] text-white sm:text-lg lg:text-[0.95rem] xl:text-base">
                CARD ROGUE
              </span>
            </div>

            <h1 className="cg-title text-center font-serif text-[1.45rem] font-bold leading-snug tracking-[0.1em] text-white sm:text-3xl lg:text-left lg:text-2xl xl:text-3xl">
              ENTER THE ARENA
            </h1>
            <p className="cg-subtitle mt-1.5 text-center text-sm leading-relaxed text-slate-400 sm:text-base lg:mt-2 lg:text-left lg:text-[0.9rem] xl:text-[0.95rem]">
              Log in to continue your battle.
            </p>

            <div
              className="cg-divider relative my-3.5 flex w-full shrink-0 items-center sm:my-4 lg:my-3.5 xl:my-4"
              aria-hidden="true"
            >
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/50 to-violet-400/20" />
              <div className="cg-divider__gem mx-3 h-2 w-2 border border-violet-400/70 bg-violet-600/25 shadow-[0_0_10px_rgba(167,139,250,0.45)]" />
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-violet-500/50 to-violet-400/20" />
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col gap-4 sm:gap-[1.1rem] lg:gap-[1.2rem] xl:gap-[1.25rem]">
              <div className="flex flex-col gap-2 sm:gap-2 lg:gap-2">
                <label
                  htmlFor="email"
                  className="cg-label text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-violet-300/90 sm:text-xs"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="cg-input w-full rounded-xl border border-violet-500/25 bg-black/40 px-3.5 py-2.5 text-sm text-white shadow-inner shadow-black/30 placeholder:text-slate-500 backdrop-blur-md transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:shadow-[0_0_20px_rgba(139,92,246,0.2)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-base sm:leading-normal lg:py-2.5 lg:text-[0.9rem] lg:leading-snug xl:py-2.5 xl:text-sm"
                />
              </div>

              <div className="flex flex-col gap-2 sm:gap-2 lg:gap-2">
                <label
                  htmlFor="password"
                  className="cg-label text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-violet-300/90 sm:text-xs"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="cg-input w-full rounded-xl border border-violet-500/25 bg-black/40 px-3.5 py-2.5 pr-11 text-sm text-white shadow-inner shadow-black/30 placeholder:text-slate-500 backdrop-blur-md transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:shadow-[0_0_20px_rgba(139,92,246,0.2)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:pr-12 sm:text-base sm:leading-normal lg:py-2.5 lg:text-[0.9rem] lg:leading-snug xl:py-2.5 xl:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-violet-300/80 transition hover:bg-violet-500/15 hover:text-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:cursor-not-allowed disabled:opacity-40 sm:right-3"
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" className="h-[1.125rem] w-[1.125rem]" aria-hidden="true">
                        <path
                          d="M3 3l18 18"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                        />
                        <path
                          d="M10.58 10.58a2 2 0 0 0 2.83 2.83"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                        />
                        <path
                          d="M9.88 5.09A10.94 10.94 0 0 1 12 5c5.52 0 10 4.5 10 7s-1.02 2.28-2.62 3.73"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                        />
                        <path
                          d="M6.11 6.11C4.04 7.55 2.55 9.47 2 12c0 2.5 4.48 7 10 7 1.08 0 2.12-.16 3.09-.45"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="h-[1.125rem] w-[1.125rem]" aria-hidden="true">
                        <path
                          d="M2 12s4.5-7 10-7 10 7 10 7-4.5 7-10 7S2 12 2 12Z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/40 bg-red-950/45 px-3.5 py-2.5 text-sm text-red-200 backdrop-blur-sm lg:px-3 lg:py-2 lg:text-[0.8125rem]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-submit-btn cg-button cg-button-primary group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-3.5 py-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0514] disabled:cursor-not-allowed disabled:opacity-60 sm:gap-3 sm:py-3.5 lg:gap-3 lg:py-[0.9375rem] xl:py-4"
              >
                <span className="login-submit-btn__bloom" aria-hidden="true" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-px bg-gradient-to-r from-transparent via-sky-200/35 to-transparent" />
                <span className="relative z-[2] flex shrink-0 items-center gap-2" aria-hidden="true">
                  <span className="hidden h-px w-8 bg-gradient-to-l from-violet-200/65 to-transparent sm:block sm:w-12" />
                  <span className="h-2 w-2 rotate-45 border border-violet-100/80 bg-violet-400/20 shadow-[0_0_8px_rgba(196,181,254,0.55)]" />
                </span>
                <span className="relative z-[2] shrink-0 font-serif text-xs font-semibold uppercase tracking-[0.28em] text-white sm:text-sm lg:text-xs xl:text-sm">
                  {loading ? 'LOGGING IN…' : 'LOGIN'}
                </span>
                <span className="relative z-[2] flex shrink-0 items-center gap-2" aria-hidden="true">
                  <span className="h-2 w-2 rotate-45 border border-violet-100/80 bg-violet-400/20 shadow-[0_0_8px_rgba(196,181,254,0.55)]" />
                  <span className="hidden h-px w-8 bg-gradient-to-r from-violet-200/65 to-transparent sm:block sm:w-12" />
                </span>
              </button>
            </form>

            <div className="relative my-4 flex items-center" aria-hidden>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/35 to-violet-400/20" />
              <span className="mx-3 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                or
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-violet-500/35 to-violet-400/20" />
            </div>

            <GoogleSignInButton variant="login" />

            <p className="mt-5 shrink-0 pb-1 text-center text-sm text-slate-400 sm:mt-5 lg:text-left lg:mt-6 lg:text-[0.8125rem] xl:mt-7 xl:text-sm">
              No account yet?{' '}
              <Link
                to="/register"
                className="font-semibold text-violet-300 underline decoration-violet-500/50 underline-offset-2 transition hover:text-violet-200 hover:decoration-violet-400"
              >
                Register
              </Link>
            </p>
          </div>

          {/* ── Right — layout only; character sits on page ambience ───────── */}
          <div className="login-carousel-shell group/carousel relative hidden min-w-0 flex-1 overflow-hidden lg:flex">

            {/* ── Carousel track ── */}
            <div className="login-carousel-visual absolute inset-0 z-10 overflow-hidden">
              {CHARACTER_IMAGES.map((src, i) => {
                const { slot, style } = getCarouselLayout(i, activeIndex, CAROUSEL_TOTAL);
                return (
                  <div
                    key={src}
                    className="login-carousel-slide"
                    style={style}
                    data-slot={slot}
                    data-character-index={i}
                    data-active={slot === 'active' ? 'true' : 'false'}
                  >
                    <img
                      src={src}
                      alt=""
                      role="presentation"
                      draggable={false}
                      className="login-carousel-character block object-contain"
                    />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous character"
              className="absolute left-2 top-1/2 z-[11] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent text-white opacity-0 shadow-none transition-opacity duration-300 hover:bg-black/25 focus:outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-white/30 group-hover/carousel:opacity-70 group-hover/carousel:text-white md:left-4"
              style={{ outline: 'none' }}
            >
              <svg viewBox="0 0 15 15" fill="none" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M9 12L4.5 7.5 9 3"
                  stroke="currentColor"
                  strokeOpacity="0.55"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next character"
              className="absolute right-2 top-1/2 z-[11] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent text-white opacity-0 shadow-none transition-opacity duration-300 hover:bg-black/25 focus:outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-white/30 group-hover/carousel:opacity-70 group-hover/carousel:text-white md:right-4"
              style={{ outline: 'none' }}
            >
              <svg viewBox="0 0 15 15" fill="none" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M6 3l4.5 4.5L6 12"
                  stroke="currentColor"
                  strokeOpacity="0.55"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Minimal dot indicators */}
            <div
              className="absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-[3px] opacity-90 xl:bottom-3"
              role="tablist"
              aria-label="Character selection"
            >
              {CHARACTER_IMAGES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={`rounded-full border-0 p-0 transition-opacity duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/40 ${
                    i === activeIndex
                      ? 'h-[3px] w-3 bg-violet-200/55 opacity-80'
                      : 'h-[3px] w-[3px] bg-white/[0.22] hover:bg-white/35'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

