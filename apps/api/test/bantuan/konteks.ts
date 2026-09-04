import type { ExecutionContext } from '@nestjs/common';

/**
 * ExecutionContext tiruan seminimal mungkin: guard di proyek ini hanya
 * menyentuh request HTTP, handler, dan kelas controller-nya.
 */
export function buatKonteks(
  request: unknown,
  opsi: { handler?: object; kelas?: object } = {},
): ExecutionContext {
  const handler = opsi.handler ?? function handlerPalsu() {};
  const kelas = opsi.kelas ?? class ControllerPalsu {};

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => handler,
    getClass: () => kelas,
  } as unknown as ExecutionContext;
}
