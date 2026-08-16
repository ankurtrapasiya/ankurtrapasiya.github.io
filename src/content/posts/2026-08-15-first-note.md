---
title: First note on this writing corner
date: 2026-08-15
summary: What this site is, how it's built, and why diagrams render as static SVG at build time.
tags: ["writing", "infrastructure"]
series: bootstrapping-this-blog
github: ankurtrapasiya/ankurtrapasiya.github.io
---

This site is a plain Astro build. Weekly notes land as Markdown; diagrams stay
as code fences and become static SVG at build time.

```mermaid
flowchart LR
    A[Weekly Markdown] --> B[GitHub Action]
    B --> C[static pages site]
```

JavaScript blocks get light and dark code themes at build time:

```js
const minutes = Math.max(1, Math.round(words / 200))
```

The `github` frontmatter above drives the "View on GitHub" link that the
post template renders (Task 4).