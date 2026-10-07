import type { IUser } from '../models/User.js'

export function toPublicUser(user: IUser) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    stats: user.stats,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
