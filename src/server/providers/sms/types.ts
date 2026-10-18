export interface SmsProvider {
  readonly name: string;
  send(input: { to: string; text: string }): Promise<{ providerRef?: string }>;
}
