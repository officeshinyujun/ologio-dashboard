'use client'

import { useState, useEffect, useCallback } from 'react'
import { VStack } from '@/components/general/VStack'
import { HStack } from '@/components/general/HStack'
import Typo from '@/components/general/Typo'
import { COLORS } from '@/constants/colors'
import { SPACING } from '@/constants/spacing'
import { apiGet, apiPost } from '@/lib/api'
import type { Timetable, TimetablePeriod, SyncLog, Department } from '@/types/api'

const PERIODS = [1, 2, 3, 4, 5, 6, 7]
const DAYS = ['월', '화', '수', '목', '금']

const DEPARTMENTS: { key: Department; label: string }[] = [
    { key: 'security_sw', label: '정보보호과' },
    { key: 'software_sw', label: '소프트웨어과' },
    { key: 'it_management', label: 'IT경영과' },
    { key: 'content_design', label: '콘텐츠디자인과' },
]
const GRADES = ['1학년', '2학년', '3학년']

const DEPT_CLASSES: Record<Department, string[]> = {
    security_sw: ['1반', '2반', '3반'],
    software_sw: ['4반', '5반', '6반'],
    it_management: ['7반', '8반'],
    content_design: ['9반', '10반'],
}

const SUBJECT_COLORS: Record<string, string> = {
    '국어': COLORS.calendar.conflower,
    '수학': COLORS.calendar.tomato,
    '영어': COLORS.calendar.saige,
    '프로그래밍': COLORS.calendar.blueberry,
    '체육': COLORS.calendar.banana,
    '음악': COLORS.calendar.grape,
    '미술': COLORS.calendar.sitrus,
    '자율': COLORS.background.fourth,
}

const DUMMY_TIMETABLE: Record<string, { period: number; subject_short: string; subject_long: string; teacher: string; is_substituted: boolean }[]> = {
    '월': [
        { period: 1, subject_short: '진영B', subject_long: '진로영어B', teacher: '김훈*', is_substituted: false },
        { period: 2, subject_short: '미적A', subject_long: '미적분A', teacher: '김수*', is_substituted: false },
        { period: 3, subject_short: '공일', subject_long: '공업일반', teacher: '박승*', is_substituted: false },
        { period: 4, subject_short: '성직', subject_long: '성공적인 직업생활', teacher: '김영*', is_substituted: false },
        { period: 5, subject_short: '인공', subject_long: '인공지능', teacher: '김동*', is_substituted: false },
        { period: 6, subject_short: '인공', subject_long: '인공지능', teacher: '김동*', is_substituted: false },
    ],
    '화': [
        { period: 1, subject_short: '진영C', subject_long: '진로영어C', teacher: '이원*', is_substituted: false },
        { period: 2, subject_short: '공일', subject_long: '공업일반', teacher: '박승*', is_substituted: false },
        { period: 3, subject_short: '성직', subject_long: '성공적인 직업생활', teacher: '김영*', is_substituted: false },
        { period: 4, subject_short: '미적B', subject_long: '미적분B', teacher: '김수*', is_substituted: false },
        { period: 5, subject_short: '게프', subject_long: '게임프로그래밍', teacher: '김선*', is_substituted: false },
        { period: 6, subject_short: '게프', subject_long: '게임프로그래밍', teacher: '김선*', is_substituted: false },
        { period: 7, subject_short: '독서A', subject_long: '독서A', teacher: '박현*', is_substituted: false },
    ],
    '수': [
        { period: 1, subject_short: '성직', subject_long: '성공적인 직업생활', teacher: '김영*', is_substituted: false },
        { period: 2, subject_short: '전프', subject_long: '전자프로그래밍', teacher: '배윤*', is_substituted: false },
        { period: 3, subject_short: '미적B', subject_long: '미적분B', teacher: '김수*', is_substituted: false },
        { period: 4, subject_short: '독서C', subject_long: '독서C', teacher: '임심*', is_substituted: false },
        { period: 5, subject_short: '진영A', subject_long: '진로영어A', teacher: '주민*', is_substituted: false },
        { period: 6, subject_short: '미적A', subject_long: '미적분A', teacher: '김수*', is_substituted: false },
    ],
    '목': [
        { period: 1, subject_short: '인공', subject_long: '인공지능', teacher: '김동*', is_substituted: false },
        { period: 2, subject_short: '공일', subject_long: '공업일반', teacher: '박승*', is_substituted: false },
        { period: 3, subject_short: '운건', subject_long: '운동과 건강', teacher: '손해*', is_substituted: false },
        { period: 4, subject_short: '미적A', subject_long: '미적분A', teacher: '김수*', is_substituted: false },
        { period: 5, subject_short: '독서B', subject_long: '독서B', teacher: '서헌*', is_substituted: false },
        { period: 6, subject_short: '알고', subject_long: '알고리즘', teacher: '심희*', is_substituted: false },
    ],
    '금': [
        { period: 1, subject_short: '게프', subject_long: '게임프로그래밍', teacher: '김선*', is_substituted: false },
        { period: 2, subject_short: '게프', subject_long: '게임프로그래밍', teacher: '김선*', is_substituted: false },
        { period: 3, subject_short: '알고', subject_long: '알고리즘', teacher: '심희*', is_substituted: false },
        { period: 4, subject_short: '알고', subject_long: '알고리즘', teacher: '심희*', is_substituted: false },
        { period: 5, subject_short: '공일', subject_long: '공업일반', teacher: '박승*', is_substituted: false },
        { period: 6, subject_short: '자율', subject_long: '자율활동', teacher: '김수*', is_substituted: false },
    ],
}

function getMonday(d: Date): Date {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    date.setDate(diff)
    date.setHours(0, 0, 0, 0)
    return date
}

function formatDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

type WeekTimetable = Record<string, TimetablePeriod[]>

export default function TimetablePage() {
    const [selectedDept, setSelectedDept] = useState<Department>(DEPARTMENTS[0].key)
    const [selectedGrade, setSelectedGrade] = useState('1학년')
    const [selectedClass, setSelectedClass] = useState('1반')
    const [syncStatus, setSyncStatus] = useState<'ok' | 'syncing' | 'error'>('ok')
    const [weekData, setWeekData] = useState<WeekTimetable>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // 수업 교체 등록을 위한 상태 정의
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formDate, setFormDate] = useState(formatDate(new Date()))
    const [formPeriod, setFormPeriod] = useState(1)
    const [formSubjectShort, setFormSubjectShort] = useState('')
    const [formSubjectLong, setFormSubjectLong] = useState('')
    const [formTeacher, setFormTeacher] = useState('')
    const [formNote, setFormNote] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const available = DEPT_CLASSES[selectedDept]
        if (available && !available.includes(selectedClass)) {
            setSelectedClass(available[0])
        }
    }, [selectedDept, selectedClass])

    const gradeNum = parseInt(selectedGrade)
    const classNum = parseInt(selectedClass)

    const fetchWeekTimetable = useCallback(async () => {
        setLoading(true)
        setError(null)

        const monday = getMonday(new Date())
        const dates = Array.from({ length: 5 }, (_, i) => {
            const d = new Date(monday)
            d.setDate(monday.getDate() + i)
            return d
        })
        const friday = dates[4]

        try {
            const res = await apiGet<Timetable[]>(`/timetable/${gradeNum}/${classNum}?from=${formatDate(monday)}&to=${formatDate(friday)}`)

            const week: WeekTimetable = { '월': [], '화': [], '수': [], '목': [], '금': [] }
            
            if (res.success && res.data) {
                const daysData = Array.isArray(res.data) ? res.data : []
                daysData.forEach((dayData) => {
                    const dateObj = new Date(dayData.date)
                    const dayIndex = dateObj.getDay()
                    if (dayIndex >= 1 && dayIndex <= 5) {
                        const dayKey = DAYS[dayIndex - 1]
                        let periods: TimetablePeriod[] = []
                        if (dayData.periods) {
                            periods = dayData.periods
                        } else if ((dayData as any).slots) {
                            periods = (dayData as any).slots
                                .filter((slot: any) => slot.kind === 'period')
                                .map((slot: any) => ({
                                    period: slot.period,
                                    subject_short: slot.subject_short,
                                    subject_long: slot.subject_long,
                                    teacher: slot.teacher,
                                    is_substituted: slot.is_substituted,
                                    substitution_note: slot.substitution_note,
                                    room: slot.room,
                                }))
                        }
                        week[dayKey] = periods
                    }
                })
            }

            // Fill empty slots with dummy data as requested
            DAYS.forEach(dayKey => {
                const currentPeriods = week[dayKey]
                const dummyDayPeriods = DUMMY_TIMETABLE[dayKey] || []
                for (let p = 1; p <= 7; p++) {
                    if (!currentPeriods.find(period => period.period === p)) {
                        const dummyPeriod = dummyDayPeriods.find(dp => dp.period === p)
                        if (dummyPeriod) {
                            currentPeriods.push({
                                period: p,
                                subject_short: dummyPeriod.subject_short,
                                subject_long: dummyPeriod.subject_long,
                                teacher: dummyPeriod.teacher,
                                is_substituted: false,
                            })
                        } else {
                            currentPeriods.push({
                                period: p,
                                subject_short: '-',
                                subject_long: '',
                                teacher: '',
                                is_substituted: false,
                            })
                        }
                    }
                }
                currentPeriods.sort((a, b) => a.period - b.period)
            })

            setWeekData(week)
        } catch {
            setError('시간표를 불러오는 데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }, [gradeNum, classNum])

    const fetchSyncStatus = useCallback(async () => {
        try {
            const res = await apiGet<SyncLog[]>('/admin/sync/logs?limit=5')
            if (res.success && res.data) {
                const comtimeLogs = res.data.filter(l => l.job_name === 'comtime_sync')
                if (comtimeLogs.length === 0) {
                    setSyncStatus('error')
                } else {
                    setSyncStatus(comtimeLogs[0].status === 'success' ? 'ok' : 'error')
                }
            }
        } catch {
            setSyncStatus('error')
        }
    }, [])

    useEffect(() => {
        fetchWeekTimetable()
    }, [fetchWeekTimetable])

    useEffect(() => {
        fetchSyncStatus()
    }, [fetchSyncStatus])

    // 모달을 열 때 기본 날짜를 현재 날짜로 리셋
    useEffect(() => {
        if (isModalOpen) {
            setFormDate(formatDate(new Date()))
        }
    }, [isModalOpen])

    const handleRegisterOverride = useCallback(async () => {
        if (!formSubjectShort || !formTeacher) {
            alert('과목 약어와 교사 이름은 필수 입력 항목입니다.')
            return
        }
        setSubmitting(true)
        try {
            const res = await apiPost('/admin/timetable-overrides', {
                date: formDate,
                grades: [gradeNum],
                classes: [classNum],
                departments: [selectedDept],
                periods: [{
                    period: formPeriod,
                    subject_short: formSubjectShort,
                    subject_long: formSubjectLong || formSubjectShort,
                    teacher: formTeacher,
                    is_substituted: true
                }],
                replace_all: false,
                note: formNote || undefined
            })
            if (res.success) {
                alert('수업 교체가 성공적으로 등록되었습니다.')
                setIsModalOpen(false)
                fetchWeekTimetable()
                // 입력 필드 초기화
                setFormSubjectShort('')
                setFormSubjectLong('')
                setFormTeacher('')
                setFormNote('')
            } else {
                alert(`등록 실패: ${res.error?.message || '알 수 없는 오류가 발생했습니다.'}`)
            }
        } catch {
            alert('API 요청 중 에러가 발생했습니다.')
        } finally {
            setSubmitting(false)
        }
    }, [formDate, gradeNum, classNum, selectedDept, formPeriod, formSubjectShort, formSubjectLong, formTeacher, formNote, fetchWeekTimetable])

    const substitutions: { day: string; period: TimetablePeriod }[] = []
    DAYS.forEach(day => {
        const periods = weekData[day] ?? []
        periods.forEach(p => {
            if (p.is_substituted) {
                substitutions.push({ day, period: p })
            }
        })
    })

    const selectedDeptLabel = DEPARTMENTS.find(d => d.key === selectedDept)?.label ?? ''

    return (
        <VStack gap={SPACING.s32} style={{ padding: SPACING.s32, minHeight: '100vh', backgroundColor: COLORS.background.primary }}>
            <HStack justify="between" align="center" fullWidth>
                <VStack gap={SPACING.s8}>
                    <Typo.XL color="primary" fontWeight="bold">시간표 관리</Typo.XL>
                    <Typo.SM color="secondary">학과/학년/반별 시간표를 설정하고 수업 교체를 관리합니다.</Typo.SM>
                </VStack>
                <HStack gap={SPACING.s10} align="center">
                    <HStack align="center" gap={SPACING.s6} style={{ padding: `${SPACING.s6}px ${SPACING.s12}px`, backgroundColor: COLORS.background.secondary, borderRadius: 8, border: `1px solid ${COLORS.border.primary}` }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: syncStatus === 'ok' ? COLORS.text.correct : COLORS.text.wrong }} />
                        <Typo.XS color="secondary">컴시간 연동 {syncStatus === 'ok' ? '정상' : '오류'}</Typo.XS>
                    </HStack>
                    <button onClick={async () => { const r = await apiPost('/admin/sync/comcigan'); if (r.success) { alert('컴시간 동기화 요청됨'); fetchWeekTimetable(); fetchSyncStatus(); } }} style={{ padding: `${SPACING.s8}px ${SPACING.s16}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 8, cursor: 'pointer' }}>
                        <Typo.SM color="secondary">수동 동기화</Typo.SM>
                    </button>
                </HStack>
            </HStack>

            <HStack gap={SPACING.s12} align="center" fullWidth style={{ padding: SPACING.s16, backgroundColor: COLORS.background.secondary, borderRadius: 12, border: `1px solid ${COLORS.border.primary}` }}>
                <Typo.XS color="secondary">학과</Typo.XS>
                <HStack gap={SPACING.s6}>
                    {DEPARTMENTS.map(d => (
                        <button key={d.key} onClick={() => setSelectedDept(d.key)} style={{ padding: `${SPACING.s6}px ${SPACING.s12}px`, backgroundColor: selectedDept === d.key ? COLORS.brand.primary : COLORS.background.third, border: `1px solid ${selectedDept === d.key ? COLORS.brand.primary : COLORS.border.primary}`, borderRadius: 6, cursor: 'pointer' }}>
                            <Typo.XS color={selectedDept === d.key ? 'inverted' : 'secondary'}>{d.label}</Typo.XS>
                        </button>
                    ))}
                </HStack>
                <div style={{ width: 1, height: 20, backgroundColor: COLORS.border.primary }} />
                <Typo.XS color="secondary">학년</Typo.XS>
                <HStack gap={SPACING.s6}>
                    {GRADES.map(g => (
                        <button key={g} onClick={() => setSelectedGrade(g)} style={{ padding: `${SPACING.s6}px ${SPACING.s12}px`, backgroundColor: selectedGrade === g ? COLORS.brand.primary : COLORS.background.third, border: `1px solid ${selectedGrade === g ? COLORS.brand.primary : COLORS.border.primary}`, borderRadius: 6, cursor: 'pointer' }}>
                            <Typo.XS color={selectedGrade === g ? 'inverted' : 'secondary'}>{g}</Typo.XS>
                        </button>
                    ))}
                </HStack>
                <div style={{ width: 1, height: 20, backgroundColor: COLORS.border.primary }} />
                <Typo.XS color="secondary">반</Typo.XS>
                <HStack gap={SPACING.s6}>
                    {(DEPT_CLASSES[selectedDept] ?? []).map(c => (
                        <button key={c} onClick={() => setSelectedClass(c)} style={{ padding: `${SPACING.s6}px ${SPACING.s12}px`, backgroundColor: selectedClass === c ? COLORS.brand.primary : COLORS.background.third, border: `1px solid ${selectedClass === c ? COLORS.brand.primary : COLORS.border.primary}`, borderRadius: 6, cursor: 'pointer' }}>
                            <Typo.XS color={selectedClass === c ? 'inverted' : 'secondary'}>{c}</Typo.XS>
                        </button>
                    ))}
                </HStack>
            </HStack>

            <VStack gap={SPACING.s16} fullWidth>
                <HStack justify="between" align="center" fullWidth>
                    <Typo.MD color="primary" fontWeight="semi-bold">{selectedDeptLabel} {selectedGrade} {selectedClass} 시간표</Typo.MD>
                    <HStack gap={SPACING.s8}>
                        <HStack align="center" gap={SPACING.s6}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: COLORS.calendar.banana, border: `1px solid ${COLORS.calendar.banana}` }} />
                            <Typo.XXS color="secondary">수업 교체됨</Typo.XXS>
                        </HStack>
                    </HStack>
                </HStack>

                {error && (
                    <HStack align="center" gap={SPACING.s8} style={{ padding: SPACING.s12, backgroundColor: COLORS.background.third, borderRadius: 8, border: `1px solid ${COLORS.text.wrong}` }}>
                        <Typo.SM color="wrong">{error}</Typo.SM>
                    </HStack>
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: SPACING.s6 }}>
                        <thead>
                            <tr>
                                <th style={{ width: 60, padding: `${SPACING.s8}px`, textAlign: 'center' }}>
                                    <Typo.XS color="secondary">교시</Typo.XS>
                                </th>
                                {DAYS.map(day => (
                                    <th key={day} style={{ padding: `${SPACING.s8}px`, textAlign: 'center' }}>
                                        <Typo.SM color="primary" fontWeight="medium">{day}</Typo.SM>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {PERIODS.map(period => (
                                <tr key={period}>
                                    <td style={{ textAlign: 'center', padding: `${SPACING.s8}px` }}>
                                        <Typo.XS color="secondary">{period}교시</Typo.XS>
                                    </td>
                                    {DAYS.map(day => {
                                        const periods = weekData[day] ?? []
                                        const cell = periods.find(p => p.period === period)
                                        const color = cell ? (SUBJECT_COLORS[cell.subject_short] ?? COLORS.background.third) : COLORS.background.third
                                        return (
                                            <td key={day} style={{ padding: 0 }}>
                                                <VStack
                                                    align="center"
                                                    gap={SPACING.s4}
                                                    style={{
                                                        padding: `${SPACING.s10}px ${SPACING.s8}px`,
                                                        backgroundColor: COLORS.background.secondary,
                                                        borderRadius: 8,
                                                        borderTop: `1px solid ${cell?.is_substituted ? COLORS.calendar.banana : COLORS.border.primary}`,
                                                        borderRight: `1px solid ${cell?.is_substituted ? COLORS.calendar.banana : COLORS.border.primary}`,
                                                        borderBottom: `1px solid ${cell?.is_substituted ? COLORS.calendar.banana : COLORS.border.primary}`,
                                                        borderLeft: `3px solid ${color}`,
                                                        cursor: 'pointer',
                                                        minHeight: 64,
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {cell?.is_substituted && (
                                                        <div style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', backgroundColor: COLORS.calendar.banana }} />
                                                    )}
                                                    {loading ? (
                                                        <Typo.XS color="secondary">-</Typo.XS>
                                                    ) : (
                                                        <>
                                                            <Typo.XS color="primary" fontWeight="medium">{cell?.subject_short ?? '-'}</Typo.XS>
                                                            {cell?.teacher && <Typo.XXS color="secondary">{cell.teacher}</Typo.XXS>}
                                                        </>
                                                    )}
                                                </VStack>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </VStack>

            <VStack gap={SPACING.s16} fullWidth style={{ padding: SPACING.s20, backgroundColor: COLORS.background.secondary, borderRadius: 12, border: `1px solid ${COLORS.border.primary}` }}>
                <HStack justify="between" align="center" fullWidth>
                    <Typo.MD color="primary" fontWeight="semi-bold">수업 교체 (Substitution)</Typo.MD>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{ padding: `${SPACING.s6}px ${SPACING.s14}px`, backgroundColor: COLORS.brand.primary, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                    >
                        <Typo.XS color="inverted" fontWeight="medium">+ 교체 등록</Typo.XS>
                    </button>
                </HStack>
                {substitutions.length === 0 && !loading && (
                    <Typo.SM color="secondary">이번 주 수업 교체가 없습니다.</Typo.SM>
                )}
                {substitutions.map((s, i) => (
                    <HStack key={i} gap={SPACING.s12} align="center" style={{ padding: `${SPACING.s10}px ${SPACING.s16}px`, backgroundColor: COLORS.background.third, borderRadius: 8, border: `1px solid ${COLORS.calendar.banana}` }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: COLORS.calendar.banana, flexShrink: 0 }} />
                        <VStack gap={SPACING.s4} style={{ flex: 1 }}>
                            <Typo.SM color="primary">{s.day}요일 {s.period.period}교시 — {s.period.subject_short}</Typo.SM>
                            {s.period.substitution_note && <Typo.XXS color="secondary">{s.period.substitution_note}</Typo.XXS>}
                        </VStack>
                        <Typo.XS color="secondary">{s.period.teacher}</Typo.XS>
                    </HStack>
                ))}
            </VStack>

            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(8px)',
                }}>
                    <VStack gap={SPACING.s24} style={{
                        backgroundColor: COLORS.background.secondary,
                        padding: SPACING.s32,
                        borderRadius: 16,
                        border: `1px solid ${COLORS.border.primary}`,
                        width: '100%',
                        maxWidth: 460,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    }}>
                        <VStack gap={SPACING.s8}>
                            <Typo.LG color="primary" fontWeight="bold">수업 교체 등록</Typo.LG>
                            <Typo.XS color="secondary">지정된 날짜와 교시에 시간표 내용을 덮어씁니다.</Typo.XS>
                        </VStack>

                        <VStack gap={SPACING.s16} style={{ width: '100%' }}>
                            <VStack gap={SPACING.s6}>
                                <Typo.XXS color="secondary" fontWeight="semi-bold">날짜</Typo.XXS>
                                <input
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    style={{
                                        padding: `${SPACING.s10}px ${SPACING.s14}px`,
                                        backgroundColor: COLORS.background.third,
                                        border: `1px solid ${COLORS.border.primary}`,
                                        borderRadius: 8,
                                        color: COLORS.text.primary,
                                        fontSize: 14,
                                        outline: 'none',
                                        width: '100%',
                                    }}
                                />
                            </VStack>

                            <HStack gap={SPACING.s12} fullWidth>
                                <VStack gap={SPACING.s6} style={{ flex: 1 }}>
                                    <Typo.XXS color="secondary" fontWeight="semi-bold">교시</Typo.XXS>
                                    <select
                                        value={formPeriod}
                                        onChange={(e) => setFormPeriod(Number(e.target.value))}
                                        style={{
                                            padding: `${SPACING.s10}px ${SPACING.s14}px`,
                                            backgroundColor: COLORS.background.third,
                                            border: `1px solid ${COLORS.border.primary}`,
                                            borderRadius: 8,
                                            color: COLORS.text.primary,
                                            fontSize: 14,
                                            outline: 'none',
                                            width: '100%',
                                        }}
                                    >
                                        {PERIODS.map(p => (
                                            <option key={p} value={p}>{p}교시</option>
                                        ))}
                                    </select>
                                </VStack>
                                <VStack gap={SPACING.s6} style={{ flex: 2 }}>
                                    <Typo.XXS color="secondary" fontWeight="semi-bold">과목 약칭</Typo.XXS>
                                    <input
                                        type="text"
                                        placeholder="예: 미적A, 알고"
                                        value={formSubjectShort}
                                        onChange={(e) => setFormSubjectShort(e.target.value)}
                                        style={{
                                            padding: `${SPACING.s10}px ${SPACING.s14}px`,
                                            backgroundColor: COLORS.background.third,
                                            border: `1px solid ${COLORS.border.primary}`,
                                            borderRadius: 8,
                                            color: COLORS.text.primary,
                                            fontSize: 14,
                                            outline: 'none',
                                            width: '100%',
                                        }}
                                    />
                                </VStack>
                            </HStack>

                            <HStack gap={SPACING.s12} fullWidth>
                                <VStack gap={SPACING.s6} style={{ flex: 1 }}>
                                    <Typo.XXS color="secondary" fontWeight="semi-bold">과목 전체명 (선택)</Typo.XXS>
                                    <input
                                        type="text"
                                        placeholder="예: 미적분A"
                                        value={formSubjectLong}
                                        onChange={(e) => setFormSubjectLong(e.target.value)}
                                        style={{
                                            padding: `${SPACING.s10}px ${SPACING.s14}px`,
                                            backgroundColor: COLORS.background.third,
                                            border: `1px solid ${COLORS.border.primary}`,
                                            borderRadius: 8,
                                            color: COLORS.text.primary,
                                            fontSize: 14,
                                            outline: 'none',
                                            width: '100%',
                                        }}
                                    />
                                </VStack>
                                <VStack gap={SPACING.s6} style={{ flex: 1 }}>
                                    <Typo.XXS color="secondary" fontWeight="semi-bold">교사</Typo.XXS>
                                    <input
                                        type="text"
                                        placeholder="예: 김수*"
                                        value={formTeacher}
                                        onChange={(e) => setFormTeacher(e.target.value)}
                                        style={{
                                            padding: `${SPACING.s10}px ${SPACING.s14}px`,
                                            backgroundColor: COLORS.background.third,
                                            border: `1px solid ${COLORS.border.primary}`,
                                            borderRadius: 8,
                                            color: COLORS.text.primary,
                                            fontSize: 14,
                                            outline: 'none',
                                            width: '100%',
                                        }}
                                    />
                                </VStack>
                            </HStack>

                            <VStack gap={SPACING.s6} style={{ width: '100%' }}>
                                <Typo.XXS color="secondary" fontWeight="semi-bold">교체 메모 / 사유</Typo.XXS>
                                <input
                                    type="text"
                                    placeholder="예: 교사 출장으로 인한 대체 수업"
                                    value={formNote}
                                    onChange={(e) => setFormNote(e.target.value)}
                                    style={{
                                        padding: `${SPACING.s10}px ${SPACING.s14}px`,
                                        backgroundColor: COLORS.background.third,
                                        border: `1px solid ${COLORS.border.primary}`,
                                        borderRadius: 8,
                                        color: COLORS.text.primary,
                                        fontSize: 14,
                                        outline: 'none',
                                        width: '100%',
                                    }}
                                />
                            </VStack>
                        </VStack>

                        <HStack gap={SPACING.s12} justify="end" fullWidth>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    padding: `${SPACING.s10}px ${SPACING.s20}px`,
                                    backgroundColor: 'transparent',
                                    border: `1px solid ${COLORS.border.primary}`,
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    color: COLORS.text.secondary,
                                }}
                            >
                                <Typo.SM color="secondary">취소</Typo.SM>
                            </button>
                            <button
                                onClick={handleRegisterOverride}
                                disabled={submitting}
                                style={{
                                    padding: `${SPACING.s10}px ${SPACING.s20}px`,
                                    backgroundColor: submitting ? COLORS.background.third : COLORS.brand.primary,
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    color: 'white',
                                }}
                            >
                                <Typo.SM color="inverted" fontWeight="medium">
                                    {submitting ? '등록 중...' : '등록'}
                                </Typo.SM>
                            </button>
                        </HStack>
                    </VStack>
                </div>
            )}
        </VStack>
    )
}
