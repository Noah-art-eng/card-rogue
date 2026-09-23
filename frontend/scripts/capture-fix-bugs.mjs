import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../UI-reference/captures')
const BASE = process.env.BASE_URL ?? 'http://localhost:5173'

mkdirSync(OUT, { recursive: true })

// 执行 registerAndEnterGame 对应的浏览器测试辅助操作。
async function registerAndEnterGame(page) {
  const ts = Date.now()
  const email = `fix${ts}@test.local`
  const pass = 'test123456'
  const user = `fix${ts}`

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
  await page.waitForSelector('.battlefield-video-bg__video', { timeout: 30000 })
  await page.waitForTimeout(2500)
}

// 执行 readGameState 对应的浏览器测试辅助操作。
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

// 执行 getBossVideoSrc 对应的浏览器测试辅助操作。
async function getBossVideoSrc(page) {
  return page.evaluate(() => {
    const v = document.querySelector('.boss-video-display__video')
    if (!v) return null
    return v.currentSrc || v.getAttribute('src')
  })
}

// 执行 tryUseShield 对应的浏览器测试辅助操作。
async function tryUseShield(page) {
  const slot = page.locator('.skillbar__slot').filter({ hasText: 'Shield' })
  const disabled = await slot.evaluate((el) => el.classList.contains('skillbar__slot--disabled')).catch(() => true)
  if (!disabled) {
    await slot.locator('.skillbar__skill-btn').click()
    await page.waitForTimeout(400)
  }
}

// 执行 enterPlayPhase 对应的浏览器测试辅助操作。
async function enterPlayPhase(page) {
  await page.getByRole('button', { name: 'Play & Attack' }).click()
  await page.waitForTimeout(600)
}

// 执行 selectMaxCards 对应的浏览器测试辅助操作。
async function selectMaxCards(page, max = 5) {
  const cards = page.locator('.hand-card:not(.hand-card--disabled)')
  const count = Math.min(await cards.count(), max)
  for (let i = 0; i < count; i++) {
    await cards.nth(i).click()
    await page.waitForTimeout(160)
  }
  return count
}

// 执行 confirmPlayAttack 对应的浏览器测试辅助操作。
async function confirmPlayAttack(page) {
  await page.getByRole('button', { name: 'Play & Attack' }).click()
}

// 执行 waitForSkillPhase 对应的浏览器测试辅助操作。
async function waitForSkillPhase(page, timeoutMs = 28000) {
  await page
    .waitForFunction(
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
    )
    .catch(() => {})
  await page.waitForTimeout(700)
}

// 执行 playOneRound 对应的浏览器测试辅助操作。
async function playOneRound(page) {
  const state = await readGameState(page)
  if (!state || state.battleResult !== 'ONGOING') return state

  if (state.phase === 'SKILL') {
    await tryUseShield(page)
    await enterPlayPhase(page)
  }

  await selectMaxCards(page, 5)
  await confirmPlayAttack(page)

  if (state.phase === 'SKILL' || (await readGameState(page))?.phase === 'PLAY') {
    await page.waitForTimeout(400)
  }

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
      { timeout: 32000 },
    )
    .catch(() => {})

  await page.waitForTimeout(900)
  return readGameState(page)
}

// 执行 playUntilWin 对应的浏览器测试辅助操作。
async function playUntilWin(page, maxRounds = 60) {
  for (let i = 0; i < maxRounds; i++) {
    const state = await readGameState(page)
    if (!state) break
    if (state.battleResult === 'WIN') return true
    await playOneRound(page)
  }
  return (await readGameState(page))?.battleResult === 'WIN'
}

// 执行截图脚本的入口流程。
async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await registerAndEnterGame(page)

    await page.locator('.game-battlefield').first().screenshot({
      path: join(OUT, 'fix-background-video.png'),
    })

    await enterPlayPhase(page)
    await page.locator('.hand-card').nth(2).hover()
    await page.waitForTimeout(350)
    await page.locator('.game-handarea').first().screenshot({
      path: join(OUT, 'fix-card-hover.png'),
    })
    await page.mouse.move(0, 0)
    await page.waitForTimeout(200)

    await page.locator('.game-handarea').first().screenshot({
      path: join(OUT, 'fix-handarea.png'),
    })

    await selectMaxCards(page, 3)
    await confirmPlayAttack(page)
    await page.waitForTimeout(650)

    const normalHitSrc = await getBossVideoSrc(page)
    console.log('Boss video during normal hit:', normalHitSrc)
    if (normalHitSrc?.includes('boss-hit')) {
      console.warn('WARN: boss-hit.mp4 should NOT play on normal hit')
    }

    await page.locator('.game-battlefield').first().screenshot({
      path: join(OUT, 'fix-boss-normal-hit.png'),
    })

    await waitForSkillPhase(page)

    const won = await playUntilWin(page, 60)
    if (!won) {
      console.warn('Could not reach WIN within round limit; capturing best-effort defeated frame')
    } else {
      await page.waitForTimeout(1250)
    }

    const overlayVisible = await page.locator('.game-overlay').isVisible().catch(() => false)
    const defeatedSrc = await getBossVideoSrc(page)
    console.log('Boss video on defeat:', defeatedSrc, 'overlay visible:', overlayVisible)

    await page.locator('.game-battlefield').first().screenshot({
      path: join(OUT, 'fix-boss-defeated-hit.png'),
    })

    console.log('Saved fix captures to', OUT)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
