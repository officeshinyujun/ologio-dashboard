'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setTokens } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasCalled = useRef(false);

  useEffect(() => {
    const loginCode = searchParams.get('login_code');

    if (!loginCode) {
      router.replace('/login');
      return;
    }

    if (hasCalled.current) return;
    hasCalled.current = true;

    async function exchange() {
      try {
        const res = await fetch(`${API_URL}/auth/mobile/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login_code: loginCode }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setTokens(json.data.access_token, json.data.refresh_token);
          router.replace('/');
        } else {
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      }
    }

    exchange();
  }, [searchParams, router]);

  return null;
}

export default function LoginCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
