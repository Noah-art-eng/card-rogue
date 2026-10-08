/**
 * PvE 状态机事件的阶段校验。
 * 操作进入业务结算前会先在这里确认当前阶段是否允许该事件，避免客户端跳过正常回合顺序。
 */

import { GameEventType, type GameEvent } from '../types/events.js'
import { RoundPhase, type GameContext } from '../types/state.js'

const PHASE_ALLOWED_EVENTS: Record<RoundPhase, GameEventType[]> = {
  [RoundPhase.DRAW]: [GameEventType.ADVANCE_PHASE],
  [RoundPhase.BOSS_TELEGRAPH]: [GameEventType.ADVANCE_PHASE],
  [RoundPhase.SKILL]: [GameEventType.ADVANCE_PHASE],
  [RoundPhase.SHUFFLE]: [GameEventType.ADVANCE_PHASE],
  [RoundPhase.PLAY]: [GameEventType.ADVANCE_PHASE],
  [RoundPhase.RESOLVE]: [GameEventType.ADVANCE_PHASE, GameEventType.SET_BATTLE_RESULT],
  [RoundPhase.BOSS_ATTACK]: [GameEventType.ADVANCE_PHASE, GameEventType.SET_BATTLE_RESULT],
  [RoundPhase.ROUND_END]: [
    GameEventType.ADVANCE_PHASE,
    GameEventType.START_ROUND,
    GameEventType.SET_BATTLE_RESULT,
  ],
}

// 判断当前状态是否处于指定回合阶段。
export function isPhase(ctx: GameContext, phase: RoundPhase): boolean {
  return ctx.phase === phase
}

// 返回指定阶段允许接收的状态机事件。
export function getAllowedEvents(phase: RoundPhase): GameEventType[] {
  return PHASE_ALLOWED_EVENTS[phase]
}

// 检查事件是否可在当前状态机阶段执行。
export function canAcceptEvent(ctx: GameContext, event: GameEvent): boolean {
  const allowedEvents = getAllowedEvents(ctx.phase)
  return allowedEvents.includes(event.type)
}

// 在事件非法时抛出错误，阻止状态机越阶段转换。
export function assertCanAcceptEvent(ctx: GameContext, event: GameEvent): void {
  if (!canAcceptEvent(ctx, event)) {
    throw new Error(`Event ${event.type} is not allowed in phase ${ctx.phase}`)
  }
}
