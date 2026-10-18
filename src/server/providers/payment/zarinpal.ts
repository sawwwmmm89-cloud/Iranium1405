import { GatewayRejectedError, GatewayUnavailableError, type PaymentProvider, type PaymentRequestInput, type PaymentRequestResult, type VerifyResult } from './types';

/**
 * ZarinPal REST v4 (https://payment.zarinpal.com/pg/v4/payment/{request,verify}.json,
 * StartPay at /pg/StartPay/{authority}; sandbox host sandbox.zarinpal.com). Amounts are sent in Rial.
 * Endpoints/fields follow ZarinPal's public docs as mirrored by open-source SDKs; confirm against the
 * official docs and the sandbox with your merchant id before going live (see docs/PAYMENTS.md).
 */
export const TOMAN_TO_RIAL = 10;
const TIMEOUT_MS = 15_000;

interface ZarinpalEnvelope {
  data?: { code?: number; authority?: string; ref_id?: number | string } | unknown[];
  errors?: { code?: number; message?: string } | unknown[];
}

export class ZarinpalProvider implements PaymentProvider {
  readonly name = 'zarinpal';
  private readonly base: string;

  constructor(
    private readonly cfg: { merchantId: string; sandbox: boolean },
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.base = cfg.sandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ZarinpalEnvelope> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ merchant_id: this.cfg.merchantId, ...body }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new GatewayUnavailableError(`ZarinPal unreachable: ${(error as Error).name}`);
    }
    if (res.status >= 500) throw new GatewayUnavailableError(`ZarinPal HTTP ${res.status}`);
    try {
      return (await res.json()) as ZarinpalEnvelope;
    } catch {
      throw new GatewayUnavailableError('ZarinPal returned a non-JSON response');
    }
  }

  private static errorCode(env: ZarinpalEnvelope): number | null {
    const e = env.errors;
    return e && !Array.isArray(e) && typeof e.code === 'number' ? e.code : null;
  }

  private static data(env: ZarinpalEnvelope) {
    return env.data && !Array.isArray(env.data) && typeof env.data === 'object' ? env.data : null;
  }

  async request(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const env = await this.post('/pg/v4/payment/request.json', {
      amount: input.amountToman * TOMAN_TO_RIAL,
      callback_url: input.callbackUrl,
      description: input.description,
    });
    const data = ZarinpalProvider.data(env);
    if (data?.code === 100 && typeof data.authority === 'string' && /^[A-Za-z0-9]{10,64}$/.test(data.authority)) {
      return { authority: data.authority, paymentUrl: `${this.base}/pg/StartPay/${data.authority}` };
    }
    // A success code (100) with a malformed body is NOT a refusal: it is an unrecognised reply (outcome unknown).
    const code = ZarinpalProvider.errorCode(env) ?? (data?.code === 100 ? undefined : data?.code);
    if (typeof code === 'number') throw new GatewayRejectedError(code);
    throw new GatewayUnavailableError('Unrecognised ZarinPal request response');
  }

  async verify(input: { amountToman: number; authority: string }): Promise<VerifyResult> {
    const env = await this.post('/pg/v4/payment/verify.json', {
      amount: input.amountToman * TOMAN_TO_RIAL,
      authority: input.authority,
    });
    const data = ZarinpalProvider.data(env);
    if ((data?.code === 100 || data?.code === 101) && data.ref_id !== undefined) {
      return { status: 'verified', refId: String(data.ref_id), alreadyVerified: data.code === 101 };
    }
    const success = data?.code === 100 || data?.code === 101;
    const code = ZarinpalProvider.errorCode(env) ?? (success ? undefined : data?.code);
    if (typeof code === 'number') return { status: 'rejected', code };
    throw new GatewayUnavailableError('Unrecognised ZarinPal verify response');
  }
}
