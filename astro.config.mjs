import { unified } from '@astrojs/markdown-remark'
import { defineConfig } from 'astro/config'
import rehypeMermaid from 'rehype-mermaid'

export default defineConfig({
  site: 'https://ankurtrapasiya.github.io',
  base: '/',
  markdown: {
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
    // Astro 7: `unified()` is the ONLY markdown plugin surface. Top-level
    // `markdown.remarkPlugins` / `markdown.rehypePlugins` are silently ignored
    // under the Sätteri default — pass every plugin into `unified({...})`.
    processor: unified({
      rehypePlugins: [
        [
          rehypeMermaid,
          {
            strategy: 'inline-svg',
            mermaidConfig: {
              theme: 'neutral',
              securityLevel: 'strict',
            },
          },
        ],
      ],
    }),
  },
})