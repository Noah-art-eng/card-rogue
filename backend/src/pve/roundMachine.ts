import { assertCanAcceptEvent } from './guards.js'
import { GameEventType, type GameEvent } from '../types/events.js'
import {
  BattleResult,
  ROUND_PHASE_ORDER,
  RoundPhase,
  type GameContext,
} from '../types/state.js'

function getNextPhase(current: RoundPhase): RoundPhase {
  const currentIndex = ROUND_PHASE_ORDER.indexOf(current)

  if (currentIndex === -1 || currentIndex === ROUND_PHASE_ORDER.length - 1) {
    return RoundPhase.DRAW
  }

  return ROUND_PHASE_ORDER[currentIndex + 1]
}

function handleStartRound(ctx: GameContext): GameContext {
  return {
    ...ctx,
    round: ctx.round + 1,
    phase: RoundPhase.DRAW,
    battleResult: BattleResult.ONGOING,
  }
}

function handleAdvancePhase(ctx: GameContext): GameContext {
  return {
    ...ctx,
    phase: getNextPhase(ctx.phase),
  }
}

function handleSetBattleResult(
  ctx: GameContext,
  result: BattleResult,
): GameContext {
  return {
    ...ctx,
    battleResult: result,
  }
}

export function transition(ctx: GameContext, event: GameEvent): GameContext {
  assertCanAcceptEvent(ctx, event)

  switch (event.type) {
    case GameEventType.START_ROUND:
      return handleStartRound(ctx)
    case GameEventType.ADVANCE_PHASE:
      return handleAdvancePhase(ctx)
    case GameEventType.SET_BATTLE_RESULT:
      return handleSetBattleResult(ctx, event.result)
    default:
      return ctx
  }
}
