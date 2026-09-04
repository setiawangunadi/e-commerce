import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from '../../src/common/response.interceptor';
import { AllExceptionsFilter } from '../../src/common/http-exception.filter';
import { buatKonteks } from '../bantuan/konteks';
import type { ArgumentsHost, CallHandler } from '@nestjs/common';

function jalankanInterceptor(payload: unknown) {
  const interceptor = new ResponseInterceptor();
  const next = { handle: () => of(payload) } as CallHandler;
  return firstValueFrom(interceptor.intercept(buatKonteks({}), next));
}

describe('ResponseInterceptor — envelope { data, error, meta }', () => {
  it('membungkus nilai balik biasa sebagai data', async () => {
    await expect(jalankanInterceptor({ nama: 'Kemeja' })).resolves.toEqual({
      data: { nama: 'Kemeja' },
      error: null,
      meta: null,
    });
  });

  it('meneruskan meta paginasi apa adanya', async () => {
    const hasil = await jalankanInterceptor({
      data: [{ id: 1 }],
      meta: { page: 1, limit: 20, total: 1 },
    });

    expect(hasil).toEqual({
      data: [{ id: 1 }],
      error: null,
      meta: { page: 1, limit: 20, total: 1 },
    });
  });

  it('memperlakukan objek berkolom "data" sebagai data biasa bila tidak ada meta', async () => {
    // Kalau tidak, produk yang kebetulan punya kolom bernama `data` akan
    // ter-unwrap dan sisanya hilang.
    const hasil = await jalankanInterceptor({ data: 'isi', lain: 'ikut' });

    expect(hasil.data).toEqual({ data: 'isi', lain: 'ikut' });
  });

  it('tidak meng-unwrap objek yang punya data & meta tapi juga kolom lain', async () => {
    const payload = { data: 1, meta: {}, ekstra: true };

    expect((await jalankanInterceptor(payload)).data).toEqual(payload);
  });

  it('mengubah undefined jadi null supaya bentuk envelope tetap sama', async () => {
    await expect(jalankanInterceptor(undefined)).resolves.toEqual({
      data: null,
      error: null,
      meta: null,
    });
  });

  it('mempertahankan array kosong sebagai data, bukan null', async () => {
    // Klien membedakan "tidak ada hasil" dari "gagal"; keduanya tidak boleh
    // sama-sama muncul sebagai null.
    expect((await jalankanInterceptor([])).data).toEqual([]);
  });
});

describe('AllExceptionsFilter — galat memakai envelope yang sama', () => {
  let reply: { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };
  let filter: AllExceptionsFilter;

  function host(): ArgumentsHost {
    return {
      switchToHttp: () => ({ getResponse: () => reply }),
    } as unknown as ArgumentsHost;
  }

  function terkirim() {
    return reply.send.mock.calls[0]![0];
  }

  beforeEach(() => {
    reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
    filter = new AllExceptionsFilter();
  });

  it('meneruskan status dan pesan dari HttpException', () => {
    filter.catch(new NotFoundException('Produk tidak ditemukan'), host());

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(terkirim()).toEqual({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      meta: null,
    });
  });

  it('merangkum galat validasi per-field ke dalam details', () => {
    // ValidationPipe mengembalikan array pesan; klien menampilkannya per kolom.
    filter.catch(
      new BadRequestException({
        message: ['nama harus diisi', 'harga tidak boleh negatif'],
        error: 'Bad Request',
        statusCode: 400,
      }),
      host(),
    );

    expect(terkirim().error).toEqual({
      code: 'BAD_REQUEST',
      message: 'Data yang dikirim tidak valid',
      details: ['nama harus diisi', 'harga tidak boleh negatif'],
    });
  });

  it('menerima HttpException yang isinya sekadar string', () => {
    filter.catch(new HttpException('Terlalu banyak permintaan', 429), host());

    expect(reply.status).toHaveBeenCalledWith(429);
    expect(terkirim().error.message).toBe('Terlalu banyak permintaan');
  });

  it('TIDAK membocorkan detail galat tak terduga ke klien', () => {
    // Pesan galat internal sering memuat query, path, atau nama kolom.
    filter.catch(new Error('relation "Order" does not exist at character 42'), host());

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(terkirim()).toEqual({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server' },
      meta: null,
    });
  });

  it('menangani nilai lempar yang bukan Error sama sekali', () => {
    filter.catch('sesuatu yang aneh', host());

    expect(terkirim().error.code).toBe('INTERNAL_ERROR');
  });

  it('tidak menyertakan details bila memang tidak ada', () => {
    filter.catch(new NotFoundException('Tidak ada'), host());

    expect(terkirim().error).not.toHaveProperty('details');
  });

  it('selalu mengirim data dan meta bernilai null pada galat', () => {
    filter.catch(new BadRequestException('X'), host());

    expect(terkirim().data).toBeNull();
    expect(terkirim().meta).toBeNull();
  });
});
