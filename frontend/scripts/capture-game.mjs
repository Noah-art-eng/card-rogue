import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../UI-reference/captures')
const BASE = process.env.BASE_URL ?? 'http://localhost:5173'

mkdirSync(OUT, { recursive: true })

async function main() {
  const prefix = process.argv[2] ?? 'current'
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    const ts = Date.now()
    const email = `cap${ts}@test.local`
    const pass = 'test123456'
    const user = `cap${ts}`

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

    await page.goto(`${BASE}/lobby`)
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(OUT, `${prefix}-lobby.png`) })

    await page.goto(`${BASE}/game?layer=1`)
    await page.waitForSelector('.game-page', { timeout: 30000 })
    await page.waitForSelector('.hand-card__img', { timeout: 30000 })
    await page.waitForTimeout(4000)

    await page.screenshot({ path: join(OUT, `${prefix}-game-full.png`), fullPage: false })

    const regions = [
      ['battlefield', '.game-battlefield'],
      ['skillbar', '.game-skillbar'],
      ['scorepanel', '.game-scorepanel'],
      ['handarea', '.game-handarea'],
      ['playerhud', '.player-hud'],
      ['deck', '.handarea__deck-slot'],
    ]

    for (const [name, sel] of regions) {
      const el = page.locator(sel).first()
      if (await el.count()) {
        await el.screenshot({ path: join(OUT, `${prefix}-${name}.png`) }).catch(() => {})
      }
    }

    console.log('Saved to', OUT, 'prefix:', prefix)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
