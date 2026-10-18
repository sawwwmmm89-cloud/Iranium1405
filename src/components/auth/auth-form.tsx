'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Mode = 'login' | 'register';
type FieldErrors = Record<string, string[] | undefined>;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [fields, setFields] = useState<FieldErrors>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(undefined);
    setFields({});
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch(`/api/v1/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { success: boolean; error?: { message: string; details?: FieldErrors } };
    setLoading(false);
    if (json.success) {
      const next = params.get('next');
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
      router.refresh();
      return;
    }
    setMessage(json.error?.message);
    setFields(json.error?.details ?? {});
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {mode === 'register' && <Input name="name" label="نام و نام خانوادگی" autoComplete="name" error={fields.name?.[0]} />}
      <Input name="email" type="email" dir="ltr" label="ایمیل" autoComplete="email" error={fields.email?.[0]} />
      <Input name="password" type="password" dir="ltr" label="رمز عبور" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} error={fields.password?.[0]} />
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      <Button type="submit" className="w-full" loading={loading}>{mode === 'login' ? 'ورود' : 'ثبت‌نام'}</Button>
    </form>
  );
}
