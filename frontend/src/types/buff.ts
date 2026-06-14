export interface HandMultBonus {
  type: 'HAND_MULT_BONUS'
  handType: string
  bonusMult: number
}
export interface HandChipsBonus {
  type: 'HAND_CHIPS_BONUS'
  handType: string
  bonusChips: number
}
export interface AllChipsBonus {
  type: 'ALL_CHIPS_BONUS'
  bonusChips: number
}
export interface ElementChipMult {
  type: 'ELEMENT_CHIP_MULT'
  element: string
  mult: number
}
export interface ElementChipsBonus {
  type: 'ELEMENT_CHIPS_BONUS'
  element: string
  bonusChips: number
}
export interface ElementDrawBuff {
  type: 'ELEMENT_DRAW_ON_SHUFFLE'
  element: string
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
