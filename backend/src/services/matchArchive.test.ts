import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

const testDir = path.dirname(fileURLToPath(import.meta.url))
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(testDir, '../../.cache/mongodb-binaries')

import { Match } from '../models/Match.js'
import { User } from '../models/User.js'
import { BattleResult, RoundPhase } from '../types/state.js'
import type { GameContext } from '../types/state.js'
import { createTestBoss, defaultTestBattle, defaultTestBossRound, defaultRoundState } from '../pve/testBoss.js'
import {
  archiveGameIfEnded,
  getRecentMatchesForUser,
  shouldArchiveMatch,
} from './matchArchive.js'

function createEndedContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    ...defaultTestBattle,
    boss: createTestBoss({ name: 'Tide Warden' }),
    deck: [],
    discardPile: [],
    hand: [],
    play: {
      selectedCards: [],
      handType: null,
      score: 0,
    },
    bossRound: { ...defaultTestBossRound },
    roundState: { ...defaultRoundState },
    totalDamageDealt: 120,
    matchArchived: false,
    ...overrides,
  }
}

async function createTestUser(userId: string) {
  return User.create({
    _id: userId,
    username: `user-${userId.slice(-4)}`,
    email: `${userId.slice(-4)}@test.com`,
    passwordHash: 'hash',
  })
}

async function runTests(): Promise<void> {
  const mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())

  try {
    const userAId = new mongoose.Types.ObjectId()
    const userBId = new mongoose.Types.ObjectId()
    const userA = userAId.toString()
    const userB = userBId.toString()

    await createTestUser(userA)
    await createTestUser(userB)

    // ---- Match archiving ----

    const winContext = createEndedContext({
      userId: userA,
      layer: 1,
      round: 4,
      battleResult: BattleResult.WIN,
      totalDamageDealt: 543,
    })

    assert.equal(shouldArchiveMatch(winContext), true)

    const archivedWin = await archiveGameIfEnded(winContext)
    assert.equal(archivedWin.matchArchived, true)

    const winMatches = await Match.find({ userId: userA })
    assert.equal(winMatches.length, 1)
    assert.equal(winMatches[0]?.isWin, true)
    assert.equal(winMatches[0]?.roundsPlayed, 4)
    assert.equal(winMatches[0]?.totalDamageDealt, 543)

    // ---- User.stats after WIN ----

    const afterWin = await User.findById(userA)
    assert.ok(afterWin, 'user A should exist')
    assert.equal(afterWin.stats.totalGames, 1, 'WIN: totalGames should be 1')
    assert.equal(afterWin.stats.totalWins, 1, 'WIN: totalWins should be 1')
    assert.equal(afterWin.stats.maxDamage, 543, 'WIN: maxDamage should be 543')
    assert.equal(afterWin.stats.winRate, 1, 'WIN: winRate should be 1.0')

    // ---- LOSE ----

    const loseContext = createEndedContext({
      userId: userA,
      layer: 2,
      round: 7,
      battleResult: BattleResult.LOSE,
      totalDamageDealt: 210,
    })

    const archivedLose = await archiveGameIfEnded(loseContext)
    assert.equal(archivedLose.matchArchived, true)

    // ---- User.stats after LOSE ----

    const afterLose = await User.findById(userA)
    assert.ok(afterLose)
    assert.equal(afterLose.stats.totalGames, 2, 'LOSE: totalGames should be 2')
    assert.equal(afterLose.stats.totalWins, 1, 'LOSE: totalWins stays 1')
    assert.equal(afterLose.stats.maxDamage, 543, 'LOSE: maxDamage still 543 (higher of 543/210)')
    assert.equal(afterLose.stats.winRate, 0.5, 'LOSE: winRate should be 0.5')

    // ---- maxDamage updates when new record set ----

    const bigDmgContext = createEndedContext({
      userId: userA,
      layer: 1,
      battleResult: BattleResult.WIN,
      totalDamageDealt: 1000,
    })

    await archiveGameIfEnded(bigDmgContext)
    const afterBigDmg = await User.findById(userA)
    assert.ok(afterBigDmg)
    assert.equal(afterBigDmg.stats.maxDamage, 1000, 'maxDamage should update to new record 1000')
    assert.equal(afterBigDmg.stats.totalGames, 3)
    assert.equal(afterBigDmg.stats.totalWins, 2)
    assert.ok(
      Math.abs(afterBigDmg.stats.winRate - 2 / 3) < 0.0001,
      `winRate should be ~0.667, got ${afterBigDmg.stats.winRate}`,
    )

    // ---- No-duplicate guard ----

    const duplicateAttempt = await archiveGameIfEnded(archivedWin)
    assert.equal(duplicateAttempt.matchArchived, true)
    const afterDuplicate = await Match.find({ userId: userA })
    assert.equal(afterDuplicate.length, 3, 'duplicate archiveGameIfEnded should not create new Match')

    // ---- User isolation ----

    await Match.create({
      userId: userB,
      mode: 'PVE',
      layer: 3,
      bossName: 'Verdant Tyrant',
      isWin: true,
      roundsPlayed: 2,
      totalDamageDealt: 99,
      endedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const recentForUserB = await getRecentMatchesForUser(userB, 10)
    assert.equal(recentForUserB.length, 1)
    assert.equal(recentForUserB[0]?.bossName, 'Verdant Tyrant')

    const recentForUserA = await getRecentMatchesForUser(userA, 10)
    assert.equal(recentForUserA.length, 3, 'userA should only see own matches')

    // ---- Sort order (endedAt desc) ----

    await Match.create({
      userId: userA,
      mode: 'PVE',
      layer: 1,
      bossName: 'Older Match',
      isWin: false,
      roundsPlayed: 1,
      totalDamageDealt: 10,
      endedAt: new Date('2026-01-02T00:00:00.000Z'),
    })

    await Match.create({
      userId: userA,
      mode: 'PVE',
      layer: 1,
      bossName: 'Newer Match',
      isWin: true,
      roundsPlayed: 3,
      totalDamageDealt: 30,
      endedAt: new Date('2026-06-01T00:00:00.000Z'),
    })

    const sorted = await getRecentMatchesForUser(userA, 10)
    assert.ok(
      sorted[0]!.endedAt >= sorted[1]!.endedAt,
      'matches should be sorted by endedAt descending',
    )

    // ---- ONGOING should not archive ----

    const ongoingContext = createEndedContext({
      battleResult: BattleResult.ONGOING,
      phase: RoundPhase.PLAY,
    })

    assert.equal(shouldArchiveMatch(ongoingContext), false)
    const notArchived = await archiveGameIfEnded(ongoingContext)
    assert.equal(notArchived.matchArchived, false)

    console.log('matchArchive tests passed')
  } finally {
    await mongoose.disconnect()
    await mongod.stop()
  }
}

runTests().catch((error) => {
  console.error(error)
  process.exit(1)
})
