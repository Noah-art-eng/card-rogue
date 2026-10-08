/**
 * MongoDB 中肉鸽存档的文档结构。
 * 每个用户只保留一份当前快照，刷新或重新进入肉鸽时据此恢复进度。
 */

import mongoose, { Schema, type Document, type Model } from 'mongoose'

export interface ISavePoint extends Document {
  userId: mongoose.Types.ObjectId
  roomId: string
  snapshot: unknown
  layer: number
  createdAt: Date
  updatedAt: Date
}

const savePointSchema = new Schema<ISavePoint>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    roomId: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    layer: { type: Number, required: true, default: 1 },
  },
  { timestamps: true },
)

export const SavePoint: Model<ISavePoint> =
  mongoose.models.SavePoint ?? mongoose.model<ISavePoint>('SavePoint', savePointSchema)
