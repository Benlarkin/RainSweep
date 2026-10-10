import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/mail',
    name: 'RainSweep',
    short_name: 'RainSweep',
    description: 'A fast, installable Gmail client.',
    start_url: '/mail',
    scope: '/',
    display: 'standalone',
    background_color: '#f3eee2',
    theme_color: '#3d6b4c',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Compose', url: '/mail?compose=new' },
      { name: 'Inbox', url: '/mail?label=INBOX' },
    ],
    // Lets the installed app open mailto: links (the user still has to accept).
    protocol_handlers: [{ protocol: 'mailto', url: '/mail?compose=%s' }],
  }
}
