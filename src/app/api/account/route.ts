import { getContainer } from '@/lib/server/container'
import { errorJson, okJson } from '@/lib/server/http'
import { GetAccountRequest } from '@/managers/account/AccountRequests'

export async function GET() {
  const { accountManager } = await getContainer()
  const result = await accountManager.query(new GetAccountRequest())
  return result.account ? okJson({ account: result.account }) : errorJson(result)
}
