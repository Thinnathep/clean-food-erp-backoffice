import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, MessageSquare, Plus, User, X, Clock, Save, 
  UtensilsCrossed, Copy, Clipboard as ClipboardIcon, Search, FileText, Trash2, MapPin, Pin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { supabase } from '../../../config/supabase';
import { useKdsStore } from '../../../store/kdsStore';
import { useAuthStore } from '../../../store/authStore';
import { getWeekDays, formatDisplayDate } from '../../../lib/dateUtils';
import { fetchMemberSchedules } from '../../../features/kds/api';
import type { MemberMealSchedule, PintoPackage } from '../../../types';

export const MemberPlanner: React.FC = () => {
  // Authentication & Role
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // Navigation State
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf('isoWeek' as any).toDate());
  
  // Modal State: Meal Editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{
    scheduleId: string | null;
    date: string;
    mealType: string;
    menuId: string;
    qty: number;
    deliveryTime: string;
    notes: string;
    isExtraOrder: boolean;
    orderType: 'subscription' | 'a-la-carte';
    isNoRice: boolean;
  } | null>(null);
  
  // Modal State: Profile & Package
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [memberUpdates, setMemberUpdates] = useState<any>(null);
  const [packageUpdates, setPackageUpdates] = useState<{package_name: string, meals_total: number} | null>(null);

  // Modal State: New Package
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [newPackage, setNewPackage] = useState({
    member_id: '',
    package_name: '',
    meals_total: 14,
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: dayjs().add(7, 'day').format('YYYY-MM-DD')
  });

  // Search & Filter State
  const [menuSearch, setMenuSearch] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [sidebarSortBy, setSidebarSortBy] = useState<'latest' | 'name'>('latest');
  const [sidebarFilterType, setSidebarFilterType] = useState<'all' | 'member' | 'retail'>('all');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Macros Summary State
  const [isMacrosModalOpen, setIsMacrosModalOpen] = useState(false);
  const [macrosContent, setMacrosContent] = useState<{
    date: string,
    meals: any[],
    totals: {kcal: number, protein: number, carbs: number, fat: number},
    formattedText: string
  } | null>(null);


  const menus = useKdsStore(state => state.menus);
  const activePackages = useKdsStore(state => state.activePackages);
  const memberSchedules = useKdsStore(state => state.memberSchedules);
  const selectedPackageId = useKdsStore(state => state.selectedPackageId);
  const setSelectedPackageId = useKdsStore(state => state.setSelectedPackageId);
  const loadMemberPlanner = useKdsStore(state => state.loadMemberPlanner);
  const assignMemberSlot = useKdsStore(state => state.assignMemberSlot);
  const removeMemberSlot = useKdsStore(state => state.removeMemberSlot);
  const copyDayPlan = useKdsStore(state => state.copyDayPlan);
  const pasteDayPlan = useKdsStore(state => state.pasteDayPlan);
  const clearDayPlan = useKdsStore(state => state.clearDayPlan);
  const copiedDaySlots = useKdsStore(state => state.copiedDaySlots);
  const hasUnsavedChanges = useKdsStore(state => state.hasUnsavedChanges);
  const saveMemberSchedules = useKdsStore(state => state.saveMemberSchedules);
  const updateMemberProfile = useKdsStore(state => state.updateMemberProfile);
  const addPintoPackage = useKdsStore(state => state.addPintoPackage);
  const members = useKdsStore(state => state.members);
  const isLoadingData = useKdsStore(state => state.isLoadingData);
  const loadMasterData = useKdsStore(state => state.loadMasterData);

  const weekDays = getWeekDays(currentWeekStart);
  
  useEffect(() => {
    if (selectedPackageId) {
      const startStr = dayjs(currentWeekStart).format('YYYY-MM-DD');
      const endStr = dayjs(currentWeekStart).add(6, 'day').format('YYYY-MM-DD');
      loadMemberPlanner(startStr, endStr, selectedPackageId);
    }
  }, [currentWeekStart, selectedPackageId, loadMemberPlanner]);

  const handlePrevWeek = () => setCurrentWeekStart(dayjs(currentWeekStart).subtract(1, 'week').toDate());
  const handleNextWeek = () => setCurrentWeekStart(dayjs(currentWeekStart).add(1, 'week').toDate());


  const copyDailyMacros = (date: string) => {
    const daySchedules = getSchedulesForDate(date);
    if (daySchedules.length === 0) {
      Swal.fire({ icon: 'info', title: 'ไม่มีรายการอาหาร', text: 'กรุณาเพิ่มเมนูก่อนคัดลอกสรุปสารอาหาร' });
      return;
    }

    let totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    let meals: any[] = [];
    let menuSummary = '';

    daySchedules.forEach((s, idx) => {
      const menu = s.menu_items;
      if (menu) {
        const qty = s.quantity || 1;
        const isNoRice = s.notes?.includes('[ไม่รับข้าว]');
        
        let mealMacros = {
          name: menu.name,
          kcal: (menu.calories || 0) * qty,
          protein: (menu.protein || 0) * qty,
          carbs: (menu.carbs || 0) * qty,
          fat: (menu.fat || 0) * qty,
          qty
        };

        // 🍚 ❌ 🥦🥕✅ Nutritional Adjustment: No Rice + Extra Veg
        // Rice (100g): -130 kcal, -28g carbs, -2.7g protein
        // Veg (60g): +22 kcal, +4.9g carbs, +1.1g protein
        if (isNoRice) {
          mealMacros.kcal = Math.max(0, mealMacros.kcal - 130 + 22);
          mealMacros.carbs = Math.max(0, mealMacros.carbs - 28 + 4.9);
          mealMacros.protein = Math.max(0, mealMacros.protein - 2.7 + 1.1);
          mealMacros.name = `[ไม่รับข้าว] ${mealMacros.name}`;
        }

        totals.kcal += mealMacros.kcal;
        totals.protein += mealMacros.protein;
        totals.carbs += mealMacros.carbs;
        totals.fat += mealMacros.fat;
        meals.push(mealMacros);
        menuSummary += `🍱 มื้อที่ ${idx + 1}: ${mealMacros.name} (${mealMacros.kcal.toFixed(0)} kcal)\n`;
      }
    });

    const displayDate = dayjs(date).locale('th').format('DD MMMM YYYY');
    const formattedText = `📊 *สรุปสารอาหารประจำวันที่ ${displayDate}*\n${menuSummary}---\n🔥 *พลังงานรวม:* ${totals.kcal.toFixed(0)} kcal\n🍗 *โปรตีน:* ${totals.protein.toFixed(1)}g | 🍚 *คาร์บ:* ${totals.carbs.toFixed(1)}g | 🥑 *ไขมัน:* ${totals.fat.toFixed(1)}g`;

    setMacrosContent({
      date: displayDate,
      meals,
      totals,
      formattedText
    });
    setIsMacrosModalOpen(true);
  };

  const filteredPackages = useMemo(() => {
    // 1. Optimized lookup map
    const schedulesByPkg = memberSchedules.reduce((acc, s) => {
      if (!acc[s.package_id]) acc[s.package_id] = [];
      acc[s.package_id].push(s);
      return acc;
    }, {} as Record<string, MemberMealSchedule[]>);

    // 2. Identify retail members
    const packageMembersIds = new Set(activePackages.map(p => p.member_id));
    const retailMembersWithoutPackages = members.filter(m => 
      m.member_type === 'retail' && !packageMembersIds.has(m.id)
    );

    // 3. Create virtual packages
    const virtualRetailPackages: PintoPackage[] = retailMembersWithoutPackages.map(m => ({
      id: `retail_${m.id}`,
      member_id: m.id,
      package_name: 'ออเดอร์รายย่อย (No Package)',
      meals_total: 0,
      meals_remaining: 0,
      days_total: 0,
      days_remaining: 0,
      start_date: m.created_at || new Date().toISOString(),
      end_date: dayjs().add(1, 'year').toISOString(),
      status: 'active' as const,
      members: m,
      created_at: m.created_at || new Date().toISOString()
    }));

    // 4. Combine and filter
    return [...activePackages, ...virtualRetailPackages]
      .filter(pkg => {
        const member = Array.isArray(pkg.members) ? pkg.members[0] : pkg.members;
        const name = member?.full_name || '';
        const matchesSearch = name.toLowerCase().includes(sidebarSearchQuery.toLowerCase());
        
        if (sidebarFilterType === 'member') return matchesSearch && member?.member_type !== 'retail';
        if (sidebarFilterType === 'retail') return matchesSearch && member?.member_type === 'retail';
        return matchesSearch;
      })
      .sort((a, b) => {
        const aSchedules = schedulesByPkg[a.id] || [];
        const bSchedules = schedulesByPkg[b.id] || [];
        
        const aPlanned = aSchedules.filter(s => !s.is_extra_order).reduce((sum, s) => sum + (s.quantity || 1), 0);
        const bPlanned = bSchedules.filter(s => !s.is_extra_order).reduce((sum, s) => sum + (s.quantity || 1), 0);
        
        const aRem = (a.meals_total || 0) - aPlanned;
        const bRem = (b.meals_total || 0) - bPlanned;
        
        const today = dayjs().startOf('day');
        const aHasUpcoming = aSchedules.some(s => !dayjs(s.delivery_date).isBefore(today));
        const bHasUpcoming = bSchedules.some(s => !dayjs(s.delivery_date).isBefore(today));
        
        const aIsActive = aRem > 0 || aHasUpcoming;
        const bIsActive = bRem > 0 || bHasUpcoming;
        
        if (aIsActive && !bIsActive) return -1;
        if (!aIsActive && bIsActive) return 1;

        if (sidebarSortBy === 'name') {
          const nameA = (Array.isArray(a.members) ? a.members[0]?.full_name : a.members?.full_name) || '';
          const nameB = (Array.isArray(b.members) ? b.members[0]?.full_name : b.members?.full_name) || '';
          return nameA.localeCompare(nameB, 'th');
        } else {
          const dateA = a.created_at ? dayjs(a.created_at).valueOf() : 0;
          const dateB = b.created_at ? dayjs(b.created_at).valueOf() : 0;
          return dateB - dateA;
        }
      });
  }, [activePackages, sidebarSearchQuery, sidebarSortBy, sidebarFilterType, members, memberSchedules]);

  const selectedPackage = filteredPackages.find(p => p.id === selectedPackageId);

  const projectedRemaining = useMemo(() => {
    if (!selectedPackage) return 0;
    // Count only subscription meals (exclude extra orders)
    const packageSchedules = memberSchedules.filter(s => s.package_id === selectedPackage.id);
    const totalSubscriptionPlanned = packageSchedules
      .filter(s => !s.is_extra_order)
      .reduce((sum, s) => sum + (s.quantity || 1), 0);
    
    return selectedPackage.meals_total - totalSubscriptionPlanned;
  }, [selectedPackage, memberSchedules]);

  const getSchedulesForDate = (date: string): MemberMealSchedule[] => {
    return memberSchedules
      .filter(s => s.delivery_date === date && s.package_id === selectedPackageId)
      .sort((a, b) => {
        const numA = parseInt(a.meal_type.split('_')[1]) || 0;
        const numB = parseInt(b.meal_type.split('_')[1]) || 0;
        return numA - numB;
      });
  };

  const openModal = (date: string, existingSchedule?: MemberMealSchedule) => {
    setMenuSearch('');
    if (existingSchedule) {
      setEditingSlot({
        scheduleId: existingSchedule.id,
        date,
        mealType: existingSchedule.meal_type,
        menuId: existingSchedule.menu_item_id,
        qty: existingSchedule.quantity || 1,
        deliveryTime: existingSchedule.delivery_time || '',
        notes: (existingSchedule.notes || '').replace('[ไม่รับข้าว] ', '').replace('[ไม่รับข้าว]', '').trim(),
        isExtraOrder: existingSchedule.is_extra_order || false,
        orderType: existingSchedule.meal_order_type || 'subscription',
        isNoRice: existingSchedule.notes?.includes('[ไม่รับข้าว]') || false
      });
    } else {
      const currentSchedules = getSchedulesForDate(date);
      const usedTypes = currentSchedules.map(s => s.meal_type);
      let nextType: string = 'meal_1';
      for (let i = 1; i <= 20; i++) {
        const currentType = `meal_${i}`;
        if (!usedTypes.includes(currentType as any)) {
          nextType = currentType;
          break;
        }
      }
      
      setEditingSlot({
        scheduleId: null,
        date,
        mealType: nextType,
        menuId: '',
        qty: 1,
        deliveryTime: '',
        notes: '',
        isExtraOrder: false,
        orderType: 'subscription',
        isNoRice: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!editingSlot || !selectedPackage) return;
    if (!editingSlot.menuId) {
      alert('กรุณาเลือกรายการเมนูอาหาร');
      return;
    }

    await assignMemberSlot(
      editingSlot.scheduleId,
      selectedPackage.id,
      selectedPackage.member_id,
      editingSlot.date,
      editingSlot.mealType,
      editingSlot.menuId,
      editingSlot.qty,
      editingSlot.deliveryTime,
      editingSlot.isNoRice ? `[ไม่รับข้าว] ${editingSlot.notes}`.trim() : editingSlot.notes,
      editingSlot.isExtraOrder,
      editingSlot.orderType
    );
    
    setIsModalOpen(false);
  };

  const handleOpenProfile = () => {
    if (!selectedPackage?.members) return;
    setMemberUpdates({ ...selectedPackage.members });
    setPackageUpdates({
      package_name: selectedPackage.package_name,
      meals_total: selectedPackage.meals_total
    });
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedPackage?.members || !memberUpdates || !packageUpdates) return;
    
    const confirmResult = await Swal.fire({
      title: 'ยืนยันการบันทึก?',
      text: "ข้อมูลสมาชิกและแพ็กเกจจะถูกอัปเดตใหม่ทันที",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ยืนยัน บันทึกเลย',
      cancelButtonText: 'ยกเลิก'
    });

    if (!confirmResult.isConfirmed) return;

    try {
      Swal.fire({
        title: 'กำลังบันทึกข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // 1. Update Member Profile
      await updateMemberProfile(selectedPackage.members.id, memberUpdates);
      
      // 2. Update Package Details (if needed)
      const { error } = await supabase
        .from('pinto_packages')
        .update({
          package_name: packageUpdates.package_name,
          meals_total: packageUpdates.meals_total
        })
        .eq('id', selectedPackage.id);
        
      if (error) throw new Error(error.message);
      
      // 3. Trigger Absolute Sync to fix remaining balance
      const allPackageSchedules = await fetchMemberSchedules('2020-01-01', '2030-12-31', selectedPackage.id);
      const totalSubscriptionUsed = allPackageSchedules
        .filter(s => !s.is_extra_order)
        .reduce((sum, s) => sum + (s.quantity || 1), 0);
      const newRemaining = Math.max(0, packageUpdates.meals_total - totalSubscriptionUsed);
      
      await supabase
        .from('pinto_packages')
        .update({ meals_remaining: newRemaining })
        .eq('id', selectedPackage.id);
      
      // 4. Refresh All Master Data to reflect everywhere
      await loadMasterData();
      
      setIsProfileModalOpen(false);
      
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        text: 'ข้อมูลสมาชิกและแพ็กเกจได้รับการอัปเดตแล้ว',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message
      });
    }
  };

  const handleAddPackage = async () => {
    if (!newPackage.member_id || !newPackage.package_name) {
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบ',
        text: 'กรุณาเลือกชื่อลูกค้าและระบุชื่อแพ็กเกจ'
      });
      return;
    }

    try {
      await addPintoPackage({
        ...newPackage,
        meals_remaining: newPackage.meals_total,
        days_total: dayjs(newPackage.end_date).diff(dayjs(newPackage.start_date), 'day'),
        days_remaining: dayjs(newPackage.end_date).diff(dayjs(newPackage.start_date), 'day'),
        status: 'active'
      });

      setIsAddPackageModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'เปิดแพ็กเกจสำเร็จ',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message
      });
    }
  };

  const handleRemoveClick = async (e: React.MouseEvent, scheduleId: string) => {
    e.stopPropagation();
    
    const result = await Swal.fire({
      title: 'ลบมื้อนี้ใช่ไหม?',
      text: "คุณจะไม่สามารถกู้คืนข้อมูลมื้อนี้ได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ใช่, ลบทันที',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      await removeMemberSlot(scheduleId);
      setIsModalOpen(false);
      Swal.fire({
        title: 'ลบแล้ว!',
        icon: 'success',
        timer: 1000,
        showConfirmButton: false
      });
    }
  };

  const calculateEstimateEndDate = () => {
    if (!selectedPackage || selectedPackage.meals_remaining <= 0) return 'N/A';
    
    const mealsPerWeek = memberSchedules
      .filter(s => s.package_id === selectedPackage.id && !s.is_extra_order)
      .reduce((sum, s) => sum + (s.quantity || 1), 0);
    if (mealsPerWeek <= 0) return 'ไม่มีแผนอาหาร';
    
    const avgMealsPerDay = mealsPerWeek / 7;
    const daysLeft = Math.ceil(selectedPackage.meals_remaining / avgMealsPerDay);
    
    return dayjs().add(daysLeft, 'day').format('DD/MM/YYYY');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden relative">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center z-10 shadow-sm">
        <div>
          <h2 className="text-lg font-normal text-slate-900 tracking-tight flex items-center gap-2">
            <User className="text-emerald-500" /> แผนอาหารรายบุคคล (Member Custom Plan)
          </h2>
          <p className="text-xs font-normal text-slate-500 mt-1">
            จัดเมนู สูงสุด 20 มื้อต่อวัน ระบุรอบส่งและโน้ตพิเศษ
          </p>
        </div>

        <div className="flex items-center gap-3">
           {hasUnsavedChanges && (
             <button 
               onClick={saveMemberSchedules}
               disabled={isLoadingData}
               className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-normal shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all animate-bounce-subtle"
             >
               {isLoadingData ? <Clock className="animate-spin" size={18} /> : <Save size={18} />}
               บันทึกแผนงานทั้งหมด
             </button>
           )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`w-full md:w-72 bg-white md:border-r border-slate-200 flex-col z-10 absolute md:relative inset-0 transition-transform ${selectedPackage ? '-translate-x-full md:translate-x-0' : 'translate-x-0'} flex`}>
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-normal uppercase tracking-widest text-slate-400">ลูกค้าที่กำลังดูแล</h3>
              <button 
                onClick={() => setIsAddPackageModalOpen(true)}
                className="bg-slate-100 hover:bg-emerald-500 hover:text-white text-slate-600 px-2 py-1 rounded-lg text-[10px] font-normal flex items-center gap-1 transition-all border border-slate-200"
              >
                 <Plus size={12} /> เพิ่ม
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text"
                  placeholder="ค้นหาชื่อลูกค้า..."
                  value={sidebarSearchQuery}
                  onChange={(e) => setSidebarSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-normal focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1">
                <button 
                  onClick={() => {
                    setSidebarSortBy('latest');
                    setSidebarFilterType('all');
                  }}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${sidebarSortBy === 'latest' && sidebarFilterType === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >
                  ล่าสุด
                </button>
                <div className="w-[1px] bg-slate-200 my-1"></div>
                <button 
                  onClick={() => setSidebarFilterType('member')}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${sidebarFilterType === 'member' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}
                >
                  สมาชิก
                </button>
                <button 
                  onClick={() => setSidebarFilterType('retail')}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${sidebarFilterType === 'retail' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400'}`}
                >
                  รายย่อย
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredPackages.length === 0 && (
               <div className="text-center p-6 text-slate-400 text-xs font-normal">ไม่พบข้อมูลลูกค้า</div>
            )}
            {Object.values(filteredPackages.reduce((acc: any, pkg) => {
              const mId = pkg.member_id;
              if (!acc[mId]) {
                acc[mId] = {
                  member: Array.isArray(pkg.members) ? pkg.members[0] : pkg.members,
                  packages: []
                };
              }
              acc[mId].packages.push(pkg);
              return acc;
            }, {})).map((group: any) => (
              <div key={group.member.id} className="mb-3">
                <div className="px-3 py-1.5 text-base font-medium text-slate-900 flex items-center gap-2 border-b border-slate-100 mb-1">
                  <User size={16} className="text-emerald-500" /> {group.member.full_name}
                </div>
                <div className="space-y-1">
                  {group.packages.map((pkg: any) => {
                    const pkgSchedules = memberSchedules.filter(s => s.package_id === pkg.id);
                    const subSchedules = pkgSchedules.filter(s => !s.is_extra_order);
                    const planned = subSchedules.reduce((sum, s) => sum + (s.quantity || 1), 0);
                    const rem = (pkg.meals_total || 0) - planned;
                    const today = dayjs().startOf('day');
                    const hasUpcoming = pkgSchedules.some(s => !dayjs(s.delivery_date).isBefore(today));
                    const isPinned = rem > 0 || hasUpcoming;

                    const member = Array.isArray(pkg.members) ? pkg.members[0] : pkg.members;
                    const isRetail = member?.member_type === 'retail' || pkg.id.toString().startsWith('retail_');

                    let statusBadgeClass = 'bg-slate-100 text-slate-700 border border-slate-200';
                    let statusText = `เหลือ ${rem} มื้อ`;

                    if (isRetail) {
                      const activeOrders = pkgSchedules.filter(s => !dayjs(s.delivery_date).isBefore(today)).reduce((sum, s) => sum + (s.quantity || 1), 0);
                      statusBadgeClass = activeOrders > 0 ? 'bg-orange-500 text-white border border-orange-600 shadow-sm' : 'bg-slate-100 text-slate-400 border border-slate-200';
                      statusText = activeOrders > 0 ? `สั่งไว้ ${activeOrders} มื้อ` : 'ไม่มีออเดอร์';
                    } else if (rem < 0) {
                      statusBadgeClass = 'bg-red-500 text-white border border-red-600';
                    } else if (rem === 0) {
                      statusBadgeClass = 'bg-slate-50 text-slate-400 border border-slate-100';
                    } else if (rem < 3) {
                      statusBadgeClass = 'bg-red-50 text-red-600 border border-red-100 animate-pulse';
                    } else if (pkg.meals_total === 14 || pkg.meals_total === 15) {
                      statusBadgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                    } else if (pkg.meals_total === 28 || pkg.meals_total === 30) {
                      statusBadgeClass = 'bg-blue-50 text-blue-600 border border-blue-100';
                    } else if (pkg.meals_total === 60 || pkg.meals_total === 62) {
                      statusBadgeClass = 'bg-purple-50 text-purple-600 border border-purple-100';
                    }

                    return (
                      <div 
                        key={pkg.id} 
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all border relative overflow-hidden group ${
                          selectedPackageId === pkg.id 
                            ? 'bg-emerald-50 border-emerald-500 shadow-md ring-1 ring-emerald-500/20' 
                            : isPinned 
                              ? 'bg-white border-emerald-100 shadow-sm'
                              : 'bg-white border-transparent hover:bg-slate-50'
                        }`}
                      >
                        {/* Status Indicator Bar */}
                        {isPinned && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        )}
                        
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isPinned && (
                                <motion.div 
                                  initial={{ scale: 0, rotate: -45 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  className="bg-emerald-500 text-white p-1 rounded-lg shadow-sm shadow-emerald-500/20 shrink-0"
                                >
                                  <Pin size={10} fill="white" />
                                </motion.div>
                              )}
                              <p className={`text-[15px] font-medium truncate ${selectedPackageId === pkg.id ? 'text-emerald-700' : 'text-slate-800'}`}>
                                {pkg.package_name}
                              </p>
                            </div>
                            {rem > 0 && subSchedules.length > 0 && (
                              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                <span>สิ้นสุดประมาณ:</span>
                                <span className="text-blue-500 font-bold">
                                  {(() => {
                                    const lastPlannedDate = subSchedules.reduce((max, s) => dayjs(s.delivery_date).isAfter(max) ? dayjs(s.delivery_date) : max, dayjs('1900-01-01'));
                                    const mealsPerWeek = subSchedules.length > 7 ? 14 : 10;
                                    const daysLeft = Math.ceil(rem / (mealsPerWeek / 7));
                                    return lastPlannedDate.add(daysLeft, 'day').format('DD/MM/YYYY');
                                  })()}
                                </span>
                              </p>
                            )}
                          </div>
                          <span className={`text-[13px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-sm border ${statusBadgeClass}`}>
                            {statusText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedPackage ? (
          <div className={`flex-1 flex flex-col overflow-hidden bg-[#F8FAFC] absolute md:relative inset-0 z-20 transition-transform ${selectedPackage ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
              <div className="px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 bg-white shadow-sm">
                {(() => {
                  const member = Array.isArray(selectedPackage.members) ? selectedPackage.members[0] : selectedPackage.members;
                  const isRetail = member?.member_type === 'retail' || selectedPackage.id.toString().startsWith('retail_');
                  
                  const packageSchedules = memberSchedules.filter(s => s.package_id === selectedPackage.id);
                  const totalSubscriptionOrdered = packageSchedules.filter(s => !s.is_extra_order).reduce((sum, s) => sum + (s.quantity || 1), 0);
                  
                  return (
                    <div className="flex items-center gap-3">
                       <button 
                         onClick={() => setSelectedPackageId(null)} 
                         className="md:hidden bg-slate-100 p-2 rounded-lg text-slate-600"
                       >
                         <ChevronLeft size={20} />
                       </button>
                       <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 flex-shrink-0">
                         <User size={20} />
                       </div>
                       <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2">
                               <h3 onClick={handleOpenProfile} className="text-base md:text-lg font-normal text-slate-900 truncate cursor-pointer hover:text-emerald-600 transition-colors">
                                 {member?.full_name}
                               </h3>
                              <button 
                                onClick={handleOpenProfile} 
                                className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-emerald-500 hover:text-white text-slate-500 rounded-lg text-[10px] font-normal transition-all border border-slate-200 hover:border-emerald-500 shadow-sm"
                              >
                                <FileText size={12} /> รายละเอียดลูกค้า
                              </button>
                           </div>
                           <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
                               <span className="text-[10px] md:text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[150px]">{selectedPackage.package_name}</span>
                                 <span className={`text-[10px] md:text-xs font-normal px-2 py-0.5 rounded-md border ${
                                   isRetail
                                     ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                                     : projectedRemaining < 0
                                       ? 'bg-red-500 text-white border-red-600 animate-bounce' 
                                       : projectedRemaining < 3
                                         ? 'bg-red-50 text-red-600 border-red-100'
                                         : (selectedPackage.meals_total === 14 || selectedPackage.meals_total === 15)
                                           ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                           : (selectedPackage.meals_total === 28 || selectedPackage.meals_total === 30)
                                             ? 'bg-blue-50 text-blue-600 border-blue-100'
                                             : (selectedPackage.meals_total === 60 || selectedPackage.meals_total === 62)
                                               ? 'bg-purple-50 text-purple-600 border-purple-100'
                                               : 'bg-slate-100 text-slate-600 border-slate-200'
                                 }`}>
                                   {isRetail ? `สั่งไว้ ${totalSubscriptionOrdered} มื้อ` : `เหลือ ${projectedRemaining} มื้อ`}
                                 </span>
                                 {(() => {
                                   const extraCount = packageSchedules
                                     .filter(s => s.is_extra_order)
                                     .reduce((sum, s) => sum + (s.quantity || 1), 0);
                                   
                                   if (extraCount === 0) return null;
                                   return (
                                     <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-md bg-orange-500 text-white border border-orange-600 shadow-sm flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                                       สั่งแยก {extraCount} มื้อ
                                     </span>
                                   );
                                 })()}
                               <span className="text-[10px] md:text-xs font-normal text-slate-500 flex items-center gap-1">
                                 <Clock size={12} className="text-purple-500" /> {member?.delivery_time || 'ไม่ระบุรอบส่ง'}
                               </span>
                               <span className="text-[10px] md:text-xs font-normal text-slate-500 flex items-center gap-1">
                                 <MapPin size={12} className="text-emerald-500" /> {member?.address || 'ไม่ระบุที่อยู่'}
                               </span>
    
                               {member?.health_goal && (
                                 <span className="text-[10px] md:text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{member?.health_goal}</span>
                               )}
                           </div>
                        </div>
                    </div>
                  );
                })()}
                
                <div className="flex w-full md:w-auto items-stretch gap-2">
                  <button 
                    onClick={() => setCurrentWeekStart(dayjs().startOf('isoWeek' as any).toDate())}
                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 rounded-xl text-xs font-medium transition-all shadow-sm shrink-0 flex items-center justify-center"
                  >
                    วันนี้
                  </button>
                  <div className="flex w-full md:w-auto items-center justify-between bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                    <button onClick={handlePrevWeek} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"><ChevronLeft size={16} /></button>
                    <span className="px-3 text-[10px] font-normal uppercase tracking-widest text-emerald-600 truncate">
                      {formatDisplayDate(weekDays[0].date)}
                    </span>
                    <button onClick={handleNextWeek} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"><ChevronRight size={16} /></button>
                  </div>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="grid grid-cols-1 xl:grid-cols-7 gap-4">
                  {weekDays.map(day => {
                    const daySchedules = getSchedulesForDate(day.date);
                    
                    return (
                      <div key={day.date} className="flex flex-col gap-2">
                        {/* Day Toolbar - Above the card */}
                        <div className="flex items-center justify-between px-2 py-1 bg-slate-100/50 rounded-xl border border-slate-200/50">
                          <div className="flex gap-1">
                            {daySchedules.length > 0 && (
                              <button 
                                onClick={() => clearDayPlan(day.date, selectedPackage.id)}
                                title="ล้างแผนทั้งหมด"
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => copyDailyMacros(day.date)}
                              title="คัดลอกสรุปสารอาหาร (Macros)"
                              className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <FileText size={14} />
                            </button>
                            <button 
                              onClick={() => copyDayPlan(day.date)}
                              title="คัดลอกเมนูของวันนี้"
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Copy size={14} />
                            </button>
                            {copiedDaySlots && (
                              <button 
                                onClick={() => pasteDayPlan(day.date, selectedPackage.id, selectedPackage.member_id)}
                                title="วางเมนูที่คัดลอกมา"
                                className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-sm hover:bg-emerald-600 transition-all animate-pulse"
                              >
                                <ClipboardIcon size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className={`bg-white rounded-2xl border ${day.isToday ? 'border-blue-400 shadow-md ring-2 ring-blue-500/10' : 'border-slate-200 shadow-sm'} overflow-hidden flex flex-col`}>
                          <div className={`px-4 py-3 border-b flex justify-between items-center ${day.isToday ? 'bg-blue-500 text-white' : 'bg-slate-50 border-slate-100'}`}>
                            <div>
                              <p className={`text-[10px] font-normal uppercase tracking-widest ${day.isToday ? 'text-blue-100' : 'text-slate-400'}`}>{day.dayName}</p>
                              <h3 className={`text-lg font-normal ${day.isToday ? 'text-white' : 'text-slate-800'}`}>{day.shortDate}</h3>
                            </div>
                          </div>
                        <div className="p-3 space-y-2 flex-1 flex flex-col bg-slate-50">
                          {daySchedules.map((schedule, idx) => (
                            <div 
                              key={schedule.id}
                              onClick={() => openModal(day.date, schedule)}
                              className={`relative flex flex-col p-3 rounded-xl border cursor-pointer shadow-sm transition-all group ${
                                schedule.is_extra_order 
                                  ? 'bg-orange-50 border-orange-300 hover:border-orange-500 shadow-orange-100' 
                                  : 'bg-white border-blue-200 hover:border-emerald-500'
                              }`}
                            >
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {schedule.is_extra_order && (
                                    <span className="bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                      สั่งแยก
                                    </span>
                                  )}
                                  {schedule.menu_items?.category === 'dessert' && (
                                    <span className="bg-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                      ของหวาน
                                    </span>
                                  )}
                                  {schedule.menu_items?.category && schedule.menu_items?.category !== 'dessert' && (
                                    <span className="bg-slate-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                      {schedule.menu_items.category === 'main' ? 'เมนูหลัก' : schedule.menu_items.category}
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-normal uppercase tracking-widest text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">มื้อที่ {idx + 1}</span>
                                  <div className="flex items-center gap-1">
                                  {schedule.delivery_time && (
                                     <span className="text-[9px] font-normal text-blue-500 flex items-center gap-1"><Clock size={10}/> {schedule.delivery_time}</span>
                                  )}
                                  {isAdmin && (
                                    <button 
                                      onClick={(e) => handleRemoveClick(e, schedule.id)}
                                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all shadow-sm bg-white border border-slate-100"
                                      title="ลบมื้อนี้"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-sm font-normal text-slate-800 leading-tight mb-2 truncate" title={schedule.menu_items?.name}>
                                {schedule.menu_items?.name || 'ไม่ได้เลือกเมนู'}
                              </p>
                              
                              <div className="flex items-center justify-between mt-auto border-t border-slate-100 pt-2">
                                  <div className="flex-1 overflow-hidden mr-2">
                                    {schedule.notes ? (
                                      <p className="text-[10px] font-normal text-orange-600 truncate"><span className="text-orange-400 mr-1">📝</span>{schedule.notes}</p>
                                    ) : (
                                      <p className="text-[10px] text-slate-300">ไม่มีโน้ต</p>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-normal text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">x{schedule.quantity}</span>
                              </div>
                            </div>
                          ))}
                          
                          {daySchedules.length < 20 && (
                             <button 
                               onClick={() => openModal(day.date)}
                               className="w-full py-3 mt-1 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 text-xs font-normal"
                             >
                               <Plus size={16} /> 
                             </button>
                          )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-[#F8FAFC]">
             <div className="text-center opacity-40">
                <User size={64} className="mx-auto mb-4 text-slate-400" />
                <h2 className="text-2xl font-normal text-slate-800">โปรดเลือกลูกค้าทางซ้ายมือ</h2>
                <p className="text-slate-500 font-normal mt-2">เพื่อเริ่มจัดเมนูอาหารให้ลูกค้าแต่ละท่าน</p>
             </div>
          </div>
        )}
      </div>

      {isProfileModalOpen && memberUpdates && (
        <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200">
               <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                        <User size={24} />
                     </div>
                     <div>
                        <h3 className="text-xl font-normal text-slate-800">ข้อมูลสมาชิกเชิงลึก</h3>
                        <p className="text-xs font-normal text-slate-400 uppercase tracking-widest">Member Intelligence Profile</p>
                     </div>
                  </div>
                  <button onClick={() => setIsProfileModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 transition-all">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                      <h4 className="text-sm font-normal text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                        <User size={16} className="text-emerald-500" /> ข้อมูลส่วนตัว
                      </h4>
                      <div>
                        <label className="block text-[11px] font-normal text-slate-900 mb-1">ประเภทลูกค้า</label>
                        <div className="flex bg-white border border-slate-200 p-1 rounded-xl gap-1">
                          <button 
                            type="button"
                            onClick={() => setMemberUpdates({...memberUpdates, member_type: 'member'})}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${memberUpdates.member_type !== 'retail' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            สมาชิกปิ่นโต
                          </button>
                          <button 
                            type="button"
                            onClick={() => setMemberUpdates({...memberUpdates, member_type: 'retail'})}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${memberUpdates.member_type === 'retail' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            ลูกค้ารายย่อย
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-normal text-slate-900 mb-1">ชื่อ-นามสกุล</label>
                        <input 
                          type="text" 
                          value={memberUpdates.full_name || ''} 
                          onChange={(e) => setMemberUpdates({...memberUpdates, full_name: e.target.value})}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-normal text-slate-900 mb-1">เบอร์โทรศัพท์</label>
                          <input 
                            type="text" 
                            value={memberUpdates.phone || ''} 
                            onChange={(e) => setMemberUpdates({...memberUpdates, phone: e.target.value})}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-normal text-slate-900 mb-1">LINE ID</label>
                          <input 
                            type="text" 
                            value={memberUpdates.line_id || ''} 
                            onChange={(e) => setMemberUpdates({...memberUpdates, line_id: e.target.value})}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                      <h4 className="text-sm font-normal text-slate-900 border-b border-blue-200 pb-2 flex items-center gap-2">
                        <MessageSquare size={16} className="text-blue-500" /> ที่อยู่จัดส่ง (Shipping Address)
                      </h4>
                      <div>
                        <label className="block text-[11px] font-normal text-slate-900 mb-1">บ้านเลขที่ / หมู่บ้าน / ซอย / ถนน</label>
                        <textarea 
                          value={memberUpdates.address || ''} 
                          rows={2}
                          onChange={(e) => setMemberUpdates({...memberUpdates, address: e.target.value})}
                          className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-normal text-slate-800 focus:border-blue-500 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-normal text-slate-900 mb-1">แขวง/ตำบล</label>
                          <input type="text" value={memberUpdates.sub_district || ''} onChange={(e) => setMemberUpdates({...memberUpdates, sub_district: e.target.value})} className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-normal focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-normal text-slate-900 mb-1">เขต/อำเภอ</label>
                          <input type="text" value={memberUpdates.district || ''} onChange={(e) => setMemberUpdates({...memberUpdates, district: e.target.value})} className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-normal focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-normal text-slate-900 mb-1">จังหวัด</label>
                          <input type="text" value={memberUpdates.province || ''} onChange={(e) => setMemberUpdates({...memberUpdates, province: e.target.value})} className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-normal focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-normal text-slate-900 mb-1">รหัสไปรษณีย์</label>
                          <input type="text" value={memberUpdates.postal_code || ''} onChange={(e) => setMemberUpdates({...memberUpdates, postal_code: e.target.value})} className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-normal focus:border-blue-500 outline-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-4">
                      <h4 className="text-sm font-normal text-slate-900 border-b border-emerald-200 pb-2 flex items-center gap-2">
                        <UtensilsCrossed size={16} className="text-emerald-500" /> สุขภาพและความชอบ
                      </h4>
                      <div>
                        <label className="block text-[11px] font-normal text-slate-900 mb-1">เป้าหมายสุขภาพ (Health Goal)</label>
                        <input 
                          type="text" 
                          value={memberUpdates.health_goal || ''} 
                          onChange={(e) => setMemberUpdates({...memberUpdates, health_goal: e.target.value})}
                          className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-sm font-normal text-emerald-800 focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-normal text-red-700 mb-1">ประวัติการแพ้อาหาร (Allergy)</label>
                        <textarea 
                          value={memberUpdates.allergy_notes || ''} 
                          rows={2}
                          onChange={(e) => setMemberUpdates({...memberUpdates, allergy_notes: e.target.value})}
                          className="w-full p-2.5 bg-white border border-red-200 rounded-xl text-sm font-normal text-red-800 focus:border-red-500 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>

                    <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 space-y-4">
                      <h4 className="text-sm font-normal text-slate-900 border-b border-orange-200 pb-2 flex items-center gap-2">
                        <Search size={16} className="text-orange-500" /> ข้อมูลลูกค้าเชิงลึก (Marketing Insight)
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-normal text-slate-900 mb-1">ช่วงอายุ (Age Range)</label>
                          <select 
                            value={memberUpdates.age_range || ''} 
                            onChange={(e) => setMemberUpdates({...memberUpdates, age_range: e.target.value})}
                            className="w-full p-2.5 bg-white border border-orange-200 rounded-xl text-sm font-normal text-slate-800 focus:border-orange-500 outline-none"
                          >
                            <option value="">ไม่ระบุ</option>
                            <option value="teen">วัยรุ่น (20)</option>
                            <option value="working">วัยทำงาน (20-40)</option>
                            <option value="adult">ผู้ใหญ่ (40-60)</option>
                            <option value="senior">ผู้สูงอายุ (60+)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-normal text-slate-900 mb-1">รอบจัดส่งปกติ</label>
                          <select 
                            value={memberUpdates.delivery_time || ''} 
                            onChange={(e) => setMemberUpdates({...memberUpdates, delivery_time: e.target.value})}
                            className="w-full p-2.5 bg-white border border-orange-200 rounded-xl text-sm font-normal text-slate-800 focus:border-orange-500 outline-none"
                          >
                             <option value="">-- เลือกเวลาส่ง --</option>
                             <option value="11:00 - 13:00">11:00 - 13:00</option>
                             <option value="15:00 - 17:00">15:00 - 17:00</option>
                          </select>
                        </div>
                      </div>
                    </div>

                     <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 space-y-4">
                       <h4 className="text-sm font-normal text-slate-900 border-b border-purple-200 pb-2 flex items-center gap-2">
                         <ClipboardIcon size={16} className="text-purple-500" /> จัดการแพ็กเกจ (Package Details)
                       </h4>

                       <div className="flex flex-wrap gap-2">
                         <button 
                           type="button"
                           onClick={() => {
                             setPackageUpdates({ package_name: 'ออเดอร์รายย่อย (No Package)', meals_total: 0 });
                             setMemberUpdates({ ...memberUpdates, member_type: 'retail' });
                           }}
                           className="px-3 py-1.5 bg-white border border-orange-200 text-orange-600 rounded-lg text-[10px] font-bold hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                         >
                           + เป็นรายย่อย (No Package)
                         </button>
                         <button 
                           type="button"
                           onClick={() => {
                             setPackageUpdates({ package_name: '- ผูกปิ่นโต 7 วัน (14 มื้อ) (×1) = ฿899', meals_total: 15 });
                             setMemberUpdates({ ...memberUpdates, member_type: 'member' });
                           }}
                           className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                         >
                           + โปรฯ 7 วัน (15 มื้อ)
                         </button>
                         <button 
                           type="button"
                           onClick={() => {
                             setPackageUpdates({ package_name: '- ผูกปิ่นโต 14 วัน (28 มื้อ) (×1) = ฿1,799', meals_total: 30 });
                             setMemberUpdates({ ...memberUpdates, member_type: 'member' });
                           }}
                           className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                         >
                           + โปรฯ 14 วัน (30 มื้อ)
                         </button>
                         <button 
                           type="button"
                           onClick={() => {
                             setPackageUpdates({ package_name: '- ผูกปิ่นโต 1 เดือน (60 มื้อ) (×1) = ฿3,799', meals_total: 62 });
                             setMemberUpdates({ ...memberUpdates, member_type: 'member' });
                           }}
                           className="px-3 py-1.5 bg-white border border-purple-200 text-purple-600 rounded-lg text-[10px] font-bold hover:bg-purple-500 hover:text-white transition-all shadow-sm"
                         >
                           + โปรฯ 1 เดือน (62 มื้อ)
                         </button>
                       </div>

                       <div>
                         <label className="block text-[11px] font-normal text-slate-900 mb-1">ชื่อแพ็กเกจปัจจุบัน</label>
                         <input 
                           type="text" 
                           value={packageUpdates?.package_name || ''} 
                           onChange={(e) => setPackageUpdates({...packageUpdates!, package_name: e.target.value})}
                           className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-sm font-normal focus:border-purple-500 outline-none"
                         />
                       </div>
                       <div>
                         <label className="block text-[11px] font-normal text-purple-700 mb-1 font-bold">จำนวนมื้อทั้งหมด (ยอดเต็ม)</label>
                         <input 
                           type="number" 
                           value={packageUpdates?.meals_total || 0} 
                           onChange={(e) => setPackageUpdates({...packageUpdates!, meals_total: parseInt(e.target.value) || 0})}
                           className="w-full p-2.5 bg-white border border-purple-300 rounded-xl text-sm font-bold text-purple-700 focus:border-purple-500 outline-none"
                         />
                         <p className="text-[10px] text-purple-400 mt-1">* แก้ไขเมื่อมีโปรโมชั่นแถมมื้อ เช่น 60+2 ให้ใส่เป็น 62</p>
                       </div>
                     </div>

                     {/* Stats & Prediction */}
                     <div className="bg-slate-900 p-6 rounded-2xl shadow-xl space-y-3">
                        {(() => {
                           const member = selectedPackage ? (Array.isArray(selectedPackage.members) ? selectedPackage.members[0] : selectedPackage.members) : null;
                           const isRetail = member?.member_type === 'retail' || selectedPackage?.id.toString().startsWith('retail_');
                           
                           const packageSchedules = memberSchedules.filter(s => s.package_id === selectedPackage?.id);
                           const totalSubscriptionOrdered = packageSchedules.filter(s => !s.is_extra_order).reduce((sum, s) => sum + (s.quantity || 1), 0);
                           
                           return (
                             <>
                               <h4 className="text-xs font-normal text-slate-400 uppercase tracking-widest border-b border-slate-700 pb-2">สถิติและคาดการณ์</h4>
                               <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-400">{isRetail ? 'ยอดสั่งรวมทั้งสิ้น:' : 'มื้ออาหารคงเหลือ:'}</span>
                                  <span className={`text-lg font-normal ${isRetail ? 'text-orange-400' : 'text-emerald-400'}`}>
                                    {isRetail ? `${totalSubscriptionOrdered} มื้อ` : `${selectedPackage?.meals_remaining} มื้อ`}
                                  </span>
                                  {(() => {
                                    const extraCount = packageSchedules.filter(s => s.is_extra_order).reduce((sum, s) => sum + (s.quantity || 1), 0);
                                    if (extraCount === 0) return null;
                                    return (
                                      <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-md bg-orange-500 text-white border border-orange-600 shadow-sm flex items-center gap-1">
                                        สั่งแยก {extraCount} มื้อ
                                      </span>
                                    );
                                  })()}
                               </div>
                               {!isRetail && (
                                 <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">คาดว่าจะหมดในวันที่:</span>
                                    <span className="text-sm font-normal text-blue-400">{calculateEstimateEndDate()}</span>
                                 </div>
                               )}
                               <p className="text-[10px] text-slate-500 italic mt-2">* คำนวณจากความถี่ในการวางแผนอาหารในสัปดาห์ปัจจุบัน</p>
                             </>
                           );
                        })()}
                     </div>
                  </div>
               </div>
               
               <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button 
                    onClick={handleSaveProfile}
                    disabled={isLoadingData}
                    className="px-8 py-3 bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/20 rounded-2xl text-sm font-normal transition-all flex items-center gap-2"
                  >
                    {isLoadingData && <Clock className="animate-spin" size={18} />}
                    บันทึกข้อมูลสมาชิก
                  </button>
               </div>
            </div>
        </div>
      )}

      {/* Simplified Meal Detail Modal */}
      <AnimatePresence>
        {isModalOpen && editingSlot && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 relative z-10"
            >
               <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-lg font-normal text-slate-800 flex items-center gap-2">
                    <UtensilsCrossed className="text-emerald-500" /> จัดการตารางอาหาร
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {/* Member Summary in Modal */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <User size={20} />
                      </div>
                      <div>
                        <h4 className="font-normal text-slate-800">
                          {Array.isArray(selectedPackage?.members) ? selectedPackage.members[0]?.full_name : selectedPackage?.members?.full_name}
                        </h4>
                        <p className="text-[10px] font-normal text-slate-500 uppercase tracking-widest">ข้อมูลสมาชิกและโปรโมชั่น</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <p className="text-[9px] font-normal text-slate-400 uppercase">เบอร์โทรศัพท์</p>
                        <p className="text-xs font-normal text-slate-700">{selectedPackage?.members?.phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-normal text-slate-400 uppercase">รอบจัดส่งปกติ</p>
                        <p className="text-xs font-normal text-blue-600">{selectedPackage?.members?.delivery_time || '11:00 - 13:00'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-normal text-red-400 uppercase">หมายเหตุ/แพ้</p>
                        <p className="text-xs font-normal text-red-600 truncate">{selectedPackage?.members?.allergy_notes || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-normal text-slate-400 uppercase">โปรโมชั่น</p>
                        <p className="text-xs font-normal text-slate-600 truncate">{selectedPackage?.package_name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <label className="block text-xs font-normal text-emerald-600 uppercase tracking-widest mb-2">เมนูอาหารที่เลือก</label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                        <UtensilsCrossed size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {menus.find(m => m.id === editingSlot.menuId)?.name || 'กรุณาเลือกรายการเมนูอาหารที่ต้องการ'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] font-bold text-emerald-500 uppercase">
                            {editingSlot.mealType === 'meal_1' ? 'มื้อเช้า' : editingSlot.mealType === 'meal_2' ? 'มื้อเที่ยง' : `มื้อ ${editingSlot.mealType.split('_')[1]}`}
                          </p>
                          {(() => {
                            const m = menus.find(menu => menu.id === editingSlot.menuId);
                            if (!m) return null;
                            const kcal = editingSlot.isNoRice ? (m.calories || 0) - 108 : (m.calories || 0);
                            const carbs = editingSlot.isNoRice ? (m.carbs || 0) - 23 : (m.carbs || 0);
                            return (
                              <span className="text-[10px] font-bold text-slate-400">
                                • 🔥 {kcal} kcal | C: {carbs}g
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                    {/* No Rice Toggle */}
                    <div 
                      onClick={() => setEditingSlot({...editingSlot, isNoRice: !editingSlot.isNoRice})}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${editingSlot.isNoRice ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${editingSlot.isNoRice ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                          {editingSlot.isNoRice ? <span className="text-lg">🥦</span> : <span className="text-lg">🍚</span>}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${editingSlot.isNoRice ? 'text-emerald-700' : 'text-slate-700'}`}>ไม่รับข้าว (เปลี่ยนเป็นผัก)</p>
                          <p className="text-[10px] font-medium text-slate-400">-108 kcal | -23g Carbs</p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${editingSlot.isNoRice ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200'}`}>
                        {editingSlot.isNoRice && <Plus size={14} className="text-white rotate-45" />}
                      </div>
                    </div>

                    {/* Menu Picker (Quick Search) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">ค้นหาและเลือกเมนู</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        placeholder="พิมพ์ชื่อเมนู..."
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-normal focus:border-emerald-500 outline-none"
                      />
                    </div>
                    {menuSearch && (
                      <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-inner">
                        {menus
                          .filter(m => m.menu_group === 'pinto' && m.name.toLowerCase().includes(menuSearch.toLowerCase()))
                          .map(m => (
                          <div 
                            key={m.id}
                            onClick={() => {
                              setEditingSlot({...editingSlot!, menuId: m.id});
                              setMenuSearch('');
                            }}
                            className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0 text-sm font-normal text-slate-700 flex justify-between items-center group"
                          >
                            <div className="flex flex-col">
                              <span>{m.name}</span>
                              <span className="text-[10px] text-slate-400 uppercase">{m.protein}kcal | {m.category}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-lg">เลือก</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">ประเภทมื้ออาหาร (Order Type)</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingSlot({...editingSlot!, isExtraOrder: false, orderType: 'subscription'})}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${!editingSlot.isExtraOrder ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
                      >
                        ในแพ็กเกจ
                      </button>
                      <button 
                        onClick={() => setEditingSlot({...editingSlot!, isExtraOrder: true, orderType: 'a-la-carte'})}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${editingSlot.isExtraOrder ? 'bg-orange-500 text-white border-orange-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
                      >
                        เมนูสั่งแยก (A-la-carte)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-normal text-slate-700 uppercase tracking-widest mb-2">จำนวน (มื้อ)</label>
                       <input 
                         type="number" 
                         min="1"
                         value={editingSlot.qty || ''}
                         onFocus={(e) => e.target.select()}
                         onChange={(e) => setEditingSlot({...editingSlot!, qty: Math.round(Number(e.target.value)) || 1})}
                         className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-normal text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-normal text-slate-700 uppercase tracking-widest mb-2">หมายเหตุเพิ่มเติม</label>
                       <input 
                         type="text" 
                         value={editingSlot.notes}
                         onChange={(e) => setEditingSlot({...editingSlot!, notes: e.target.value})}
                         placeholder="เช่น ไม่เผ็ด"
                         className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-normal text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                       />
                    </div>
                  </div>
               </div>
               
               <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  {editingSlot.scheduleId ? (
                    <button 
                      onClick={(e) => handleRemoveClick(e, editingSlot.scheduleId!)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl text-sm font-normal transition-all border border-red-100 shadow-sm"
                    >
                      <Trash2 size={16} /> ลบมื้อนี้
                    </button>
                  ) : <div></div>}
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-normal transition-all"
                    >
                      ยกเลิก
                    </button>
                    <button 
                      onClick={handleSaveModal}
                      disabled={isLoadingData}
                      className="flex items-center gap-2 px-8 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-normal hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      {isLoadingData ? <Clock className="animate-spin" size={18} /> : <Save size={18} />}
                      บันทึก
                    </button>
                  </div>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add New Package Modal */}
      {isAddPackageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
               <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-xl font-normal text-slate-800">เปิดโปรโมชั่นปิ่นโตใหม่</h3>
                  <button onClick={() => setIsAddPackageModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  <div>
                    <label className="block text-[10px] font-normal text-slate-500 uppercase tracking-widest mb-2">ค้นหา/เลือกชื่อลูกค้า (Existing Member)</label>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                          type="text"
                          placeholder="พิมพ์ชื่อหรือเบอร์โทรเพื่อค้นหา..."
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <select 
                        value={newPackage.member_id}
                        onChange={(e) => setNewPackage({...newPackage, member_id: e.target.value})}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none shadow-sm"
                      >
                        <option value="">-- เลือกรายชื่อลูกค้า ({members.filter(m => 
                          m.full_name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                          m.phone.includes(memberSearchQuery)
                        ).length} คน) --</option>
                        {members
                          .filter(m => 
                            m.full_name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                            m.phone.includes(memberSearchQuery)
                          )
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.full_name} ({m.phone})</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-normal text-slate-500 uppercase tracking-widest mb-2">เลือกโปรโมชั่นหลัก</label>
                    <select 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '7days') {
                          setNewPackage({
                            ...newPackage,
                            package_name: '- ผูกปิ่นโต 7 วัน (14 มื้อ) (×1) = ฿899',
                            meals_total: 15,
                            end_date: dayjs(newPackage.start_date).add(7, 'day').format('YYYY-MM-DD')
                          });
                        } else if (val === '14days') {
                          setNewPackage({
                            ...newPackage,
                            package_name: '- ผูกปิ่นโต 14 วัน (28 มื้อ) (×1) = ฿1,799',
                            meals_total: 30,
                            end_date: dayjs(newPackage.start_date).add(14, 'day').format('YYYY-MM-DD')
                          });
                        } else if (val === '30days') {
                          setNewPackage({
                            ...newPackage,
                            package_name: '- ผูกปิ่นโต 1 เดือน (60 มื้อ) (×1) = ฿3,799',
                            meals_total: 62,
                            end_date: dayjs(newPackage.start_date).add(30, 'day').format('YYYY-MM-DD')
                          });
                        }
                      }}
                      className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-normal text-emerald-800 focus:border-emerald-500 outline-none"
                    >
                      <option value="">-- เลือกรูปแบบโปรโมชั่น --</option>
                      <option value="7days">ผูกปิ่นโต 7 วัน (14+1 มื้อ)</option>
                      <option value="14days">ผูกปิ่นโต 14 วัน (28+2 มื้อ)</option>
                      <option value="30days">ผูกปิ่นโต 1 เดือน (60+2 มื้อ)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-normal text-slate-500 uppercase tracking-widest mb-2">จำนวนมื้อรวม</label>
                      <input 
                        type="number"
                        value={newPackage.meals_total}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setNewPackage({...newPackage, meals_total: Math.round(Number(e.target.value)) || 0})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-normal text-slate-500 uppercase tracking-widest mb-2">วันที่เริ่มทาน</label>
                      <input 
                        type="date"
                        value={newPackage.start_date}
                        onChange={(e) => setNewPackage({...newPackage, start_date: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
               </div>
               
               <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                   <button 
                    onClick={handleAddPackage}
                    disabled={isLoadingData}
                    className="w-full py-4 bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 rounded-2xl text-sm font-normal transition-all flex items-center justify-center gap-2"
                  >
                    {isLoadingData ? <Clock className="animate-spin" size={18} /> : <Save size={18} />}
                    ยืนยันเปิดแพ็กเกจ
                  </button>
               </div>
           </div>
        </div>
      )}
      {/* Macros Preview Modal */}
      {isMacrosModalOpen && macrosContent && (
        <div className="fixed inset-0 bg-slate-900/40 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-normal text-slate-800">สรุปโภชนาการรายวัน</h3>
                  <p className="text-[10px] font-normal text-indigo-400 uppercase tracking-widest">{macrosContent.date}</p>
                </div>
              </div>
              <button onClick={() => setIsMacrosModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3 overflow-y-auto max-h-[30vh] pr-2 custom-scrollbar">
                {macrosContent.meals.map((meal, i) => (
                  <div key={i} className="flex justify-between items-start p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">มื้อที่ {i+1}</p>
                      <p className="text-sm font-normal text-slate-800 truncate max-w-[180px]">{meal.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-indigo-600">{meal.kcal} <span className="text-[10px] font-normal text-slate-400">kcal</span></p>
                      <p className="text-[10px] text-slate-500">P:{meal.protein}g | C:{meal.carbs}g | F:{meal.fat}g</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-xl shadow-indigo-200">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/20">
                  <span className="text-sm font-normal opacity-80">🔥 พลังงานรวมทั้งหมด</span>
                  <span className="text-2xl font-bold">{macrosContent.totals.kcal} kcal</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/10 rounded-xl py-2">
                    <p className="text-[10px] opacity-70 uppercase">Protein</p>
                    <p className="text-sm font-bold">{macrosContent.totals.protein}g</p>
                  </div>
                  <div className="bg-white/10 rounded-xl py-2">
                    <p className="text-[10px] opacity-70 uppercase">Carbs</p>
                    <p className="text-sm font-bold">{macrosContent.totals.carbs}g</p>
                  </div>
                  <div className="bg-white/10 rounded-xl py-2">
                    <p className="text-[10px] opacity-70 uppercase">Fat</p>
                    <p className="text-sm font-bold">{macrosContent.totals.fat}g</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsMacrosModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-2xl text-sm font-normal hover:bg-slate-50 transition-all"
                >
                  ปิด
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(macrosContent.formattedText);
                    Swal.fire({
                      icon: 'success',
                      title: 'คัดลอกสำเร็จ!',
                      toast: true,
                      position: 'top-end',
                      timer: 2000,
                      showConfirmButton: false
                    });
                    setIsMacrosModalOpen(false);
                  }}
                  className="flex-[2] py-3 bg-emerald-500 text-white rounded-2xl text-sm font-normal shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <Copy size={16} /> คัดลอกสรุปส่งลูกค้า
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

