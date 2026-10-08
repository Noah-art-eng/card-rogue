/**
 * 各层 Boss 的固定配置与高层成长规则。
 * 前十层读取预置 Boss；肉鸽超过第十层仍可继续，因此血量和攻击会按公式增长而不会被限制在第十层。
 */

import { Element } from '../types/card.js'
import type { BossLayerConfig } from '../types/boss.js'
import type { BossState } from '../types/state.js'
import { calculateChargeAttack } from './boss.js'
import { intentWeightsForLayer, MAX_LAYER, normalizeLayer } from './layerConfig.js'

export const BOSS_LAYER_CONFIGS: Record<number, BossLayerConfig> = {
  1: {
    id: 'boss-layer-1',
    name: 'Tide Warden',
    element: Element.WATER,
    maxHp: 543,
    attackPerRound: 3,
    intentWeights: intentWeightsForLayer(1),
  },
  2: {
    id: 'boss-layer-2',
    name: 'Ember Colossus',
    element: Element.FIRE,
    maxHp: 570,
    attackPerRound: 4,
    intentWeights: intentWeightsForLayer(2),
  },
  3: {
    id: 'boss-layer-3',
    name: 'Verdant Tyrant',
    element: Element.GRASS,
    maxHp: 647,
    attackPerRound: 4,
    intentWeights: intentWeightsForLayer(3),
  },
  4: {
    id: 'boss-layer-4',
    name: 'Abyss Keeper',
    element: Element.WATER,
    maxHp: 780,
    attackPerRound: 9,
    intentWeights: intentWeightsForLayer(4),
  },
  5: {
    id: 'boss-layer-5',
    name: 'Inferno Sentinel',
    element: Element.FIRE,
    maxHp: 966,
    attackPerRound: 10,
    intentWeights: intentWeightsForLayer(5),
  },
  6: {
    id: 'boss-layer-6',
    name: 'Thorn Sovereign',
    element: Element.GRASS,
    maxHp: 1144,
    attackPerRound: 10,
    intentWeights: intentWeightsForLayer(6),
  },
  7: {
    id: 'boss-layer-7',
    name: 'Storm Leviathan',
    element: Element.WATER,
    maxHp: 1292,
    attackPerRound: 19,
    intentWeights: intentWeightsForLayer(7),
  },
  8: {
    id: 'boss-layer-8',
    name: 'Blaze Archon',
    element: Element.FIRE,
    maxHp: 1450,
    attackPerRound: 21,
    intentWeights: intentWeightsForLayer(8),
  },
  9: {
    id: 'boss-layer-9',
    name: 'Ancient Grove',
    element: Element.GRASS,
    maxHp: 1586,
    attackPerRound: 22,
    intentWeights: intentWeightsForLayer(9),
  },
  10: {
    id: 'boss-layer-10',
    name: 'World Ender',
    element: Element.WATER,
    maxHp: 1760,
    attackPerRound: 23,
    intentWeights: intentWeightsForLayer(10),
  },
}

// 根据当前层数生成 Boss，静态配置结束后继续按公式成长。
export function createBossForLayer(layer: number): BossState {
  const rounded = Math.max(1, Math.floor(layer))

  if (rounded <= MAX_LAYER) {
    const normalizedLayer = normalizeLayer(rounded)
    const config = BOSS_LAYER_CONFIGS[normalizedLayer] ?? BOSS_LAYER_CONFIGS[1]
    return {
      id: config.id,
      name: config.name,
      element: config.element,
      hp: config.maxHp,
      maxHp: config.maxHp,
      attackPerRound: config.attackPerRound,
      chargeAttack: calculateChargeAttack(config.attackPerRound),
      intentWeights: config.intentWeights,
      behavior: { chargeStored: false },
    }
  }

  // 10 层只是静态配置边界，肉鸽继续推进时按公式生成更高层 Boss。
  const hp = Math.round(1760 * Math.pow(1.06, rounded - 10))
  const atk = 23 + (rounded - 10)
  const elements = [Element.WATER, Element.FIRE, Element.GRASS] as const
  const element = elements[(rounded - 1) % 3]

  return {
    id: `boss-layer-${rounded}`,
    name: `World Ender ${rounded}`,
    element,
    hp,
    maxHp: hp,
    attackPerRound: atk,
    chargeAttack: calculateChargeAttack(atk),
    intentWeights: intentWeightsForLayer(MAX_LAYER),
    behavior: { chargeStored: false },
  }
}
