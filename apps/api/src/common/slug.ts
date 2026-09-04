/** Membuat slug URL-friendly dari teks Bahasa Indonesia. */
export function buatSlug(teks: string): string {
  return teks
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // buang diakritik (é -> e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
