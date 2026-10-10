'use client'

import type { MessageMetadata } from '@/types'

const DB_NAME = 'rainsweep'
const STORE = 'scan'
const KEY = 'latest'

export interface CachedScan {
  accountEmail: string
  scope: 'all' | 'inbox'
  scannedAt: string
  messages: MessageMetadata[]
  complete: boolean
}

// The last scan is kept on this device only, so reopening Clean up doesn't
// re-read thousands of messages. It is deleted on sign-out.

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadScan(accountEmail: string): Promise<CachedScan | null> {
  try {
    const db = await open()
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    if (typeof value !== 'object' || value === null) return null
    const scan = value as CachedScan
    return scan.accountEmail === accountEmail && Array.isArray(scan.messages) ? scan : null
  } catch {
    return null
  }
}

export async function saveScan(scan: CachedScan): Promise<void> {
  try {
    const db = await open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(scan, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // Storage unavailable (private mode, quota): the scan still works for this visit.
  }
}

export function deleteScanCache(): Promise<void> {
  return new Promise(resolve => {
    try {
      const request = indexedDB.deleteDatabase(DB_NAME)
      request.onsuccess = request.onerror = request.onblocked = () => resolve()
    } catch {
      resolve()
    }
  })
}
