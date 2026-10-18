const DIGITS: Record<string, string> = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9', '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };

/** Normalizes Iranian mobile numbers to 09XXXXXXXXX, or null if invalid. */
export function normalizeIranMobile(input: string): string | null {
  const latin = input.replace(/[۰-۹٠-٩]/g, (d) => DIGITS[d] ?? d).replace(/[\s()-]/g, '');
  const m = /^(?:\+98|0098|98|0)?(9\d{9})$/.exec(latin);
  return m ? `0${m[1]}` : null;
}
