import { NavLink } from 'react-router-dom'
import { CalendarDays, UtensilsCrossed, LayoutGrid, Settings } from 'lucide-react'

const NAV = [
  { to: '/', icon: <UtensilsCrossed size={18} />, label: 'วันนี้' },
  { to: '/planner', icon: <CalendarDays size={18} />, label: 'วางแผน' },
  { to: '/templates', icon: <LayoutGrid size={18} />, label: 'แม่แบบ' },
  { to: '/menus', icon: <LayoutGrid size={18} />, label: 'เมนูทั้งหมด' },
  { to: '/setup', icon: <Settings size={18} />, label: 'ตั้งค่า' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: '64px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '16px',
      gap: '4px',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ width: '36px', height: '36px', background: 'var(--accent-green)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '18px' }}>
        🥗
      </div>

      {NAV.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          title={item.label}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            padding: '10px 6px',
            borderRadius: '10px',
            color: isActive ? 'var(--accent-green)' : 'var(--text-muted)',
            background: isActive ? 'rgba(74,222,128,0.1)' : 'none',
            textDecoration: 'none',
            fontSize: '9px',
            fontWeight: 600,
            width: '52px',
            textAlign: 'center',
            transition: 'all 0.15s',
          })}
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </aside>
  )
}
