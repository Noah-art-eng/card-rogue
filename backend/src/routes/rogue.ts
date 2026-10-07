import { Router } from 'express'
import type { Response } from 'express'

import { authMiddleware, type AuthRequest } from '../middleware/authMiddleware.js'
import { createBossForLayer } from '../pve/bossConfig.js'
import { playerHpForLayer } from '../pve/layerConfig.js'
import { clearSave, loadGame, saveGame } from '../services/rogueSave.js'
import {
  FIRST_LAYER_UPGRADES,
  applyPlayerBuffs,
  generateUpgradePool,
} from '../types/buff.js'
import type { Element } from '../types/card.js'
import { Element as ElementEnum } from '../types/card.js'

const router = Router()

function getUserId(req: AuthRequest): string | undefined {
  return req.auth?.userId
}

router.get('/upgrades', async (req, res, next) => {
  try {
    const layer = Math.max(1, parseInt(String(req.query.layer), 10) || 1)
    const elementOrder: Element[] = [ElementEnum.WATER, ElementEnum.FIRE, ElementEnum.GRASS]
    const chosenElement =
      (typeof req.query.element === 'string' ? req.query.element : null) ??
      elementOrder[(layer - 1) % 3]
    const excludeTypes =
      typeof req.query.excludeTypes === 'string'
        ? req.query.excludeTypes.split(',').filter(Boolean)
        : []
    const options =
      layer === 1
        ? FIRST_LAYER_UPGRADES
        : generateUpgradePool(chosenElement as Element, layer, excludeTypes)
    res.status(200).json({ success: true, message: 'OK', data: options })
  } catch (err) {
    next(err)
  }
})

router.use(authMiddleware)

router.post('/start', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated', data: null })
      return
    }

    await clearSave(userId)

    const boss = createBossForLayer(1)
    const playerHp = playerHpForLayer(1)
    const snapshot = {
      layer: 1,
      playerHp,
      playerMaxHp: playerHp,
      bossHp: boss.hp,
      enhancements: [],
      status: 'active',
      startedAt: new Date().toISOString(),
    }

    const saved = await saveGame(userId, 'rogue', snapshot, 1)
    res.status(201).json({ success: true, message: 'Rogue run started', data: saved })
  } catch (err) {
    next(err)
  }
})

router.get('/current', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated', data: null })
      return
    }

    const save = await loadGame(userId)
    const snapshot = save?.snapshot as { status?: string } | undefined
    if (!save || snapshot?.status !== 'active') {
      res.status(200).json({ success: true, message: 'No active rogue run found', data: null })
      return
    }

    res.status(200).json({ success: true, message: 'OK', data: save })
  } catch (err) {
    next(err)
  }
})

router.put('/save', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated', data: null })
      return
    }

    const { layer, playerHp, bossHp, enhancements, stats } = req.body ?? {}
    if (typeof layer !== 'number' || layer < 1) {
      res.status(400).json({ success: false, message: 'Invalid layer', data: null })
      return
    }
    if (typeof playerHp !== 'number' || playerHp < 0) {
      res.status(400).json({ success: false, message: 'Invalid playerHp', data: null })
      return
    }
    if (typeof bossHp !== 'number' || bossHp < 0) {
      res.status(400).json({ success: false, message: 'Invalid bossHp', data: null })
      return
    }
    if (enhancements !== undefined && !Array.isArray(enhancements)) {
      res.status(400).json({ success: false, message: 'enhancements must be an array', data: null })
      return
    }

    const save = await loadGame(userId)
    const existing = (save?.snapshot ?? {}) as Record<string, unknown>
    const snapshot = {
      ...existing,
      layer: layer ?? existing.layer,
      playerHp: playerHp ?? existing.playerHp,
      bossHp: bossHp ?? existing.bossHp,
      enhancements: enhancements ?? existing.enhancements,
      stats: stats ?? existing.stats,
      roguePhase: 'BATTLE',
      savedAt: new Date().toISOString(),
    }

    const updated = await saveGame(userId, 'rogue', snapshot, snapshot.layer as number)
    res.status(200).json({ success: true, message: 'Saved', data: updated })
  } catch (err) {
    next(err)
  }
})

router.post('/floor-won', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated', data: null })
      return
    }

    const { layer, playerHp, enhancements } = req.body ?? {}
    if (typeof layer !== 'number' || layer < 1) {
      res.status(400).json({ success: false, message: 'Invalid layer', data: null })
      return
    }
    if (typeof playerHp !== 'number' || playerHp < 0) {
      res.status(400).json({ success: false, message: 'Invalid playerHp', data: null })
      return
    }

    const nextLayer = layer + 1
    const save = await loadGame(userId)
    const nextBoss = createBossForLayer(nextLayer)
    const baseHp = playerHpForLayer(nextLayer)
    const saveSnapshot = save?.snapshot as { enhancements?: unknown[] } | undefined
    const allEnhancements = enhancements ?? saveSnapshot?.enhancements ?? []
    const buffs = (allEnhancements as Array<{ buff?: unknown }>)
      .map((entry) => (typeof entry === 'object' && entry?.buff ? entry.buff : null))
      .filter(Boolean)
    const { maxHp } = applyPlayerBuffs(buffs as never[], baseHp, 3)
    const snapshot = {
      ...(saveSnapshot ?? {}),
      layer: nextLayer,
      playerHp: maxHp,
      playerMaxHp: maxHp,
      bossHp: nextBoss.hp,
      enhancements: allEnhancements,
      checkpointLayer: nextLayer,
      checkpointHp: playerHp,
      status: 'active',
    }

    const updated = await saveGame(userId, 'rogue', snapshot, nextLayer)
    res.status(200).json({ success: true, message: 'Floor cleared', data: updated })
  } catch (err) {
    next(err)
  }
})

router.post('/floor-lost', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated', data: null })
      return
    }

    const save = await loadGame(userId)
    const snap = save?.snapshot as
      | {
          checkpointLayer?: number
          enhancements?: unknown[]
        }
      | undefined

    if (!snap) {
      res.status(200).json({ success: true, message: 'No save found', data: { action: 'end' } })
      return
    }

    if (snap.checkpointLayer && snap.checkpointLayer >= 1) {
      const boss = createBossForLayer(snap.checkpointLayer)
      const hp = playerHpForLayer(snap.checkpointLayer)
      const checkpoint = {
        floor: snap.checkpointLayer,
        playerHp: hp,
        playerMaxHp: hp,
        bossHp: boss.hp,
        enhancements: snap.enhancements ?? [],
      }
      res.status(200).json({
        success: true,
        message: 'Checkpoint restored',
        data: { action: 'restore', checkpoint },
      })
      return
    }

    await clearSave(userId)
    res.status(200).json({ success: true, message: 'Run ended', data: { action: 'end' } })
  } catch (err) {
    next(err)
  }
})

router.post('/choose-enhancement', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated', data: null })
      return
    }

    const { enhancement } = req.body ?? {}
    if (!enhancement || typeof enhancement !== 'object' || !enhancement.id || !enhancement.buff) {
      res.status(400).json({ success: false, message: 'Invalid enhancement', data: null })
      return
    }

    const validTypes = [
      'ELEMENT_CHIP_MULT',
      'ELEMENT_CHIPS_BONUS',
      'ELEMENT_DRAW_ON_SHUFFLE',
      'HIGH_RANK_DRAW_ON_SHUFFLE',
      'HAND_MULT_BONUS',
      'HAND_CHIPS_BONUS',
      'ALL_CHIPS_BONUS',
      'HP_BONUS',
      'SKILL_ENERGY_MAX',
      'TIERED_CHIPS_BONUS',
      'TIERED_MULT_BONUS',
    ]
    if (!validTypes.includes(enhancement.buff.type)) {
      res.status(400).json({ success: false, message: 'Invalid buff type', data: null })
      return
    }

    const save = await loadGame(userId)
    const saveSnapshot = save?.snapshot as { enhancements?: unknown[]; layer?: number } | undefined
    if (!saveSnapshot) {
      res.status(404).json({ success: false, message: 'No active run', data: null })
      return
    }

    const snapshot = {
      ...saveSnapshot,
      enhancements: [...(saveSnapshot.enhancements ?? []), enhancement],
    }
    const updated = await saveGame(userId, 'rogue', snapshot, snapshot.layer ?? 1)
    res.status(200).json({ success: true, message: 'Enhancement saved', data: updated })
  } catch (err) {
    next(err)
  }
})

router.post('/won', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated', data: null })
      return
    }

    await clearSave(userId)
    res.status(200).json({ success: true, message: 'Run complete', data: null })
  } catch (err) {
    next(err)
  }
})

router.post('/abandon', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated', data: null })
      return
    }

    await clearSave(userId)
    res.status(200).json({ success: true, message: 'Run abandoned', data: null })
  } catch (err) {
    next(err)
  }
})

export default router
