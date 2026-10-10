export interface AppConfig {
  googleClientId: string
  googleClientSecret: string
  appUrl: string
  sessionSecret: string
}

let cached: AppConfig | null = null

/**
 * Demo mode (`RAINSWEEP_DEMO=1`, or `npm run demo`) runs the whole app against
 * a fictional in-memory mailbox, with no Google project or credentials.
 */
export function isDemoMode(): boolean {
  return process.env.RAINSWEEP_DEMO === '1'
}

// Demo sessions hold no real credentials, so a fixed key is fine there.
const DEMO_SESSION_SECRET = 'cmFpbnN3ZWVwLWRlbW8tc2Vzc2lvbi1zZWNyZXQtMzI='

/** Reads server configuration from the environment. Never import from client components. */
export function getConfig(): AppConfig {
  if (cached) return cached
  const missing: string[] = []
  const demo = isDemoMode()
  const demoDefaults: Record<string, string> = {
    GOOGLE_CLIENT_ID: 'demo',
    GOOGLE_CLIENT_SECRET: 'demo',
    APP_URL: 'http://localhost:3000',
    SESSION_SECRET: DEMO_SESSION_SECRET,
  }
  const read = (name: string): string => {
    const value = process.env[name] || (demo ? demoDefaults[name] : undefined)
    if (!value) missing.push(name)
    return value ?? ''
  }
  const config: AppConfig = {
    googleClientId: read('GOOGLE_CLIENT_ID'),
    googleClientSecret: read('GOOGLE_CLIENT_SECRET'),
    appUrl: read('APP_URL').replace(/\/+$/, ''),
    sessionSecret: read('SESSION_SECRET'),
  }
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}. See .env.example.`)
  }
  cached = config
  return config
}
