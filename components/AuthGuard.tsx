'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/auth';
import { apiGet } from '@/lib/api';
import type { User } from '@/types/api';

interface AuthGuardProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export default function AuthGuard({ children, sidebar }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPath = pathname.startsWith('/login');
  const [authorized, setAuthorized] = useState(isLoginPath);

  const checkAuth = useCallback(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    apiGet<User>('/users/me').then((res) => {
      if (res.success && res.data && res.data.admin_role?.type === 'system_admin') {
        setAuthorized(true);
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  useEffect(() => {
    if (!isLoginPath) {
      checkAuth();
    }
  }, [isLoginPath, checkAuth]);

  if (isLoginPath) {
    return <>{children}</>;
  }

  if (!authorized) {
    return null;
  }

  return (
    <>
      {sidebar}
      <main style={{ flex: 1, overflow: "auto" }}>
        {children}
      </main>
    </>
  );
}
