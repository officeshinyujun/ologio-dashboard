'use client'

import { useState, useEffect } from 'react'
import { VStack } from '@/components/general/VStack'
import { HStack } from '@/components/general/HStack'
import Typo from '@/components/general/Typo'
import { COLORS } from '@/constants/colors'
import { SPACING } from '@/constants/spacing'
import { apiGet, apiPost } from '@/lib/api'
import type { AdminStats, SchoolScheduleEntry, GcalQueueStats } from '@/types/api'

const getId = (id: any): string => (typeof id === 'object' && id !== null ? id.$oid || id.id || id._id || String(id) : String(id));

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <VStack
            gap={SPACING.s8}
            style={{
                flex: 1,
                padding: SPACING.s20,
                backgroundColor: COLORS.background.secondary,
                borderRadius: 12,
                border: `1px solid ${COLORS.border.primary}`,
            }}
        >
            <Typo.XS color="secondary">{label}</Typo.XS>
            <Typo.XXL color={color ?? 'primary'} fontWeight="bold">{value}</Typo.XXL>
            {sub && <Typo.XXS color="secondary">{sub}</Typo.XXS>}
        </VStack>
    )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <VStack
            gap={SPACING.s16}
            style={{
                padding: SPACING.s20,
                backgroundColor: COLORS.background.secondary,
                borderRadius: 12,
                border: `1px solid ${COLORS.border.primary}`,
            }}
        >
            <Typo.MD color="primary" fontWeight="semi-bold">{title}</Typo.MD>
            {children}
        </VStack>
    )
}

function getAlerts(stats: AdminStats): { type: string; message: string }[] {
    const alerts: { type: string; message: string }[] = []

    const comciganOk = stats.sync_health.comcigan_last_24h.success_rate >= 90
    alerts.push({
        type: comciganOk ? 'ok' : 'warning',
        message: comciganOk ? '컴시간 동기화 정상' : `컴시간 동기화 성공률 ${stats.sync_health.comcigan_last_24h.success_rate}%`,
    })

    const mealOk = stats.sync_health.meal_last_24h.success_rate >= 90
    alerts.push({
        type: mealOk ? 'ok' : 'warning',
        message: mealOk ? '급식 동기화 정상' : `급식 동기화 성공률 ${stats.sync_health.meal_last_24h.success_rate}%`,
    })

    const neisOk = stats.sync_health.neis_last_24h.success_rate >= 90
    alerts.push({
        type: neisOk ? 'ok' : 'warning',
        message: neisOk ? 'NEIS 연동 정상' : `NEIS 동기화 성공률 ${stats.sync_health.neis_last_24h.success_rate}%`,
    })

    if (stats.pending_gcal_tasks > 100) {
        alerts.push({ type: 'warning', message: `GCal API 대기 작업 ${stats.pending_gcal_tasks}건` })
    }

    return alerts
}

export default function HomePage() {
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [schedule, setSchedule] = useState<SchoolScheduleEntry[]>([])
    const [gcalStats, setGcalStats] = useState<GcalQueueStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [gcalLoading, setGcalLoading] = useState(false)
    const [actionPending, setActionPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchGcalStatus = async () => {
        setGcalLoading(true)
        try {
            const res = await apiGet<GcalQueueStats>('/admin/gcal/status')
            if (res.success && res.data) {
                setGcalStats(res.data)
            }
        } catch (err) {
            console.error('Error fetching GCal status:', err)
        } finally {
            setGcalLoading(false)
        }
    }

    const handleReconcile = async () => {
        if (!confirm('구글 캘린더 동기화 정합성을 체크하고 복구 작업을 큐에 등록하시겠습니까?')) return
        setActionPending(true)
        try {
            const res = await apiPost('/admin/gcal/trigger-reconcile')
            if (res.success) {
                alert('동기화 정합성 체크 요청이 수락되었습니다.')
                fetchGcalStatus()
            } else {
                alert(res.error?.message || '요청 처리에 실패했습니다.')
            }
        } catch {
            alert('요청 중 서버 에러가 발생했습니다.')
        } finally {
            setActionPending(false)
        }
    }

    const handleBackfill = async () => {
        if (!confirm('모든 연동 사용자의 과거 시간표 데이터 강제 백필(재동기화)을 진행하시겠습니까?\n서버에 부하가 발생할 수 있습니다.')) return
        setActionPending(true)
        try {
            const res = await apiPost('/admin/gcal/force-backfill')
            if (res.success) {
                alert('강제 재동기화(백필) 작업이 수락되었습니다.')
                fetchGcalStatus()
            } else {
                alert(res.error?.message || '요청 처리에 실패했습니다.')
            }
        } catch {
            alert('요청 중 서버 에러가 발생했습니다.')
        } finally {
            setActionPending(false)
        }
    }

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            setError(null)

            const today = new Date().toISOString().split('T')[0]

            const [statsRes, scheduleRes] = await Promise.all([
                apiGet<AdminStats>('/admin/stats'),
                apiGet<SchoolScheduleEntry[]>(`/admin/schedule?from=${today}&to=${today}`),
            ])

            if (!statsRes.success || !statsRes.data) {
                setError(statsRes.error?.message ?? '통계 데이터를 불러올 수 없습니다.')
                setLoading(false)
                return
            }

            setStats(statsRes.data)

            if (scheduleRes.success && scheduleRes.data) {
                setSchedule(scheduleRes.data)
            }

            setLoading(false)
        }

        fetchData()
        fetchGcalStatus()
    }, [])

    if (error) {
        return (
            <VStack
                gap={SPACING.s16}
                style={{
                    padding: SPACING.s32,
                    minHeight: '100vh',
                    backgroundColor: COLORS.background.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Typo.MD color="error">데이터를 불러오는 중 오류가 발생했습니다.</Typo.MD>
                <Typo.SM color="secondary">{error}</Typo.SM>
            </VStack>
        )
    }

    if (loading || !stats) {
        return (
            <VStack
                gap={SPACING.s32}
                style={{
                    padding: SPACING.s32,
                    minHeight: '100vh',
                    backgroundColor: COLORS.background.primary,
                }}
            >
                <VStack gap={SPACING.s8}>
                    <Typo.XL color="primary" fontWeight="bold">대시보드 홈</Typo.XL>
                    <Typo.SM color="secondary">시스템 현황 및 오늘의 주요 일정을 확인하세요.</Typo.SM>
                </VStack>
                <HStack gap={SPACING.s16} fullWidth>
                    <StatCard label="오늘 접속자 (DAU)" value="—" />
                    <StatCard label="신규 가입자" value="—" />
                    <StatCard label="Google API 동기화 성공률" value="—" />
                </HStack>
                <Typo.SM color="secondary">로딩 중...</Typo.SM>
            </VStack>
        )
    }

    const alerts = getAlerts(stats)

    return (
        <VStack
            gap={SPACING.s32}
            style={{
                padding: SPACING.s32,
                minHeight: '100vh',
                backgroundColor: COLORS.background.primary,
            }}
        >
            <VStack gap={SPACING.s8}>
                <Typo.XL color="primary" fontWeight="bold">대시보드 홈</Typo.XL>
                <Typo.SM color="secondary">시스템 현황 및 오늘의 주요 일정을 확인하세요.</Typo.SM>
            </VStack>

            <HStack gap={SPACING.s16} fullWidth>
                <StatCard
                    label="오늘 접속자 (DAU)"
                    value={stats.activity_heatmap.total_activities_24h.toLocaleString()}
                    sub="최근 24시간"
                />
                <StatCard
                    label="신규 가입자"
                    value={String(stats.today_new_users)}
                    sub="오늘 기준"
                />
                <StatCard
                    label="Google API 동기화 성공률"
                    value={`${stats.gcal_sync_success_rate}%`}
                    sub="최근 24시간"
                    color="correct"
                />
            </HStack>

            <HStack gap={SPACING.s16} fullWidth align="start">
                <VStack gap={SPACING.s16} style={{ flex: 2 }}>
                    <SectionCard title="오늘의 학사 일정">
                        <VStack gap={SPACING.s12}>
                            {schedule.length === 0 ? (
                                <Typo.SM color="secondary">오늘 학사 일정이 없습니다.</Typo.SM>
                            ) : (
                                schedule.map((entry) => (
                                    <HStack key={getId(entry._id)} align="center" gap={SPACING.s12} style={{ padding: `${SPACING.s10}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, borderRadius: 8 }}>
                                        <Typo.XS color="secondary" style={{ minWidth: 80 }}>{entry.date}</Typo.XS>
                                        <div style={{ width: 3, height: 32, borderRadius: 2, backgroundColor: entry.is_holiday ? COLORS.calendar.tomato : COLORS.calendar.conflower, flexShrink: 0 }} />
                                        <VStack gap={SPACING.s4} style={{ flex: 1 }}>
                                            <Typo.SM color="primary">{entry.event_name}</Typo.SM>
                                            {entry.is_holiday && <Typo.XXS style={{ color: COLORS.calendar.tomato }}>휴일</Typo.XXS>}
                                        </VStack>
                                    </HStack>
                                ))
                            )}
                        </VStack>
                    </SectionCard>
                </VStack>

                <VStack gap={SPACING.s16} style={{ flex: 1 }}>
                    <SectionCard title="서버 및 API 상태">
                        <VStack gap={SPACING.s10}>
                            {alerts.map((alert, i) => (
                                <HStack key={i} align="center" gap={SPACING.s10} style={{ padding: `${SPACING.s8}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, borderRadius: 8 }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                        backgroundColor: alert.type === 'ok' ? COLORS.text.correct : COLORS.calendar.banana,
                                    }} />
                                    <Typo.XS color="secondary">{alert.message}</Typo.XS>
                                </HStack>
                            ))}
                        </VStack>
                    </SectionCard>

                    {/* Google 캘린더 연동 현황 영역 */}
                    <SectionCard title="Google 캘린더 연동 현황">
                        <VStack gap={SPACING.s16} fullWidth>
                            {gcalStats ? (
                                <>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: SPACING.s8,
                                        width: '100%'
                                    }}>
                                        <VStack gap={SPACING.s4} style={{ padding: SPACING.s10, backgroundColor: COLORS.background.third, borderRadius: 8 }}>
                                            <Typo.XXS color="secondary">대기 중</Typo.XXS>
                                            <Typo.SM color="primary" fontWeight="bold">
                                                {gcalStats.push_queue.pending.toLocaleString()}
                                            </Typo.SM>
                                        </VStack>
                                        <VStack gap={SPACING.s4} style={{ padding: SPACING.s10, backgroundColor: COLORS.background.third, borderRadius: 8 }}>
                                            <Typo.XXS color="secondary">처리 중</Typo.XXS>
                                            <Typo.SM color="primary" fontWeight="bold">
                                                {gcalStats.push_queue.processing.toLocaleString()}
                                            </Typo.SM>
                                        </VStack>
                                        <VStack gap={SPACING.s4} style={{ padding: SPACING.s10, backgroundColor: COLORS.background.third, borderRadius: 8 }}>
                                            <Typo.XXS color="secondary">완료</Typo.XXS>
                                            <Typo.SM style={{ color: COLORS.text.correct }} fontWeight="bold">
                                                {gcalStats.push_queue.done.toLocaleString()}
                                            </Typo.SM>
                                        </VStack>
                                        <VStack gap={SPACING.s4} style={{ padding: SPACING.s10, backgroundColor: COLORS.background.third, borderRadius: 8 }}>
                                            <Typo.XXS color="secondary">실패 (영구 실패)</Typo.XXS>
                                            <HStack gap={SPACING.s4} align="end">
                                                <Typo.SM style={{ color: gcalStats.push_queue.failed > 0 ? COLORS.text.wrong : COLORS.text.secondary }} fontWeight="bold">
                                                    {gcalStats.push_queue.failed.toLocaleString()}
                                                </Typo.SM>
                                                <Typo.XXS style={{ color: gcalStats.push_queue.failed_permanent > 0 ? COLORS.text.wrong : COLORS.text.secondary }}>
                                                    ({gcalStats.push_queue.failed_permanent.toLocaleString()})
                                                </Typo.XXS>
                                            </HStack>
                                        </VStack>
                                    </div>

                                    <HStack justify="between" align="center" style={{ borderTop: `1px solid ${COLORS.border.primary}`, paddingTop: SPACING.s12 }} fullWidth>
                                        <Typo.XXS color="secondary">전체 작업: {gcalStats.push_queue.total.toLocaleString()}건</Typo.XXS>
                                        <button
                                            onClick={fetchGcalStatus}
                                            disabled={gcalLoading}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: 0,
                                            }}
                                        >
                                            <Typo.XXS color="secondary" style={{ textDecoration: 'underline' }}>
                                                {gcalLoading ? '갱신 중...' : '새로고침'}
                                            </Typo.XXS>
                                        </button>
                                    </HStack>
                                </>
                            ) : (
                                <VStack gap={SPACING.s8} align="center" style={{ padding: SPACING.s12 }} fullWidth>
                                    <Typo.XS color="secondary">연동 상태 데이터를 불러오는 중이거나 권한이 없습니다.</Typo.XS>
                                    <button
                                        onClick={fetchGcalStatus}
                                        disabled={gcalLoading}
                                        style={{
                                            padding: `${SPACING.s4}px ${SPACING.s8}px`,
                                            backgroundColor: COLORS.background.third,
                                            border: `1px solid ${COLORS.border.primary}`,
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Typo.XXS color="primary">{gcalLoading ? '로딩 중...' : '다시 시도'}</Typo.XXS>
                                    </button>
                                </VStack>
                            )}

                            <VStack gap={SPACING.s8} fullWidth style={{ borderTop: `1px solid ${COLORS.border.primary}`, paddingTop: SPACING.s12 }}>
                                <Typo.XXS color="secondary" fontWeight="medium">동기화 복구 관리자 조작</Typo.XXS>
                                <HStack gap={SPACING.s8} fullWidth>
                                    <button
                                        onClick={handleReconcile}
                                        disabled={actionPending}
                                        style={{
                                            flex: 1,
                                            padding: `${SPACING.s8}px ${SPACING.s4}px`,
                                            backgroundColor: actionPending ? COLORS.background.third : COLORS.brand.primary,
                                            border: 'none',
                                            borderRadius: 6,
                                            cursor: actionPending ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        <Typo.XXS color="inverted" fontWeight="medium">정합성 체크</Typo.XXS>
                                    </button>
                                    <button
                                        onClick={handleBackfill}
                                        disabled={actionPending}
                                        style={{
                                            flex: 1,
                                            padding: `${SPACING.s8}px ${SPACING.s4}px`,
                                            backgroundColor: 'transparent',
                                            border: `1px solid ${actionPending ? COLORS.border.primary : COLORS.brand.primary}`,
                                            borderRadius: 6,
                                            cursor: actionPending ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        <Typo.XXS style={{ color: actionPending ? COLORS.text.secondary : COLORS.text.primary }} fontWeight="medium">강제 재동기화</Typo.XXS>
                                    </button>
                                </HStack>
                            </VStack>
                        </VStack>
                    </SectionCard>
                </VStack>
            </HStack>
        </VStack>
    )
}
