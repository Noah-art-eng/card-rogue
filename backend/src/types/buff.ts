import type { Element, HandType } from './card.js'
import { Element as ElementEnum } from './card.js'

export interface HandMultBonus {
  type: 'HAND_MULT_BONUS'
  handType: HandType
  bonusMult: number
}
export interface HandChipsBonus {
  type: 'HAND_CHIPS_BONUS'
  handType: HandType
  bonusChips: number
}
export interface AllChipsBonus {
  type: 'ALL_CHIPS_BONUS'
  bonusChips: number
}
export interface ElementChipMult {
  type: 'ELEMENT_CHIP_MULT'
  element: Element
  mult: number
}
export interface ElementChipsBonus {
  type: 'ELEMENT_CHIPS_BONUS'
  element: Element
  bonusChips: number
}
export interface ElementDrawBuff {
  type: 'ELEMENT_DRAW_ON_SHUFFLE'
  element: Element
}
export interface HighRankDrawBuff {
  type: 'HIGH_RANK_DRAW_ON_SHUFFLE'
}
export interface HpBonusBuff {
  type: 'HP_BONUS'
  bonusHp: number
}
export interface TieredChipsBonus {
  type: 'TIERED_CHIPS_BONUS'
  commonBonus: number
  rareBonus: number
  epicBonus: number
}
export interface TieredMultBonus {
  type: 'TIERED_MULT_BONUS'
  commonMult: number
  rareMult: number
  epicMult: number
}
export interface SkillEnergyMaxBuff {
  type: 'SKILL_ENERGY_MAX'
  bonusEnergy: number
}

export type Buff =
  | HandMultBonus
  | HandChipsBonus
  | AllChipsBonus
  | ElementChipMult
  | ElementChipsBonus
  | ElementDrawBuff
  | HighRankDrawBuff
  | HpBonusBuff
  | TieredChipsBonus
  | TieredMultBonus
  | SkillEnergyMaxBuff

export interface Upgrade {
  id: string
  label: string
  description: string
  buff: Buff
}

export function createElementChipMult(element: Element, mult = 1.1): ElementChipMult {
  return { type: 'ELEMENT_CHIP_MULT', element, mult }
}

export function createUpgrade(id: string, label: string, description: string, buff: Buff): Upgrade {
  return { id, label, description, buff }
}

export const FIRST_LAYER_UPGRADES: Upgrade[] = [
  createUpgrade('water_spec', 'Water Spec', 'Water cards chip ×1.1', createElementChipMult(ElementEnum.WATER)),
  createUpgrade('fire_spec', 'Fire Spec', 'Fire cards chip ×1.1', createElementChipMult(ElementEnum.FIRE)),
  createUpgrade('grass_spec', 'Grass Spec', 'Grass cards chip ×1.1', createElementChipMult(ElementEnum.GRASS)),
]

export function applyPlayerBuffs(
  buffs: Buff[],
  baseMaxHp: number,
  baseSkillEnergyMax: number,
): { maxHp: number; skillEnergyMax: number } {
  let maxHp = baseMaxHp
  let skillEnergyMax = baseSkillEnergyMax
  for (const buff of buffs) {
    if (buff.type === 'HP_BONUS') maxHp += buff.bonusHp
    if (buff.type === 'SKILL_ENERGY_MAX') skillEnergyMax += buff.bonusEnergy
  }
  return { maxHp, skillEnergyMax }
}

const ELEMENT_NAMES: Record<Element, string> = { WATER: 'Water', FIRE: 'Fire', GRASS: 'Grass' }

export function generateUpgradePool(
  chosenElement: Element,
  layer: number,
  excludeTypes: string[] = [],
): Upgrade[] {
  const el = ELEMENT_NAMES[chosenElement]

  const all: Upgrade[] = [
    createUpgrade(
      `${chosenElement}_mult_${layer}`,
      `${el} Boost`,
      `${el} cards chip ×1.1 (stackable)`,
      createElementChipMult(chosenElement),
    ),
    createUpgrade(
      `${chosenElement}_chips_${layer}`,
      `${el} Charge`,
      `${el} cards +5 chip each (stackable)`,
      { type: 'ELEMENT_CHIPS_BONUS', element: chosenElement, bonusChips: 5 },
    ),
    createUpgrade(
      `${chosenElement}_draw_${layer}`,
      'Shuffle Guarantee',
      `Each shuffle guarantees one ${el} card`,
      { type: 'ELEMENT_DRAW_ON_SHUFFLE', element: chosenElement },
    ),
    createUpgrade(
      `high_rank_draw_${layer}`,
      'High Rank Draw',
      'Each shuffle guarantees one K (rank 13) card',
      { type: 'HIGH_RANK_DRAW_ON_SHUFFLE' },
    ),
    createUpgrade(
      `all_chips_${layer}`,
      'Chip Boost',
      '+2 chip per played card (stackable)',
      { type: 'ALL_CHIPS_BONUS', bonusChips: 2 },
    ),
    createUpgrade(
      `tiered_chips_${layer}`,
      'Hand Chips',
      'Common +10 / Rare +20 / Epic +35 base chips (stackable)',
      { type: 'TIERED_CHIPS_BONUS', commonBonus: 10, rareBonus: 20, epicBonus: 35 },
    ),
    createUpgrade(
      `tiered_mult_${layer}`,
      'Hand Mult',
      'Rare +2 / Epic +3 multiplier (stackable)',
      { type: 'TIERED_MULT_BONUS', commonMult: 0, rareMult: 2, epicMult: 3 },
    ),
    createUpgrade(
      `hp_boost_${layer}`,
      'Vitality',
      'Max HP +5 (stackable)',
      { type: 'HP_BONUS', bonusHp: 5 },
    ),
    createUpgrade(
      `skill_energy_${layer}`,
      'Energy Boost',
      'Skill energy +1 (one-time only)',
      { type: 'SKILL_ENERGY_MAX', bonusEnergy: 1 },
    ),
  ]

  const pool = all.filter((u) => !excludeTypes.includes(u.buff.type))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 3)
}

export function buffKey(b: Buff): string {
  const el = 'element' in b ? b.element : ''
  return `${b.type}:${el}`
}

export const ONE_TIME_BUFF_TYPES = new Set([
  'HP_BONUS',
  'SKILL_ENERGY_MAX',
  'HIGH_RANK_DRAW_ON_SHUFFLE',
])
