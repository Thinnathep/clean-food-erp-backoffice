import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, ChevronRight } from 'lucide-react'
import { fetchMenuItems } from '../api'
import { useKdsStore } from '../../../store/kdsStore'
import { type MenuItem } from '../../../types'

interface Props {
  onSelect: (menu: MenuItem) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  'main': '#10b981',
  'soup': '#3b82f6',
  'salad': '#f59e0b',
  'dessert': '#8b5cf6'
}
const CATEGORIES = Object.keys(CATEGORY_COLORS)
const PROTEIN_FILTERS = ['ทั้งหมด', 'ไก่', 'หมู', 'กุ้ง', 'ผัก', 'ไข่']

export default function MenuPanel({ onSelect }: Props) {
  const selectedDay = useKdsStore(state => state.selectedMenuId); // Rough mapping for now
  const { isMenuPanelOpen, setSelectedMenuId } = useKdsStore();
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('')
  const [protein, setProtein] = useState('ทั้งหมด')

  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: fetchMenuItems,
    staleTime: 1000 * 60 * 10,
  })

  const filtered = useMemo(() => {
    return menus.filter(m => {
      const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase())
      const matchCat = !category || m.category === category
      const matchProtein = true // Simplified as protein_type is missing
      return matchSearch && matchCat && matchProtein
    })
  }, [menus, search, category, protein])

  // Group by category
  const grouped = useMemo(() => {
    const g: Record<string, MenuItem[]> = {}
    filtered.forEach(m => {
      if (!g[m.category]) g[m.category] = []
      g[m.category].push(m)
    })
    return g
  }, [filtered])

  const isOpen = isMenuPanelOpen && selectedDay !== null && selectedSlot !== null

  return (
    <div style={{
      width: isOpen ? '300px' : '0',
      minWidth: isOpen ? '300px' : '0',
      overflow: 'hidden',
      transition: 'width 0.25s ease, min-width 0.25s ease',
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {isOpen && (
        <>
          {/* Header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600, letterSpacing: '1px' }}>เลือกเมนู</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  มื้อที่ {selectedSlot} — วัน{['จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์'][selectedDay!]}
                </div>
              </div>
              <button onClick={clearSelection} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาเมนู..."
                style={{
                  width: '100%', padding: '8px 10px 8px 32px', background: 'var(--bg-card)',
                  border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)',
                  fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Protein filter pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {PROTEIN_FILTERS.map(p => (
                <button
                  key={p}
                  onClick={() => setProtein(p)}
                  style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    background: protein === p ? 'var(--accent-amber)' : 'var(--bg-card)',
                    color: protein === p ? '#0f1410' : 'var(--text-secondary)',
                    border: 'none',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCategory('')}
                style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                  background: !category ? 'var(--bg-elevated)' : 'none',
                  color: !category ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                ทั้งหมด
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat === category ? '' : cat)}
                  style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '10px', cursor: 'pointer',
                    background: category === cat ? `${CATEGORY_COLORS[cat]}20` : 'none',
                    color: category === cat ? CATEGORY_COLORS[cat] : 'var(--text-muted)',
                    border: `1px solid ${category === cat ? CATEGORY_COLORS[cat] + '60' : 'var(--border)'}`,
                  }}
                >
                  {cat.split('/')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Menu List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {isLoading && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>กำลังโหลด...</div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>ไม่พบเมนู</div>
            )}
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '1px',
                  color: CATEGORY_COLORS[cat as MenuCategory] || 'var(--text-muted)',
                  padding: '4px 8px', marginBottom: '4px',
                }}>
                  {cat} ({items.length})
                </div>
                {items.map(menu => (
                  <button
                    key={menu.id}
                    onClick={() => onSelect(menu)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 10px', marginBottom: '2px', background: 'var(--bg-card)',
                      border: `1px solid ${CATEGORY_COLORS[menu.category]}20`,
                      borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{menu.name_th}</div>
                      {menu.protein_type && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>🥩 {menu.protein_type}</div>
                      )}
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
