import { useCallback, useEffect, useState } from 'react'

import { gameAudioManager } from '../utils/audioManager'

// 管理 GameAudio 相关的自定义 Hook 状态与副作用。
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

  // 负责 unlock 的业务处理。
  const unlock = useCallback(() => {
    void gameAudioManager.unlock()
  }, [])

  // 负责 toggleMute 的业务处理。
  const toggleMute = useCallback(() => {
    if (!gameAudioManager.isUnlocked()) {
      void gameAudioManager.unlock()
      return
    }
    gameAudioManager.toggleMuted()
  }, [])

  // 负责 setVolume 的业务处理。
  const setVolume = useCallback((volume: number) => {
    gameAudioManager.setVolume(volume)
  }, [])

  // 负责 setAudioMuted 的业务处理。
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
