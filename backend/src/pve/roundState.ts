import {
  INITIAL_SKILL_ENERGY,
  SHUFFLE_PER_ROUND,
  type RoundState,
  type ShieldState,
} from '../types/state.js'

// 创建或初始化 RoundState 所需的数据。
export function createRoundState(
  skillEnergyMax = INITIAL_SKILL_ENERGY,
  shuffleRemaining = SHUFFLE_PER_ROUND,
): RoundState {
  return {
    skills: {
      energy: { energy: skillEnergyMax },
      shield: {
        active: false,
        onCooldown: false,
        cooldownRounds: 0,
      },
    },
    shuffle: {
      remaining: shuffleRemaining,
    },
  }
}

// 创建或初始化 InitialRoundState 所需的数据。
export function createInitialRoundState(): RoundState {
  return createRoundState(INITIAL_SKILL_ENERGY, SHUFFLE_PER_ROUND)
}

// 清理或重置 ShuffleRemaining 相关状态。
export function resetShuffleRemaining(roundState: RoundState): RoundState {
  return {
    ...roundState,
    shuffle: {
      remaining: SHUFFLE_PER_ROUND,
    },
  }
}

// 负责 voidShield 的业务处理。
export function voidShield(roundState: RoundState): RoundState {
  return {
    ...roundState,
    skills: {
      ...roundState.skills,
      shield: {
        active: false,
        onCooldown: false,
        cooldownRounds: 0,
      },
    },
  }
}

// 负责 tickShieldCooldown 的业务处理。
export function tickShieldCooldown(shield: ShieldState): ShieldState {
  if (!shield.onCooldown) {
    return shield
  }

  const next = shield.cooldownRounds - 1

  return {
    ...shield,
    cooldownRounds: next,
    onCooldown: next > 0,
  }
}
