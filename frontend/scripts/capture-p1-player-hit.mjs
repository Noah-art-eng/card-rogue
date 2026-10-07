import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../UI-reference/captures')
const BASE = process.env.BASE_URL ?? 'http://localhost:5173'

mkdirSync(OUT, { recursive: true })

async function registerAndEnterGame(page) {
  const ts = Date.now()
  const email = `p1${ts}@test.local`
  const pass = 'test123456'
  const user = `p1${ts}`

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
  await page.waitForTimeout(1500)
}

async function enterPlayPhase(page) {
  await page.getByRole('button', { name: 'Play & Attack' }).click()
  await page.waitForTimeout(500)
}

async function playMinimalAttack(page) {
  await enterPlayPhase(page)
  await page.locator('.hand-card').first().click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Play & Attack' }).click()
}

async function waitForPhase(page, phase, timeoutMs = 25000) {
  await page.waitForFunction(
    (expected) => {
      const pre = document.querySelector('.game-debug pre')
      if (!pre) return false
      try {
        return JSON.parse(pre.textContent ?? '').phase === expected
      } catch {
        return false
      }
    },
    phase,
    { timeout: timeoutMs },
  ).catch(() => {})
}

async function capturePlayerHit(page) {
  await playMinimalAttack(page)
  await waitForPhase(page, 'BOSS_ATTACK')
  await page.waitForTimeout(400)
  await page.locator('.game-handarea').first().screenshot({
    path: join(OUT, 'p1-player-hit-mid.png'),
  })

  await page.waitForSelector('.handarea__player-damage-float', { timeout: 12000 }).catch(() => {})
  await page.waitForTimeout(300)
  await page.locator('.game-handarea').first().screenshot({
    path: join(OUT, 'p1-player-hit.png'),
  })
}

async function captureShieldAbsorb(page) {
  await page.locator('img.skillbar__skill-icon[alt="Shield"]').click()
  await page.waitForTimeout(400)

  await playMinimalAttack(page)
  await waitForPhase(page, 'BOSS_ATTACK', 20000)
  await page.waitForTimeout(1600)

  await page.waitForSelector('.battlefield__battle-banner--shield_break', {
    timeout: 12000,
  }).catch(() => {})
  await page.waitForTimeout(400)

  await page.locator('.game-page').screenshot({
    path: join(OUT, 'p1-shield-absorb.png'),
  })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    const mode = process.argv[2] ?? 'all'

    if (mode === 'hit' || mode === 'all') {
      await registerAndEnterGame(page)
      await capturePlayerHit(page)
    }

    if (mode === 'shield' || mode === 'all') {
      const shieldPage =
        mode === 'all' ? await browser.newPage({ viewport: { width: 1440, height: 900 } }) : page
      await registerAndEnterGame(shieldPage)
      await captureShieldAbsorb(shieldPage)
      if (mode === 'all') await shieldPage.close()
    }

    console.log('Saved P1 captures to', OUT)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
