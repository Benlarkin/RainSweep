import { RequestBase } from '@/common/RequestBase'
import type { OneClickUnsubscribeResponse } from './SubscriptionResponses'

export class OneClickUnsubscribeRequest extends RequestBase<OneClickUnsubscribeResponse> {
  constructor(public readonly url: string) { super() }
}
