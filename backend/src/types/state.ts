import type { BossBehaviorState, BossIntentWeights, BossRoundState } from './boss.js'
import type { Buff } from './buff.js'
import type { Card, Element, HandType } from './card.js'

export type RoguePhase = 'BATTLE' | 'UPGRADE'

export enum RoundPhase {
  DRAW = 'DRAW',
  BOSS_TELEGRAPH = 'BOSS_TELEGRAPH',
  SKILL = 'SKILL',
  SHUFFLE = 'SHUFFLE',
  PLAY = 'PLAY',
  RESOLVE = 'RESOLVE',
  BOSS_ATTACK = 'BOSS_ATTACK',
  ROUND_END = 'ROUND_END',
}

export enum BattleResult {
  ONGOING = 'ONGOING',
  WIN = 'WIN',
  LOSE = 'LOSE',
}

export interface PlayerState {
  hp: number
  maxHp: number
  buffs?: Buff[]
  chosenElement?: Element
  skillEnergyMax?: number
}

export interface BossState {
  id: string
  name: string
  element: Element
  hp: number
  maxHp: number
  attackPerRound: number
  chargeAttack: number
  intentWeights: BossIntentWeights
  behavior: BossBehaviorState
}

export interface PlayState {
  selectedCards: Card[]
  handType: HandType | null
  score: number
}

export type SkillId = 'shield' | 'changeColor' | 'changeRank'

export interface UseSkillOptions {
  cardId?: string
  targetElement?: Element
  targetRank?: number
}

export const INITIAL_SKILL_ENERGY = 3

export interface SkillEnergyState {
  energy: number
}

export interface ShieldState {
  active: boolean
  onCooldown: boolean
  cooldownRounds: number
}

export const SHIELD_COOLDOWN_ROUNDS = 3

export interface RoundSkillsState {
  energy: SkillEnergyState
  shield: ShieldState
}

export interface ShuffleState {
  remaining: number
}

export const SHUFFLE_PER_ROUND = 2

export interface RoundState {
  skills: RoundSkillsState
  shuffle: ShuffleState
}

export interface GameContext {
  roomId: string
  userId: string
  layer: number
  round: number
  phase: RoundPhase
  player: PlayerState
  boss: BossState
  deck: Card[]
  discardPile: Card[]
  hand: Card[]
  play: PlayState
  bossRound: BossRoundState
  roundState: RoundState
  battleResult: BattleResult
  totalDamageDealt: number
  matchArchived: boolean
  rogueMode?: boolean
  roguePhase?: RoguePhase
}

export const ROUND_PHASE_ORDER: RoundPhase[] = [
  RoundPhase.DRAW,
  RoundPhase.BOSS_TELEGRAPH,
  RoundPhase.SKILL,
  RoundPhase.SHUFFLE,
  RoundPhase.PLAY,
  RoundPhase.RESOLVE,
  RoundPhase.BOSS_ATTACK,
  RoundPhase.ROUND_END,
]
