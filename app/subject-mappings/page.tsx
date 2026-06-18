'use client'

import { useState, useEffect, useCallback } from 'react'
import { VStack } from '@/components/general/VStack'
import { HStack } from '@/components/general/HStack'
import Typo from '@/components/general/Typo'
import { COLORS } from '@/constants/colors'
import { SPACING } from '@/constants/spacing'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import type { SubjectMapping } from '@/types/api'

export default function SubjectMappingsPage() {
    const [mappings, setMappings] = useState<SubjectMapping[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [editingMapping, setEditingMapping] = useState<SubjectMapping | null>(null)

    // Form states
    const [formRaw, setFormRaw] = useState('')
    const [formDisplay, setFormDisplay] = useState('')
    const [formRoom, setFormRoom] = useState('')
    const [formColorId, setFormColorId] = useState('')
    const [formAliases, setFormAliases] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchMappings = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await apiGet<SubjectMapping[]>('/admin/subject-mappings')
            if (res.success && res.data) {
                setMappings(res.data)
            } else {
                setError(res.error?.message || '과목 매핑 목록을 불러오는 데 실패했습니다.')
            }
        } catch {
            setError('API 요청 중 에러가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchMappings()
    }, [fetchMappings])

    const resetForm = () => {
        setFormRaw('')
        setFormDisplay('')
        setFormRoom('')
        setFormColorId('')
        setFormAliases('')
        setEditingMapping(null)
    }

    const handleOpenAddModal = () => {
        resetForm()
        setShowModal(true)
    }

    const handleOpenEditModal = (mapping: SubjectMapping) => {
        setEditingMapping(mapping)
        setFormRaw(mapping.raw)
        setFormDisplay(mapping.display)
        setFormRoom(mapping.room || '')
        setFormColorId(mapping.color_id || '')
        setFormAliases(mapping.aliases ? mapping.aliases.join(', ') : '')
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!formRaw.trim() || !formDisplay.trim()) {
            alert('원본 과목명과 표시 과목명은 필수 입력 사항입니다.')
            return
        }
        setSaving(true)

        const aliasesArray = formAliases
            ? formAliases.split(',').map(s => s.trim()).filter(Boolean)
            : []

        const body = {
            raw: formRaw.trim(),
            display: formDisplay.trim(),
            room: formRoom.trim() || null,
            color_id: formColorId.trim() || null,
            aliases: aliasesArray,
            teacher_overrides: editingMapping ? editingMapping.teacher_overrides : [],
        }

        try {
            let res
            if (editingMapping && editingMapping._id) {
                const idString = typeof editingMapping._id === 'object' && editingMapping._id !== null
                    ? (editingMapping._id as any).$oid
                    : editingMapping._id
                res = await apiPut(`/admin/subject-mappings/${idString}`, body)
            } else {
                res = await apiPost('/admin/subject-mappings', body)
            }

            if (res.success) {
                setShowModal(false)
                resetForm()
                fetchMappings()
            } else {
                alert(res.error?.message || '과목 매핑 데이터를 저장하는 데 실패했습니다.')
            }
        } catch {
            alert('저장 중 서버 에러가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (mapping: SubjectMapping) => {
        if (!confirm('정말로 이 과목 매핑 설정을 삭제하시겠습니까?')) return
        const idString = mapping._id && typeof mapping._id === 'object'
            ? (mapping._id as any).$oid
            : mapping._id

        if (!idString) return

        try {
            const res = await apiDelete(`/admin/subject-mappings/${idString}`)
            if (res.success) {
                fetchMappings()
            } else {
                alert(res.error?.message || '삭제에 실패했습니다.')
            }
        } catch {
            alert('삭제 요청 중 서버 에러가 발생했습니다.')
        }
    }

    return (
        <VStack gap={SPACING.s32} style={{ padding: SPACING.s32, minHeight: '100vh', backgroundColor: COLORS.background.primary }}>
            <HStack justify="between" align="center" fullWidth>
                <VStack gap={SPACING.s8}>
                    <Typo.XL color="primary" fontWeight="bold">과목 매핑 관리</Typo.XL>
                    <Typo.SM color="secondary">시간표 동기화 시 수집되는 교과 명칭을 표시명과 매핑합니다.</Typo.SM>
                </VStack>
                <button
                    onClick={handleOpenAddModal}
                    style={{
                        padding: `${SPACING.s8}px ${SPACING.s16}px`,
                        backgroundColor: COLORS.brand.primary,
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                    }}
                >
                    <Typo.SM color="inverted" fontWeight="medium">+ 매핑 추가</Typo.SM>
                </button>
            </HStack>

            {error && (
                <HStack align="center" gap={SPACING.s8} style={{ padding: SPACING.s12, backgroundColor: COLORS.background.third, borderRadius: 8, border: `1px solid ${COLORS.text.wrong}` }}>
                    <Typo.SM color="wrong">{error}</Typo.SM>
                </HStack>
            )}

            <VStack gap={SPACING.s8} fullWidth>
                {loading && (
                    <VStack align="center" style={{ padding: SPACING.s32 }}>
                        <Typo.SM color="secondary">로딩 중...</Typo.SM>
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
                                borderBottom: `1px solid ${COLORS.border.primary}`,
                            }}
                        >
                            <Typo.XS color="secondary" style={{ flex: 2 }}>원본 과목명 (Raw)</Typo.XS>
                            <Typo.XS color="secondary" style={{ flex: 2 }}>표시용 과목명 (Display)</Typo.XS>
                            <Typo.XS color="secondary" style={{ flex: 3 }}>별칭 (Aliases)</Typo.XS>
                            <Typo.XS color="secondary" style={{ flex: 1.5 }}>교실 (Room)</Typo.XS>
                            <Typo.XS color="secondary" style={{ flex: 1 }}>색상 ID</Typo.XS>
                            <Typo.XS color="secondary" style={{ width: 80 }}>관리</Typo.XS>
                        </HStack>

                        {mappings.length === 0 && (
                            <VStack align="center" style={{ padding: SPACING.s32 }}>
                                <Typo.SM color="secondary">등록된 과목 매핑 정보가 없습니다.</Typo.SM>
                            </VStack>
                        )}

                        {mappings.map(map => {
                            const mapId = typeof map._id === 'object' && map._id !== null ? (map._id as any).$oid : map._id
                            return (
                                <HStack
                                    key={mapId || map.raw}
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
                                    <Typo.SM color="primary" fontWeight="medium" style={{ flex: 2 }}>{map.raw}</Typo.SM>
                                    <Typo.SM color="primary" style={{ flex: 2 }}>{map.display}</Typo.SM>
                                    <Typo.XS color="secondary" style={{ flex: 3 }}>
                                        {map.aliases && map.aliases.length > 0 ? map.aliases.join(', ') : '없음'}
                                    </Typo.XS>
                                    <Typo.XS color="secondary" style={{ flex: 1.5 }}>{map.room || '-'}</Typo.XS>
                                    <Typo.XS color="secondary" style={{ flex: 1 }}>{map.color_id || '-'}</Typo.XS>
                                    <HStack gap={SPACING.s8} style={{ width: 80 }}>
                                        <button onClick={() => handleOpenEditModal(map)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                            <Typo.XS color="secondary">수정</Typo.XS>
                                        </button>
                                        <button onClick={() => handleDelete(map)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                            <Typo.XS color="wrong">삭제</Typo.XS>
                                        </button>
                                    </HStack>
                                </HStack>
                            )
                        })}
                    </>
                )}
            </VStack>

            {showModal && (
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
                            <Typo.LG color="primary" fontWeight="bold">{editingMapping ? '매핑 정보 수정' : '매핑 정보 추가'}</Typo.LG>
                            <button onClick={() => { setShowModal(false); resetForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Typo.LG color="secondary">✕</Typo.LG>
                            </button>
                        </HStack>

                        <VStack gap={SPACING.s12} fullWidth>
                            <VStack gap={SPACING.s6} fullWidth>
                                <Typo.XS color="secondary">원본 과목명 (Raw)</Typo.XS>
                                <input
                                    value={formRaw}
                                    onChange={e => setFormRaw(e.target.value)}
                                    placeholder="시간표 수집 시 원본 과목명"
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
                                <Typo.XS color="secondary">표시용 과목명 (Display)</Typo.XS>
                                <input
                                    value={formDisplay}
                                    onChange={e => setFormDisplay(e.target.value)}
                                    placeholder="학생들에게 보여줄 표준 이름"
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
                                <Typo.XS color="secondary">교실 위치 (Room - 선택)</Typo.XS>
                                <input
                                    value={formRoom}
                                    onChange={e => setFormRoom(e.target.value)}
                                    placeholder="예: 음악실, 제1컴퓨터실"
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

                            <HStack gap={SPACING.s12} fullWidth>
                                <VStack gap={SPACING.s6} style={{ flex: 1 }}>
                                    <Typo.XS color="secondary">구글캘린더 색상 ID (선택)</Typo.XS>
                                    <input
                                        value={formColorId}
                                        onChange={e => setFormColorId(e.target.value)}
                                        placeholder="1~11번 색상"
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

                            <VStack gap={SPACING.s6} fullWidth>
                                <Typo.XS color="secondary">별칭들 (Aliases - 쉼표로 구분)</Typo.XS>
                                <input
                                    value={formAliases}
                                    onChange={e => setFormAliases(e.target.value)}
                                    placeholder="예: 진영A, 진로영어"
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
                                onClick={() => { setShowModal(false); resetForm() }}
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
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    padding: `${SPACING.s10}px ${SPACING.s20}px`,
                                    backgroundColor: saving ? COLORS.background.third : COLORS.brand.primary,
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    color: 'white',
                                }}
                            >
                                <Typo.SM color="inverted" fontWeight="medium">
                                    {saving ? '저장 중...' : '저장'}
                                </Typo.SM>
                            </button>
                        </HStack>
                    </VStack>
                </div>
            )}
        </VStack>
    )
}
