import assert from 'node:assert/strict'

import { BossIntent } from '../types/boss.js'
import { BattleResult, RoundPhase } from '../types/state.js'
import {
  confirmPlay,
  doBossAttackComplete,
  enterPlay,
  resolveAnimationComplete,
} from './actions.js'
import { createCard, initDeckState, drawCards } from './deck.js'
import { Element } from '../types/card.js'
import type { GameContext } from '../types/state.js'
import { createTestBoss, defaultTestBattle, defaultTestBossRound, defaultRoundState } from './testBoss.js'

function createRoundLoopContext(overrides: Partial<GameContext> = {}): GameContext {
  const deckState = initDeckState()
  drawCards(deckState, 7)

  return {
    ...defaultTestBattle,
    phase: RoundPhase.SKILL,
    boss: createTestBoss(),
    deck: deckState.deck,
    discardPile: deckState.discardPile,
    hand: deckState.hand,
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

const playPhaseContext = enterPlay(createRoundLoopContext())

const afterConfirm = confirmPlay({
  ...playPhaseContext,
  play: {
    selectedCards: [createCard(Element.FIRE, 13)],
    handType: null,
    score: 0,
  },
})

assert.equal(afterConfirm.phase, RoundPhase.BOSS_ATTACK, 'confirmPlay should enter BOSS_ATTACK when boss survives')

const afterAttack = doBossAttackComplete({
  ...afterConfirm,
  bossRound: {
    intent: BossIntent.ATTACK,
    isDefending: false,
    willReleaseCharge: false,
  },
})

assert.equal(afterAttack.player.hp, 97, 'ATTACK intent should reduce player hp by attackPerRound')
assert.equal(afterAttack.phase, RoundPhase.ROUND_END, 'surviving attack should enter ROUND_END')

const afterRoundReset = resolveAnimationComplete({
  ...afterConfirm,
  bossRound: {
    intent: BossIntent.CHARGE,
    isDefending: false,
    willReleaseCharge: false,
  },
})

assert.notEqual(afterRoundReset, null, 'resolveAnimationComplete should process BOSS_ATTACK')
assert.equal(afterRoundReset?.phase, RoundPhase.SKILL, 'round reset should stop at SKILL')
assert.equal(afterRoundReset?.round, 2, 'round should increase after reset')
assert.ok(afterRoundReset?.bossRound.intent, 'boss intent should be set for next round')

const playAgain = enterPlay(afterRoundReset!)
assert.equal(playAgain.phase, RoundPhase.PLAY, 'enterPlay should move SKILL to PLAY')

const lethalContext = resolveAnimationComplete({
  ...createRoundLoopContext({
    phase: RoundPhase.BOSS_ATTACK,
    player: { hp: 2, maxHp: 100 },
    bossRound: {
      intent: BossIntent.ATTACK,
      isDefending: false,
      willReleaseCharge: false,
    },
  }),
})

assert.equal(lethalContext?.battleResult, BattleResult.LOSE, 'lethal attack should set LOSE')
assert.equal(lethalContext?.player.hp, 0, 'lethal attack should set player hp to 0')

const ignored = resolveAnimationComplete(
  createRoundLoopContext({
    phase: RoundPhase.RESOLVE,
    bossRound: {
      intent: BossIntent.ATTACK,
      isDefending: false,
      willReleaseCharge: false,
    },
  }),
)

assert.equal(ignored, null, 'resolveAnimationComplete should ignore non-BOSS_ATTACK phases')

console.log('roundLoop tests passed')
