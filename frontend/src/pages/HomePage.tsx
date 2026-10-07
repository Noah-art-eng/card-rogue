import { useState, useRef, useEffect, type Dispatch, type SetStateAction, type TransitionEvent } from 'react';
import { Link } from 'react-router-dom';

interface ShowcaseHeroSectionProps {
  innerKey: number;
  fanHovered: boolean;
  setFanHovered: Dispatch<SetStateAction<boolean>>;
}

/** Slide strip: GPU translate only; timing after transform settles + idle read time */
const SHOWCASE = {
  /** Must match --navbar-height in Navbar.jsx (3.5 / 4 / 5 rem by breakpoint) */
  SLIDE_H: 'calc(100dvh - var(--navbar-height))',
  STRIP_MS: 920,
  STRIP_EASE: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** ms after strip lands — entrance animations finish inside this window */
  ENTRANCE_DONE_MS: [1800, 1750, 1050, 1950, 2000],
  IDLE_MS: [2200, 2350, 2350, 2500, 2200],
  LOOP_RESET_DEBOUNCE_MS: 48,
};

// ─── Hero fan — 3 large cards, individually placed, diagonal portrait tilt ───
// Baseline layout at 350×490; HERO_FAN_RATIO scales visual size ~12.5% for desktop.
const HERO_FAN_RATIO = 0.875;
const HERO_CARD_BASE_W = 350;
const HERO_CARD_BASE_H = 490;
const CARD_W = Math.round(HERO_CARD_BASE_W * HERO_FAN_RATIO);
const CARD_H = Math.round(HERO_CARD_BASE_H * HERO_FAN_RATIO);

// Spacing 275px at baseline — scaled with fan ratio so overlap stays proportional.
const HERO_CARDS = [
  { src: '/cards/card_35.png', left: 0, top: Math.round(55 * HERO_FAN_RATIO), rotate: -8, z: 20, opacity: 0.88 },
  { src: '/cards/card_01.png', left: Math.round(275 * HERO_FAN_RATIO), top: Math.round(10 * HERO_FAN_RATIO), rotate: 3, z: 50, opacity: 1.00 },
  { src: '/cards/card_20.png', left: Math.round(545 * HERO_FAN_RATIO), top: Math.round(65 * HERO_FAN_RATIO), rotate: 10, z: 30, opacity: 0.88 },
];

// On hover: side cards push outward, centre lifts (offsets scaled with fan)
const FAN_HOVER = [
  { dx: Math.round(-22 * HERO_FAN_RATIO), dy: Math.round(8 * HERO_FAN_RATIO), dr: -4 },
  { dx: 0, dy: Math.round(-14 * HERO_FAN_RATIO), dr: 0 },
  { dx: Math.round(22 * HERO_FAN_RATIO), dy: Math.round(10 * HERO_FAN_RATIO), dr: 4 },
];

// Ghost silhouettes — offsets from matching HERO_CARDS slot so stacks stay visually
// glued when `.hero-fan-scale-wrapper` applies responsive scale (matches foreground fan).
const HERO_GHOST_TUNE = [
  { dx: -14, dy: -88, rotateDelta: -8, scale: 1.12, opacity: 0.22 },
  { dx: -12, dy: -94, rotateDelta: -3, scale: 1.06, opacity: 0.24 },
  { dx: -10, dy: -86, rotateDelta: 5, scale: 1.10, opacity: 0.22 },
];

// Section 2 — 5 fan cards spread in an arc around/before the boss
// Cards at higher right% are clearly visible; lower right% are partially behind boss
// Section 2 fan — must NOT reuse Hero cards (card_35, card_01, card_20)
const S2_FAN_CARDS = [
  { src: '/cards/card_07.png', right: '54%', top: '10%', rotate: -22, opacity: 0.72 },
  { src: '/cards/card_27.png', right: '44%', top:  '7%', rotate: -10, opacity: 0.80 },
  { src: '/cards/card_14.jpg', right: '36%', top: '11%', rotate:   2, opacity: 0.84 },
  { src: '/cards/card_18.png', right: '28%', top:  '7%', rotate:  13, opacity: 0.72 },
  { src: '/cards/card_33.png', right: '20%', top: '13%', rotate:  23, opacity: 0.58 },
];

// Section 3 — 3 core element cards with per-element glow tones
const S3_CARDS = [
  {
    src: '/cards/card_12.png', label: 'Water',
    glow:   'rgba(56,189,248,0.55)',
    border: 'rgba(56,189,248,0.40)',
    under:  'rgba(14,165,233,0.45)',
  },
  {
    src: '/cards/card_26.png', label: 'Fire',
    glow:   'rgba(251,113,0,0.65)',
    border: 'rgba(249,115,22,0.45)',
    under:  'rgba(234,88,12,0.50)',
  },
  {
    src: '/cards/card_38.png', label: 'Nature',
    glow:   'rgba(52,211,153,0.55)',
    border: 'rgba(52,211,153,0.40)',
    under:  'rgba(16,185,129,0.45)',
  },
];

// Section 4 — 3 bare element icons, no tile containers
const S4_TILES = [
  { src: '/images/icon-water.png',  label: 'Water',  floatClass: 's4-float-1', iconClass: 's4-icon s4-icon-water'  },
  { src: '/images/icon-fire.png',   label: 'Fire',   floatClass: 's4-float-2', iconClass: 's4-icon s4-icon-fire'   },
  { src: '/images/icon-nature.png', label: 'Nature', floatClass: 's4-float-3', iconClass: 's4-icon s4-icon-nature' },
];

/** Shared hero markup — slide 0 & 4; entrance stagger via slot [data-entered] + .hero-stagger-* (no transform on hover targets) */
function ShowcaseHeroSection({ innerKey, fanHovered, setFanHovered }: ShowcaseHeroSectionProps) {
  return (
    <>
      {/* Pull behind fixed navbar; paddingTop matches Navbar height (--navbar-height). */}
      <section
        className="relative h-full min-h-0 flex flex-col overflow-hidden"
        style={{
          marginTop: 'calc(var(--navbar-height) * -1)',
          paddingTop: 'var(--navbar-height)',
          background:
            'radial-gradient(ellipse 130% 110% at 68% 52%, #1e0d34 0%, #100b20 38%, #040410 100%)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute" style={{
            top: '-15%', left: '38%', width: 900, height: 800,
            background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 65%)',
            filter: 'blur(120px)',
          }} />
          <div className="absolute" style={{
            top: '20%', right: '-8%', width: 560, height: 560,
            background: 'radial-gradient(circle, rgba(37,99,235,0.16) 0%, transparent 70%)',
            filter: 'blur(90px)',
          }} />
          <div className="absolute" style={{
            bottom: '5%', right: '25%', width: 380, height: 380,
            background: 'radial-gradient(circle, rgba(220,38,38,0.10) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }} />
          <div className="absolute" style={{
            bottom: '-5%', left: '-5%', width: 500, height: 400,
            background: 'radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }} />
        </div>

        <div
          key={innerKey}
          className="relative z-10 flex-1 flex flex-col md:flex-row items-center pl-6 pr-3 sm:pl-8 sm:pr-4 lg:pl-12 xl:pl-24 lg:pr-6 pb-8 pt-5 lg:pb-7 gap-6 md:gap-0 lg:gap-8 xl:gap-0"
        >

          <div className="hero-stagger-copy w-full min-w-0 md:w-[38%] lg:w-[34%] xl:w-[38%] flex flex-col gap-4 md:gap-5 lg:gap-3 xl:gap-5 md:pr-2 lg:pr-6 xl:pr-2 order-2 md:order-1 items-center md:items-start text-center md:text-left">
            {/* Laptop: lighter type; min-[1512px]+ / 2xl: step up toward original desktop */}
            <h1 className="hero-stagger-headline text-4xl sm:text-5xl md:text-[2.5rem] lg:text-[2.125rem] min-[1280px]:text-[2.75rem] min-[1440px]:text-[3rem] font-black text-white leading-[1.04] tracking-tight">
              Strategic<br />Card Battles,<br />
              <span style={{
                background: 'linear-gradient(90deg, #a78bfa 0%, #818cf8 50%, #60a5fa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Powered by Skill
              </span>
            </h1>
            <div className="hero-stagger-subcta flex flex-col gap-4 md:gap-5 lg:gap-3 xl:gap-5">
            <p className="text-slate-400 text-base md:text-base lg:text-[0.9rem] xl:text-[1.05rem] leading-relaxed max-w-sm lg:max-w-[15rem] xl:max-w-sm">
              A PvE card game where strategy, timing, and elemental combos decide every match.
            </p>
            {/* Single row on laptop: nowrap + tighter padding until min-[1512px] */}
            <div className="flex flex-nowrap items-center gap-2 sm:gap-2.5">
              <Link
                to="/login"
                className="glow-purple shrink-0 rounded-full font-extrabold text-white tracking-wide
                           px-5 py-2.5 text-sm md:px-6 md:py-3 md:text-base lg:px-5 lg:py-2 lg:text-sm xl:px-6 xl:py-3 xl:text-base"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
              >
                Start Game
              </Link>
              <Link
                to="/leaderboard"
                className="glow-outline shrink-0 rounded-full font-extrabold text-white tracking-wide border-2 border-white/30 backdrop-blur-sm
                           px-5 py-2.5 text-sm md:px-6 md:py-3 md:text-base lg:px-5 lg:py-2 lg:text-sm xl:px-6 xl:py-3 xl:text-base"
              >
                View Leaderboard
              </Link>
            </div>
            </div>
          </div>

          <div className="hero-stagger-fan w-full min-w-0 md:w-[62%] lg:w-[58%] xl:w-[62%] flex items-center justify-start pl-0 lg:pl-2 xl:pl-8 min-[1440px]:pl-14 order-1 md:order-2 relative">

            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute" style={{
                bottom: '8%', left: '1%', width: 800, height: 560,
                background: 'radial-gradient(ellipse at 45% 90%, rgba(124,58,237,0.50) 0%, rgba(79,70,229,0.18) 48%, transparent 72%)',
                filter: 'blur(55px)',
              }} />
              <div className="absolute" style={{
                bottom: '25%', left: '0%', width: 200, height: 220,
                background: 'radial-gradient(circle, rgba(37,99,235,0.28) 0%, transparent 70%)',
                filter: 'blur(34px)',
              }} />
              <div className="absolute" style={{
                bottom: '22%', right: '8%', width: 180, height: 200,
                background: 'radial-gradient(circle, rgba(220,38,38,0.20) 0%, transparent 70%)',
                filter: 'blur(30px)',
              }} />
            </div>

            {/* Scale wrapper: shrinks the entire fan group on smaller laptop viewports.
                Separate from .fan-float so the float animation's transform is unaffected. */}
            <div className="hero-fan-scale-wrapper hero-fan-scale-wrapper--cards">
            <div
              className="fan-float relative shrink-0"
              style={{
                width: '100%',
                maxWidth: Math.round(900 * HERO_FAN_RATIO),
                height: `min(${Math.round(590 * HERO_FAN_RATIO)}px, calc(100dvh - var(--navbar-height) - 9rem))`,
              }}
            >
              {HERO_CARDS.map((card, i) => {
                const g = HERO_GHOST_TUNE[i];
                return (
                  <div
                    key={`ghost-upper-${i}`}
                    className="pointer-events-none absolute"
                    aria-hidden="true"
                    style={{
                      left: card.left + g.dx,
                      top: card.top + g.dy,
                      width: CARD_W,
                      height: CARD_H,
                      transform:
                        `rotate(${card.rotate + g.rotateDelta}deg) scale(${g.scale})`,
                      transformOrigin: 'bottom center',
                      zIndex: 1,
                      opacity: g.opacity,
                      filter: 'blur(0px) brightness(0.42)',
                      borderRadius: 20,
                      overflow: 'hidden',
                      WebkitMaskImage:
                        'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 22%, rgba(0,0,0,0.35) 55%, transparent 78%)',
                      maskImage:
                        'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 22%, rgba(0,0,0,0.35) 55%, transparent 78%)',
                    }}
                  >
                    <img
                      src={card.src}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>
                );
              })}

              {HERO_CARDS.map((card, i) => (
                <div
                  key={`ghost-lower-${i}`}
                  className="pointer-events-none absolute"
                  aria-hidden="true"
                  style={{
                    left: card.left,
                    top: card.top + CARD_H + 3,
                    width: CARD_W,
                    height: 120,
                    overflow: 'hidden',
                    transform: `rotate(${card.rotate}deg)`,
                    transformOrigin: 'top center',
                    zIndex: 1,
                    opacity: 0.18,
                    borderRadius: '0 0 16px 16px',
                    WebkitMaskImage:
                      'linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, transparent 100%)',
                    maskImage:
                      'linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, transparent 100%)',
                  }}
                >
                  <img
                    src={card.src}
                    alt=""
                    style={{
                      width: CARD_W,
                      height: 120,
                      objectFit: 'cover',
                      objectPosition: 'bottom',
                      transform: 'scaleY(-1)',
                      display: 'block',
                      filter: 'blur(0px) brightness(0.40)',
                    }}
                    draggable={false}
                  />
                </div>
              ))}

              <div
                onMouseEnter={() => setFanHovered(true)}
                onMouseLeave={() => setFanHovered(false)}
                style={{ position: 'absolute', inset: 0 }}
              >
                {HERO_CARDS.map((card, i) => {
                  const delta = fanHovered ? FAN_HOVER[i] : { dx: 0, dy: 0, dr: 0 };
                  const finalLeft = card.left + delta.dx;
                  const finalTop  = card.top  + delta.dy;
                  const finalRot  = card.rotate + delta.dr;

                  return (
                    <div
                      key={i}
                      className={`hero-fan-entrance-${i + 1}`}
                      style={{
                        position: 'absolute',
                        left: finalLeft,
                        top: finalTop,
                        width: CARD_W,
                        transformOrigin: 'bottom center',
                        zIndex: card.z,
                      }}
                    >
                      <div
                        className="fan-card"
                        style={{
                          transform: `rotate(${finalRot}deg)`,
                          opacity: card.opacity,
                        }}
                      >
                      <div style={{
                        width: CARD_W,
                        height: CARD_H,
                        borderRadius: 20,
                        overflow: 'hidden',
                        boxShadow: i === 1
                          ? '0 30px 85px rgba(124,58,237,0.62), 0 10px 40px rgba(0,0,0,0.95)'
                          : '0 16px 50px rgba(0,0,0,0.80)',
                        border: i === 1
                          ? '1.5px solid rgba(167,139,250,0.52)'
                          : '1px solid rgba(255,255,255,0.10)',
                      }}>
                        <img
                          src={card.src}
                          alt=""
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      </div>

                      <div
                        className="pointer-events-none"
                        aria-hidden="true"
                        style={{
                          width: CARD_W,
                          height: 108,
                          marginTop: 3,
                          overflow: 'hidden',
                          transform: 'scaleY(-1)',
                          opacity: i === 1 ? 0.30 : 0.16,
                          filter: `blur(${i === 1 ? 1.5 : 2.5}px)`,
                          WebkitMaskImage:
                            'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)',
                          maskImage:
                            'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)',
                        }}
                      >
                        <img
                          src={card.src}
                          alt=""
                          style={{
                            width: '100%',
                            height: CARD_H,
                            objectFit: 'cover',
                            objectPosition: 'top',
                          }}
                          draggable={false}
                        />
                      </div>
                    </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="pointer-events-none absolute"
                aria-hidden="true"
                style={{
                  top: 10 + CARD_H + 52,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 650,
                  height: 48,
                  background: 'radial-gradient(ellipse, rgba(124,58,237,0.50) 0%, transparent 70%)',
                  filter: 'blur(18px)',
                  zIndex: 4,
                }}
              />
            </div>
            </div>{/* end hero-fan-scale-wrapper */}
          </div>
        </div>
      </section>
    </>
  );
}

function HomePage() {
  const [fanHovered, setFanHovered] = useState(false);

  const stripRef = useRef(null);
  const slideIndexRef = useRef(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [stripTransition, setStripTransition] = useState(
    `transform ${SHOWCASE.STRIP_MS}ms ${SHOWCASE.STRIP_EASE}`,
  );
  const [slideEntered, setSlideEntered] = useState([false, false, false, false, false]);
  const [heroSoftLanding, setHeroSoftLanding] = useState(false);
  const [heroTick0, setHeroTick0] = useState(0);
  const [heroTick4, setHeroTick4] = useState(0);
  const [s2FanTick, setS2FanTick] = useState(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSlideI = (i: number) => {
    slideIndexRef.current = i;
    setSlideIndex(i);
  };

  /** After landing on slide `idx`, allow entrance CSS */
  const markEntered = (idx: number) => {
    setSlideEntered((prev) => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
    if (idx === 3) setS2FanTick((k) => k + 1);
    if (idx === 0) setHeroTick0((k) => k + 1);
    if (idx === 4) setHeroTick4((k) => k + 1);
  };

  /** Loop jump 4→0: land on real Hero already matching clone end-state (no replay = no visible jump) */
  const resetLoopInstant = () => {
    setHeroSoftLanding(true);
    setStripTransition('none');
    setSlideEntered([false, false, false, false, false]);
    setSlideI(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setStripTransition(`transform ${SHOWCASE.STRIP_MS}ms ${SHOWCASE.STRIP_EASE}`);
        markEntered(0);
      });
    });
  };

  const goNextSlide = () => {
    const i = slideIndexRef.current;
    if (i === 0) setHeroSoftLanding(false);
    if (i < 4) {
      setSlideI(i + 1);
    } else {
      resetLoopInstant();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSlideEntered([true, true, true, true, true]);
      return;
    }
    const t = window.setTimeout(() => markEntered(0), 48);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (!slideEntered[slideIndex]) return;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    const done = SHOWCASE.ENTRANCE_DONE_MS[slideIndex] ?? 1000;
    const idle = SHOWCASE.IDLE_MS[slideIndex] ?? 3500;
    advanceTimerRef.current = window.setTimeout(() => {
      goNextSlide();
    }, done + idle);
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [slideEntered, slideIndex]);

  const onStripTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;
    /* Child hover transitions (fan cards, section 3 faces, etc.) bubble — ignore anything but the strip */
    if (e.target !== e.currentTarget) return;
    markEntered(slideIndexRef.current);
  };

  return (
    <>
      <style>{`
        @keyframes floatCards {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-18px); }
        }
        @keyframes floatBoss {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes s2CardsDrift {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        /* Per-card stagger reveal — inner wrapper only (outer keeps rotation) */
        @keyframes s2CardReveal {
          0%   { opacity: 0; transform: scale(0.85) translateY(20px); }
          100% { opacity: 1; transform: scale(1)    translateY(0px);  }
        }
        .s2-card-reveal-1 { animation: s2CardReveal 0.55s cubic-bezier(.16,1,.3,1) 0.10s both; }
        .s2-card-reveal-2 { animation: s2CardReveal 0.55s cubic-bezier(.16,1,.3,1) 0.25s both; }
        .s2-card-reveal-3 { animation: s2CardReveal 0.55s cubic-bezier(.16,1,.3,1) 0.40s both; }
        .s2-card-reveal-4 { animation: s2CardReveal 0.55s cubic-bezier(.16,1,.3,1) 0.55s both; }
        .s2-card-reveal-5 { animation: s2CardReveal 0.55s cubic-bezier(.16,1,.3,1) 0.70s both; }

        .fan-float    { animation: floatCards   6s   ease-in-out infinite; }
        .boss-float   { animation: floatBoss    4.5s ease-in-out infinite; }
        .s2-fan-drift { animation: s2CardsDrift 5.5s ease-in-out infinite; }

        /* Fan wrapper: hover lift only — no reveal animation on wrapper */
        .s2-cards-fan {
          transition: transform 0.42s cubic-bezier(.34,1.4,.64,1);
        }
        .s2-panel:hover .s2-cards-fan {
          transform: translateY(-10px) scale(1.05);
        }
        .s2-fan-card {
          transition: filter 0.30s ease;
        }
        .s2-panel:hover .s2-fan-card {
          filter: brightness(1.10);
        }

        /* Fan cards: transition on transform so hover spread animates */
        .fan-card {
          transition: transform 0.42s cubic-bezier(.34,1.4,.64,1),
                      opacity   0.30s ease,
                      box-shadow 0.30s ease;
        }
        .glow-purple {
          transition: box-shadow 0.22s, filter 0.22s;
        }
        .glow-purple:hover {
          box-shadow: 0 0 28px rgba(124,58,237,0.7), 0 4px 20px rgba(79,70,229,0.5);
          filter: brightness(1.12);
        }
        .glow-orange {
          transition: box-shadow 0.22s, filter 0.22s;
        }
        .glow-orange:hover {
          box-shadow: 0 0 24px rgba(249,115,22,0.6);
          filter: brightness(1.12);
        }
        .glow-outline {
          transition: box-shadow 0.22s, background 0.22s, border-color 0.22s;
        }
        .glow-outline:hover {
          box-shadow: 0 0 20px rgba(124,58,237,0.36);
          background: rgba(124,58,237,0.1);
          border-color: rgba(139,92,246,0.62);
        }
        .s2-panel {
          transition: transform 0.44s ease, box-shadow 0.44s ease;
        }
        .s2-panel:hover {
          transform: translateY(-5px);
          box-shadow: 0 0 100px rgba(79,70,229,0.3), 0 40px 120px rgba(0,0,0,0.75) !important;
        }
        .s2-boss {
          transition: transform 0.44s ease;
        }
        .s2-panel:hover .s2-boss {
          transform: translateY(-10px) scale(1.02);
        }
        .s2-cards-fan {
          transition: transform 0.4s ease;
        }
        .s2-panel:hover .s2-cards-fan {
          transform: rotate(-5deg) scale(1.07) translateY(-6px);
        }

        /* ── Section 4 — skill tiles ───────────────────────────────── */
        @keyframes s4TileFloat {
          0%, 100% { transform: translateY(0px);   }
          50%       { transform: translateY(-12px); }
        }
        /* Staggered float delays per tile */
        .s4-float-1 { animation: s4TileFloat 4.2s ease-in-out 0.0s infinite; }
        .s4-float-2 { animation: s4TileFloat 4.2s ease-in-out 0.9s infinite; }
        .s4-float-3 { animation: s4TileFloat 4.2s ease-in-out 1.8s infinite; }

        /* Bare icon — no container, only the image + drop-shadow glow */
        .s4-icon {
          display: block;
          cursor: pointer;
          transition: transform 0.34s cubic-bezier(.34,1.4,.64,1),
                      filter  0.34s ease;
        }
        /* Resting glow per element */
        .s4-icon-water  { filter: drop-shadow(0 0 18px rgba(56,189,248,0.62)); }
        .s4-icon-fire   { filter: drop-shadow(0 0 18px rgba(251,113,0,0.68));  }
        .s4-icon-nature { filter: drop-shadow(0 0 16px rgba(52,211,153,0.55)); }

        /* Hover: lift + stronger glow (transform via .s4-icon, filter per element) */
        .s4-icon:hover { transform: scale(1.14) translateY(-10px); }
        .s4-icon-water:hover  { filter: drop-shadow(0 0 32px rgba(56,189,248,0.95)) brightness(1.08); }
        .s4-icon-fire:hover   { filter: drop-shadow(0 0 32px rgba(251,113,0,1.00))  brightness(1.10); }
        .s4-icon-nature:hover { filter: drop-shadow(0 0 32px rgba(52,211,153,0.90)) brightness(1.08); }

        /* ── Section 3 — element cards ─────────────────────────────── */
        .s3-card-face {
          transition: transform 0.38s cubic-bezier(.34,1.4,.64,1),
                      filter 0.38s ease;
          cursor: pointer;
        }
        /* Hover target is the static column — avoids jitter when the card lifts away from the cursor */
        .s3-card-col:hover .s3-card-face {
          transform: translateY(-12px) scale(1.04);
          filter: brightness(1.08);
        }

        /* ═══ Hero slides 0 & 4 — text first, then 3 fan cards L→C→R (entrance only on .hero-fan-entrance-*) ═══ */
        @keyframes heroStaggerUp {
          from { opacity: 0; transform: translate3d(0, 36px, 0); }
          to   { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes heroFanCardIn {
          from { opacity: 0; transform: translate3d(0, 52px, 0) scale(0.9); }
          to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        .showcase-slide-slot[data-showcase-slide="0"]:not([data-entered="true"]) .hero-stagger-headline,
        .showcase-slide-slot[data-showcase-slide="4"]:not([data-entered="true"]) .hero-stagger-headline,
        .showcase-slide-slot[data-showcase-slide="0"]:not([data-entered="true"]) .hero-stagger-subcta,
        .showcase-slide-slot[data-showcase-slide="4"]:not([data-entered="true"]) .hero-stagger-subcta {
          opacity: 0;
          transform: translate3d(0, 40px, 0);
        }
        .showcase-slide-slot[data-showcase-slide="0"]:not([data-entered="true"]) .hero-stagger-fan .hero-fan-entrance-1,
        .showcase-slide-slot[data-showcase-slide="0"]:not([data-entered="true"]) .hero-stagger-fan .hero-fan-entrance-2,
        .showcase-slide-slot[data-showcase-slide="0"]:not([data-entered="true"]) .hero-stagger-fan .hero-fan-entrance-3,
        .showcase-slide-slot[data-showcase-slide="4"]:not([data-entered="true"]) .hero-stagger-fan .hero-fan-entrance-1,
        .showcase-slide-slot[data-showcase-slide="4"]:not([data-entered="true"]) .hero-stagger-fan .hero-fan-entrance-2,
        .showcase-slide-slot[data-showcase-slide="4"]:not([data-entered="true"]) .hero-stagger-fan .hero-fan-entrance-3 {
          opacity: 0;
          transform: translate3d(0, 52px, 0) scale(0.9);
        }
        .showcase-slide-slot[data-showcase-slide="0"][data-entered="true"] .hero-stagger-headline,
        .showcase-slide-slot[data-showcase-slide="4"][data-entered="true"] .hero-stagger-headline {
          animation: heroStaggerUp 0.88s cubic-bezier(0.45, 0, 0.15, 1) 0.06s both;
        }
        .showcase-slide-slot[data-showcase-slide="0"][data-entered="true"] .hero-stagger-subcta,
        .showcase-slide-slot[data-showcase-slide="4"][data-entered="true"] .hero-stagger-subcta {
          animation: heroStaggerUp 0.88s cubic-bezier(0.45, 0, 0.15, 1) 0.22s both;
        }
        /* Per-card fan — left(i=0) → centre → right; skip replay on soft loop landing (slide 0) */
        .showcase-slide-slot[data-showcase-slide="0"][data-entered="true"]:not([data-hero-soft-landing="true"]) .hero-fan-entrance-1,
        .showcase-slide-slot[data-showcase-slide="4"][data-entered="true"] .hero-fan-entrance-1 {
          animation: heroFanCardIn 0.72s cubic-bezier(0.45, 0, 0.15, 1) 0.48s both;
        }
        .showcase-slide-slot[data-showcase-slide="0"][data-entered="true"]:not([data-hero-soft-landing="true"]) .hero-fan-entrance-2,
        .showcase-slide-slot[data-showcase-slide="4"][data-entered="true"] .hero-fan-entrance-2 {
          animation: heroFanCardIn 0.72s cubic-bezier(0.45, 0, 0.15, 1) 0.66s both;
        }
        .showcase-slide-slot[data-showcase-slide="0"][data-entered="true"]:not([data-hero-soft-landing="true"]) .hero-fan-entrance-3,
        .showcase-slide-slot[data-showcase-slide="4"][data-entered="true"] .hero-fan-entrance-3 {
          animation: heroFanCardIn 0.72s cubic-bezier(0.45, 0, 0.15, 1) 0.84s both;
        }
        .showcase-slide-slot[data-showcase-slide="0"][data-hero-soft-landing="true"] .hero-stagger-headline,
        .showcase-slide-slot[data-showcase-slide="0"][data-hero-soft-landing="true"] .hero-stagger-subcta,
        .showcase-slide-slot[data-showcase-slide="0"][data-hero-soft-landing="true"] .hero-fan-entrance-1,
        .showcase-slide-slot[data-showcase-slide="0"][data-hero-soft-landing="true"] .hero-fan-entrance-2,
        .showcase-slide-slot[data-showcase-slide="0"][data-hero-soft-landing="true"] .hero-fan-entrance-3 {
          opacity: 1 !important;
          transform: none !important;
          animation: none !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .showcase-slide-slot[data-showcase-slide="0"] .hero-stagger-headline,
          .showcase-slide-slot[data-showcase-slide="4"] .hero-stagger-headline,
          .showcase-slide-slot[data-showcase-slide="0"] .hero-stagger-subcta,
          .showcase-slide-slot[data-showcase-slide="4"] .hero-stagger-subcta,
          .showcase-slide-slot[data-showcase-slide="0"] .hero-fan-entrance-1,
          .showcase-slide-slot[data-showcase-slide="0"] .hero-fan-entrance-2,
          .showcase-slide-slot[data-showcase-slide="0"] .hero-fan-entrance-3,
          .showcase-slide-slot[data-showcase-slide="4"] .hero-fan-entrance-1,
          .showcase-slide-slot[data-showcase-slide="4"] .hero-fan-entrance-2,
          .showcase-slide-slot[data-showcase-slide="4"] .hero-fan-entrance-3 {
            opacity: 1 !important;
            transform: none !important;
            animation: none !important;
          }
        }

        @keyframes showcasePanelFromLeft {
          from { opacity: 0; transform: translate3d(-8%, 0, 0); }
          to   { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .showcase-s4-panel-anim,
        .showcase-s2-panel-anim {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
        .showcase-slide-slot[data-showcase-slide="1"][data-entered="true"] .showcase-s4-panel-anim {
          animation: showcasePanelFromLeft 1.08s cubic-bezier(0.45, 0, 0.15, 1) forwards;
        }
        .showcase-slide-slot[data-showcase-slide="3"][data-entered="true"] .showcase-s2-panel-anim {
          animation: showcasePanelFromLeft 1.08s cubic-bezier(0.45, 0, 0.15, 1) forwards;
        }

        /* Skills — idle until entered */
        .showcase-slide-slot[data-showcase-slide="1"]:not([data-entered="true"]) .showcase-s4-panel-anim {
          opacity: 0;
          transform: translate3d(-10%, 0, 0);
        }
        .showcase-slide-slot[data-showcase-slide="1"]:not([data-entered="true"]) .showcase-s4-icon-img {
          opacity: 0;
          transform: scale(0.9) translate3d(0, 28px, 0);
        }

        /* Core — entrance wrappers idle (transform only on .showcase-s3-entrance-*); hover only on .s3-card-face */
        .showcase-slide-slot[data-showcase-slide="2"]:not([data-entered="true"]) .showcase-s3-entrance-1,
        .showcase-slide-slot[data-showcase-slide="2"]:not([data-entered="true"]) .showcase-s3-entrance-2,
        .showcase-slide-slot[data-showcase-slide="2"]:not([data-entered="true"]) .showcase-s3-entrance-3 {
          opacity: 0;
          transform: scale(0.9) translate3d(0, 48px, 0);
        }

        /* PvE — panel + fan idle */
        .showcase-slide-slot[data-showcase-slide="3"]:not([data-entered="true"]) .showcase-s2-panel-anim {
          opacity: 0;
          transform: translate3d(-10%, 0, 0);
        }
        .showcase-slide-slot[data-showcase-slide="3"]:not([data-entered="true"]) .s2-fan-card {
          opacity: 0;
        }
        .showcase-slide-slot[data-showcase-slide="3"][data-entered="true"] .s2-fan-card {
          opacity: 1;
          transition: opacity 0.6s cubic-bezier(0.45, 0, 0.15, 1);
        }
        .showcase-slide-slot[data-showcase-slide="3"][data-entered="true"] .s2-fan-card:nth-child(1) { transition-delay: 0.95s; }
        .showcase-slide-slot[data-showcase-slide="3"][data-entered="true"] .s2-fan-card:nth-child(2) { transition-delay: 1.07s; }
        .showcase-slide-slot[data-showcase-slide="3"][data-entered="true"] .s2-fan-card:nth-child(3) { transition-delay: 1.19s; }
        .showcase-slide-slot[data-showcase-slide="3"][data-entered="true"] .s2-fan-card:nth-child(4) { transition-delay: 1.31s; }
        .showcase-slide-slot[data-showcase-slide="3"][data-entered="true"] .s2-fan-card:nth-child(5) { transition-delay: 1.43s; }

        @keyframes showcaseIconPop {
          from { opacity: 0; transform: scale(0.9) translate3d(0, 22px, 0); }
          to   { opacity: 1; transform: scale(1) translate3d(0, 0, 0); }
        }
        .showcase-slide-slot[data-showcase-slide="1"][data-entered="true"] .showcase-s4-icons-cluster > div:nth-child(1) .showcase-s4-icon-img {
          animation: showcaseIconPop 0.74s cubic-bezier(0.45, 0, 0.15, 1) 1.05s both;
        }
        .showcase-slide-slot[data-showcase-slide="1"][data-entered="true"] .showcase-s4-icons-cluster > div:nth-child(2) .showcase-s4-icon-img {
          animation: showcaseIconPop 0.74s cubic-bezier(0.45, 0, 0.15, 1) 1.22s both;
        }
        .showcase-slide-slot[data-showcase-slide="1"][data-entered="true"] .showcase-s4-icons-cluster > div:nth-child(3) .showcase-s4-icon-img {
          animation: showcaseIconPop 0.74s cubic-bezier(0.45, 0, 0.15, 1) 1.38s both;
        }

        /* Section 3 — showcase stagger */
        @keyframes showcaseS3Card {
          from { opacity: 0; transform: scale(0.9) translate3d(0, 36px, 0); }
          to   { opacity: 1; transform: scale(1) translate3d(0, 0, 0); }
        }
        .showcase-slide-slot[data-showcase-slide="2"][data-entered="true"] .showcase-s3-entrance-1 {
          animation: showcaseS3Card 0.72s cubic-bezier(0.45, 0, 0.15, 1) 0.08s both;
        }
        .showcase-slide-slot[data-showcase-slide="2"][data-entered="true"] .showcase-s3-entrance-2 {
          animation: showcaseS3Card 0.72s cubic-bezier(0.45, 0, 0.15, 1) 0.26s both;
        }
        .showcase-slide-slot[data-showcase-slide="2"][data-entered="true"] .showcase-s3-entrance-3 {
          animation: showcaseS3Card 0.72s cubic-bezier(0.45, 0, 0.15, 1) 0.44s both;
        }

        /* Skills / PvE panels — capped via shared token (no 1512+ jump) */
        .showcase-s4-panel-responsive {
          width: 100%;
          max-width: var(--cg-showcase-panel-max, min(100%, 1180px));
          min-height: clamp(328px, 56dvh, 508px);
        }

        .showcase-s2-panel-responsive {
          width: 100%;
          max-width: var(--cg-showcase-panel-max, min(100%, 1180px));
          min-height: clamp(356px, 50dvh, 488px);
        }

        /* Laptop: icon cluster vw matches scaled panel (~980/760 aspect) */
        @media (max-width: 1511px) {
          .showcase-s4-icons-cluster {
            width: clamp(306px, 36vw, 680px);
            height: clamp(237px, 27.94vw, 527px);
          }
        }

        /* ── Responsive: hero fan scale ─────────────────────────────────────────
           The wrapper is separate from .fan-float so the float animation's own
           transform (translateY) is unaffected. Scale anchors at left-center so
           the left card stays in place and the group compresses rightward.       */
        .hero-fan-scale-wrapper {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }
        @media (max-width: 1560px) {
          .hero-fan-scale-wrapper { transform: scale(0.92); transform-origin: left center; }
        }
        @media (max-width: 1480px) {
          .hero-fan-scale-wrapper { transform: scale(0.86); transform-origin: left center; }
        }
        @media (max-width: 1380px) {
          .hero-fan-scale-wrapper { transform: scale(0.72); transform-origin: left center; }
        }
        /* 1024–1279: tighter scale so right card + rotation stays in frame (cards only; glow layer is sibling) */
        @media (min-width: 1024px) and (max-width: 1279px) {
          .hero-fan-scale-wrapper--cards {
            transform: scale(0.625);
            transform-origin: left center;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .hero-fan-scale-wrapper--cards {
            transform: scale(0.5);
            transform-origin: left center;
          }
        }
      `}</style>

      <div
        className="fixed left-0 right-0 bottom-0 z-0 overflow-hidden bg-[#040410]"
        style={{ top: 'var(--navbar-height)' }}
      >
        <div
          ref={stripRef}
          onTransitionEnd={onStripTransitionEnd}
          className="flex flex-col will-change-transform"
          style={{
            transform: `translate3d(0, calc(${slideIndex} * -1 * (100dvh - var(--navbar-height))), 0)`,
            transition: stripTransition,
          }}
        >
          <div
            className="showcase-slide-slot flex-shrink-0 w-full relative"
            style={{ height: SHOWCASE.SLIDE_H }}
            data-showcase-slide={0}
            data-entered={slideEntered[0] ? 'true' : 'false'}
            data-hero-soft-landing={heroSoftLanding ? 'true' : 'false'}
          >
      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════════════════════════════════════ */}
      <ShowcaseHeroSection
        innerKey={heroTick0}
        fanHovered={fanHovered}
        setFanHovered={setFanHovered}
      />
          </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — SKILLS / CTA
      ═══════════════════════════════════════════════════════════════════ */}
          <div
            className="showcase-slide-slot flex-shrink-0 w-full relative"
            style={{ height: SHOWCASE.SLIDE_H }}
            data-showcase-slide={1}
            data-entered={slideEntered[1] ? 'true' : 'false'}
          >
      {/* py reduced at smaller viewports so panel can breathe inside the slide */}
      <section
        className="relative h-full min-h-0 flex flex-col justify-center py-3 lg:py-5 xl:py-8 px-2 md:px-4 overflow-hidden"
        style={{ background: '#040410' }}
      >
        {/* Ambient background glow */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <div style={{
            width: 1200, height: 380,
            background: 'radial-gradient(ellipse, rgba(79,70,229,0.15) 0%, transparent 68%)',
            filter: 'blur(100px)',
          }} />
        </div>

        {/* Cinematic panel — minHeight uses clamp so it never exceeds the slide */}
        <div
          className="showcase-s4-panel-anim showcase-s4-panel-responsive relative mx-auto rounded-[28px] overflow-hidden"
          style={{
            border: '1px solid rgba(139,92,246,0.22)',
            boxShadow:
              '0 0 80px rgba(79,70,229,0.18), 0 40px 120px rgba(0,0,0,0.72)',
          }}
        >
          {/* Battlefield as panel background — raised opacity for visible depth */}
          <img
            src="/images/battlefield.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            style={{ opacity: 0.42 }}
            aria-hidden="true"
            draggable={false}
          />

          {/* Left-heavy overlay — dark on left for text, lighter on right so
              battlefield environment shows through behind the icons */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(to right, rgba(5,3,18,0.96) 0%, rgba(5,3,18,0.82) 28%, rgba(5,3,18,0.38) 50%, rgba(0,0,0,0.05) 100%)',
            }}
          />
          {/* Top + bottom vignette */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(to bottom, rgba(5,3,18,0.50) 0%, transparent 18%, transparent 82%, rgba(5,3,18,0.55) 100%)',
            }}
          />
          {/* Subtle grid texture */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              backgroundImage: `
                linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)
              `,
              backgroundSize: '48px 48px',
            }}
          />

          {/* Panel content row — min-h-0 so it doesn't force the panel taller than its clamp */}
          <div
            className="relative flex flex-col md:flex-row min-h-0"
            style={{ zIndex: 10 }}
          >
            {/* LEFT — copy + CTAs */}
            <div className="flex flex-col justify-center px-6 md:px-8 lg:px-12 xl:px-14 py-5 lg:py-8 xl:py-10 md:w-[48%] shrink-0 gap-6">
              <h2 className="text-3xl md:text-4xl xl:text-[2.875rem] font-black text-white leading-tight">
                Master Skills.<br />
                <span style={{
                  background: 'linear-gradient(90deg, #a78bfa 0%, #818cf8 50%, #60a5fa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Outsmart the Boss.
                </span>
              </h2>

              <p className="text-slate-400 text-base md:text-lg leading-relaxed max-w-sm">
                Choose elemental skills, adapt your strategy, and defeat
                intelligent PvE opponents in dynamic card battles.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="glow-purple px-8 py-3.5 rounded-full text-base font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                >
                  Start Match
                </Link>
                <Link
                  to="/login"
                  className="glow-outline px-8 py-3.5 rounded-full text-base font-bold text-white border border-white/25 backdrop-blur-sm"
                >
                  View Skills
                </Link>
              </div>
            </div>

            {/* RIGHT — 3 staggered floating element icons */}
            <div className="relative flex-1 flex items-center justify-center px-6 py-5 lg:py-7 xl:py-8">

              {/* Atmospheric bloom — scaled to match larger icons */}
              <div
                className="pointer-events-none absolute"
                aria-hidden="true"
                style={{
                  width: 1040, height: 800,
                  background:
                    'radial-gradient(ellipse at 50% 50%, rgba(109,40,217,0.38) 0%, rgba(79,70,229,0.14) 45%, transparent 70%)',
                  filter: 'blur(70px)',
                }}
              />

              {/* Staggered cluster — icons in a loose triangle.
                  Container and icon sizes use clamp() so the group scales with the
                  viewport without any transform-scale layout hacks.
                  Positions are percentages of the container so they stay proportional. */}
              <div
                className="relative showcase-s4-icons-cluster"
                style={{
                  width: 'clamp(320px, 38vw, 720px)',
                  height: 'clamp(248px, 29.5vw, 560px)',
                }}
              >
                {[
                  /* Water — lower-left, tilted left, z behind */
                  { tile: S4_TILES[0], left: '0%',    top: '40.8%', rotate: -10, z: 1 },
                  /* Fire  — center-top, hero icon, z front */
                  { tile: S4_TILES[1], left: '26.5%', top: '0%',    rotate:   3, z: 3 },
                  /* Nature — right, mid-height, z middle */
                  { tile: S4_TILES[2], right: '0%',   top: '25%',   rotate:  11, z: 2 },
                ].map(({ tile, left, top, rotate, right, z }, i) => (
                  /* Outer — static position + rotation */
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left,
                      right,
                      top,
                      zIndex: z,
                      transform: `rotate(${rotate}deg)`,
                    }}
                  >
                    {/* Middle — float animation only */}
                    <div className={tile.floatClass}>
                      <img
                        src={tile.src}
                        alt={tile.label}
                        className={`${tile.iconClass} showcase-s4-icon-img`}
                        style={{
                          width: 'clamp(160px, 18vw, 360px)',
                          height: 'clamp(160px, 18vw, 360px)',
                          objectFit: 'contain',
                        }}
                        draggable={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
          </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — CORE ELEMENTS
      ═══════════════════════════════════════════════════════════════════ */}
          <div
            className="showcase-slide-slot flex-shrink-0 w-full relative"
            style={{ height: SHOWCASE.SLIDE_H }}
            data-showcase-slide={2}
            data-entered={slideEntered[2] ? 'true' : 'false'}
          >
      <section
        className="relative h-full min-h-0 flex flex-col justify-center py-10 px-4 md:px-8 overflow-hidden"
        style={{ background: '#06061a' }}
      >
        {/* Battlefield bg — clearly visible atmospheric depth */}
        <img
          src="/images/battlefield.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ opacity: 0.30 }}
          aria-hidden="true"
          draggable={false}
        />

        {/* Overlay: dark top/bottom vignette, lighter centre so battlefield shows through */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 55%, rgba(79,70,229,0.14) 0%, transparent 65%),' +
              'linear-gradient(to bottom, rgba(6,6,26,0.72) 0%, rgba(6,6,26,0.30) 22%, rgba(6,6,26,0.30) 75%, rgba(6,6,26,0.75) 100%)',
          }}
        />

        {/* Content — gap reduced on smaller viewports to fit three tall cards */}
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center gap-5 lg:gap-8">

          {/* Header copy */}
          <div className="text-center flex flex-col gap-4">
            {/* Heading steps down at md so it doesn't crowd the cards on 768px-height screens */}
            <h2 className="text-3xl md:text-4xl xl:text-[3.5rem] font-black text-white leading-tight tracking-tight">
              Master 3 Core Elements
            </h2>
            <p className="text-slate-400 text-base md:text-lg xl:text-xl leading-relaxed max-w-2xl mx-auto">
              Fire, Water, and Nature each bring unique powers.
              Build your deck around one element — or dare to combine them all.
            </p>
          </div>

          {/* Element cards row — card size uses dvh-based clamp to stay within slide height */}
          <div className="flex flex-col sm:flex-row justify-center items-end gap-6 md:gap-8">
            {S3_CARDS.map((c, i) => (
              <div key={i} className="s3-card-col flex flex-col items-center">
                <div
                  className={`showcase-s3-entrance-${i + 1} flex flex-col items-center`}
                >
                <div
                  className="s3-card-face relative"
                  style={{
                    width: 'clamp(200px, 30dvh, 360px)',
                    height: 'clamp(280px, 42dvh, 504px)',
                    borderRadius: 20,
                    boxShadow: `0 0 60px ${c.glow}, 0 28px 80px rgba(0,0,0,0.90)`,
                  }}
                >
                  {/* Card image */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 20,
                      overflow: 'hidden',
                      border: `2px solid ${c.border}`,
                    }}
                  >
                    <img
                      src={c.src}
                      alt={c.label}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>

                  {/* Top-left specular light catch */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[20px]"
                    aria-hidden="true"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, transparent 48%)',
                    }}
                  />
                </div>

                {/* Ground glow pool */}
                <div
                  className="pointer-events-none"
                  aria-hidden="true"
                  style={{
                    width: 'clamp(155px, 23dvh, 280px)',
                    height: 30,
                    background: `radial-gradient(ellipse at 50% 50%, ${c.under} 0%, transparent 70%)`,
                    filter: 'blur(13px)',
                    marginTop: -10,
                  }}
                />
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
          </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — PvE CHALLENGE BANNER
      ═══════════════════════════════════════════════════════════════════ */}
          <div
            className="showcase-slide-slot flex-shrink-0 w-full relative"
            style={{ height: SHOWCASE.SLIDE_H }}
            data-showcase-slide={3}
            data-entered={slideEntered[3] ? 'true' : 'false'}
          >
      {/* py reduced so the panel fits comfortably inside the slide at 1366×768 */}
      <section
        className="relative h-full min-h-0 flex flex-col justify-center items-center py-5 lg:py-8 xl:py-11 px-2 md:px-4 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #040410 0%, #06061a 100%)' }}
      >
        {/* Section ambient glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div style={{
            width: 1100, height: 280,
            background: 'radial-gradient(ellipse, rgba(79,70,229,0.18) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }} />
        </div>

        {/* ── SECTION-LEVEL boss: full right-half background (behind panel) ── */}

        {/* Purple bloom — soft halo behind the right column */}
        <div
          className="pointer-events-none absolute inset-y-0"
          aria-hidden="true"
          style={{
            right: 0,
            width: '52%',
            background:
              'radial-gradient(ellipse 75% 85% at 78% 50%, rgba(109,40,217,0.42) 0%, rgba(79,70,229,0.12) 45%, transparent 72%)',
            filter: 'blur(48px)',
            zIndex: 0,
          }}
        />

        {/* Right-half crop container — overflow clips black letterboxing from boss.png */}
        <div
          className="pointer-events-none absolute inset-y-0 overflow-hidden"
          aria-hidden="true"
          style={{
            right: 0,
            width: '50%',
            zIndex: 1,
          }}
        >
          <img
            src="/images/boss.png"
            alt=""
            className="pointer-events-none select-none absolute inset-0"
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: '68% 44%',
              transform: 'scale(1.14)',
              transformOrigin: 'right center',
              opacity: 0.52,
              filter: 'blur(0.5px)',
            }}
          />
          {/* Dark + purple blend + hard fade on left edge (no pasted rectangle) */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: [
                'linear-gradient(to left, transparent 0%, rgba(4,4,16,0.15) 28%, rgba(4,4,16,0.72) 62%, rgba(4,4,16,0.96) 88%, rgba(4,4,16,1) 100%)',
                'linear-gradient(to bottom, rgba(6,6,26,0.35) 0%, transparent 22%, transparent 78%, rgba(6,6,26,0.45) 100%)',
                'radial-gradient(ellipse 90% 70% at 88% 45%, rgba(79,70,229,0.25) 0%, transparent 55%)',
              ].join(','),
            }}
          />
        </div>

        {/* Panel — battlefield.png covers the full banner (in front of boss) */}
        <div
          className="showcase-s2-panel-anim showcase-s2-panel-responsive s2-panel relative rounded-3xl overflow-hidden mx-auto"
          style={{
            zIndex: 2,
            backgroundImage: 'url(/images/battlefield.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid rgba(139,92,246,0.24)',
            boxShadow: '0 0 80px rgba(79,70,229,0.20), 0 30px 100px rgba(0,0,0,0.72)',
          }}
        >

          {/* Full-panel dark overlay — heaviest on the left for text legibility */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(to right, rgba(6,3,18,0.96) 0%, rgba(6,3,18,0.88) 28%, rgba(6,3,18,0.55) 48%, rgba(0,0,0,0.12) 100%)',
              zIndex: 1,
            }}
          />

          {/* Top + bottom vignette to tuck edges */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(to bottom, rgba(6,3,18,0.55) 0%, transparent 22%, transparent 78%, rgba(6,3,18,0.70) 100%)',
              zIndex: 2,
            }}
          />

          {/* Grid texture overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              backgroundImage: `
                linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '48px 48px',
              zIndex: 3,
            }}
          />

          {/* Content row — min-h-0 removes the fixed 560px minimum so the panel
              can breathe at 1366×768 where py-6 gives less internal room        */}
          <div className="relative flex flex-col md:flex-row min-h-0" style={{ zIndex: 10 }}>

            {/* LEFT — copy */}
            <div className="flex flex-col justify-center px-8 md:px-11 lg:px-14 py-9 md:w-[44%] shrink-0 gap-5">
              <h2 className="text-2xl md:text-3xl xl:text-[2.55rem] font-black text-white leading-tight">
                Explore Endless<br />
                <span style={{
                  background: 'linear-gradient(90deg, #c4b5fd 0%, #818cf8 50%, #38bdf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  PvE Challenges
                </span>
              </h2>
              <p className="text-slate-400 text-base leading-relaxed max-w-xs">
                Fight evolving bosses, refine your deck, and push your strategy further each round.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/leaderboard"
                  className="glow-purple px-6 py-2.5 rounded-full text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                >
                  Explore Cards
                </Link>
                <Link
                  to="/login"
                  className="glow-outline px-6 py-2.5 rounded-full text-sm font-bold text-white border border-white/25 backdrop-blur-sm"
                >
                  Build Deck
                </Link>
              </div>
            </div>

            {/* RIGHT — boss + card fan */}
            <div className="relative flex-1 min-h-[300px] md:min-h-0">

              {/* Purple/blue atmospheric glow behind boss */}
              <div
                className="absolute pointer-events-none"
                aria-hidden="true"
                style={{
                  right: '6%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 420,
                  height: 420,
                  background:
                    'radial-gradient(ellipse at 50% 50%, rgba(109,40,217,0.65) 0%, rgba(79,70,229,0.30) 40%, transparent 70%)',
                  filter: 'blur(38px)',
                  zIndex: 1,
                }}
              />

              {/* Fan cards — spread in an arc; left cards fully visible,
                  rightmost 2 slide behind boss (z-index < boss z:8).
                  Outer div: owns position + rotation (static).
                  Inner div: owns per-card stagger reveal animation. */}
              <div
                key={s2FanTick}
                className="s2-cards-fan s2-fan-drift absolute inset-0"
                aria-hidden="true"
                style={{ zIndex: 4 }}
              >
                {S2_FAN_CARDS.map((c, i) => (
                  /* Outer — position + rotation, not animated */
                  <div
                    key={i}
                    className="s2-fan-card absolute"
                    style={{
                      right: c.right,
                      top: c.top,
                      width: 'clamp(108px, 9vw, 132px)',
                      height: 'clamp(151px, 12.6vw, 185px)',
                      transform: `rotate(${c.rotate}deg)`,
                      transformOrigin: 'bottom center',
                      zIndex: i + 2,
                      opacity: c.opacity,
                    }}
                  >
                    {/* Inner — stagger reveal (opacity + scale + translateY only) */}
                    <div
                      className={`s2-card-reveal-${i + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '1.5px solid rgba(255,255,255,0.28)',
                        boxShadow:
                          '0 10px 32px rgba(0,0,0,0.90), 0 0 18px rgba(109,40,217,0.40)',
                      }}
                    >
                      <img
                        src={c.src}
                        alt=""
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Boss — clipped to circle so dark corners vanish into the battlefield bg */}
              <div
                className="s2-boss boss-float absolute"
                style={{
                  right: '7%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 'clamp(280px, 22vw, 340px)',
                  height: 'clamp(280px, 22vw, 340px)',
                  zIndex: 8,
                }}
              >
                <img
                  src="/images/boss.png"
                  alt="boss"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    /* clip-path hides the dark square corners of the framed image */
                    clipPath: 'circle(47% at 50% 50%)',
                    filter:
                      'drop-shadow(0 0 44px rgba(109,40,217,0.80)) ' +
                      'drop-shadow(0 0 18px rgba(79,70,229,0.60)) ' +
                      'drop-shadow(0 20px 32px rgba(0,0,0,0.95))',
                  }}
                  draggable={false}
                />
              </div>

              {/* Foreground floor glow under boss */}
              <div
                className="absolute pointer-events-none"
                aria-hidden="true"
                style={{
                  bottom: 0, left: 0, right: 0,
                  height: 90,
                  background:
                    'linear-gradient(to top, rgba(79,70,229,0.26) 0%, transparent 100%)',
                  filter: 'blur(10px)',
                  zIndex: 12,
                }}
              />
            </div>

          </div>
        </div>
      </section>
          </div>

          <div
            className="showcase-slide-slot flex-shrink-0 w-full relative"
            style={{ height: SHOWCASE.SLIDE_H }}
            data-showcase-slide={4}
            data-entered={slideEntered[4] ? 'true' : 'false'}
          >
      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO (forward loop clone after PvE)
      ═══════════════════════════════════════════════════════════════════ */}
      <ShowcaseHeroSection
        innerKey={heroTick4}
        fanHovered={fanHovered}
        setFanHovered={setFanHovered}
      />
          </div>

        </div>
      </div>
    </>
  );
}

export default HomePage;
