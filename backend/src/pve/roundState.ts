import {
  INITIAL_SKILL_ENERGY,
  SHUFFLE_PER_ROUND,
  type RoundState,
  type ShieldState,
} from '../types/state.js'

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

export function createInitialRoundState(): RoundState {
  return createRoundState(INITIAL_SKILL_ENERGY, SHUFFLE_PER_ROUND)
}

export function resetShuffleRemaining(roundState: RoundState): RoundState {
  return {
    ...roundState,
    shuffle: {
      remaining: SHUFFLE_PER_ROUND,
    },
  }
}

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
