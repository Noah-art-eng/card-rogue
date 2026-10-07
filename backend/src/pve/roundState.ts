import {
  INITIAL_SKILL_ENERGY,
  SHUFFLE_PER_ROUND,
  type RoundState,
  type ShieldState,
} from '../types/state.js'

// 创建每回合独立维护的技能、洗牌和护盾状态。
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

// 创建新对局首回合使用的默认回合状态。
export function createInitialRoundState(): RoundState {
  return createRoundState(INITIAL_SKILL_ENERGY, SHUFFLE_PER_ROUND)
}

// 回合开始时恢复本回合可用的洗牌次数。
export function resetShuffleRemaining(roundState: RoundState): RoundState {
  return {
    ...roundState,
    shuffle: {
      remaining: SHUFFLE_PER_ROUND,
    },
  }
}

// 胜利或重开时移除护盾，避免上一场防御状态带入下一场。
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

// 每回合推进护盾冷却，冷却结束后才允许再次施放。
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
