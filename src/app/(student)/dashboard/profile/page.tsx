import type { Metadata } from 'next';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'پروفایل' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">پروفایل</h1>
      <Card className="flex items-center gap-4 p-6"><Avatar name={user.name} className="size-14 text-xl" /><div><p className="font-semibold">{user.name}</p><p dir="ltr" className="text-start text-sm text-ink/60">{user.email}</p></div></Card>
      <p className="text-sm text-ink/60">ویرایش پروفایل و تغییر رمز عبور در فاز بعد اضافه می‌شود.</p>
    </div>
  );
}
