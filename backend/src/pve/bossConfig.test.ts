import assert from 'node:assert/strict'

import { BossIntent } from '../types/boss.js'
import { Element } from '../types/card.js'
import { createBossForLayer } from './bossConfig.js'
import { pickBossIntent } from './boss.js'
import { WEIGHTS_EARLY, WEIGHTS_LATE, WEIGHTS_MID } from './layerConfig.js'

// ---- Layer 1 ----
const l1 = createBossForLayer(1)
assert.equal(l1.name, 'Tide Warden')
assert.equal(l1.element, Element.WATER)
assert.equal(l1.maxHp, 543)
assert.equal(l1.hp, 543)
assert.equal(l1.attackPerRound, 3)
assert.equal(l1.chargeAttack, 6)          // floor(3 * 2.2)
assert.deepEqual(l1.intentWeights, WEIGHTS_EARLY)

// ---- Layer 2 ----
const l2 = createBossForLayer(2)
assert.equal(l2.maxHp, 570)
assert.equal(l2.attackPerRound, 4)
assert.equal(l2.chargeAttack, 8)          // floor(4 * 2.2)
assert.deepEqual(l2.intentWeights, WEIGHTS_EARLY)

// ---- Layer 3 ----
const l3 = createBossForLayer(3)
assert.equal(l3.maxHp, 647)
assert.equal(l3.attackPerRound, 4)
assert.equal(l3.chargeAttack, 8)
assert.deepEqual(l3.intentWeights, WEIGHTS_EARLY)

// ---- Layer 4 ----
const l4 = createBossForLayer(4)
assert.equal(l4.maxHp, 780)
assert.equal(l4.attackPerRound, 9)
assert.equal(l4.chargeAttack, 19)         // floor(9 * 2.2)
assert.deepEqual(l4.intentWeights, WEIGHTS_MID)

// ---- Layer 5 ----
const l5 = createBossForLayer(5)
assert.equal(l5.maxHp, 966)
assert.equal(l5.attackPerRound, 10)
assert.equal(l5.chargeAttack, 22)         // floor(10 * 2.2)
assert.deepEqual(l5.intentWeights, WEIGHTS_MID)

// ---- Layer 6 ----
const l6 = createBossForLayer(6)
assert.equal(l6.maxHp, 1144)
assert.equal(l6.attackPerRound, 10)
assert.equal(l6.chargeAttack, 22)
assert.deepEqual(l6.intentWeights, WEIGHTS_MID)

// ---- Layer 7 ----
const l7 = createBossForLayer(7)
assert.equal(l7.maxHp, 1292)
assert.equal(l7.attackPerRound, 19)
assert.equal(l7.chargeAttack, 41)         // floor(19 * 2.2)
assert.deepEqual(l7.intentWeights, WEIGHTS_LATE)

// ---- Layer 8 ----
const l8 = createBossForLayer(8)
assert.equal(l8.maxHp, 1450)
assert.equal(l8.attackPerRound, 21)
assert.equal(l8.chargeAttack, 46)         // floor(21 * 2.2)
assert.deepEqual(l8.intentWeights, WEIGHTS_LATE)

// ---- Layer 9 ----
const l9 = createBossForLayer(9)
assert.equal(l9.maxHp, 1586)
assert.equal(l9.attackPerRound, 22)
assert.equal(l9.chargeAttack, 48)         // floor(22 * 2.2)
assert.deepEqual(l9.intentWeights, WEIGHTS_LATE)

// ---- Layer 10 ----
const l10 = createBossForLayer(10)
assert.equal(l10.maxHp, 1760)
assert.equal(l10.attackPerRound, 23)
assert.equal(l10.chargeAttack, 50)        // floor(23 * 2.2)
assert.deepEqual(l10.intentWeights, WEIGHTS_LATE)

// ---- Clamp overflow ----
const overflow = createBossForLayer(99)
assert.equal(overflow.id, 'boss-layer-10', 'layer > 10 should clamp to layer 10')

// ---- pickBossIntent boundary checks for WEIGHTS_EARLY (80/15/5, total 100) ----
const w = WEIGHTS_EARLY
assert.equal(pickBossIntent(w, 0),    BossIntent.ATTACK)
assert.equal(pickBossIntent(w, 0.79), BossIntent.ATTACK)
assert.equal(pickBossIntent(w, 0.8),  BossIntent.CHARGE)
assert.equal(pickBossIntent(w, 0.94), BossIntent.CHARGE)
assert.equal(pickBossIntent(w, 0.95), BossIntent.DEFEND)
assert.equal(pickBossIntent(w, 0.99), BossIntent.DEFEND)

console.log('bossConfig tests passed')
