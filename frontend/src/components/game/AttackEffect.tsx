import { useEffect, useState } from 'react'

import type { AttackEffectMode } from '../../lib/attackEffectMode'

const ATTACK_EFFECT_META: Record<
  AttackEffectMode,
  { label: string; particles: number }
> = {
  normal: { label: 'Multi-Slash', particles: 28 },
  fire: { label: 'Lava Eruption', particles: 42 },
  water: { label: 'Abyssal Vortex', particles: 44 },
  nature: { label: 'Root Impale', particles: 42 },
}

const SPRITE_EFFECTS: Record<
  AttackEffectMode,
  { sheet: string; top: string; scale: number; fps: number }
> = {
  normal: {
    sheet: '/effects/normal-c-sheet.png',
    top: '50%',
    scale: 1.05,
    fps: 24,
  },
  fire: {
    sheet: '/effects/fire-a-sheet.png',
    top: '58%',
    scale: 1.16,
    fps: 22,
  },
  water: {
    sheet: '/effects/water-b-sheet.png',
    top: '52%',
    scale: 1.15,
    fps: 24,
  },
  nature: {
    sheet: '/effects/nature-b-sheet.png',
    top: '58%',
    scale: 1.14,
    fps: 22,
  },
}

function SpriteSheetEffect({ mode }: { mode: AttackEffectMode }) {
  const sprite = SPRITE_EFFECTS[mode] ?? SPRITE_EFFECTS.normal
  const [frame, setFrame] = useState(0)
  const frameSize = 512
  const columns = 4
  const frames = 16
  const x = frame % columns
  const y = Math.floor(frame / columns)

  useEffect(() => {
    setFrame(0)

    const timer = window.setInterval(() => {
      setFrame((current) => {
        if (current >= frames - 1) {
          window.clearInterval(timer)
          return current
        }
        return current + 1
      })
    }, 1000 / sprite.fps)

    return () => window.clearInterval(timer)
  }, [mode, sprite.fps])

  return (
    <div
      className="attack-effect__sprite"
      style={{
        ['--sprite-top' as string]: sprite.top,
        ['--sprite-scale' as string]: String(sprite.scale),
        width: frameSize,
        height: frameSize,
        backgroundImage: `url(${sprite.sheet})`,
        backgroundSize: `${frameSize * columns}px ${frameSize * columns}px`,
        backgroundPosition: `-${x * frameSize}px -${y * frameSize}px`,
      }}
    />
  )
}

interface AttackEffectProps {
  mode: AttackEffectMode
  visible: boolean
}

export default function AttackEffect({ mode, visible }: AttackEffectProps) {
  if (!visible) return null

  const meta = ATTACK_EFFECT_META[mode] ?? ATTACK_EFFECT_META.normal
  const particles = Array.from({ length: meta.particles })

  return (
    <div className={`attack-effect attack-effect--${mode}`}>
      <div className="attack-effect__label">{meta.label}</div>
      <div className="attack-effect__flash" />
      <div className="attack-effect__ring attack-effect__ring--one" />
      <div className="attack-effect__ring attack-effect__ring--two" />
      <SpriteSheetEffect mode={mode} />

      {mode === 'normal' && (
        <>
          <div className="attack-effect__slash attack-effect__slash--one" />
          <div className="attack-effect__slash attack-effect__slash--two" />
          <div className="attack-effect__slash attack-effect__slash--three" />
          <div className="attack-effect__slash attack-effect__slash--four" />
          <div className="attack-effect__shockline attack-effect__shockline--one" />
          <div className="attack-effect__shockline attack-effect__shockline--two" />
          <div className="attack-effect__blade-burst" />
        </>
      )}

      {mode === 'fire' && (
        <>
          <div className="attack-effect__ground-crack" />
          <div className="attack-effect__lava-burst attack-effect__lava-burst--one" />
          <div className="attack-effect__lava-burst attack-effect__lava-burst--two" />
          <div className="attack-effect__lava-burst attack-effect__lava-burst--three" />
          <div className="attack-effect__flame attack-effect__flame--one" />
          <div className="attack-effect__flame attack-effect__flame--two" />
          <div className="attack-effect__flame attack-effect__flame--three" />
        </>
      )}

      {mode === 'water' && (
        <>
          <div className="attack-effect__abyss-vortex" />
          <div className="attack-effect__vortex-core" />
          <div className="attack-effect__vortex-ring attack-effect__vortex-ring--one" />
          <div className="attack-effect__vortex-ring attack-effect__vortex-ring--two" />
          <div className="attack-effect__vortex-ring attack-effect__vortex-ring--three" />
          <div className="attack-effect__foam attack-effect__foam--one" />
          <div className="attack-effect__foam attack-effect__foam--two" />
          <div className="attack-effect__wave attack-effect__wave--one" />
          <div className="attack-effect__wave attack-effect__wave--two" />
          <div className="attack-effect__wave attack-effect__wave--three" />
        </>
      )}

      {mode === 'nature' && (
        <>
          <div className="attack-effect__root-slam attack-effect__root-slam--one" />
          <div className="attack-effect__root-slam attack-effect__root-slam--two" />
          <div className="attack-effect__vine attack-effect__vine--one" />
          <div className="attack-effect__vine attack-effect__vine--two" />
          <div className="attack-effect__vine attack-effect__vine--three" />
          <div className="attack-effect__bloom" />
        </>
      )}

      <div className="attack-effect__particles">
        {particles.map((_, index) => (
          <span
            key={index}
            style={{
              ['--i' as string]: index,
              ['--angle' as string]: `${(360 / meta.particles) * index}deg`,
              ['--distance' as string]: `${86 + (index % 5) * 18}px`,
              ['--delay' as string]: `${(index % 6) * 0.035}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
