import 'server-only';
import { logger } from '@/lib/logger';
import type { SmsProvider } from './types';

/**
 * Registry of concrete SMS vendors. It is intentionally EMPTY: no vendor documentation or credentials were
 * available, so no vendor API is guessed. Add an adapter here (implementing SmsProvider against the vendor's
 * official docs) and set SMS_PROVIDER=<name>.
 */
const registry: Record<string, () => SmsProvider> = {};

export function getSmsProvider(name: string | undefined = process.env.SMS_PROVIDER): SmsProvider | null {
  if (!name || name === 'none') return null;
  const factory = registry[name];
  if (!factory) {
    logger.warn('sms_provider_unknown', { name });
    return null;
  }
  return factory();
}
