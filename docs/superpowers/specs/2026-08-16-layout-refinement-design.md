# Design: Single-Column Layout Refinement (Option A)

Date: 2026-08-16
Status: Approved

## Purpose

Improve the blog's space utilization and polish while keeping the approved
brandur/bearblog single-column aesthetic. The homepage currently renders all
content in a fixed 34rem ribbon, which wastes horizontal space on wide
screens. Prose-readability constraints still hold: continuous text stays on a
reading measure.

## Decisions

- Keep the single-column centered layout ("Option A"); do NOT adopt the
  two-zone editorial list or a wider chrome container.
- Widen the content column fluidly: `max-width: clamp(32rem, 72%, 42rem)`.
  On a 1440px viewport the column grows from 544px to ~672px; on mobile it
  stays ~32rem. The post-page prose measure stays within normal limits.
- Fluid body type: `font-size: clamp(1rem, 0.8vw + 0.85rem, 1.2rem)` so text
  scales with viewport without sizes jumping awkwardly.
- Gray-only palette unchanged; no new colors, no accent.

## Changes

| # | Change | File |
|---|--------|------|
| 1 | Shell width + padding via `clamp()` | `src/layouts/BaseLayout.astro` |
| 2 | Fluid body font-size | `src/styles/global.css` |
| 3 | `color-scheme: dark` under `[data-theme='dark']` (native controls/scrollbars match) | `src/styles/global.css` |
| 4 | Gray `:focus-visible` outline for links/chips/buttons | `src/styles/global.css` |
| 5 | Prose fixes: `pre` horizontal scroll, table/blockquote/hr styling | `src/styles/global.css` |
| 6 | Real homepage `meta description` (use the tagline) | `src/pages/index.astro` |

## Verification

- `npm run check:posts` exits 0.
- `npm run build` exits "Complete!".
- Built `dist/index.html` contains the meta description and the clamp shell CSS.
- Deploy workflow re-publishes <https://ankurtrapasiya.github.io/> (HTTP 200
  on homepage and post page).