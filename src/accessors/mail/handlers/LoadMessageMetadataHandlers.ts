import type { IHandler } from '@/common/resolver/IHandler'
import { failure, type Failure } from '@/common/ResponseBase'
import { ConcurrencyUtility } from '@/utilities/ConcurrencyUtility'
import type { GmailClient } from '../gmail/GmailClient'
import { readIdList, readMessageMeta } from '../gmail/gmailTypes'
import { LoadMessageMetadataPageRequest, LoadMessageMetadataRequest } from '../MailRequests'
import { LoadMessageMetadataPageResponse, LoadMessageMetadataResponse } from '../MailResponses'
import { CLEANUP_HEADERS, toRawMetadata } from './metadata'

const MAX_PAGE_SIZE = 500
const FIELDS = 'id,threadId,labelIds,internalDate,sizeEstimate,payload/headers'

export class LoadMessageMetadataPageHandler implements IHandler<LoadMessageMetadataPageRequest> {
  constructor(private readonly gmail: GmailClient) {}

  async handle(request: LoadMessageMetadataPageRequest): Promise<LoadMessageMetadataPageResponse> {
    const { accessToken, query } = request
    const list = await this.gmail.get(accessToken, '/messages', {
      labelIds: query.labelId ? [query.labelId] : null,
      q: query.search.trim() || null,
      pageToken: query.pageToken,
      maxResults: Math.min(Math.max(query.pageSize, 1), MAX_PAGE_SIZE),
    })
    if (!list.ok) return new LoadMessageMetadataPageResponse(request.correlationId, [], null, 0, list.failure)

    const { ids, nextPageToken, resultSizeEstimate } = readIdList(list.data, 'messages')
    let firstFailure: Failure | null = null
    // messages.get costs 5 quota units; ~10 in flight stays under Gmail's 250 units/s per user.
    const metas = await ConcurrencyUtility.mapWithLimit(ids, 10, async id => {
      const result = await this.gmail.get(accessToken, `/messages/${encodeURIComponent(id)}`, {
        format: 'metadata',
        metadataHeaders: CLEANUP_HEADERS,
        fields: FIELDS,
      })
      if (!result.ok) { firstFailure ??= result.failure; return null }
      return readMessageMeta(result.data)
    })

    const messages = metas.filter(m => m !== null).map(toRawMetadata)
    // A page where everything failed is a failure; a few misses (deleted mid-scan) are not.
    if (messages.length === 0 && ids.length > 0 && firstFailure) {
      return new LoadMessageMetadataPageResponse(request.correlationId, [], null, 0, firstFailure)
    }
    return new LoadMessageMetadataPageResponse(request.correlationId, messages, nextPageToken, resultSizeEstimate)
  }
}

export class LoadMessageMetadataHandler implements IHandler<LoadMessageMetadataRequest> {
  constructor(private readonly gmail: GmailClient) {}

  async handle(request: LoadMessageMetadataRequest): Promise<LoadMessageMetadataResponse> {
    const result = await this.gmail.get(request.accessToken, `/messages/${encodeURIComponent(request.messageId)}`, {
      format: 'metadata',
      metadataHeaders: CLEANUP_HEADERS,
      fields: FIELDS,
    })
    if (!result.ok) return new LoadMessageMetadataResponse(request.correlationId, null, result.failure)
    const meta = readMessageMeta(result.data)
    return meta
      ? new LoadMessageMetadataResponse(request.correlationId, toRawMetadata(meta))
      : new LoadMessageMetadataResponse(request.correlationId, null, failure('upstream_failure', 'Gmail returned an unreadable message.'))
  }
}
