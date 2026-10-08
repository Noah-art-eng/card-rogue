/**
 * 战斗页面的短暂提示条。
 * Socket 或操作失败信息由页面传入后，在不打断战斗布局的情况下显示。
 */

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
