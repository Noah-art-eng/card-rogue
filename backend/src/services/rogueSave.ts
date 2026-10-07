import { SavePoint } from '../models/SavePoint.js'

export async function saveGame(userId: string, roomId: string, snapshot: unknown, layer = 1) {
  return SavePoint.findOneAndUpdate(
    { userId },
    { roomId, snapshot, layer },
    { new: true, upsert: true },
  ).lean()
}

export async function loadGame(userId: string) {
  return SavePoint.findOne({ userId }).lean()
}

export async function clearSave(userId: string) {
  return SavePoint.deleteOne({ userId })
}
