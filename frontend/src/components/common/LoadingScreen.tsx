interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export default function LoadingScreen({
  message = 'Preparing battle…',
  fullScreen = true,
}: LoadingScreenProps) {
  return (
    <div
      className={`cg-loading-screen${fullScreen ? ' cg-loading-screen--fullscreen' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div className="cg-loading-screen__backdrop" aria-hidden />
      <div className="cg-loading-screen__glow cg-loading-screen__glow--a" aria-hidden />
      <div className="cg-loading-screen__glow cg-loading-screen__glow--b" aria-hidden />

      <div className="cg-loading-screen__content">
        <img
          src="/logo/logo-icon-transparent.png"
          alt=""
          className="cg-loading-screen__logo"
          draggable={false}
          width={72}
          height={72}
        />
        <h2 className="cg-loading-screen__title">Card Rogue</h2>
        <p className="cg-loading-screen__message">{message}</p>
        <div className="cg-loading-screen__bar" aria-hidden>
          <span className="cg-loading-screen__bar-fill" />
        </div>
      </div>
    </div>
  )
}
