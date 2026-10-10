import { describe, expect, it } from 'vitest'
import { RequestBase } from '@/common/RequestBase'
import { ResponseBase } from '@/common/ResponseBase'
import { HandlerResolverBuilder } from '@/common/resolver/HandlerResolverBuilder'
import { UnhandledRequestError } from '@/common/resolver/UnhandledRequestError'

class EchoResponse extends ResponseBase {
  constructor(correlationId: string, public readonly value: string) { super(correlationId, null) }
}
class EchoRequest extends RequestBase<EchoResponse> {
  constructor(public readonly value: string) { super() }
}
class OtherRequest extends RequestBase<EchoResponse> {}

describe('HandlerResolver', () => {
  const resolver = new HandlerResolverBuilder()
    .register(EchoRequest, { handle: async r => new EchoResponse(r.correlationId, r.value.toUpperCase()) })
    .build()

  it('routes a request to its handler by type and types the response', async () => {
    const response = await resolver.resolve(new EchoRequest('hi'))
    expect(response.value).toBe('HI')
    expect(response.success).toBe(true)
  })

  it('throws on an unregistered request type (a wiring bug)', async () => {
    await expect(resolver.resolve(new OtherRequest())).rejects.toBeInstanceOf(UnhandledRequestError)
  })

  it('refuses duplicate registrations', () => {
    const handler = { handle: async (r: EchoRequest) => new EchoResponse(r.correlationId, '') }
    expect(() => new HandlerResolverBuilder().register(EchoRequest, handler).register(EchoRequest, handler)).toThrow()
  })
})
