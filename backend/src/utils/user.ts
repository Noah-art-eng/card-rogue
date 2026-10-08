/**
 * MongoDB 用户文档到公开用户资料的转换。
 * 密码哈希等私密字段会被过滤，只把前端需要的账号、头像和统计数据返回出去。
 */

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
