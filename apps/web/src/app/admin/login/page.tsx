import type { Metadata } from 'next';
import { FormLogin } from './form-login';

export const metadata: Metadata = {
  title: 'Masuk Admin',
  robots: { index: false, follow: false },
};

export default async function HalamanLogin({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string }>;
}) {
  const { lanjut } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-semibold text-merek-800">Panel Admin</p>
          <p className="mt-1 text-sm text-neutral-600">Masuk untuk mengelola katalog toko</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <FormLogin lanjut={lanjut} />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-neutral-500">
          Akun contoh dari seed:
          <br />
          <code className="text-neutral-700">admin@toko.local</code> / <code className="text-neutral-700">admin12345</code>
        </p>
      </div>
    </div>
  );
}
