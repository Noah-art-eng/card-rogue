interface GameToastProps {
  message: string
}

// 在战斗页面短暂展示服务端操作失败或状态提示。
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
