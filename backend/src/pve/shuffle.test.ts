import assert from 'node:assert/strict'

import { HAND_SIZE } from './deck.js'
import { RoundPhase } from '../types/state.js'
import {
  advanceRound,
  enterPlay,
  enterShuffle,
  selectCard,
  shuffleCards,
} from './actions.js'
import { createTestBoss, defaultTestBattle, defaultTestBossRound, defaultRoundState } from './testBoss.js'
import { initDeckState, drawCards } from './deck.js'
import type { GameContext } from '../types/state.js'

function createShuffleContext(overrides: Partial<GameContext> = {}): GameContext {
  const deckState = initDeckState()
  drawCards(deckState, HAND_SIZE)

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

assert.equal(createShuffleContext().roundState.shuffle.remaining, 2, 'new round should start with 2 shuffles')

const inShuffle = enterShuffle(createShuffleContext())
assert.equal(inShuffle.phase, RoundPhase.SHUFFLE, 'enterShuffle should move to SHUFFLE')

const selected = selectCard({
  ...inShuffle,
  play: { selectedCards: [], handType: null, score: 0 },
  hand: inShuffle.hand,
}, inShuffle.hand[0].id)

const firstShuffle = shuffleCards(selected)
assert.equal(firstShuffle.roundState.shuffle.remaining, 1, 'first shuffle should leave 1 remaining')
assert.equal(firstShuffle.hand.length, HAND_SIZE, 'hand should stay at 7 after first shuffle')
assert.equal(firstShuffle.discardPile.length, 1, 'discardPile should grow after shuffle')

const selectedAgain = selectCard({
  ...firstShuffle,
  play: { selectedCards: [], handType: null, score: 0 },
}, firstShuffle.hand[0].id)

const secondShuffle = shuffleCards(selectedAgain)
assert.equal(secondShuffle.roundState.shuffle.remaining, 0, 'second shuffle should leave 0 remaining')
assert.equal(secondShuffle.hand.length, HAND_SIZE, 'hand should stay at 7 after second shuffle')
assert.equal(secondShuffle.discardPile.length, 2, 'discardPile should grow again')

const selectedThird = selectCard({
  ...secondShuffle,
  play: { selectedCards: [], handType: null, score: 0 },
}, secondShuffle.hand[0].id)

assert.throws(
  () => shuffleCards(selectedThird),
  /No shuffle remaining/,
  'third shuffle should be rejected',
)

const playPhase = enterPlay(secondShuffle)
assert.equal(playPhase.phase, RoundPhase.PLAY, 'enterPlay should work from SHUFFLE')

const afterRound = advanceRound(
  createShuffleContext({
    phase: RoundPhase.ROUND_END,
    round: 1,
    roundState: {
      ...defaultRoundState,
      shuffle: { remaining: 0 },
    },
  }),
)

assert.equal(afterRound.round, 2, 'advanceRound should increment round')
assert.equal(afterRound.roundState.shuffle.remaining, 2, 'new round should reset shuffle remaining to 2')
assert.equal(afterRound.phase, RoundPhase.SKILL, 'advanceRound should return to SKILL')

console.log('shuffle tests passed')
