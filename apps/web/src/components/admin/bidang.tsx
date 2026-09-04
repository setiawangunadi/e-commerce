'use client';

/** Komponen input kecil yang dipakai berulang di form admin. */

interface BidangProps {
  label: string;
  nama: string;
  galat?: string;
  petunjuk?: string;
  wajib?: boolean;
  children: React.ReactNode;
}

export function Bidang({ label, nama, galat, petunjuk, wajib, children }: BidangProps) {
  return (
    <div>
      <label htmlFor={nama} className="block text-sm font-medium text-neutral-700">
        {label}
        {wajib && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {petunjuk && !galat && <p className="mt-1 text-xs text-neutral-500">{petunjuk}</p>}
      {galat && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {galat}
        </p>
      )}
    </div>
  );
}

const kelasInput =
  'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-merek-500 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-500';

export function Teks(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} id={props.id ?? props.name} className={kelasInput} />;
}

export function AreaTeks(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} id={props.id ?? props.name} className={kelasInput} />;
}

export function Pilihan(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} id={props.id ?? props.name} className={kelasInput} />;
}

/** Input angka Rupiah dengan prefix "Rp" agar admin tidak salah satuan. */
export function InputRupiah(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
        Rp
      </span>
      <input
        {...props}
        id={props.id ?? props.name}
        type="number"
        min={0}
        step={100}
        className={`${kelasInput} pl-9`}
      />
    </div>
  );
}

export function Sakelar({
  nama,
  label,
  petunjuk,
  bawaan,
}: {
  nama: string;
  label: string;
  petunjuk?: string;
  bawaan?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
      <input
        type="checkbox"
        name={nama}
        defaultChecked={bawaan}
        className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-merek-600 focus:ring-merek-500"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-neutral-800">{label}</span>
        {petunjuk && <span className="mt-0.5 block text-xs text-neutral-500">{petunjuk}</span>}
      </span>
    </label>
  );
}

export function Bagian({
  judul,
  deskripsi,
  children,
}: {
  judul: string;
  deskripsi?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="text-base font-semibold text-neutral-900">{judul}</h2>
      {deskripsi && <p className="mt-0.5 text-sm text-neutral-600">{deskripsi}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
