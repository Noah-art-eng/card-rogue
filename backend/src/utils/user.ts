import type { IUser } from '../models/User.js'

// 过滤密码等私密字段后生成公开用户资料。
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
