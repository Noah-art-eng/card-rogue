export type RoundPhase =
  | 'DRAW'
  | 'BOSS_TELEGRAPH'
  | 'SKILL'
  | 'SHUFFLE'
  | 'PLAY'
  | 'RESOLVE'
  | 'BOSS_ATTACK'
  | 'ROUND_END'

export type BattleResult = 'ONGOING' | 'WIN' | 'LOSE'

export type BossIntent = 'ATTACK' | 'CHARGE' | 'DEFEND'

export type Element = 'WATER' | 'FIRE' | 'GRASS'

export type HandType =
  | 'STRAIGHT_FLUSH'
  | 'FOUR_OF_A_KIND'
  | 'FULL_HOUSE'
  | 'FLUSH'
  | 'STRAIGHT'
  | 'THREE_OF_A_KIND'
  | 'TWO_PAIR'
  | 'PAIR'
  | 'HIGH_CARD'

export interface Card {
  id: string
  element: Element
  rank: number
  displayRank: string
  chipValue: number
}

export interface PlayerState {
  hp: number
  maxHp: number
}

export interface BossBehaviorState {
  chargeStored: boolean
}

export interface BossIntentWeights {
  ATTACK: number
  CHARGE: number
  DEFEND: number
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

export interface BossRoundState {
  intent: BossIntent | null
  isDefending: boolean
  willReleaseCharge: boolean
}

export interface PlayState {
  selectedCards: Card[]
  handType: HandType | null
  score: number
}

export type SkillId = 'shield' | 'changeColor' | 'changeRank'

export interface SkillEnergyState {
  energy: number
}

export interface ShieldState {
  active: boolean
  onCooldown: boolean
  cooldownRounds: number
}

export interface RoundSkillsState {
  energy: SkillEnergyState
  shield: ShieldState
}

export interface ShuffleState {
  remaining: number
}

export interface RoundState {
  skills: RoundSkillsState
  shuffle: ShuffleState
}

export interface GameState {
  roomId: string
  userId: string
  layer: number
  round: number
  phase: RoundPhase
  player: PlayerState
  boss: BossState
  bossRound: BossRoundState
  deck: Card[]
  discardPile: Card[]
  hand: Card[]
  play: PlayState
  roundState: RoundState
  battleResult: BattleResult
  rogueMode?: boolean
  roguePhase?: 'BATTLE' | 'UPGRADE' | null
  deckCount: number
  discardCount: number
}
