import assert from 'node:assert/strict'

import { BossIntent } from '../types/boss.js'
import { Element } from '../types/card.js'
import { createBossForLayer } from './bossConfig.js'
import { pickBossIntent } from './boss.js'
import { WEIGHTS_EARLY, WEIGHTS_LATE, WEIGHTS_MID } from './layerConfig.js'

const l1 = createBossForLayer(1)
assert.equal(l1.name, 'Tide Warden')
assert.equal(l1.element, Element.WATER)
assert.equal(l1.maxHp, 543)
assert.equal(l1.hp, 543)
assert.equal(l1.attackPerRound, 3)
assert.equal(l1.chargeAttack, 6)
assert.deepEqual(l1.intentWeights, WEIGHTS_EARLY)

const l2 = createBossForLayer(2)
assert.equal(l2.maxHp, 570)
assert.equal(l2.attackPerRound, 4)
assert.equal(l2.chargeAttack, 8)
assert.deepEqual(l2.intentWeights, WEIGHTS_EARLY)

const l3 = createBossForLayer(3)
assert.equal(l3.maxHp, 647)
assert.equal(l3.attackPerRound, 4)
assert.equal(l3.chargeAttack, 8)
assert.deepEqual(l3.intentWeights, WEIGHTS_EARLY)

const l4 = createBossForLayer(4)
assert.equal(l4.maxHp, 780)
assert.equal(l4.attackPerRound, 9)
assert.equal(l4.chargeAttack, 19)
assert.deepEqual(l4.intentWeights, WEIGHTS_MID)

const l5 = createBossForLayer(5)
assert.equal(l5.maxHp, 966)
assert.equal(l5.attackPerRound, 10)
assert.equal(l5.chargeAttack, 22)
assert.deepEqual(l5.intentWeights, WEIGHTS_MID)

const l6 = createBossForLayer(6)
assert.equal(l6.maxHp, 1144)
assert.equal(l6.attackPerRound, 10)
assert.equal(l6.chargeAttack, 22)
assert.deepEqual(l6.intentWeights, WEIGHTS_MID)

const l7 = createBossForLayer(7)
assert.equal(l7.maxHp, 1292)
assert.equal(l7.attackPerRound, 19)
assert.equal(l7.chargeAttack, 41)
assert.deepEqual(l7.intentWeights, WEIGHTS_LATE)

const l8 = createBossForLayer(8)
assert.equal(l8.maxHp, 1450)
assert.equal(l8.attackPerRound, 21)
assert.equal(l8.chargeAttack, 46)
assert.deepEqual(l8.intentWeights, WEIGHTS_LATE)

const l9 = createBossForLayer(9)
assert.equal(l9.maxHp, 1586)
assert.equal(l9.attackPerRound, 22)
assert.equal(l9.chargeAttack, 48)
assert.deepEqual(l9.intentWeights, WEIGHTS_LATE)

const l10 = createBossForLayer(10)
assert.equal(l10.maxHp, 1760)
assert.equal(l10.attackPerRound, 23)
assert.equal(l10.chargeAttack, 50)
assert.deepEqual(l10.intentWeights, WEIGHTS_LATE)

const l11 = createBossForLayer(11)
assert.equal(l11.id, 'boss-layer-11')
assert.equal(l11.name, 'World Ender 11')
assert.equal(l11.maxHp, 1866)
assert.equal(l11.attackPerRound, 24)

const l99 = createBossForLayer(99)
assert.equal(l99.id, 'boss-layer-99')
assert.notEqual(l99.id, 'boss-layer-10', 'procedural layers should not clamp to static layer 10')

const w = WEIGHTS_EARLY
assert.equal(pickBossIntent(w, 0),    BossIntent.ATTACK)
assert.equal(pickBossIntent(w, 0.79), BossIntent.ATTACK)
assert.equal(pickBossIntent(w, 0.8),  BossIntent.CHARGE)
assert.equal(pickBossIntent(w, 0.94), BossIntent.CHARGE)
assert.equal(pickBossIntent(w, 0.95), BossIntent.DEFEND)
assert.equal(pickBossIntent(w, 0.99), BossIntent.DEFEND)

console.log('bossConfig tests passed')
