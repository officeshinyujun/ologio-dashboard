'use client'

import { useState, useEffect, useCallback } from 'react'
import { VStack } from '@/components/general/VStack'
import { HStack } from '@/components/general/HStack'
import Typo from '@/components/general/Typo'
import { COLORS } from '@/constants/colors'
import { SPACING } from '@/constants/spacing'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import type { PeriodScheduleTemplate, ScheduleOverride, Holiday, PeriodTime, LunchBreak } from '@/types/api'

type Tab = 'templates' | 'overrides' | 'holidays'

const extractId = (id: any): string => {
    if (!id) return ''
    if (typeof id === 'object' && id !== null) {
        return id.$oid || id.id || id._id || String(id)
    }
    return String(id)
}

const DEFAULT_PERIODS: PeriodTime[] = Array.from({ length: 7 }, (_, i) => ({
    period: i + 1,
    start: i === 0 ? '09:00' : i === 1 ? '10:00' : i === 2 ? '11:00' : i === 3 ? '12:00' : i === 4 ? '13:50' : i === 5 ? '14:50' : '15:50',
    end: i === 0 ? '09:50' : i === 1 ? '10:50' : i === 2 ? '11:50' : i === 3 ? '12:50' : i === 4 ? '14:40' : i === 5 ? '15:40' : '16:40',
    break_after_mins: 10
}))

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('templates')

    // Data lists
    const [templates, setTemplates] = useState<PeriodScheduleTemplate[]>([])
    const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
    const [holidays, setHolidays] = useState<Holiday[]>([])

    // Loading & error states
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filter states
    const [overrideYear, setOverrideYear] = useState<number>(new Date().getFullYear())
    const [overrideMonth, setOverrideMonth] = useState<number>(new Date().getMonth() + 1)
    const [holidayYear, setHolidayYear] = useState<number>(new Date().getFullYear())

    // Modals
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [showOverrideModal, setShowOverrideModal] = useState(false)
    const [showHolidayModal, setShowHolidayModal] = useState(false)

    // Editing objects
    const [editingTemplate, setEditingTemplate] = useState<PeriodScheduleTemplate | null>(null)

    // Template Form states
    const [tempName, setTempName] = useState('')
    const [tempDesc, setTempDesc] = useState('')
    const [tempGrade, setTempGrade] = useState<string>('')
    const [tempIsDefault, setTempIsDefault] = useState(false)
    const [tempPeriods, setTempPeriods] = useState<PeriodTime[]>(DEFAULT_PERIODS)
    const [tempLunchStart, setTempLunchStart] = useState('12:50')
    const [tempLunchDuration, setTempLunchDuration] = useState('60')
    const [tempHomeroomStart, setTempHomeroomStart] = useState('08:40')
    const [tempHomeroomEnd, setTempHomeroomEnd] = useState('08:55')
    const [hasHomeroom, setHasHomeroom] = useState(false)
    const [savingTemplate, setSavingTemplate] = useState(false)

    // Override Form states
    const [overDate, setOverDate] = useState('')
    const [overTemplateId, setOverTemplateId] = useState('')
    const [overIsNoSchool, setOverIsNoSchool] = useState(false)
    const [overNote, setOverNote] = useState('')
    const [savingOverride, setSavingOverride] = useState(false)

    // Holiday Form states
    const [holDate, setHolDate] = useState('')
    const [holName, setHolName] = useState('')
    const [holGrades, setHolGrades] = useState<{ [grade: number]: boolean }>({ 1: true, 2: true, 3: true })
    const [holIsNoSchool, setHolIsNoSchool] = useState(true)
    const [holOverrideWeekend, setHolOverrideWeekend] = useState(false)
    const [savingHoliday, setSavingHoliday] = useState(false)

    // --- Data Fetching ---
    const fetchTemplates = useCallback(async () => {
        try {
            const res = await apiGet<PeriodScheduleTemplate[]>('/admin/config/period-templates')
            if (res.success && res.data) {
                setTemplates(res.data)
            }
        } catch (err) {
            console.error(err)
        }
    }, [])

    const fetchOverrides = useCallback(async (year: number, month: number) => {
        try {
            const res = await apiGet<ScheduleOverride[]>(`/admin/config/schedule-overrides?year=${year}&month=${month}`)
            if (res.success && res.data) {
                setOverrides(res.data)
            }
        } catch (err) {
            console.error(err)
        }
    }, [])

    const fetchHolidays = useCallback(async (year: number) => {
        try {
            const from = `${year}-01-01`
            const to = `${year}-12-31`
            const res = await apiGet<Holiday[]>(`/admin/config/holidays?from=${from}&to=${to}`)
            if (res.success && res.data) {
                // Sort by date ascending
                const sorted = [...res.data].sort((a, b) => a.date.localeCompare(b.date))
                setHolidays(sorted)
            }
        } catch (err) {
            console.error(err)
        }
    }, [])

    const loadAll = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            await Promise.all([
                fetchTemplates(),
                fetchOverrides(overrideYear, overrideMonth),
                fetchHolidays(holidayYear)
            ])
        } catch {
            setError('설정 정보를 불러오는 데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }, [fetchTemplates, fetchOverrides, fetchHolidays, overrideYear, overrideMonth, holidayYear])

    useEffect(() => {
        loadAll()
    }, [loadAll])

    // --- Template CRUD ---
    const resetTemplateForm = () => {
        setTempName('')
        setTempDesc('')
        setTempGrade('')
        setTempIsDefault(false)
        setTempPeriods(DEFAULT_PERIODS)
        setTempLunchStart('12:50')
        setTempLunchDuration('60')
        setTempHomeroomStart('08:40')
        setTempHomeroomEnd('08:55')
        setHasHomeroom(false)
        setEditingTemplate(null)
    }

    const handleOpenEditTemplate = (tpl: PeriodScheduleTemplate) => {
        setEditingTemplate(tpl)
        setTempName(tpl.name)
        setTempDesc(tpl.description || '')
        setTempGrade(tpl.grade ? String(tpl.grade) : '')
        setTempIsDefault(tpl.is_default)
        setTempPeriods(tpl.periods || DEFAULT_PERIODS)
        if (tpl.lunch_break) {
            setTempLunchStart(tpl.lunch_break.start)
            setTempLunchDuration(String(tpl.lunch_break.duration_mins))
        } else {
            setTempLunchStart('')
            setTempLunchDuration('')
        }
        if (tpl.homeroom) {
            setHasHomeroom(true)
            setTempHomeroomStart(tpl.homeroom.start)
            setTempHomeroomEnd(tpl.homeroom.end)
        } else {
            setHasHomeroom(false)
        }
        setShowTemplateModal(true)
    }

    const handleSaveTemplate = async () => {
        if (!tempName.trim()) {
            alert('템플릿 이름은 필수 항목입니다.')
            return
        }

        setSavingTemplate(true)

        const lunch_break: LunchBreak | null = tempLunchStart && tempLunchDuration
            ? { start: tempLunchStart, duration_mins: parseInt(tempLunchDuration, 10) || 50 }
            : null

        const homeroom = hasHomeroom
            ? { period: 0, start: tempHomeroomStart, end: tempHomeroomEnd }
            : null

        const body = {
            name: tempName.trim(),
            description: tempDesc.trim() || null,
            periods: tempPeriods,
            grade: tempGrade ? parseInt(tempGrade, 10) : null,
            is_default: tempIsDefault,
            homeroom,
            lunch_break
        }

        try {
            let res
            const idString = extractId(editingTemplate?._id)
            if (editingTemplate && idString) {
                res = await apiPut(`/admin/config/period-templates/${idString}`, body)
            } else {
                res = await apiPost('/admin/config/period-templates', body)
            }

            if (res.success) {
                setShowTemplateModal(false)
                resetTemplateForm()
                fetchTemplates()
            } else {
                alert(res.error?.message || '저장에 실패했습니다.')
            }
        } catch {
            alert('서버 요청 중 오류가 발생했습니다.')
        } finally {
            setSavingTemplate(false)
        }
    }

    const handleDeleteTemplate = async (tpl: PeriodScheduleTemplate) => {
        if (!confirm(`정말로 "${tpl.name}" 일과 템플릿을 삭제하시겠습니까?`)) return
        const idString = extractId(tpl._id)
        if (!idString) {
            alert('유효하지 않은 템플릿 ID입니다.')
            return
        }
        try {
            const res = await apiDelete(`/admin/config/period-templates/${idString}`)
            if (res.success) {
                fetchTemplates()
            } else {
                alert(res.error?.message || '삭제에 실패했습니다.')
            }
        } catch {
            alert('서버 요청 중 오류가 발생했습니다.')
        }
    }

    const handlePeriodTimeChange = (index: number, key: 'start' | 'end', value: string) => {
        const next = [...tempPeriods]
        next[index] = { ...next[index], [key]: value }
        setTempPeriods(next)
    }

    // --- Override CRUD ---
    const resetOverrideForm = () => {
        setOverDate('')
        setOverTemplateId('')
        setOverIsNoSchool(false)
        setOverNote('')
    }

    const handleSaveOverride = async () => {
        if (!overDate) {
            alert('날짜를 지정해주세요.')
            return
        }
        if (!overIsNoSchool && !overTemplateId) {
            alert('시간표 템플릿을 선택하거나 휴업일로 체크해주세요.')
            return
        }

        setSavingOverride(true)

        const body = {
            date: overDate,
            template_id: overIsNoSchool ? null : overTemplateId || null,
            is_no_school: overIsNoSchool,
            period_overrides: [],
            suppress_lunch: overIsNoSchool,
            lunch_break_override: null,
            note: overNote.trim() || null
        }

        try {
            const res = await apiPost('/admin/config/schedule-overrides', body)
            if (res.success) {
                setShowOverrideModal(false)
                resetOverrideForm()
                fetchOverrides(overrideYear, overrideMonth)
            } else {
                alert(res.error?.message || '저장에 실패했습니다.')
            }
        } catch {
            alert('서버 요청 중 오류가 발생했습니다.')
        } finally {
            setSavingOverride(false)
        }
    }

    const handleDeleteOverride = async (ovr: ScheduleOverride) => {
        if (!confirm(`정말로 ${ovr.date}의 특수 일과 오버라이드를 삭제하시겠습니까?`)) return
        try {
            const res = await apiDelete(`/admin/config/schedule-overrides/${ovr.date}`)
            if (res.success) {
                fetchOverrides(overrideYear, overrideMonth)
            } else {
                alert(res.error?.message || '삭제에 실패했습니다.')
            }
        } catch {
            alert('서버 요청 중 오류가 발생했습니다.')
        }
    }

    // --- Holiday CRUD ---
    const resetHolidayForm = () => {
        setHolDate('')
        setHolName('')
        setHolGrades({ 1: true, 2: true, 3: true })
        setHolIsNoSchool(true)
        setHolOverrideWeekend(false)
    }

    const handleSaveHoliday = async () => {
        if (!holDate || !holName.trim()) {
            alert('날짜와 휴일 이름은 필수 항목입니다.')
            return
        }

        setSavingHoliday(true)

        // Calculate grades array
        const selectedGrades = Object.entries(holGrades)
            .filter(([_, checked]) => checked)
            .map(([gradeStr]) => parseInt(gradeStr, 10))

        const body = {
            date: holDate,
            name: holName.trim(),
            grades: selectedGrades.length === 3 ? null : selectedGrades,
            is_no_school: holIsNoSchool,
            override_weekend: holOverrideWeekend
        }

        try {
            const res = await apiPost('/admin/config/holidays', body)
            if (res.success) {
                setShowHolidayModal(false)
                resetHolidayForm()
                fetchHolidays(holidayYear)
            } else {
                alert(res.error?.message || '저장에 실패했습니다.')
            }
        } catch {
            alert('서버 요청 중 오류가 발생했습니다.')
        } finally {
            setSavingHoliday(false)
        }
    }

    const handleDeleteHoliday = async (hol: Holiday) => {
        if (!confirm(`정말로 ${hol.date} 휴일을 삭제하시겠습니까?`)) return
        try {
            const res = await apiDelete(`/admin/config/holidays/${hol.date}`)
            if (res.success) {
                fetchHolidays(holidayYear)
            } else {
                alert(res.error?.message || '삭제에 실패했습니다.')
            }
        } catch {
            alert('서버 요청 중 오류가 발생했습니다.')
        }
    }

    // Month navigation helpers
    const changeOverrideMonth = (diff: number) => {
        let nextMonth = overrideMonth + diff
        let nextYear = overrideYear
        if (nextMonth > 12) {
            nextMonth = 1
            nextYear += 1
        } else if (nextMonth < 1) {
            nextMonth = 12
            nextYear -= 1
        }
        setOverrideYear(nextYear)
        setOverrideMonth(nextMonth)
        fetchOverrides(nextYear, nextMonth)
    }

    return (
        <VStack gap={SPACING.s32} style={{ padding: SPACING.s32, minHeight: '100vh', backgroundColor: COLORS.background.primary }}>
            {/* Header */}
            <HStack justify="between" align="center" fullWidth>
                <VStack gap={SPACING.s8}>
                    <Typo.XL color="primary" fontWeight="bold">일과 및 설정</Typo.XL>
                    <Typo.SM color="secondary">시간표의 교시별 일과 템플릿, 특수 오버라이드 일정 및 자체 휴일을 설정합니다.</Typo.SM>
                </VStack>

                {activeTab === 'templates' && (
                    <button
                        onClick={() => { resetTemplateForm(); setShowTemplateModal(true) }}
                        style={{
                            padding: `${SPACING.s8}px ${SPACING.s16}px`,
                            backgroundColor: COLORS.brand.primary,
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                        }}
                    >
                        <Typo.SM color="inverted" fontWeight="medium">+ 템플릿 추가</Typo.SM>
                    </button>
                )}

                {activeTab === 'overrides' && (
                    <button
                        onClick={() => { resetOverrideForm(); setShowOverrideModal(true) }}
                        style={{
                            padding: `${SPACING.s8}px ${SPACING.s16}px`,
                            backgroundColor: COLORS.brand.primary,
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                        }}
                    >
                        <Typo.SM color="inverted" fontWeight="medium">+ 특수 일과 지정</Typo.SM>
                    </button>
                )}

                {activeTab === 'holidays' && (
                    <button
                        onClick={() => { resetHolidayForm(); setShowHolidayModal(true) }}
                        style={{
                            padding: `${SPACING.s8}px ${SPACING.s16}px`,
                            backgroundColor: COLORS.brand.primary,
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                        }}
                    >
                        <Typo.SM color="inverted" fontWeight="medium">+ 휴일 지정</Typo.SM>
                    </button>
                )}
            </HStack>

            {/* Tab navigation */}
            <HStack gap={SPACING.s8} style={{ borderBottom: `1px solid ${COLORS.border.primary}`, paddingBottom: SPACING.s12 }} fullWidth>
                {(['templates', 'overrides', 'holidays'] as Tab[]).map((tab) => {
                    const label = tab === 'templates' ? '일과 템플릿 설정' : tab === 'overrides' ? '특수 일과 오버라이드' : '휴일 관리'
                    const isActive = activeTab === tab
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: `${SPACING.s8}px ${SPACING.s16}px`,
                                backgroundColor: isActive ? COLORS.brand.primary : 'transparent',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                            }}
                        >
                            <Typo.SM color={isActive ? 'inverted' : 'secondary'} fontWeight={isActive ? 'medium' : 'regular'}>
                                {label}
                            </Typo.SM>
                        </button>
                    )
                })}
            </HStack>

            {/* Error Message */}
            {error && (
                <HStack align="center" gap={SPACING.s8} style={{ padding: SPACING.s12, backgroundColor: COLORS.background.third, borderRadius: 8, border: `1px solid ${COLORS.text.wrong}` }}>
                    <Typo.SM color="wrong">{error}</Typo.SM>
                </HStack>
            )}

            {/* Loading Indicator */}
            {loading && (
                <VStack align="center" style={{ padding: SPACING.s32 }}>
                    <Typo.SM color="secondary">설정 데이터를 불러오는 중...</Typo.SM>
                </VStack>
            )}

            {/* Content view */}
            {!loading && !error && (
                <VStack gap={SPACING.s16} fullWidth>
                    {/* 1. Period Templates tab */}
                    {activeTab === 'templates' && (
                        <VStack gap={SPACING.s12} fullWidth>
                            <HStack align="center" style={{ padding: `${SPACING.s8}px ${SPACING.s16}px`, borderBottom: `1px solid ${COLORS.border.primary}` }} fullWidth>
                                <Typo.XS color="secondary" style={{ flex: 1.5 }}>템플릿 이름</Typo.XS>
                                <Typo.XS color="secondary" style={{ flex: 2 }}>설명</Typo.XS>
                                <Typo.XS color="secondary" style={{ flex: 1 }}>기본값 여부</Typo.XS>
                                <Typo.XS color="secondary" style={{ flex: 1 }}>대상 학년</Typo.XS>
                                <Typo.XS color="secondary" style={{ flex: 2 }}>일과 구성 요약</Typo.XS>
                                <Typo.XS color="secondary" style={{ width: 100 }}>관리</Typo.XS>
                            </HStack>

                            {templates.length === 0 ? (
                                <VStack align="center" style={{ padding: SPACING.s32 }} fullWidth>
                                    <Typo.SM color="secondary">등록된 일과 템플릿이 없습니다.</Typo.SM>
                                </VStack>
                            ) : (
                                templates.map((tpl) => {
                                    const id = extractId(tpl._id)
                                    const periodsCount = tpl.periods?.length || 0
                                    const hasHr = !!tpl.homeroom
                                    return (
                                        <HStack
                                            key={id || tpl.name}
                                            align="center"
                                            style={{
                                                padding: `${SPACING.s12}px ${SPACING.s16}px`,
                                                backgroundColor: COLORS.background.secondary,
                                                borderRadius: 10,
                                                border: `1px solid ${COLORS.border.primary}`
                                            }}
                                            fullWidth
                                        >
                                            <Typo.SM color="primary" fontWeight="bold" style={{ flex: 1.5 }}>{tpl.name}</Typo.SM>
                                            <Typo.SM color="secondary" style={{ flex: 2 }}>{tpl.description || '-'}</Typo.SM>
                                            <div style={{ flex: 1 }}>
                                                {tpl.is_default ? (
                                                    <span style={{ padding: '2px 8px', backgroundColor: COLORS.brand.third, borderRadius: 4, fontSize: 11, color: COLORS.text.primary }}>기본 일과</span>
                                                ) : (
                                                    <Typo.XS color="secondary">-</Typo.XS>
                                                )}
                                            </div>
                                            <Typo.SM color="primary" style={{ flex: 1 }}>{tpl.grade ? `${tpl.grade}학년` : '공통'}</Typo.SM>
                                            <Typo.XS color="secondary" style={{ flex: 2 }}>
                                                {`총 ${periodsCount}개 교시`}{hasHr && ' (조례 포함)'}
                                            </Typo.XS>
                                            <HStack gap={SPACING.s12} style={{ width: 100 }}>
                                                <button onClick={() => handleOpenEditTemplate(tpl)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                    <Typo.XS color="secondary">수정</Typo.XS>
                                                </button>
                                                <button onClick={() => handleDeleteTemplate(tpl)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                    <Typo.XS color="wrong">삭제</Typo.XS>
                                                </button>
                                            </HStack>
                                        </HStack>
                                    )
                                })
                            )}
                        </VStack>
                    )}

                    {/* 2. Schedule Overrides tab */}
                    {activeTab === 'overrides' && (
                        <VStack gap={SPACING.s16} fullWidth>
                            {/* Month Filter selector */}
                            <HStack align="center" gap={SPACING.s16}>
                                <button
                                    onClick={() => changeOverrideMonth(-1)}
                                    style={{ padding: `${SPACING.s6}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 6, cursor: 'pointer' }}
                                >
                                    <Typo.SM color="primary">◀ 이전 달</Typo.SM>
                                </button>
                                <Typo.MD color="primary" fontWeight="bold">
                                    {overrideYear}년 {overrideMonth}월
                                </Typo.MD>
                                <button
                                    onClick={() => changeOverrideMonth(1)}
                                    style={{ padding: `${SPACING.s6}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 6, cursor: 'pointer' }}
                                >
                                    <Typo.SM color="primary">다음 달 ▶</Typo.SM>
                                </button>
                            </HStack>

                            <VStack gap={SPACING.s12} fullWidth>
                                <HStack align="center" style={{ padding: `${SPACING.s8}px ${SPACING.s16}px`, borderBottom: `1px solid ${COLORS.border.primary}` }} fullWidth>
                                    <Typo.XS color="secondary" style={{ flex: 1.5 }}>날짜</Typo.XS>
                                    <Typo.XS color="secondary" style={{ flex: 2 }}>오버라이드 템플릿</Typo.XS>
                                    <Typo.XS color="secondary" style={{ flex: 1 }}>일과 없음 (휴업)</Typo.XS>
                                    <Typo.XS color="secondary" style={{ flex: 3 }}>메모</Typo.XS>
                                    <Typo.XS color="secondary" style={{ width: 80 }}>관리</Typo.XS>
                                </HStack>

                                {overrides.length === 0 ? (
                                    <VStack align="center" style={{ padding: SPACING.s32 }} fullWidth>
                                        <Typo.SM color="secondary">지정된 특수 일과가 없습니다.</Typo.SM>
                                    </VStack>
                                ) : (
                                    overrides.map((ovr) => {
                                        // Match template name
                                        const matchingTemplate = templates.find(t => extractId(t._id) === extractId(ovr.template_id))
                                        return (
                                            <HStack
                                                key={ovr.date}
                                                align="center"
                                                style={{
                                                    padding: `${SPACING.s12}px ${SPACING.s16}px`,
                                                    backgroundColor: COLORS.background.secondary,
                                                    borderRadius: 10,
                                                    border: `1px solid ${COLORS.border.primary}`
                                                }}
                                                fullWidth
                                            >
                                                <Typo.SM color="primary" fontWeight="bold" style={{ flex: 1.5 }}>{ovr.date}</Typo.SM>
                                                <Typo.SM color="primary" style={{ flex: 2 }}>
                                                    {ovr.is_no_school ? '-' : matchingTemplate ? matchingTemplate.name : '알 수 없는 템플릿'}
                                                </Typo.SM>
                                                <Typo.SM style={{ flex: 1, color: ovr.is_no_school ? COLORS.text.wrong : COLORS.text.secondary }}>
                                                    {ovr.is_no_school ? '휴업일 지정됨' : '아니오'}
                                                </Typo.SM>
                                                <Typo.SM color="secondary" style={{ flex: 3 }}>{ovr.note || '-'}</Typo.SM>
                                                <HStack gap={SPACING.s12} style={{ width: 80 }}>
                                                    <button onClick={() => handleDeleteOverride(ovr)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                        <Typo.XS color="wrong">삭제</Typo.XS>
                                                    </button>
                                                </HStack>
                                            </HStack>
                                        )
                                    })
                                )}
                            </VStack>
                        </VStack>
                    )}

                    {/* 3. Holidays tab */}
                    {activeTab === 'holidays' && (
                        <VStack gap={SPACING.s16} fullWidth>
                            {/* Year filter selector */}
                            <HStack align="center" gap={SPACING.s16}>
                                <button
                                    onClick={() => { const next = holidayYear - 1; setHolidayYear(next); fetchHolidays(next) }}
                                    style={{ padding: `${SPACING.s6}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 6, cursor: 'pointer' }}
                                >
                                    <Typo.SM color="primary">◀ 이전 해</Typo.SM>
                                </button>
                                <Typo.MD color="primary" fontWeight="bold">
                                    {holidayYear}년 휴일 목록
                                </Typo.MD>
                                <button
                                    onClick={() => { const next = holidayYear + 1; setHolidayYear(next); fetchHolidays(next) }}
                                    style={{ padding: `${SPACING.s6}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, border: `1px solid ${COLORS.border.primary}`, borderRadius: 6, cursor: 'pointer' }}
                                >
                                    <Typo.SM color="primary">다음 해 ▶</Typo.SM>
                                </button>
                            </HStack>

                            <VStack gap={SPACING.s12} fullWidth>
                                <HStack align="center" style={{ padding: `${SPACING.s8}px ${SPACING.s16}px`, borderBottom: `1px solid ${COLORS.border.primary}` }} fullWidth>
                                    <Typo.XS color="secondary" style={{ flex: 1.5 }}>날짜</Typo.XS>
                                    <Typo.XS color="secondary" style={{ flex: 2 }}>휴일 명칭</Typo.XS>
                                    <Typo.XS color="secondary" style={{ flex: 1 }}>대상 학년</Typo.XS>
                                    <Typo.XS color="secondary" style={{ flex: 1 }}>수업 없음 (휴업)</Typo.XS>
                                    <Typo.XS color="secondary" style={{ flex: 1.5 }}>주말 오버라이드</Typo.XS>
                                    <Typo.XS color="secondary" style={{ width: 80 }}>관리</Typo.XS>
                                </HStack>

                                {holidays.length === 0 ? (
                                    <VStack align="center" style={{ padding: SPACING.s32 }} fullWidth>
                                        <Typo.SM color="secondary">등록된 자체 휴일 정보가 없습니다.</Typo.SM>
                                    </VStack>
                                ) : (
                                    holidays.map((hol) => {
                                        return (
                                            <HStack
                                                key={hol.date}
                                                align="center"
                                                style={{
                                                    padding: `${SPACING.s12}px ${SPACING.s16}px`,
                                                    backgroundColor: COLORS.background.secondary,
                                                    borderRadius: 10,
                                                    border: `1px solid ${COLORS.border.primary}`
                                                }}
                                                fullWidth
                                            >
                                                <Typo.SM color="primary" fontWeight="bold" style={{ flex: 1.5 }}>{hol.date}</Typo.SM>
                                                <Typo.SM color="primary" style={{ flex: 2 }}>{hol.name}</Typo.SM>
                                                <Typo.SM color="primary" style={{ flex: 1 }}>
                                                    {hol.grades && hol.grades.length > 0 ? hol.grades.map(g => `${g}학년`).join(', ') : '전체 학년'}
                                                </Typo.SM>
                                                <Typo.SM style={{ flex: 1, color: hol.is_no_school ? COLORS.text.wrong : COLORS.text.secondary }}>
                                                    {hol.is_no_school ? '예' : '아니오'}
                                                </Typo.SM>
                                                <Typo.SM color="secondary" style={{ flex: 1.5 }}>
                                                    {hol.override_weekend ? '주말 휴일 강제 적용' : '기본 적용'}
                                                </Typo.SM>
                                                <HStack gap={SPACING.s12} style={{ width: 80 }}>
                                                    <button onClick={() => handleDeleteHoliday(hol)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                        <Typo.XS color="wrong">삭제</Typo.XS>
                                                    </button>
                                                </HStack>
                                            </HStack>
                                        )
                                    })
                                )}
                            </VStack>
                        </VStack>
                    )}
                </VStack>
            )}

            {/* --- Modals --- */}

            {/* 1. Period Template Modal */}
            {showTemplateModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
                    <VStack
                        gap={SPACING.s24}
                        style={{
                            width: 580,
                            maxHeight: '90vh',
                            padding: SPACING.s32,
                            backgroundColor: COLORS.background.secondary,
                            borderRadius: 16,
                            border: `1px solid ${COLORS.border.primary}`,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            overflowY: 'auto'
                        }}
                    >
                        <HStack justify="between" align="center" fullWidth>
                            <Typo.LG color="primary" fontWeight="bold">
                                {editingTemplate ? '일과 템플릿 수정' : '일과 템플릿 추가'}
                            </Typo.LG>
                            <button onClick={() => { setShowTemplateModal(false); resetTemplateForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Typo.LG color="secondary">✕</Typo.LG>
                            </button>
                        </HStack>

                        <VStack gap={SPACING.s16} fullWidth>
                            <VStack gap={SPACING.s6} fullWidth>
                                <Typo.XS color="secondary">템플릿 이름 *</Typo.XS>
                                <input
                                    value={tempName}
                                    onChange={e => setTempName(e.target.value)}
                                    placeholder="예: 정규 7교시 일과, 단축 45분 일과"
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
                                <Typo.XS color="secondary">설명</Typo.XS>
                                <input
                                    value={tempDesc}
                                    onChange={e => setTempDesc(e.target.value)}
                                    placeholder="템플릿 상세 설명 (선택)"
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

                            <HStack gap={SPACING.s16} fullWidth>
                                <VStack gap={SPACING.s6} style={{ flex: 1 }}>
                                    <Typo.XS color="secondary">대상 학년 (선택)</Typo.XS>
                                    <select
                                        value={tempGrade}
                                        onChange={e => setTempGrade(e.target.value)}
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
                                        <option value="">전체 공통</option>
                                        <option value="1">1학년</option>
                                        <option value="2">2학년</option>
                                        <option value="3">3학년</option>
                                    </select>
                                </VStack>

                                <HStack align="center" gap={SPACING.s8} style={{ flex: 1, marginTop: 20 }}>
                                    <input
                                        type="checkbox"
                                        id="tempIsDefault"
                                        checked={tempIsDefault}
                                        onChange={e => setTempIsDefault(e.target.checked)}
                                        style={{ width: 16, height: 16, accentColor: COLORS.brand.primary }}
                                    />
                                    <label htmlFor="tempIsDefault" style={{ cursor: 'pointer' }}>
                                        <Typo.SM color="primary">기본 일과로 설정</Typo.SM>
                                    </label>
                                </HStack>
                            </HStack>

                            {/* Lunch break configuration */}
                            <HStack gap={SPACING.s16} fullWidth style={{ borderTop: `1px solid ${COLORS.border.primary}`, paddingTop: SPACING.s12 }}>
                                <VStack gap={SPACING.s6} style={{ flex: 1 }}>
                                    <Typo.XS color="secondary">점심시간 시작</Typo.XS>
                                    <input
                                        value={tempLunchStart}
                                        onChange={e => setTempLunchStart(e.target.value)}
                                        placeholder="예: 12:50"
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
                                <VStack gap={SPACING.s6} style={{ flex: 1 }}>
                                    <Typo.XS color="secondary">점심시간 길이 (분)</Typo.XS>
                                    <input
                                        type="number"
                                        value={tempLunchDuration}
                                        onChange={e => setTempLunchDuration(e.target.value)}
                                        placeholder="예: 60"
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
                            </HStack>

                            {/* Homeroom schedule */}
                            <VStack gap={SPACING.s10} fullWidth style={{ borderTop: `1px solid ${COLORS.border.primary}`, paddingTop: SPACING.s12 }}>
                                <HStack align="center" gap={SPACING.s8}>
                                    <input
                                        type="checkbox"
                                        id="hasHomeroom"
                                        checked={hasHomeroom}
                                        onChange={e => setHasHomeroom(e.target.checked)}
                                        style={{ width: 16, height: 16, accentColor: COLORS.brand.primary }}
                                    />
                                    <label htmlFor="hasHomeroom" style={{ cursor: 'pointer' }}>
                                        <Typo.SM color="primary">조례/종례 시간대 활성화</Typo.SM>
                                    </label>
                                </HStack>

                                {hasHomeroom && (
                                    <HStack gap={SPACING.s16} fullWidth>
                                        <VStack gap={SPACING.s6} style={{ flex: 1 }}>
                                            <Typo.XS color="secondary">시작 시각</Typo.XS>
                                            <input
                                                value={tempHomeroomStart}
                                                onChange={e => setTempHomeroomStart(e.target.value)}
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
                                        <VStack gap={SPACING.s6} style={{ flex: 1 }}>
                                            <Typo.XS color="secondary">종료 시각</Typo.XS>
                                            <input
                                                value={tempHomeroomEnd}
                                                onChange={e => setTempHomeroomEnd(e.target.value)}
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
                                    </HStack>
                                )}
                            </VStack>

                            {/* Periods times editor */}
                            <VStack gap={SPACING.s8} fullWidth style={{ borderTop: `1px solid ${COLORS.border.primary}`, paddingTop: SPACING.s12 }}>
                                <Typo.SM color="primary" fontWeight="bold">교시 시각 설정</Typo.SM>
                                <VStack gap={SPACING.s8} fullWidth>
                                    {tempPeriods.map((p, idx) => (
                                        <HStack key={p.period} align="center" gap={SPACING.s12} fullWidth>
                                            <Typo.SM color="primary" style={{ width: 60 }}>{p.period}교시</Typo.SM>
                                            <input
                                                type="text"
                                                value={p.start}
                                                onChange={e => handlePeriodTimeChange(idx, 'start', e.target.value)}
                                                placeholder="시작 (HH:MM)"
                                                style={{
                                                    flex: 1,
                                                    padding: `${SPACING.s8}px ${SPACING.s10}px`,
                                                    backgroundColor: COLORS.background.third,
                                                    border: `1px solid ${COLORS.border.primary}`,
                                                    borderRadius: 8,
                                                    color: COLORS.text.primary,
                                                    fontSize: 13,
                                                    outline: 'none',
                                                }}
                                            />
                                            <Typo.XS color="secondary">~</Typo.XS>
                                            <input
                                                type="text"
                                                value={p.end}
                                                onChange={e => handlePeriodTimeChange(idx, 'end', e.target.value)}
                                                placeholder="종료 (HH:MM)"
                                                style={{
                                                    flex: 1,
                                                    padding: `${SPACING.s8}px ${SPACING.s10}px`,
                                                    backgroundColor: COLORS.background.third,
                                                    border: `1px solid ${COLORS.border.primary}`,
                                                    borderRadius: 8,
                                                    color: COLORS.text.primary,
                                                    fontSize: 13,
                                                    outline: 'none',
                                                }}
                                            />
                                        </HStack>
                                    ))}
                                </VStack>
                            </VStack>
                        </VStack>

                        <HStack gap={SPACING.s12} justify="end" fullWidth>
                            <button
                                onClick={() => { setShowTemplateModal(false); resetTemplateForm() }}
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
                                onClick={handleSaveTemplate}
                                disabled={savingTemplate}
                                style={{
                                    padding: `${SPACING.s10}px ${SPACING.s20}px`,
                                    backgroundColor: savingTemplate ? COLORS.background.third : COLORS.brand.primary,
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: savingTemplate ? 'not-allowed' : 'pointer',
                                    color: 'white',
                                }}
                            >
                                <Typo.SM color="inverted" fontWeight="medium">
                                    {savingTemplate ? '저장 중...' : '저장'}
                                </Typo.SM>
                            </button>
                        </HStack>
                    </VStack>
                </div>
            )}

            {/* 2. Schedule Override Modal */}
            {showOverrideModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
                    <VStack
                        gap={SPACING.s24}
                        style={{
                            width: 440,
                            padding: SPACING.s32,
                            backgroundColor: COLORS.background.secondary,
                            borderRadius: 16,
                            border: `1px solid ${COLORS.border.primary}`,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        }}
                    >
                        <HStack justify="between" align="center" fullWidth>
                            <Typo.LG color="primary" fontWeight="bold">특수 일과 오버라이드 추가</Typo.LG>
                            <button onClick={() => { setShowOverrideModal(false); resetOverrideForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Typo.LG color="secondary">✕</Typo.LG>
                            </button>
                        </HStack>

                        <VStack gap={SPACING.s16} fullWidth>
                            <VStack gap={SPACING.s6} fullWidth>
                                <Typo.XS color="secondary">지정할 날짜 *</Typo.XS>
                                <input
                                    type="date"
                                    value={overDate}
                                    onChange={e => setOverDate(e.target.value)}
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

                            <HStack align="center" gap={SPACING.s8} fullWidth>
                                <input
                                    type="checkbox"
                                    id="overIsNoSchool"
                                    checked={overIsNoSchool}
                                    onChange={e => setOverIsNoSchool(e.target.checked)}
                                    style={{ width: 16, height: 16, accentColor: COLORS.brand.primary }}
                                />
                                <label htmlFor="overIsNoSchool" style={{ cursor: 'pointer' }}>
                                    <Typo.SM color="primary">휴업일 / 수업 없음으로 설정</Typo.SM>
                                </label>
                            </HStack>

                            {!overIsNoSchool && (
                                <VStack gap={SPACING.s6} fullWidth>
                                    <Typo.XS color="secondary">시간표 템플릿 선택 *</Typo.XS>
                                    <select
                                        value={overTemplateId}
                                        onChange={e => setOverTemplateId(e.target.value)}
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
                                        <option value="">선택해주세요</option>
                                        {templates.map(t => (
                                            <option key={extractId(t._id)} value={extractId(t._id)}>
                                                {t.name} ({t.grade ? `${t.grade}학년` : '공통'})
                                            </option>
                                        ))}
                                    </select>
                                </VStack>
                            )}

                            <VStack gap={SPACING.s6} fullWidth>
                                <Typo.XS color="secondary">메모 / 사유</Typo.XS>
                                <input
                                    value={overNote}
                                    onChange={e => setOverNote(e.target.value)}
                                    placeholder="예: 단축수업 진행, 학교 개교기념일 행사"
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
                        </VStack>

                        <HStack gap={SPACING.s12} justify="end" fullWidth>
                            <button
                                onClick={() => { setShowOverrideModal(false); resetOverrideForm() }}
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
                                onClick={handleSaveOverride}
                                disabled={savingOverride}
                                style={{
                                    padding: `${SPACING.s10}px ${SPACING.s20}px`,
                                    backgroundColor: savingOverride ? COLORS.background.third : COLORS.brand.primary,
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: savingOverride ? 'not-allowed' : 'pointer',
                                    color: 'white',
                                }}
                            >
                                <Typo.SM color="inverted" fontWeight="medium">
                                    {savingOverride ? '저장 중...' : '저장'}
                                </Typo.SM>
                            </button>
                        </HStack>
                    </VStack>
                </div>
            )}

            {/* 3. Holiday Modal */}
            {showHolidayModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
                    <VStack
                        gap={SPACING.s24}
                        style={{
                            width: 440,
                            padding: SPACING.s32,
                            backgroundColor: COLORS.background.secondary,
                            borderRadius: 16,
                            border: `1px solid ${COLORS.border.primary}`,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        }}
                    >
                        <HStack justify="between" align="center" fullWidth>
                            <Typo.LG color="primary" fontWeight="bold">자체 휴일 추가</Typo.LG>
                            <button onClick={() => { setShowHolidayModal(false); resetHolidayForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Typo.LG color="secondary">✕</Typo.LG>
                            </button>
                        </HStack>

                        <VStack gap={SPACING.s16} fullWidth>
                            <VStack gap={SPACING.s6} fullWidth>
                                <Typo.XS color="secondary">휴일 날짜 *</Typo.XS>
                                <input
                                    type="date"
                                    value={holDate}
                                    onChange={e => setHolDate(e.target.value)}
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
                                <Typo.XS color="secondary">휴일 명칭 *</Typo.XS>
                                <input
                                    value={holName}
                                    onChange={e => setHolName(e.target.value)}
                                    placeholder="예: 개교기념일, 재량휴업일"
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
                                <Typo.XS color="secondary">적용 대상 학년</Typo.XS>
                                <HStack gap={SPACING.s16} style={{ padding: `${SPACING.s4}px 0` }}>
                                    {[1, 2, 3].map(grade => (
                                        <HStack key={grade} align="center" gap={SPACING.s6}>
                                            <input
                                                type="checkbox"
                                                id={`holGrade-${grade}`}
                                                checked={holGrades[grade]}
                                                onChange={e => setHolGrades({ ...holGrades, [grade]: e.target.checked })}
                                                style={{ width: 16, height: 16, accentColor: COLORS.brand.primary }}
                                            />
                                            <label htmlFor={`holGrade-${grade}`} style={{ cursor: 'pointer' }}>
                                                <Typo.SM color="primary">{grade}학년</Typo.SM>
                                            </label>
                                        </HStack>
                                    ))}
                                </HStack>
                            </VStack>

                            <HStack align="center" gap={SPACING.s8} fullWidth>
                                <input
                                    type="checkbox"
                                    id="holIsNoSchool"
                                    checked={holIsNoSchool}
                                    onChange={e => setHolIsNoSchool(e.target.checked)}
                                    style={{ width: 16, height: 16, accentColor: COLORS.brand.primary }}
                                />
                                <label htmlFor="holIsNoSchool" style={{ cursor: 'pointer' }}>
                                    <Typo.SM color="primary">수업 없음 (휴업일) 지정</Typo.SM>
                                </label>
                            </HStack>

                            <HStack align="center" gap={SPACING.s8} fullWidth>
                                <input
                                    type="checkbox"
                                    id="holOverrideWeekend"
                                    checked={holOverrideWeekend}
                                    onChange={e => setHolOverrideWeekend(e.target.checked)}
                                    style={{ width: 16, height: 16, accentColor: COLORS.brand.primary }}
                                />
                                <label htmlFor="holOverrideWeekend" style={{ cursor: 'pointer' }}>
                                    <Typo.SM color="primary">주말에도 강제 적용 (토/일요일 겹칠 때)</Typo.SM>
                                </label>
                            </HStack>
                        </VStack>

                        <HStack gap={SPACING.s12} justify="end" fullWidth>
                            <button
                                onClick={() => { setShowHolidayModal(false); resetHolidayForm() }}
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
                                onClick={handleSaveHoliday}
                                disabled={savingHoliday}
                                style={{
                                    padding: `${SPACING.s10}px ${SPACING.s20}px`,
                                    backgroundColor: savingHoliday ? COLORS.background.third : COLORS.brand.primary,
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: savingHoliday ? 'not-allowed' : 'pointer',
                                    color: 'white',
                                }}
                            >
                                <Typo.SM color="inverted" fontWeight="medium">
                                    {savingHoliday ? '저장 중...' : '저장'}
                                </Typo.SM>
                            </button>
                        </HStack>
                    </VStack>
                </div>
            )}
        </VStack>
    )
}
