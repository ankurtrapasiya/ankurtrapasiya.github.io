# ankurtrapasiya.github.io

Minimal agent-friendly blog. Content: `src/content/posts/*.md`.

## Publish

1. Add `src/content/posts/YYYY-MM-DD-slug.md` with the 5-ish frontmatter fields.
2. Push to `main` — the GitHub Action builds, validates, and deploys.

## Frontmatter

| field   | type      | required | notes |
|---------|-----------|----------|-------|
| title   | string    | yes      | |
| date    | YYYY-MM-DD| yes      | |
| summary | string    | yes      | one line shown on the homepage |
| tags    | list      | yes      | single tokens, no spaces; feeds chips |
| series  | string    | no       | dashed chip + filter |
| github  | string    | no       | value appended to `https://github.com/` for the "View on GitHub" link |
| draft   | bool      | no       | `true` excludes from build |

Diagrams: fenced ```` ```mermaid ```` blocks render to static SVG at build time.