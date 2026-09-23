interface GameToastProps {
  message: string
}

// 渲染 GameToast 界面组件。
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
