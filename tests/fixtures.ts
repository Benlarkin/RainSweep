import type { MailMessage, RawMailMessage } from '@/types'

export function rawMessage(source: string, overrides: Partial<RawMailMessage> = {}): RawMailMessage {
  return {
    id: 'm1',
    threadId: 't1',
    labelIds: ['INBOX'],
    unread: true,
    starred: false,
    receivedAt: '2026-10-09T08:00:00.000Z',
    raw: new TextEncoder().encode(source.replace(/\n/g, '\r\n')),
    ...overrides,
  }
}

// 1x1 transparent PNG
export const PIXEL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

export const MULTIPART_SOURCE = `From: "Alice Example" <alice@example.org>
To: Ben <ben@example.com>, carol@example.net
Cc: dave@example.net
Reply-To: replies@example.org
Subject: Quarterly plan
Date: Thu, 08 Oct 2026 14:30:00 +0000
Message-ID: <plan-1@example.org>
References: <root@example.org>
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="mixed"

--mixed
Content-Type: multipart/related; boundary="related"

--related
Content-Type: multipart/alternative; boundary="alt"

--alt
Content-Type: text/plain; charset=UTF-8

Here is the plan.
See attached.
--alt
Content-Type: text/html; charset=UTF-8

<p>Here is the plan.</p><img src="cid:logo@example"><img src="https://tracker.example/p.gif">
--alt--
--related
Content-Type: image/png
Content-ID: <logo@example>
Content-Disposition: inline
Content-Transfer-Encoding: base64

${PIXEL_PNG_BASE64}
--related--
--mixed
Content-Type: application/pdf; name="plan.pdf"
Content-Disposition: attachment; filename="plan.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjQK
--mixed--
`

export function mailMessage(overrides: Partial<MailMessage> = {}): MailMessage {
  return {
    id: 'm1',
    threadId: 't1',
    messageIdHeader: '<plan-1@example.org>',
    references: ['<root@example.org>'],
    from: { name: 'Alice Example', address: 'alice@example.org' },
    replyTo: [],
    to: [{ name: 'Ben', address: 'ben@example.com' }, { name: null, address: 'carol@example.net' }],
    cc: [{ name: null, address: 'dave@example.net' }],
    subject: 'Quarterly plan',
    date: '2026-10-08T14:30:00.000Z',
    textBody: 'Here is the plan.\nSee attached.',
    htmlBody: null,
    attachments: [],
    labelIds: ['INBOX'],
    unread: false,
    starred: false,
    unsubscribe: null,
    ...overrides,
  }
}
