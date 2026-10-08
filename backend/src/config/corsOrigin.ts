/**
 * 前后端跨域来源的选择规则。
 * 部署时优先使用环境变量指定的前端地址；本地未配置时保留开发环境可用的同源策略。
 */

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
