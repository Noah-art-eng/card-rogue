import assert from 'node:assert/strict'

import { BossIntent } from '../types/boss.js'
import { HandType, Element } from '../types/card.js'
import { BattleResult, RoundPhase } from '../types/state.js'
import { confirmPlay, playConfirm, resolveComplete, useSkill } from './actions.js'
import { createCard } from './deck.js'
import type { GameContext } from '../types/state.js'
import { createTestBoss, defaultTestBattle, defaultTestBossRound, defaultRoundState } from './testBoss.js'

function createTestContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    ...defaultTestBattle,
    boss: createTestBoss(),
    deck: [],
    discardPile: [],
    hand: [
      createCard(Element.FIRE, 13),
      createCard(Element.WATER, 13),
      createCard(Element.GRASS, 1),
      createCard(Element.FIRE, 2),
      createCard(Element.WATER, 3),
      createCard(Element.GRASS, 4),
      createCard(Element.FIRE, 5),
    ],
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

const playContext = playConfirm({
  ...createTestContext(),
  play: {
    selectedCards: [createCard(Element.FIRE, 13)],
    handType: null,
    score: 0,
  },
})

assert.equal(playContext.phase, RoundPhase.RESOLVE, 'playConfirm: phase should be RESOLVE')
assert.equal(playContext.boss.hp, 500, 'playConfirm: boss hp should not change')
assert.equal(playContext.play.score, 18, 'playConfirm: score should be calculated')
assert.equal(playContext.play.handType, HandType.HIGH_CARD, 'playConfirm: handType should be set')

const bossSurvivesContext = resolveComplete(playContext)

assert.equal(bossSurvivesContext.phase, RoundPhase.BOSS_ATTACK, 'resolveComplete: boss alive phase should be BOSS_ATTACK')
assert.equal(bossSurvivesContext.battleResult, BattleResult.ONGOING, 'resolveComplete: boss alive battleResult should stay ONGOING')
assert.equal(bossSurvivesContext.boss.hp, 482, 'resolveComplete: boss hp should be reduced by play.score')
assert.equal(bossSurvivesContext.totalDamageDealt, 18, 'resolveComplete: totalDamageDealt should accumulate damage')

const lethalPlayContext = playConfirm({
  ...createTestContext({
    boss: createTestBoss({ hp: 10, maxHp: 500 }),
  }),
  play: {
    selectedCards: [
      createCard(Element.FIRE, 13),
      createCard(Element.WATER, 13),
    ],
    handType: null,
    score: 0,
  },
})

assert.equal(lethalPlayContext.boss.hp, 10, 'playConfirm lethal: boss hp should not change yet')

const bossDiesContext = resolveComplete(lethalPlayContext)

assert.equal(bossDiesContext.phase, RoundPhase.RESOLVE, 'resolveComplete lethal: phase should stay RESOLVE')
assert.equal(bossDiesContext.battleResult, BattleResult.WIN, 'resolveComplete lethal: battleResult should be WIN')
assert.equal(bossDiesContext.boss.hp, 0, 'resolveComplete lethal: boss hp should be 0')
assert.ok(bossDiesContext.totalDamageDealt > 0, 'resolveComplete lethal: totalDamageDealt should be tracked')

const fullConfirmContext = confirmPlay({
  ...createTestContext(),
  play: {
    selectedCards: [createCard(Element.FIRE, 13)],
    handType: null,
    score: 0,
  },
})

assert.equal(fullConfirmContext.phase, RoundPhase.BOSS_ATTACK, 'confirmPlay: boss alive should end at BOSS_ATTACK')

// ---- P1-T5: confirmPlay rejects > 5 selected cards ----

assert.throws(
  () => confirmPlay({
    ...createTestContext(),
    phase: RoundPhase.PLAY,
    play: {
      selectedCards: [
        createCard(Element.FIRE, 1),
        createCard(Element.FIRE, 2),
        createCard(Element.FIRE, 3),
        createCard(Element.FIRE, 4),
        createCard(Element.FIRE, 5),
        createCard(Element.FIRE, 6),
      ],
      handType: null,
      score: 0,
    },
  }),
  /more than 5/i,
  'confirmPlay should reject > 5 selected cards',
)

// ---- P1-T4: skillWarning — invalid skill params do NOT deduct energy ----

const skillCtx = createTestContext({ phase: RoundPhase.SKILL })

// changeColor: missing cardId — should throw, energy must be unchanged
assert.throws(
  () => useSkill(skillCtx, 'changeColor', { targetElement: Element.FIRE }),
  /cardId/i,
  'changeColor: missing cardId should throw',
)
assert.equal(skillCtx.roundState.skills.energy.energy, 3, 'changeColor: energy unchanged after invalid call')

// changeColor: invalid targetElement — should throw, energy must be unchanged
assert.throws(
  () => useSkill(skillCtx, 'changeColor', { cardId: 'FIRE_13', targetElement: 'INVALID' as Element }),
  /targetElement/i,
  'changeColor: invalid element should throw',
)
assert.equal(skillCtx.roundState.skills.energy.energy, 3, 'changeColor: energy unchanged after invalid element')

// changeRank: missing cardId — should throw
assert.throws(
  () => useSkill(skillCtx, 'changeRank', { targetRank: 7 }),
  /cardId/i,
  'changeRank: missing cardId should throw',
)
assert.equal(skillCtx.roundState.skills.energy.energy, 3, 'changeRank: energy unchanged after missing cardId')

// changeRank: out-of-range rank — should throw
assert.throws(
  () => useSkill(skillCtx, 'changeRank', { cardId: 'FIRE_13', targetRank: 14 }),
  /targetRank/i,
  'changeRank: out-of-range rank should throw',
)
assert.equal(skillCtx.roundState.skills.energy.energy, 3, 'changeRank: energy unchanged after invalid rank')

console.log('actions tests passed')
