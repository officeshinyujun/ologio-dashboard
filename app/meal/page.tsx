'use client'

import { useState, useEffect } from 'react'
import { VStack } from '@/components/general/VStack'
import { HStack } from '@/components/general/HStack'
import Typo from '@/components/general/Typo'
import { COLORS } from '@/constants/colors'
import { SPACING } from '@/constants/spacing'
import { apiGet, apiPost } from '@/lib/api'
import type { Meal, MealItem } from '@/types/api'

const ALLERGEN_LABELS: Record<number, string> = {
    1: '난류', 2: '우유', 3: '메밀', 4: '땅콩', 5: '대두', 6: '밀',
    7: '고등어', 8: '게', 9: '새우', 10: '돼지고기', 11: '복숭아',
    12: '토마토', 13: '아황산류', 14: '호두', 15: '닭고기', 16: '쇠고기',
    17: '오징어', 18: '조개류',
}

const ALLERGENS = Object.values(ALLERGEN_LABELS)

function parseAllergens(items: MealItem[]): string[] {
    const codes = new Set<number>()
    for (const item of items) {
        if (item.allergy_code) {
            for (const code of item.allergy_code.split('.')) {
                const num = parseInt(code, 10)
                if (!isNaN(num) && ALLERGEN_LABELS[num]) {
                    codes.add(num)
                }
            }
        }
    }
    return Array.from(codes).map(c => ALLERGEN_LABELS[c])
}

export default function MealPage() {
    const [weekMeals, setWeekMeals] = useState<Meal[]>([])
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
    const [activeAllergens, setActiveAllergens] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchWeek() {
            setLoading(true)
            setError(null)
            const res = await apiGet<Meal[]>('/meal/week')
            if (res.success && res.data) {
                setWeekMeals(res.data)
                if (res.data.length > 0) {
                    setSelectedDate(res.data[0].date)
                }
            } else {
                setError(res.error?.message ?? '주간 급식을 불러올 수 없습니다.')
            }
            setLoading(false)
        }
        fetchWeek()
    }, [])

    useEffect(() => {
        if (!selectedDate) return
        async function fetchDay() {
            setLoading(true)
            setError(null)
            const res = await apiGet<Meal>(`/meal?date=${selectedDate}`)
            if (res.success && res.data) {
                setSelectedMeal(res.data)
            } else {
                setSelectedMeal(null)
                setError(res.error?.message ?? '급식 정보를 불러올 수 없습니다.')
            }
            setLoading(false)
        }
        fetchDay()
    }, [selectedDate])

    const toggleAllergen = (a: string) => {
        setActiveAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
    }

    const mealAllergens = selectedMeal?.items ? parseAllergens(selectedMeal.items) : []
    const noMeal = selectedMeal && (!selectedMeal.existence || selectedMeal.rest)

    return (
        <VStack gap={SPACING.s32} style={{ padding: SPACING.s32, minHeight: '100vh', backgroundColor: COLORS.background.primary }}>
            <HStack justify="between" align="center" fullWidth>
                <VStack gap={SPACING.s8}>
                    <Typo.XL color="primary" fontWeight="bold">급식 관리</Typo.XL>
                    <Typo.SM color="secondary">주간 식단 및 알레르기 정보를 확인합니다.</Typo.SM>
                </VStack>
                <HStack gap={SPACING.s10}>
                    <button onClick={async () => { const r = await apiPost('/admin/sync/meal'); if (r.success) { alert('급식 동기화 요청됨'); const w = await apiGet<Meal[]>('/meal/week'); if (w.success && w.data) setWeekMeals(w.data); } }} style={{ padding: `${SPACING.s8}px ${SPACING.s16}px`, backgroundColor: COLORS.brand.primary, border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                        <Typo.SM color="inverted" fontWeight="medium">NEIS 급식 동기화</Typo.SM>
                    </button>
                </HStack>
            </HStack>

            {error && (
                <HStack style={{ padding: `${SPACING.s8}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, borderRadius: 8, border: `1px solid ${COLORS.calendar.tomato}` }}>
                    <Typo.SM color="wrong">{error}</Typo.SM>
                </HStack>
            )}

            <HStack gap={SPACING.s20} fullWidth align="start">
                <VStack gap={SPACING.s8} style={{ width: 160, flexShrink: 0 }}>
                    <Typo.XS color="secondary" fontWeight="medium">날짜 선택</Typo.XS>
                    {weekMeals.map(meal => (
                        <button
                            key={meal.date}
                            onClick={() => setSelectedDate(meal.date)}
                            style={{
                                padding: `${SPACING.s10}px ${SPACING.s14}px`,
                                backgroundColor: selectedDate === meal.date ? COLORS.background.fourth : COLORS.background.secondary,
                                border: `1px solid ${selectedDate === meal.date ? COLORS.brand.primary : COLORS.border.primary}`,
                                borderRadius: 8,
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            <Typo.SM color={selectedDate === meal.date ? 'brand' : 'secondary'}>{meal.date}</Typo.SM>
                        </button>
                    ))}
                </VStack>

                <VStack gap={SPACING.s16} style={{ flex: 1 }}>
                    <VStack
                        gap={SPACING.s12}
                        style={{
                            padding: SPACING.s16,
                            backgroundColor: COLORS.background.secondary,
                            borderRadius: 12,
                            border: `1px solid ${COLORS.border.primary}`,
                        }}
                    >
                        <HStack justify="between" align="center" fullWidth>
                            <Typo.SM color="primary" fontWeight="semi-bold">오늘의 식단</Typo.SM>
                            {selectedDate && <Typo.XXS color="secondary">{selectedDate}</Typo.XXS>}
                        </HStack>
                        <VStack gap={SPACING.s6}>
                            {loading ? (
                                <Typo.XS color="secondary">로딩 중...</Typo.XS>
                            ) : noMeal ? (
                                <Typo.XS color="secondary">급식 없음</Typo.XS>
                            ) : selectedMeal?.items && selectedMeal.items.length > 0 ? (
                                selectedMeal.items.map((item, i) => (
                                    <HStack key={i} align="center" gap={SPACING.s8}>
                                        <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: COLORS.text.secondary, flexShrink: 0 }} />
                                        <Typo.XS color="primary">{item.name}</Typo.XS>
                                        {item.allergy_code && (
                                            <Typo.XXS color="secondary">({item.allergy_code})</Typo.XXS>
                                        )}
                                    </HStack>
                                ))
                            ) : (
                                <Typo.XS color="secondary">식단 정보가 없습니다.</Typo.XS>
                            )}
                        </VStack>
                    </VStack>

                    <VStack gap={SPACING.s16} style={{ padding: SPACING.s20, backgroundColor: COLORS.background.secondary, borderRadius: 12, border: `1px solid ${COLORS.border.primary}` }}>
                        <HStack justify="between" align="center" fullWidth>
                            <Typo.MD color="primary" fontWeight="semi-bold">알레르기 유발 물질</Typo.MD>
                            <Typo.XXS color="secondary">해당 식단의 알레르기 태그</Typo.XXS>
                        </HStack>
                        <HStack gap={SPACING.s8} wrap="wrap">
                            {ALLERGENS.map(a => {
                                const isPresent = mealAllergens.includes(a)
                                const isHighlighted = activeAllergens.includes(a)
                                return (
                                    <button
                                        key={a}
                                        onClick={() => toggleAllergen(a)}
                                        style={{
                                            padding: `${SPACING.s4}px ${SPACING.s10}px`,
                                            backgroundColor: isHighlighted ? COLORS.calendar.tomato : isPresent ? COLORS.background.fourth : COLORS.background.third,
                                            border: `1px solid ${isHighlighted ? COLORS.calendar.tomato : isPresent ? COLORS.brand.secondary : COLORS.border.primary}`,
                                            borderRadius: 20,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Typo.XXS color={isPresent ? 'primary' : 'secondary'}>{a}</Typo.XXS>
                                    </button>
                                )
                            })}
                        </HStack>
                        {activeAllergens.length > 0 && (
                            <HStack align="center" gap={SPACING.s8} style={{ padding: `${SPACING.s8}px ${SPACING.s12}px`, backgroundColor: COLORS.background.third, borderRadius: 8, border: `1px solid ${COLORS.calendar.tomato}` }}>
                                <Typo.XS color="wrong">주의:</Typo.XS>
                                <Typo.XS color="secondary">{activeAllergens.join(', ')} 알레르기 필터 활성화됨</Typo.XS>
                            </HStack>
                        )}
                    </VStack>
                </VStack>
            </HStack>
        </VStack>
    )
}
