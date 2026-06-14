import assert from 'node:assert/strict'

import { BossIntent } from '../types/boss.js'
import { BattleResult, RoundPhase } from '../types/state.js'
import {
  advanceRound,
  confirmPlay,
  doBossAttackComplete,
  enterPlay,
  resolveComplete,
} from './actions.js'
import {
  buildBossRoundState,
  calculateChargeAttack,
  generateBossTelegraph,
} from './boss.js'
import { createCard } from './deck.js'
import { Element } from '../types/card.js'
import type { GameContext } from '../types/state.js'
import { createTestBoss, defaultTestBattle, defaultTestBossRound, defaultRoundState } from './testBoss.js'

function createBossContext(overrides: Partial<GameContext> = {}): GameContext {
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

assert.equal(calculateChargeAttack(3), 6, 'chargeAttack should use floor(attackPerRound * 2.2)')

const defendTelegraph = buildBossRoundState(BossIntent.DEFEND)
assert.equal(defendTelegraph.intent, BossIntent.DEFEND, 'telegraph should roll DEFEND')
assert.equal(defendTelegraph.isDefending, true, 'DEFEND telegraph should set isDefending immediately')

const defendSkill = createBossContext({
  phase: RoundPhase.SKILL,
  bossRound: defendTelegraph,
})
const defendPlay = enterPlay(defendSkill)
const defendConfirm = confirmPlay({
  ...defendPlay,
  play: {
    selectedCards: [
      createCard(Element.FIRE, 13),
      createCard(Element.WATER, 13),
    ],
    handType: null,
    score: 0,
  },
})

assert.equal(defendConfirm.boss.hp, 464, 'DEFEND same round confirmPlay should halve damage')
assert.equal(defendConfirm.bossRound.isDefending, true, 'isDefending should remain true until round end')

const defendBossAttack = doBossAttackComplete({
  ...defendConfirm,
  phase: RoundPhase.BOSS_ATTACK,
})

assert.equal(defendBossAttack.player.hp, 100, 'DEFEND should not damage player')
assert.equal(defendBossAttack.phase, RoundPhase.ROUND_END, 'DEFEND should end at ROUND_END')

const clearedTelegraph = generateBossTelegraph(defendBossAttack, BossIntent.ATTACK)
assert.equal(clearedTelegraph.isDefending, false, 'next round telegraph should not carry defend buff')

const defendedResolve = resolveComplete({
  ...createBossContext({
    phase: RoundPhase.RESOLVE,
    boss: { ...createBossContext().boss, hp: 500 },
    bossRound: {
      intent: BossIntent.DEFEND,
      isDefending: true,
      willReleaseCharge: false,
    },
    play: {
      selectedCards: [],
      handType: null,
      score: 72,
    },
  }),
})

assert.equal(defendedResolve.boss.hp, 464, 'DEFEND should halve player damage to boss')
assert.equal(defendedResolve.bossRound.isDefending, true, 'resolveComplete should not clear isDefending')

const chargeBossAttack = doBossAttackComplete(
  createBossContext({
    phase: RoundPhase.BOSS_ATTACK,
    bossRound: {
      intent: BossIntent.CHARGE,
      isDefending: false,
      willReleaseCharge: false,
    },
  }),
)

assert.equal(chargeBossAttack.boss.behavior.chargeStored, true, 'CHARGE should store charge')
assert.equal(chargeBossAttack.player.hp, 100, 'CHARGE should not damage player')

const forcedAttackTelegraph = generateBossTelegraph({
  ...createBossContext({
    boss: {
      ...createBossContext().boss,
      behavior: { chargeStored: true },
    },
  }),
})

assert.equal(forcedAttackTelegraph.intent, BossIntent.ATTACK, 'stored charge should force ATTACK')
assert.equal(forcedAttackTelegraph.willReleaseCharge, true, 'stored charge should set willReleaseCharge')
assert.equal(forcedAttackTelegraph.isDefending, false, 'forced ATTACK should not carry defend buff')

const chargeReleaseAttack = doBossAttackComplete(
  createBossContext({
    phase: RoundPhase.BOSS_ATTACK,
    player: { hp: 100, maxHp: 100 },
    bossRound: {
      intent: BossIntent.ATTACK,
      isDefending: false,
      willReleaseCharge: true,
    },
  }),
)

assert.equal(
  createBossContext().boss.chargeAttack,
  6,
  'chargeAttack should equal floor(attackPerRound * 2.2)',
)
assert.equal(chargeReleaseAttack.player.hp, 94, 'charge release should use chargeAttack')
assert.equal(chargeReleaseAttack.boss.behavior.chargeStored, false, 'charge should clear after release')

const normalAttack = doBossAttackComplete(
  createBossContext({
    phase: RoundPhase.BOSS_ATTACK,
    player: { hp: 100, maxHp: 100 },
    bossRound: {
      intent: BossIntent.ATTACK,
      isDefending: false,
      willReleaseCharge: false,
    },
  }),
)

assert.equal(normalAttack.player.hp, 97, 'normal ATTACK should use attackPerRound')

const afterRoundReset = advanceRound({
  ...createBossContext({
    phase: RoundPhase.ROUND_END,
    round: 2,
    bossRound: {
      intent: BossIntent.DEFEND,
      isDefending: true,
      willReleaseCharge: false,
    },
  }),
})

assert.equal(afterRoundReset.round, 3, 'round should still increase correctly')
assert.equal(afterRoundReset.phase, RoundPhase.SKILL, 'round reset should end at SKILL')
assert.ok(afterRoundReset.bossRound.intent, 'next round intent should be generated')

const clearedAfterDefendRound = generateBossTelegraph(
  createBossContext({
    phase: RoundPhase.ROUND_END,
    bossRound: {
      intent: BossIntent.DEFEND,
      isDefending: true,
      willReleaseCharge: false,
    },
  }),
  BossIntent.CHARGE,
)
assert.equal(clearedAfterDefendRound.isDefending, false, 'round reset should clear defend buff')

const playAgain = enterPlay(afterRoundReset)
const loopConfirm = confirmPlay({
  ...playAgain,
  play: {
    selectedCards: [createCard(Element.FIRE, 13)],
    handType: null,
    score: 0,
  },
})

assert.equal(loopConfirm.phase, RoundPhase.BOSS_ATTACK, 'loop should still reach BOSS_ATTACK after confirm')

// ---- End-to-end CHARGE cycle: telegraph CHARGE → BossAttack → advanceRound → next round willReleaseCharge ----
// chargeStored is set in doBossAttackComplete (not at telegraph time), then advanceRound
// calls generateBossTelegraph which sees chargeStored=true and forces willReleaseCharge.
// Both orderings produce the same outcome; this test pins the full cycle.

const chargeRoundEndCtx = doBossAttackComplete(
  createBossContext({
    phase: RoundPhase.BOSS_ATTACK,
    round: 1,
    bossRound: {
      intent: BossIntent.CHARGE,
      isDefending: false,
      willReleaseCharge: false,
    },
  }),
)

assert.equal(chargeRoundEndCtx.boss.behavior.chargeStored, true, 'CHARGE: chargeStored should be true after BossAttack')
assert.equal(chargeRoundEndCtx.phase, RoundPhase.ROUND_END, 'CHARGE: phase should be ROUND_END')
assert.equal(chargeRoundEndCtx.player.hp, 100, 'CHARGE: player should take no damage')

import { initDeckState, drawCards } from './deck.js'
const deckForCharge = initDeckState()
drawCards(deckForCharge, 7)

const chargeAdvanced = advanceRound({
  ...chargeRoundEndCtx,
  deck: deckForCharge.deck,
  discardPile: deckForCharge.discardPile,
  hand: deckForCharge.hand,
})

assert.equal(chargeAdvanced.round, 2, 'CHARGE cycle: round should advance')
assert.equal(chargeAdvanced.bossRound.intent, BossIntent.ATTACK, 'CHARGE cycle: next round must be forced ATTACK')
assert.equal(chargeAdvanced.bossRound.willReleaseCharge, true, 'CHARGE cycle: next round must have willReleaseCharge')
assert.equal(chargeAdvanced.boss.behavior.chargeStored, true, 'CHARGE cycle: chargeStored stays true until release')

console.log('bossIntent tests passed')
