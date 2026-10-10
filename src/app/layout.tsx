import type { Metadata, Viewport } from 'next'
import { Fraunces, IBM_Plex_Mono, Newsreader } from 'next/font/google'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'
import './globals.css'

const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], axes: ['opsz'], style: ['normal', 'italic'] })
const newsreader = Newsreader({ variable: '--font-newsreader', subsets: ['latin'], axes: ['opsz'], style: ['normal', 'italic'] })
const plexMono = IBM_Plex_Mono({ variable: '--font-plex-mono', subsets: ['latin'], weight: ['400', '500'] })

export const metadata: Metadata = {
  title: 'RainSweep',
  description: 'A fast, installable Gmail client.',
  applicationName: 'RainSweep',
  appleWebApp: { capable: true, title: 'RainSweep', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3eee2' },
    { media: '(prefers-color-scheme: dark)', color: '#151a16' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${newsreader.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="h-full">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
