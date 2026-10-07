import mongoose, { Schema, type Document, type Model } from 'mongoose'

export interface IUserStats {
  totalGames: number
  totalWins: number
  winRate: number
  maxDamage: number
}

export interface IUser extends Document {
  username: string
  email: string
  passwordHash: string
  avatar: string
  provider: 'local' | 'google'
  googleId?: string | null
  stats: IUserStats
  createdAt: Date
  updatedAt: Date
}

const statsSchema = new Schema<IUserStats>(
  {
    totalGames: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    maxDamage: { type: Number, default: 0 },
  },
  { _id: false },
)

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: '' },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, sparse: true, unique: true },
    stats: { type: statsSchema, default: () => ({}) },
  },
  { timestamps: true },
)

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema)
