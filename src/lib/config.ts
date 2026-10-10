export interface AppConfig {
  googleClientId: string
  googleClientSecret: string
  appUrl: string
  sessionSecret: string
}

let cached: AppConfig | null = null

/** Reads server configuration from the environment. Never import from client components. */
export function getConfig(): AppConfig {
  if (cached) return cached
  const missing: string[] = []
  const read = (name: string): string => {
    const value = process.env[name]
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
