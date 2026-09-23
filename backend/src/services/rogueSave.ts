import { SavePoint } from '../models/SavePoint.js'

// 以 userId 为唯一键更新或创建肉鸽存档快照。
export async function saveGame(userId: string, roomId: string, snapshot: unknown, layer = 1) {
  return SavePoint.findOneAndUpdate(
    { userId },
    { roomId, snapshot, layer },
    { new: true, upsert: true },
  ).lean()
}

// 从 MongoDB 读取用户的肉鸽存档。
export async function loadGame(userId: string) {
  return SavePoint.findOne({ userId }).lean()
}

// 删除用户的肉鸽存档。
export async function clearSave(userId: string) {
  return SavePoint.deleteOne({ userId })
}
