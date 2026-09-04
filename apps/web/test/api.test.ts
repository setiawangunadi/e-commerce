import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiDelete, apiGet, apiGetWithMeta, apiPatch, apiPost, apiUpload } from '@/lib/api';

const BASE = 'http://localhost:4000/api/v1';

/** Balasan sukses ber-envelope, seperti yang dikirim ResponseInterceptor di API. */
function balasan(data: unknown, meta: unknown = null, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data, error: null, meta }),
  } as Response;
}

function balasanGagal(
  error: { code: string; message: string; details?: unknown },
  status = 400,
) {
  return {
    ok: false,
    status,
    json: async () => ({ data: null, error, meta: null }),
  } as Response;
}

describe('klien API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('membuka envelope', () => {
    it('mengembalikan hanya data untuk apiGet', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan({ nama: 'Kemeja' }));

      await expect(apiGet('/catalog/produk/kemeja')).resolves.toEqual({ nama: 'Kemeja' });
    });

    it('mengembalikan data beserta meta paginasi bila diminta', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan([{ id: 1 }], { page: 1, total: 1 }));

      await expect(apiGetWithMeta('/catalog/produk')).resolves.toEqual({
        data: [{ id: 1 }],
        meta: { page: 1, total: 1 },
      });
    });

    it('menyusun URL dari base API dan path', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan(null));

      await apiGet('/catalog/beranda');

      expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(`${BASE}/catalog/beranda`);
    });
  });

  describe('penanganan galat', () => {
    it('melempar ApiError dengan pesan yang siap ditampilkan ke pengguna', async () => {
      vi.mocked(fetch).mockResolvedValue(
        balasanGagal({ code: 'NOT_FOUND', message: 'Produk tidak ditemukan' }, 404),
      );

      const galat = await apiGet<never>('/catalog/produk/hantu').catch((e: ApiError) => e);

      expect(galat).toBeInstanceOf(ApiError);
      expect(galat.message).toBe('Produk tidak ditemukan');
      expect(galat.status).toBe(404);
      expect(galat.code).toBe('NOT_FOUND');
    });

    it('meneruskan detail validasi per-kolom', async () => {
      vi.mocked(fetch).mockResolvedValue(
        balasanGagal({
          code: 'BAD_REQUEST',
          message: 'Data yang dikirim tidak valid',
          details: ['nama harus diisi'],
        }),
      );

      const galat = await apiPost<never>('/pesanan', {}).catch((e: ApiError) => e);

      expect(galat.details).toEqual(['nama harus diisi']);
    });

    it('melempar ApiError bila server membalas bukan JSON', async () => {
      // Gateway atau proxy yang jatuh sering membalas HTML; halaman tidak boleh
      // ikut jatuh dengan galat parsing yang tidak bisa dibaca.
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      } as unknown as Response);

      const galat = await apiGet<never>('/catalog/beranda').catch((e: ApiError) => e);

      expect(galat).toBeInstanceOf(ApiError);
      expect(galat.code).toBe('INVALID_RESPONSE');
      expect(galat.status).toBe(502);
    });

    it('memperlakukan envelope ber-error sebagai kegagalan walau status HTTP-nya 200', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: null, error: { code: 'X', message: 'Gagal' }, meta: null }),
      } as Response);

      await expect(apiGet('/x')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('header & body', () => {
    it('menyertakan Content-Type hanya bila ada body', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan(null));

      await apiGet('/catalog/beranda');
      expect(vi.mocked(fetch).mock.calls[0]![1]!.headers).not.toHaveProperty('Content-Type');

      await apiPost('/pesanan', { nama: 'Budi' });
      expect(vi.mocked(fetch).mock.calls[1]![1]!.headers).toMatchObject({
        'Content-Type': 'application/json',
      });
    });

    it('mengirim token sebagai Bearer', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan(null));

      await apiGet('/auth/me', { token: 'token-admin' });

      expect(vi.mocked(fetch).mock.calls[0]![1]!.headers).toMatchObject({
        Authorization: 'Bearer token-admin',
      });
    });

    it('meneruskan header tambahan seperti X-Cart-Token', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan(null));

      await apiGet('/keranjang', { headers: { 'X-Cart-Token': 'token-keranjang' } });

      expect(vi.mocked(fetch).mock.calls[0]![1]!.headers).toMatchObject({
        'X-Cart-Token': 'token-keranjang',
      });
    });

    it('mengirim body sebagai JSON', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan(null));

      await apiPost('/pesanan', { nama: 'Budi' });

      expect(vi.mocked(fetch).mock.calls[0]![1]!.body).toBe('{"nama":"Budi"}');
    });

    it('memakai metode HTTP yang sesuai', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan(null));

      await apiGet('/x');
      await apiPost('/x', {});
      await apiPatch('/x', {});
      await apiDelete('/x');

      expect(vi.mocked(fetch).mock.calls.map((c) => c[1]!.method)).toEqual([
        'GET',
        'POST',
        'PATCH',
        'DELETE',
      ]);
    });
  });

  describe('cache & revalidasi', () => {
    it('tidak menyimpan cache secara bawaan — data pesanan & keranjang harus selalu segar', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan(null));

      await apiGet('/keranjang');

      expect(vi.mocked(fetch).mock.calls[0]![1]).toMatchObject({ cache: 'no-store' });
    });

    it('memakai ISR bila revalidate diberikan', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan(null));

      await apiGet('/catalog/beranda', { revalidate: 60 });

      const opsi = vi.mocked(fetch).mock.calls[0]![1] as { next?: unknown; cache?: unknown };
      expect(opsi.next).toEqual({ revalidate: 60 });
      expect(opsi.cache).toBeUndefined();
    });

    it('menyertakan tag revalidasi bila diberikan', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan(null));

      await apiGet('/landing/promo', { revalidate: 60, tags: ['landing:promo'] });

      expect((vi.mocked(fetch).mock.calls[0]![1] as { next: unknown }).next).toEqual({
        revalidate: 60,
        tags: ['landing:promo'],
      });
    });

    it('menghormati revalidate 0 sebagai "selalu dinamis"', async () => {
      vi.mocked(fetch).mockResolvedValue(balasan(null));

      await apiGet('/x', { revalidate: 0 });

      const opsi = vi.mocked(fetch).mock.calls[0]![1] as { next?: unknown; cache?: unknown };
      expect(opsi.next).toEqual({ revalidate: 0 });
      expect(opsi.cache).toBeUndefined();
    });
  });

  describe('apiUpload', () => {
    it('TIDAK menyetel Content-Type sendiri supaya boundary diisi browser', async () => {
      // Menyetelnya manual menghasilkan boundary yang salah dan upload gagal
      // dengan galat yang membingungkan.
      vi.mocked(fetch).mockResolvedValue(
        balasan({ url: '/uploads/a.jpg', namaBerkas: 'a.jpg', ukuran: 100 }),
      );

      await apiUpload(new File(['isi'], 'a.jpg', { type: 'image/jpeg' }), 'token-admin');

      const headers = vi.mocked(fetch).mock.calls[0]![1]!.headers as Record<string, string>;
      expect(headers).toEqual({ Authorization: 'Bearer token-admin' });
    });

    it('mengirim berkas sebagai FormData', async () => {
      vi.mocked(fetch).mockResolvedValue(
        balasan({ url: '/uploads/a.jpg', namaBerkas: 'a.jpg', ukuran: 100 }),
      );

      await apiUpload(new File(['isi'], 'a.jpg', { type: 'image/jpeg' }), 'token-admin');

      expect(vi.mocked(fetch).mock.calls[0]![1]!.body).toBeInstanceOf(FormData);
    });

    it('melempar ApiError dengan pesan dari API saat unggahan ditolak', async () => {
      vi.mocked(fetch).mockResolvedValue(
        balasanGagal({ code: 'BAD_REQUEST', message: 'Ukuran gambar maksimal 5 MB' }),
      );

      await expect(
        apiUpload(new File(['isi'], 'a.jpg', { type: 'image/jpeg' }), 'token'),
      ).rejects.toThrow(/maksimal 5 MB/);
    });
  });
});
