// 优先使用部署配置的前端地址，未配置时允许同源开发环境访问。
export function getFrontendCorsConfig():
  | { origin: string; credentials: true }
  | { origin: true; credentials: true } {
  const frontendUrl = process.env.FRONTEND_URL?.trim()

  if (frontendUrl) {
    return { origin: frontendUrl, credentials: true }
  }

  return { origin: true, credentials: true }
}
