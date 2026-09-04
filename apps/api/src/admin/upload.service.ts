import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const TIPE_DIIZINKAN = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
]);

const MAKS_UKURAN = 5 * 1024 * 1024; // 5 MB

/**
 * Penyimpanan gambar produk di disk lokal untuk development.
 *
 * Di production ini diganti Cloudflare R2 (lihat research/tech/09-storage-cdn-media.md).
 * Antarmuka `simpan()` sengaja dibuat sempit supaya penggantiannya cukup di kelas ini.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.uploadDir = resolve(process.cwd(), config.get<string>('UPLOAD_DIR', './uploads'));
    this.publicBaseUrl = config.get<string>('PUBLIC_BASE_URL', 'http://localhost:4000');
  }

  async simpan(berkas: { filename: string; mimetype: string; buffer: Buffer }) {
    const ekstensi = TIPE_DIIZINKAN.get(berkas.mimetype);
    if (!ekstensi) {
      throw new BadRequestException('Format gambar harus JPG, PNG, WebP, atau AVIF');
    }
    if (berkas.buffer.length > MAKS_UKURAN) {
      throw new BadRequestException('Ukuran gambar maksimal 5 MB');
    }
    if (berkas.buffer.length === 0) {
      throw new BadRequestException('Berkas kosong');
    }

    // Nama berkas dibuat ulang dari UUID — nama asli dari client tidak pernah
    // dipakai untuk membentuk path (mencegah path traversal).
    const namaBerkas = `${randomUUID()}${ekstensi}`;
    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(join(this.uploadDir, namaBerkas), berkas.buffer);

    this.logger.log(`Gambar tersimpan: ${namaBerkas} (${berkas.buffer.length} byte)`);

    return {
      url: `${this.publicBaseUrl}/uploads/${namaBerkas}`,
      namaBerkas,
      ukuran: berkas.buffer.length,
      namaAsli: extname(berkas.filename) ? berkas.filename : `${berkas.filename}${ekstensi}`,
    };
  }
}
