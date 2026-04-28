import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, MessageSquare, Plus, User, X, Clock, Save, 
  UtensilsCrossed, Copy, Clipboard, Search, FileText, Trash2, MapPin
} from 'lucide-react';
import dayjs from 'dayjs';
import { useKdsStore } from '../../../store/kdsStore';
import { useAuthStore } from '../../../store/authStore';
import { getWeekDays, formatDisplayDate } from '../../../lib/dateUtils';
import type { MemberMealSchedule } from '../../../types';

export const MemberPlanner: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf('isoWeek' as any).toDate());
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{
    scheduleId: string | null;
    date: string;
    mealType: string;
    menuId: string;
    qty: number;
    deliveryTime: string;
    notes: string;
  } | null>(null);
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [memberUpdates, setMemberUpdates] = useState<any>(null);

  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [newPackage, setNewPackage] = useState({
    member_id: '',
    package_name: '',
    meals_total: 14,
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: dayjs().add(7, 'day').format('YYYY-MM-DD')
  });

  const [menuSearch, setMenuSearch] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [sidebarSortBy, setSidebarSortBy] = useState<'latest' | 'name'>('latest');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

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

  const selectedPackage = activePackages.find(p => p.id === selectedPackageId);

  const filteredPackages = useMemo(() => {
    return [...activePackages]
      .filter(pkg => {
        const name = (Array.isArray(pkg.members) ? pkg.members[0]?.full_name : pkg.members?.full_name) || '';
        return name.toLowerCase().includes(sidebarSearchQuery.toLowerCase());
      })
      .sort((a, b) => {
        if (sidebarSortBy === 'name') {
          const nameA = (Array.isArray(a.members) ? a.members[0]?.full_name : a.members?.full_name) || '';
          const nameB = (Array.isArray(b.members) ? b.members[0]?.full_name : b.members?.full_name) || '';
          return nameA.localeCompare(nameB, 'th');
        } else {
          // เรียงจากล่าสุดไปหาเก่า (created_at descending)
          const dateA = a.created_at ? dayjs(a.created_at).valueOf() : 0;
          const dateB = b.created_at ? dayjs(b.created_at).valueOf() : 0;
          return dateB - dateA;
        }
      });
  }, [activePackages, sidebarSearchQuery, sidebarSortBy]);

  const getSchedulesForDate = (date: string): MemberMealSchedule[] => {
    return memberSchedules
      .filter(s => s.delivery_date === date)
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
        notes: existingSchedule.notes || ''
      });
    } else {
      // Find next available meal_type (1 to 6)
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
        notes: ''
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
      editingSlot.notes
    );
    
    setIsModalOpen(false);
  };

  const handleOpenProfile = () => {
    if (!selectedPackage?.members) return;
    setMemberUpdates({ ...selectedPackage.members });
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedPackage?.members || !memberUpdates) return;
    await updateMemberProfile(selectedPackage.members.id, memberUpdates);
    setIsProfileModalOpen(false);
  };

  const handleAddPackage = async () => {
    if (!newPackage.member_id || !newPackage.package_name) {
      alert('กรุณาเลือกชื่อลูกค้าและระบุชื่อแพ็กเกจ');
      return;
    }

    await addPintoPackage({
      ...newPackage,
      meals_remaining: newPackage.meals_total,
      days_total: dayjs(newPackage.end_date).diff(dayjs(newPackage.start_date), 'day'),
      days_remaining: dayjs(newPackage.end_date).diff(dayjs(newPackage.start_date), 'day'),
      status: 'active'
    });

    setIsAddPackageModalOpen(false);
  };

  const handleRemoveClick = async (e: React.MouseEvent, scheduleId: string) => {
    e.stopPropagation();
    if (window.confirm('ลบมื้อนี้ใช่ไหม?')) {
      await removeMemberSlot(scheduleId);
      setIsModalOpen(false);
    }
  };

  // Estimate days remaining based on current week's meal count
  const calculateEstimateEndDate = () => {
    if (!selectedPackage || selectedPackage.meals_remaining <= 0) return 'N/A';
    
    const mealsPerWeek = memberSchedules.reduce((sum, s) => sum + (s.quantity || 1), 0);
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
        {/* Left sidebar: Package List */}
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
            {/* ช่องค้นหาลูกค้า */}
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
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setSidebarSortBy('latest')}
                  className={`px-2 py-1 rounded-md text-[9px] font-normal uppercase transition-all ${sidebarSortBy === 'latest' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                >
                  ล่าสุด
                </button>
                <button 
                  onClick={() => setSidebarSortBy('name')}
                  className={`px-2 py-1 rounded-md text-[9px] font-normal uppercase transition-all ${sidebarSortBy === 'name' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                >
                  ชื่อ
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredPackages.length === 0 && (
               <div className="text-center p-6 text-slate-400 text-xs font-normal">ไม่พบข้อมูลลูกค้า</div>
            )}
            {/* Group packages by member_id */}
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
                <div className="px-3 py-1 text-sm font-normal text-slate-900 flex items-center gap-2 border-b border-slate-100 mb-1">
                  <User size={14} className="text-emerald-500" /> {group.member.full_name}
                </div>
                <div className="space-y-1">
                  {group.packages.map((pkg: any) => (
                    <div 
                      key={pkg.id} 
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        selectedPackageId === pkg.id 
                          ? 'bg-emerald-50 border-emerald-500 shadow-sm' 
                          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <p className={`text-sm font-normal truncate ${selectedPackageId === pkg.id ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {pkg.package_name}
                        </p>
                        <span className={`text-[11px] font-normal px-2 py-1 rounded-lg whitespace-nowrap ${
                          pkg.meals_remaining < 3 
                            ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' 
                            : (pkg.meals_total === 14 || pkg.meals_total === 15)
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : (pkg.meals_total === 28 || pkg.meals_total === 30)
                                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                : (pkg.meals_total === 60 || pkg.meals_total === 62)
                                  ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          เหลือ {pkg.meals_remaining} มื้อ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right area: Member Calendar */}
        {selectedPackage ? (
          <div className={`flex-1 flex flex-col overflow-hidden bg-[#F8FAFC] absolute md:relative inset-0 z-20 transition-transform ${selectedPackage ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
             <div className="px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 bg-white shadow-sm">
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
                             {Array.isArray(selectedPackage.members) ? selectedPackage.members[0]?.full_name : selectedPackage.members?.full_name}
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
                           <span className="text-[10px] md:text-xs font-normal text-slate-500 flex items-center gap-1">
                             <Clock size={12} className="text-purple-500" /> {selectedPackage.members?.zone || 'ไม่ระบุรอบส่ง'}
                           </span>
                           <span className="text-[10px] md:text-xs font-normal text-slate-500 flex items-center gap-1">
                             <MapPin size={12} className="text-emerald-500" /> {selectedPackage.members?.address || 'ไม่ระบุที่อยู่'}
                           </span>
                                                       <span className={`text-[10px] md:text-xs font-normal px-2 py-0.5 rounded-md border ${
                              selectedPackage.meals_remaining < 3
                                ? 'bg-red-50 text-red-600 border-red-100'
                                : (selectedPackage.meals_total === 14 || selectedPackage.meals_total === 15)
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  : (selectedPackage.meals_total === 28 || selectedPackage.meals_total === 30)
                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                    : (selectedPackage.meals_total === 60 || selectedPackage.meals_total === 62)
                                      ? 'bg-purple-50 text-purple-600 border-purple-100'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              เหลือ {selectedPackage.meals_remaining} มื้อ
                            </span>

                           {selectedPackage.members?.health_goal && (
                             <span className="text-[10px] md:text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{selectedPackage.members?.health_goal}</span>
                           )}
                       </div>
                    </div>
                </div>
                
                <div className="flex w-full md:w-auto items-center justify-between bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                  <button onClick={handlePrevWeek} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"><ChevronLeft size={16} /></button>
                  <span className="px-3 text-[10px] font-normal uppercase tracking-widest text-emerald-600 truncate">
                    {formatDisplayDate(weekDays[0].date)}
                  </span>
                  <button onClick={handleNextWeek} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"><ChevronRight size={16} /></button>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="grid grid-cols-1 xl:grid-cols-7 gap-4">
                  {weekDays.map(day => {
                    const daySchedules = getSchedulesForDate(day.date);
                    
                    return (
                      <div key={day.date} className={`bg-white rounded-2xl border ${day.isToday ? 'border-blue-400 shadow-md ring-2 ring-blue-500/10' : 'border-slate-200 shadow-sm'} overflow-hidden flex flex-col`}>
                        <div className={`px-4 py-3 border-b flex justify-between items-center ${day.isToday ? 'bg-blue-500 text-white' : 'bg-slate-50 border-slate-100'}`}>
                          <div>
                            <p className={`text-[10px] font-normal uppercase tracking-widest ${day.isToday ? 'text-blue-100' : 'text-slate-400'}`}>{day.dayName}</p>
                            <h3 className={`text-lg font-normal ${day.isToday ? 'text-white' : 'text-slate-800'}`}>{day.shortDate}</h3>
                          </div>
                            <div className="flex gap-1">
                              {daySchedules.length > 0 && (
                                <button 
                                  onClick={() => clearDayPlan(day.date, selectedPackage.id)}
                                  title="ลบแผนทั้งหมดของวันนี้"
                                  className={`p-1.5 rounded-lg transition-colors ${day.isToday ? 'hover:bg-red-600 text-blue-100' : 'hover:bg-red-50 text-red-400'}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                              <button 
                                onClick={() => copyDayPlan(day.date)}
                                title="คัดลอกแผนของวันนี้"
                                className={`p-1.5 rounded-lg transition-colors ${day.isToday ? 'hover:bg-blue-600 text-blue-100' : 'hover:bg-slate-200 text-slate-400'}`}
                              >
                                <Copy size={14} />
                              </button>
                              {copiedDaySlots && (
                                <button 
                                  onClick={() => pasteDayPlan(day.date, selectedPackage.id, selectedPackage.member_id)}
                                  title="วางแผนที่คัดลอกมา"
                                  className={`p-1.5 rounded-lg transition-colors ${day.isToday ? 'bg-white text-blue-500' : 'bg-emerald-500 text-white shadow-sm animate-pulse'}`}
                                >
                                  <Clipboard size={14} />
                                </button>
                              )}
                            </div>
                        </div>
                        <div className="p-3 space-y-2 flex-1 flex flex-col bg-slate-50">
                          {daySchedules.map((schedule, idx) => (
                            <div 
                              key={schedule.id}
                              onClick={() => openModal(day.date, schedule)}
                              className="relative flex flex-col p-3 rounded-xl border bg-white border-blue-200 hover:border-emerald-500 cursor-pointer shadow-sm transition-all group"
                            >
                              <div className="flex justify-between items-center mb-2">
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

      {/* Member Profile Modal */}
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
               
               <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                  {/* Left Column: Personal & Address */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                      <h4 className="text-sm font-normal text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                        <User size={16} className="text-emerald-500" /> ข้อมูลส่วนตัว
                      </h4>
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

                  {/* Right Column: Health & Marketing */}
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
                            value={memberUpdates.zone || ''} 
                            onChange={(e) => setMemberUpdates({...memberUpdates, zone: e.target.value})}
                            className="w-full p-2.5 bg-white border border-orange-200 rounded-xl text-sm font-normal text-slate-800 focus:border-orange-500 outline-none"
                          >
                             <option value="">-- เลือกเวลาส่ง --</option>
                             <option value="11:00 - 13:00">11:00 - 13:00</option>
                             <option value="15:00 - 17:00">15:00 - 17:00</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Prediction */}
                    <div className="bg-slate-900 p-6 rounded-2xl shadow-xl space-y-3">
                       <h4 className="text-xs font-normal text-slate-400 uppercase tracking-widest border-b border-slate-700 pb-2">สถิติและคาดการณ์</h4>
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">มื้ออาหารคงเหลือ:</span>
                          <span className="text-lg font-normal text-emerald-400">{selectedPackage?.meals_remaining} มื้อ</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">คาดว่าจะหมดในวันที่:</span>
                          <span className="text-sm font-normal text-blue-400">{calculateEstimateEndDate()}</span>
                       </div>
                       <p className="text-[10px] text-slate-500 italic mt-2">* คำนวณจากความถี่ในการวางแผนอาหารในสัปดาห์ปัจจุบัน</p>
                    </div>
                  </div>
               </div>
               
               <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                   <button 
                    onClick={handleSaveProfile}
                    className="px-8 py-3 bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 rounded-2xl text-sm font-normal transition-all"
                  >
                    บันทึกข้อมูลสมาชิก
                  </button>
               </div>
            </div>
        </div>
      )}

      {/* Simplified Meal Detail Modal */}
      {isModalOpen && editingSlot && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border border-slate-200">
               <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-lg font-normal text-slate-800 flex items-center gap-2">
                    <UtensilsCrossed className="text-emerald-500" /> จัดการตารางอาหาร
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="p-6 space-y-4">
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
                        <p className="text-xs font-normal text-blue-600">{selectedPackage?.members?.zone || '11:00 - 13:00'}</p>
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
                        <p className="text-sm font-normal text-slate-800">
                          {menus.find(m => m.id === editingSlot.menuId)?.name || 'กรุณาเลือกรายการเมนูอาหารที่ต้องการ'}
                        </p>
                        <p className="text-[10px] font-normal text-emerald-500 uppercase">
                          {editingSlot.mealType === 'meal_1' ? 'มื้อเช้า' : editingSlot.mealType === 'meal_2' ? 'มื้อเที่ยง' : `มื้อ ${editingSlot.mealType.split('_')[1]}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Picker (Quick Search) */}
                  <div>
                    <label className="block text-xs font-normal text-slate-700 uppercase tracking-widest mb-2">ค้นหาและเลือกเมนู</label>
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
                              setEditingSlot({...editingSlot, menuId: m.id});
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-normal text-slate-700 uppercase tracking-widest mb-2">จำนวน (มื้อ)</label>
                       <input 
                         type="number" 
                         min="1"
                         value={editingSlot.qty}
                         onChange={(e) => setEditingSlot({...editingSlot!, qty: parseInt(e.target.value) || 1})}
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
                      className="flex items-center gap-2 px-8 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-normal hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      <Save size={18} /> บันทึก
                    </button>
                  </div>
               </div>
            </div>
        </div>
      )}
      {/* Add New Package Modal */}
      {isAddPackageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
               <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-xl font-normal text-slate-800">เปิดโปรโมชั่นปิ่นโตใหม่</h3>
                  <button onClick={() => setIsAddPackageModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="p-8 space-y-6">
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
                        onChange={(e) => setNewPackage({...newPackage, meals_total: parseInt(e.target.value) || 0})}
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
    </div>
  );
};
