const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** `2026-08-16`, for `datetime` attributes. Frontmatter dates land on UTC
 *  midnight, so read UTC fields — local getters shift the day west of GMT. */
export const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/** `AUG 16 2026`, for the dateline. */
export const displayDate = (d: Date) =>
  `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${d.getUTCFullYear()}`

export const readingMinutes = (body: string) =>
  Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200))

/** The dateline shared by the homepage list and the post header. */
export const stamp = (date: Date, body: string) =>
  `${displayDate(date)} · ${readingMinutes(body)} min`
