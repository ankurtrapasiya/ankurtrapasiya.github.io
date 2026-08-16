---
title: "{{title}}"
date: {{date}}
summary:
tags:
  -
draft: true
---

<!-- Weekly post template for the blog. Insert via Obsidian: Ctrl/Cmd+P → "Templates: Insert template" → post. Keep the frontmatter schema from AGENTS.md: title, date, summary, tags (single tokens), optional series / github, draft. Drag `draft` to false (or flip in file) to publish on the next push. Diagrams = ```mermaid fences. -->

# {{title}}

Start writing. Use separate `## ` sections, ` ```mermaid ` blocks for diagrams,
and plain `[text](https://…)` links only (no wikilinks).

## Drafting checklist
- [ ] summary: one line for the homepage
- [ ] tags: 2-4 single tokens
- [ ] optional: series (multi-part), github (owner/repo) for the header link
- [ ] ran `npm run check:posts` (exit 0) and `npm run build` (Complete!)
- [ ] flipped `draft` to false before pushing