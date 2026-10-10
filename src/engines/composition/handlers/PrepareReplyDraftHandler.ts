import type { IHandler } from '@/common/resolver/IHandler'
import type { MailAddress } from '@/types'
import { AddressUtility } from '@/utilities/AddressUtility'
import { PrepareReplyDraftRequest } from '../CompositionEngineRequests'
import { PrepareDraftResponse } from '../CompositionEngineResponses'
import { describe, formatDate, plainTextOf, prefixSubject, quote } from './compositionRules'

export class PrepareReplyDraftHandler implements IHandler<PrepareReplyDraftRequest> {
  async handle(request: PrepareReplyDraftRequest): Promise<PrepareDraftResponse> {
    const { original, replyAll, self, timeZone } = request
    const me: MailAddress = { name: self.name, address: self.email }
    const isMine = (a: MailAddress): boolean => AddressUtility.sameAddress(a, me)
    const sentByMe = original.from !== null && isMine(original.from)

    // Replying to your own sent message continues the conversation with its
    // original recipients rather than addressing yourself.
    let to: MailAddress[]
    if (sentByMe) to = original.to
    else if (original.replyTo.length > 0) to = original.replyTo
    else to = original.from ? [original.from] : []
    to = AddressUtility.dedupe(to)

    let cc: MailAddress[] = []
    if (replyAll) {
      const candidates = sentByMe ? original.cc : [...original.to, ...original.cc]
      cc = AddressUtility.dedupe(candidates).filter(a => !isMine(a) && !to.some(t => AddressUtility.sameAddress(t, a)))
    }
    if (!sentByMe) to = to.filter(a => !isMine(a) || to.length === 1)

    const header = `On ${formatDate(original.date, timeZone)}, ${describe(original.from)} wrote:`
    const references = original.messageIdHeader
      ? [...original.references.filter(r => r !== original.messageIdHeader), original.messageIdHeader]
      : original.references

    return new PrepareDraftResponse(request.correlationId, {
      mode: replyAll ? 'replyAll' : 'reply',
      to,
      cc,
      subject: prefixSubject(original.subject, 'Re'),
      body: `\n\n${header}\n${quote(plainTextOf(original))}\n`,
      threadId: original.threadId,
      inReplyTo: original.messageIdHeader,
      references,
    })
  }
}
