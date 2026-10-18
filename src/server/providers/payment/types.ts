export interface PaymentRequestInput {
  /** Amount in Toman (the unit used everywhere in BAMA). Providers convert if the gateway uses Rial. */
  amountToman: number;
  callbackUrl: string;
  description: string;
}

export interface PaymentRequestResult {
  authority: string;
  paymentUrl: string;
}

export type VerifyResult =
  | { status: 'verified'; refId: string; alreadyVerified: boolean }
  | { status: 'rejected'; code: number };

export interface PaymentProvider {
  readonly name: string;
  request(input: PaymentRequestInput): Promise<PaymentRequestResult>;
  verify(input: { amountToman: number; authority: string }): Promise<VerifyResult>;
}

/** The gateway answered and refused (definitive). */
export class GatewayRejectedError extends Error {
  constructor(public readonly code: number, message = 'Gateway rejected the request') {
    super(message);
  }
}

/** Network error, timeout, 5xx or unparsable reply: the outcome is UNKNOWN, never treat as failure/success. */
export class GatewayUnavailableError extends Error {}
