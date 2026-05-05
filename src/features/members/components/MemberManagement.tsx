import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Plus, User, Phone, MapPin, 
  Calendar, ChevronRight, ChevronLeft, Edit3, 
  X, Save, Clock, Package, 
  CheckCircle2, AlertCircle, Trash2
} from 'lucide-react';
import { useKdsStore } from '../../../store/kdsStore';
import dayjs from 'dayjs';
import { formatDisplayDate } from '../../../lib/dateUtils';
import type { Member } from '../../../types';
import Swal from 'sweetalert2';

export const MemberManagement: React.FC = () => {
  const { 
    members, activePackages, isLoadingData, 
    loadMasterData, addNewMember, updateMemberProfile, 
    addPintoPackage, cancelPintoPackage,
    createQuickRetailOrder, menus
  } = useKdsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [isQuickOrderModalOpen, setIsQuickOrderModalOpen] = useState(false);
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
    delivery_slot: '11:00 - 13:00'
  });

  useEffect(() => {
    loadMasterData();
  }, []);

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

      await addNewMember(newMember);
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

      await updateMemberProfile(editMember.id, editMember);
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

      await addPintoPackage({
        member_id: selectedMemberId,
        package_name: newPackage.package_name,
        meals_total: newPackage.meals_total,
        meals_remaining: newPackage.meals_total,
        days_total: dayjs(newPackage.end_date).diff(dayjs(newPackage.start_date), 'day'),
        days_remaining: dayjs(newPackage.end_date).diff(dayjs(newPackage.start_date), 'day'),
        start_date: newPackage.start_date,
        end_date: newPackage.end_date,
        status: 'active'
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

  if (isLoadingData && members.length === 0) {
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
      <div className={`${!selectedMemberId ? 'hidden md:flex' : 'flex'} flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F8FAFC]`}>
        {selectedMember ? (
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 animate-fade-in relative">
            
            {/* Mobile Header with Back Button */}
            <div className="md:hidden flex items-center justify-between mb-4">
               <button 
                 onClick={() => setSelectedMemberId(null)}
                 className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 shadow-sm"
               >
                  <ChevronLeft size={20} />
               </button>
               <p className="text-sm font-normal text-slate-400">ข้อมูลสมาชิก</p>
               <div className="w-10 h-10"></div> {/* Spacer */}
            </div>

            {/* Profile Header Card */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
               
               <div className="w-24 h-24 md:w-32 md:h-32 bg-emerald-100 rounded-[32px] flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-inner">
                  <User size={48} />
               </div>
               
               <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center flex-wrap gap-4">
                    <h1 className="text-3xl font-normal text-slate-900 tracking-tight">{selectedMember.full_name}</h1>
                    <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-normal uppercase tracking-widest rounded-full border border-emerald-200">
                      Active Member
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 pt-2">
                    {/* แถวที่ 1 */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 flex-shrink-0"><Phone size={16}/></div>
                      <p className="text-sm font-normal text-slate-700">{selectedMember.phone}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 flex-shrink-0"><Clock size={16}/></div>
                      <p className="text-sm font-normal text-slate-700">{selectedMember.delivery_time || 'ไม่ระบุรอบส่ง'}</p>
                    </div>
                    
                    {/* แถวที่ 2 */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 flex-shrink-0"><MapPin size={16}/></div>
                      <p className="text-sm font-normal text-slate-700 truncate max-w-[250px]">{selectedMember.address || 'ไม่ระบุที่อยู่'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
                        <span className="font-normal text-xs">L</span>
                      </div>
                      <p className="text-sm font-normal text-slate-700 break-all">{selectedMember.line_id || 'ไม่มี LINE'}</p>
                    </div>
                  </div>
               </div>
               
               <div className="flex flex-col gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => { setEditMember({...selectedMember}); setIsEditModalOpen(true); }}
                    className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-normal shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 size={18} /> แก้ไขข้อมูลโปรไฟล์
                  </button>
               </div>
            </div>

            {/* Content Tabs/Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               
               {/* Left: Health & Preferences */}
               <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                     <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h3 className="text-sm font-normal uppercase tracking-widest text-slate-400">ข้อมูลส่วนตัว & สุขภาพ</h3>
                        <button 
                          onClick={() => { setEditMember({...selectedMember}); setIsEditModalOpen(true); }}
                          className="text-emerald-500 hover:text-emerald-600 transition-colors"
                        >
                          <Edit3 size={16} />
                        </button>
                     </div>
                     
                     <div className="space-y-4">
                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                           <p className="text-[10px] font-normal text-emerald-600 uppercase mb-1">เป้าหมายสุขภาพ</p>
                           <p className="text-sm font-normal text-slate-800">{selectedMember.health_goal || 'ไม่ระบุ'}</p>
                        </div>
                        
                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                           <p className="text-[10px] font-normal text-red-600 uppercase mb-1 flex items-center gap-1">
                              <AlertCircle size={10} /> ข้อมูลการแพ้
                           </p>
                           <p className="text-sm font-normal text-red-800">{selectedMember.allergy_notes || 'ไม่มีประวัติการแพ้'}</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <p className="text-[10px] font-normal text-slate-400 uppercase mb-1">ที่อยู่จัดส่ง</p>
                           <p className="text-sm font-normal text-slate-700 leading-relaxed">{selectedMember.address || 'ไม่ระบุที่อยู่'}</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-xl">
                     <h3 className="text-xs font-normal uppercase tracking-widest text-slate-400">สถิติลูกค้า</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                           <p className="text-[10px] font-normal text-slate-400 mb-1">สั่งรวมทั้งหมด</p>
                           <p className="text-2xl font-normal">{selectedMember.total_orders || 0} ครั้ง</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                           <p className="text-[10px] font-normal text-slate-400 mb-1">ความภักดี</p>
                           <p className="text-2xl font-normal text-emerald-400">95%</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right: Active Pinto Packages */}
               <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col min-h-[400px]">
                     <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                        <h3 className="text-sm font-normal uppercase tracking-widest text-slate-400">แพ็กเกจปิ่นโตปัจจุบัน</h3>
                        <button 
                          onClick={() => setIsAddPackageModalOpen(true)}
                          className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-normal hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2 border border-emerald-200"
                        >
                          <Plus size={16} /> เปิดแพ็กเกจใหม่
                        </button>
                     </div>

                     <div className="space-y-4 flex-1">
                        {memberPackages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center py-10 opacity-30">
                             <Package size={64} className="mb-4" />
                             <p className="font-normal">ยังไม่มีแพ็กเกจที่กำลังใช้งาน</p>
                          </div>
                        ) : (
                          memberPackages.map(pkg => (
                            <div key={pkg.id} className="group relative bg-white border border-slate-200 rounded-3xl p-6 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md">
                               <div className="flex flex-col md:flex-row justify-between gap-6">
                                  <div className="space-y-2">
                                     <h4 className="text-lg font-normal text-slate-900">{pkg.package_name}</h4>
                                     <div className="flex items-center gap-4 text-xs font-normal text-slate-400">
                                        <span className="flex items-center gap-1"><Calendar size={12}/> {formatDisplayDate(pkg.start_date)} - {formatDisplayDate(pkg.end_date)}</span>
                                        <span className="flex items-center gap-1"><Clock size={12}/> {pkg.delivery_slot}</span>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <div className="text-right">
                                        <p className="text-2xl font-normal text-slate-900">{pkg.meals_remaining} <span className="text-xs text-slate-400">/ {pkg.meals_total} มื้อ</span></p>
                                        <div className="w-32 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                           <div 
                                              className="h-full bg-emerald-500 rounded-full" 
                                              style={{ width: `${(pkg.meals_remaining / pkg.meals_total) * 100}%` }}
                                           ></div>
                                        </div>
                                     </div>
                                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-normal ${
                                        pkg.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                     }`}>
                                        {pkg.status === 'active' ? <CheckCircle2 size={24}/> : <Clock size={24}/>}
                                     </div>
                                     <button 
                                        onClick={() => cancelPintoPackage(pkg.id)}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100"
                                        title="ยกเลิกแพ็กเกจ"
                                     >
                                        <Trash2 size={18} />
                                     </button>
                                  </div>
                               </div>
                            </div>
                          ))
                        )}
                     </div>
                  </div>
               </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30">
             <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                <Users size={64} className="text-slate-400" />
             </div>
             <h2 className="text-3xl font-normal text-slate-800 tracking-tight">ระบบจัดการสมาชิก & ปิ่นโต</h2>
             <p className="text-lg font-normal text-slate-500 mt-2">โปรดเลือกสมาชิกจากรายการด้านซ้ายเพื่อดูข้อมูล</p>
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
                        } else if (val === 'muscle14days') {
                          setNewPackage({
                            ...newPackage,
                            package_name: '- โปรโมชั่น เพิ่มกล้าม 14 วัน (60+2 มื้อ) = ฿7,399',
                            meals_total: 62,
                            end_date: dayjs(newPackage.start_date).add(14, 'day').format('YYYY-MM-DD')
                          });
                        } else if (val === 'muscle30days') {
                          setNewPackage({
                            ...newPackage,
                            package_name: '- โปรโมชั่น เพิ่มกล้าม 1 เดือน (120+4 มื้อ) = ฿14,490',
                            meals_total: 124,
                            end_date: dayjs(newPackage.start_date).add(30, 'day').format('YYYY-MM-DD')
                          });
                        } else if (val === 'muscle30days_norice') {
                          setNewPackage({
                            ...newPackage,
                            package_name: '- โปรโมชั่น เพิ่มกล้าม 1 เดือน กับข้าวอย่างเดียว (120+4 มื้อ) = ฿12,499',
                            meals_total: 124,
                            end_date: dayjs(newPackage.start_date).add(30, 'day').format('YYYY-MM-DD')
                          });
                        }
                      }}
                      className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm font-normal text-emerald-800 focus:border-emerald-500 outline-none"
                    >
                      <option value="">-- เลือกรูปแบบโปรโมชั่น --</option>
                      <option value="7days">ผูกปิ่นโต 7 วัน (14+1 มื้อ)</option>
                      <option value="14days">ผูกปิ่นโต 14 วัน (28+2 มื้อ)</option>
                      <option value="30days">ผูกปิ่นโต 1 เดือน (60+2 มื้อ)</option>
                      <option value="muscle14days">โปรโมชั่น เพิ่มกล้าม 14 วัน (60+2 มื้อ) ฿7,399</option>
                      <option value="muscle30days">โปรโมชั่น เพิ่มกล้าม 1 เดือน (120+4 มื้อ) ฿14,490</option>
                      <option value="muscle30days_norice">โปรโมชั่น เพิ่มกล้าม 1 เดือน (กับข้าวอย่างเดียว 120+4 มื้อ) ฿12,499</option>
                    </select>
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
