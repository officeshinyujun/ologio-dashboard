'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clearTokens } from '@/lib/auth'
import { apiPost } from '@/lib/api'
import { VStack } from '@/components/general/VStack'
import { HStack } from '@/components/general/HStack'
import Typo from '@/components/general/Typo'
import { COLORS } from '@/constants/colors'
import { SPACING } from '@/constants/spacing'
import s from './style.module.scss'

const NAV_ITEMS = [
    { href: '/', label: '홈', icon: '⊞' },
    { href: '/schedule', label: '일정 관리', icon: '📅' },
    { href: '/timetable', label: '시간표 관리', icon: '🗓' },
    { href: '/meal', label: '급식 관리', icon: '🍱' },
    { href: '/users', label: '사용자 관리', icon: '👥' },
    { href: '/notifications', label: '알림 관리', icon: '🔔' },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        if (confirm('로그아웃 하시겠습니까?')) {
            try {
                await apiPost('/auth/logout')
            } catch (err) {
                console.error('Logout error:', err)
            } finally {
                clearTokens()
                router.replace('/login')
            }
        }
    }

    return (
        <VStack
            className={s.sidebar}
            style={{
                width: 220,
                minHeight: '100vh',
                backgroundColor: COLORS.background.secondary,
                borderRight: `1px solid ${COLORS.border.primary}`,
                padding: SPACING.s20,
            }}
            gap={SPACING.s32}
        >
            <HStack align="center" gap={SPACING.s8} style={{ paddingBottom: SPACING.s20, borderBottom: `1px solid ${COLORS.border.primary}` }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.brand.primary }} />
                <Typo.MD color="primary" fontWeight="bold">Ologio</Typo.MD>
            </HStack>

            <VStack gap={SPACING.s4} fullWidth>
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link key={item.href} href={item.href}>
                            <HStack
                                align="center"
                                gap={SPACING.s10}
                                style={{
                                    padding: `${SPACING.s8}px ${SPACING.s12}px`,
                                    borderRadius: 8,
                                    backgroundColor: isActive ? COLORS.background.fourth : 'transparent',
                                    cursor: 'pointer',
                                }}
                            >
                                <Typo.SM style={{ lineHeight: 1 }}>{item.icon}</Typo.SM>
                                <Typo.SM color={isActive ? 'primary' : 'secondary'} fontWeight={isActive ? 'medium' : 'regular'}>
                                    {item.label}
                                </Typo.SM>
                            </HStack>
                        </Link>
                    )
                })}
            </VStack>

            <VStack
                style={{
                    marginTop: 'auto',
                    paddingTop: SPACING.s20,
                    borderTop: `1px solid ${COLORS.border.primary}`,
                }}
                gap={SPACING.s16}
                fullWidth
            >
                <HStack
                    align="center"
                    gap={SPACING.s10}
                    onClick={handleLogout}
                    className={s.logoutButton}
                    style={{
                        padding: `${SPACING.s8}px ${SPACING.s12}px`,
                        borderRadius: 8,
                    }}
                >
                    <Typo.SM style={{ lineHeight: 1 }}>⎋</Typo.SM>
                    <Typo.SM color="secondary">로그아웃</Typo.SM>
                </HStack>

                <VStack gap={SPACING.s4}>
                    <Typo.XXS color="secondary">Ologio Admin Dashboard</Typo.XXS>
                    <Typo.XXS color="secondary">v0.1.0</Typo.XXS>
                </VStack>
            </VStack>
        </VStack>
    )
}
