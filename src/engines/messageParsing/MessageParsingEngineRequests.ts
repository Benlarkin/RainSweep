import { RequestBase } from '@/common/RequestBase'
import type { RawMailMessage } from '@/types'
import type { ParseMessageResponse, ExtractAttachmentResponse } from './MessageParsingEngineResponses'

export class ParseMessageRequest extends RequestBase<ParseMessageResponse> {
  constructor(public readonly message: RawMailMessage) { super() }
}

export class ExtractAttachmentRequest extends RequestBase<ExtractAttachmentResponse> {
  constructor(
    public readonly message: RawMailMessage,
    public readonly attachmentIndex: number,
  ) { super() }
}
