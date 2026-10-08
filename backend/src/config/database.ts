/**
 * MongoDB 连接和历史索引修复入口。
 * 启动时连接数据库，并补齐 Google 登录依赖的稀疏唯一索引，避免旧数据影响认证。
 */

import mongoose from 'mongoose'

import { User } from '../models/User.js'

// 连接后清理旧版索引，避免历史 Google ID 数据继续触发唯一键冲突。
async function repairGoogleIdIndex(): Promise<void> {
  try {
    await User.collection.dropIndex('googleId_1')
    console.log('Dropped legacy googleId index')
  } catch {
  }

  await User.syncIndexes()
  await User.updateMany({ googleId: null }, { $unset: { googleId: '' } })
}

// 连接 MongoDB，并在连接后修复旧版 Google ID 索引。
export async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables')
  }

  await mongoose.connect(uri)
  console.log('MongoDB connected successfully')
  await repairGoogleIdIndex()
}
