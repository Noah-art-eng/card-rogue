/**
 * PvE integration test — exercises the full action chain that pveHandlers.ts wires via Socket.IO.
 * Uses in-memory runtime only (no Mongo, no network).
 *
 * Sequence tested:
 *   createRoom  →  startPveGameSetup
 *   → enterPlay → selectCard → confirmPlay
 *   → resolveAnimationComplete  (boss survives → round++)
 *   → WIN path (boss dies)
 */

import assert from 'node:assert/strict'

import { BossIntent } from '../types/boss.js'
import { BattleResult, RoundPhase } from '../types/state.js'
import {
  confirmPlay,
  enterPlay,
  resolveAnimationComplete,
  selectCard,
  startPveGameSetup,
} from './actions.js'
import { createRoom, getRoom, removeRoom, updateRoom } from './runtime.js'

// ---- Setup ----

const ROOM_ID = 'pve-integration-test'
const USER_ID = 'user-int-test'

if (getRoom(ROOM_ID)) {
  removeRoom(ROOM_ID)
}

let ctx = createRoom(ROOM_ID, USER_ID, 1)
ctx = startPveGameSetup(ctx)
updateRoom(ROOM_ID, ctx)

// startPveGameSetup: phase = SKILL, hand = 7, round = 1
assert.equal(ctx.phase, RoundPhase.SKILL, 'startPveGameSetup: phase should be SKILL')
assert.equal(ctx.hand.length, 7, 'startPveGameSetup: hand should have 7 cards')
assert.equal(ctx.round, 1, 'startPveGameSetup: round should be 1')
assert.ok(ctx.bossRound.intent !== null, 'startPveGameSetup: boss intent should be telegraphed')
assert.equal(ctx.player.hp, 20, 'layer 1: player HP = 20')
assert.equal(ctx.boss.maxHp, 543, 'layer 1: boss HP = 543')
assert.equal(ctx.boss.attackPerRound, 3, 'layer 1: boss ATK = 3')
assert.equal(ctx.totalDamageDealt, 0, 'startPveGameSetup: no damage yet')
assert.equal(ctx.matchArchived, false, 'startPveGameSetup: not archived yet')

// ---- enterPlay ----

ctx = enterPlay(ctx)
updateRoom(ROOM_ID, ctx)
assert.equal(ctx.phase, RoundPhase.PLAY, 'enterPlay: phase should be PLAY')

// ---- selectCard (pick first card) ----

const firstCard = ctx.hand[0]
assert.ok(firstCard, 'hand should have at least one card')

ctx = selectCard(ctx, firstCard.id)
updateRoom(ROOM_ID, ctx)
assert.equal(ctx.play.selectedCards.length, 1, 'selectCard: one card selected')
assert.ok(ctx.play.score > 0, 'selectCard: preview score computed')

// ---- confirmPlay (boss survives) ----

// Force a boss that definitely survives a single HIGH_CARD hit (~18 dmg)
ctx = confirmPlay(ctx)
updateRoom(ROOM_ID, ctx)

// Boss should still be alive (hp = 543, damage ≤ ~18 on a single card)
assert.equal(ctx.battleResult, BattleResult.ONGOING, 'confirmPlay: boss alive → ONGOING')
assert.equal(ctx.phase, RoundPhase.BOSS_ATTACK, 'confirmPlay: phase should be BOSS_ATTACK')
assert.ok(ctx.totalDamageDealt > 0, 'confirmPlay: totalDamageDealt accumulated')
assert.ok(ctx.boss.hp < 543, 'confirmPlay: boss HP reduced')

// ---- resolveAnimationComplete (boss attacks → round advances) ----

// Force a non-lethal ATTACK intent so round advances
ctx = {
  ...ctx,
  bossRound: {
    intent: BossIntent.ATTACK,
    isDefending: false,
    willReleaseCharge: false,
  },
}

const afterResolve = resolveAnimationComplete(ctx)
assert.ok(afterResolve !== null, 'resolveAnimationComplete: should return next context')
assert.ok(afterResolve !== undefined)

ctx = afterResolve!
updateRoom(ROOM_ID, ctx)

assert.equal(ctx.round, 2, 'resolveAnimationComplete: round should advance to 2')
assert.equal(ctx.phase, RoundPhase.SKILL, 'resolveAnimationComplete: phase resets to SKILL')
assert.ok(ctx.bossRound.intent !== null, 'resolveAnimationComplete: new intent telegraphed for round 2')
assert.equal(ctx.roundState.shuffle.remaining, 2, 'resolveAnimationComplete: shuffle.remaining reset')
assert.ok(ctx.player.hp < 20, 'resolveAnimationComplete: player took boss attack damage')

// ---- Round 2: enterPlay → select → confirmPlay (WIN path) ----

ctx = enterPlay(ctx)

// Select 5 cards with highest chipValue to guarantee lethal hit
const sortedByValue = [...ctx.hand].sort((a, b) => b.chipValue - a.chipValue)
const topFive = sortedByValue.slice(0, 5)

for (const card of topFive) {
  ctx = selectCard(ctx, card.id)
}

assert.equal(ctx.play.selectedCards.length, 5, 'round 2: 5 cards selected')

// Override boss HP to 1 to guarantee WIN
ctx = {
  ...ctx,
  boss: { ...ctx.boss, hp: 1 },
}

const winCtx = confirmPlay(ctx)

assert.equal(winCtx.battleResult, BattleResult.WIN, 'WIN path: battleResult should be WIN')
assert.equal(winCtx.boss.hp, 0, 'WIN path: boss HP should be 0')
assert.ok(winCtx.totalDamageDealt > 0, 'WIN path: totalDamageDealt should be set')

// voidShield on WIN
assert.equal(winCtx.roundState.skills.shield.active, false, 'WIN: shield.active cleared')
assert.equal(winCtx.roundState.skills.shield.onCooldown, false, 'WIN: onCooldown cleared')
assert.equal(winCtx.roundState.skills.shield.cooldownRounds, 0, 'WIN: cooldownRounds cleared')

// ---- Cleanup ----

removeRoom(ROOM_ID)

console.log('pveIntegration tests passed')
