import { NextResponse, type NextRequest } from 'next/server'
import { getContainer } from '@/lib/server/container'
import { BeginSignInRequest } from '@/managers/account/AccountRequests'

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/mail'
  const { accountManager } = await getContainer()
  const result = await accountManager.execute(new BeginSignInRequest(returnTo))

  if (!result.authorizationUrl) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(result.errorMessage ?? 'Sign-in failed')}`, request.url))
  }
  return NextResponse.redirect(result.authorizationUrl)
}
