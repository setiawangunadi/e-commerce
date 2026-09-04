'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { masuk, type StatusForm } from '../actions-auth';

const awal: StatusForm = {};

export function FormLogin({ lanjut }: { lanjut?: string }) {
  const [status, kirim] = useActionState(masuk, awal);

  return (
    <form action={kirim} className="space-y-4">
      <input type="hidden" name="lanjut" value={lanjut ?? '/admin'} />

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue=""
          className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
          placeholder="admin@toko.local"
        />
        {status.galatField?.email && (
          <p className="mt-1 text-xs text-red-600">{status.galatField.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-merek-500 focus:outline-none"
          placeholder="••••••••"
        />
        {status.galatField?.password && (
          <p className="mt-1 text-xs text-red-600">{status.galatField.password}</p>
        )}
      </div>

      {status.galat && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {status.galat}
        </p>
      )}

      <TombolKirim />
    </form>
  );
}

function TombolKirim() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-merek-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-merek-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Memproses...' : 'Masuk'}
    </button>
  );
}
