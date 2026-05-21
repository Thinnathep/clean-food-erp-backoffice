import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  Wallet, 
  Truck,
  Settings,
  LogOut,
  ChevronDown,
  ChefHat,
  UtensilsCrossed,
  Warehouse,
  Calculator,
  LayoutDashboard,
  Utensils,
  Store,
  ShoppingCart,
  ClipboardList,
  Factory,
  ShieldCheck,
  TrendingUp,
  FileBarChart,
  FileText,
  History,
  Rocket,
  Coins,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

// Custom icons to avoid missing imports
const Ticket = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
    <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
  </svg>
);

const PackageIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </svg>
);

interface SubNavItem {
  label: string;
  path?: string;
  icon?: any;
  end?: boolean;
  isHeader?: boolean;
}

interface NavItem {
  label: string;
  icon: any;
  path?: string;
  children?: SubNavItem[];
}

const navItems: NavItem[] = [
  { 
    label: 'งานห้องครัว (KDS)', 
    icon: ChefHat, 
    children: [
      { label: 'จัดการหน้าหลัก', path: '/kds', icon: LayoutDashboard, end: true },
      { label: 'ใบสั่งผลิต', path: '/kds/production', icon: Factory },
      { label: 'HACCP', path: '/kds/haccp', icon: ShieldCheck },
      { label: 'พยากรณ์', path: '/kds/forecast', icon: TrendingUp },
    ]
  },
  { 
    label: 'สมาชิก & โปรโมชั่น', 
    icon: Users, 
    children: [
      { label: 'จัดการสมาชิก', path: '/members', icon: Users },
      { label: 'โปรโมชั่น', path: '/promotions', icon: Ticket },
    ]
  },
  { 
    label: 'สต็อกวัตถุดิบ', 
    icon: Warehouse,
    children: [
      { label: 'จัดการวัตถุดิบ', path: '/inventory/items', icon: PackageIcon },
      { label: 'เช็คสต็อก', path: '/inventory/stock', icon: Warehouse },
    ]
  },
  { 
    label: 'จัดซื้อ', 
    icon: ShoppingCart,
    children: [
      { label: 'ใบสั่งซื้อ (PO)', path: '/procurement', icon: ShoppingCart, end: true },
      { label: 'รับสินค้า (GR)', path: '/procurement/receiving', icon: ClipboardList },
    ]
  },
  { 
    label: 'จัดการเมนูอาหาร', 
    icon: BookOpen, 
    children: [
      { label: 'เมนูสมาชิก', path: '/menu/member', icon: Utensils },
      { label: 'เมนูร้าน', path: '/menu/retail', icon: Store },
    ]
  },
  { 
    label: 'บัญชีและการเงิน', 
    icon: Wallet, 
    children: [
      { label: 'ภาพรวม', isHeader: true },
      { label: 'แดชบอร์ดการเงิน', path: '/finance', icon: LayoutDashboard, end: true },
      { label: 'ประวัติธุรกรรม', path: '/finance/history', icon: History },
      
      { label: 'ปฏิบัติการ (Operation)', isHeader: true },
      { label: 'บันทึกรายรับ', path: '/finance/income', icon: TrendingUp },
      { label: 'บันทึกรายจ่าย', path: '/finance/expense', icon: TrendingDown },
      { label: 'เงินสด (Cash Recon)', path: '/finance/cash_recon', icon: Coins },
      
      { label: 'เอกสาร & รายงาน', isHeader: true },
      { label: 'ใบเสร็จ/ใบกำกับภาษี', path: '/finance/invoices', icon: FileText },
      { label: 'งบกำไรขาดทุน (P&L)', path: '/finance/pl', icon: FileBarChart },
      
      { label: 'วิเคราะห์ & ตั้งค่า', isHeader: true },
      { label: 'ลูกค้า (LTV)', path: '/finance/customers', icon: Users },
      { label: 'โปรโมชั่น', path: '/finance/promotions', icon: Rocket },
      { label: 'จำลองการแยกเงิน', path: '/finance/simulator', icon: Calculator },
      { label: 'ตั้งค่าบัญชี', path: '/finance/settings', icon: Settings },
    ]
  },
  { 
    label: 'ระบบจัดส่ง', 
    icon: Truck, 
    children: [
      { label: 'แดชบอร์ดจัดส่ง', path: '/logistics', icon: LayoutDashboard, end: true },
      { label: 'คำนวณค่าจัดส่ง', path: '/logistics/calculator', icon: Calculator },
    ]
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  setMobileOpen: (open: boolean) => void;
}

const isPathActive = (item: NavItem, currentPath: string) => {
  if (item.path === currentPath) return true;
  if (item.children) {
    return item.children.some((child) => {
      if (child.end) return currentPath === child.path;
      return currentPath.startsWith(child.path);
    });
  }
  return false;
};

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setMobileOpen }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const mobileOpen = isMobileOpen || false;
  const effectiveExpanded = isExpanded || mobileOpen;

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: effectiveExpanded ? 260 : 72,
          x: mobileOpen ? 0 : (window.innerWidth < 1280 ? -260 : 0)
        }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="fixed left-0 top-0 h-full bg-[#0F172A] border-r border-slate-800 z-[9999] flex flex-col shadow-2xl overflow-hidden font-prompt"
      >
        <div className="h-16 flex items-center px-5 shrink-0 border-b border-slate-800/50">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <UtensilsCrossed size={18} />
          </div>
          <AnimatePresence>
            {effectiveExpanded && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-3 whitespace-nowrap"
              >
                <h1 className="text-sm font-normal text-white tracking-tight leading-none mb-1 uppercase">Clean Food</h1>
                <p className="text-[10px] text-emerald-500 font-normal tracking-[0.2em] uppercase opacity-70">ERP System</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-hide">
          {navItems.map((item) => {
            const hasChildren = !!item.children;
            const isOpen = openMenus.includes(item.label);
            const isActive = isPathActive(item, location.pathname);

            return (
              <div key={item.label} className="relative">
                {hasChildren ? (
                  <button
                    onClick={() => {
                      if (!effectiveExpanded) setIsExpanded(true);
                      toggleMenu(item.label);
                    }}
                    className={`w-full flex items-center rounded-lg transition-all font-normal text-sm whitespace-nowrap group relative h-11
                      ${effectiveExpanded ? 'px-3 gap-3' : 'justify-center'}
                      ${isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                  >
                    <item.icon size={20} className="shrink-0" />
                    {effectiveExpanded && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 text-left">{item.label}</motion.span>
                    )}
                    {effectiveExpanded && (
                      <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                ) : (
                  <NavLink
                    to={item.path || ''}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center rounded-lg transition-all font-normal text-sm whitespace-nowrap group relative h-11
                      ${effectiveExpanded ? 'px-3 gap-3' : 'justify-center'}
                      ${isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                  >
                    <item.icon size={20} className="relative z-10 shrink-0" />
                    {effectiveExpanded && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">{item.label}</motion.span>
                    )}
                  </NavLink>
                )}

                <AnimatePresence>
                  {hasChildren && effectiveExpanded && isOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-1 border-l border-slate-800 overflow-hidden"
                    >
                      {item.children?.map((child, idx) => (
                        child.isHeader ? (
                          <div key={`header-${idx}`} className="px-4 py-2 mt-2 mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {child.label}
                          </div>
                        ) : (
                          <NavLink
                            key={child.path || idx}
                            to={child.path || ''}
                            end={child.end}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-normal text-[11px] whitespace-nowrap
                              ${isActive ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-500 hover:text-white hover:bg-white/5'}`
                            }
                          >
                            {child.icon && <child.icon size={12} className="shrink-0" />}
                            {child.label}
                          </NavLink>
                        )
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
        
        <div className="px-2 py-3 border-t border-slate-800 flex flex-col gap-1">
          <div className={`w-full flex items-center transition-all duration-300 rounded-lg hover:bg-white/5 cursor-pointer overflow-hidden ${effectiveExpanded ? 'px-3 py-2 gap-3' : 'h-11 justify-center'}`}>
             <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-normal shadow-sm border border-white/10">
               {user?.name?.charAt(0) || 'A'}
             </div>
             {effectiveExpanded && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
                 <p className="text-xs font-normal text-white truncate leading-none mb-1">{user?.name}</p>
                 <p className="text-[9px] text-slate-500 uppercase tracking-widest font-normal">{user?.role}</p>
               </motion.div>
             )}
          </div>

          <NavLink to="/settings" className={({ isActive }) => `flex items-center w-full rounded-lg transition-all font-normal text-sm ${isActive ? 'text-white bg-white/10 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'} ${effectiveExpanded ? 'px-3 py-2 gap-3' : 'h-11 justify-center'}`}>
            <Settings size={18} className="shrink-0" />
            {effectiveExpanded && <span>ตั้งค่าระบบ</span>}
          </NavLink>

          <button onClick={logout} className={`flex items-center w-full rounded-lg transition-all font-normal text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 ${effectiveExpanded ? 'px-3 py-2 gap-3' : 'h-11 justify-center'}`}>
            <LogOut size={18} className="shrink-0" />
            {effectiveExpanded && <span>ออกจากระบบ</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
};
