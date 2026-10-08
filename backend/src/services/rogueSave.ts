/**
 * 肉鸽存档的 MongoDB 读写封装。
 * 按用户覆盖当前快照，页面恢复时读取它，通关或主动放弃时再删除它。
 */

import { SavePoint } from '../models/SavePoint.js'

// 用用户 ID 覆盖或新建唯一的肉鸽存档快照。
export async function saveGame(userId: string, roomId: string, snapshot: unknown, layer = 1) {
  return SavePoint.findOneAndUpdate(
    { userId },
    { roomId, snapshot, layer },
    { new: true, upsert: true },
  ).lean()
}

// 读取用户最近一次可恢复的肉鸽存档。
export async function loadGame(userId: string) {
  return SavePoint.findOne({ userId }).lean()
}

// 在通关或主动放弃时删除用户的肉鸽存档。
export async function clearSave(userId: string) {
  return SavePoint.deleteOne({ userId })
}
