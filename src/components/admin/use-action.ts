'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/admin-fetch';

export interface ActionState {
  busy: boolean;
  error?: string;
  fields: Record<string, string[] | undefined>;
}

/** Runs an admin API call, surfaces its error, and refreshes server data on success. */
export function useAction() {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({ busy: false, fields: {} });
  async function run<T>(fn: () => Promise<T>, after?: (result: T) => void): Promise<boolean> {
    setState({ busy: true, fields: {} });
    try {
      const result = await fn();
      setState({ busy: false, fields: {} });
      router.refresh();
      after?.(result);
      return true;
    } catch (e) {
      if (e instanceof ApiError) setState({ busy: false, error: e.message, fields: e.fields });
      else setState({ busy: false, error: 'ارتباط با سرور برقرار نشد.', fields: {} });
      return false;
    }
  }
  return { ...state, run };
}
