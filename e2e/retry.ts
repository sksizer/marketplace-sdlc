import { readFileSync, writeFileSync } from 'node:fs'

const DEFAULTS = { retries: 3, delayMs: 100 }

/** Read a JSON config file, returning defaults only when it is missing. */
export function loadConfig(path: string): { retries: number; delayMs: number } {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { ...DEFAULTS }
    throw e
  }
  const parsed = JSON.parse(text)
  return {
    retries: numberField(path, parsed, 'retries', DEFAULTS.retries),
    delayMs: numberField(path, parsed, 'delayMs', DEFAULTS.delayMs),
  }
}

/** Read `key` from the parsed config: the default when absent, an error when present but not a number. */
function numberField(path: string, parsed: any, key: 'retries' | 'delayMs', fallback: number): number {
  const value = parsed?.[key]
  if (value === undefined) return fallback
  if (typeof value !== 'number') throw new Error(`${path}: ${key} must be a number`)
  return value
}

/** Run fn up to `retries` times, waiting delayMs between attempts. */
export async function withRetry<T>(fn: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
  let last: unknown
  const attempts = Math.max(1, retries)
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw last
}

/** Save the config, overwriting the file in place. */
export function saveConfig(path: string, cfg: { retries: number; delayMs: number }): void {
  writeFileSync(path, JSON.stringify(cfg))
}
