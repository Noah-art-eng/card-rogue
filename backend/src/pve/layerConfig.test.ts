import assert from 'node:assert/strict'

import { createBossForLayer } from './bossConfig.js'
import {
  intentWeightsForLayer,
  normalizeLayer,
  playerHpForLayer,
  WEIGHTS_EARLY,
  WEIGHTS_LATE,
  WEIGHTS_MID,
} from './layerConfig.js'
import { createRoom, removeRoom } from './runtime.js'

// ---- playerHpForLayer: L1–5 = 20, L6–10 = 30 ----
assert.equal(playerHpForLayer(1), 20, 'L1 HP')
assert.equal(playerHpForLayer(2), 20, 'L2 HP')
assert.equal(playerHpForLayer(3), 20, 'L3 HP')
assert.equal(playerHpForLayer(4), 20, 'L4 HP')
assert.equal(playerHpForLayer(5), 20, 'L5 HP — boundary: still 20')
assert.equal(playerHpForLayer(6), 30, 'L6 HP — boundary: first 30')
assert.equal(playerHpForLayer(7), 30, 'L7 HP')
assert.equal(playerHpForLayer(10), 30, 'L10 HP')

// ---- intentWeightsForLayer ----
assert.deepEqual(intentWeightsForLayer(1), WEIGHTS_EARLY)
assert.deepEqual(intentWeightsForLayer(3), WEIGHTS_EARLY)
assert.deepEqual(intentWeightsForLayer(4), WEIGHTS_MID)
assert.deepEqual(intentWeightsForLayer(6), WEIGHTS_MID)
assert.deepEqual(intentWeightsForLayer(7), WEIGHTS_LATE)
assert.deepEqual(intentWeightsForLayer(10), WEIGHTS_LATE)

// ---- normalizeLayer edge cases ----
assert.equal(normalizeLayer(undefined), 1)
assert.equal(normalizeLayer(), 1)
assert.equal(normalizeLayer(0), 1)
assert.equal(normalizeLayer(-1), 1)
assert.equal(normalizeLayer(11), 10)

// ---- createRoom default (layer 1) ----
const defaultRoom = createRoom('layer-default', 'user-1')
assert.equal(defaultRoom.layer, 1)
assert.equal(defaultRoom.player.hp, 20)
assert.equal(defaultRoom.player.maxHp, 20)
assert.equal(defaultRoom.boss.maxHp, 543)
assert.equal(defaultRoom.boss.attackPerRound, 3)
removeRoom('layer-default')

// ---- createRoom layer 2 ----
const layer2Room = createRoom('layer-2', 'user-2', 2)
assert.equal(layer2Room.layer, 2)
assert.equal(layer2Room.player.hp, 20)
assert.equal(layer2Room.player.maxHp, 20)
assert.equal(layer2Room.boss.maxHp, 570)
assert.equal(layer2Room.boss.attackPerRound, 4)
assert.deepEqual(layer2Room.boss.intentWeights, WEIGHTS_EARLY)
removeRoom('layer-2')

// ---- createRoom layer 5 (boundary: still 20 HP) ----
const layer5Room = createRoom('layer-5', 'user-3', 5)
assert.equal(layer5Room.player.hp, 20, 'layer 5 player HP should be 20')
assert.equal(layer5Room.player.maxHp, 20)
assert.deepEqual(layer5Room.boss.intentWeights, WEIGHTS_MID)
assert.equal(createBossForLayer(5).maxHp, layer5Room.boss.maxHp)
removeRoom('layer-5')

// ---- createRoom layer 6 (boundary: first 30 HP) ----
const layer6Room = createRoom('layer-6', 'user-4', 6)
assert.equal(layer6Room.player.hp, 30, 'layer 6 player HP should be 30')
assert.equal(layer6Room.player.maxHp, 30)
assert.deepEqual(layer6Room.boss.intentWeights, WEIGHTS_MID)
removeRoom('layer-6')

// ---- createRoom layer 10 ----
const layer10Room = createRoom('layer-10', 'user-5', 10)
assert.equal(layer10Room.player.hp, 30, 'layer 10 player HP should be 30')
assert.deepEqual(layer10Room.boss.intentWeights, WEIGHTS_LATE)
removeRoom('layer-10')

console.log('layerConfig tests passed')
