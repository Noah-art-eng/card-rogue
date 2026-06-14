import mongoose from 'mongoose'

import { User } from '../models/User.js'

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

export async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables')
  }

  await mongoose.connect(uri)
  console.log('MongoDB connected successfully')
  await repairGoogleIdIndex()
}
