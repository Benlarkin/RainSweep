import type { NextRequest } from 'next/server'
import { getContainer } from '@/lib/server/container'
import { badRequest, errorJson, okJson } from '@/lib/server/http'
import { GetComposeDraftRequest, type DraftMode } from '@/managers/composition/CompositionRequests'

const MODES: readonly DraftMode[] = ['reply', 'replyAll', 'forward']

export async function GET(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params
  const mode = request.nextUrl.searchParams.get('mode')
  const timeZone = request.nextUrl.searchParams.get('tz') ?? 'UTC'
  const draftMode = MODES.find(m => m === mode)
  if (!draftMode) return badRequest(`mode must be one of: ${MODES.join(', ')}`)

  const { compositionManager } = await getContainer()
  const result = await compositionManager.query(new GetComposeDraftRequest(messageId, draftMode, timeZone))
  return result.draft ? okJson({ draft: result.draft }) : errorJson(result)
}
