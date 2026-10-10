import type { IHandler } from '@/common/resolver/IHandler'
import { AddressUtility } from '@/utilities/AddressUtility'
import { PrepareForwardDraftRequest } from '../CompositionEngineRequests'
import { PrepareDraftResponse } from '../CompositionEngineResponses'
import { describe, formatDate, plainTextOf, prefixSubject } from './compositionRules'

export class PrepareForwardDraftHandler implements IHandler<PrepareForwardDraftRequest> {
  async handle(request: PrepareForwardDraftRequest): Promise<PrepareDraftResponse> {
    const { original, timeZone } = request
    const lines = [
      '---------- Forwarded message ---------',
      `From: ${describe(original.from)}`,
      `Date: ${formatDate(original.date, timeZone)}`,
      `Subject: ${original.subject}`,
      `To: ${AddressUtility.formatList(original.to)}`,
    ]
    if (original.cc.length) lines.push(`Cc: ${AddressUtility.formatList(original.cc)}`)

    return new PrepareDraftResponse(request.correlationId, {
      mode: 'forward',
      to: [],
      cc: [],
      subject: prefixSubject(original.subject, 'Fwd'),
      body: `\n\n${lines.join('\n')}\n\n${plainTextOf(original)}\n`,
      threadId: null,
      inReplyTo: null,
      references: [],
    })
  }
}
