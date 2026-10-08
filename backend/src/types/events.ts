/**
 * PvE 状态机可接收事件的数据定义。
 * 回合机器用这些事件区分开始回合、推进阶段和写入胜负结果。
 */

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
