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
  const email = `p0b${ts}@test.local`
  const pass = 'test123456'
  const user = `p0b${ts}`

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

async function enterPlayPhase(page) {
  await page.getByRole('button', { name: 'Play & Attack' }).click()
  await page.waitForTimeout(600)
}

async function selectCardsByClass(page, classFragment, max = 5) {
  const cards = page.locator(`.hand-card${classFragment}`)
  const count = Math.min(await cards.count(), max)
  for (let i = 0; i < count; i++) {
    await cards.nth(i).click()
    await page.waitForTimeout(200)
  }
  return count
}

async function confirmPlayAttack(page) {
  await page.getByRole('button', { name: 'Play & Attack' }).click()
  await page.waitForTimeout(750)
}

async function waitForNextSkillPhase(page, timeoutMs = 22000) {
  await page.waitForFunction(
    () => {
      const pre = document.querySelector('.game-debug pre')
      if (!pre) return false
      try {
        const state = JSON.parse(pre.textContent ?? '')
        return state.phase === 'SKILL'
      } catch {
        return false
      }
    },
    undefined,
    { timeout: timeoutMs },
  ).catch(() => {})
  await page.waitForTimeout(800)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await registerAndEnterGame(page)

    await enterPlayPhase(page)
    await selectCardsByClass(page, '.hand-card--FIRE', 3)
    await confirmPlayAttack(page)
    await page.locator('.game-battlefield').first().screenshot({
      path: join(OUT, 'p0b-attackeffect-fire.png'),
    })

    await waitForNextSkillPhase(page)

    await enterPlayPhase(page)
    await page.locator('.hand-card--FIRE').first().click()
    await page.waitForTimeout(200)
    await page.locator('.hand-card--WATER').first().click()
    await page.waitForTimeout(200)
    await page.locator('.hand-card--GRASS').first().click()
    await page.waitForTimeout(200)
    await confirmPlayAttack(page)
    await page.locator('.game-battlefield').first().screenshot({
      path: join(OUT, 'p0b-attackeffect-normal.png'),
    })

    console.log('Saved P0-B captures to', OUT)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
