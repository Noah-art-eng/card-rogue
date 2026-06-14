import { useEffect, useRef, useState } from 'react'

export type BossVideoMode = 'idle' | 'attack' | 'defeated'

const VIDEO_SRC: Record<BossVideoMode, string> = {
  idle: '/animation/boss-idle.mp4',
  attack: '/animation/boss-attack-2.mp4',
  defeated: '/animation/boss-hit.mp4',
}

const BOSS_SOFT_EDGE_MASK =
  'radial-gradient(ellipse 94% 96% at 50% 55%, black 36%, rgba(0,0,0,0.92) 58%, rgba(0,0,0,0.35) 80%, transparent 97%)'

const BOSS_EDGE_FOG_OVERLAY =
  'radial-gradient(ellipse 102% 100% at 50% 53%, transparent 46%, transparent 62%, rgba(3,8,22,0.38) 79%, rgba(1,5,14,0.88) 100%)'

const FALLBACK_IMG = '/images/boss.png'

interface BossVideoDisplayProps {
  mode: BossVideoMode
  alt?: string
  onAttackEnded?: () => void
  onDefeatedAnimationEnd?: () => void
}

export default function BossVideoDisplay({
  mode,
  alt = 'Boss',
  onAttackEnded,
  onDefeatedAnimationEnd,
}: BossVideoDisplayProps) {
  const [videoFailed, setVideoFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const defeatedEndNotifiedRef = useRef(false)

  const onAttackEndedRef = useRef(onAttackEnded)
  const onDefeatedAnimationEndRef = useRef(onDefeatedAnimationEnd)
  onAttackEndedRef.current = onAttackEnded
  onDefeatedAnimationEndRef.current = onDefeatedAnimationEnd

  useEffect(() => {
    setVideoFailed(false)
    defeatedEndNotifiedRef.current = false
  }, [mode])

  function handleEnded() {
    if (mode === 'attack') {
      queueMicrotask(() => onAttackEndedRef.current?.())
      return
    }
    if (mode === 'defeated') {
      const v = videoRef.current
      if (v && v.duration > 0 && v.currentTime < Math.min(0.5, v.duration * 0.08)) {
        return
      }
      if (!defeatedEndNotifiedRef.current) {
        defeatedEndNotifiedRef.current = true
        queueMicrotask(() => onDefeatedAnimationEndRef.current?.())
      }
      try {
        videoRef.current?.pause()
      } catch {
        /* noop */
      }
    }
  }

  if (videoFailed) {
    return (
      <img
        src={FALLBACK_IMG}
        alt={alt}
        className="battlefield-boss-portrait-img"
        draggable={false}
      />
    )
  }

  const src = VIDEO_SRC[mode]
  const loop = mode === 'idle'

  return (
    <div className="boss-video-display">
      <video
        key={`boss-${mode}-${src}`}
        ref={videoRef}
        src={src}
        muted
        playsInline
        autoPlay
        preload="auto"
        loop={loop}
        className="boss-video-display__video"
        style={{
          WebkitMaskImage: BOSS_SOFT_EDGE_MASK,
          maskImage: BOSS_SOFT_EDGE_MASK,
        }}
        onLoadedData={(e) => {
          const v = e.currentTarget
          try {
            v.currentTime = 0
          } catch {
            /* noop */
          }
          v.play()?.catch(() => {
            setVideoFailed(true)
          })
        }}
        onEnded={handleEnded}
        onError={() => setVideoFailed(true)}
      />
      <div
        className="boss-video-display__fog"
        aria-hidden
        style={{
          background: BOSS_EDGE_FOG_OVERLAY,
          WebkitMaskImage: BOSS_SOFT_EDGE_MASK,
          maskImage: BOSS_SOFT_EDGE_MASK,
        }}
      />
    </div>
  )
}
