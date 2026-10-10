/** Gmail-style compact timestamp: time today, "Mar 4" this year, otherwise a short date. */
export function formatListDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' })
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** The heading a conversation files under in the list: "Today", "Yesterday", "This week" or the month. */
export function dayHeading(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return 'This week'
  return date.toLocaleDateString(undefined, date.getFullYear() === now.getFullYear() ? { month: 'long' } : { month: 'long', year: 'numeric' })
}
