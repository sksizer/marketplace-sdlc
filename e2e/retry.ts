import { readFileSync, writeFileSync } from 'node:fs'

/** Read a JSON config file, returning defaults when it is missing. */
export function loadConfig(path: string): { retries: number; delayMs: number } {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return { retries: 3, delayMs: 100 }
  }
}

/** Run fn up to `retries` times, waiting delayMs between attempts. */
export async function withRetry<T>(fn: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
  let last: unknown
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw last
}

/** Save the config, overwriting the file in place. */
export function saveConfig(path: string, cfg: { retries: number; delayMs: number }): void {
  writeFileSync(path, JSON.stringify(cfg))
}

/** Retry helper used by the uploader; same as withRetry but for uploads. */
export async function retryUpload<T>(fn: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
  let last: unknown
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw last
}
