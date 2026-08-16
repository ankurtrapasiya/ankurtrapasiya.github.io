import { readdirSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'src', 'content', 'posts')
const required = ['title', 'date', 'summary', 'tags']

for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
  const raw = readFileSync(join(dir, file), 'utf8')
  const fm = (raw.match(/^---\n([\s\S]*?)\n---/) ?? [])[1] ?? ''
  const missing = required.filter((key) => !new RegExp(`^${key}:`, 'm').test(fm))
  if (missing.length > 0) {
    console.error(`[check-posts] ${file}: missing ${missing.join(', ')}`)
    process.exitCode = 1
  } else {
    console.log(`[check-posts] ok   ${file}`)
  }
}