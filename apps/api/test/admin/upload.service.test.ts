import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { UploadService } from '../../src/admin/upload.service';
import type { ConfigService } from '@nestjs/config';
import { buatConfigPalsu } from '../bantuan/prisma-palsu';

// Test ini tentang aturan penerimaan berkas, bukan tentang menulis ke disk.
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

function buatService(nilai: Record<string, string> = {}) {
  return new UploadService(
    buatConfigPalsu({
      UPLOAD_DIR: './uploads',
      PUBLIC_BASE_URL: 'http://localhost:4000',
      ...nilai,
    }) as unknown as ConfigService,
  );
}

function berkas(ubah: Partial<{ filename: string; mimetype: string; buffer: Buffer }> = {}) {
  return {
    filename: 'kemeja.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('isi-gambar'),
    ...ubah,
  };
}

describe('UploadService.simpan', () => {
  let service: UploadService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = buatService();
  });

  describe('jenis berkas yang diterima', () => {
    it.each([
      ['image/jpeg', '.jpg'],
      ['image/png', '.png'],
      ['image/webp', '.webp'],
      ['image/avif', '.avif'],
    ])('menerima %s dan memberi ekstensi %s', async (mimetype, ekstensi) => {
      const hasil = await service.simpan(berkas({ mimetype }));

      expect(hasil.namaBerkas.endsWith(ekstensi)).toBe(true);
    });

    it.each([
      'image/svg+xml',
      'text/html',
      'application/javascript',
      'application/pdf',
      'application/octet-stream',
    ])('menolak %s', async (mimetype) => {
      // SVG khususnya bisa memuat <script>, jadi tidak masuk daftar walaupun
      // secara nama ia "gambar".
      await expect(service.simpan(berkas({ mimetype }))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('batas ukuran', () => {
    it('menolak berkas di atas 5 MB', async () => {
      const besar = Buffer.alloc(5 * 1024 * 1024 + 1);

      await expect(service.simpan(berkas({ buffer: besar }))).rejects.toThrow(/maksimal 5 MB/i);
    });

    it('menerima berkas tepat di batas 5 MB', async () => {
      const pas = Buffer.alloc(5 * 1024 * 1024);

      await expect(service.simpan(berkas({ buffer: pas }))).resolves.toBeDefined();
    });

    it('menolak berkas kosong', async () => {
      await expect(service.simpan(berkas({ buffer: Buffer.alloc(0) }))).rejects.toThrow(
        /kosong/i,
      );
    });
  });

  describe('penamaan berkas', () => {
    it('TIDAK PERNAH memakai nama dari client untuk membentuk path', async () => {
      // Nama asli dari client adalah jalan masuk path traversal.
      const hasil = await service.simpan(berkas({ filename: '../../etc/passwd.jpg' }));

      expect(hasil.namaBerkas).not.toContain('..');
      expect(hasil.namaBerkas).not.toContain('/');
      expect(hasil.namaBerkas).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/,
      );
    });

    it('mengabaikan ekstensi dari client dan memakai ekstensi dari tipe MIME', async () => {
      // Berkas bernama .jpg yang sebenarnya PNG harus disimpan sebagai .png.
      const hasil = await service.simpan(berkas({ filename: 'gambar.jpg', mimetype: 'image/png' }));

      expect(hasil.namaBerkas.endsWith('.png')).toBe(true);
    });

    it('memberi nama berbeda untuk dua unggahan berturut-turut', async () => {
      const a = await service.simpan(berkas());
      const b = await service.simpan(berkas());

      expect(a.namaBerkas).not.toBe(b.namaBerkas);
    });

    it('menulis ke direktori upload, bukan ke path dari client', async () => {
      await service.simpan(berkas({ filename: '/etc/cron.d/jahat.jpg' }));

      const [path] = vi.mocked(writeFile).mock.calls[0]!;
      expect(String(path)).toMatch(/uploads\/[0-9a-f-]+\.jpg$/);
    });
  });

  describe('hasil unggahan', () => {
    it('mengembalikan URL publik yang bisa langsung dipakai form produk', async () => {
      const hasil = await service.simpan(berkas());

      expect(hasil.url).toBe(`http://localhost:4000/uploads/${hasil.namaBerkas}`);
    });

    it('mengikuti PUBLIC_BASE_URL saat gambar dilayani dari domain lain', async () => {
      const hasil = await buatService({ PUBLIC_BASE_URL: 'https://cdn.toko.id' }).simpan(berkas());

      expect(hasil.url.startsWith('https://cdn.toko.id/uploads/')).toBe(true);
    });

    it('melaporkan ukuran berkas', async () => {
      const hasil = await service.simpan(berkas({ buffer: Buffer.alloc(1234) }));

      expect(hasil.ukuran).toBe(1234);
    });

    it('memastikan direktori upload ada sebelum menulis', async () => {
      await service.simpan(berkas());

      expect(mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('melengkapi nama asli tanpa ekstensi supaya tetap terbaca di daftar', async () => {
      const hasil = await service.simpan(berkas({ filename: 'kemeja' }));

      expect(hasil.namaAsli).toBe('kemeja.jpg');
    });
  });
});
