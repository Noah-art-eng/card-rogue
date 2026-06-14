import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const OUT = join(process.cwd(), 'design-screenshots')

async function main() {
  await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  const stamp = Date.now()
  const username = `ld${stamp}`.slice(0, 12)
  const email = `ld${stamp}@example.com`
  const password = 'designpass1'

  // Login loading overlay (before session exists)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('#email', 'slow@example.com')
  await page.fill('#password', 'wrongpass1')
  await page.route('**/api/auth/login', async (route) => {
    await new Promise((r) => setTimeout(r, 3000))
    await route.continue()
  })
  void page.locator('button[type="submit"]').click({ force: true })
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(OUT, 'loading-login.png'), fullPage: false })
  await page.unroute('**/api/auth/login')

  // Register + login to get session
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' })
  await page.fill('#username', username)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.locator('button[type="submit"]').click({ force: true })
  await page.waitForURL('**/lobby', { timeout: 15000 })
  await page.waitForTimeout(900)
  await page.screenshot({ path: join(OUT, 'transition-lobby.png'), fullPage: false })

  // Lobby start game loading overlay
  await page.getByRole('button', { name: /start solo pve/i }).click()
  await page.waitForTimeout(280)
  await page.screenshot({ path: join(OUT, 'loading-lobby-start.png'), fullPage: false })
  await page.waitForURL('**/game**', { timeout: 15000 }).catch(() => undefined)
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(OUT, 'transition-gamepage.png'), fullPage: false })

  await browser.close()
  console.log('Step 2 screenshots saved to', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
