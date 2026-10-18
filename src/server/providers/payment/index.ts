import 'server-only';
import { getZarinpalConfig } from '@/lib/env';
import type { PaymentProvider } from './types';
import { ZarinpalProvider } from './zarinpal';

let instance: PaymentProvider | null | undefined;

/** null => no merchant id configured: payments report "needs configuration". No mock provider exists in production code. */
export function getPaymentProvider(): PaymentProvider | null {
  if (instance === undefined) {
    const cfg = getZarinpalConfig();
    instance = cfg ? new ZarinpalProvider(cfg) : null;
  }
  return instance;
}
