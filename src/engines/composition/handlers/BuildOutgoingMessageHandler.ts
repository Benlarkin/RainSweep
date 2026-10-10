import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import type { OutgoingMessage } from '@/types'
import { AddressUtility } from '@/utilities/AddressUtility'
import { MimeUtility } from '@/utilities/MimeUtility'
import { BuildOutgoingMessageRequest } from '../CompositionEngineRequests'
import { BuildOutgoingMessageResponse } from '../CompositionEngineResponses'

/** Gmail's limit on a whole message, attachments included. */
export const MAX_MESSAGE_BYTES = 25 * 1024 * 1024
const MAX_RECIPIENTS = 500

export class BuildOutgoingMessageHandler implements IHandler<BuildOutgoingMessageRequest> {
  async handle(request: BuildOutgoingMessageRequest): Promise<BuildOutgoingMessageResponse> {
    const { sender, input } = request
    const fail = (message: string): BuildOutgoingMessageResponse =>
      new BuildOutgoingMessageResponse(request.correlationId, null, null, failure('invalid_request', message))

    const to = AddressUtility.dedupe(input.to)
    const cc = AddressUtility.dedupe(input.cc)
    const bcc = AddressUtility.dedupe(input.bcc)
    const everyone = [...to, ...cc, ...bcc]

    if (everyone.length === 0) return fail('Add at least one recipient.')
    if (everyone.length > MAX_RECIPIENTS) return fail(`A message can have at most ${MAX_RECIPIENTS} recipients.`)
    const invalid = everyone.filter(a => !AddressUtility.isValid(a.address))
    if (invalid.length) return fail(`Check these addresses: ${invalid.map(a => a.address).join(', ')}`)

    const attachmentBytes = input.attachments.reduce((sum, a) => sum + a.content.length, 0)
    if (attachmentBytes > MAX_MESSAGE_BYTES) return fail('Attachments exceed the 25 MB limit.')

    const domain = sender.email.split('@')[1] ?? 'localhost'
    const message: OutgoingMessage = {
      from: { name: sender.name, address: sender.email },
      to,
      cc,
      bcc,
      subject: input.subject.trim(),
      textBody: input.body.replace(/\r?\n/g, '\r\n'),
      htmlBody: null,
      attachments: input.attachments,
      inReplyTo: input.inReplyTo,
      references: input.references,
      date: new Date(),
      messageId: `<${crypto.randomUUID()}@${domain}>`,
    }

    return new BuildOutgoingMessageResponse(request.correlationId, message, MimeUtility.build(message))
  }
}
