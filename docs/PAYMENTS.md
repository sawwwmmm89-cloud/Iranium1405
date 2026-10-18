# Payments (ZarinPal)

**State:** the full order → payment → server-side verify → enrollment flow is implemented and unit-tested against a **fake gateway**. It has **not** been run against ZarinPal (no merchant id was available). Without `ZARINPAL_MERCHANT_ID` the payment endpoints return `503 PAYMENT_NOT_CONFIGURED`. There is no mock provider in production code.

## Flow
1. `POST /api/v1/orders {courseId | liveClassId}` — price read from the DB; free items are rejected (use the enroll endpoints); duplicates/already-enrolled are rejected; a recent unpaid order is reused.
2. `POST /api/v1/payments/zarinpal/create {orderId}` — creates a `Payment(INITIATED)` with the gateway `authority`, returns `paymentUrl`.
3. The browser returns to `GET /api/v1/payments/zarinpal/callback?Authority=…&Status=…` which **only triggers verification**: success requires the server-to-server verify call to succeed. `Status` is never trusted as proof of payment.
4. On verified: `Payment=PAID` (+`refId`), `Order=PAID`, `Enrollment`/`LiveEnrollment` created with `skipDuplicates`, audit `payment.paid`, optional SMS. All in one transaction.
5. `POST /api/v1/payments/zarinpal/verify {authority}` re-runs the same idempotent settle path (payer or admin).

## Idempotency & failure handling
- A status-guarded `UPDATE` claims the payment (`INITIATED → VERIFY_PENDING`); a concurrent duplicate callback gets `pending` and does nothing. The final `PAID` transition is guarded again.
- Gateway unreachable/5xx/garbage → outcome unknown: payment stays `VERIFY_PENDING` and is retried on the next callback/verify after 60 s. It is never marked paid or failed on an unknown outcome.
- Gateway refusal → `FAILED` + audit `payment.failed`; user cancel (`Status=NOK`) → `FAILED` + `payment.cancelled`; the order stays `PENDING` and can be paid again.

## API facts used (confirm before going live)
v4 REST: `POST https://payment.zarinpal.com/pg/v4/payment/request.json` and `/verify.json`, JSON body with `merchant_id`, `amount` (**Rial**; BAMA stores Toman and multiplies by 10), `callback_url`, `description` / `authority`; success `data.code` 100 (verify also 101 = already verified, with `data.ref_id`); user redirect `https://payment.zarinpal.com/pg/StartPay/{authority}`; sandbox host `sandbox.zarinpal.com`. These were taken from ZarinPal's public documentation as mirrored by open-source SDKs (the official docs site could not be fetched by the build tool). **Verify against the current official docs and the sandbox before production.**

## Go-live checklist
1. Set `ZARINPAL_MERCHANT_ID`; first test with `ZARINPAL_SANDBOX=true` and a sandbox merchant.
2. `NEXT_PUBLIC_APP_URL` must be the public HTTPS origin (the callback URL is built from it).
3. Pay a test order end-to-end; confirm: enrollment appears, `Payment.refId` is set, a second visit to the callback URL does not create anything, cancelling leaves the order `PENDING`.
4. Replay the callback URL and call `/verify` twice; both must be harmless.
5. Check `AuditLog` for `payment.initiate/paid/failed/cancelled`.
Not implemented: refunds, webhooks other than the browser callback, automatic reconciliation job for long-`VERIFY_PENDING` payments (retry happens on the next callback/verify call).
