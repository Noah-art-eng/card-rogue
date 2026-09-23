import apiClient from './client'
import type { User } from '../types/user'

interface MeResponse {
  user: User
}

interface UploadAvatarResponse {
  message: string
  user: User
}

// 获取、计算或校验 Me。
export async function getMe(): Promise<MeResponse> {
  const response = await apiClient.get<MeResponse>('/users/me')
  return response.data
}

// 负责 uploadAvatar 的业务处理。
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
