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