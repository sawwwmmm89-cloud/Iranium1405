'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiCall, ClientApiError } from '@/lib/api-client';

function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : 'ارتباط با سرور برقرار نشد.');
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

const Err = ({ message }: { message?: string }) => (message ? <p role="alert" className="text-sm text-red-600">{message}</p> : null);

/** Free enrollment: POST {url}; refreshes the page on success. */
export function EnrollButton({ url, label = 'ثبت‌نام رایگان' }: { url: string; label?: string }) {
  const router = useRouter();
  const { busy, error, run } = useRun();
  return (
    <div className="space-y-2">
      <Button className="w-full" loading={busy} onClick={() => run(async () => { await apiCall(url, 'POST'); router.refresh(); })}>{label}</Button>
      <Err message={error} />
    </div>
  );
}

async function startPayment(orderId: string): Promise<void> {
  const { paymentUrl } = await apiCall<{ paymentUrl: string }>('/payments/zarinpal/create', 'POST', { orderId });
  window.location.assign(paymentUrl);
}

/** Paid item: create order (price comes from the server) -> create gateway payment -> redirect to the gateway. */
export function BuyButton({ courseId, liveClassId, label = 'خرید و پرداخت' }: { courseId?: string; liveClassId?: string; label?: string }) {
  const { busy, error, run } = useRun();
  return (
    <div className="space-y-2">
      <Button className="w-full" variant="accent" loading={busy} onClick={() => run(async () => {
        const order = await apiCall<{ id: string }>('/orders', 'POST', courseId ? { courseId } : { liveClassId });
        await startPayment(order.id);
      })}>{label}</Button>
      <Err message={error} />
    </div>
  );
}

export function PayOrderButton({ orderId }: { orderId: string }) {
  const { busy, error, run } = useRun();
  return (
    <div className="space-y-1">
      <Button size="sm" variant="accent" loading={busy} onClick={() => run(() => startPayment(orderId))}>پرداخت</Button>
      <Err message={error} />
    </div>
  );
}
