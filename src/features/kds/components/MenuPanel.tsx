import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, X, ChevronRight } from 'lucide-react'
import { fetchMenuItems, upsertMealSlot, upsertWeeklyPlan } from '../api'
import { usePlannerStore } from '../../../store/kdsStore'
import { CATEGORY_COLORS, DAY_LABELS, MEAL_TYPE_LABELS, type MenuItem, type MealType } from '../../../types'
import { dayjs } from '../../../lib/dateUtils'

interface Props {
  weekStart: string
  weekPlanId: string | null
}

export default function MenuPanel({ weekStart, weekPlanId }: Props) {
  const qc = useQueryClient()
  const { selectedDate, selectedMealType, isPanelOpen, clearSelection, categoryFilter, setCategoryFilter } = usePlannerStore()
  const [localSearch, setLocalSearch] = useState('')

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menu_items'],
    queryFn: fetchMenuItems,
    staleTime: 1000 * 60 * 10,
  })

  const assignMutation = useMutation({
    mutationFn: async (menu: MenuItem) => {
      // ถ้ายังไม่มี plan สร้างก่อน
      let planId = weekPlanId
      if (!planId) {
        const plan = await upsertWeeklyPlan(weekStart)
        planId = plan.id
        qc.invalidateQueries({ queryKey: ['weekly_plan', weekStart] })
      }
      return upsertMealSlot({
        delivery_date: selectedDate!,
        meal_type: selectedMealType as MealType,
        menu_item_id: menu.id,
        menu_name: menu.name,
        calories: menu.calories,
        protein: menu.protein,
        carbs: menu.carbs,
        fat: menu.fat,
        price: menu.base_price,
        week_plan_id: planId,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal_plan_week', weekStart] })
      clearSelection()
    },
  })

  // Get all unique categories from menu_items
  const categories = useMemo(() => [...new Set(menuItems.map(m => m.category))].sort(), [menuItems])

  const filtered = useMemo(() => menuItems.filter(m => {
    const q = localSearch.toLowerCase()
    return (!q || m.name.toLowerCase().includes(q) || m.tags?.join(' ').toLowerCase().includes(q))
      && (!categoryFilter || m.category === categoryFilter)
  }), [menuItems, localSearch, categoryFilter])

  // Group by category
  const grouped = useMemo(() => {
    const g: Record<string, MenuItem[]> = {}
    filtered.forEach(m => { if (!g[m.category]) g[m.category] = []; g[m.category].push(m) })
    return g
  }, [filtered])

  const isOpen = isPanelOpen && selectedDate !== null && selectedMealType !== null
  const dayIndex = isOpen ? dayjs(selectedDate).isoWeekday() - 1 : 0

  return (
    <div style={{ width: isOpen ? '340px' : '0', minWidth: isOpen ? '340px' : '0', overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, boxShadow: isOpen ? '-4px 0 20px rgba(0,0,0,0.05)' : 'none' }}>
      {isOpen && (
        <>
          {/* Header */}
          <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>เลือกเมนู</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                  {MEAL_TYPE_LABELS[selectedMealType as MealType]} — วัน{DAY_LABELS[dayIndex]}
                </div>
              </div>
              <button onClick={clearSelection} style={{ background: '#f8fafc', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '6px', borderRadius: '10px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                placeholder="ค้นหาเมนูอาหาร..."
                style={{ width: '100%', padding: '12px 12px 12px 40px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', fontSize: '13px', fontWeight: 600, outline: 'none', transition: 'all 0.2s' }}
              />
            </div>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={() => setCategoryFilter('')} style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', background: !categoryFilter ? '#0f172a' : '#f1f5f9', color: !categoryFilter ? 'white' : '#64748b', border: 'none' }}>
                ทั้งหมด
              </button>
              {categories.map(cat => {
                const color = CATEGORY_COLORS[cat] ?? '#10b981'
                const active = categoryFilter === cat
                return (
                  <button key={cat} onClick={() => setCategoryFilter(active ? '' : cat)} style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', background: active ? `${color}20` : '#f1f5f9', color: active ? color : '#64748b', border: 'none' }}>
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Menu list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#fcfdfe' }}>
            {isLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 700 }}>กำลังโหลด...</div>}
            {!isLoading && filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px', fontWeight: 700 }}>ไม่พบเมนูที่ค้นหา</div>}

            {Object.entries(grouped).map(([cat, items]) => {
              const color = CATEGORY_COLORS[cat] ?? '#10b981'
              return (
                <div key={cat} style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '1.5px', color, padding: '4px 8px', marginBottom: '8px', textTransform: 'uppercase' }}>
                    {cat} ({items.length})
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {items.map(menu => (
                      <button
                        key={menu.id}
                        onClick={() => assignMutation.mutate(menu)}
                        disabled={assignMutation.isPending}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'white', border: '1px solid #eef2f6', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = color + '40';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#eef2f6';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>{menu.name}</div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>
                            {menu.calories > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>🔥 {menu.calories} kcal</span>}
                            {menu.protein > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>🥩 P{menu.protein}g</span>}
                          </div>
                        </div>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                           <ChevronRight size={16} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
