# SMS / notifications

**State:** the provider-agnostic service is implemented and unit-tested with a fake provider. **No SMS vendor adapter exists**: no vendor documentation or credentials were available and no vendor API is guessed. With `SMS_PROVIDER` empty, messages are recorded in `SmsMessage` with status `SKIPPED` / `lastError=SMS_NOT_CONFIGURED`.

## What exists
- `SmsProvider` interface (`src/server/providers/sms/types.ts`) and an **empty** registry (`src/server/providers/sms/index.ts`).
- `sendSms()`: Iranian mobile normalisation (09XXXXXXXXX), per-number rate limit (5/hour), de-duplication by `dedupeKey` (unique), up to 3 attempts with backoff, status tracking (`QUEUED/SENT/FAILED/SKIPPED`), only a truncated error message is stored.
- Payment success notification (`payment-paid:<paymentId>`), sent only if `User.phone` is set.

## Adding a vendor
Implement `SmsProvider.send({to, text})` strictly from the vendor's official documentation, register it under a name in `registry`, put its credentials in environment variables (never in code), set `SMS_PROVIDER=<name>`, then test with a real handset.

## Not implemented
Mobile-number verification/OTP login, course announcement broadcasts, delivery reports, an admin SMS log UI.
