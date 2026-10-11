import { join } from 'node:path'

/** Join a user-supplied name under the uploads directory. */
export function uploadPath(root: string, name: string): string {
  return join(root, 'uploads', name)
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
