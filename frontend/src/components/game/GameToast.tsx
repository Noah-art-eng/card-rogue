interface GameToastProps {
  message: string
}

export default function GameToast({ message }: GameToastProps) {
  if (!message) {
    return null
  }

  return (
    <div className="game-toast">
      {message}
    </div>
  )
}
