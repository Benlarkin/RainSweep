import { NextResponse, type NextRequest } from 'next/server'
import { getContainer } from '@/lib/server/container'
import { getConfig } from '@/lib/config'
import { CompleteSignInRequest } from '@/managers/account/AccountRequests'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const appUrl = getConfig().appUrl
  const fail = (message: string) => NextResponse.redirect(new URL(`/?error=${encodeURIComponent(message)}`, appUrl))

  const denied = params.get('error')
  if (denied) return fail(denied === 'access_denied' ? 'Sign-in was cancelled.' : `Google returned: ${denied}`)

  const code = params.get('code')
  const state = params.get('state')
  if (!code || !state) return fail('Google did not return an authorization code.')

  const { accountManager } = await getContainer()
  const result = await accountManager.execute(new CompleteSignInRequest(code, state))
  if (!result.account) return fail(result.errorMessage ?? 'Sign-in failed.')

  return NextResponse.redirect(new URL(result.returnTo, appUrl))
}
