# ankurtrapasiya.github.io

My corner of the internet, at [ankurtrapasiya.github.io](https://ankurtrapasiya.github.io).

I write here when something I assumed turns out to be wrong. That's most of it,
really — I go in expecting one thing, the machine or the market or the book says
otherwise, and the gap between the two is the interesting part. Writing it down
is how I find out whether I actually understood it or just recognised it.

So expect a mix:

- **Things I built and measured.** Distributed systems, event pipelines, the
  Java and Kubernetes end of the world, and whatever I've currently got running
  under my desk. If there's a number in a post, I ran it myself and I'll tell
  you on what hardware, how many times, and what the variance was.
- **What I'm reading.** Notes from books that changed how I think about
  something, which is a much shorter list than the books I finish.
- **Money, from a DIY seat.** ETFs, market structure, how the plumbing actually
  works. I read prospectuses and filings rather than takes. I'm an investor
  working things out in public, not an advisor, and nothing here is advice.

The posts that work best are the ones where I got something wrong first. Those
are the ones I'd want to read, so those are the ones I try to write — including
the parts still unsolved at the end, because pretending otherwise makes for a
tidier post and a less honest one.

If you disagree with something, or you know the answer to a question I left
open, I'd genuinely like to hear it — that conversation is most of why this
exists. I'm at [github.com/ankurtrapasiya](https://github.com/ankurtrapasiya)
and the footer of every page has my email.

---

## How the site works

Astro, deployed to GitHub Pages. One post is one Markdown file in
`src/content/posts/`, named `YYYY-MM-DD-slug.md`. Push to `main` and the
GitHub Action validates, builds, and deploys it.

`AGENTS.md` holds the full authoring contract.

### Frontmatter

| field   | type      | required | notes |
|---------|-----------|----------|-------|
| title   | string    | yes      | |
| date    | YYYY-MM-DD| yes      | |
| summary | string    | yes      | one line shown on the homepage |
| tags    | list      | yes      | single tokens, no spaces; feeds the filter chips |
| series  | string    | no       | dashed chip + filter, for multi-part posts |
| github  | string    | no       | `owner/repo`; renders the "View on GitHub" link |
| draft   | bool      | no       | `true` excludes the post from the build |

### Local

```bash
npm install
npm run dev          # http://localhost:4321
npm run check:posts  # validates frontmatter; must exit 0
npm run build
```

Diagrams are fenced ```` ```mermaid ```` blocks, rendered to static SVG at build
time — no client-side JavaScript. Code fences should name their language so
they get highlighted; leave it off only when the block isn't code.
