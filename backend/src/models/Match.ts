import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose'

export type MatchMode = 'PVE'

export interface IMatch extends Document {
  userId: Types.ObjectId
  mode: MatchMode
  layer: number
  bossName: string
  isWin: boolean
  roundsPlayed: number
  totalDamageDealt: number
  endedAt: Date
}

const matchSchema = new Schema<IMatch>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mode: { type: String, enum: ['PVE'], required: true },
    layer: { type: Number, required: true },
    bossName: { type: String, required: true },
    isWin: { type: Boolean, required: true },
    roundsPlayed: { type: Number, required: true },
    totalDamageDealt: { type: Number, required: true, default: 0 },
    endedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: false },
)

matchSchema.index({ userId: 1, endedAt: -1 })

export const Match: Model<IMatch> = mongoose.model<IMatch>('Match', matchSchema)
