import { useState } from 'react'

const BG_VIDEO_SRC = '/animation/battle-feild-animation.mp4'
const FALLBACK_IMG = '/images/battlefield.png'

interface BattlefieldVideoBackgroundProps {
  bossPhaseActive?: boolean
}

export default function BattlefieldVideoBackground({
  bossPhaseActive = false,
}: BattlefieldVideoBackgroundProps) {
  const [videoFailed, setVideoFailed] = useState(false)

  return (
    <>
      <div className="battlefield-video-bg__base" aria-hidden />

      <img
        src={FALLBACK_IMG}
        alt=""
        className={`battlefield__bg-img${videoFailed ? '' : ' battlefield__bg-img--under-video'}`}
        draggable={false}
      />

      {!videoFailed && (
        <div className="battlefield-video-bg__clip" aria-hidden>
          <video
            className="battlefield-video-bg__video"
            src={BG_VIDEO_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
            onLoadedData={(e) => {
              e.currentTarget.play()?.catch(() => setVideoFailed(true))
            }}
          />
        </div>
      )}

      <div className="battlefield-video-bg__vignette" aria-hidden />
      <div
        className={`battlefield-video-bg__grade${bossPhaseActive ? ' battlefield-video-bg__grade--boss' : ''}`}
        aria-hidden
      />
      <div className="battlefield-video-bg__grid" aria-hidden />
    </>
  )
}
