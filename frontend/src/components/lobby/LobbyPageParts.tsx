const iconSm = 'h-[1.125rem] w-[1.125rem] shrink-0'
const iconHeader = 'h-[1.35rem] w-[1.35rem] shrink-0 text-violet-50 sm:h-[1.5rem] sm:w-[1.5rem]'

export function LobbyIconHome({ active, iconClass }: { active?: boolean; iconClass?: string }) {
  const c = iconClass ?? iconSm
  if (active) {
    return (
      <svg className={`${c} opacity-[0.98]`} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M12 3.4 4 10.25V21h5.85v-6.7h4.3V21H20v-10.75L12 3.4z"
        />
      </svg>
    )
  }
  return (
    <svg
      className={`${c} opacity-[0.92]`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 10.4 12 4.2l8.5 6.2v9.8h-5v-6.2H8.5v6.2h-5v-9.8z" />
    </svg>
  )
}

export function LobbyIconLeaderboard({ iconClass }: { iconClass?: string }) {
  const c = iconClass ?? iconSm
  return (
    <svg
      className={`${c} opacity-[0.92]`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 9V7.5A3.5 3.5 0 0111.5 4h1A3.5 3.5 0 0116 7.5V9" />
      <path d="M6 9h12v2.5a5 5 0 01-10 0V9" />
      <path d="M17 9h1.6a1.5 1.5 0 010 3H17M7 9H5.4a1.5 1.5 0 100 3H7" />
      <path d="M11 14l-1 7h4l-1-7M9 21h6" />
    </svg>
  )
}

export function LobbyIconProfile({ iconClass }: { iconClass?: string }) {
  const c = iconClass ?? iconSm
  return (
    <svg
      className={`${c} opacity-[0.92]`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8.75" r="3.25" />
      <path d="M6.25 20v-.75c0-3 2.65-5.5 5.75-5.5s5.75 2.5 5.75 5.5v.75" />
    </svg>
  )
}

export function LobbyIconAchievements({ iconClass }: { iconClass?: string }) {
  const c = iconClass ?? iconSm
  return (
    <svg
      className={`${c} opacity-[0.88]`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s6.5-3.2 8.5-8.2V7L12 4 3.5 7v5.8C5.5 17.8 12 21 12 21z" />
      <path d="M12 9.2l.95 2.2h2.4l-1.95 1.35.75 2.35L12 14l-2.15 1.5.75-2.35L8.65 11.4h2.4L12 9.2z" />
    </svg>
  )
}

export function LobbyIconSettings({ iconClass }: { iconClass?: string }) {
  const c = iconClass ?? iconSm
  return (
    <svg
      className={`${c} opacity-[0.88]`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2.3M12 20.7V23M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M1 12h2.3M20.7 12H23M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </svg>
  )
}

export function LobbyIconLogout({ iconClass }: { iconClass?: string }) {
  const c = iconClass ?? iconSm
  return (
    <svg
      className={`${c} opacity-[0.9]`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export function LobbyIconBell({ iconClass }: { iconClass?: string }) {
  const c = iconClass ?? iconHeader
  return (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function LobbyIconBrightness({ iconClass }: { iconClass?: string }) {
  const c = iconClass ?? iconHeader
  return (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4.25" />
      <path d="M12 1.75v2.85M12 19.4v2.85M4.22 4.22l2 2M17.78 17.78l2 2M1.75 12h2.85M19.4 12h2.85M4.22 19.78l2-2M17.78 6.22l2-2" />
    </svg>
  )
}

export function LobbyPremiumCta({
  label,
  variant = 'solo',
}: {
  label: string
  variant?: 'solo' | 'rogue'
}) {
  const isRogue = variant === 'rogue'
  const diamondClass = isRogue
    ? 'border-amber-100/85 bg-amber-400/25 shadow-[0_0_10px_rgba(251,191,36,0.45)]'
    : 'border-violet-100/80 bg-violet-400/20 shadow-[0_0_8px_rgba(196,181,254,0.55)]'
  const lineClass = isRogue ? 'from-amber-200/70' : 'from-violet-200/65'
  const viaClass = isRogue ? 'via-amber-200/38' : 'via-sky-200/35'
  const chevronGlow = isRogue
    ? 'drop-shadow-[0_0_10px_rgba(251,191,36,0.55)]'
    : 'drop-shadow-[0_0_10px_rgba(196,181,254,0.5)]'

  return (
    <span
      className={`lobby-solo-cta-btn lobby-premium-cta ${isRogue ? 'lobby-premium-cta--amber' : 'lobby-premium-cta--violet'} relative z-[2] flex w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-2xl py-[0.95rem] pl-3 pr-2.5 sm:gap-2 sm:py-4 sm:pl-6 sm:pr-4 md:pl-8 md:pr-5`}
    >
      <span className="lobby-premium-cta__bloom" aria-hidden />
      <span
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-px bg-gradient-to-r from-transparent to-transparent ${viaClass}`}
      />
      <span className="relative z-[2] flex shrink-0 items-center gap-1.5 sm:gap-2" aria-hidden>
        <span
          className={`hidden h-px w-6 bg-gradient-to-l to-transparent sm:block sm:w-9 md:w-11 min-[1512px]:w-14 ${lineClass}`}
        />
        <span
          className={`h-1.5 w-1.5 shrink-0 rotate-45 border sm:h-2 sm:w-2 ${diamondClass}`}
        />
      </span>
      <span className="relative z-[2] min-w-0 flex-1 select-none text-center font-serif text-[0.58rem] font-semibold uppercase leading-snug tracking-[0.1em] text-white sm:text-[0.65rem] sm:tracking-[0.14em] md:text-xs md:tracking-[0.18em] lg:text-[0.7rem] xl:text-sm xl:tracking-[0.22em] min-[1512px]:text-[0.95rem] min-[1512px]:tracking-[0.26em]">
        {label}
      </span>
      <span className="relative z-[2] flex shrink-0 items-center gap-1.5 sm:gap-2" aria-hidden>
        <span
          className={`h-1.5 w-1.5 shrink-0 rotate-45 border sm:h-2 sm:w-2 ${diamondClass}`}
        />
        <span
          className={`hidden h-px w-6 bg-gradient-to-r to-transparent sm:block sm:w-9 md:w-11 min-[1512px]:w-14 ${lineClass}`}
        />
        <span
          className={`pl-0.5 text-[1.05rem] font-medium leading-none text-white/92 sm:pl-1 sm:text-[1.2rem] ${chevronGlow}`}
        >
          ›
        </span>
      </span>
    </span>
  )
}
