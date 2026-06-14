import assert from 'node:assert/strict'

import { Element, HandType } from '../types/card.js'
import { RoundPhase } from '../types/state.js'
import { useSkill } from './actions.js'
import { createCard } from './deck.js'
import { detectHandType } from './handEvaluator.js'
import { createTestBoss, defaultTestBattle, defaultTestBossRound, defaultRoundState } from './testBoss.js'
import type { GameContext } from '../types/state.js'

function createChangeRankContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    ...defaultTestBattle,
    phase: RoundPhase.SKILL,
    boss: createTestBoss(),
    deck: [],
    discardPile: [],
    hand: [
      createCard(Element.WATER, 5),
      createCard(Element.FIRE, 7),
      createCard(Element.GRASS, 1),
      createCard(Element.GRASS, 2),
      createCard(Element.GRASS, 3),
      createCard(Element.GRASS, 4),
      createCard(Element.GRASS, 6),
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

const changed = useSkill(createChangeRankContext(), 'changeRank', {
  cardId: 'FIRE_7',
  targetRank: 5,
})

assert.equal(changed.roundState.skills.energy.energy, 2, 'changeRank should cost 1 energy')

const changedCard = changed.hand.find((card) => card.element === Element.FIRE && card.rank === 5)
assert.ok(changedCard, 'card rank should change to 5')
assert.equal(changedCard?.displayRank, '5', 'displayRank should sync with rank')
assert.equal(changedCard?.chipValue, 5, 'chipValue should sync with rank')
assert.equal(changedCard?.id, 'FIRE_5', 'card id should be regenerated to match new rank')

const pairCards = changed.hand.filter((card) => card.rank === 5)
assert.equal(detectHandType(pairCards), HandType.PAIR, 'changeRank should enable PAIR detection')

const straightChanged = useSkill(createChangeRankContext(), 'changeRank', {
  cardId: 'GRASS_6',
  targetRank: 5,
})
const straightCards = straightChanged.hand.filter((card) =>
  [1, 2, 3, 4, 5].includes(card.rank),
)
assert.equal(detectHandType(straightCards), HandType.STRAIGHT, 'changeRank should enable STRAIGHT detection')

assert.throws(
  () => useSkill(
    createChangeRankContext({
      roundState: {
        ...defaultRoundState,
        skills: {
          energy: { energy: 0 },
          shield: { active: false, onCooldown: false, cooldownRounds: 0 },
        },
      },
    }),
    'changeRank',
    { cardId: 'FIRE_7', targetRank: 5 },
  ),
  /Not enough energy/,
  'changeRank should be rejected at 0 energy',
)

assert.throws(
  () => useSkill(
    createChangeRankContext({ phase: RoundPhase.PLAY }),
    'changeRank',
    { cardId: 'FIRE_7', targetRank: 5 },
  ),
  /Can only use skills during SKILL phase/,
  'changeRank should be rejected outside SKILL phase',
)

console.log('changeRank tests passed')
