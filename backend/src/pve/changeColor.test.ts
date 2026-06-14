import assert from 'node:assert/strict'

import { Element, HandType } from '../types/card.js'
import { RoundPhase } from '../types/state.js'
import { useSkill } from './actions.js'
import { createCard } from './deck.js'
import { detectHandType } from './handEvaluator.js'
import { createTestBoss, defaultTestBattle, defaultTestBossRound, defaultRoundState } from './testBoss.js'
import type { GameContext } from '../types/state.js'

function createChangeColorContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    ...defaultTestBattle,
    phase: RoundPhase.SKILL,
    boss: createTestBoss(),
    deck: [],
    discardPile: [],
    hand: [
      createCard(Element.WATER, 2),
      createCard(Element.WATER, 5),
      createCard(Element.WATER, 7),
      createCard(Element.WATER, 9),
      createCard(Element.FIRE, 11),
      createCard(Element.GRASS, 3),
      createCard(Element.GRASS, 13),
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

const changed = useSkill(createChangeColorContext(), 'changeColor', {
  cardId: 'FIRE_11',
  targetElement: Element.WATER,
})

assert.equal(changed.roundState.skills.energy.energy, 2, 'changeColor should cost 1 energy')

const changedCard = changed.hand.find((card) => card.rank === 11)
assert.equal(changedCard?.element, Element.WATER, 'card element should change to WATER')
assert.equal(changedCard?.id, 'WATER_11', 'card id should be regenerated to match new element')

const flushCards = changed.hand.filter((card) =>
  [2, 5, 7, 9, 11].includes(card.rank),
)
assert.equal(detectHandType(flushCards), HandType.FLUSH, 'changeColor should enable FLUSH detection')

assert.throws(
  () => useSkill(
    createChangeColorContext({
      roundState: {
        ...defaultRoundState,
        skills: {
          energy: { energy: 0 },
          shield: { active: false, onCooldown: false, cooldownRounds: 0 },
        },
      },
    }),
    'changeColor',
    { cardId: 'FIRE_11', targetElement: Element.WATER },
  ),
  /Not enough energy/,
  'changeColor should be rejected at 0 energy',
)

assert.throws(
  () => useSkill(
    createChangeColorContext({ phase: RoundPhase.PLAY }),
    'changeColor',
    { cardId: 'FIRE_11', targetElement: Element.WATER },
  ),
  /Can only use skills during SKILL phase/,
  'changeColor should be rejected outside SKILL phase',
)

console.log('changeColor tests passed')
