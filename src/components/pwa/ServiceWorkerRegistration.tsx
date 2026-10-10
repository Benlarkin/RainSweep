'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Skipped in development so cached responses don't mask code changes.
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => {
      console.warn('Service worker registration failed', err)
    })
  }, [])
  return null
}

/** Drops every cached copy of mail on this device, e.g. on sign-out. */
export async function clearOfflineMail(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.filter(k => k.startsWith('mc-api')).map(k => caches.delete(k)))
  }
  navigator.serviceWorker?.controller?.postMessage({ type: 'clear-user-data' })
}
