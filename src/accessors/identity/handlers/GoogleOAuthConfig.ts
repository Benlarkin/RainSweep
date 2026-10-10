export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
export const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
export const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

/** gmail.modify covers reading, labelling, trashing and sending — but not permanent deletion. */
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify'
export const SCOPES = ['openid', 'email', 'profile', GMAIL_SCOPE]
