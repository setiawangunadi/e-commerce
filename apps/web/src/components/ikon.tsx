/**
 * Ikon SVG inline. Ditulis sendiri (bukan lewat paket ikon) agar tidak ada
 * JavaScript tambahan yang dikirim ke browser untuk hal sesederhana ini —
 * berpengaruh ke LCP di koneksi mobile (research/tech/14-performance-seo-technical.md).
 */

type Props = { className?: string };

const dasar = 'h-5 w-5';

export function IkonKeranjang({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2.2l2.3 12.1a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 7H5.4" />
    </svg>
  );
}

export function IkonCari({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

export function IkonAkun({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function IkonMenu({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IkonTutup({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IkonCentang({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IkonTruk({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 7.5h11v9H2z" />
      <path d="M13 10.5h4l3 3v3h-7z" />
      <circle cx="6.5" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </svg>
  );
}

export function IkonPerisai({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7.5 3v5.4c0 4.3-3 8.2-7.5 9.6-4.5-1.4-7.5-5.3-7.5-9.6V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  );
}

export function IkonKembali({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h11a5 5 0 0 1 0 10H8" />
      <path d="m7.5 4.5-3.5 3.5 3.5 3.5" />
    </svg>
  );
}

export function IkonChat({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 11.8a8 8 0 0 1-11.6 7.1L4 20.5l1.7-4.7A8 8 0 1 1 20.5 11.8z" />
    </svg>
  );
}

/**
 * Ikon marketplace digambar sebagai bentuk generik (tas belanja & not musik),
 * bukan replika logo resmi — cukup untuk mengenali kanal tanpa memakai aset
 * bermerek milik pihak lain.
 */
export function IkonShopee({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.2c-2.35 0-4.25 1.9-4.25 4.25v.8H4.6a1.2 1.2 0 0 0-1.2 1.28l.78 11.2A2.6 2.6 0 0 0 6.77 22h10.46a2.6 2.6 0 0 0 2.59-2.27l.78-11.2a1.2 1.2 0 0 0-1.2-1.28h-3.15v-.8c0-2.35-1.9-4.25-4.25-4.25zm0 1.8a2.45 2.45 0 0 1 2.45 2.45v.8h-4.9v-.8A2.45 2.45 0 0 1 12 4zm0 6.6c1.9 0 3.3.95 3.3 2.4 0 1.3-1 2.05-2.5 2.4l-1 .23c-.8.18-1.15.42-1.15.85 0 .5.5.83 1.35.83.8 0 1.5-.26 2.1-.66l.75 1.35c-.8.55-1.8.85-2.9.85-2 0-3.4-1-3.4-2.45 0-1.3 1-2.05 2.45-2.38l1-.22c.85-.2 1.2-.44 1.2-.88 0-.5-.55-.8-1.4-.8-.7 0-1.4.22-2 .6l-.7-1.4c.8-.45 1.75-.72 2.9-.72z" />
    </svg>
  );
}

export function IkonTiktok({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.1 2h-2.9v13.1a2.5 2.5 0 1 1-2.5-2.5c.24 0 .47.03.7.1v-2.96a5.5 5.5 0 1 0 4.7 5.44V8.9a6.6 6.6 0 0 0 3.9 1.27V7.2a3.75 3.75 0 0 1-3.9-3.6V2z" />
    </svg>
  );
}

export function IkonPanahKanan({ className = dasar }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
