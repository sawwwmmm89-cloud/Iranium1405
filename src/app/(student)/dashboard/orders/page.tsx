import type { Metadata } from 'next';
import { PayOrderButton } from '@/components/commerce/commerce-buttons';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatToman } from '@/lib/utils';
import { listOrders } from '@/server/modules/orders/orders.service';
import { requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'سفارش‌ها' };
export const dynamic = 'force-dynamic';

const BANNER: Record<string, { text: string; cls: string }> = {
  paid: { text: 'پرداخت با موفقیت تأیید شد.', cls: 'bg-green-50 text-green-800' },
  failed: { text: 'پرداخت ناموفق بود یا لغو شد.', cls: 'bg-red-50 text-red-800' },
  pending: { text: 'پرداخت در حال بررسی است. چند دقیقه بعد صفحه را تازه‌سازی کنید.', cls: 'bg-accent-soft text-ink' },
  unknown: { text: 'پرداخت پیدا نشد.', cls: 'bg-red-50 text-red-800' },
};
const STATUS: Record<string, string> = { PENDING: 'در انتظار پرداخت', PAID: 'پرداخت‌شده', FAILED: 'ناموفق', CANCELLED: 'لغوشده', REFUNDED: 'بازپرداخت‌شده' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const user = await requireUser();
  const { payment } = await searchParams;
  const orders = await listOrders(user);
  const banner = payment ? BANNER[payment] : undefined;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">سفارش‌ها</h1>
      {banner && <p role="status" className={`rounded-xl p-4 text-sm ${banner.cls}`}>{banner.text}</p>}
      {orders.length === 0 ? <EmptyState title="سفارشی وجود ندارد" /> : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span>{o.createdAt.toLocaleDateString('fa-IR')} · {STATUS[o.status] ?? o.status}{o.payments[0]?.refId ? ` · کد پیگیری ${o.payments[0].refId}` : ''}</span>
                <span className="flex items-center gap-3"><b>{formatToman(o.totalAmount)}</b>{o.status === 'PENDING' && <PayOrderButton orderId={o.id} />}</span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
