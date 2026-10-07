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

export function isPhase(ctx: GameContext, phase: RoundPhase): boolean {
  return ctx.phase === phase
}

export function getAllowedEvents(phase: RoundPhase): GameEventType[] {
  return PHASE_ALLOWED_EVENTS[phase]
}

export function canAcceptEvent(ctx: GameContext, event: GameEvent): boolean {
  const allowedEvents = getAllowedEvents(ctx.phase)
  return allowedEvents.includes(event.type)
}

export function assertCanAcceptEvent(ctx: GameContext, event: GameEvent): void {
  if (!canAcceptEvent(ctx, event)) {
    throw new Error(`Event ${event.type} is not allowed in phase ${ctx.phase}`)
  }
}
