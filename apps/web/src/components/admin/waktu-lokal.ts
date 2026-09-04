/** "2026-08-20T09:00:00.000Z" -> "2026-08-20T16:00" di zona waktu peramban. */
export function keInputLokal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}
