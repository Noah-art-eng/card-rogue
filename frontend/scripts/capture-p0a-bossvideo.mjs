import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../UI-reference/captures')
const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const PREFIX = 'p0a-bossvideo'

mkdirSync(OUT, { recursive: true })

async function registerAndEnterGame(page) {
  const ts = Date.now()
  const email = `p0a${ts}@test.local`
  const pass = 'test123456'
  const user = `p0a${ts}`

  await page.goto(`${BASE}/register`)
  await page.getByLabel('Username').fill(user)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(pass)
  await page.getByRole('button', { name: 'Register' }).click()
  await page.waitForTimeout(1500)

  if (!page.url().includes('/lobby')) {
    await page.goto(`${BASE}/login`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(pass)
    await page.getByRole('button', { name: 'Login' }).click()
    await page.waitForTimeout(1500)
  }

  await page.goto(`${BASE}/game?layer=1`)
  await page.waitForSelector('.game-page', { timeout: 30000 })
  await page.waitForSelector('.hand-card__img', { timeout: 30000 })
  await page.waitForSelector('.boss-video-display__video, .battlefield-boss-portrait-img', {
    timeout: 30000,
  })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await registerAndEnterGame(page)
    await page.waitForTimeout(3500)
    await page.locator('.game-battlefield').first().screenshot({
      path: join(OUT, `${PREFIX}-idle.png`),
    })

    await page.getByRole('button', { name: 'Play & Attack' }).click()
    await page.waitForTimeout(600)

    await page.locator('.hand-card').first().click()
    await page.waitForTimeout(300)
    await page.locator('.hand-card').nth(1).click()
    await page.waitForTimeout(300)

    await page.getByRole('button', { name: 'Play & Attack' }).click()
    await page.waitForTimeout(800)
    await page.locator('.game-battlefield').first().screenshot({
      path: join(OUT, `${PREFIX}-player-attack.png`),
    })

    await page.waitForSelector('.battlefield__battle-banner--boss, .boss-video-display__video', {
      timeout: 15000,
    }).catch(() => {})
    await page.waitForTimeout(1200)
    await page.locator('.game-battlefield').first().screenshot({
      path: join(OUT, `${PREFIX}-boss-attack.png`),
    })

    console.log('Saved P0-A captures to', OUT)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
