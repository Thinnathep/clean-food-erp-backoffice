import React, { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ChevronDown, Plus, X, Loader2, Globe, EyeOff } from 'lucide-react'
import {
  fetchMealPlanForWeek, fetchWeeklyPlan,
  upsertWeeklyPlan, clearMealSlot, publishWeekMeals, unpublishWeekMeals
} from '../api'
import { usePlannerStore } from '../../../store/kdsStore'
import { useAuthStore } from '../../../store/authStore'
import { getWeekDates, formatDateTH, formatWeekLabel, dayjs, toISO } from '../../../lib/dateUtils'
import { DAY_LABELS, MEAL_TYPES, MEAL_TYPE_LABELS, CATEGORY_COLORS, type PintoMealPlan, type MealType } from '../../../types'
import MenuPanel from './MenuPanel'

export const WeeklyPlanner = () => {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const qc = useQueryClient()
  const { currentWeekStart, prevWeek, nextWeek, goToToday, selectedDate, selectedMealType, selectSlot } = usePlannerStore()

  const weekDates = getWeekDates(dayjs(currentWeekStart))
  const today = toISO(dayjs())
  const isCurrentWeek = currentWeekStart === toISO(dayjs().startOf('isoWeek' as any))

  // Fetch week plan header
  const { data: plan } = useQuery({
    queryKey: ['weekly_plan', currentWeekStart],
    queryFn: () => fetchWeeklyPlan(currentWeekStart),
  })

  // Fetch pinto_meal_plan slots for this week
  const { data: mealSlots = [], isLoading } = useQuery({
    queryKey: ['meal_plan_week', currentWeekStart],
    queryFn: () => fetchMealPlanForWeek(currentWeekStart),
    staleTime: 1000 * 30,
  })

  const createPlanMutation = useMutation({
    mutationFn: () => upsertWeeklyPlan(currentWeekStart),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly_plan', currentWeekStart] }),
  })

  const clearSlotMutation = useMutation({
    mutationFn: ({ date, mealType }: { date: string; mealType: MealType }) =>
      clearMealSlot(date, mealType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_plan_week', currentWeekStart] }),
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      let p = plan
      if (!p) p = await upsertWeeklyPlan(currentWeekStart)
      await publishWeekMeals(currentWeekStart, p.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly_plan', currentWeekStart] })
      qc.invalidateQueries({ queryKey: ['meal_plan_week', currentWeekStart] })
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishWeekMeals(currentWeekStart, plan!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly_plan', currentWeekStart] })
      qc.invalidateQueries({ queryKey: ['meal_plan_week', currentWeekStart] })
    },
  })

  const getSlot = useCallback((date: string, mealType: MealType): PintoMealPlan | undefined => {
    return mealSlots.find(s => s.delivery_date === date && s.meal_type === mealType)
  }, [mealSlots])

  // Stats
  const filledSlots = mealSlots.filter(s => s.menu_item_id).length
  const publishedSlots = mealSlots.filter(s => s.is_published).length
  const isPublished = plan?.status === 'published'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, letterSpacing: '2px' }}>🍳 KITCHEN PLANNER</span>
              {isCurrentWeek && <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '20px' }}>สัปดาห์นี้</span>}
              {isPublished && <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '20px' }}>🌐 เผยแพร่แล้ว</span>}
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>{formatWeekLabel(dayjs(currentWeekStart))}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={prevWeek} style={navBtnStyle}><ChevronLeft size={16} /></button>
            <button onClick={goToToday} style={{ ...navBtnStyle, padding: '6px 14px', fontSize: '12px', fontWeight: 'bold' }}>วันนี้</button>
            <button onClick={nextWeek} style={navBtnStyle}><ChevronRight size={16} /></button>

            {filledSlots > 0 && !isPublished && (
              <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} style={{ ...actionBtnStyle, background: '#10b981', color: 'white', border: 'none' }}>
                <Globe size={14} />
                {publishMutation.isPending ? 'กำลัง...' : `เผยแพร่ (${filledSlots} มื้อ)`}
              </button>
            )}
            {isPublished && (
              <button onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending} style={{ ...actionBtnStyle, color: '#f59e0b', borderColor: '#f59e0b' }}>
                <EyeOff size={14} />
                ยกเลิกเผยแพร่
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <StatChip label="วางแผนแล้ว" value={`${filledSlots}/14 มื้อ`} color="#f59e0b" />
          <StatChip label="เผยแพร่แล้ว" value={`${publishedSlots} มื้อ`} color="#10b981" />
          <StatChip label="สถานะ" value={isPublished ? 'เผยแพร่' : 'ร่าง'} color={isPublished ? '#10b981' : '#64748b'} />
        </div>

        {/* No plan prompt */}
        {!plan && !isLoading && (
          <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📋</div>
            <p style={{ color: '#64748b', fontWeight: 'bold', marginBottom: '20px' }}>ยังไม่มีแผนสัปดาห์นี้</p>
            <button onClick={() => createPlanMutation.mutate()} style={{ ...actionBtnStyle, background: '#10b981', color: 'white', border: 'none', padding: '10px 24px' }}>
              <Plus size={16} /> สร้างแผนสัปดาห์นี้
            </button>
          </div>
        )}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 size={28} className="animate-spin" style={{ color: '#10b981' }} />
          </div>
        )}

        {/* Planner Grid */}
        {!isLoading && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `72px repeat(7, minmax(130px, 1fr))`, gap: '8px', minWidth: '980px' }}>

              {/* Day headers */}
              <div />
              {weekDates.map((date: any, i: number) => {
                const dateStr = toISO(date)
                const isToday = dateStr === today
                return (
                  <div key={i} style={{ padding: '12px 6px', textAlign: 'center', borderRadius: '12px', background: isToday ? 'rgba(16,185,129,0.05)' : 'white', border: isToday ? '2px solid #10b981' : '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px' }}>{DAY_LABELS[i]}</div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: isToday ? '#10b981' : '#1e293b' }}>{formatDateTH(date)}</div>
                  </div>
                )
              })}

              {/* Meal rows */}
              {MEAL_TYPES.map(mealType => (
                <React.Fragment key={mealType}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 10px 8px 0', fontSize: '11px', color: '#64748b', fontWeight: 900 }}>
                    {MEAL_TYPE_LABELS[mealType]}
                  </div>
                  {weekDates.map((date: any, dayIdx: number) => {
                    const dateStr = toISO(date)
                    const slot = getSlot(dateStr, mealType)
                    const isSelected = selectedDate === dateStr && selectedMealType === mealType
                    const menu = slot?.menu_item
                    const catColor = menu ? (CATEGORY_COLORS[menu.category] ?? '#10b981') : undefined

                    return (
                      <div
                        key={dayIdx}
                        onClick={() => { if (!plan) createPlanMutation.mutate(); selectSlot(dateStr, mealType) }}
                        style={{
                          minHeight: '100px', borderRadius: '12px', cursor: 'pointer',
                          border: isSelected ? '2px solid #10b981' : slot?.menu_item_id ? `1px solid ${catColor}40` : '1px dashed #cbd5e1',
                          background: isSelected ? 'rgba(16,185,129,0.05)' : slot?.is_published ? `${catColor}10` : slot?.menu_item_id ? 'white' : '#f8fafc',
                          padding: '10px', transition: 'all 0.2s',
                          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          position: 'relative',
                          boxShadow: slot?.menu_item_id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                        }}
                      >
                        {slot?.is_published && (
                          <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                        )}
                        {menu ? (
                          <>
                            <div>
                              <div style={{ fontSize: '9px', fontWeight: 900, color: catColor, marginBottom: '4px', textTransform: 'uppercase' }}>{menu.category}</div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', lineHeight: 1.3 }}>{menu.name}</div>
                              {menu.calories > 0 && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>{menu.calories} kcal</div>}
                            </div>
                            {isAdmin && (
                              <button
                                onClick={e => { e.stopPropagation(); clearSlotMutation.mutate({ date: dateStr, mealType }) }}
                                style={{ alignSelf: 'flex-end', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', borderRadius: '6px' }}
                              >
                                <X size={10} />
                              </button>
                            )}
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                            {isSelected ? <ChevronDown size={16} className="animate-bounce" style={{ color: '#10b981' }} /> : <Plus size={16} style={{ opacity: 0.5 }} />}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      <MenuPanel weekStart={currentWeekStart} weekPlanId={plan?.id ?? null} />
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      <div>
        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontSize: '14px', fontWeight: 900, color }}>{value}</div>
      </div>
    </div>
  )
}

const navBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }
const actionBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', cursor: 'pointer', fontSize: '13px', fontWeight: 800, transition: 'all 0.2s' }
