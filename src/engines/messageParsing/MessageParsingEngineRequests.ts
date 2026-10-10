import { RequestBase } from '@/common/RequestBase'
import type { RawMailMessage, RawMessageMetadata } from '@/types'
import type { ParseMessageResponse, ExtractAttachmentResponse, ParseMetadataResponse } from './MessageParsingEngineResponses'

export class ParseMessageRequest extends RequestBase<ParseMessageResponse> {
  constructor(public readonly message: RawMailMessage) { super() }
}

export class ExtractAttachmentRequest extends RequestBase<ExtractAttachmentResponse> {
  constructor(
    public readonly message: RawMailMessage,
    public readonly attachmentIndex: number,
  ) { super() }
}

/** Headers-only parse for the cleanup tools: sender, subject, list and unsubscribe options. */
export class ParseMetadataRequest extends RequestBase<ParseMetadataResponse> {
  constructor(public readonly messages: RawMessageMetadata[]) { super() }
}
