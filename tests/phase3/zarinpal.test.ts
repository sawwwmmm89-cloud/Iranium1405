import { describe, expect, it, vi } from 'vitest';
import { GatewayRejectedError, GatewayUnavailableError } from '@/server/providers/payment/types';
import { ZarinpalProvider } from '@/server/providers/payment/zarinpal';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const make = (impl: typeof fetch, sandbox = false) => new ZarinpalProvider({ merchantId: 'MERCHANT', sandbox }, impl);
const AUTH = 'A00000000000000000000000000123456789';

describe('ZarinpalProvider.request', () => {
  it('sends Rial amount and merchant id, returns the StartPay url', async () => {
    const f = vi.fn().mockResolvedValue(json({ data: { code: 100, authority: AUTH }, errors: [] }));
    const r = await make(f as unknown as typeof fetch).request({ amountToman: 1500, callbackUrl: 'https://x.test/cb', description: 'd' });
    expect(r).toEqual({ authority: AUTH, paymentUrl: `https://payment.zarinpal.com/pg/StartPay/${AUTH}` });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://payment.zarinpal.com/pg/v4/payment/request.json');
    expect(JSON.parse(String(init.body))).toMatchObject({ merchant_id: 'MERCHANT', amount: 15000, callback_url: 'https://x.test/cb' });
  });
  it('uses the sandbox host when configured', async () => {
    const f = vi.fn().mockResolvedValue(json({ data: { code: 100, authority: AUTH } }));
    const r = await make(f as unknown as typeof fetch, true).request({ amountToman: 1, callbackUrl: 'https://x.test/cb', description: 'd' });
    expect(r.paymentUrl.startsWith('https://sandbox.zarinpal.com/pg/StartPay/')).toBe(true);
  });
  it('definitive refusal -> GatewayRejectedError(code)', async () => {
    const f = vi.fn().mockImplementation(() => Promise.resolve(json({ data: [], errors: { code: -9, message: 'bad' } }, 400)));
    await expect(make(f as unknown as typeof fetch).request({ amountToman: 1, callbackUrl: 'u', description: 'd' })).rejects.toMatchObject({ code: -9 });
    await expect(make(f as unknown as typeof fetch).request({ amountToman: 1, callbackUrl: 'u', description: 'd' })).rejects.toBeInstanceOf(GatewayRejectedError);
  });
  it('network error, 5xx and non-JSON -> GatewayUnavailableError (outcome unknown)', async () => {
    const req = { amountToman: 1, callbackUrl: 'u', description: 'd' };
    await expect(make(vi.fn().mockRejectedValue(new Error('ECONNRESET')) as unknown as typeof fetch).request(req)).rejects.toBeInstanceOf(GatewayUnavailableError);
    await expect(make(vi.fn().mockResolvedValue(new Response('oops', { status: 502 })) as unknown as typeof fetch).request(req)).rejects.toBeInstanceOf(GatewayUnavailableError);
    await expect(make(vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })) as unknown as typeof fetch).request(req)).rejects.toBeInstanceOf(GatewayUnavailableError);
  });
  it('rejects a malformed authority', async () => {
    const f = vi.fn().mockResolvedValue(json({ data: { code: 100, authority: '../x' } }));
    await expect(make(f as unknown as typeof fetch).request({ amountToman: 1, callbackUrl: 'u', description: 'd' })).rejects.toBeInstanceOf(GatewayUnavailableError);
  });
});

describe('ZarinpalProvider.verify', () => {
  const v = { amountToman: 2000, authority: AUTH };
  it('100 => verified, 101 => alreadyVerified', async () => {
    const ok = vi.fn().mockResolvedValue(json({ data: { code: 100, ref_id: 987654 }, errors: [] }));
    expect(await make(ok as unknown as typeof fetch).verify(v)).toEqual({ status: 'verified', refId: '987654', alreadyVerified: false });
    expect(JSON.parse(String((ok.mock.calls[0] as [string, RequestInit])[1].body))).toMatchObject({ amount: 20000, authority: AUTH });
    const again = vi.fn().mockResolvedValue(json({ data: { code: 101, ref_id: 987654 } }));
    expect(await make(again as unknown as typeof fetch).verify(v)).toMatchObject({ status: 'verified', alreadyVerified: true });
  });
  it('error code => rejected; garbage => unavailable', async () => {
    expect(await make(vi.fn().mockResolvedValue(json({ data: [], errors: { code: -50, message: 'amount mismatch' } })) as unknown as typeof fetch).verify(v)).toEqual({ status: 'rejected', code: -50 });
    await expect(make(vi.fn().mockResolvedValue(json({ unexpected: true })) as unknown as typeof fetch).verify(v)).rejects.toBeInstanceOf(GatewayUnavailableError);
  });
});

describe('ZarinpalProvider: success code with malformed body is not a refusal', () => {
  it('verify 100 without ref_id => unavailable (unknown), never rejected', async () => {
    const f = vi.fn().mockResolvedValue(json({ data: { code: 100 } }));
    await expect(make(f as unknown as typeof fetch).verify({ amountToman: 1, authority: AUTH })).rejects.toBeInstanceOf(GatewayUnavailableError);
  });
});
