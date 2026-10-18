import { describe, expect, it } from 'vitest';
import { getMaxUploadBytes, getStorageConfig, getZarinpalConfig } from '@/lib/env';

const full = {
  STORAGE_ENDPOINT: 'https://storage.example.test', STORAGE_BUCKET: 'b', STORAGE_ACCESS_KEY_ID: 'id', STORAGE_SECRET_ACCESS_KEY: 'secret',
} as unknown as NodeJS.ProcessEnv;

describe('integration config (null => needs configuration)', () => {
  it('storage: null unless every required variable is present', () => {
    expect(getStorageConfig({} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(getStorageConfig({ ...full, STORAGE_BUCKET: '' } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
  it('storage: applies defaults and parses booleans/numbers', () => {
    expect(getStorageConfig(full)).toMatchObject({ region: 'us-east-1', forcePathStyle: true, signedUrlTtlSeconds: 120, maxUploadBytes: 20 * 1024 * 1024 });
    expect(getStorageConfig({ ...full, STORAGE_FORCE_PATH_STYLE: 'false', STORAGE_SIGNED_URL_TTL_SECONDS: '60', MAX_UPLOAD_BYTES: '1048576' } as unknown as NodeJS.ProcessEnv))
      .toMatchObject({ forcePathStyle: false, signedUrlTtlSeconds: 60, maxUploadBytes: 1048576 });
  });
  it('storage: rejects unsafe TTL and endpoint values when configured', () => {
    expect(() => getStorageConfig({ ...full, STORAGE_SIGNED_URL_TTL_SECONDS: '999999' } as unknown as NodeJS.ProcessEnv)).toThrow();
    expect(() => getStorageConfig({ ...full, STORAGE_ENDPOINT: 'not a url' } as unknown as NodeJS.ProcessEnv)).toThrow();
  });
  it('max upload default and zarinpal config', () => {
    expect(getMaxUploadBytes({} as unknown as NodeJS.ProcessEnv)).toBe(20 * 1024 * 1024);
    expect(getZarinpalConfig({} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(getZarinpalConfig({ ZARINPAL_MERCHANT_ID: 'm', ZARINPAL_SANDBOX: 'true' } as unknown as NodeJS.ProcessEnv)).toEqual({ merchantId: 'm', sandbox: true });
  });
});
