import type { Buff } from '../types/buff.js'
import { applyPlayerBuffs, buffKey } from '../types/buff.js'
import { BossIntent } from '../types/boss.js'
import { Element } from '../types/card.js'
import {
  INITIAL_SKILL_ENERGY,
  SHUFFLE_PER_ROUND,
  BattleResult,
  RoundPhase,
  SHIELD_COOLDOWN_ROUNDS,
  type GameContext,
  type SkillId,
  type UseSkillOptions,
} from '../types/state.js'
import {
  applyDefendDamageReduction,
  generateBossTelegraph,
  getBossAttackDamage,
} from './boss.js'
import { calculateDamage } from './damage.js'
import { detectHandType } from './handEvaluator.js'
import {
  HAND_SIZE,
  drawCards,
  initDeckState,
  playCards,
  changeCardElement,
  changeCardRank,
  shuffleHandCards,
  type DeckState,
} from './deck.js'
import { resetShuffleRemaining, tickShieldCooldown, voidShield, createRoundState } from './roundState.js'
import { createBossForLayer } from './bossConfig.js'
import { playerHpForLayer } from './layerConfig.js'

const MAX_SELECTED_CARDS = 5

function syncDeckState(context: GameContext, deckState: DeckState): GameContext {
  return {
    ...context,
    deck: deckState.deck,
    discardPile: deckState.discardPile,
    hand: deckState.hand,
  }
}

function toDeckState(context: GameContext): DeckState {
  return {
    deck: context.deck,
    discardPile: context.discardPile,
    hand: context.hand,
  }
}

function getPlayerBuffs(context: GameContext): Buff[] {
  return context.player.buffs ?? []
}

function getPreviewScore(context: GameContext, selectedCards: GameContext['hand']): number {
  if (selectedCards.length === 0) {
    return 0
  }

  const handType = detectHandType(selectedCards)
  const rawDamage = calculateDamage(
    handType,
    selectedCards,
    getPlayerBuffs(context),
    context.bossRound.isDefending,
  )

  return rawDamage
}

function updatePlayPreview(context: GameContext, selectedCards: GameContext['hand']): GameContext {
  if (selectedCards.length === 0) {
    return {
      ...context,
      play: {
        selectedCards: [],
        handType: null,
        score: 0,
      },
    }
  }

  const handType = detectHandType(selectedCards)
  const score = getPreviewScore(context, selectedCards)

  return {
    ...context,
    play: {
      selectedCards,
      handType,
      score,
    },
  }
}

export function startPveGameSetup(context: GameContext): GameContext {
  const deckState = initDeckState()
  drawCards(deckState, HAND_SIZE)

  const withDeck = syncDeckState(context, deckState)

  return updatePlayPreview(
    {
      ...withDeck,
      bossRound: generateBossTelegraph(withDeck),
      phase: RoundPhase.SKILL,
    },
    [],
  )
}

function toggleSelectedCards(
  context: GameContext,
  cardId: string,
): GameContext['play']['selectedCards'] {
  const card = context.hand.find((item) => item.id === cardId)
  if (!card) {
    throw new Error('Card is not in hand')
  }

  const isSelected = context.play.selectedCards.some((item) => item.id === cardId)
  let selectedCards = context.play.selectedCards

  if (isSelected) {
    selectedCards = selectedCards.filter((item) => item.id !== cardId)
  } else {
    if (selectedCards.length >= MAX_SELECTED_CARDS) {
      throw new Error('Cannot select more than 5 cards')
    }

    selectedCards = [...selectedCards, card]
  }

  return selectedCards
}

export function selectCard(context: GameContext, cardId: string): GameContext {
  if (context.phase !== RoundPhase.PLAY && context.phase !== RoundPhase.SHUFFLE) {
    throw new Error('Can only select cards during PLAY or SHUFFLE phase')
  }

  const selectedCards = toggleSelectedCards(context, cardId)

  if (context.phase === RoundPhase.SHUFFLE) {
    return {
      ...context,
      play: {
        selectedCards,
        handType: null,
        score: 0,
      },
    }
  }

  return updatePlayPreview(context, selectedCards)
}

export function playConfirm(context: GameContext): GameContext {
  const selectedCards = context.play.selectedCards
  const handType = detectHandType(selectedCards)
  const rawScore = calculateDamage(
    handType,
    selectedCards,
    getPlayerBuffs(context),
    context.bossRound.isDefending,
  )

  const deckState = toDeckState(context)
  playCards(deckState, selectedCards)

  return {
    ...syncDeckState(context, deckState),
    play: {
      selectedCards: [],
      handType,
      score: rawScore,
    },
    phase: RoundPhase.RESOLVE,
    battleResult: BattleResult.ONGOING,
  }
}

export function resolveComplete(context: GameContext): GameContext {
  if (context.phase !== RoundPhase.RESOLVE) {
    throw new Error('Can only resolve after entering RESOLVE phase')
  }

  const damage = applyDefendDamageReduction(
    context.play.score,
    context.bossRound.isDefending,
  )
  const totalDamageDealt = context.totalDamageDealt + damage

  const bossHp = Math.max(0, context.boss.hp - damage)

  if (bossHp <= 0) {
    if (context.rogueMode) {
      return {
        ...context,
        boss: {
          ...context.boss,
          hp: bossHp,
        },
        roundState: voidShield(context.roundState),
        totalDamageDealt,
        battleResult: BattleResult.ONGOING,
        roguePhase: 'UPGRADE',
        phase: RoundPhase.RESOLVE,
      }
    }

    return {
      ...context,
      boss: {
        ...context.boss,
        hp: bossHp,
      },
      roundState: voidShield(context.roundState),
      totalDamageDealt,
      battleResult: BattleResult.WIN,
      phase: RoundPhase.RESOLVE,
    }
  }

  return {
    ...context,
    boss: {
      ...context.boss,
      hp: bossHp,
    },
    totalDamageDealt,
    battleResult: BattleResult.ONGOING,
    phase: RoundPhase.BOSS_ATTACK,
  }
}

export function confirmPlay(context: GameContext): GameContext {
  if (context.roguePhase === 'UPGRADE') {
    throw new Error('Cannot play cards during upgrade phase')
  }

  if (context.phase !== RoundPhase.PLAY) {
    throw new Error('Can only confirm play during PLAY phase')
  }

  if (context.play.selectedCards.length < 1) {
    throw new Error('At least one card must be selected')
  }

  if (context.play.selectedCards.length > MAX_SELECTED_CARDS) {
    throw new Error(`Cannot play more than ${MAX_SELECTED_CARDS} cards`)
  }

  const resolvedContext = playConfirm(context)
  return resolveComplete(resolvedContext)
}

export function doBossAttackComplete(context: GameContext): GameContext {
  if (context.phase !== RoundPhase.BOSS_ATTACK) {
    throw new Error('Boss attack can only complete during BOSS_ATTACK phase')
  }

  const intent = context.bossRound.intent

  if (intent === BossIntent.DEFEND) {
    return {
      ...context,
      phase: RoundPhase.ROUND_END,
    }
  }

  if (intent === BossIntent.CHARGE) {
    return {
      ...context,
      boss: {
        ...context.boss,
        behavior: {
          chargeStored: true,
        },
      },
      phase: RoundPhase.ROUND_END,
    }
  }

  const nextBoss = context.bossRound.willReleaseCharge
    ? {
        ...context.boss,
        behavior: {
          chargeStored: false,
        },
      }
    : context.boss

  if (context.roundState.skills.shield.active) {
    return {
      ...context,
      boss: nextBoss,
      roundState: {
        ...context.roundState,
        skills: {
          ...context.roundState.skills,
          shield: {
            active: false,
            onCooldown: true,
            cooldownRounds: SHIELD_COOLDOWN_ROUNDS,
          },
        },
      },
      phase: RoundPhase.ROUND_END,
    }
  }

  const attackDamage = getBossAttackDamage(context)
  const nextPlayerHp = Math.max(0, context.player.hp - attackDamage)

  if (nextPlayerHp <= 0) {
    return {
      ...context,
      boss: nextBoss,
      player: {
        ...context.player,
        hp: 0,
      },
      battleResult: BattleResult.LOSE,
    }
  }

  return {
    ...context,
    boss: nextBoss,
    player: {
      ...context.player,
      hp: nextPlayerHp,
    },
    phase: RoundPhase.ROUND_END,
  }
}

export function advanceRound(context: GameContext): GameContext {
  if (context.phase !== RoundPhase.ROUND_END) {
    throw new Error(`Cannot advance round from phase ${context.phase}`)
  }

  const deckState = toDeckState(context)
  const cardsNeeded = HAND_SIZE - deckState.hand.length

  if (cardsNeeded > 0) {
    drawCards(deckState, cardsNeeded)
  }

  const withDeck = {
    ...syncDeckState(context, deckState),
    round: context.round + 1,
  }

  const nextRoundState = resetShuffleRemaining({
    ...withDeck.roundState,
    skills: {
      ...withDeck.roundState.skills,
      shield: tickShieldCooldown(withDeck.roundState.skills.shield),
    },
  })

  return updatePlayPreview(
    {
      ...withDeck,
      bossRound: generateBossTelegraph(withDeck),
      roundState: nextRoundState,
      phase: RoundPhase.SKILL,
    },
    [],
  )
}

export function resolveAnimationComplete(context: GameContext): GameContext | null {
  if (context.phase !== RoundPhase.BOSS_ATTACK) {
    return null
  }

  const afterAttack = doBossAttackComplete(context)

  if (afterAttack.battleResult === BattleResult.LOSE) {
    return afterAttack
  }

  return advanceRound(afterAttack)
}

function spendSkillEnergy(context: GameContext): GameContext['roundState']['skills']['energy'] {
  if (context.roundState.skills.energy.energy < 1) {
    throw new Error('Not enough energy')
  }

  return {
    energy: context.roundState.skills.energy.energy - 1,
  }
}

function isValidTargetElement(element: unknown): element is Element {
  return element === Element.WATER || element === Element.FIRE || element === Element.GRASS
}

function isValidTargetRank(rank: unknown): rank is number {
  return typeof rank === 'number' && Number.isInteger(rank) && rank >= 1 && rank <= 13
}

export function useSkill(
  context: GameContext,
  skillId: SkillId,
  options: UseSkillOptions = {},
): GameContext {
  if (context.phase !== RoundPhase.SKILL) {
    throw new Error('Can only use skills during SKILL phase')
  }

  if (skillId === 'shield') {
    if (context.roundState.skills.shield.onCooldown) {
      throw new Error('Shield is on cooldown')
    }

    const nextEnergy = spendSkillEnergy(context)

    return {
      ...context,
      roundState: {
        ...context.roundState,
        skills: {
          ...context.roundState.skills,
          energy: nextEnergy,
          shield: {
            active: true,
            onCooldown: false,
            cooldownRounds: 0,
          },
        },
      },
    }
  }

  if (skillId === 'changeColor') {
    const { cardId, targetElement } = options

    if (!cardId) {
      throw new Error('cardId is required for changeColor')
    }

    if (!isValidTargetElement(targetElement)) {
      throw new Error('targetElement must be WATER, FIRE, or GRASS')
    }

    const card = context.hand.find((item) => item.id === cardId)
    if (!card) {
      throw new Error('Card is not in hand')
    }

    const nextEnergy = spendSkillEnergy(context)
    const nextHand = context.hand.map((item) =>
      item.id === cardId ? changeCardElement(item, targetElement) : item,
    )

    return {
      ...context,
      hand: nextHand,
      roundState: {
        ...context.roundState,
        skills: {
          ...context.roundState.skills,
          energy: nextEnergy,
        },
      },
    }
  }

  if (skillId === 'changeRank') {
    const { cardId, targetRank } = options

    if (!cardId) {
      throw new Error('cardId is required for changeRank')
    }

    if (!isValidTargetRank(targetRank)) {
      throw new Error('targetRank must be an integer from 1 to 13')
    }

    const card = context.hand.find((item) => item.id === cardId)
    if (!card) {
      throw new Error('Card is not in hand')
    }

    const nextEnergy = spendSkillEnergy(context)
    const nextHand = context.hand.map((item) =>
      item.id === cardId ? changeCardRank(item, targetRank) : item,
    )

    return {
      ...context,
      hand: nextHand,
      roundState: {
        ...context.roundState,
        skills: {
          ...context.roundState.skills,
          energy: nextEnergy,
        },
      },
    }
  }

  throw new Error(`Unknown skill: ${skillId}`)
}

export function enterShuffle(context: GameContext): GameContext {
  if (context.phase !== RoundPhase.SKILL) {
    throw new Error('Can only enter shuffle from SKILL phase')
  }

  if (context.roundState.shuffle.remaining === 0) {
    throw new Error('No shuffle remaining')
  }

  return {
    ...context,
    phase: RoundPhase.SHUFFLE,
    play: {
      selectedCards: [],
      handType: null,
      score: 0,
    },
  }
}

export function shuffleCards(context: GameContext): GameContext {
  if (context.phase !== RoundPhase.SHUFFLE) {
    throw new Error('Can only shuffle cards during SHUFFLE phase')
  }

  if (context.roundState.shuffle.remaining === 0) {
    throw new Error('No shuffle remaining')
  }

  if (context.play.selectedCards.length < 1) {
    throw new Error('At least one card must be selected to shuffle')
  }

  const deckState = toDeckState(context)
  shuffleHandCards(deckState, context.play.selectedCards)

  return {
    ...syncDeckState(context, deckState),
    play: {
      selectedCards: [],
      handType: null,
      score: 0,
    },
    roundState: {
      ...context.roundState,
      shuffle: {
        remaining: context.roundState.shuffle.remaining - 1,
      },
    },
  }
}

export function enterPlay(context: GameContext): GameContext {
  if (context.phase !== RoundPhase.SKILL && context.phase !== RoundPhase.SHUFFLE) {
    throw new Error('Can only enter play from SKILL or SHUFFLE phase')
  }

  return {
    ...context,
    phase: RoundPhase.PLAY,
    play: {
      selectedCards: [],
      handType: null,
      score: 0,
    },
  }
}

function mergeBuffs(existing: Buff[], incoming: Buff[]): Buff[] {
  const merged = [...existing]
  for (const buff of incoming) {
    const key = buffKey(buff)
    const idx = merged.findIndex((item) => buffKey(item) === key)
    if (idx >= 0) {
      merged[idx] = buff
    } else {
      merged.push(buff)
    }
  }
  return merged
}

export function advanceRogueLayer(context: GameContext, incomingBuffs: Buff[] = []): GameContext {
  if (!context.rogueMode) {
    throw new Error('Not a rogue session')
  }
  if (context.roguePhase !== 'UPGRADE') {
    throw new Error('Not in upgrade phase')
  }

  const nextLayer = context.layer + 1
  const nextBoss = createBossForLayer(nextLayer)
  const baseHp = playerHpForLayer(nextLayer)
  const buffs = incomingBuffs.length > 0 ? mergeBuffs(context.player.buffs ?? [], incomingBuffs) : (context.player.buffs ?? [])
  const { maxHp, skillEnergyMax } = applyPlayerBuffs(buffs, baseHp, INITIAL_SKILL_ENERGY)

  const nextContext: GameContext = {
    ...context,
    layer: nextLayer,
    player: {
      ...context.player,
      hp: maxHp,
      maxHp,
      buffs,
      skillEnergyMax,
    },
    boss: nextBoss,
    round: 1,
    roguePhase: 'BATTLE',
    battleResult: BattleResult.ONGOING,
    roundState: createRoundState(skillEnergyMax, SHUFFLE_PER_ROUND),
    totalDamageDealt: 0,
    matchArchived: false,
  }

  return startPveGameSetup(nextContext)
}

export function restoreRogueCheckpoint(
  context: GameContext,
  payload: {
    layer: number
    playerHp: number
    bossHp: number
    buffs?: Buff[]
    shuffleCount?: number
    fullHeal?: boolean
  },
): GameContext {
  if (!context.rogueMode) {
    throw new Error('Not a rogue session')
  }

  const layer = Math.max(1, Math.floor(payload.layer))
  const bossTemplate = createBossForLayer(layer)
  const boss = {
    ...bossTemplate,
    hp: Math.max(1, Math.floor(payload.bossHp ?? bossTemplate.maxHp)),
  }
  const baseMaxHp = playerHpForLayer(layer)
  const shuffleCount = Math.max(2, Math.floor(payload.shuffleCount ?? SHUFFLE_PER_ROUND))
  const buffs = Array.isArray(payload.buffs) ? payload.buffs : (context.player.buffs ?? [])
  const { skillEnergyMax, maxHp } = applyPlayerBuffs(buffs, baseMaxHp, INITIAL_SKILL_ENERGY)
  const playerHp = payload.fullHeal ? maxHp : Math.max(1, Math.floor(payload.playerHp ?? maxHp))

  const restoredContext: GameContext = {
    ...context,
    layer,
    player: {
      ...context.player,
      hp: playerHp,
      maxHp,
      buffs,
      skillEnergyMax,
    },
    boss,
    round: 1,
    roundState: createRoundState(skillEnergyMax, shuffleCount),
    battleResult: BattleResult.ONGOING,
    roguePhase: 'BATTLE',
    totalDamageDealt: 0,
    matchArchived: false,
  }

  return startPveGameSetup(restoredContext)
}
