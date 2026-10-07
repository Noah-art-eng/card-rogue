import assert from 'node:assert/strict'

import { BossIntent } from '../types/boss.js'
import { RoundPhase, SHIELD_COOLDOWN_ROUNDS } from '../types/state.js'
import { advanceRound, doBossAttackComplete, resolveComplete, useSkill } from './actions.js'
import { createTestBoss, defaultTestBattle, defaultTestBossRound, defaultRoundState } from './testBoss.js'
import type { GameContext } from '../types/state.js'
import { initDeckState, drawCards } from './deck.js'

const HAND_SIZE = 7

function createShieldContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    ...defaultTestBattle,
    phase: RoundPhase.BOSS_ATTACK,
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

function makeRoundEndContext(overrides: Partial<GameContext> = {}): GameContext {
  const ds = initDeckState()
  drawCards(ds, HAND_SIZE)
  return {
    ...createShieldContext({
      phase: RoundPhase.ROUND_END,
      deck: ds.deck,
      discardPile: ds.discardPile,
      hand: ds.hand,
    }),
    ...overrides,
  }
}

// ---- 1. useSkill('shield') activates shield ----

const activated = useSkill(
  createShieldContext({
    phase: RoundPhase.SKILL,
    roundState: {
      ...defaultRoundState,
      skills: {
        energy: { energy: 3 },
        shield: { active: false, onCooldown: false, cooldownRounds: 0 },
      },
    },
  }),
  'shield',
)

assert.equal(activated.roundState.skills.shield.active, true, 'shield should be active after useSkill')
assert.equal(activated.roundState.skills.shield.onCooldown, false, 'not yet on cooldown before blocking')
assert.equal(activated.roundState.skills.energy.energy, 2, 'useSkill shield costs 1 energy')

// ---- 2. Shield blocks a normal ATTACK, enters cooldown ----

const blockedNormal = doBossAttackComplete(
  createShieldContext({
    player: { hp: 100, maxHp: 100 },
    roundState: {
      ...defaultRoundState,
      skills: {
        energy: { energy: 2 },
        shield: { active: true, onCooldown: false, cooldownRounds: 0 },
      },
    },
    bossRound: { intent: BossIntent.ATTACK, isDefending: false, willReleaseCharge: false },
  }),
)

assert.equal(blockedNormal.player.hp, 100, 'shield blocks normal ATTACK — no damage')
assert.equal(blockedNormal.roundState.skills.shield.active, false, 'shield deactivated after block')
assert.equal(blockedNormal.roundState.skills.shield.onCooldown, true, 'shield enters cooldown')
assert.equal(
  blockedNormal.roundState.skills.shield.cooldownRounds,
  SHIELD_COOLDOWN_ROUNDS,
  `cooldownRounds starts at ${SHIELD_COOLDOWN_ROUNDS}`,
)
assert.equal(blockedNormal.phase, RoundPhase.ROUND_END, 'blocked ATTACK still reaches ROUND_END')

// ---- 3. Shield blocks a charge ATTACK, charge state clears ----

const blockedCharge = doBossAttackComplete(
  createShieldContext({
    player: { hp: 100, maxHp: 100 },
    boss: createTestBoss({ behavior: { chargeStored: true } }),
    roundState: {
      ...defaultRoundState,
      skills: {
        energy: { energy: 2 },
        shield: { active: true, onCooldown: false, cooldownRounds: 0 },
      },
    },
    bossRound: { intent: BossIntent.ATTACK, isDefending: false, willReleaseCharge: true },
  }),
)

assert.equal(blockedCharge.player.hp, 100, 'shield blocks charge ATTACK — no damage')
assert.equal(blockedCharge.roundState.skills.shield.onCooldown, true, 'cooldown after charge block')
assert.equal(
  blockedCharge.boss.behavior.chargeStored,
  false,
  'chargeStored cleared even when attack is blocked',
)

// ---- 4. Cannot re-activate shield while onCooldown ----

const cooldownContext = createShieldContext({
  phase: RoundPhase.SKILL,
  roundState: {
    ...defaultRoundState,
    skills: {
      energy: { energy: 3 },
      shield: { active: false, onCooldown: true, cooldownRounds: 2 },
    },
  },
})

assert.throws(
  () => useSkill(cooldownContext, 'shield'),
  /cooldown/i,
  'useSkill shield should throw when onCooldown',
)

// ---- 5. Cooldown ticks down over 3 rounds, available on round 4 ----

// After block: cooldownRounds = 3
let ctx = makeRoundEndContext({
  roundState: {
    ...defaultRoundState,
    skills: {
      energy: { energy: 2 },
      shield: { active: false, onCooldown: true, cooldownRounds: 3 },
    },
  },
})

// Round 1 of cooldown
ctx = advanceRound(ctx)
assert.equal(ctx.roundState.skills.shield.onCooldown, true, 'round 1 of cooldown: still on cooldown')
assert.equal(ctx.roundState.skills.shield.cooldownRounds, 2, 'round 1: 2 rounds remain')
assert.throws(() => useSkill(ctx, 'shield'), /cooldown/i, 'round 1: shield still blocked')

// Round 2 of cooldown
ctx = makeRoundEndContext({ roundState: ctx.roundState })
ctx = advanceRound(ctx)
assert.equal(ctx.roundState.skills.shield.onCooldown, true, 'round 2 of cooldown: still on cooldown')
assert.equal(ctx.roundState.skills.shield.cooldownRounds, 1, 'round 2: 1 round remains')
assert.throws(() => useSkill(ctx, 'shield'), /cooldown/i, 'round 2: shield still blocked')

// Round 3 of cooldown — becomes available
ctx = makeRoundEndContext({ roundState: ctx.roundState })
ctx = advanceRound(ctx)
assert.equal(ctx.roundState.skills.shield.onCooldown, false, 'round 3 complete: cooldown lifted')
assert.equal(ctx.roundState.skills.shield.cooldownRounds, 0, 'round 3: 0 rounds remain')

// Shield can be used again on round 4
const reactivated = useSkill(
  {
    ...ctx,
    phase: RoundPhase.SKILL,
    roundState: {
      ...ctx.roundState,
      skills: {
        ...ctx.roundState.skills,
        energy: { energy: 3 },
      },
    },
  },
  'shield',
)
assert.equal(reactivated.roundState.skills.shield.active, true, 'shield reactivated on round 4')

// ---- 6. DEFEND intent does not block or trigger cooldown ----

const defendCtx = doBossAttackComplete(
  createShieldContext({
    player: { hp: 100, maxHp: 100 },
    roundState: {
      ...defaultRoundState,
      skills: {
        energy: { energy: 2 },
        shield: { active: true, onCooldown: false, cooldownRounds: 0 },
      },
    },
    bossRound: { intent: BossIntent.DEFEND, isDefending: true, willReleaseCharge: false },
  }),
)

assert.equal(defendCtx.player.hp, 100, 'DEFEND: no damage')
assert.equal(defendCtx.roundState.skills.shield.active, true, 'DEFEND: shield stays active')
assert.equal(defendCtx.roundState.skills.shield.onCooldown, false, 'DEFEND: no cooldown triggered')

// ---- 7. voidShield on WIN: shield cleared when boss is killed ----

const shieldActiveBeforeKill = createShieldContext({
  phase: RoundPhase.RESOLVE,
  boss: createTestBoss({ hp: 1 }),
  play: { selectedCards: [], handType: null, score: 100 },
  roundState: {
    ...defaultRoundState,
    skills: {
      energy: { energy: 2 },
      shield: { active: true, onCooldown: false, cooldownRounds: 0 },
    },
  },
})

const afterWin = resolveComplete(shieldActiveBeforeKill)

assert.equal(afterWin.battleResult, 'WIN', 'resolveComplete: should be WIN when boss HP <= 0')
assert.equal(afterWin.roundState.skills.shield.active, false, 'voidShield: active cleared on WIN')
assert.equal(afterWin.roundState.skills.shield.onCooldown, false, 'voidShield: onCooldown cleared on WIN')
assert.equal(afterWin.roundState.skills.shield.cooldownRounds, 0, 'voidShield: cooldownRounds cleared on WIN')

// voidShield also applies when shield is on cooldown at WIN moment
const shieldOnCooldownBeforeKill = createShieldContext({
  phase: RoundPhase.RESOLVE,
  boss: createTestBoss({ hp: 1 }),
  play: { selectedCards: [], handType: null, score: 100 },
  roundState: {
    ...defaultRoundState,
    skills: {
      energy: { energy: 2 },
      shield: { active: false, onCooldown: true, cooldownRounds: 2 },
    },
  },
})

const afterWin2 = resolveComplete(shieldOnCooldownBeforeKill)

assert.equal(afterWin2.battleResult, 'WIN')
assert.equal(afterWin2.roundState.skills.shield.onCooldown, false, 'voidShield: onCooldown cleared on WIN even if set')
assert.equal(afterWin2.roundState.skills.shield.cooldownRounds, 0, 'voidShield: cooldownRounds zeroed on WIN')

console.log('shield tests passed')
