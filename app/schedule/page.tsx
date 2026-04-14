'use client'

import { useState, useEffect, useCallback } from 'react'
import { VStack } from '@/components/general/VStack'
import { HStack } from '@/components/general/HStack'
import Typo from '@/components/general/Typo'
import { COLORS } from '@/constants/colors'
import { SPACING } from '@/constants/spacing'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import type { Event, EventType, EventScope, Department } from '@/types/api'

type TabFilter = 'all' | 'academic' | 'class' | 'special'
type CategoryColor = keyof typeof COLORS.calendar

const CATEGORIES: { key: EventType; label: string; color: CategoryColor }[] = [
    { key: 'written_exam', label: '지필고사', color: 'tomato' },
    { key: 'performance_eval', label: '수행평가', color: 'conflower' },
    { key: 'school_event', label: '축제/행사', color: 'saige' },
    { key: 'contest', label: '대회', color: 'banana' },
    { key: 'field_trip', label: '외부활동', color: 'grape' },
    { key: 'vacation', label: '방학/개학', color: 'coal' },
]

const EVENT_TYPE_COLOR: Record<EventType, CategoryColor> = {
    written_exam: 'tomato',
    performance_eval: 'conflower',
    academic_eval: 'tomato',
    school_event: 'saige',
    contest: 'banana',
    field_trip: 'grape',
    vacation: 'coal',
    assignment: 'conflower',
    counseling: 'saige',
    notice: 'coal',
    other: 'coal',
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
    written_exam: '지필고사',
    performance_eval: '수행평가',
    academic_eval: '학업평가',
    school_event: '축제/행사',
    contest: '대회',
    field_trip: '외부활동',
    vacation: '방학/개학',
    assignment: '과제',
    counseling: '상담',
    notice: '공지',
    other: '기타',
}

const TAB_FILTERS: { key: TabFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'academic', label: '학사 일정' },
    { key: 'class', label: '학과/학년/반' },
    { key: 'special', label: '특수 일정' },
]

function filterEvents(events: Event[], tab: TabFilter): Event[] {
    if (tab === 'all') return events
    if (tab === 'academic') return events.filter(e => e.scope.type === 'school')
    if (tab === 'class') return events.filter(e => e.scope.type === 'department' || e.scope.type === 'class')
    if (tab === 'special') return events.filter(e => e.event_type === 'vacation' || e.event_type === 'other')
    return events
}

function getScopeLabel(scope: EventScope): string {
    if (scope.type === 'school') return '전교생'
    if (scope.type === 'department') return scope.department
    if (scope.type === 'class') return `${scope.department} ${scope.grade}학년 ${scope.class}반`
    return '개인'
}

function getTypeLabel(scope: EventScope): string {
    if (scope.type === 'school') return '학사 일정'
    if (scope.type === 'department' || scope.type === 'class') return '학과/학년/반'
    return '특수 일정'
}

function formatDateOnly(dateVal: unknown): string {
    if (!dateVal) return ''
    
    if (typeof dateVal === 'object' && dateVal !== null) {
        if ('$date' in dateVal) {
            const dateInner = (dateVal as { $date: unknown }).$date
            if (typeof dateInner === 'object' && dateInner !== null && '$numberLong' in dateInner) {
                const ms = parseInt((dateInner as { $numberLong: string }).$numberLong, 10)
                if (!isNaN(ms)) {
                    return new Date(ms).toISOString().split('T')[0]
                }
            } else if (typeof dateInner === 'string' || typeof dateInner === 'number') {
                const parsedDate = new Date(dateInner)
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toISOString().split('T')[0]
                }
            }
        }
    }

    if (typeof dateVal === 'string') {
        if (dateVal.includes('T')) {
            return dateVal.split('T')[0]
        }
        return dateVal
    }
    if (dateVal instanceof Date) return dateVal.toISOString().split('T')[0]
    try {
        const parsedDate = new Date(dateVal as string | number | Date)
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString().split('T')[0]
        }
    } catch {
        return ''
    }
    return ''
}

function getIdString(id: unknown): string {
    if (!id) return ''
    if (typeof id === 'string') return id
    if (typeof id === 'object' && id !== null) {
        const idObj = id as Record<string, unknown>
        if (typeof idObj.$oid === 'string') return idObj.$oid
        if (id.toString && typeof id.toString === 'function' && id.toString() !== '[object Object]') {
            return id.toString()
        }
        try {
            const idVal = (idObj.id || idObj._id) as string | undefined
            return idVal || JSON.stringify(id)
        } catch {
            return ''
        }
    }
    return String(id)
}


function getMonday(d: Date): Date {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    date.setDate(diff)
    date.setHours(0, 0, 0, 0)
    return date
}

export default function SchedulePage() {
    const [activeTab, setActiveTab] = useState<TabFilter>('all')
    const [showModal, setShowModal] = useState(false)
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editingEvent, setEditingEvent] = useState<Event | null>(null)

    const [selectedDept, setSelectedDept] = useState<Department | 'all'>('all')
    const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all')
    const [selectedClass, setSelectedClass] = useState<number | 'all'>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 15
    const [weekOffset, setWeekOffset] = useState(0)

    const getSelectedWeekRange = useCallback(() => {
        const today = new Date()
        today.setDate(today.getDate() + weekOffset * 7)
        const monday = getMonday(today)
        const friday = new Date(monday)
        friday.setDate(monday.getDate() + 4)
        
        monday.setHours(0, 0, 0, 0)
        friday.setHours(23, 59, 59, 999)
        return { monday, friday }
    }, [weekOffset])

    useEffect(() => {
        setCurrentPage(1)
    }, [activeTab, selectedDept, selectedGrade, selectedClass, weekOffset])

    const [formTitle, setFormTitle] = useState('')
    const [formStartAt, setFormStartAt] = useState('')
    const [formEndAt, setFormEndAt] = useState('')
    const [formScopeType, setFormScopeType] = useState<'school' | 'department' | 'class'>('school')
    const [formDepartment, setFormDepartment] = useState<Department>('software_sw')
    const [formGrade, setFormGrade] = useState<number>(1)
    const [formClass, setFormClass] = useState<number>(1)
    const [formEventType, setFormEventType] = useState<EventType>('school_event')
    const [formSaving, setFormSaving] = useState(false)

    const fetchEvents = useCallback(async () => {
        setLoading(true)
        setError(null)
        const { monday, friday } = getSelectedWeekRange()
        const res = await apiGet<Event[]>(`/admin/events?start=${monday.toISOString()}&end=${friday.toISOString()}`)
        if (res.success && res.data) {
            setEvents(res.data)
        } else {
            setError(res.error?.message || '일정을 불러오는데 실패했습니다.')
        }
        setLoading(false)
    }, [getSelectedWeekRange])

    useEffect(() => {
        let active = true
        setLoading(true)
        setError(null)
        const { monday, friday } = getSelectedWeekRange()
        apiGet<Event[]>(`/admin/events?start=${monday.toISOString()}&end=${friday.toISOString()}`).then(res => {
            if (!active) return
            if (res.success && res.data) {
                setEvents(res.data)
            } else {
                setError(res.error?.message || '일정을 불러오는데 실패했습니다.')
            }
            setLoading(false)
        })
        return () => {
            active = false
        }
    }, [getSelectedWeekRange])

    const handleSave = async () => {
        console.log('[DEBUG] handleSave state:', {
            formTitle,
            formStartAt,
            formEndAt,
            formScopeType,
            formDepartment,
            formGrade,
            formClass,
        })

        if (!formTitle) {
            alert('일정명을 입력해 주세요.')
            return
        }
        if (!formStartAt || !formEndAt) {
            alert('시작일과 종료일을 입력해 주세요.')
            return
        }
        setFormSaving(true)

        let scope: EventScope
        if (formScopeType === 'school') {
            scope = { type: 'school' }
        } else if (formScopeType === 'department') {
            scope = { type: 'department', department: formDepartment }
        } else {
            scope = { type: 'class', department: formDepartment, grade: formGrade, class: formClass }
        }

        const body = {
            title: formTitle,
            description: null,
            start_at: new Date(formStartAt).toISOString(),
            end_at: new Date(formEndAt).toISOString(),
            all_day: true,
            scope,
            event_type: formEventType,
            timetable_period: null,
        }

        let res
        if (editingEvent) {
            res = await apiPut(`/admin/events/${getIdString(editingEvent._id)}`, body)
        } else {
            res = await apiPost('/admin/events', body)
        }

        setFormSaving(false)
        if (res.success) {
            setShowModal(false)
            resetForm()
            fetchEvents()
        } else {
            console.error('[DEBUG] Save failed. Response:', res)
            alert(res.error?.message || `저장에 실패했습니다. (${res.error?.code || 'UNKNOWN'})`)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return
        const res = await apiDelete(`/admin/events/${id}`)
        if (res.success) {
            fetchEvents()
        } else {
            alert(res.error?.message || '삭제에 실패했습니다.')
        }
    }

    const handleEdit = (event: Event) => {
        setEditingEvent(event)
        setFormTitle(event.title)
        setFormStartAt(formatDateOnly(event.start_at))
        setFormEndAt(formatDateOnly(event.end_at))
        if (event.scope.type === 'class') {
            setFormScopeType('class')
            setFormDepartment(event.scope.department)
            setFormGrade(event.scope.grade)
            setFormClass(event.scope.class)
        } else if (event.scope.type === 'department') {
            setFormScopeType('department')
            setFormDepartment(event.scope.department)
        } else {
            setFormScopeType('school')
        }
        setFormEventType(event.event_type)
        setShowModal(true)
    }

    const handleNeisSync = async () => {
        const res = await apiPost('/admin/sync/neis')
        if (res.success) {
            alert('동기화 요청됨')
            fetchEvents()
        } else {
            alert(res.error?.message || 'NEIS 연동에 실패했습니다.')
        }
    }

    const resetForm = () => {
        setFormTitle('')
        setFormStartAt('')
        setFormEndAt('')
        setFormScopeType('school')
        setFormDepartment('software_sw')
        setFormGrade(1)
        setFormClass(1)
        setFormEventType('school_event')
        setEditingEvent(null)
    }

    const openAddModal = () => {
        resetForm()
        setShowModal(true)
    }

    const filtered = events.filter(event => {
        // 1. 탭 필터링
        if (activeTab === 'academic' && event.scope.type !== 'school') return false
        if (activeTab === 'class' && event.scope.type !== 'department' && event.scope.type !== 'class') return false
        if (activeTab === 'special' && event.event_type !== 'vacation' && event.event_type !== 'other') return false

        // 2. 학과/학년/반 상세 필터링
        if (event.scope.type === 'department') {
            if (selectedDept !== 'all' && event.scope.department !== selectedDept) return false
        } else if (event.scope.type === 'class') {
            if (selectedDept !== 'all' && event.scope.department !== selectedDept) return false
            if (selectedGrade !== 'all' && event.scope.grade !== selectedGrade) return false
            if (selectedClass !== 'all' && event.scope.class !== selectedClass) return false
        } else if (event.scope.type === 'school') {
            // 학급 탭이 켜져있을 때는 학급/학과 전용 일정만 보여주기 위해 전교 일정 제외
            if (activeTab === 'class') return false
        }
        return true
    })

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
    const paginatedEvents = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    return (
        <VStack gap={SPACING.s32} style={{ padding: SPACING.s32, minHeight: '100vh', backgroundColor: COLORS.background.primary }}>
            <HStack justify="between" align="center" fullWidth>
                <VStack gap={SPACING.s8}>
                    <Typo.XL color="primary" fontWeight="bold">일정 관리</Typo.XL>
                    <Typo.SM color="secondary">학사 일정, 학과/반별 일정, 특수 일정을 관리합니다.</Typo.SM>
                </VStack>
                <HStack gap={SPACING.s10}>
                    <button
                        onClick={openAddModal}
                        style={{
                            padding: `${SPACING.s8}px ${SPACING.s16}px`,
                            backgroundColor: COLORS.brand.primary,
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                        }}
                    >
                        <Typo.SM color="inverted" fontWeight="medium">+ 일정 추가</Typo.SM>
                    </button>
                    <button
                        style={{
                            padding: `${SPACING.s8}px ${SPACING.s16}px`,
                            backgroundColor: COLORS.background.third,
                            border: `1px solid ${COLORS.border.primary}`,
                            borderRadius: 8,
                            cursor: 'pointer',
                        }}
                    >
                        <Typo.SM color="secondary">엑셀 업로드</Typo.SM>
                    </button>
                    <button
                        onClick={handleNeisSync}
                        style={{
                            padding: `${SPACING.s8}px ${SPACING.s16}px`,
                            backgroundColor: COLORS.background.third,
                            border: `1px solid ${COLORS.border.primary}`,
                            borderRadius: 8,
                            cursor: 'pointer',
                        }}
                    >
                        <Typo.SM color="secondary">NEIS 연동</Typo.SM>
                    </button>
                </HStack>
            </HStack>

            <HStack justify="center" align="center" gap={SPACING.s16} fullWidth style={{ padding: SPACING.s12, backgroundColor: COLORS.background.secondary, borderRadius: 12, border: `1px solid ${COLORS.border.primary}` }}>
                <button
                    onClick={() => setWeekOffset(prev => prev - 1)}
                    style={{
                        padding: `${SPACING.s6}px ${SPACING.s12}px`,
                        backgroundColor: COLORS.background.third,
                        border: `1px solid ${COLORS.border.primary}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                    }}
                >
                    <Typo.XS color="secondary">◀ 이전 주</Typo.XS>
                </button>

                <HStack align="center" gap={SPACING.s10}>
                    <Typo.MD color="primary" fontWeight="bold">
                        {(() => {
                            const { monday, friday } = getSelectedWeekRange()
                            return `${monday.getFullYear()}.${String(monday.getMonth() + 1).padStart(2, '0')}.${String(monday.getDate()).padStart(2, '0')} ~ ${friday.getFullYear()}.${String(friday.getMonth() + 1).padStart(2, '0')}.${String(friday.getDate()).padStart(2, '0')}`
                        })()}
                    </Typo.MD>
                    {weekOffset !== 0 && (
                        <button
                            onClick={() => setWeekOffset(0)}
                            style={{
                                padding: '2px 8px',
                                backgroundColor: COLORS.brand.primary,
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                            }}
                        >
                            <Typo.XXS color="inverted" fontWeight="medium">오늘 주차로</Typo.XXS>
                        </button>
                    )}
                </HStack>

                <button
                    onClick={() => setWeekOffset(prev => prev + 1)}
                    style={{
                        padding: `${SPACING.s6}px ${SPACING.s12}px`,
                        backgroundColor: COLORS.background.third,
                        border: `1px solid ${COLORS.border.primary}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                    }}
                >
                    <Typo.XS color="secondary">다음 주 ▶</Typo.XS>
                </button>
            </HStack>

            <HStack gap={SPACING.s12} wrap="wrap">
                {CATEGORIES.map(cat => (
                    <HStack key={cat.key} align="center" gap={SPACING.s6} style={{ padding: `${SPACING.s4}px ${SPACING.s10}px`, backgroundColor: COLORS.background.secondary, borderRadius: 20, border: `1px solid ${COLORS.border.primary}` }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS.calendar[cat.color] }} />
                        <Typo.XXS color="secondary">{cat.label}</Typo.XXS>
                    </HStack>
                ))}
            </HStack>

            <HStack gap={SPACING.s16} align="center" fullWidth style={{ padding: SPACING.s16, backgroundColor: COLORS.background.secondary, borderRadius: 12, border: `1px solid ${COLORS.border.primary}` }}>
                <Typo.XS color="secondary">학과 필터</Typo.XS>
                <select
                    value={selectedDept}
                    onChange={e => setSelectedDept(e.target.value as Department | 'all')}
                    style={{
                        padding: `${SPACING.s6}px ${SPACING.s10}px`,
                        backgroundColor: COLORS.background.third,
                        border: `1px solid ${COLORS.border.primary}`,
                        borderRadius: 6,
                        color: COLORS.text.primary,
                        fontSize: 12,
                        outline: 'none',
                    }}
                >
                    <option value="all">전체 학과</option>
                    <option value="security_sw">정보보호과</option>
                    <option value="software_sw">소프트웨어과</option>
                    <option value="it_management">IT경영과</option>
                    <option value="content_design">콘텐츠디자인과</option>
                </select>

                <div style={{ width: 1, height: 20, backgroundColor: COLORS.border.primary }} />

                <Typo.XS color="secondary">학년 필터</Typo.XS>
                <select
                    value={selectedGrade}
                    onChange={e => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    style={{
                        padding: `${SPACING.s6}px ${SPACING.s10}px`,
                        backgroundColor: COLORS.background.third,
                        border: `1px solid ${COLORS.border.primary}`,
                        borderRadius: 6,
                        color: COLORS.text.primary,
                        fontSize: 12,
                        outline: 'none',
                    }}
                >
                    <option value="all">전체 학년</option>
                    <option value={1}>1학년</option>
                    <option value={2}>2학년</option>
                    <option value={3}>3학년</option>
                </select>

                <div style={{ width: 1, height: 20, backgroundColor: COLORS.border.primary }} />

                <Typo.XS color="secondary">반 필터</Typo.XS>
                <select
                    value={selectedClass}
                    onChange={e => setSelectedClass(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    style={{
                        padding: `${SPACING.s6}px ${SPACING.s10}px`,
                        backgroundColor: COLORS.background.third,
                        border: `1px solid ${COLORS.border.primary}`,
                        borderRadius: 6,
                        color: COLORS.text.primary,
                        fontSize: 12,
                        outline: 'none',
                    }}
                >
                    <option value="all">전체 반</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(c => (
                        <option key={c} value={c}>{c}반</option>
                    ))}
                </select>
            </HStack>

            <HStack gap={SPACING.s4} style={{ borderBottom: `1px solid ${COLORS.border.primary}`, paddingBottom: SPACING.s4 }}>
                {TAB_FILTERS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: `${SPACING.s8}px ${SPACING.s16}px`,
                            backgroundColor: activeTab === tab.key ? COLORS.background.fourth : 'transparent',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                        }}
                    >
                        <Typo.SM color={activeTab === tab.key ? 'primary' : 'secondary'} fontWeight={activeTab === tab.key ? 'medium' : 'regular'}>
                            {tab.label}
                        </Typo.SM>
                    </button>
                ))}
            </HStack>

            <VStack gap={SPACING.s8} fullWidth>
                {loading && (
                    <VStack align="center" style={{ padding: SPACING.s32 }}>
                        <Typo.SM color="secondary">로딩 중...</Typo.SM>
                    </VStack>
                )}

                {error && (
                    <VStack align="center" style={{ padding: SPACING.s32 }}>
                        <Typo.SM color="wrong">{error}</Typo.SM>
                        <button onClick={fetchEvents} style={{ marginTop: SPACING.s10, padding: `${SPACING.s8}px ${SPACING.s16}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 8, cursor: 'pointer' }}>
                            <Typo.XS color="secondary">다시 시도</Typo.XS>
                        </button>
                    </VStack>
                )}

                {!loading && !error && (
                    <>
                        <HStack
                            align="center"
                            gap={SPACING.s16}
                            fullWidth
                            style={{
                                padding: `${SPACING.s12}px ${SPACING.s16}px`,
                                position: 'sticky',
                                top: -32, // Page top padding offset
                                backgroundColor: COLORS.background.primary,
                                zIndex: 10,
                                borderBottom: `1px solid ${COLORS.border.primary}`,
                            }}
                        >
                            <Typo.XS color="secondary" style={{ flex: 3 }}>일정명</Typo.XS>
                            <Typo.XS color="secondary" style={{ flex: 2 }}>날짜</Typo.XS>
                            <Typo.XS color="secondary" style={{ flex: 2 }}>대상</Typo.XS>
                            <Typo.XS color="secondary" style={{ flex: 1 }}>유형</Typo.XS>
                            <Typo.XS color="secondary" style={{ flex: 1 }}>카테고리</Typo.XS>
                            <Typo.XS color="secondary" style={{ width: 80 }}>관리</Typo.XS>
                        </HStack>

                        {filtered.length === 0 && (
                            <VStack align="center" style={{ padding: SPACING.s32 }}>
                                <Typo.SM color="secondary">등록된 일정이 없습니다.</Typo.SM>
                            </VStack>
                        )}

                        {paginatedEvents.map(event => {
                            const color = EVENT_TYPE_COLOR[event.event_type]
                            const catLabel = EVENT_TYPE_LABELS[event.event_type]
                            const startDate = formatDateOnly(event.start_at)
                            const endDate = formatDateOnly(event.end_at)
                            return (
                                <HStack
                                    key={getIdString(event._id)}
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
                                    <HStack align="center" gap={SPACING.s10} style={{ flex: 3 }}>
                                        <div style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: COLORS.calendar[color], flexShrink: 0 }} />
                                        <Typo.SM color="primary">{event.title}</Typo.SM>
                                    </HStack>
                                    <Typo.XS color="secondary" style={{ flex: 2 }}>
                                        {startDate}{endDate !== startDate ? ` ~ ${endDate}` : ''}
                                    </Typo.XS>
                                    <Typo.XS color="secondary" style={{ flex: 2 }}>{getScopeLabel(event.scope)}</Typo.XS>
                                    <Typo.XS color="secondary" style={{ flex: 1 }}>{getTypeLabel(event.scope)}</Typo.XS>
                                    <HStack align="center" gap={SPACING.s6} style={{ flex: 1 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: COLORS.calendar[color] }} />
                                        <Typo.XXS color="secondary">{catLabel}</Typo.XXS>
                                    </HStack>
                                    <HStack gap={SPACING.s8} style={{ width: 80 }}>
                                        <button onClick={() => handleEdit(event)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                            <Typo.XS color="secondary">수정</Typo.XS>
                                        </button>
                                        <button onClick={() => handleDelete(getIdString(event._id))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                            <Typo.XS color="wrong">삭제</Typo.XS>
                                        </button>
                                    </HStack>
                                </HStack>
                            )
                        })}

                        {totalPages > 1 && (
                            <HStack justify="center" align="center" gap={SPACING.s8} style={{ marginTop: SPACING.s20, paddingBottom: SPACING.s20 }}>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: `${SPACING.s6}px ${SPACING.s12}px`,
                                        backgroundColor: COLORS.background.third,
                                        border: `1px solid ${COLORS.border.primary}`,
                                        borderRadius: 8,
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === 1 ? 0.5 : 1,
                                    }}
                                >
                                    <Typo.XS color="secondary">이전</Typo.XS>
                                </button>
                                <Typo.SM color="primary" fontWeight="medium">
                                    {currentPage} / {totalPages}
                                </Typo.SM>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: `${SPACING.s6}px ${SPACING.s12}px`,
                                        backgroundColor: COLORS.background.third,
                                        border: `1px solid ${COLORS.border.primary}`,
                                        borderRadius: 8,
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === totalPages ? 0.5 : 1,
                                    }}
                                >
                                    <Typo.XS color="secondary">다음</Typo.XS>
                                </button>
                            </HStack>
                        )}
                    </>
                )}
            </VStack>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <VStack
                        gap={SPACING.s20}
                        style={{
                            width: 480,
                            padding: SPACING.s32,
                            backgroundColor: COLORS.background.secondary,
                            borderRadius: 16,
                            border: `1px solid ${COLORS.border.primary}`,
                        }}
                    >
                        <HStack justify="between" align="center" fullWidth>
                            <Typo.LG color="primary" fontWeight="bold">{editingEvent ? '일정 수정' : '일정 추가'}</Typo.LG>
                            <button onClick={() => { setShowModal(false); resetForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Typo.LG color="secondary">✕</Typo.LG>
                            </button>
                        </HStack>
                        <VStack gap={SPACING.s12} fullWidth>
                            <VStack gap={SPACING.s6} fullWidth>
                                <Typo.XS color="secondary">일정명</Typo.XS>
                                <input
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    placeholder="일정 이름을 입력하세요"
                                    style={{
                                        width: '100%',
                                        padding: `${SPACING.s10}px ${SPACING.s12}px`,
                                        backgroundColor: COLORS.background.third,
                                        border: `1px solid ${COLORS.border.primary}`,
                                        borderRadius: 8,
                                        color: COLORS.text.primary,
                                        fontSize: 14,
                                        outline: 'none',
                                    }}
                                />
                            </VStack>
                            <VStack gap={SPACING.s6} fullWidth>
                                <Typo.XS color="secondary">시작일</Typo.XS>
                                <input
                                    type="date"
                                    value={formStartAt}
                                    onChange={e => setFormStartAt(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: `${SPACING.s10}px ${SPACING.s12}px`,
                                        backgroundColor: COLORS.background.third,
                                        border: `1px solid ${COLORS.border.primary}`,
                                        borderRadius: 8,
                                        color: COLORS.text.primary,
                                        fontSize: 14,
                                        outline: 'none',
                                    }}
                                />
                            </VStack>
                            <VStack gap={SPACING.s6} fullWidth>
                                <Typo.XS color="secondary">종료일</Typo.XS>
                                <input
                                    type="date"
                                    value={formEndAt}
                                    onChange={e => setFormEndAt(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: `${SPACING.s10}px ${SPACING.s12}px`,
                                        backgroundColor: COLORS.background.third,
                                        border: `1px solid ${COLORS.border.primary}`,
                                        borderRadius: 8,
                                        color: COLORS.text.primary,
                                        fontSize: 14,
                                        outline: 'none',
                                    }}
                                />
                            </VStack>
                            <VStack gap={SPACING.s6} fullWidth>
                                <Typo.XS color="secondary">대상</Typo.XS>
                                <select
                                    value={formScopeType}
                                    onChange={e => setFormScopeType(e.target.value as 'school' | 'department' | 'class')}
                                    style={{
                                        width: '100%',
                                        padding: `${SPACING.s10}px ${SPACING.s12}px`,
                                        backgroundColor: COLORS.background.third,
                                        border: `1px solid ${COLORS.border.primary}`,
                                        borderRadius: 8,
                                        color: COLORS.text.primary,
                                        fontSize: 14,
                                        outline: 'none',
                                    }}
                                >
                                    <option value="school">전교</option>
                                    <option value="department">학과별</option>
                                    <option value="class">반별(학급)</option>
                                </select>
                            </VStack>
                            {(formScopeType === 'department' || formScopeType === 'class') && (
                                <VStack gap={SPACING.s6} fullWidth>
                                    <Typo.XS color="secondary">학과</Typo.XS>
                                    <select
                                        value={formDepartment}
                                        onChange={e => setFormDepartment(e.target.value as Department)}
                                        style={{
                                            width: '100%',
                                            padding: `${SPACING.s10}px ${SPACING.s12}px`,
                                            backgroundColor: COLORS.background.third,
                                            border: `1px solid ${COLORS.border.primary}`,
                                            borderRadius: 8,
                                            color: COLORS.text.primary,
                                            fontSize: 14,
                                            outline: 'none',
                                        }}
                                    >
                                        <option value="security_sw">정보보호과</option>
                                        <option value="software_sw">소프트웨어과</option>
                                        <option value="it_management">IT경영과</option>
                                        <option value="content_design">콘텐츠디자인과</option>
                                    </select>
                                </VStack>
                            )}
                            {formScopeType === 'class' && (
                                <HStack gap={SPACING.s10} fullWidth>
                                    <VStack gap={SPACING.s6} style={{ flex: 1 }}>
                                        <Typo.XS color="secondary">학년</Typo.XS>
                                        <select
                                            value={formGrade}
                                            onChange={e => setFormGrade(Number(e.target.value))}
                                            style={{
                                                width: '100%',
                                                padding: `${SPACING.s10}px ${SPACING.s12}px`,
                                                backgroundColor: COLORS.background.third,
                                                border: `1px solid ${COLORS.border.primary}`,
                                                borderRadius: 8,
                                                color: COLORS.text.primary,
                                                fontSize: 14,
                                                outline: 'none',
                                            }}
                                        >
                                            <option value={1}>1학년</option>
                                            <option value={2}>2학년</option>
                                            <option value={3}>3학년</option>
                                        </select>
                                    </VStack>
                                    <VStack gap={SPACING.s6} style={{ flex: 1 }}>
                                        <Typo.XS color="secondary">반</Typo.XS>
                                        <select
                                            value={formClass}
                                            onChange={e => setFormClass(Number(e.target.value))}
                                            style={{
                                                width: '100%',
                                                padding: `${SPACING.s10}px ${SPACING.s12}px`,
                                                backgroundColor: COLORS.background.third,
                                                border: `1px solid ${COLORS.border.primary}`,
                                                borderRadius: 8,
                                                color: COLORS.text.primary,
                                                fontSize: 14,
                                                outline: 'none',
                                            }}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(c => (
                                                <option key={c} value={c}>{c}반</option>
                                            ))}
                                        </select>
                                    </VStack>
                                </HStack>
                            )}
                            <VStack gap={SPACING.s6} fullWidth>
                                <Typo.XS color="secondary">일정 유형</Typo.XS>
                                <select
                                    value={formEventType}
                                    onChange={e => setFormEventType(e.target.value as EventType)}
                                    style={{
                                        width: '100%',
                                        padding: `${SPACING.s10}px ${SPACING.s12}px`,
                                        backgroundColor: COLORS.background.third,
                                        border: `1px solid ${COLORS.border.primary}`,
                                        borderRadius: 8,
                                        color: COLORS.text.primary,
                                        fontSize: 14,
                                        outline: 'none',
                                    }}
                                >
                                    <option value="written_exam">지필고사</option>
                                    <option value="performance_eval">수행평가</option>
                                    <option value="academic_eval">학업평가</option>
                                    <option value="school_event">축제/행사</option>
                                    <option value="contest">대회</option>
                                    <option value="field_trip">외부활동</option>
                                    <option value="vacation">방학/개학</option>
                                    <option value="assignment">과제</option>
                                    <option value="counseling">상담</option>
                                    <option value="notice">공지</option>
                                    <option value="other">기타</option>
                                </select>
                            </VStack>
                        </VStack>
                        <HStack gap={SPACING.s10} justify="end" fullWidth>
                            <button
                                onClick={() => { setShowModal(false); resetForm() }}
                                style={{ padding: `${SPACING.s8}px ${SPACING.s16}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 8, cursor: 'pointer' }}
                            >
                                <Typo.SM color="secondary">취소</Typo.SM>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={formSaving}
                                style={{ padding: `${SPACING.s8}px ${SPACING.s20}px`, backgroundColor: COLORS.brand.primary, border: 'none', borderRadius: 8, cursor: formSaving ? 'not-allowed' : 'pointer', opacity: formSaving ? 0.6 : 1 }}
                            >
                                <Typo.SM color="inverted" fontWeight="medium">{formSaving ? '저장 중...' : '저장'}</Typo.SM>
                            </button>
                        </HStack>
                    </VStack>
                </div>
            )}
        </VStack>
    )
}
