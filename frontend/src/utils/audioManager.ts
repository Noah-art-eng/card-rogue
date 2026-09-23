type SfxKey = 'select' | 'discard' | 'play' | 'skillShield' | 'skillChange'

const AUDIO_PATHS: Record<SfxKey | 'bgm', string> = {
  select: '/audio/select.ogg',
  discard: '/audio/discard.ogg',
  play: '/audio/play.ogg',
  skillShield: '/audio/skill_shield.ogg',
  skillChange: '/audio/skill_change.ogg',
  bgm: '/audio/bgm.mp3',
}

const STORAGE_MUTED = 'cg-game-audio-muted'
const STORAGE_VOLUME = 'cg-game-audio-volume'
const STORAGE_MUTED_SCHEMA = 'cg-game-audio-muted-schema'
const MUTED_SCHEMA_VERSION = '2'
const MIN_SFX_INTERVAL_MS = 45

// 负责 migrateMutedPreference 的业务处理。
function migrateMutedPreference(): void {
  try {
    if (localStorage.getItem(STORAGE_MUTED_SCHEMA) === MUTED_SCHEMA_VERSION) return
    // v2: default unmuted; drop legacy values that may have been written incorrectly.
    localStorage.removeItem(STORAGE_MUTED)
    localStorage.setItem(STORAGE_MUTED_SCHEMA, MUTED_SCHEMA_VERSION)
  } catch {
    // ignore storage failures
  }
}

// 获取、计算或校验 MutedPreference。
function readMutedPreference(): boolean {
  try {
    migrateMutedPreference()
    return localStorage.getItem(STORAGE_MUTED) === 'true'
  } catch {
    return false
  }
}

// 获取、计算或校验 VolumePreference。
function readVolumePreference(): number {
  try {
    const raw = localStorage.getItem(STORAGE_VOLUME)
    if (!raw) return 1
    const value = Number.parseFloat(raw)
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1
  } catch {
    return 1
  }
}

// 负责 persistUserMutedPreference 的业务处理。
function persistUserMutedPreference(muted: boolean): void {
  try {
    if (muted) {
      localStorage.setItem(STORAGE_MUTED, 'true')
    } else {
      localStorage.removeItem(STORAGE_MUTED)
    }
    localStorage.setItem(STORAGE_MUTED_SCHEMA, MUTED_SCHEMA_VERSION)
  } catch {
    // ignore storage failures
  }
}

class GameAudioManager {
  private unlocked = false
  private muted = readMutedPreference()
  private sfxVolume = readVolumePreference()
  private readonly bgmVolume = 0.35
  private readonly sfx = {} as Record<SfxKey, HTMLAudioElement>
  private readonly bgm: HTMLAudioElement
  private readonly lastSfxAt: Partial<Record<SfxKey, number>> = {}
  private readonly listeners = new Set<(muted: boolean) => void>()

  constructor() {
    ;(['select', 'discard', 'play', 'skillShield', 'skillChange'] as SfxKey[]).forEach(
      (key) => {
        const audio = new Audio(AUDIO_PATHS[key])
        audio.preload = 'auto'
        this.sfx[key] = audio
      },
    )

    this.bgm = new Audio(AUDIO_PATHS.bgm)
    this.bgm.loop = true
    this.bgm.preload = 'auto'
    this.bgm.volume = this.bgmVolume
  }

  // 负责 subscribe 的业务处理。
  subscribe(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // 负责 notifyMutedChange 的业务处理。
  private notifyMutedChange(): void {
    for (const listener of this.listeners) {
      listener(this.muted)
    }
  }

  // 获取、计算或校验 Muted。
  isMuted(): boolean {
    return this.muted
  }

  // 获取、计算或校验 Unlocked。
  isUnlocked(): boolean {
    return this.unlocked
  }

  // 获取、计算或校验 Volume。
  getVolume(): number {
    return this.sfxVolume
  }

  // 执行 Volume 相关处理。
  setVolume(volume: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, volume))
    try {
      localStorage.setItem(STORAGE_VOLUME, String(this.sfxVolume))
    } catch {
      // ignore storage failures
    }
  }

  /** Update runtime mute state without touching persisted user preference. */
  private applyMuted(muted: boolean): void {
    this.muted = muted
    if (muted) {
      this.stopBgm()
    } else if (this.unlocked) {
      void this.playBgm()
    }
    this.notifyMutedChange()
  }

  /** Explicit user preference change (mute button). */
  setMuted(muted: boolean): void {
    this.applyMuted(muted)
    persistUserMutedPreference(muted)
  }

  // 执行 Muted 相关处理。
  toggleMuted(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  // 负责 unlock 的业务处理。
  async unlock(): Promise<void> {
    if (this.unlocked) {
      if (!this.muted) {
        void this.playBgm()
      }
      return
    }

    this.unlocked = true

    try {
      this.bgm.muted = true
      await this.bgm.play()
      this.bgm.pause()
      this.bgm.currentTime = 0
      this.bgm.muted = false
    } catch {
      // browser may still block until a direct gesture; ignore
    }

    if (!this.muted) {
      void this.playBgm()
    }
  }

  // 执行 Sfx 相关处理。
  private playSfx(key: SfxKey): void {
    if (this.muted) return

    const now = Date.now()
    const lastAt = this.lastSfxAt[key] ?? 0
    if (now - lastAt < MIN_SFX_INTERVAL_MS) return
    this.lastSfxAt[key] = now

    const audio = this.sfx[key]
    audio.volume = this.sfxVolume
    audio.currentTime = 0
    void audio.play().catch(() => {})
  }

  // 执行 Select 相关处理。
  playSelect(): void {
    this.playSfx('select')
  }

  // 执行 Discard 相关处理。
  playDiscard(): void {
    this.playSfx('discard')
  }

  // 执行 Play 相关处理。
  playPlay(): void {
    this.playSfx('play')
  }

  // 执行 SkillShield 相关处理。
  playSkillShield(): void {
    this.playSfx('skillShield')
  }

  // 执行 SkillChange 相关处理。
  playSkillChange(): void {
    this.playSfx('skillChange')
  }

  // 执行 Bgm 相关处理。
  playBgm(): Promise<void> {
    if (this.muted || !this.unlocked) {
      return Promise.resolve()
    }

    this.bgm.volume = this.bgmVolume
    if (!this.bgm.paused && this.bgm.currentTime > 0) {
      return Promise.resolve()
    }

    return this.bgm.play().catch(() => {})
  }

  // 负责 stopBgm 的业务处理。
  stopBgm(): void {
    this.bgm.pause()
    this.bgm.currentTime = 0
  }
}

export const gameAudioManager = new GameAudioManager()
