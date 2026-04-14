'use client';

import { useEffect } from 'react';
import { COLORS } from '@/constants/colors';
import { SPACING } from '@/constants/spacing';
import { VStack } from '@/components/general/VStack';
import Typo from '@/components/general/Typo';

export default function LoginPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    document.title = '로그인 - Ologio 관리자 대시보드';
  }, []);

  const handleGoogleLogin = () => {
    const callbackUrl = `${window.location.origin}/login/callback`;
    window.location.href = `${apiUrl}/auth/google?platform=mobile&redirect_uri=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <VStack
      align="center"
      justify="center"
      style={{
        minHeight: '100vh',
        background: COLORS.background.primary,
      }}
    >
      <VStack
        align="center"
        gap={SPACING.s24}
        style={{
          padding: SPACING.s32,
          background: COLORS.background.secondary,
          borderRadius: 12,
          border: `1px solid ${COLORS.border.primary}`,
        }}
      >
        <Typo.XL color="primary" fontWeight="bold">Ologio 관리자</Typo.XL>
        <Typo.SM color="secondary">관리자 계정으로 로그인하세요</Typo.SM>
        <button
          onClick={handleGoogleLogin}
          style={{
            padding: `${SPACING.s12}px ${SPACING.s24}px`,
            background: COLORS.brand.primary,
            color: COLORS.background.primary,
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Google로 로그인
        </button>
      </VStack>
    </VStack>
  );
}
