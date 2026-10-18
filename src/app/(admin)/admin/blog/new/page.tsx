import type { Metadata } from 'next';
import { BlogForm } from '@/components/admin/blog-form';
import { Card } from '@/components/ui/card';
import { ADMIN_ROLES, requireUser } from '@/server/security/session';

export const metadata: Metadata = { title: 'مقالهٔ جدید' };
export const dynamic = 'force-dynamic';

export default async function NewPostPage() {
  await requireUser(ADMIN_ROLES);
  return <div className="mx-auto max-w-3xl space-y-6"><h1 className="text-2xl font-bold">مقالهٔ جدید</h1><Card className="p-6"><BlogForm /></Card></div>;
}
