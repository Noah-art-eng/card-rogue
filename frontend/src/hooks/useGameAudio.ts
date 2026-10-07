import { useCallback, useEffect, useState } from 'react'

import { gameAudioManager } from '../utils/audioManager'

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

  const unlock = useCallback(() => {
    void gameAudioManager.unlock()
  }, [])

  const toggleMute = useCallback(() => {
    if (!gameAudioManager.isUnlocked()) {
      void gameAudioManager.unlock()
      return
    }
    gameAudioManager.toggleMuted()
  }, [])

  const setVolume = useCallback((volume: number) => {
    gameAudioManager.setVolume(volume)
  }, [])

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
