import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import { Card } from '@/components/ui/card';
import { Logo } from '@/components/layout/logo';

export const metadata: Metadata = { title: 'ورود به باما' };

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-soft/60 p-4">
      <Card className="w-full max-w-md space-y-6 p-8">
        <Logo />
        <h1 className="text-2xl font-bold">ورود به باما</h1>
        <Suspense><AuthForm mode="login" /></Suspense>
      </Card>
    </div>
  );
}
