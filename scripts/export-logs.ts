#!/usr/bin/env tsx
/**
 * Automated daily log export from openrouter.ai/logs
 *
 * Uses Playwright with Calvin's Chrome profile to:
 * 1. Navigate to openrouter.ai/logs
 * 2. Set date range to last 24 hours
 * 3. Click Export to download CSV
 * 4. POST CSV data to the deployed app's /api/upload-logs
 *
 * Environment variables:
 *   APP_URL            — Deployed app URL (default: https://openrouter.warmwetcircuits.com)
 *   AUTH_PASSWORD       — App login password (to get session cookie)
 *   CHROME_USER_DATA    — Chrome user data dir (default: ~/Library/Application Support/Google/Chrome)
 *   CHROME_PROFILE      — Chrome profile dir (default: Default)
 *   TELEGRAM_BOT_TOKEN  — Optional: Telegram bot token for failure alerts
 *   TELEGRAM_CHAT_ID    — Optional: Telegram chat ID for failure alerts
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import os from 'os'

const APP_URL = process.env.APP_URL || 'https://openrouter.warmwetcircles.com'
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || ''
const CHROME_USER_DATA = process.env.CHROME_USER_DATA || path.join(os.homedir(), 'Library/Application Support/Google/Chrome')
const CHROME_PROFILE = process.env.CHROME_PROFILE || 'Default'
const DOWNLOAD_DIR = path.join(os.tmpdir(), 'openrouter-export')

function log(level: 'info' | 'error' | 'warn', msg: string) {
  const ts = new Date().toISOString()
  const prefix = { info: 'INFO', error: 'ERROR', warn: 'WARN' }[level]
  console.log(`[${ts}] [${prefix}] ${msg}`)
}

async function sendTelegramAlert(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    })
    if (!res.ok) log('warn', `Telegram alert failed: ${res.status}`)
  } catch (e) {
    log('warn', `Telegram alert error: ${e}`)
  }
}

async function getSessionCookie(): Promise<string> {
  if (!AUTH_PASSWORD) {
    throw new Error('AUTH_PASSWORD env var required to authenticate with the app')
  }

  const res = await fetch(`${APP_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: AUTH_PASSWORD }),
  })

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${await res.text()}`)
  }

  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) throw new Error('No session cookie returned from login')

  // Extract the cookie value
  const match = setCookie.match(/or_session=([^;]+)/)
  if (!match) throw new Error('Could not parse session cookie')

  return `or_session=${match[1]}`
}

async function main() {
  log('info', 'Starting OpenRouter log export')

  // Calculate date range: last 24 hours
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Format as datetime-local value (YYYY-MM-DDTHH:MM)
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const fromValue = fmt(yesterday)
  const toValue = fmt(now)
  log('info', `Date range: ${fromValue} to ${toValue}`)

  // Ensure download directory exists
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })

  // Launch browser with Chrome user profile
  log('info', `Using Chrome profile: ${CHROME_PROFILE} from ${CHROME_USER_DATA}`)

  const browser = await chromium.launchPersistentContext(
    path.join(CHROME_USER_DATA, CHROME_PROFILE),
    {
      headless: false, // Must be headed to use existing Chrome profile cookies
      channel: 'chrome',
      args: [
        '--no-first-run',
        '--disable-blink-features=AutomationControlled',
      ],
      acceptDownloads: true,
      viewport: { width: 1400, height: 800 },
    },
  )

  try {
    const page = browser.pages()[0] || await browser.newPage()

    // Navigate to logs page
    log('info', 'Navigating to openrouter.ai/logs')
    await page.goto('https://openrouter.ai/logs', { waitUntil: 'networkidle' })

    // Wait for the page to load
    await page.waitForSelector('button:has-text("Export")', { timeout: 15000 })
    log('info', 'Logs page loaded')

    // Set the "From" date input
    const fromInput = page.locator('input[type="datetime-local"]').first()
    await fromInput.fill(fromValue)
    log('info', `Set From: ${fromValue}`)

    // Set the "To" date input
    const toInput = page.locator('input[type="datetime-local"]').last()
    await toInput.fill(toValue)
    log('info', `Set To: ${toValue}`)

    // Wait briefly for the table to reload
    await page.waitForTimeout(2000)

    // Click Export and wait for the download
    log('info', 'Clicking Export...')
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    await page.click('button:has-text("Export")')

    const download = await downloadPromise
    const downloadPath = path.join(DOWNLOAD_DIR, download.suggestedFilename())
    await download.saveAs(downloadPath)
    log('info', `CSV downloaded: ${downloadPath}`)

    // Read the CSV file
    const csvContent = fs.readFileSync(downloadPath, 'utf-8')
    const lines = csvContent.trim().split('\n')
    log('info', `CSV contains ${lines.length - 1} data rows`)

    if (lines.length <= 1) {
      log('warn', 'CSV is empty (header only), skipping upload')
      return
    }

    // Parse CSV into row objects
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(line => {
      // Simple CSV parsing (handles quoted fields with commas)
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())

      const row: Record<string, string> = {}
      headers.forEach((h, i) => {
        row[h] = values[i] || ''
      })
      return row
    })

    // POST to app API
    log('info', `Uploading ${rows.length} rows to ${APP_URL}/api/upload-logs`)

    const sessionCookie = await getSessionCookie()

    const uploadRes = await fetch(`${APP_URL}/api/upload-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ rows }),
    })

    if (!uploadRes.ok) {
      const body = await uploadRes.text()
      throw new Error(`Upload failed: ${uploadRes.status} ${body}`)
    }

    const result = await uploadRes.json()
    log('info', `Upload complete: ${result.stored} rows stored`)

    // Clean up downloaded file
    fs.unlinkSync(downloadPath)
    log('info', 'Export complete successfully')
  } finally {
    await browser.close()
  }
}

main().catch(async (err) => {
  log('error', `Export failed: ${err.message}`)
  await sendTelegramAlert(
    `<b>OpenRouter Log Export Failed</b>\n\n<code>${err.message}</code>\n\nTime: ${new Date().toISOString()}`,
  )
  process.exit(1)
})
