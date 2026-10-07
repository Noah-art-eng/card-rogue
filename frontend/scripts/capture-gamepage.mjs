import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../UI- reference/captures')
mkdirSync(outDir, { recursive: true })

const BASE = process.env.FRONTEND_URL ?? 'http://localhost:5174'
const EMAIL = process.env.TEST_EMAIL ?? `ui-check-${Date.now()}@test.local`
const PASSWORD = process.env.TEST_PASSWORD ?? 'test123456'
const USERNAME = process.env.TEST_USERNAME ?? `ui${Date.now().toString().slice(-6)}`

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    // Register (ignore if already exists)
    await page.goto(`${BASE}/register`)
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    const usernameInput = page.locator('input').filter({ hasNot: page.locator('[type="email"], [type="password"]') }).first()
    if (await usernameInput.count()) {
      await usernameInput.fill(USERNAME)
    }
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1500)

    // Login if register redirected to login or failed
    if (page.url().includes('/login') || !(await page.url()).includes('/lobby')) {
      await page.goto(`${BASE}/login`)
      await page.fill('input[type="email"]', EMAIL)
      await page.fill('input[type="password"]', PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/lobby', { timeout: 10000 }).catch(() => {})
    }

    await page.goto(`${BASE}/game?layer=1`)
    await page.waitForSelector('.game-page', { timeout: 20000 })
    await page.waitForSelector('.hand-card__img', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(3000)

    const outPath = join(outDir, 'remaster-gamepage.png')
    await page.screenshot({ path: outPath, fullPage: false, timeout: 60000, animations: 'disabled' })
    console.log('Screenshot saved:', outPath)
    console.log('URL:', page.url())
    console.log('Cards:', await page.locator('.hand-card').count())
    console.log('HandArea bg:', await page.locator('.game-handarea').evaluate(el => getComputedStyle(el).backgroundImage))
    console.log('Battlefield bg img:', await page.locator('.battlefield__bg-img').count())
    console.log('Boss img:', await page.locator('.battlefield__boss-img').count())
    console.log('Skill icons:', await page.locator('.skillbar__skill-icon').count())
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
