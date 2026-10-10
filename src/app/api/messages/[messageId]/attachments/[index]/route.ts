import type { NextRequest } from 'next/server'
import { getContainer } from '@/lib/server/container'
import { badRequest, errorJson } from '@/lib/server/http'
import { GetAttachmentRequest } from '@/managers/mailbox/MailboxRequests'

/** Types safe to show inline; anything else is always downloaded. */
const PREVIEWABLE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'])

export async function GET(request: NextRequest, { params }: { params: Promise<{ messageId: string; index: string }> }) {
  const { messageId, index } = await params
  const attachmentIndex = Number(index)
  if (!Number.isInteger(attachmentIndex) || attachmentIndex < 0) return badRequest('Invalid attachment index.')

  const { mailboxManager } = await getContainer()
  const result = await mailboxManager.query(new GetAttachmentRequest(messageId, attachmentIndex))
  if (!result.attachment) return errorJson(result)

  const { filename, mimeType, content } = result.attachment
  const inline = request.nextUrl.searchParams.get('inline') === '1' && PREVIEWABLE.has(mimeType)
  const asciiName = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '')

  return new Response(new Blob([new Uint8Array(content)]), {
    headers: {
      'Content-Type': inline ? mimeType : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(content.length),
      // Attachments are untrusted content served from our origin.
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}
