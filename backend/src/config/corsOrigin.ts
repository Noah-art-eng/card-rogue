export function getFrontendCorsConfig():
  | { origin: string; credentials: true }
  | { origin: true; credentials: true } {
  const frontendUrl = process.env.FRONTEND_URL?.trim()

  if (frontendUrl) {
    return { origin: frontendUrl, credentials: true }
  }

  return { origin: true, credentials: true }
}
