import { resolve, sep } from 'node:path'

/** Join a user-supplied name under the uploads directory; throws when the name escapes it. */
export function uploadPath(root: string, name: string): string {
  const base = resolve(root, 'uploads')
  const full = resolve(base, name)
  if (!full.startsWith(base + sep)) throw new Error(`${name}: outside the uploads directory`)
  return full
}

/** Parse "a=1,b=2" into a map; ignores malformed pairs. */
export function parsePairs(s: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const part of s.split(',')) {
    const [k, v] = part.split('=')
    out.set(k, parseInt(v))
  }
  return out
}
