import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const OUT = join(process.cwd(), 'design-screenshots')

async function main() {
  await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: join(OUT, 'design-login.png'), fullPage: false })

  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: join(OUT, 'design-register.png'), fullPage: false })

  const stamp = Date.now()
  const username = `ds${stamp}`.slice(0, 12)
  const email = `ds${stamp}@example.com`
  const password = 'designpass1'

  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' })
  await page.fill('#username', username)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.locator('button[type="submit"]').click({ force: true })
  await page.waitForURL('**/lobby', { timeout: 15000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: join(OUT, 'design-lobby.png'), fullPage: false })

  await page.goto(`${BASE}/leaderboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: join(OUT, 'design-leaderboard.png'), fullPage: false })

  await page.goto(`${BASE}/game?layer=1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: join(OUT, 'design-gamepage.png'), fullPage: false })

  await browser.close()
  console.log('Screenshots saved to', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
