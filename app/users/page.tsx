'use client'

import { useState, useEffect, useCallback } from 'react'
import { VStack } from '@/components/general/VStack'
import { HStack } from '@/components/general/HStack'
import Typo from '@/components/general/Typo'
import { COLORS } from '@/constants/colors'
import { SPACING } from '@/constants/spacing'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import type { User, UserRole } from '@/types/api'
import { DEPARTMENT_LABELS } from '@/types/api'

type OAuthStatus = 'connected' | 'disconnected'

const ROLE_LABELS: Record<UserRole, string> = {
    admin: '관리자',
    teacher: '교사',
    student: '학생',
}

const ROLE_COLORS: Record<UserRole, string> = {
    admin: COLORS.brand.primary,
    teacher: COLORS.calendar.conflower,
    student: COLORS.text.secondary,
}

const OAUTH_COLORS: Record<OAuthStatus, string> = {
    connected: COLORS.text.correct,
    disconnected: COLORS.text.secondary,
}

const OAUTH_LABELS: Record<OAuthStatus, string> = {
    connected: '연결됨',
    disconnected: '미연결',
}

const getId = (id: any): string => (typeof id === 'object' && id !== null ? id.$oid || id.id || id._id || String(id) : String(id));

function getOAuthStatus(user: User): OAuthStatus {
    return user.google_calendar_token ? 'connected' : 'disconnected'
}

function getDepartmentLabel(user: User): string {
    if (!user.department) return ''
    return DEPARTMENT_LABELS[user.department] || ''
}

function getAffiliation(user: User): string {
    const parts: string[] = []
    const dept = getDepartmentLabel(user)
    if (dept) parts.push(dept)
    if (user.grade) parts.push(`${user.grade}학년`)
    if (user.class) parts.push(`${user.class}반`)
    return parts.join(' ')
}

export default function UsersPage() {
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        setError(null)
        const res = await apiGet<User[]>('/admin/users')
        if (res.success && res.data) {
            setUsers(res.data)
        } else {
            setError(res.error?.message || '사용자 목록을 불러오지 못했습니다.')
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        let active = true
        apiGet<User[]>('/admin/users').then(res => {
            if (!active) return
            if (res.success && res.data) {
                setUsers(res.data)
            } else {
                setError(res.error?.message || '사용자 목록을 불러오지 못했습니다.')
            }
            setLoading(false)
        })
        return () => {
            active = false
        }
    }, [])

    const handleRoleChange = async (user: User) => {
        const roles: UserRole[] = ['admin', 'teacher', 'student']
        const options = roles.filter(r => r !== user.role).map(r => ROLE_LABELS[r]).join(', ')
        const input = prompt(`새 권한을 입력하세요 (${options}):`)
        if (!input) return

        const selected = (Object.entries(ROLE_LABELS) as [UserRole, string][]).find(([, label]) => label === input.trim())
        if (!selected) {
            alert('올바른 권한을 입력해주세요.')
            return
        }

        const [newRole] = selected
        const userId = getId(user._id)
        const res = await apiPut(`/admin/users/${userId}/role`, { role: newRole })
        if (res.success) {
            alert('권한이 변경되었습니다.')
            fetchUsers()
        } else {
            alert(res.error?.message || '권한 변경에 실패했습니다.')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('정말 이 사용자를 삭제하시겠습니까?')) return
        const res = await apiDelete(`/admin/users/${id}`)
        if (res.success) {
            fetchUsers()
        } else {
            alert(res.error?.message || '사용자 삭제에 실패했습니다.')
        }
    }

    const filtered = users.filter(u => {
        const matchSearch = u.display_name.includes(search) || u.email.includes(search)
        const matchRole = roleFilter === 'all' || u.role === roleFilter
        return matchSearch && matchRole
    })

    if (loading) {
        return (
            <VStack align="center" justify="center" style={{ padding: SPACING.s32, minHeight: '100vh', backgroundColor: COLORS.background.primary }}>
                <Typo.SM color="secondary">로딩 중...</Typo.SM>
            </VStack>
        )
    }

    if (error) {
        return (
            <VStack align="center" justify="center" gap={SPACING.s16} style={{ padding: SPACING.s32, minHeight: '100vh', backgroundColor: COLORS.background.primary }}>
                <Typo.SM color="wrong">{error}</Typo.SM>
                <button onClick={fetchUsers} style={{ padding: `${SPACING.s8}px ${SPACING.s16}px`, backgroundColor: COLORS.brand.primary, border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                    <Typo.SM color="inverted" fontWeight="medium">다시 시도</Typo.SM>
                </button>
            </VStack>
        )
    }

    return (
        <VStack gap={SPACING.s32} style={{ padding: SPACING.s32, minHeight: '100vh', backgroundColor: COLORS.background.primary }}>
            <HStack justify="between" align="center" fullWidth>
                <VStack gap={SPACING.s8}>
                    <Typo.XL color="primary" fontWeight="bold">사용자 및 권한 관리</Typo.XL>
                    <Typo.SM color="secondary">학생/교사 명단 및 권한을 관리합니다.</Typo.SM>
                </VStack>
            </HStack>

            <HStack gap={SPACING.s12} fullWidth>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => {
                    const count = users.filter(u => u.role === role).length
                    return (
                        <HStack
                            key={role}
                            align="center"
                            gap={SPACING.s10}
                            style={{
                                flex: 1,
                                padding: `${SPACING.s12}px ${SPACING.s16}px`,
                                backgroundColor: COLORS.background.secondary,
                                borderRadius: 10,
                                border: `1px solid ${COLORS.border.primary}`,
                            }}
                        >
                            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: ROLE_COLORS[role] }} />
                            <VStack gap={SPACING.s4}>
                                <Typo.XXS color="secondary">{ROLE_LABELS[role]}</Typo.XXS>
                                <Typo.MD color="primary" fontWeight="bold">{count}명</Typo.MD>
                            </VStack>
                        </HStack>
                    )
                })}
            </HStack>

            <HStack gap={SPACING.s12} align="center" fullWidth>
                <input
                    placeholder="이름 또는 이메일 검색"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        flex: 1,
                        padding: `${SPACING.s10}px ${SPACING.s14}px`,
                        backgroundColor: COLORS.background.secondary,
                        border: `1px solid ${COLORS.border.primary}`,
                        borderRadius: 8,
                        color: COLORS.text.primary,
                        fontSize: 14,
                        outline: 'none',
                    }}
                />
                <HStack gap={SPACING.s6}>
                    {([['all', '전체'], ...Object.entries(ROLE_LABELS)] as [UserRole | 'all', string][]).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setRoleFilter(key)}
                            style={{
                                padding: `${SPACING.s8}px ${SPACING.s12}px`,
                                backgroundColor: roleFilter === key ? COLORS.background.fourth : COLORS.background.secondary,
                                border: `1px solid ${roleFilter === key ? COLORS.brand.primary : COLORS.border.primary}`,
                                borderRadius: 8,
                                cursor: 'pointer',
                            }}
                        >
                            <Typo.XS color={roleFilter === key ? 'primary' : 'secondary'}>{label}</Typo.XS>
                        </button>
                    ))}
                </HStack>
            </HStack>

            <VStack gap={SPACING.s8} fullWidth>
                <HStack align="center" gap={SPACING.s16} fullWidth style={{ padding: `${SPACING.s8}px ${SPACING.s16}px` }}>
                    <Typo.XS color="secondary" style={{ flex: 2 }}>이름 / 이메일</Typo.XS>
                    <Typo.XS color="secondary" style={{ flex: 2 }}>소속</Typo.XS>
                    <Typo.XS color="secondary" style={{ flex: 1 }}>권한</Typo.XS>
                    <Typo.XS color="secondary" style={{ flex: 1 }}>Google OAuth</Typo.XS>
                    <Typo.XS color="secondary" style={{ flex: 1 }}>가입일</Typo.XS>
                    <Typo.XS color="secondary" style={{ width: 120 }}>관리</Typo.XS>
                </HStack>

                {filtered.map(user => {
                    const oauth = getOAuthStatus(user)
                    return (
                        <HStack
                            key={getId(user._id)}
                            align="center"
                            gap={SPACING.s16}
                            fullWidth
                            style={{
                                padding: `${SPACING.s12}px ${SPACING.s16}px`,
                                backgroundColor: COLORS.background.secondary,
                                borderRadius: 10,
                                border: `1px solid ${COLORS.border.primary}`,
                            }}
                        >
                            <VStack gap={SPACING.s4} style={{ flex: 2 }}>
                                <Typo.SM color="primary" fontWeight="medium">{user.display_name}</Typo.SM>
                                <Typo.XXS color="secondary">{user.email}</Typo.XXS>
                            </VStack>
                            <Typo.XS color="secondary" style={{ flex: 2 }}>{getAffiliation(user)}</Typo.XS>
                            <HStack align="center" gap={SPACING.s6} style={{ flex: 1 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ROLE_COLORS[user.role] }} />
                                <Typo.XS color="secondary">{ROLE_LABELS[user.role]}</Typo.XS>
                            </HStack>
                            <HStack align="center" gap={SPACING.s6} style={{ flex: 1 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: OAUTH_COLORS[oauth] }} />
                                <Typo.XS color="secondary">{OAUTH_LABELS[oauth]}</Typo.XS>
                            </HStack>
                            <Typo.XS color="secondary" style={{ flex: 1 }}>
                                {typeof user.created_at === 'string' ? user.created_at.slice(0, 10) : '-'}
                            </Typo.XS>
                            <HStack gap={SPACING.s10} style={{ width: 120 }}>
                                <button onClick={() => handleRoleChange(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    <Typo.XS color="secondary">권한 변경</Typo.XS>
                                </button>
                                <button onClick={() => handleDelete(getId(user._id))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    <Typo.XS color="wrong">삭제</Typo.XS>
                                </button>
                            </HStack>
                        </HStack>
                    )
                })}

                {filtered.length === 0 && (
                    <VStack align="center" style={{ padding: SPACING.s32 }}>
                        <Typo.SM color="secondary">검색 결과가 없습니다.</Typo.SM>
                    </VStack>
                )}
            </VStack>
        </VStack>
    )
}
