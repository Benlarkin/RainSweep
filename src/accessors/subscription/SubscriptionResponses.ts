import { ResponseBase, type Failure } from '@/common/ResponseBase'

export class OneClickUnsubscribeResponse extends ResponseBase {
  constructor(correlationId: string, error: Failure | null = null) { super(correlationId, error) }
}
