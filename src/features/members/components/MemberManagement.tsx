import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, Search, Plus, Phone, MapPin, 
  Calendar, ChevronRight, ChevronLeft, Edit3, 
  X, Save, Clock, Package, 
  CheckCircle2, AlertCircle, Trash2, ShieldAlert,
  Heart, Award, Zap
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
    members, activePackages, isLoading: isLoadingMember, 
    loadMemberData, addMember, updateProfile, 
    addPackage, cancelPackage,
    createQuickRetailOrder, banMember, unbanMember
  } = useMemberStore();
  
  const { menus, loadMenus } = useMenuStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'member' | 'retail' | 'banned'>('all');

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
    order_text: '',
    parsedItems: [] as { menu_item_id: string, menu_name: string, quantity: number, notes: string }[],
  });

  const parseOrderText = (text: string) => {
    const lines = text.split('\n');
    const items: any[] = [];
    let currentItem: any = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        const menuPart = trimmed.substring(2);
        const qtyMatch = menuPart.match(/\((?:x|×)(\d+)\)/);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        const name = menuPart.split('(')[0].trim();
        
        const matched = menus.find(m => m.name.includes(name) || name.includes(m.name));
        
        currentItem = {
          menu_item_id: matched?.id || '',
          menu_name: name,
          quantity: qty,
          notes: ''
        };
        items.push(currentItem);
      } else if (currentItem && trimmed && !trimmed.startsWith('-')) {
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
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || 
          m.full_name.toLowerCase().includes(q) || 
          m.phone.includes(q) ||
          (m.line_id && m.line_id.toLowerCase().includes(q)) ||
          ((m as any).line_display_name && (m as any).line_display_name.toLowerCase().includes(q));
        
        let matchesType = true;
        if (typeFilter === 'member') matchesType = m.member_type === 'member' && !m.is_banned;
        else if (typeFilter === 'retail') matchesType = m.member_type === 'retail' && !m.is_banned;
        else if (typeFilter === 'banned') matchesType = !!m.is_banned;

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
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอกชื่อ-นามสกุล และเบอร์โทรศัพท์',
        confirmButtonColor: '#10b981'
      });
      return;
    }
    try {
      Swal.fire({
        title: 'กำลังลงทะเบียน...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
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
          cancelButtonText: 'ยกเลิก',
          confirmButtonColor: '#10b981'
        });

        if (result.isConfirmed && existing) {
          setSelectedMemberId(existing.id);
          setIsAddModalOpen(false);
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: err.message,
          confirmButtonColor: '#10b981'
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
        didOpen: () => { Swal.showLoading(); }
      });

      await updateProfile(editMember.id, editMember);
      setIsEditModalOpen(false);
      
      Swal.fire({
        icon: 'success',
        title: 'บันทึกเรียบร้อย',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message,
        confirmButtonColor: '#10b981'
      });
    }
  };

  const handleAddPackage = async () => {
    if (!selectedMemberId || !newPackage.package_name) return;
    try {
      Swal.fire({
        title: 'กำลังเปิดแพ็กเกจ...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
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
        text: err.message,
        confirmButtonColor: '#10b981'
      });
    }
  };

  if (isLoadingMember && members.length === 0) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-emerald-700 font-semibold text-sm tracking-wider uppercase animate-pulse">กำลังโหลดข้อมูลสมาชิก...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden relative font-sans">
      
      {/* ─── 1. Member List Sidebar ─── */}
      <div className={`
        ${selectedMemberId ? 'hidden md:flex' : 'flex'} 
        w-full md:w-84 lg:w-96 bg-white border-r border-slate-200/80 flex-col h-full z-10 shadow-sm relative shrink-0 transition-all
      `}>
        {/* Sidebar Header */}
        <div className="p-4 lg:p-5 border-b border-slate-100 space-y-3.5 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-none">รายชื่อสมาชิก</h2>
                <span className="text-[11px] font-medium text-slate-400">ทั้งหมด {members.length} ท่าน</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsQuickOrderModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-xl shadow-sm hover:shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
                title="สั่งรายย่อยด่วน"
              >
                <Package size={15} />
                <span className="hidden sm:inline">สั่งด่วน</span>
              </button>
              
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl shadow-sm hover:shadow-emerald-600/20 transition-all active:scale-95"
                title="ลงทะเบียนสมาชิกใหม่"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
            <input 
              type="text"
              placeholder="ค้นหาชื่อ, เบอร์โทร, LINE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-100/80 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { key: 'all', label: 'ทั้งหมด', count: members.length },
              { key: 'member', label: 'ปิ่นโต', count: members.filter(m => m.member_type === 'member' && !m.is_banned).length },
              { key: 'retail', label: 'รายย่อย', count: members.filter(m => m.member_type === 'retail' && !m.is_banned).length },
              { key: 'banned', label: 'ระงับ', count: members.filter(m => !!m.is_banned).length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTypeFilter(tab.key as any)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  typeFilter === tab.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  typeFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Member Cards List */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-3.5 space-y-2 custom-scrollbar">
          {filteredMembers.map(member => {
            const isSelected = selectedMemberId === member.id;
            const pkgCount = activePackages.filter(p => p.member_id === member.id).length;

            return (
              <div 
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-left relative overflow-hidden ${
                  isSelected 
                    ? 'bg-emerald-50/80 border-emerald-500/80 shadow-md shadow-emerald-500/5 translate-x-1' 
                    : 'bg-white border-slate-200/60 hover:border-emerald-300/80 hover:bg-slate-50/70 shadow-xs'
                }`}
              >
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-full" />
                )}

                <div className="flex items-center gap-3">
                  {/* Avatar Initials */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors shadow-xs ${
                    member.is_banned
                      ? 'bg-red-100 text-red-600'
                      : isSelected 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-100 text-slate-700'
                  }`}>
                    {member.full_name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 truncate leading-tight">{member.full_name}</p>
                      {member.is_banned && (
                        <ShieldAlert size={13} className="text-red-500 shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-slate-500 tracking-tight">{member.phone}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                        member.member_type === 'member' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {member.member_type === 'member' ? 'ปิ่นโต' : 'รายย่อย'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {pkgCount > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
                        {pkgCount} แพ็ก
                      </span>
                    )}
                    <ChevronRight size={14} className={isSelected ? 'text-emerald-600' : 'text-slate-300'} />
                  </div>
                </div>
              </div>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users size={24} />
              </div>
              <p className="text-xs font-bold text-slate-600">ไม่พบรายชื่อสมาชิก</p>
              <p className="text-[11px] text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม + เพื่อลงทะเบียน</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. Detail View Area ─── */}
      <div className={`
        ${!selectedMemberId ? 'hidden md:flex' : 'flex'} 
        flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/70 relative
      `}>
        {selectedMember ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar">
            
            {/* Mobile Top Navigation Bar */}
            <div className="md:hidden flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs mb-2">
              <button 
                onClick={() => setSelectedMemberId(null)}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-600 px-2 py-1 rounded-lg"
              >
                <ChevronLeft size={18} />
                <span>กลับหน้ารายชื่อ</span>
              </button>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">โปรไฟล์สมาชิก</span>
            </div>

            {/* Profile Header Hero Card */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-md shadow-slate-200/30 p-6 sm:p-8 relative overflow-hidden"
            >
              {/* Subtle ambient lighting */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none blur-2xl" />
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start sm:items-center gap-5">
                  <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 text-3xl font-black shrink-0">
                    {selectedMember.full_name.charAt(0)}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none font-display">
                        {selectedMember.full_name}
                      </h1>
                      
                      {selectedMember.is_banned ? (
                        <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1 animate-pulse">
                          <ShieldAlert size={12} /> ถูกระงับ / Blacklist
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-500" /> Active Member
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-400" />
                        <span className="font-mono">{selectedMember.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        <span>รอบส่ง: {selectedMember.delivery_time || '11:00 - 13:00'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#00B900] text-white flex items-center justify-center text-[9px] font-bold">L</span>
                        <span>LINE: {selectedMember.line_id || (selectedMember as any).line_display_name || 'ไม่ระบุ'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-2 lg:pt-0">
                  <button 
                    onClick={() => { setEditMember({...selectedMember}); setIsEditModalOpen(true); }}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Edit3 size={15} /> แก้ไขข้อมูลโปรไฟล์
                  </button>

                  {selectedMember.is_banned ? (
                    <button 
                      onClick={async () => {
                        const { value: reason } = await Swal.fire({
                          title: 'ยกเลิกการระงับสมาชิก',
                          input: 'textarea',
                          inputLabel: 'ระบุเหตุผลในการปลดแบน',
                          inputPlaceholder: 'เช่น เคลียร์ยอดเรียบร้อย...',
                          inputValidator: (value) => {
                            if (!value) return 'กรุณาระบุเหตุผล';
                          },
                          showCancelButton: true,
                          confirmButtonText: 'ยืนยันปลดแบน',
                          cancelButtonText: 'ยกเลิก',
                          confirmButtonColor: '#10b981'
                        });
                        if (reason) await unbanMember(selectedMember.id, reason);
                      }}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <CheckCircle2 size={15} /> ปลดระงับ
                    </button>
                  ) : (
                    <button 
                      onClick={async () => {
                        const { value: reason } = await Swal.fire({
                          title: 'ระงับการใช้งานสมาชิก',
                          input: 'textarea',
                          inputLabel: 'ระบุเหตุผลในการระงับ (Blacklist)',
                          inputPlaceholder: 'เช่น ปฏิเสธการรับอาหารต่อเนื่อง...',
                          inputValidator: (value) => {
                            if (!value) return 'กรุณาระบุเหตุผล';
                          },
                          showCancelButton: true,
                          confirmButtonText: 'ยืนยันระงับ',
                          cancelButtonText: 'ยกเลิก',
                          confirmButtonColor: '#ef4444'
                        });
                        if (reason) await banMember(selectedMember.id, reason);
                      }}
                      className="px-3 py-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                      title="ระงับสมาชิก"
                    >
                      <ShieldAlert size={15} /> ระงับ
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Bento Grid: Health & Delivery Info + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Bento: Personal, Health & Delivery */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5">
                    <Heart size={16} className="text-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">ข้อมูลสุขภาพ & โภชนาการ</h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">เป้าหมายสุขภาพ</span>
                      <p className="text-sm font-bold text-emerald-800 bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl">
                        {selectedMember.health_goal || 'รักษาสุขภาพทั่วไป (Clean Balance)'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">ประวัติการแพ้อาหาร / สิ่งที่ไม่ทาน</span>
                      <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                        selectedMember.allergy_notes 
                          ? 'bg-red-50/80 border-red-200 text-red-700 font-semibold' 
                          : 'bg-slate-50 border-slate-100 text-slate-500 font-medium'
                      }`}>
                        <AlertCircle size={14} className={selectedMember.allergy_notes ? 'text-red-500 mt-0.5' : 'text-slate-400 mt-0.5'} />
                        <span className="text-xs">{selectedMember.allergy_notes || 'ไม่มีประวัติการแพ้อาหาร'}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">ที่อยู่จัดส่ง</span>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 flex items-start gap-2">
                        <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-xs leading-relaxed">{selectedMember.address || 'ไม่ระบุที่อยู่จัดส่ง'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dark Stats Card */}
                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10 space-y-4 relative overflow-hidden">
                  <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">สถิติการใช้งาน</span>
                    <Award size={16} className="text-emerald-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">ยอดสั่งสะสม</span>
                      <p className="text-2xl font-bold font-mono tracking-tight text-white mt-1">
                        {selectedMember.total_orders || 0} <span className="text-xs text-slate-400 font-normal">ออเดอร์</span>
                      </p>
                    </div>
                    
                    <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">แพ็กเกจที่เปิด</span>
                      <p className="text-2xl font-bold font-mono tracking-tight text-emerald-400 mt-1">
                        {memberPackages.length} <span className="text-xs text-slate-400 font-normal">แพ็ก</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Bento: Active Pinto Packages */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-full">
                  <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                        <Package size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">แพ็กเกจปิ่นโตของลูกค้า</h3>
                        <p className="text-[11px] text-slate-400">ติดตามและจัดการโควตามื้ออาหาร</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setIsAddPackageModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Plus size={16} strokeWidth={2.5} /> เปิดแพ็กเกจใหม่
                    </button>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4 flex-1">
                    {memberPackages.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-center p-6">
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                          <Package size={22} />
                        </div>
                        <p className="text-sm font-bold text-slate-700">ไม่มีแพ็กเกจปิ่นโตที่กำลังใช้งาน</p>
                        <p className="text-xs text-slate-400 mt-1">คลิกปุ่มด้านบนเพื่อเปิดแพ็กเกจปิ่นโตใหม่</p>
                      </div>
                    ) : (
                      memberPackages.map(pkg => {
                        const buddyName = getBuddyName(pkg.buddy_group_id, pkg.member_id);
                        const percentRemaining = Math.max(0, Math.min(100, (pkg.meals_remaining / pkg.meals_total) * 100));

                        return (
                          <div 
                            key={pkg.id}
                            className="p-5 rounded-2xl border-2 border-slate-100 hover:border-emerald-500/50 bg-white shadow-xs hover:shadow-md transition-all space-y-4"
                          >
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-bold text-slate-900 tracking-tight">{pkg.package_name}</h4>
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                                </div>

                                {pkg.buddy_group_id && buddyName && (
                                  <div className="inline-flex items-center gap-1 bg-pink-50 border border-pink-200 text-pink-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                    <span>👯 คู่หูกับคุณ {buddyName}</span>
                                    {pkg.bonus_meals && pkg.bonus_meals > 0 && (
                                      <span className="bg-pink-200 text-pink-800 px-1.5 py-0.2 rounded-md font-black">
                                        +{pkg.bonus_meals} มื้อโบนัส
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <button 
                                onClick={async () => {
                                  const result = await Swal.fire({
                                    title: 'ยืนยันยกเลิกแพ็กเกจ?',
                                    text: 'คุณต้องการยกเลิกแพ็กเกจนี้ใช่หรือไม่?',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#ef4444',
                                    cancelButtonColor: '#94a3b8',
                                    confirmButtonText: 'ยกเลิกแพ็กเกจ',
                                    cancelButtonText: 'ย้อนกลับ'
                                  });
                                  if (result.isConfirmed) {
                                    cancelPackage(pkg.id);
                                  }
                                }}
                                className="self-end sm:self-center p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="ยกเลิกแพ็กเกจ"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            {/* Progress & Meta Info */}
                            <div className="p-3.5 bg-slate-50/80 rounded-xl space-y-2.5">
                              <div className="flex justify-between items-baseline text-xs">
                                <span className="font-semibold text-slate-500">มื้อคงเหลือ</span>
                                <span className="font-mono font-bold text-slate-900 text-sm">
                                  <span className={pkg.meals_remaining <= 2 ? 'text-red-500 font-black' : 'text-emerald-600 font-black'}>
                                    {pkg.meals_remaining}
                                  </span> / {pkg.meals_total} มื้อ
                                </span>
                              </div>

                              <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    pkg.meals_remaining <= 2 ? 'bg-red-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${percentRemaining}%` }}
                                />
                              </div>

                              <div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} className="text-slate-400" />
                                  {formatDisplayDate(pkg.start_date)} - {formatDisplayDate(pkg.end_date)}
                                </span>
                                <span className="flex items-center gap-1 font-medium">
                                  <Clock size={12} className="text-slate-400" />
                                  {pkg.delivery_slot || '11:00 - 13:00'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/5 mb-4">
              <Users size={36} strokeWidth={1.75} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">กรุณาเลือกสมาชิกเพื่อดูรายละเอียด</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              คลิกเลือกรายชื่อสมาชิกจากแถบซ้ายมือ เพื่อดูประวัติ สุขภาพ และจัดการแพ็กเกจปิ่นโต
            </p>
          </div>
        )}
      </div>

      {/* ─── 3. Modals Container ─── */}

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                  <Plus size={18} strokeWidth={2.5} />
                </div>
                <h3 className="text-base font-bold text-slate-900">ลงทะเบียนสมาชิกใหม่</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="เช่น คุณสมชาย สุขภาพดี"
                    value={newMember.full_name} 
                    onChange={(e) => setNewMember({...newMember, full_name: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="08X-XXX-XXXX"
                    value={newMember.phone} 
                    onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                    className={`w-full p-2.5 border rounded-xl text-xs outline-none transition-all ${
                      matchedMember ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 focus:border-emerald-500 focus:bg-white'
                    }`}
                  />
                  {matchedMember && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-[11px] text-amber-800">
                      <span>⚠️ เบอร์นี้ลงทะเบียนแล้ว ({matchedMember.full_name})</span>
                      <button 
                        onClick={() => { setSelectedMemberId(matchedMember.id); setIsAddModalOpen(false); }}
                        className="text-amber-900 underline font-bold"
                      >
                        ดูโปรไฟล์
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ประเภทลูกค้า</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button 
                      type="button"
                      onClick={() => setNewMember({...newMember, member_type: 'member'})}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${newMember.member_type === 'member' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500'}`}
                    >
                      สมาชิกปิ่นโต
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewMember({...newMember, member_type: 'retail'})}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${newMember.member_type === 'retail' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500'}`}
                    >
                      ลูกค้ารายย่อย
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">LINE ID</label>
                  <input 
                    type="text" 
                    placeholder="@lineid"
                    value={newMember.line_id} 
                    onChange={(e) => setNewMember({...newMember, line_id: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">รอบจัดส่งปกติ</label>
                  <select 
                    value={newMember.delivery_time || ''} 
                    onChange={(e) => setNewMember({...newMember, delivery_time: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all"
                  >
                    <option value="">-- เลือกรอบเวลาส่ง --</option>
                    <option value="11:00 - 13:00">11:00 - 13:00 (รอบเที่ยง)</option>
                    <option value="15:00 - 17:00">15:00 - 17:00 (รอบเย็น)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 uppercase mb-1">เป้าหมายสุขภาพ</label>
                  <input 
                    type="text" 
                    placeholder="เช่น ลดน้ำหนัก, ควบคุมเบาหวาน"
                    value={newMember.health_goal} 
                    onChange={(e) => setNewMember({...newMember, health_goal: e.target.value})}
                    className="w-full p-2.5 bg-emerald-50/50 border border-emerald-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-red-600 uppercase mb-1">สิ่งที่แพ้ / ข้อจำกัดอาหาร</label>
                  <input 
                    type="text" 
                    placeholder="เช่น แพ้อาหารทะเล, ไม่ทานเนื้อวัว"
                    value={newMember.allergy_notes} 
                    onChange={(e) => setNewMember({...newMember, allergy_notes: e.target.value})}
                    className="w-full p-2.5 bg-red-50/50 border border-red-200 focus:border-red-500 focus:bg-white rounded-xl text-xs outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ที่อยู่จัดส่ง</label>
                  <textarea 
                    rows={2}
                    placeholder="บ้านเลขที่ หมู่บ้าน ซอย ถนน ตำบล อำเภอ..."
                    value={newMember.address} 
                    onChange={(e) => setNewMember({...newMember, address: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleAddMember}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Save size={15} /> บันทึกข้อมูล
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Member Modal */}
      {isEditModalOpen && editMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Edit3 size={16} />
                </div>
                <h3 className="text-base font-bold text-slate-900">แก้ไขข้อมูลโปรไฟล์</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ชื่อ-นามสกุล</label>
                  <input 
                    type="text" 
                    value={editMember.full_name} 
                    onChange={(e) => setEditMember({...editMember, full_name: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">เบอร์โทรศัพท์</label>
                  <input 
                    type="text" 
                    value={editMember.phone} 
                    onChange={(e) => setEditMember({...editMember, phone: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">LINE ID</label>
                  <input 
                    type="text" 
                    value={editMember.line_id || ''} 
                    onChange={(e) => setEditMember({...editMember, line_id: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">รอบจัดส่งปกติ</label>
                  <select 
                    value={editMember.delivery_time || ''} 
                    onChange={(e) => setEditMember({...editMember, delivery_time: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all"
                  >
                    <option value="">-- เลือกรอบเวลาส่ง --</option>
                    <option value="11:00 - 13:00">11:00 - 13:00 (รอบเที่ยง)</option>
                    <option value="15:00 - 17:00">15:00 - 17:00 (รอบเย็น)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 uppercase mb-1">เป้าหมายสุขภาพ</label>
                  <input 
                    type="text" 
                    value={editMember.health_goal || ''} 
                    onChange={(e) => setEditMember({...editMember, health_goal: e.target.value})}
                    className="w-full p-2.5 bg-emerald-50/50 border border-emerald-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-red-600 uppercase mb-1">สิ่งที่แพ้ / ไม่ทาน</label>
                  <input 
                    type="text" 
                    value={editMember.allergy_notes || ''} 
                    onChange={(e) => setEditMember({...editMember, allergy_notes: e.target.value})}
                    className="w-full p-2.5 bg-red-50/50 border border-red-200 focus:border-red-500 focus:bg-white rounded-xl text-xs outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ที่อยู่จัดส่ง</label>
                  <textarea 
                    rows={2}
                    value={editMember.address || ''} 
                    onChange={(e) => setEditMember({...editMember, address: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleUpdateMember}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Save size={15} /> บันทึกการแก้ไข
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Package Modal */}
      {isAddPackageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
              <div className="flex items-center gap-2.5">
                <Package size={18} />
                <h3 className="text-base font-bold">เปิดแพ็กเกจปิ่นโต</h3>
              </div>
              <button onClick={() => setIsAddPackageModalOpen(false)} className="p-1.5 text-white/80 hover:text-white rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 text-xs">
              {/* Promotion Select Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">เลือกโปรโมชั่นหลัก</label>
                <div className="relative">
                  <div 
                    onClick={() => setIsPromoDropdownOpen(!isPromoDropdownOpen)}
                    className="w-full p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all"
                  >
                    <span className="truncate">
                      {newPackage.package_name ? newPackage.package_name.replace('- ', '') : '-- เลือกโปรโมชั่น --'}
                    </span>
                    <span className="text-emerald-600 text-[10px]">▼</span>
                  </div>

                  {isPromoDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 z-50 space-y-1.5">
                      <input 
                        type="text" 
                        placeholder="พิมพ์ค้นหาชื่อแพ็กเกจ..."
                        value={promoSearchQuery}
                        onChange={(e) => setPromoSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                      />
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {getSortedPromotions(promotions)
                          .filter(p => p.name.toLowerCase().includes(promoSearchQuery.toLowerCase()) || p.code?.toLowerCase().includes(promoSearchQuery.toLowerCase()))
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
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                            >
                              <span className="truncate mr-2 text-slate-800">{p.name}</span>
                              <span className="text-emerald-600 font-mono font-bold shrink-0">฿{Number(p.price).toLocaleString()}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">มื้อรวม</label>
                  <input 
                    type="number"
                    value={newPackage.meals_total}
                    onChange={(e) => setNewPackage({...newPackage, meals_total: parseInt(e.target.value) || 0})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">รอบส่งปกติ</label>
                  <input 
                    type="text"
                    value={newPackage.delivery_slot}
                    onChange={(e) => setNewPackage({...newPackage, delivery_slot: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">วันที่เริ่มทาน</label>
                  <input 
                    type="date"
                    value={newPackage.start_date}
                    onChange={(e) => setNewPackage({...newPackage, start_date: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">วันที่สิ้นสุด</label>
                  <input 
                    type="date"
                    value={newPackage.end_date}
                    onChange={(e) => setNewPackage({...newPackage, end_date: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Buddy Promotion Option */}
              {selectedPromotion?.name?.includes('คู่หู') && (
                <div className="p-3 bg-pink-50/70 border border-pink-200 rounded-xl space-y-2">
                  <label className="block text-[11px] font-bold text-pink-700 uppercase">จับคู่รับมื้อโบนัส +2 (Buddy Group)</label>
                  <div className="relative">
                    <div 
                      onClick={() => setIsBuddyDropdownOpen(!isBuddyDropdownOpen)}
                      className="w-full p-2.5 bg-white border border-pink-200 rounded-lg text-xs font-bold text-pink-700 flex justify-between items-center cursor-pointer"
                    >
                      <span className="truncate">
                        {newPackage.buddy_member_id 
                          ? `คู่หู: คุณ ${members.find(m => m.id === newPackage.buddy_member_id)?.full_name}`
                          : '-- เลือกเพื่อนคู่หู --'}
                      </span>
                      <span className="text-pink-500 text-[10px]">▼</span>
                    </div>

                    {isBuddyDropdownOpen && (
                      <div className="absolute left-0 bottom-full mb-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 z-50 space-y-1.5">
                        <input 
                          type="text" 
                          placeholder="ค้นหาเพื่อนคู่หู..."
                          value={buddySearchQuery}
                          onChange={(e) => setBuddySearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-pink-500"
                        />
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {eligibleBuddyMembers
                            .filter(m => m.full_name.toLowerCase().includes(buddySearchQuery.toLowerCase()) || m.phone.includes(buddySearchQuery))
                            .map(m => (
                              <div 
                                key={m.id}
                                onClick={() => {
                                  setNewPackage({ ...newPackage, buddy_member_id: m.id });
                                  setIsBuddyDropdownOpen(false);
                                  setBuddySearchQuery('');
                                }}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-pink-50 cursor-pointer flex justify-between"
                              >
                                <span className="text-slate-800">คุณ {m.full_name}</span>
                                <span className="text-slate-400 font-mono text-[10px]">{m.phone}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button 
                onClick={() => setIsAddPackageModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleAddPackage}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} /> ยืนยันเปิดแพ็กเกจ
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Quick Retail Order Modal */}
      {isQuickOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-amber-500 text-white">
              <div className="flex items-center gap-2.5">
                <Package size={18} />
                <h3 className="text-base font-bold">สั่งออเดอร์รายย่อย (ด่วน)</h3>
              </div>
              <button onClick={() => setIsQuickOrderModalOpen(false)} className="p-1.5 text-white/80 hover:text-white rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">เบอร์โทรศัพท์</label>
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ชื่อลูกค้า</label>
                  <input 
                    type="text" 
                    placeholder="ชื่อ-นามสกุล..."
                    value={quickOrder.full_name} 
                    onChange={(e) => setQuickOrder({...quickOrder, full_name: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  วางข้อความออเดอร์ (Paste Text)
                </label>
                <textarea 
                  rows={3}
                  placeholder="- ข้าวกะเพราอกไก่ (x2) เผ็ดน้อย..."
                  value={quickOrder.order_text}
                  onChange={(e) => parseOrderText(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 resize-none font-mono"
                />
              </div>

              {quickOrder.parsedItems.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    รายการที่ตรวจพบ ({quickOrder.parsedItems.length} เมนู):
                  </span>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
                    {quickOrder.parsedItems.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900">{item.menu_name} <span className="text-amber-600">x{item.quantity}</span></p>
                          {item.notes && <p className="text-[10px] text-slate-500">{item.notes}</p>}
                        </div>
                        <button 
                          onClick={() => setQuickOrder(prev => ({ ...prev, parsedItems: prev.parsedItems.filter((_, i) => i !== idx) }))}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  <p className="text-xs">วางข้อความออเดอร์ด้านบนเพื่อแกะรายการอาหารอัตโนมัติ</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button 
                onClick={() => setIsQuickOrderModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button 
                disabled={quickOrder.parsedItems.length === 0}
                onClick={async () => {
                  if (!quickOrder.phone || !quickOrder.full_name) {
                    Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกชื่อและเบอร์โทร' });
                    return;
                  }
                  try {
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
                    Swal.fire({
                      icon: 'success',
                      title: 'ส่งเข้าครัวสำเร็จ',
                      text: `ส่ง ${quickOrder.parsedItems.length} เมนูเข้าครัวเรียบร้อยแล้ว`,
                      confirmButtonColor: '#10b981'
                    });
                  } catch (err: any) {
                    Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
                  }
                }}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Zap size={15} /> ส่งเข้าครัวทันที
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};
