import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * Enforces the iDesign call rules on every import in src/. If this fails,
 * the fix is almost never to loosen a rule: move the code to the layer that
 * is allowed to make the call (usually a Manager).
 *
 *   Client ──▶ Manager ──▶ Engine ──▶ Accessor ──▶ resource
 *                 └──────────────────▲
 *   Utilities are callable from every layer. No sideways calls between
 *   Managers, between Engines, or between Accessors. Nothing calls upward.
 */

const SRC = path.resolve(__dirname, '../src')

type Layer = 'client' | 'manager' | 'engine' | 'accessor' | 'utility' | 'common' | 'types' | 'composition-root'

interface Unit { layer: Layer; component: string | null }

function classify(file: string): Unit {
  const rel = path.relative(SRC, file).split(path.sep)
  switch (rel[0]) {
    case 'managers': return { layer: 'manager', component: rel[1] }
    case 'engines': return { layer: 'engine', component: rel[1] }
    case 'accessors': return { layer: 'accessor', component: rel[1] }
    case 'utilities': return { layer: 'utility', component: null }
    case 'common': return { layer: 'common', component: null }
    case 'types': return { layer: 'types', component: null }
    case 'container': return { layer: 'composition-root', component: null }
    case 'lib': return rel[1] === 'server' ? { layer: 'composition-root', component: null } : { layer: 'client', component: null }
    default: return { layer: 'client', component: null } // app/, components/
  }
}

const ALWAYS_ALLOWED: Layer[] = ['utility', 'common', 'types']

function violation(from: Unit, to: Unit, typeOnly: boolean): string | null {
  if (ALWAYS_ALLOWED.includes(to.layer)) return null
  if (from.layer === 'composition-root') return null

  switch (from.layer) {
    case 'utility':
    case 'common':
    case 'types':
      return `${from.layer} must not depend on ${to.layer}`
    case 'client':
      if (to.layer === 'client') return null
      if (to.layer === 'manager') return null
      if (to.layer === 'composition-root') return null
      // Clients may reference engine contracts carried inside manager requests, as types only.
      if (to.layer === 'engine' && typeOnly) return null
      return `Clients call Managers only, never ${to.layer}s`
    case 'manager':
      if (to.layer === 'manager') {
        return to.component === from.component || to.component === 'shared' ? null : 'Managers must not call other Managers'
      }
      if (to.layer === 'engine' || to.layer === 'accessor') return null
      return `Managers must not depend on ${to.layer}`
    case 'engine':
      if (to.layer === 'engine') return to.component === from.component ? null : 'Engines must not call other Engines'
      if (to.layer === 'accessor') return null
      return `Engines must not depend on ${to.layer}`
    case 'accessor':
      if (to.layer === 'accessor') return to.component === from.component ? null : 'Accessors must not call other Accessors'
      return `Accessors must not depend on ${to.layer}`
  }
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : []
  })
}

const IMPORT = /^\s*(import|export)\s+(type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]/gm

function resolveImport(file: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) return path.join(SRC, specifier.slice(2))
  if (specifier.startsWith('.')) return path.resolve(path.dirname(file), specifier)
  return null // package import
}

describe('iDesign layering', () => {
  const files = sourceFiles(SRC)

  it('finds the source tree', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('every import respects the layer call rules', () => {
    const problems: string[] = []
    for (const file of files) {
      const from = classify(file)
      for (const match of readFileSync(file, 'utf8').matchAll(IMPORT)) {
        const target = resolveImport(file, match[3])
        if (!target) continue
        const reason = violation(from, classify(target), Boolean(match[2]))
        if (reason) problems.push(`${path.relative(SRC, file)} → ${match[3]}: ${reason}`)
      }
    }
    expect(problems).toEqual([])
  })

  it('only MailAccessor knows Gmail exists', () => {
    const leaks = files
      .filter(f => !path.relative(SRC, f).startsWith(path.join('accessors', 'mail')))
      .filter(f => /gmail\.googleapis|GmailClient/.test(readFileSync(f, 'utf8')))
      .filter(f => classify(f).layer !== 'composition-root')
      .map(f => path.relative(SRC, f))
    expect(leaks).toEqual([])
  })
})
