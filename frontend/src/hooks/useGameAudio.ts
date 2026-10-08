/**
 * 页面使用全局音频管理器的 React Hook。
 * 它把解锁音频、播放音效、静音和音量控制包装成稳定回调，并订阅静音状态更新界面。
 */

import { useCallback, useEffect, useState } from 'react'

import { gameAudioManager } from '../utils/audioManager'

// 向页面提供统一的音效播放、静音和音量控制入口。
export function useGameAudio() {
  const [muted, setMuted] = useState(() => gameAudioManager.isMuted())

  useEffect(() => {
    return gameAudioManager.subscribe(setMuted)
  }, [])

  useEffect(() => {
    return () => {
      gameAudioManager.stopBgm()
    }
  }, [])

  // 在用户手势触发后恢复音频上下文，解除浏览器自动播放限制。
  const unlock = useCallback(() => {
    void gameAudioManager.unlock()
  }, [])

  // 切换全局静音状态，并同步保存用户偏好。
  const toggleMute = useCallback(() => {
    if (!gameAudioManager.isUnlocked()) {
      void gameAudioManager.unlock()
      return
    }
    gameAudioManager.toggleMuted()
  }, [])

// 将滑块值交给全局音频管理器，让所有后续音效使用同一音量设置。
  const setVolume = useCallback((volume: number) => {
    gameAudioManager.setVolume(volume)
  }, [])

  // 将指定静音状态写入音频管理器和本地偏好。
  const setAudioMuted = useCallback((nextMuted: boolean) => {
    void gameAudioManager.unlock()
    gameAudioManager.setMuted(nextMuted)
  }, [])

  return {
    muted,
    volume: gameAudioManager.getVolume(),
    unlock,
    toggleMute,
    setVolume,
    setMuted: setAudioMuted,
    playSelect: useCallback(() => gameAudioManager.playSelect(), []),
    playDiscard: useCallback(() => gameAudioManager.playDiscard(), []),
    playPlay: useCallback(() => gameAudioManager.playPlay(), []),
    playSkillShield: useCallback(() => gameAudioManager.playSkillShield(), []),
    playSkillChange: useCallback(() => gameAudioManager.playSkillChange(), []),
    playBgm: useCallback(() => gameAudioManager.playBgm(), []),
    stopBgm: useCallback(() => gameAudioManager.stopBgm(), []),
  }
}
