'use client'

import { useState, useEffect, useCallback } from 'react'
import { VStack } from '@/components/general/VStack'
import { HStack } from '@/components/general/HStack'
import Typo from '@/components/general/Typo'
import { COLORS } from '@/constants/colors'
import { SPACING } from '@/constants/spacing'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import type { Notification, NotificationTarget, NotificationStatus } from '@/types/api'
import { DEPARTMENT_LABELS } from '@/types/api'

const getId = (id: any): string => (typeof id === 'object' && id !== null ? id.$oid || id.id || id._id || String(id) : String(id));

const TARGET_OPTIONS: { value: NotificationTarget; label: string; grade?: number }[] = [
    { value: 'All', label: '전교생' },
    { value: 'Grade', label: '1학년', grade: 1 },
    { value: 'Grade', label: '2학년', grade: 2 },
    { value: 'Grade', label: '3학년', grade: 3 },
    { value: 'Class', label: '특정 반' },
]

const STATUS_LABELS: Record<NotificationStatus, string> = {
    sent: '발송 완료',
    scheduled: '예약됨',
    draft: '임시저장',
    failed: '실패',
}

const STATUS_COLORS: Record<NotificationStatus, string> = {
    sent: COLORS.text.correct,
    scheduled: COLORS.calendar.banana,
    draft: COLORS.text.secondary,
    failed: COLORS.text.wrong,
}

function getTargetLabel(notif: Notification): string {
    switch (notif.target) {
        case 'All':
            return '전교생'
        case 'Grade':
            return `${notif.target_grade}학년`
        case 'Class':
            return `${notif.target_grade}-${notif.target_class}반`
        case 'Department':
            return notif.target_department ? DEPARTMENT_LABELS[notif.target_department] : '학과'
        default:
            return ''
    }
}

type ReminderSetting = {
    key: string
    label: string
    description: string
    enabled: boolean
    time?: string
}

const INITIAL_REMINDERS: ReminderSetting[] = [
    { key: 'meal', label: '급식 알림', description: '매일 아침 급식 메뉴 자동 발송', enabled: true, time: '07:30' },
    { key: 'exam_dday', label: '수행평가 D-Day 알림', description: '수행평가 3일 전 자동 리마인더', enabled: true, time: '08:00' },
    { key: 'schedule', label: '학사 일정 알림', description: '주요 학사 일정 하루 전 알림', enabled: false, time: '09:00' },
    { key: 'timetable_change', label: '시간표 변경 알림', description: '수업 교체 발생 시 즉시 알림', enabled: true },
]

export default function NotificationsPage() {
    const [showSendModal, setShowSendModal] = useState(false)
    const [reminders, setReminders] = useState(INITIAL_REMINDERS)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [modalTarget, setModalTarget] = useState<number>(0)
    const [modalTitle, setModalTitle] = useState('')
    const [modalBody, setModalBody] = useState('')
    const [modalGrade, setModalGrade] = useState(1)
    const [modalClass, setModalClass] = useState(1)
    const [modalSending, setModalSending] = useState(false)

    const fetchNotifications = useCallback(async () => {
        setLoading(true)
        setError(null)
        const res = await apiGet<Notification[]>('/admin/notifications?page=1&limit=20')
        if (res.success && res.data) {
            setNotifications(res.data)
        } else {
            setError(res.error?.message || '알림 목록을 불러올 수 없습니다.')
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        let active = true
        apiGet<Notification[]>('/admin/notifications?page=1&limit=20').then(res => {
            if (!active) return
            if (res.success && res.data) {
                setNotifications(res.data)
            } else {
                setError(res.error?.message || '알림 목록을 불러올 수 없습니다.')
            }
            setLoading(false)
        })
        return () => {
            active = false
        }
    }, [])

    const handleDelete = async (id: string) => {
        const res = await apiDelete(`/admin/notifications/${id}`)
        if (res.success) {
            setNotifications(prev => prev.filter(n => n._id !== id))
        }
    }

    const buildRequestBody = () => {
        const option = TARGET_OPTIONS[modalTarget]
        const body: Record<string, unknown> = {
            title: modalTitle,
            body: modalBody,
            target: option.value,
        }
        if (option.value === 'Grade') {
            body.target_grade = option.grade
        } else if (option.value === 'Class') {
            body.target_grade = modalGrade
            body.target_class = modalClass
        }
        return body
    }

    const handleSaveDraft = async () => {
        setModalSending(true)
        const res = await apiPost<Notification>('/admin/notifications', buildRequestBody())
        setModalSending(false)
        if (res.success) {
            setShowSendModal(false)
            resetModal()
            fetchNotifications()
        }
    }

    const handleSendNow = async () => {
        setModalSending(true)
        const createRes = await apiPost<Notification>('/admin/notifications', buildRequestBody())
        if (createRes.success && createRes.data) {
            const sendRes = await apiPost<{ sent: number; failed: number }>(`/admin/notifications/${getId(createRes.data._id)}/send`)
            setModalSending(false)
            if (sendRes.success && sendRes.data) {
                alert(`발송 완료: 성공 ${sendRes.data.sent}건, 실패 ${sendRes.data.failed}건`)
            }
            setShowSendModal(false)
            resetModal()
            fetchNotifications()
        } else {
            setModalSending(false)
        }
    }

    const resetModal = () => {
        setModalTarget(0)
        setModalTitle('')
        setModalBody('')
        setModalGrade(1)
        setModalClass(1)
    }

    const toggleReminder = (key: string) => {
        setReminders(prev => prev.map(r => r.key === key ? { ...r, enabled: !r.enabled } : r))
    }

    return (
        <VStack gap={SPACING.s32} style={{ padding: SPACING.s32, minHeight: '100vh', backgroundColor: COLORS.background.primary }}>
            <HStack justify="between" align="center" fullWidth>
                <VStack gap={SPACING.s8}>
                    <Typo.XL color="primary" fontWeight="bold">푸시 및 알림 관리</Typo.XL>
                    <Typo.SM color="secondary">공지사항 발송 및 자동 리마인더를 설정합니다.</Typo.SM>
                </VStack>
                <button
                    onClick={() => setShowSendModal(true)}
                    style={{ padding: `${SPACING.s8}px ${SPACING.s16}px`, backgroundColor: COLORS.brand.primary, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                >
                    <Typo.SM color="inverted" fontWeight="medium">+ 공지 발송</Typo.SM>
                </button>
            </HStack>

            <HStack gap={SPACING.s20} fullWidth align="start">
                <VStack gap={SPACING.s16} style={{ flex: 2 }}>
                    <Typo.MD color="primary" fontWeight="semi-bold">발송 내역</Typo.MD>
                    <VStack gap={SPACING.s8} fullWidth>
                        <HStack align="center" gap={SPACING.s16} fullWidth style={{ padding: `${SPACING.s8}px ${SPACING.s16}px` }}>
                            <Typo.XS color="secondary" style={{ flex: 3 }}>제목</Typo.XS>
                            <Typo.XS color="secondary" style={{ flex: 1 }}>대상</Typo.XS>
                            <Typo.XS color="secondary" style={{ flex: 1 }}>상태</Typo.XS>
                            <Typo.XS color="secondary" style={{ flex: 2 }}>발송 시각</Typo.XS>
                            <Typo.XS color="secondary" style={{ width: 60 }}>관리</Typo.XS>
                        </HStack>

                        {loading && (
                            <VStack align="center" style={{ padding: SPACING.s32 }}>
                                <Typo.SM color="secondary">불러오는 중...</Typo.SM>
                            </VStack>
                        )}

                        {error && (
                            <VStack align="center" style={{ padding: SPACING.s32 }}>
                                <Typo.SM color="wrong">{error}</Typo.SM>
                            </VStack>
                        )}

                        {!loading && !error && notifications.length === 0 && (
                            <VStack align="center" style={{ padding: SPACING.s32 }}>
                                <Typo.SM color="secondary">발송 내역이 없습니다.</Typo.SM>
                            </VStack>
                        )}

                        {!loading && !error && notifications.map(notif => (
                            <VStack
                                key={getId(notif._id)}
                                gap={SPACING.s6}
                                style={{
                                    padding: `${SPACING.s12}px ${SPACING.s16}px`,
                                    backgroundColor: COLORS.background.secondary,
                                    borderRadius: 10,
                                    border: `1px solid ${COLORS.border.primary}`,
                                }}
                            >
                                <HStack align="center" gap={SPACING.s16} fullWidth>
                                    <VStack gap={SPACING.s4} style={{ flex: 3 }}>
                                        <Typo.SM color="primary" fontWeight="medium">{notif.title}</Typo.SM>
                                        <Typo.XXS color="secondary">{notif.body}</Typo.XXS>
                                    </VStack>
                                    <Typo.XS color="secondary" style={{ flex: 1 }}>{getTargetLabel(notif)}</Typo.XS>
                                    <HStack align="center" gap={SPACING.s6} style={{ flex: 1 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: STATUS_COLORS[notif.status] }} />
                                        <Typo.XS color="secondary">{STATUS_LABELS[notif.status]}</Typo.XS>
                                    </HStack>
                                    <Typo.XS color="secondary" style={{ flex: 2 }}>{notif.sent_at || notif.scheduled_at || '-'}</Typo.XS>
                                    <HStack gap={SPACING.s8} style={{ width: 60 }}>
                                        <button
                                            onClick={() => handleDelete(getId(notif._id))}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                        >
                                            <Typo.XS color="wrong">삭제</Typo.XS>
                                        </button>
                                    </HStack>
                                </HStack>
                            </VStack>
                        ))}
                    </VStack>
                </VStack>

                <VStack gap={SPACING.s16} style={{ flex: 1 }}>
                    <Typo.MD color="primary" fontWeight="semi-bold">자동 리마인더 설정</Typo.MD>
                    <VStack gap={SPACING.s10} fullWidth>
                        {reminders.map(reminder => (
                            <HStack
                                key={reminder.key}
                                justify="between"
                                align="center"
                                fullWidth
                                style={{
                                    padding: `${SPACING.s14}px ${SPACING.s16}px`,
                                    backgroundColor: COLORS.background.secondary,
                                    borderRadius: 10,
                                    border: `1px solid ${COLORS.border.primary}`,
                                }}
                            >
                                <VStack gap={SPACING.s4} style={{ flex: 1 }}>
                                    <Typo.SM color="primary" fontWeight="medium">{reminder.label}</Typo.SM>
                                    <Typo.XXS color="secondary">{reminder.description}</Typo.XXS>
                                    {reminder.time && (
                                        <Typo.XXS color="secondary">발송 시각: {reminder.time}</Typo.XXS>
                                    )}
                                </VStack>
                                <button
                                    onClick={() => toggleReminder(reminder.key)}
                                    style={{
                                        width: 44,
                                        height: 24,
                                        borderRadius: 12,
                                        backgroundColor: reminder.enabled ? COLORS.brand.primary : COLORS.background.fourth,
                                        border: 'none',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        flexShrink: 0,
                                    }}
                                >
                                    <div style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        backgroundColor: COLORS.text.primary,
                                        position: 'absolute',
                                        top: 3,
                                        left: reminder.enabled ? 23 : 3,
                                        transition: 'left 0.15s',
                                    }} />
                                </button>
                            </HStack>
                        ))}
                    </VStack>
                    <Typo.XXS color="secondary" style={{ marginTop: SPACING.s8 }}>자동 리마인더 설정은 준비 중입니다</Typo.XXS>
                </VStack>
            </HStack>

            {showSendModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <VStack gap={SPACING.s20} style={{ width: 500, padding: SPACING.s32, backgroundColor: COLORS.background.secondary, borderRadius: 16, border: `1px solid ${COLORS.border.primary}` }}>
                        <HStack justify="between" align="center" fullWidth>
                            <Typo.LG color="primary" fontWeight="bold">공지 발송</Typo.LG>
                            <button onClick={() => setShowSendModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Typo.LG color="secondary">✕</Typo.LG>
                            </button>
                        </HStack>

                        <VStack gap={SPACING.s6} fullWidth>
                            <Typo.XS color="secondary">발송 대상</Typo.XS>
                            <HStack gap={SPACING.s6} wrap="wrap">
                                {TARGET_OPTIONS.map((t, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setModalTarget(idx)}
                                        style={{
                                            padding: `${SPACING.s6}px ${SPACING.s12}px`,
                                            backgroundColor: modalTarget === idx ? COLORS.brand.primary : COLORS.background.third,
                                            border: `1px solid ${modalTarget === idx ? COLORS.brand.primary : COLORS.border.primary}`,
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Typo.XS color={modalTarget === idx ? 'inverted' : 'secondary'}>{t.label}</Typo.XS>
                                    </button>
                                ))}
                            </HStack>
                        </VStack>

                        {TARGET_OPTIONS[modalTarget].value === 'Class' && (
                            <HStack gap={SPACING.s10} fullWidth>
                                <VStack gap={SPACING.s4} style={{ flex: 1 }}>
                                    <Typo.XS color="secondary">학년</Typo.XS>
                                    <select
                                        value={modalGrade}
                                        onChange={e => setModalGrade(Number(e.target.value))}
                                        style={{ padding: `${SPACING.s8}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 8, color: COLORS.text.primary, fontSize: 14 }}
                                    >
                                        <option value={1}>1학년</option>
                                        <option value={2}>2학년</option>
                                        <option value={3}>3학년</option>
                                    </select>
                                </VStack>
                                <VStack gap={SPACING.s4} style={{ flex: 1 }}>
                                    <Typo.XS color="secondary">반</Typo.XS>
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={modalClass}
                                        onChange={e => setModalClass(Number(e.target.value))}
                                        style={{ padding: `${SPACING.s8}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 8, color: COLORS.text.primary, fontSize: 14 }}
                                    />
                                </VStack>
                            </HStack>
                        )}

                        <VStack gap={SPACING.s6} fullWidth>
                            <Typo.XS color="secondary">제목</Typo.XS>
                            <input
                                value={modalTitle}
                                onChange={e => setModalTitle(e.target.value)}
                                placeholder="알림 제목을 입력하세요"
                                style={{ width: '100%', padding: `${SPACING.s10}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 8, color: COLORS.text.primary, fontSize: 14, outline: 'none' }}
                            />
                        </VStack>

                        <VStack gap={SPACING.s6} fullWidth>
                            <Typo.XS color="secondary">내용</Typo.XS>
                            <textarea
                                value={modalBody}
                                onChange={e => setModalBody(e.target.value)}
                                placeholder="알림 내용을 입력하세요"
                                rows={4}
                                style={{ width: '100%', padding: `${SPACING.s10}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 8, color: COLORS.text.primary, fontSize: 14, outline: 'none', resize: 'vertical' }}
                            />
                        </VStack>

                        <HStack gap={SPACING.s10} justify="end" fullWidth>
                            <button
                                onClick={handleSaveDraft}
                                disabled={modalSending}
                                style={{ padding: `${SPACING.s8}px ${SPACING.s16}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 8, cursor: 'pointer', opacity: modalSending ? 0.5 : 1 }}
                            >
                                <Typo.SM color="secondary">임시저장</Typo.SM>
                            </button>
                            <button
                                onClick={handleSendNow}
                                disabled={modalSending}
                                style={{ padding: `${SPACING.s8}px ${SPACING.s20}px`, backgroundColor: COLORS.brand.primary, border: 'none', borderRadius: 8, cursor: 'pointer', opacity: modalSending ? 0.5 : 1 }}
                            >
                                <Typo.SM color="inverted" fontWeight="medium">{modalSending ? '발송 중...' : '즉시 발송'}</Typo.SM>
                            </button>
                        </HStack>
                    </VStack>
                </div>
            )}
        </VStack>
    )
}
