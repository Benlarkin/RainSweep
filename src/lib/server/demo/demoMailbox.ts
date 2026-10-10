import { Base64UrlUtility } from '@/utilities/Base64UrlUtility'

/**
 * A believable, fictional mailbox for demo mode: a few real conversations
 * buried under the newsletters, receipts and notifications that Clean up is
 * built to sweep away. Every person, company and domain here is made up.
 */

export const DEMO_ACCOUNT = { email: 'jordan@example.com', name: 'Jordan Ellis' }

export interface DemoMessage {
  id: string
  threadId: string
  labelIds: string[]
  internalDate: number
  from: string
  to: string
  subject: string
  text: string
  html: string | null
  attachment: { filename: string; bytes: number } | null
  sizeEstimate: number
  listId: string | null
  unsubscribeUrl: string | null
  /** Source as sent, for mail composed during the demo. */
  raw?: string
}

export interface DemoLabel { id: string; name: string; type: 'system' | 'user' }

export const DEMO_LABELS: DemoLabel[] = [
  ...['INBOX', 'STARRED', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'UNREAD', 'IMPORTANT'].map(id => ({ id, name: id, type: 'system' as const })),
  { id: 'Label_family', name: 'Family', type: 'user' },
  { id: 'Label_receipts', name: 'Receipts', type: 'user' },
  { id: 'Label_travel', name: 'Travel', type: 'user' },
]

const ME = `${DEMO_ACCOUNT.name} <${DEMO_ACCOUNT.email}>`
const HOUR = 3_600_000
const DAY = 24 * HOUR

interface Line { from: string; text: string; hoursAgo: number }

interface Conversation {
  subject: string
  lines: Line[]
  labels?: string[]
  unread?: boolean
  starred?: boolean
  html?: (text: string) => string
  attachmentKb?: number
  /** A real file part on the last message, so the reading view shows an enclosure. */
  attachment?: string
}

/** Hand-written threads: the mail a person actually wants to read. */
const CONVERSATIONS: Conversation[] = [
  {
    subject: 'Saturday hike if the rain lets up?',
    unread: true,
    lines: [
      { from: 'Maya Okafor <maya.okafor@example.org>', hoursAgo: 0.4, text: 'Forecast says a dry window from 9 to 1 on Saturday. Wahkeena loop? I can drive, and I will bring the good thermos.\n\nMaya' },
    ],
  },
  {
    subject: 'Re: Kitchen remodel quote',
    unread: true,
    starred: true,
    attachmentKb: 240,
    attachment: 'Whitfield-quote-itemized.pdf',
    lines: [
      { from: ME, hoursAgo: 30, text: 'Thanks for walking through it yesterday. Could you send the itemized version with the tile options?' },
      { from: 'Dana Whitfield <dana@whitfieldbuild.example>', hoursAgo: 2, text: 'Hi Jordan,\n\nAttached is the itemized quote. Option B (the slate tile) adds about $1,100 but holds up much better to wet boots.\n\nWe could start the week of the 21st.\n\nDana Whitfield\nWhitfield Build Co.' },
    ],
  },
  {
    subject: 'Mom\'s birthday dinner',
    labels: ['Label_family'],
    starred: true,
    lines: [
      { from: 'Priya Ellis <priya.ellis@example.net>', hoursAgo: 52, text: 'I booked Ava Gene\'s for 7pm on the 18th, table for six. Can you pick up the cake from Lauretta Jean\'s?' },
      { from: ME, hoursAgo: 49, text: 'Yes, I will grab the cake. Marionberry, obviously.' },
      { from: 'Priya Ellis <priya.ellis@example.net>', hoursAgo: 5, text: 'Obviously. Dad says he is bringing the slideshow again, so brace yourself.' },
    ],
  },
  {
    subject: 'Offsite agenda draft',
    unread: true,
    lines: [
      { from: 'Leo Marchetti <leo@northfork.example>', hoursAgo: 7, text: 'Rough agenda for the offsite is in the doc. I put the roadmap review first while everyone is still caffeinated. Comments by Thursday?\n\nLeo' },
    ],
  },
  {
    subject: 'Your itinerary: PDX to SEA',
    labels: ['Label_travel'],
    lines: [
      { from: 'Cascadia Rail <tickets@cascadiarail.example>', hoursAgo: 26, text: 'Your trip is confirmed. Train 503 departs Portland Union Station at 8:20 AM and arrives Seattle King Street at 11:55 AM. Coach, seat 14C.' },
    ],
    html: text => `<div style="font-family:Georgia,serif;max-width:520px"><h2 style="color:#1f4d3a">Your trip is confirmed</h2><p>${text}</p><p style="color:#666;font-size:12px">Cascadia Rail is a fictional company.</p></div>`,
  },
  {
    subject: 'Book club: next pick',
    lines: [
      { from: 'Sam Torres <sam.torres@example.com>', hoursAgo: 80, text: 'Voting closes Friday. Current leader is "The Overstory" by a mile, so maybe just accept your fate.' },
      { from: ME, hoursAgo: 78, text: 'Accepting my fate. Do we still meet at the library on the 3rd?' },
      { from: 'Sam Torres <sam.torres@example.com>', hoursAgo: 75, text: 'Yes, 6:30, the room with the bad chairs.' },
    ],
  },
  {
    subject: 'Lease renewal for 2026-27',
    unread: true,
    lines: [
      { from: 'Alder Street Properties <leasing@alderst.example>', hoursAgo: 20, text: 'Your lease ends on November 30. Reply to this email or sign the renewal in the portal by the 15th to keep your current rate.' },
    ],
  },
  {
    subject: 'Photos from the coast',
    labels: ['Label_family'],
    attachmentKb: 18_600,
    lines: [
      { from: 'Priya Ellis <priya.ellis@example.net>', hoursAgo: 24 * 40, text: 'Finally pulled these off the camera. The one of the dog vs. the wave is my favorite.' },
    ],
  },
  {
    subject: 'Quick question about the Q4 budget',
    lines: [
      { from: 'Leo Marchetti <leo@northfork.example>', hoursAgo: 24 * 3, text: 'Do we have room for a second contractor in Q4, or should I push that to January?' },
      { from: ME, hoursAgo: 24 * 3 - 2, text: 'January. We are tight until the renewal lands.' },
    ],
  },
]

interface Sender {
  from: string
  listId: string | null
  subjects: string[]
  /** Messages per week. */
  rate: number
  weeks: number
  kb: number
  /** Share of messages left unread: high for the newsletters nobody opens. */
  unreadShare: number
  inbox: boolean
  labels?: string[]
  blurb: string
}

/** The bulk that buries the conversations above. */
const SENDERS: Sender[] = [
  { from: 'Trailhead Outfitters <deals@trailhead-outfitters.example>', listId: 'deals.trailhead-outfitters.example', subjects: ['Rain shells, 40% off this weekend', 'Your cart misses you', 'New arrivals: fleece season', 'Members save an extra 15%', 'Last call: wool socks sale'], rate: 4, weeks: 40, kb: 92, unreadShare: 0.95, inbox: true, blurb: 'Waterproof everything, because you live here. Free shipping over $50 through Sunday.' },
  { from: 'The Drizzle Daily <hello@drizzledaily.example>', listId: 'news.drizzledaily.example', subjects: ['Morning briefing: bridge closures and more', 'What to do this weekend in PDX', 'The week in local food', 'Your Sunday long read'], rate: 7, weeks: 30, kb: 64, unreadShare: 0.8, inbox: true, blurb: 'Good morning, Portland. Showers clearing by noon, three bridge lifts, and a new bakery on Alberta.' },
  { from: 'Hearth & Kettle Coffee <rewards@hearthkettle.example>', listId: 'rewards.hearthkettle.example', subjects: ['You earned a free drink', 'Seasonal menu is here', 'Double stars on Tuesday'], rate: 2, weeks: 50, kb: 120, unreadShare: 0.9, inbox: true, blurb: 'Thanks for being a regular. Your next pour-over is on us at any location.' },
  { from: 'Gitforge <notifications@gitforge.example>', listId: 'rainsweep.jordan.gitforge.example', subjects: ['[rainsweep] PR #41: Add insights view', '[rainsweep] CI passed on main', '[rainsweep] Issue #39: Dark mode contrast', '[rainsweep] New review on PR #44'], rate: 6, weeks: 12, kb: 18, unreadShare: 0.5, inbox: true, blurb: 'jordan-ellis pushed 3 commits to rainsweep/main. View the checks and changed files.' },
  { from: 'Pixel Weekly <issue@pixelweekly.example>', listId: 'pixelweekly.example', subjects: ['Issue 212: Variable fonts, finally', 'Issue 213: Color spaces explained', 'Issue 214: The case for less UI'], rate: 1, weeks: 90, kb: 210, unreadShare: 1, inbox: false, blurb: 'This week: why your design system needs fewer tokens, and a type specimen worth stealing.' },
  { from: 'Mountain Air Fitness <team@mtnairfit.example>', listId: 'team.mtnairfit.example', subjects: ['Class schedule changes', 'Bring a friend free in November', 'We miss you at the gym'], rate: 2, weeks: 70, kb: 150, unreadShare: 1, inbox: true, blurb: 'Your membership is still active! Spin, yoga and the new rowing class are waiting.' },
  { from: 'Rose City Transit <alerts@rosecitytransit.example>', listId: 'alerts.rosecitytransit.example', subjects: ['Line 14 delays due to weather', 'Service change this weekend', 'MAX Blue Line shuttle buses'], rate: 3, weeks: 20, kb: 12, unreadShare: 0.6, inbox: true, blurb: 'Expect delays of 10 to 15 minutes. Plan ahead and check live arrivals before you leave.' },
  { from: 'Stumptown Books <orders@stumptownbooks.example>', listId: null, subjects: ['Your order has shipped', 'Order confirmation #48213', 'Your receipt from Stumptown Books'], rate: 0.5, weeks: 100, kb: 48, unreadShare: 0.1, inbox: false, labels: ['Label_receipts'], blurb: 'Thanks for shopping local. Your order is packed and on its way.' },
  { from: 'Willamette Power <billing@willamettepower.example>', listId: null, subjects: ['Your statement is ready', 'Autopay scheduled'], rate: 0.5, weeks: 104, kb: 380, unreadShare: 0.2, inbox: false, labels: ['Label_receipts'], blurb: 'Your monthly statement is ready to view. Autopay will run on the 22nd.' },
  { from: 'Linkwork <notify@linkwork.example>', listId: 'notify.linkwork.example', subjects: ['You appeared in 9 searches this week', 'Someone viewed your profile', '3 new jobs for you'], rate: 3, weeks: 60, kb: 140, unreadShare: 1, inbox: true, blurb: 'See who is looking. Upgrade to Premium to unlock all 9 viewers and stand out to recruiters.' },
  { from: 'Northfork Calendar <calendar@northfork.example>', listId: null, subjects: ['Invitation: Weekly sync', 'Updated invitation: Roadmap review', 'Accepted: Design crit'], rate: 3, weeks: 30, kb: 26, unreadShare: 0.3, inbox: false, blurb: 'Jordan Ellis, you have been invited. Join with the video link or reply with a note.' },
  { from: 'Archive Photo Cloud <storage@archivephoto.example>', listId: 'storage.archivephoto.example', subjects: ['Your storage is 92% full', 'Memories from this week, 3 years ago'], rate: 0.5, weeks: 80, kb: 2400, unreadShare: 0.7, inbox: false, blurb: 'Running out of room for memories? Upgrade to 2 TB and never delete a photo again.' },
]

/** Deterministic so screenshots are stable from run to run. */
function random(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function newsletterHtml(sender: string, subject: string, blurb: string): string {
  const name = sender.replace(/\s*<.*>$/, '')
  return `<div style="max-width:560px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;color:#222">
<div style="padding:24px;background:#2f3b45;color:#fff;font-size:20px;font-weight:bold">${escapeHtml(name)}</div>
<div style="padding:24px"><h2 style="margin-top:0">${escapeHtml(subject)}</h2>
<p>${escapeHtml(blurb)}</p>
<p style="color:#888">This is a sample message in RainSweep's demo mailbox. ${escapeHtml(name)} is a fictional sender.</p>
<p><img src="https://images.example.com/hero.jpg" width="500" height="240" alt="Hero image"></p>
<p><a href="https://example.com/">Read more</a></p></div>
<div style="padding:16px 24px;font-size:12px;color:#888">You are receiving this because you signed up. <a href="https://example.com/unsubscribe">Unsubscribe</a></div></div>`
}

export function buildDemoMailbox(now: number): DemoMessage[] {
  const messages: DemoMessage[] = []
  let nextId = 1
  const id = () => `demo${(nextId++).toString(16).padStart(6, '0')}`

  CONVERSATIONS.forEach(conversation => {
    const threadId = id()
    conversation.lines.forEach((line, index) => {
      const mine = line.from === ME
      const last = index === conversation.lines.length - 1
      const labels = [
        ...(mine ? ['SENT'] : ['INBOX']),
        ...(conversation.labels ?? []),
        ...(conversation.unread && last && !mine ? ['UNREAD'] : []),
        ...(conversation.starred ? ['STARRED'] : []),
      ]
      const replyTo = conversation.lines.find(l => l.from !== line.from)?.from ?? ME
      messages.push({
        id: index === 0 ? threadId : id(),
        threadId,
        labelIds: labels,
        internalDate: now - line.hoursAgo * HOUR,
        from: line.from,
        to: mine ? replyTo : ME,
        subject: conversation.subject,
        text: line.text,
        html: conversation.html ? conversation.html(escapeHtml(line.text)) : null,
        attachment: last && conversation.attachment ? { filename: conversation.attachment, bytes: (conversation.attachmentKb ?? 1) * 1024 } : null,
        sizeEstimate: 4_000 + line.text.length * 2 + (last && conversation.attachmentKb ? conversation.attachmentKb * 1024 : 0),
        listId: null,
        unsubscribeUrl: null,
      })
    })
  })

  const rand = random(17)
  SENDERS.forEach(sender => {
    const count = Math.max(1, Math.round(sender.rate * sender.weeks))
    const span = sender.weeks * 7 * DAY
    for (let i = 0; i < count; i++) {
      const age = (span * i) / count + rand() * DAY + 3 * HOUR
      const subject = sender.subjects[Math.floor(rand() * sender.subjects.length)]
      const recent = age < 21 * DAY
      const messageId = id()
      messages.push({
        id: messageId,
        threadId: messageId,
        labelIds: [
          ...(sender.inbox && recent ? ['INBOX'] : []),
          ...(sender.labels ?? []),
          ...(rand() < sender.unreadShare ? ['UNREAD'] : []),
        ],
        internalDate: now - age,
        from: sender.from,
        to: ME,
        subject,
        text: `${sender.blurb}\n\nThis is a sample message in RainSweep's demo mailbox.`,
        html: newsletterHtml(sender.from, subject, sender.blurb),
        attachment: null,
        sizeEstimate: Math.round(sender.kb * 1024 * (0.7 + rand() * 0.6)),
        listId: sender.listId,
        unsubscribeUrl: sender.listId ? `https://${sender.listId.split('.').slice(-2).join('.')}/unsubscribe/${messageId}` : null,
      })
    }
  })

  return messages.sort((a, b) => b.internalDate - a.internalDate)
}

export function snippetOf(message: DemoMessage): string {
  return message.text.replace(/\s+/g, ' ').slice(0, 140)
}

/** The message as RFC 5322 source, base64url-encoded, like Gmail's format=raw. */
export function rawSource(message: DemoMessage): string {
  if (message.raw) return message.raw
  const boundary = `rs-${message.id}`
  const headers = [
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    `Date: ${new Date(message.internalDate).toUTCString()}`,
    `Message-ID: <${message.id}@demo.rainsweep>`,
    ...(message.listId ? [`List-Id: <${message.listId}>`] : []),
    ...(message.unsubscribeUrl ? [`List-Unsubscribe: <${message.unsubscribeUrl}>`, 'List-Unsubscribe-Post: List-Unsubscribe=One-Click'] : []),
    'MIME-Version: 1.0',
  ]
  // Mail from people is plain text, as most personal mail reads; bulk mail is HTML.
  const alternative = message.html
    ? [
        `Content-Type: multipart/alternative; boundary="${boundary}-alt"`,
        '',
        `--${boundary}-alt`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        message.text,
        `--${boundary}-alt`,
        'Content-Type: text/html; charset=utf-8',
        '',
        message.html,
        `--${boundary}-alt--`,
      ]
    : ['Content-Type: text/plain; charset=utf-8', '', message.text]
  const parts = message.attachment
    ? [
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        ...alternative,
        `--${boundary}`,
        `Content-Type: application/pdf; name="${message.attachment.filename}"`,
        `Content-Disposition: attachment; filename="${message.attachment.filename}"`,
        'Content-Transfer-Encoding: base64',
        '',
        ...placeholderPdf(message.attachment.bytes),
        `--${boundary}--`,
      ]
    : alternative
  const source = [...headers, ...parts, ''].join('\r\n')
  return Base64UrlUtility.encode(source)
}

/** Base64 lines of a stand-in PDF of roughly the given size. */
function placeholderPdf(bytes: number): string[] {
  const stub = '%PDF-1.4\n% RainSweep demo attachment\n'
  const content = new TextEncoder().encode(stub + ' '.repeat(Math.max(0, bytes - stub.length)))
  return Base64UrlUtility.toBase64(content).match(/.{1,76}/g) ?? []
}

export function metadataHeaders(message: DemoMessage): Array<{ name: string; value: string }> {
  return [
    { name: 'From', value: message.from },
    { name: 'To', value: message.to },
    { name: 'Subject', value: message.subject },
    { name: 'Date', value: new Date(message.internalDate).toUTCString() },
    ...(message.listId ? [{ name: 'List-Id', value: `<${message.listId}>` }] : []),
    ...(message.unsubscribeUrl ? [
      { name: 'List-Unsubscribe', value: `<${message.unsubscribeUrl}>` },
      { name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
    ] : []),
  ]
}
