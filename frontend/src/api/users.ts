import apiClient from './client'
import type { User } from '../types/user'

interface MeResponse {
  user: User
}

interface UploadAvatarResponse {
  message: string
  user: User
}

// 读取当前登录用户的最新资料，用于恢复或刷新认证状态。
export async function getMe(): Promise<MeResponse> {
  const response = await apiClient.get<MeResponse>('/users/me')
  return response.data
}

// 将用户选择的头像文件上传给服务端，并返回更新后的用户资料。
export async function uploadAvatar(file: File): Promise<UploadAvatarResponse> {
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await apiClient.patch<UploadAvatarResponse>('/users/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}
