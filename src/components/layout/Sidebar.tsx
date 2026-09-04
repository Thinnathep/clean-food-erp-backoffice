import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Users, BookOpen, Wallet, Truck, Settings, LogOut,
  ChevronDown, ChefHat, UtensilsCrossed, Warehouse, Calculator,
  LayoutDashboard, Utensils, Store, ShoppingCart, Factory,
  ShieldCheck, TrendingUp, FileBarChart, FileText, History,
  Coins, TrendingDown, ClipboardCheck, Package as PackageLucide,
  Map, MapPin, Smartphone, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { useAuthStore } from '../../store/authStore';

// Custom icons
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

// ─── Organized Navigation with Clear Sub-group Headers ───
const navItems: NavItem[] = [
  { 
    label: 'งานห้องครัว (KDS)', 
    icon: ChefHat, 
    children: [
      { label: 'การผลิต & จัดการครัว', isHeader: true },
      { label: 'แดชบอร์ดครัว (KDS)', path: '/kds', icon: LayoutDashboard, end: true },
      { label: 'ใบสั่งผลิตอาหาร', path: '/kds/production', icon: Factory },
      
      { label: 'เตรียมของ & คุณภาพ', isHeader: true },
      { label: 'เช็คลิสต์เตรียมของ', path: '/kds/checklist', icon: ClipboardCheck },
      { label: 'ความปลอดภัย HACCP', path: '/kds/haccp', icon: ShieldCheck },
      { label: 'พยากรณ์ยอดสั่ง', path: '/kds/forecast', icon: TrendingUp },
    ]
  },
  { 
    label: 'สมาชิก & โปรโมชั่น', 
    icon: Users, 
    children: [
      { label: 'ข้อมูลลูกค้า', isHeader: true },
      { label: 'จัดการสมาชิก', path: '/members', icon: Users },
      
      { label: 'การขาย & จัดส่งกลุ่ม', isHeader: true },
      { label: 'โปรโมชั่น & เซลล์เดสก์', path: '/promotions', icon: Ticket },
      { label: 'จุดส่งและออเดอร์กลุ่ม', path: '/logistics/drop-points', icon: MapPin },
    ]
  },
  { 
    label: 'สต็อกวัตถุดิบ', 
    icon: Warehouse,
    children: [
      { label: 'คลังวัตถุดิบ', isHeader: true },
      { label: 'จัดการวัตถุดิบ', path: '/inventory/items', icon: PackageIcon },
      { label: 'เช็คสต็อก & รับของเข้า', path: '/inventory/stock', icon: Warehouse },
    ]
  },
  { 
    label: 'จัดซื้อ & รับสินค้า', 
    path: '/procurement', 
    icon: ShoppingCart
  },
  { 
    label: 'จัดการเมนูอาหาร', 
    icon: BookOpen, 
    children: [
      { label: 'รายการอาหาร', isHeader: true },
      { label: 'เมนูสมาชิก (ปิ่นโต)', path: '/menu/member', icon: Utensils },
      { label: 'เมนูหน้าร้าน (Retail)', path: '/menu/retail', icon: Store },
      
      { label: 'การตั้งค่า', isHeader: true },
      { label: 'ตั้งค่าเปิด-ปิดเมนู', path: '/menu/settings', icon: Settings },
    ]
  },
  { 
    label: 'บัญชีและการเงิน', 
    icon: Wallet, 
    children: [
      { label: 'ระบบบัญชี 7 กองทุน', isHeader: true },
      { label: 'แดชบอร์ดการเงิน', path: '/finance', icon: LayoutDashboard, end: true },
      { label: 'ประวัติธุรกรรม', path: '/finance/history', icon: History },
      
      { label: 'ปฏิบัติการรายวัน', isHeader: true },
      { label: 'บันทึกรายรับ', path: '/finance/income', icon: TrendingUp },
      { label: 'บันทึกรายจ่าย', path: '/finance/expense', icon: TrendingDown },
      { label: 'กระทบยอดเงินสด', path: '/finance/cash_recon', icon: Coins },
      
      { label: 'เอกสาร & ภาษี', isHeader: true },
      { label: 'ใบเสร็จ / ใบกำกับภาษี', path: '/finance/invoices', icon: FileText },
      { label: 'งบกำไรขาดทุน (P&L)', path: '/finance/pl', icon: FileBarChart },
      
      { label: 'วิเคราะห์ & วางแผน', isHeader: true },
      { label: 'จำลองการแยกเงิน', path: '/finance/simulator', icon: Calculator },
      { label: 'วิเคราะห์ลูกค้า (LTV)', path: '/finance/customers', icon: Users },
      { label: 'ตั้งค่าสัดส่วนกองทุน', path: '/finance/settings', icon: Settings },
    ]
  },
  { 
    label: 'การจัดส่ง', 
    icon: Truck,
    children: [
      { label: 'ปฏิบัติการจัดส่ง', isHeader: true },
      { label: 'จัดถุงเตรียมส่ง', path: '/logistics/packing', icon: PackageLucide },
      { label: 'จัดการเส้นทาง', path: '/logistics/routes', icon: Map },
      
      { label: 'ค่าบริการ', isHeader: true },
      { label: 'คำนวณค่าจัดส่ง', path: '/logistics/calculator', icon: Calculator },
    ]
  },
  { 
    label: 'คู่มือการใช้งาน', 
    path: '/manual', 
    icon: BookOpen 
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  setMobileOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

const isPathActive = (item: NavItem, currentPath: string) => {
  if (item.path === currentPath) return true;
  if (item.children) {
    return item.children.some((child) => {
      if (!child.path) return false;
      if (child.end) return currentPath === child.path;
      return currentPath.startsWith(child.path);
    });
  }
  return false;
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  isMobileOpen, 
  setMobileOpen,
  isCollapsed = false,
  setIsCollapsed
}) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  // Single active accordion at a time for clean, uncluttered UX
  const [activeMenu, setActiveMenu] = useState<string | null>(() => {
    const matched = navItems.find(item => isPathActive(item, location.pathname));
    return matched ? matched.label : null;
  });

  // Automatically switch active accordion on path change
  useEffect(() => {
    const matched = navItems.find(item => isPathActive(item, location.pathname));
    if (matched && matched.children) {
      setActiveMenu(matched.label);
    }
  }, [location.pathname]);

  const toggleMenu = (label: string) => {
    setActiveMenu(prev => (prev === label ? null : label));
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'ยืนยันออกจากระบบ?',
      text: 'คุณต้องการออกจากระบบ Clean Food CR ERP หรือไม่',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
      customClass: {
        popup: 'font-prompt rounded-3xl',
        confirmButton: 'rounded-xl font-bold px-5 py-2.5',
        cancelButton: 'rounded-xl font-bold px-5 py-2.5'
      }
    });

    if (result.isConfirmed) {
      logout();
    }
  };

  const mobileOpen = isMobileOpen || false;
  const showFullSidebar = mobileOpen || !isCollapsed;

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9990] xl:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed left-0 top-0 h-[100dvh] bg-[#0F172A] border-r border-slate-800 z-[9999] flex flex-col shadow-2xl overflow-hidden font-prompt transition-all duration-300 ${
          mobileOpen 
            ? 'translate-x-0 w-[270px]' 
            : `max-xl:-translate-x-full ${showFullSidebar ? 'w-[260px]' : 'w-[72px]'}`
        }`}
      >
        {/* ─── Brand Header (Clean: Logo + Title + Version) ─── */}
        <div className={`h-16 flex items-center shrink-0 border-b border-slate-800/80 bg-[#0B1120] ${showFullSidebar ? 'px-4 gap-3' : 'justify-center'}`}>
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <UtensilsCrossed size={18} />
          </div>
          {showFullSidebar && (
            <div className="min-w-0 flex-1 flex items-center justify-between">
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight leading-none uppercase truncate">
                  Clean Food
                </h1>
                <p className="text-[10px] text-emerald-400 font-medium tracking-[0.15em] uppercase mt-1">
                  ERP System
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                v2.1.6
              </span>
            </div>
          )}
        </div>
        
        {/* ─── Navigation Links (Clean & Direct Click) ─── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const hasChildren = !!item.children;
            const isOpen = activeMenu === item.label;
            const isActive = isPathActive(item, location.pathname);

            return (
              <div key={item.label} className="relative">
                {hasChildren ? (
                  <div>
                    {/* Parent Accordion Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isCollapsed && setIsCollapsed) {
                          setIsCollapsed(false);
                        }
                        toggleMenu(item.label);
                      }}
                      className={`w-full flex items-center rounded-xl transition-all text-xs whitespace-nowrap group relative h-11 select-none
                        ${showFullSidebar ? 'px-3 gap-3' : 'justify-center'}
                        ${isActive 
                          ? 'text-white bg-slate-800 font-bold' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50 font-medium'
                        }
                      `}
                      title={!showFullSidebar ? item.label : undefined}
                    >
                      <item.icon size={19} className={`shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`} />
                      
                      {showFullSidebar && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                        </>
                      )}
                    </button>

                    {/* Sub-menu Items */}
                    <AnimatePresence initial={false}>
                      {showFullSidebar && isOpen && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-6 pl-2.5 my-1 border-l border-slate-800 space-y-0.5 overflow-hidden"
                        >
                          {item.children?.map((child, idx) => {
                            if (child.isHeader) {
                              return (
                                <div key={`header-${idx}`} className="px-3 pt-2.5 pb-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  {child.label}
                                </div>
                              );
                            }

                            const [basePath, query] = (child.path || '').split('?');
                            let isChildActive = false;
                            
                            if (basePath === location.pathname) {
                              if (query) {
                                const searchParams = new URLSearchParams(location.search);
                                const linkParams = new URLSearchParams(query);
                                isChildActive = true;
                                linkParams.forEach((val, key) => {
                                  if (searchParams.get(key) !== val) isChildActive = false;
                                });
                              } else {
                                if (child.end) {
                                  isChildActive = !location.search || location.search === '?';
                                } else {
                                  isChildActive = true;
                                }
                              }
                            }

                            return (
                              <NavLink
                                key={child.path || idx}
                                to={child.path || ''}
                                end={child.end}
                                onClick={() => setMobileOpen(false)}
                                className={() =>
                                  `flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-xs whitespace-nowrap select-none font-medium
                                  ${isChildActive 
                                    ? 'text-emerald-400 bg-emerald-500/10 font-bold' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`
                                }
                              >
                                {child.icon && <child.icon size={14} className={isChildActive ? 'text-emerald-400' : 'text-slate-500'} />}
                                <span className="truncate">{child.label}</span>
                              </NavLink>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  /* Single Direct NavLink */
                  <NavLink
                    to={item.path || ''}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center rounded-xl transition-all text-xs whitespace-nowrap group relative h-11 select-none font-medium
                      ${showFullSidebar ? 'px-3 gap-3' : 'justify-center'}
                      ${isActive 
                        ? 'text-white bg-slate-800 font-bold text-emerald-400' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }
                    `}
                    title={!showFullSidebar ? item.label : undefined}
                  >
                    <item.icon size={19} className={`shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`} />
                    {showFullSidebar && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </NavLink>
                )}
              </div>
            );
          })}
        </nav>
        
        {/* ─── Footer: User Profile, Quick Actions & Collapse Toggle ─── */}
        <div className="p-3 border-t border-slate-800 bg-[#0B1120] flex flex-col gap-2 shrink-0 pb-6 sm:pb-3">
          
          {/* User Profile Info + Direct Logout Button */}
          <div className={`w-full flex items-center justify-between rounded-xl ${showFullSidebar ? 'p-1' : 'h-10 justify-center'}`}>
             <div className="flex items-center gap-2.5 min-w-0">
               <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                 {user?.name?.charAt(0) || 'A'}
               </div>
               {showFullSidebar && (
                 <div className="min-w-0">
                   <p className="text-xs font-bold text-white truncate leading-none mb-0.5">{user?.name || 'Admin User'}</p>
                   <p className="text-[9px] text-slate-500 uppercase tracking-widest">{user?.role || 'Admin'}</p>
                 </div>
               )}
             </div>

             {showFullSidebar && (
               <button 
                 type="button"
                 onClick={handleLogout} 
                 className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all flex items-center gap-1.5 shrink-0 text-xs font-bold"
                 title="ออกจากระบบ"
               >
                 <LogOut size={14} className="text-red-400" />
                 <span>ออก</span>
               </button>
             )}
          </div>

          {/* Quick Actions: Install App + Settings */}
          {showFullSidebar ? (
            <div className="grid grid-cols-2 gap-1.5">
              <NavLink 
                to="/settings" 
                onClick={() => {
                  localStorage.setItem('kds_settings_active_tab', 'app');
                  setMobileOpen(false);
                }}
                className="flex items-center justify-center rounded-xl transition-all text-xs text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 py-2 px-2 gap-1.5 border border-emerald-500/20"
                title="ติดตั้งแอปมือถือ"
              >
                <Smartphone size={14} className="shrink-0 text-emerald-400" />
                <span className="font-bold text-[11px] text-emerald-300 truncate">ติดตั้งแอป</span>
              </NavLink>

              <NavLink 
                to="/settings" 
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `flex items-center justify-center rounded-xl transition-all text-xs py-2 px-2 gap-1.5 border border-slate-800 ${
                  isActive 
                    ? 'text-white bg-slate-800 border-slate-700 font-bold' 
                    : 'text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800'
                }`}
                title="ตั้งค่าระบบ"
              >
                <Settings size={14} className="shrink-0" />
                <span className="text-[11px] font-medium truncate">ตั้งค่า</span>
              </NavLink>
            </div>
          ) : (
            /* Collapsed Desktop Quick Actions */
            <div className="flex flex-col gap-1 items-center">
              <NavLink 
                to="/settings" 
                onClick={() => setMobileOpen(false)}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50"
                title="ตั้งค่าระบบ"
              >
                <Settings size={16} />
              </NavLink>
              
              <button 
                type="button"
                onClick={handleLogout} 
                className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                title="ออกจากระบบ"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          {/* Desktop Collapse / Expand Toggle Button (Hidden on Mobile) */}
          {setIsCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`hidden xl:flex items-center rounded-xl transition-all text-xs text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/60 mt-0.5 ${
                showFullSidebar ? 'px-3 py-1.5 justify-between w-full' : 'h-9 w-9 justify-center'
              }`}
              title={isCollapsed ? "ขยายเมนู (Expand Sidebar)" : "ย่อเมนู (Collapse Sidebar)"}
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? <PanelLeftOpen size={16} className="text-emerald-400" /> : <PanelLeftClose size={16} />}
                {showFullSidebar && <span className="text-xs">ย่อเมนู</span>}
              </div>
              {showFullSidebar && <span className="text-[9px] text-slate-500 font-mono">Alt+[</span>}
            </button>
          )}

        </div>
      </aside>
    </>
  );
};
