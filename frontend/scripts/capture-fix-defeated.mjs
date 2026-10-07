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
  const email = `win${ts}@test.local`
  const pass = 'test123456'
  const user = `win${ts}`

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
  await page.waitForTimeout(2000)
}

async function readGameState(page) {
  return page.evaluate(() => {
    const pre = document.querySelector('.game-debug pre')
    if (!pre) return null
    try {
      return JSON.parse(pre.textContent ?? '')
    } catch {
      return null
    }
  })
}

async function tryUseShield(page) {
  const slot = page.locator('.skillbar__slot').filter({ hasText: 'Shield' })
  const disabled = await slot.evaluate((el) => el.classList.contains('skillbar__slot--disabled')).catch(() => true)
  if (!disabled) {
    await slot.locator('.skillbar__skill-btn').click()
    await page.waitForTimeout(400)
  }
}

async function playRound(page) {
  const state = await readGameState(page)
  if (!state || state.battleResult !== 'ONGOING') return state

  if (state.phase === 'SKILL') {
    await tryUseShield(page)
    await page.getByRole('button', { name: 'Play & Attack' }).click()
    await page.waitForTimeout(600)
  }

  const cards = page.locator('.hand-card:not(.hand-card--disabled)')
  const count = Math.min(await cards.count(), 5)
  for (let i = 0; i < count; i++) {
    await cards.nth(i).click()
    await page.waitForTimeout(140)
  }

  await page.getByRole('button', { name: 'Play & Attack' }).click()

  await page
    .waitForFunction(
      () => {
        const pre = document.querySelector('.game-debug pre')
        if (!pre) return false
        try {
          const s = JSON.parse(pre.textContent ?? '')
          return s.phase === 'SKILL' || s.battleResult === 'WIN' || s.battleResult === 'LOSE'
        } catch {
          return false
        }
      },
      undefined,
      { timeout: 35000 },
    )
    .catch(() => {})

  await page.waitForTimeout(900)
  return readGameState(page)
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await registerAndEnterGame(page)

    let wonThisRun = false
    for (let i = 0; i < 65; i++) {
      const state = await readGameState(page)
      if (!state) break
      if (state.battleResult === 'WIN') {
        wonThisRun = true
        break
      }
      if (state.battleResult === 'LOSE') {
        console.error('Player lost at round', state.round)
        break
      }
      await playRound(page)
      const after = await readGameState(page)
      if (after?.battleResult === 'WIN') {
        wonThisRun = true
        break
      }
    }

    const final = await readGameState(page)
    console.log('Final:', final?.battleResult, 'round', final?.round, 'boss hp', final?.boss?.hp)

    if (wonThisRun) {
      await page.waitForTimeout(1250)
    }

    const overlayVisible = await page.locator('.game-overlay').isVisible().catch(() => false)
    console.log('Overlay visible:', overlayVisible)

    await page.locator('.game-battlefield').first().screenshot({
      path: join(OUT, 'fix-boss-defeated-hit.png'),
    })
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
