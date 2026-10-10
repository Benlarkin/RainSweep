// Captures the README screenshots and tour GIF from a running demo server.
//
//   npm run build:demo && npm run start:demo    # in one terminal
//   npm run screenshots                         # in another
//
// Writes to docs/screenshots/. Start from a fresh server each time: the tour
// archives and unsubscribes, and demo state lasts until the server restarts.
// The GIF needs ffmpeg on your PATH; without it the script keeps the .webm.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = path.resolve('docs/screenshots')
const DESKTOP = { width: 1440, height: 900 }

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

async function signedIn(options = {}) {
  const context = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 2, serviceWorkers: 'block', ...options })
  const page = await context.newPage()
  page.on('dialog', dialog => void dialog.accept())
  await page.goto(BASE)
  await page.getByText('Open the demo mailbox').click()
  await page.waitForSelector('[aria-label="Conversations"]')
  return { context, page }
}

async function openThread(page, subject) {
  await page.getByRole('listbox', { name: 'Conversations' }).getByText(subject).first().click()
  await page.getByRole('heading', { name: subject }).waitFor()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(600)
}

async function scan(page) {
  await page.goto(`${BASE}/cleanup`)
  await page.getByRole('button', { name: 'Scan my mail' }).click()
  await page.getByRole('button', { name: 'Rescan' }).waitFor({ timeout: 60_000 })
}

async function shoot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
  console.log(`  ${name}.png`)
}

console.log(`Capturing from ${BASE}`)

{
  const { context, page } = await signedIn()
  await openThread(page, 'Re: Kitchen remodel quote')
  await shoot(page, 'inbox')
  await scan(page)
  await page.getByText('Who sends you the most').waitFor()
  await shoot(page, 'insights')
  await page.getByRole('navigation', { name: 'Groupings' }).getByRole('button', { name: /^Senders/ }).click()
  await shoot(page, 'cleanup')
  await context.close()
}

{
  const { context, page } = await signedIn({ colorScheme: 'dark' })
  await openThread(page, "Mom's birthday dinner")
  await shoot(page, 'dark')
  await context.close()
}

{
  const { context, page } = await signedIn({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.waitForTimeout(600)
  await shoot(page, 'mobile')
  await context.close()
}

// The tour: read, archive, then sweep a newsletter away. Recorded last because it changes the mailbox.
{
  const videoDir = path.join(OUT, '.video')
  const size = { width: 1280, height: 800 }
  const { context, page } = await signedIn({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: videoDir, size } })
  const pause = ms => page.waitForTimeout(ms)
  await pause(1200)
  await openThread(page, 'Saturday hike if the rain lets up?')
  await pause(1500)
  await page.keyboard.press('e')
  await pause(1500)
  await page.getByRole('link', { name: 'Clean up' }).click()
  await page.getByRole('button', { name: 'Scan my mail' }).click()
  await page.getByRole('button', { name: 'Rescan' }).waitFor({ timeout: 60_000 })
  await pause(2000)
  await page.getByRole('navigation', { name: 'Groupings' }).getByRole('button', { name: /^Senders/ }).click()
  await pause(1500)
  const linkwork = page.locator('li', { hasText: 'Linkwork' }).first()
  await linkwork.hover()
  await pause(600)
  await linkwork.getByRole('button', { name: 'Unsubscribe' }).click()
  await pause(1800)
  await linkwork.getByRole('button', { name: 'Trash all' }).click()
  await pause(2500)
  await context.close()

  const [video] = readdirSync(videoDir)
  const webm = path.join(OUT, 'tour.webm')
  renameSync(path.join(videoDir, video), webm)
  rmSync(videoDir, { recursive: true, force: true })
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf',
      'fps=10,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
      path.join(OUT, 'tour.gif')])
    rmSync(webm)
    console.log('  tour.gif')
  } catch {
    console.log('  tour.webm (install ffmpeg to get a GIF)')
  }
}

await browser.close()
