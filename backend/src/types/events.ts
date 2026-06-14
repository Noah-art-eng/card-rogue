import type { BattleResult } from './state.js'

export enum GameEventType {
  START_ROUND = 'START_ROUND',
  ADVANCE_PHASE = 'ADVANCE_PHASE',
  SET_BATTLE_RESULT = 'SET_BATTLE_RESULT',
}

export type GameEvent =
  | { type: GameEventType.START_ROUND }
  | { type: GameEventType.ADVANCE_PHASE }
  | { type: GameEventType.SET_BATTLE_RESULT; result: BattleResult }
