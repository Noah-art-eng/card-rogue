import assert from 'node:assert/strict'

import { INITIAL_SKILL_ENERGY, RoundPhase } from '../types/state.js'
import { advanceRound, useSkill } from './actions.js'
import { createTestBoss, defaultTestBattle, defaultTestBossRound, defaultRoundState } from './testBoss.js'
import type { GameContext } from '../types/state.js'

function createSkillContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    ...defaultTestBattle,
    phase: RoundPhase.SKILL,
    boss: createTestBoss(),
    deck: [],
    discardPile: [],
    hand: [],
    play: {
      selectedCards: [],
      handType: null,
      score: 0,
    },
    bossRound: { ...defaultTestBossRound },
    roundState: { ...defaultRoundState },
    ...overrides,
  }
}

assert.equal(
  createSkillContext().roundState.skills.energy.energy,
  INITIAL_SKILL_ENERGY,
  'initial energy should be 3',
)

const firstUse = useSkill(createSkillContext(), 'shield')
assert.equal(firstUse.roundState.skills.energy.energy, 2, 'first shield use should cost 1 energy')
assert.equal(firstUse.roundState.skills.shield.active, true, 'shield should activate')

const secondUse = useSkill(
  {
    ...firstUse,
    roundState: {
      ...firstUse.roundState,
      skills: {
        ...firstUse.roundState.skills,
        shield: { active: false, onCooldown: false, cooldownRounds: 0 },
      },
    },
  },
  'shield',
)
assert.equal(secondUse.roundState.skills.energy.energy, 1, 'second shield use should leave 1 energy')

const thirdUse = useSkill(
  {
    ...secondUse,
    roundState: {
      ...secondUse.roundState,
      skills: {
        ...secondUse.roundState.skills,
        shield: { active: false, onCooldown: false, cooldownRounds: 0 },
      },
    },
  },
  'shield',
)
assert.equal(thirdUse.roundState.skills.energy.energy, 0, 'third shield use should leave 0 energy')

assert.throws(
  () => useSkill(thirdUse, 'shield'),
  /Not enough energy/,
  'shield use should be rejected at 0 energy',
)

const afterRound = advanceRound(
  createSkillContext({
    phase: RoundPhase.ROUND_END,
    round: 1,
    roundState: {
      ...defaultRoundState,
      skills: {
        energy: { energy: 1 },
        shield: { active: false, onCooldown: false, cooldownRounds: 0 },
      },
    },
  }),
)

assert.equal(afterRound.roundState.skills.energy.energy, 1, 'advanceRound should preserve energy')
assert.equal(afterRound.roundState.shuffle.remaining, 2, 'advanceRound should still reset shuffle')

console.log('skillEnergy tests passed')
