# AGENTS.md — blog-writing companion

This repo is a minimal Astro blog served from GitHub Pages. Your job as an
agent is almost always one thing: **write or edit a single post**, then stop.

## The contract: one post = one Markdown file

Create or edit files under `src/content/posts/`, named `YYYY-MM-DD-<slug>.md`.

**Start every new post with an underscore: `_YYYY-MM-DD-<slug>.md`.** Underscore
files are gitignored, so a draft never leaves this machine — but Astro still
builds them, so `npm run dev` previews one exactly like a published post. The
repo is public; `draft: true` hides a post from the site, not from GitHub, and
the underscore is what actually keeps unfinished work private. Drop the
underscore and set `draft: false` only when it's ready to publish.

Frontmatter:

| field   | type        | required | notes                                            |
|---------|-------------|----------|--------------------------------------------------|
| title   | string      | yes      |                                                  |
| date    | YYYY-MM-DD  | yes      |                                                  |
| summary | string      | yes      | one line; shown on the homepage list             |
| tags    | list        | yes      | single tokens, no spaces; become filter chips    |
| series  | string      | no       | dashed chip + filter (multi-part posts)          |
| github  | string      | no       | e.g. `owner/repo` → "View on GitHub ↗" link      |
| draft   | boolean     | no       | `true` removes the post from the build           |

Content rules:

- Plain Markdown, standard links only (no Obsidian wikilinks/callouts in
  published posts).
- Diagrams: fenced ```mermaid  blocks — they render to static SVG at build
  time, so `flowchart`, `sequenceDiagram`, `graph` etc. all work.
- GitHub references: inline Markdown links for specific files/lines; set the
  `github:` frontmatter when a whole post is tied to one repo.

## Verification (run before you claim a post is done)

```bash
npm run check:posts   # must exit 0 — prints ok for every post
npm run build         # must print "Complete!"
```

`npm run dev` serves `http://localhost:4321` for human preview.

## Do NOT

- Touch anything outside `src/content/posts/` (no layout/CSS/workflow edits)
  unless the task explicitly requires it.
- Invent facts, versions, or quotes. Ask the human for source material.
- Commit or push unless asked. Default to finishing with an underscore-prefixed
  filename and `draft: true`, then present the file for review.

## Reusable weekly prompt

```
Write this week's post for the ankurtrapasiya.github.io blog.
Topic: <topic>. Source repos/notes: <material>.
1. Create src/content/posts/_YYYY-MM-DD-<slug>.md (underscore = gitignored
   draft) with frontmatter per AGENTS.md.
2. Use mermaid fences for diagrams; GitHub refs as plain links or `github:`.
   Tag every code fence with its language.
3. Run `npm run check:posts`; ensure exit 0. Leave `draft: true`.
4. Do NOT commit or push — show me the full file for review.
```

## Obsidian usage

The repo can be opened as an Obsidian vault for editing posts. Obsidian
renders Mermaid in preview, matching what the site publishes. Keep repo-local
set-up clean:

- `.obsidian/` (Obsidian config) is gitignored.
- Use Obsidian "Properties" only for editing; the schema above is what ships.
- Avoid wikilinks/callouts in post content.