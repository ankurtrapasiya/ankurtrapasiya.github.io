import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdv,mdx}' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()),
    series: z.string().optional(),
    github: z.string().optional(),
    draft: z.boolean().default(false),
  }),
})

export const collections = { posts }