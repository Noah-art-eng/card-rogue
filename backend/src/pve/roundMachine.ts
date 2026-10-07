import { assertCanAcceptEvent } from './guards.js'
import { GameEventType, type GameEvent } from '../types/events.js'
import {
  BattleResult,
  ROUND_PHASE_ORDER,
  RoundPhase,
  type GameContext,
} from '../types/state.js'

// 定义 PvE 状态机中每个阶段的下一阶段。
function getNextPhase(current: RoundPhase): RoundPhase {
  const currentIndex = ROUND_PHASE_ORDER.indexOf(current)

  if (currentIndex === -1 || currentIndex === ROUND_PHASE_ORDER.length - 1) {
    return RoundPhase.DRAW
  }

  return ROUND_PHASE_ORDER[currentIndex + 1]
}

// 结算完成后重置为抽牌阶段，并递增回合号以隔离上一回合状态。
function handleStartRound(ctx: GameContext): GameContext {
  return {
    ...ctx,
    round: ctx.round + 1,
    phase: RoundPhase.DRAW,
    battleResult: BattleResult.ONGOING,
  }
}

// 将状态机按既定阶段顺序推进，末尾自动回到下一回合的抽牌阶段。
function handleAdvancePhase(ctx: GameContext): GameContext {
  return {
    ...ctx,
    phase: getNextPhase(ctx.phase),
  }
}

// 把战斗结果写入当前游戏状态。
function handleSetBattleResult(
  ctx: GameContext,
  result: BattleResult,
): GameContext {
  return {
    ...ctx,
    battleResult: result,
  }
}

// 根据合法游戏事件驱动 PvE 回合状态机转换。
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
