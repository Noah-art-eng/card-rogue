import type { BossIntentWeights } from '../types/boss.js'

export const MIN_LAYER = 1
export const MAX_LAYER = 10

export const WEIGHTS_EARLY: BossIntentWeights = {
  ATTACK: 80,
  CHARGE: 15,
  DEFEND: 5,
}

export const WEIGHTS_MID: BossIntentWeights = {
  ATTACK: 60,
  CHARGE: 25,
  DEFEND: 15,
}

export const WEIGHTS_LATE: BossIntentWeights = {
  ATTACK: 45,
  CHARGE: 30,
  DEFEND: 25,
}

export function normalizeLayer(layer?: number): number {
  if (layer === undefined || layer === null || Number.isNaN(layer)) {
    return MIN_LAYER
  }

  const rounded = Math.floor(layer)

  if (rounded < MIN_LAYER) {
    return MIN_LAYER
  }

  if (rounded > MAX_LAYER) {
    return MAX_LAYER
  }

  return rounded
}

export function playerHpForLayer(layer: number): number {
  const rounded = Math.max(1, Math.floor(layer))

  const tiers: [number, number][] = [
    [5, 20],
    [10, 30],
    [15, 40],
    [20, 50],
    [25, 60],
    [30, 70],
    [35, 80],
    [40, 90],
    [45, 100],
    [50, 110],
  ]

  for (const [upTo, hp] of tiers) {
    if (rounded <= upTo) return hp
  }

  return 120
}

export function intentWeightsForLayer(layer: number): BossIntentWeights {
  const normalized = normalizeLayer(layer)

  if (normalized <= 3) {
    return WEIGHTS_EARLY
  }

  if (normalized <= 6) {
    return WEIGHTS_MID
  }

  return WEIGHTS_LATE
}
