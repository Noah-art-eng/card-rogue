import mongoose from 'mongoose'

import { User } from '../models/User.js'

// 负责 repairGoogleIdIndex 的业务处理。
async function repairGoogleIdIndex(): Promise<void> {
  try {
    await User.collection.dropIndex('googleId_1')
    console.log('Dropped legacy googleId index')
  } catch {
    // index may not exist
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
