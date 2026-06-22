import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, Search, Plus, User, Phone, MapPin, 
  Calendar, ChevronRight, ChevronLeft, Edit3, 
  X, Save, Clock, Package, 
  CheckCircle2, AlertCircle, Trash2, ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemberStore } from '../../../store/memberStore';
import { useMenuStore } from '../../../store/menuStore';
import dayjs from 'dayjs';
import { formatDisplayDate } from '../../../lib/dateUtils';
import type { Member } from '../../../types';
import Swal from 'sweetalert2';
import { supabase } from '../../../config/supabase';

export const MemberManagement: React.FC = () => {
  const { 
    members, activePackages, buddyGroups, isLoading: isLoadingMember, 
    loadMemberData, addMember, updateProfile, 
    addPackage, cancelPackage,
    createQuickRetailOrder, banMember, unbanMember
  } = useMemberStore();
  
  const { menus, loadMenus } = useMenuStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [promotions, setPromotions] = useState<any[]>([]);
  const [promoSearchQuery, setPromoSearchQuery] = useState('');
  const [isPromoDropdownOpen, setIsPromoDropdownOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<any>(null);

  // Sorting helper
  const getSortedPromotions = (list: any[]) => {
    return [...list].sort((a, b) => {
      const getPriority = (promo: any) => {
        const type = (promo.promotion_type || 'PINTO').toUpperCase();
        if (type === 'PINTO') {
          if (promo.code?.startsWith('PINTO')) return 1;
          return 2;
        }
        if (type === 'MUSCLE') return 3;
        if (type === 'RETAIL') return 4;
        return 5;
      };
      
      const pA = getPriority(a);
      const pB = getPriority(b);
      
      if (pA !== pB) return pA - pB;
      return Number(a.price || 0) - Number(b.price || 0);
    });
  };
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [isQuickOrderModalOpen, setIsQuickOrderModalOpen] = useState(false);
  const [isBuddyDropdownOpen, setIsBuddyDropdownOpen] = useState(false);
  const [buddySearchQuery, setBuddySearchQuery] = useState('');
  const [typeFilter] = useState<'all' | 'member' | 'retail'>('all');

  // Forms
  const [newMember, setNewMember] = useState({
    full_name: '',
    phone: '',
    line_id: '',
    address: '',
    delivery_time: '',
    health_goal: '',
    allergy_notes: '',
    member_type: 'member' as 'member' | 'retail'
  });

  const [quickOrder, setQuickOrder] = useState({
    phone: '',
    full_name: '',
    order_text: '', // Added for raw text input
    parsedItems: [] as { menu_item_id: string, menu_name: string, quantity: number, notes: string }[],
  });

  const parseOrderText = (text: string) => {
    // Regex to match items like "- Menu Name (x1) = ฿59"
    const lines = text.split('\n');
    const items: any[] = [];
    let currentItem: any = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        // Start of a new item
        const menuPart = trimmed.substring(2);
        const qtyMatch = menuPart.match(/\((?:x|×)(\d+)\)/);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        const name = menuPart.split('(')[0].trim();
        
        // Try to match with existing menus
        const matched = menus.find(m => m.name.includes(name) || name.includes(m.name));
        
        currentItem = {
          menu_item_id: matched?.id || '',
          menu_name: name,
          quantity: qty,
          notes: ''
        };
        items.push(currentItem);
      } else if (currentItem && trimmed && !trimmed.startsWith('-')) {
        // This is a note/detail line for the current item
        currentItem.notes += (currentItem.notes ? ' ' : '') + trimmed;
      }
    });

    setQuickOrder(prev => ({ ...prev, parsedItems: items, order_text: text }));
  };

  const matchedMember = useMemo(() => {
    if (newMember.phone.length < 9) return null;
    return members.find(m => m.phone === newMember.phone);
  }, [members, newMember.phone]);

  const [editMember, setEditMember] = useState<Member | null>(null);
  
  const [newPackage, setNewPackage] = useState({
    package_name: '',
    meals_total: 14,
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: dayjs().add(14, 'day').format('YYYY-MM-DD'),
    delivery_slot: '11:00 - 13:00',
    buddy_member_id: ''
  });

  useEffect(() => {
    loadMemberData();
    loadMenus();
    
    // Fetch promotions dynamically
    supabase.from('promotions')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setPromotions(data);
      });
  }, [loadMemberData, loadMenus]);

  const filteredMembers = useMemo(() => {
    return members
      .filter(m => {
        const matchesSearch = m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             m.phone.includes(searchQuery);
        const matchesType = typeFilter === 'all' || m.member_type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
  }, [members, searchQuery, typeFilter]);

  const selectedMember = useMemo(() => {
    return members.find(m => m.id === selectedMemberId);
  }, [members, selectedMemberId]);

  const memberPackages = useMemo(() => {
    return activePackages.filter(p => p.member_id === selectedMemberId);
  }, [activePackages, selectedMemberId]);

  const getBuddyName = useCallback((buddyGroupId: string | undefined | null, currentMemberId: string) => {
    if (!buddyGroupId) return null;
    const buddyPackage = activePackages.find(p => p.buddy_group_id === buddyGroupId && p.member_id !== currentMemberId);
    if (!buddyPackage) return null;
    const buddyMember = members.find(m => m.id === buddyPackage.member_id);
    return buddyMember?.full_name || null;
  }, [activePackages, members]);

  const eligibleBuddyMembers = useMemo(() => {
    return members.filter(m => {
      if (m.id === selectedMemberId) return false;
      
      // Buddy must have an active package that matches the selected package name
      // and must not already be in a buddy group
      const hasMatchingPackage = activePackages.some(p => 
        p.member_id === m.id && 
        p.package_name === newPackage.package_name &&
        !p.buddy_group_id
      );
      
      return hasMatchingPackage;
    });
  }, [members, selectedMemberId, activePackages, newPackage.package_name]);

  const handleAddMember = async () => {
    if (!newMember.full_name || !newMember.phone) {
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบ',
        text: 'กรุณาใส่ชื่อและเบอร์โทรศัพท์'
      });
      return;
    }
    try {
      Swal.fire({
        title: 'กำลังลงทะเบียน...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await addMember(newMember);
      setIsAddModalOpen(false);
      setNewMember({
        full_name: '',
        phone: '',
        line_id: '',
        address: '',
        delivery_time: '',
        health_goal: '',
        allergy_notes: '',
        member_type: 'member'
      });

      Swal.fire({
        icon: 'success',
        title: 'ลงทะเบียนสำเร็จ',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('members_phone_key')) {
        const existing = members.find(m => m.phone === newMember.phone);
        
        const result = await Swal.fire({
          icon: 'error',
          title: 'เบอร์โทรศัพท์นี้มีในระบบแล้ว',
          text: 'ต้องการไปที่หน้าโปรไฟล์ของลูกค้าท่านนี้หรือไม่?',
          showCancelButton: true,
          confirmButtonText: 'ไปที่โปรไฟล์',
          cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed && existing) {
          setSelectedMemberId(existing.id);
          setIsAddModalOpen(false);
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: err.message
        });
      }
    }
  };

  const handleUpdateMember = async () => {
    if (!editMember) return;
    try {
      Swal.fire({
        title: 'กำลังอัปเดตข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await updateProfile(editMember.id, editMember);
      setIsEditModalOpen(false);
      
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message
      });
    }
  };

  const handleAddPackage = async () => {
    if (!selectedMemberId || !newPackage.package_name) return;
    try {
      Swal.fire({
        title: 'กำลังเปิดแพ็กเกจ...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await addPackage({
        member_id: selectedMemberId,
        package_name: newPackage.package_name,
        meals_total: newPackage.meals_total,
        meals_remaining: newPackage.meals_total,
        days_total: dayjs(newPackage.end_date).diff(dayjs(newPackage.start_date), 'day'),
        days_remaining: dayjs(newPackage.end_date).diff(dayjs(newPackage.start_date), 'day'),
        start_date: newPackage.start_date,
        end_date: newPackage.end_date,
        status: 'active',
        delivery_slot: newPackage.delivery_slot,
        buddy_member_id: newPackage.buddy_member_id || undefined
      });
      
      setIsAddPackageModalOpen(false);
      
      Swal.fire({
        icon: 'success',
        title: 'เปิดแพ็กเกจสำเร็จ',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message
      });
    }
  };

  if (isLoadingMember && members.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F8FAFC]">
         <div className="animate-pulse flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-emerald-600 font-normal tracking-widest uppercase">กำลังโหลดข้อมูลสมาชิก...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-[#F8FAFC] overflow-hidden relative">
      
      {/* 1. Member List Sidebar */}
      <div className={`${selectedMemberId ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-white border-r border-slate-200 flex-col h-full z-10 shadow-sm relative`}>
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-normal text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="text-emerald-500" /> รายชื่อสมาชิก
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsQuickOrderModalOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-1 px-3"
                title="ออเดอร์รายย่อยด่วน"
              >
                <Package size={18} />
                <span className="text-xs font-normal">สั่งด่วน</span>
              </button>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <div className="relative group flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="ค้นหาชื่อ หรือ เบอร์โทร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal focus:border-emerald-500 outline-none transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredMembers.map(member => (
            <div 
              key={member.id}
              onClick={() => setSelectedMemberId(member.id)}
              className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                selectedMemberId === member.id 
                  ? 'bg-emerald-50 border-emerald-500 shadow-md translate-x-1' 
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-normal ${
                  selectedMemberId === member.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {member.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-normal text-slate-800 truncate">{member.full_name}</p>
                  <p className="text-[11px] font-normal text-slate-500 mt-0.5">{member.phone}</p>
                </div>
                {member.is_banned && <ShieldAlert size={16} className="text-red-500 animate-pulse" />}
                <ChevronRight size={16} className={selectedMemberId === member.id ? 'text-emerald-500' : 'text-slate-300'} />
              </div>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="text-center p-8 opacity-40">
              <Users size={48} className="mx-auto mb-3" />
              <p className="text-sm font-normal">ไม่พบข้อมูลสมาชิก</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Detail View Area */}
      <div className={`${!selectedMemberId ? 'hidden md:flex' : 'flex'} flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 relative`}>
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-multiply" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

        {selectedMember ? (
          <motion.div 
            key={selectedMember.id}
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 lg:space-y-8 relative z-10 custom-scrollbar"
          >
            {/* Mobile Header with Back Button */}
            <div className="md:hidden flex items-center justify-between mb-2">
               <button 
                 onClick={() => setSelectedMemberId(null)}
                 className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 shadow-sm"
               >
                  <ChevronLeft size={20} />
               </button>
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">ข้อมูลสมาชิก</p>
               <div className="w-10 h-10"></div>
            </div>

            {/* Profile Header Card - Bold & Dramatic */}
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }}
              className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-6 md:p-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center relative overflow-hidden group"
            >
               {/* Decorative blurs */}
               <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-400/10 rounded-full -mr-32 -mt-32 blur-[80px] pointer-events-none group-hover:bg-emerald-400/20 transition-all duration-1000"></div>
               <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full -ml-20 -mb-20 blur-[80px] pointer-events-none"></div>
               
               <div className="w-24 h-24 md:w-36 md:h-36 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-inner border border-emerald-100/50 relative">
                  <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-[2rem]"></div>
                  <User size={56} className="relative z-10" strokeWidth={1.5} />
               </div>
               
               <div className="flex-1 min-w-0 space-y-4 z-10">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">{selectedMember.full_name}</h1>
                     {selectedMember.is_banned ? (
                       <span className="px-4 py-1.5 bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-lg shadow-red-500/20 flex items-center gap-2 w-max animate-pulse">
                         <ShieldAlert size={14} /> BANNED / BLACKLIST
                       </span>
                     ) : (
                       <div className="flex items-center gap-3">
                         <span className="px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 w-max">
                           <CheckCircle2 size={14} /> ACTIVE
                         </span>
                         <button 
                           onClick={async () => {
                             const { value: reason } = await Swal.fire({
                               title: 'ระงับสมาชิก',
                               input: 'textarea',
                               inputLabel: 'ระบุเหตุผลในการระงับ (Blacklist)',
                               inputPlaceholder: 'เช่น ลูกค้าสร้างความวุ่นวาย...',
                               inputValidator: (value) => {
                                 if (!value) return 'กรุณาระบุเหตุผลในการระงับ';
                               },
                               showCancelButton: true,
                               confirmButtonText: 'ยืนยันการระงับ',
                               cancelButtonText: 'ยกเลิก',
                               confirmButtonColor: '#ef4444',
                             });
                             if (reason) await banMember(selectedMember.id, reason);
                           }}
                           className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1 transition-all px-3 py-1.5 rounded-full hover:bg-red-50"
                         >
                           <ShieldAlert size={14} /> แบน (Ban)
                         </button>
                       </div>
                     )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-y-3 gap-x-6 pt-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Phone size={14}/></div>
                      <p className="text-sm font-medium text-slate-700">{selectedMember.phone}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Clock size={14}/></div>
                      <p className="text-sm font-medium text-slate-700">{selectedMember.delivery_time || 'ไม่ระบุรอบส่ง'}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#00B900]/10 flex items-center justify-center text-[#00B900] font-bold text-xs">L</div>
                      <p className="text-sm font-medium text-slate-700">{selectedMember.line_id || 'ไม่มี LINE'}</p>
                    </div>
                  </div>
               </div>
               
               <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto z-10 shrink-0">
                  <button 
                    onClick={() => { setEditMember({...selectedMember}); setIsEditModalOpen(true); }}
                    className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 size={18} /> แก้ไขข้อมูลโปรไฟล์
                  </button>
                  
                  {selectedMember.is_banned && (
                      <button 
                        onClick={async () => {
                          const { value: reason } = await Swal.fire({
                            title: 'ยกเลิกการระงับสมาชิก',
                            input: 'textarea',
                            inputLabel: 'ระบุเหตุผลในการปลดแบน',
                            inputPlaceholder: 'เช่น ตกลงกันได้แล้ว...',
                            inputValidator: (value) => {
                              if (!value) return 'กรุณาระบุเหตุผลในการปลดแบนด้วยค่ะ';
                            },
                            showCancelButton: true,
                            confirmButtonText: 'ยืนยันการปลดแบน',
                            confirmButtonColor: '#10b981',
                          });
                          if (reason) await unbanMember(selectedMember.id, reason);
                        }}
                        className="w-full sm:w-auto py-3.5 bg-white border-2 border-emerald-500 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <CheckCircle2 size={18} /> ปลดแบนสมาชิก
                      </button>
                  )}
               </div>
            </motion.div>

            {/* Bento Box Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
               
               {/* Left Column: Details (Col span 4) */}
               <motion.div 
                 variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }}
                 className="lg:col-span-4 space-y-6 lg:space-y-8"
               >
                  {/* Health Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 relative overflow-hidden group">
                     <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                     <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                           ข้อมูลส่วนตัว & สุขภาพ
                        </h3>
                     </div>
                     
                     <div className="space-y-6">
                        <div>
                           <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2 tracking-wider">เป้าหมายสุขภาพ</p>
                           <p className="text-base font-semibold text-slate-800">{selectedMember.health_goal || 'ไม่ระบุ'}</p>
                        </div>
                        
                        <div className="h-px w-full bg-slate-100"></div>
                        
                        <div>
                           <p className="text-[10px] font-bold text-red-500 uppercase mb-2 tracking-wider flex items-center gap-1">
                              <AlertCircle size={12} /> ข้อมูลการแพ้
                           </p>
                           <p className={`text-base font-semibold ${selectedMember.allergy_notes ? 'text-red-600' : 'text-slate-500'}`}>
                              {selectedMember.allergy_notes || 'ไม่มีประวัติการแพ้'}
                           </p>
                        </div>

                        <div className="h-px w-full bg-slate-100"></div>
                        
                        <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider flex items-center gap-1">
                              <MapPin size={12} /> ที่อยู่จัดส่ง
                           </p>
                           <p className="text-sm font-medium text-slate-700 leading-relaxed">{selectedMember.address || 'ไม่ระบุที่อยู่'}</p>
                        </div>
                     </div>
                  </div>

                  {/* Stats Card */}
                  <div className="bg-slate-900 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
                     <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                     <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-6 relative z-10">สถิติลูกค้า</h3>
                     
                     <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="flex flex-col">
                           <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">สั่งรวมทั้งหมด</p>
                           <p className="text-4xl font-light tracking-tighter text-white">{selectedMember.total_orders || 0} <span className="text-base font-normal text-slate-500 tracking-normal">ครั้ง</span></p>
                        </div>
                        <div className="flex flex-col">
                           <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">ความภักดี</p>
                           <p className="text-4xl font-light tracking-tighter text-emerald-400">95%</p>
                        </div>
                     </div>
                  </div>
               </motion.div>

               {/* Right Column: Packages (Col span 8) */}
               <motion.div 
                 variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }}
                 className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden"
               >
                  <div className="p-6 lg:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                     <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                           <Package size={24} />
                        </div>
                        <div>
                           <h3 className="text-xl font-bold text-slate-900 tracking-tight">แพ็กเกจปิ่นโตปัจจุบัน</h3>
                           <p className="text-sm font-medium text-slate-500">จัดการแพ็กเกจและสิทธิ์การทานอาหาร</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setIsAddPackageModalOpen(true)}
                       className="w-full sm:w-auto px-5 py-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-sm hover:shadow-emerald-500/20 flex items-center justify-center gap-2 border border-emerald-200 hover:border-emerald-500 group"
                     >
                       <Plus size={18} className="transition-transform group-hover:rotate-90" /> เปิดแพ็กเกจใหม่
                     </button>
                  </div>

                  <div className="p-6 lg:p-8 flex-1 space-y-5">
                     {memberPackages.length === 0 ? (
                       <div className="h-full min-h-[250px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50">
                          <Package size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                          <p className="text-slate-500 font-medium text-sm">ยังไม่มีแพ็กเกจที่กำลังใช้งาน</p>
                          <button 
                            onClick={() => setIsAddPackageModalOpen(true)}
                            className="mt-4 text-emerald-600 font-bold text-sm hover:underline"
                          >
                            เปิดแพ็กเกจแรกเลย
                          </button>
                       </div>
                     ) : (
                       memberPackages.map(pkg => (
                         <div 
                           key={pkg.id} 
                           className="group relative bg-white border-2 border-slate-100 hover:border-emerald-500 rounded-[1.5rem] p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1"
                         >
                            <div className="flex flex-col md:flex-row justify-between gap-6 md:items-center">
                               <div className="space-y-3 flex-1">
                                  <div className="flex flex-col gap-2 items-start">
                                     <div className="flex items-center gap-3">
                                        <h4 className="text-xl font-bold text-slate-900 tracking-tight">{pkg.package_name}</h4>
                                        {pkg.status === 'active' && (
                                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                                        )}
                                     </div>
                                     {pkg.buddy_group_id && getBuddyName(pkg.buddy_group_id, pkg.member_id) && (
                                       <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100/50 px-2.5 py-1 rounded-full shadow-[0_2px_10px_-3px_rgba(244,114,182,0.2)] mb-1">
                                          <span className="text-pink-500 text-sm">👯</span>
                                          <span className="text-[11px] font-bold text-pink-600 tracking-wide">
                                            คู่หูกับคุณ {getBuddyName(pkg.buddy_group_id, pkg.member_id)}
                                          </span>
                                       </div>
                                     )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                                     <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><Calendar size={14}/> {formatDisplayDate(pkg.start_date)} - {formatDisplayDate(pkg.end_date)}</span>
                                     <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><Clock size={14}/> รอบส่ง: {pkg.delivery_slot}</span>
                                  </div>
                               </div>
                               
                               <div className="flex items-center gap-6">
                                  <div className="flex flex-col items-end">
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">คงเหลือ</p>
                                     <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold tracking-tighter text-slate-900">{pkg.meals_remaining}</span>
                                        <span className="text-sm font-medium text-slate-400 flex items-center gap-1">
                                          / {pkg.meals_total} มื้อ
                                          {(pkg.bonus_meals && pkg.bonus_meals > 0) ? (
                                            <span className="inline-flex items-center justify-center bg-pink-100 text-pink-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-1" title="มื้อโบนัสคู่หู">
                                              +{pkg.bonus_meals}
                                            </span>
                                          ) : null}
                                        </span>
                                     </div>
                                     <div className="w-32 h-2 bg-slate-100 rounded-full mt-2.5 overflow-hidden shadow-inner">
                                        <div 
                                           className={`h-full rounded-full transition-all duration-1000 ${pkg.meals_remaining < 3 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`}
                                           style={{ width: `${Math.max(0, Math.min(100, (pkg.meals_remaining / pkg.meals_total) * 100))}%` }}
                                        ></div>
                                     </div>
                                  </div>
                                  
                                  <div className="w-px h-16 bg-slate-100 hidden sm:block"></div>
                                  
                                  <button 
                                     onClick={async () => {
                                        const result = await Swal.fire({
                                           title: 'ยกเลิกแพ็กเกจ?',
                                           text: 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกแพ็กเกจนี้? ข้อมูลโควต้าจะถูกลบและไม่สามารถกู้คืนได้',
                                           icon: 'warning',
                                           showCancelButton: true,
                                           confirmButtonColor: '#ef4444',
                                           cancelButtonColor: '#94a3b8',
                                           confirmButtonText: 'ใช่, ยกเลิกแพ็กเกจ',
                                           cancelButtonText: 'กลับไป'
                                        });
                                        if (result.isConfirmed) {
                                           cancelPackage(pkg.id);
                                        }
                                     }}
                                     className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border-2 border-red-100 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20 transition-all active:scale-95"
                                     title="ยกเลิกแพ็กเกจ"
                                  >
                                     <Trash2 size={20} strokeWidth={2.5} />
                                  </button>
                               </div>
                            </div>
                         </div>
                       ))
                     )}
                  </div>
               </motion.div>
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-emerald-50/40"></div>
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} 
               animate={{ opacity: 1, scale: 1 }} 
               className="relative z-10 flex flex-col items-center text-center max-w-md p-6"
             >
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/10 border border-emerald-100 relative">
                   <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-2xl"></div>
                   <Users size={48} className="text-emerald-500 relative z-10" strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">ระบบจัดการสมาชิก & ปิ่นโต</h2>
                <p className="text-base font-medium text-slate-500 leading-relaxed">เลือกสมาชิกจากรายชื่อด้านซ้ายเพื่อดูข้อมูล แก้ไขโปรไฟล์ หรือจัดการแพ็กเกจ</p>
             </motion.div>
          </div>
        )}
      </div>

      {/* --- Modals --- */}

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
               <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                        <Plus size={20} />
                     </div>
                     <h3 className="text-xl font-normal text-slate-800">ลงทะเบียนสมาชิกใหม่</h3>
                  </div>
                  <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-200 text-slate-400 transition-all">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-4">
                     <div>
                        <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                        <input 
                           type="text" 
                           placeholder="ชื่อลูกค้า..."
                           value={newMember.full_name} 
                           onChange={(e) => setNewMember({...newMember, full_name: e.target.value})}
                           className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-normal text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
                        />
                     </div>
                     <div>
                        <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
                        <input 
                           type="text" 
                           placeholder="08X-XXX-XXXX"
                           value={newMember.phone} 
                           onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                           className={`w-full p-3.5 border rounded-2xl text-sm font-normal focus:bg-white outline-none transition-all shadow-inner ${
                             matchedMember ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                           }`}
                        />
                        {matchedMember && (
                           <div className="mt-2 p-3 bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                              <div className="flex items-center gap-2 text-amber-800">
                                 <AlertCircle size={14} />
                                 <p className="text-[11px] font-normal">พบข้อมูลลูกค้าท่านนี้แล้วในระบบ</p>
                              </div>
                              <button 
                                 onClick={() => { setSelectedMemberId(matchedMember.id); setIsAddModalOpen(false); }}
                                 className="text-[10px] font-normal bg-amber-200 hover:bg-amber-300 px-2 py-1 rounded-lg transition-colors"
                              >
                                 ไปที่โปรไฟล์
                              </button>
                           </div>
                        )}
                     </div>
                      <div>
                         <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ประเภทลูกค้า</label>
                         <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                            <button 
                               type="button"
                               onClick={() => setNewMember({...newMember, member_type: 'member'})}
                               className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${newMember.member_type === 'member' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                               สมาชิกปิ่นโต
                            </button>
                            <button 
                               type="button"
                               onClick={() => setNewMember({...newMember, member_type: 'retail'})}
                               className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${newMember.member_type === 'retail' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                               ลูกค้ารายย่อย
                            </button>
                         </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">LINE ID</label>
                        <input 
                           type="text" 
                           placeholder="@lineid"
                           value={newMember.line_id} 
                           onChange={(e) => setNewMember({...newMember, line_id: e.target.value})}
                           className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-normal text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
                        />
                     </div>
                     <div>
                        <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">รอบจัดส่งปกติ</label>
                        <select 
                           value={newMember.delivery_time || ''} 
                           onChange={(e) => setNewMember({...newMember, delivery_time: e.target.value})}
                           className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none transition-all shadow-sm"
                        >
                           <option value="">-- เลือกเวลาส่ง --</option>
                           <option value="11:00 - 13:00">11:00 - 13:00</option>
                           <option value="15:00 - 17:00">15:00 - 17:00</option>
                        </select>
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                     <div>
                        <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ที่อยู่จัดส่ง</label>
                        <textarea 
                           rows={3}
                           placeholder="ที่อยู่โดยละเอียด..."
                           value={newMember.address} 
                           onChange={(e) => setNewMember({...newMember, address: e.target.value})}
                           className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-normal text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner resize-none"
                        />
                     </div>
                     <div>
                        <label className="block text-[11px] font-normal text-emerald-600 uppercase tracking-widest mb-1.5 ml-1">เป้าหมายสุขภาพ</label>
                        <input 
                           type="text" 
                           placeholder="เช่น ลดน้ำหนัก, เพิ่มกล้ามเนื้อ"
                           value={newMember.health_goal} 
                           onChange={(e) => setNewMember({...newMember, health_goal: e.target.value})}
                           className="w-full p-3.5 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-sm font-normal text-emerald-800 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
                        />
                     </div>
                     <div>
                        <label className="block text-[11px] font-normal text-red-600 uppercase tracking-widest mb-1.5 ml-1">สิ่งที่แพ้ / ไม่ทาน</label>
                        <input 
                           type="text" 
                           placeholder="ระบุสิ่งที่ลูกค้าแพ้..."
                           value={newMember.allergy_notes} 
                           onChange={(e) => setNewMember({...newMember, allergy_notes: e.target.value})}
                           className="w-full p-3.5 bg-red-50/30 border border-red-100 rounded-2xl text-sm font-normal text-red-800 focus:border-red-500 focus:bg-white outline-none transition-all shadow-inner"
                        />
                     </div>
                  </div>
               </div>
               
               <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                   <button 
                     onClick={() => setIsAddModalOpen(false)}
                     className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl text-sm font-normal hover:bg-slate-100 transition-all"
                   >
                     ยกเลิก
                   </button>
                   <button 
                     onClick={handleAddMember}
                     className="px-10 py-3 bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 rounded-2xl text-sm font-normal transition-all flex items-center gap-2"
                   >
                     <Save size={18} /> ยืนยันการสมัครสมาชิก
                   </button>
               </div>
            </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {isEditModalOpen && editMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
               <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900 border border-slate-200">
                        <User size={20} />
                     </div>
                     <h3 className="text-xl font-normal text-slate-800">แก้ไขข้อมูลสมาชิก</h3>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-all">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-4">
                     <div>
                        <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ชื่อ-นามสกุล</label>
                        <input 
                           type="text" 
                           value={editMember.full_name} 
                           onChange={(e) => setEditMember({...editMember, full_name: e.target.value})}
                           className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none transition-all shadow-sm"
                        />
                     </div>
                     <div>
                        <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">เบอร์โทรศัพท์</label>
                        <input 
                           type="text" 
                           value={editMember.phone} 
                           onChange={(e) => setEditMember({...editMember, phone: e.target.value})}
                           className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none transition-all shadow-sm"
                        />
                     </div>
                     <div>
                        <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">LINE ID</label>
                        <input 
                           type="text" 
                           value={editMember.line_id || ''} 
                           onChange={(e) => setEditMember({...editMember, line_id: e.target.value})}
                           className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none transition-all shadow-sm"
                        />
                     </div>
                      <div>
                         <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ประเภทลูกค้า</label>
                         <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                            <button 
                               type="button"
                               onClick={() => setEditMember({...editMember!, member_type: 'member'})}
                               className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${editMember?.member_type === 'member' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                               สมาชิกปิ่นโต
                            </button>
                            <button 
                               type="button"
                               onClick={() => setEditMember({...editMember!, member_type: 'retail'})}
                               className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${editMember?.member_type === 'retail' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                               ลูกค้ารายย่อย
                            </button>
                         </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">รอบจัดส่งปกติ</label>
                        <select 
                           value={editMember.delivery_time || ''} 
                           onChange={(e) => setEditMember({...editMember, delivery_time: e.target.value})}
                           className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none transition-all shadow-sm"
                        >
                           <option value="">-- เลือกเวลาส่ง --</option>
                           <option value="11:00 - 13:00">11:00 - 13:00</option>
                           <option value="15:00 - 17:00">15:00 - 17:00</option>
                        </select>
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                     <div>
                        <label className="block text-[11px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ที่อยู่จัดส่ง</label>
                        <textarea 
                           rows={3}
                           value={editMember.address || ''} 
                           onChange={(e) => setEditMember({...editMember, address: e.target.value})}
                           className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none transition-all shadow-sm resize-none"
                        />
                     </div>
                     <div>
                        <label className="block text-[11px] font-normal text-emerald-600 uppercase tracking-widest mb-1.5 ml-1">เป้าหมายสุขภาพ</label>
                        <input 
                           type="text" 
                           value={editMember.health_goal || ''} 
                           onChange={(e) => setEditMember({...editMember, health_goal: e.target.value})}
                           className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-normal text-emerald-800 focus:border-emerald-500 outline-none transition-all shadow-sm"
                        />
                     </div>
                     <div>
                        <label className="block text-[11px] font-normal text-red-600 uppercase tracking-widest mb-1.5 ml-1">สิ่งที่แพ้ / ไม่ทาน</label>
                        <input 
                           type="text" 
                           value={editMember.allergy_notes || ''} 
                           onChange={(e) => setEditMember({...editMember, allergy_notes: e.target.value})}
                           className="w-full p-3.5 bg-white border border-red-100 rounded-2xl text-sm font-normal text-red-800 focus:border-red-500 outline-none transition-all shadow-sm"
                        />
                     </div>
                  </div>
               </div>
               
               <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                   <button 
                     onClick={() => setIsEditModalOpen(false)}
                     className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl text-sm font-normal hover:bg-slate-100 transition-all"
                   >
                     ยกเลิก
                   </button>
                   <button 
                     onClick={handleUpdateMember}
                     className="px-10 py-3 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 rounded-2xl text-sm font-normal transition-all flex items-center gap-2"
                   >
                     <Save size={18} /> บันทึกการเปลี่ยนแปลง
                   </button>
               </div>
            </div>
        </div>
      )}

      {/* Add Package Modal */}
      {isAddPackageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-top duration-300">
               <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-emerald-500 text-white">
                  <div className="flex items-center gap-3">
                     <Package size={20} />
                     <h3 className="text-xl font-normal">เปิดแพ็กเกจปิ่นโต</h3>
                  </div>
                  <button onClick={() => setIsAddPackageModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white transition-all">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="p-8 space-y-6">
                  <div>
                    <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2">เลือกโปรโมชั่นหลัก</label>
                    <div className="relative select-none z-[9999] w-full">
                       <div 
                         onClick={() => setIsPromoDropdownOpen(!isPromoDropdownOpen)}
                         className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm font-bold text-emerald-800 focus:border-emerald-500 outline-none flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all"
                       >
                         <span>
                           {newPackage.package_name 
                             ? newPackage.package_name.replace('- ', '')
                             : '-- เลือกรูปแบบโปรโมชั่น --'}
                         </span>
                         <span className="text-emerald-500 text-xs">▼</span>
                       </div>
                       
                       {isPromoDropdownOpen && (
                         <div className="absolute left-0 top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2">
                           <input 
                             type="text" 
                             placeholder="พิมพ์ค้นหาโปรโมชั่น..."
                             value={promoSearchQuery}
                             onChange={(e) => setPromoSearchQuery(e.target.value)}
                             onClick={(e) => e.stopPropagation()}
                             className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:border-emerald-500 outline-none transition-all text-slate-700 font-normal"
                           />
                           <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                             <div 
                                onClick={() => {
                                  setNewPackage({
                                    ...newPackage,
                                    package_name: '',
                                    meals_total: 0,
                                    buddy_member_id: ''
                                  });
                                  setSelectedPromotion(null);
                                  setIsBuddyDropdownOpen(false);
                                  setIsPromoDropdownOpen(false);
                                  setPromoSearchQuery('');
                                }}
                               className="px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
                             >
                               -- ยกเลิกการเลือก --
                             </div>
                             {getSortedPromotions(promotions)
                               .filter(p => p.name.toLowerCase().includes(promoSearchQuery.toLowerCase()) || p.code.toLowerCase().includes(promoSearchQuery.toLowerCase()))
                               .map(p => (
                                 <div 
                                   key={p.id}
                                    onClick={() => {
                                      const isBuddyPromo = p.name?.includes('คู่หู');
                                      setNewPackage({
                                        ...newPackage,
                                        package_name: `- ${p.name} = ฿${p.price}`,
                                        meals_total: p.meals_count,
                                        end_date: dayjs(newPackage.start_date).add(p.days_count, 'day').format('YYYY-MM-DD'),
                                        buddy_member_id: isBuddyPromo ? newPackage.buddy_member_id : ''
                                      });
                                      setSelectedPromotion(p);
                                      if (!isBuddyPromo) setIsBuddyDropdownOpen(false);
                                      setIsPromoDropdownOpen(false);
                                      setPromoSearchQuery('');
                                    }}
                                   className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex justify-between items-center ${
                                     newPackage.package_name.includes(p.name) 
                                       ? 'bg-emerald-50 text-emerald-600' 
                                       : 'text-slate-700 hover:bg-slate-50'
                                   }`}
                                 >
                                   <span className="truncate mr-2">{p.name}</span>
                                   <span className="text-emerald-600 shrink-0">฿{Number(p.price).toLocaleString()}</span>
                                 </div>
                               ))}
                           </div>
                         </div>
                       )}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2">มื้อรวม</label>
                      <input 
                        type="number"
                        value={newPackage.meals_total}
                        onChange={(e) => setNewPackage({...newPackage, meals_total: parseInt(e.target.value) || 0})}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2">รอบส่งปกติ</label>
                      <input 
                        type="text"
                        value={newPackage.delivery_slot}
                        onChange={(e) => setNewPackage({...newPackage, delivery_slot: e.target.value})}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2">วันที่เริ่มทาน</label>
                      <input 
                        type="date"
                        value={newPackage.start_date}
                        onChange={(e) => setNewPackage({...newPackage, start_date: e.target.value})}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2">วันที่คาดว่าจบ</label>
                      <input 
                        type="date"
                        value={newPackage.end_date}
                        onChange={(e) => setNewPackage({...newPackage, end_date: e.target.value})}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {selectedPromotion?.name?.includes('คู่หู') && (
                    <div>
                      <label className="block text-[10px] font-normal text-pink-500 uppercase tracking-widest mb-2">จับคู่รับโบนัส +2 มื้อ (Buddy Promotion)</label>
                      <div className="relative select-none z-[9999] w-full">
                        <div 
                          onClick={() => setIsBuddyDropdownOpen(!isBuddyDropdownOpen)}
                          className="w-full p-4 bg-pink-50/50 border border-pink-200 rounded-2xl text-sm font-bold text-pink-800 focus:border-pink-500 outline-none flex items-center justify-between cursor-pointer hover:border-pink-400 transition-all"
                        >
                          <span>
                            {newPackage.buddy_member_id 
                              ? `-- จับคู่กับคุณ ${members.find(m => m.id === newPackage.buddy_member_id)?.full_name} --`
                              : '-- ไม่เข้าร่วมโปรโมชั่นคู่หู --'}
                          </span>
                          <span className="text-pink-500 text-xs">▼</span>
                        </div>
                        
                        {isBuddyDropdownOpen && (
                          <div className="absolute left-0 bottom-full mb-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2">
                            <input 
                              type="text" 
                              placeholder="ค้นหาเพื่อนเพื่อจับคู่รับโบนัส +2 มื้อ..."
                              value={buddySearchQuery}
                              onChange={(e) => setBuddySearchQuery(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:border-pink-500 outline-none transition-all text-slate-700 font-normal"
                            />
                            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                              <div 
                                onClick={() => {
                                  setNewPackage({
                                    ...newPackage,
                                    buddy_member_id: ''
                                  });
                                  setIsBuddyDropdownOpen(false);
                                  setBuddySearchQuery('');
                                }}
                                className="px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
                              >
                                -- ไม่เข้าร่วมโปรโมชั่นคู่หู --
                              </div>
                              {eligibleBuddyMembers
                                .filter(m => m.full_name.toLowerCase().includes(buddySearchQuery.toLowerCase()) || m.phone.includes(buddySearchQuery))
                                .map(m => (
                                  <div 
                                    key={m.id}
                                    onClick={() => {
                                      setNewPackage({
                                        ...newPackage,
                                        buddy_member_id: m.id
                                      });
                                      setIsBuddyDropdownOpen(false);
                                      setBuddySearchQuery('');
                                    }}
                                    className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex justify-between items-center ${
                                      newPackage.buddy_member_id === m.id
                                        ? 'bg-pink-50 text-pink-600' 
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className="truncate">คุณ {m.full_name}</span>
                                    <span className="text-pink-600 shrink-0 text-[10px] font-normal opacity-70">
                                      {m.phone}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
               </div>
               
               <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                   <button 
                     onClick={handleAddPackage}
                     className="w-full py-4 bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 rounded-2xl text-sm font-normal transition-all flex items-center justify-center gap-2"
                   >
                     <Plus size={20} /> ยืนยันการเปิดแพ็กเกจ
                   </button>
               </div>
            </div>
        </div>
      )}

      {/* Quick Retail Order Modal */}
      {isQuickOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
               <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-orange-500 text-white">
                  <div className="flex items-center gap-3">
                     <Package size={20} />
                     <h3 className="text-xl font-normal text-white">เพิ่มออเดอร์รายย่อย (ด่วน)</h3>
                  </div>
                  <button onClick={() => setIsQuickOrderModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white transition-all">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">เบอร์โทรศัพท์</label>
                        <input 
                           type="text" 
                           placeholder="08X-XXX-XXXX"
                           value={quickOrder.phone} 
                           onChange={(e) => {
                             const phone = e.target.value;
                             const existing = members.find(m => m.phone === phone);
                             setQuickOrder({
                               ...quickOrder, 
                               phone, 
                               full_name: existing ? existing.full_name : quickOrder.full_name
                             });
                           }}
                           className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-normal text-slate-800 focus:border-orange-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ชื่อลูกค้า</label>
                        <input 
                           type="text" 
                           placeholder="ชื่อ-นามสกุล..."
                           value={quickOrder.full_name} 
                           onChange={(e) => setQuickOrder({...quickOrder, full_name: e.target.value})}
                           className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-normal text-slate-800 focus:border-orange-500 outline-none"
                        />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">วางข้อความออเดอร์ (Paste Order Text)</label>
                    <textarea 
                      rows={4}
                      placeholder="- ชื่อเมนู (x1) ..."
                      value={quickOrder.order_text}
                      onChange={(e) => parseOrderText(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-normal text-slate-800 focus:border-orange-500 outline-none resize-none font-mono"
                    />
                  </div>

                  {quickOrder.parsedItems.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">รายการที่ตรวจพบ ({quickOrder.parsedItems.length}):</p>
                      {quickOrder.parsedItems.map((item, idx) => (
                        <div key={idx} className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex justify-between items-center animate-in slide-in-from-left-2 duration-300">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.menu_name} <span className="text-orange-500 font-black">x{item.quantity}</span></p>
                            {item.notes && <p className="text-[10px] text-slate-500 mt-0.5">{item.notes}</p>}
                            {!item.menu_item_id && <p className="text-[9px] text-amber-600 font-medium mt-1">⚠️ ไม่พบเมนูนี้ในฐานข้อมูล (จะส่งเป็นข้อความดิบ)</p>}
                          </div>
                          <button 
                            onClick={() => setQuickOrder(prev => ({ ...prev, parsedItems: prev.parsedItems.filter((_, i) => i !== idx) }))}
                            className="text-slate-300 hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {quickOrder.parsedItems.length === 0 && (
                    <div className="p-10 border-2 border-dashed border-slate-100 rounded-[32px] text-center">
                       <Package size={32} className="mx-auto text-slate-100 mb-3" />
                       <p className="text-xs text-slate-400 font-medium">รอวางข้อความเพื่อแกะออเดอร์...</p>
                    </div>
                  )}
               </div>
               
               <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                   <button 
                     onClick={() => setIsQuickOrderModalOpen(false)}
                     className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl text-sm font-normal hover:bg-slate-100 transition-all"
                   >
                     ยกเลิก
                   </button>
                   <button 
                     disabled={quickOrder.parsedItems.length === 0}
                     onClick={async () => {
                       if (!quickOrder.phone || !quickOrder.full_name) {
                         alert('กรุณากรอกชื่อและเบอร์โทร');
                         return;
                       }
                       try {
                        // Loop through parsed items and create orders
                        for (const item of quickOrder.parsedItems) {
                          await createQuickRetailOrder({
                            phone: quickOrder.phone,
                            full_name: quickOrder.full_name,
                            menu_item_id: item.menu_item_id,
                            menu_name: item.menu_name,
                            quantity: item.quantity,
                            notes: item.notes
                          });
                        }
                        setIsQuickOrderModalOpen(false);
                        setQuickOrder({ phone: '', full_name: '', order_text: '', parsedItems: [] });
                        alert(`✅ ส่ง ${quickOrder.parsedItems.length} ออเดอร์เข้าครัวเรียบร้อยแล้ว`);
                       } catch (err: any) {
                        alert('เกิดข้อผิดพลาด: ' + err.message);
                       }
                     }}
                     className="px-10 py-3 bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:grayscale shadow-xl shadow-orange-500/20 rounded-2xl text-sm font-normal transition-all flex items-center gap-2"
                   >
                     <Package size={18} /> ส่งเข้าครัวทันที
                   </button>
               </div>
           </div>
        </div>
      )}

    </div>
  );
};
