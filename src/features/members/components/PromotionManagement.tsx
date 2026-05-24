import React, { useState, useEffect } from 'react';
import { 
  Tag,
  Sparkles,
  Users,
  Check,
  MapPin, 
  Calendar as CalendarIcon, 
  Clock, 
  MessageSquare, 
  Copy, 
  ChevronRight, 
  UserPlus,
  Rocket,
  Plus,
  Loader2,
  Trash2,
  Phone,
  CreditCard,
  Package,
  X,
  Info,
  AlertTriangle,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TabType = 'sales' | 'catalog';

interface SalesTemplate {
  id: string;
  category: 'greeting' | 'selling' | 'closing' | 'payment' | 'delivery';
  label: string;
  content: string;
}

const DEFAULT_TEMPLATES: SalesTemplate[] = [
  {
    id: 'g1',
    category: 'greeting',
    label: 'ทักทายต้อนรับ',
    content: 'สวัสดีค่ะ/ค่ะ ยินดีต้อนรับสู่ Clean Food ค่ะ สนใจดูแลสุขภาพด้วยคอร์สอาหารคลีนเมนูไหนเป็นพิเศษไหมค่ะ?'
  },
  {
    id: 's1',
    category: 'selling',
    label: 'เสนอโปรฯ ยอดฮิต',
    content: 'ตอนนี้มีโปรโมชั่นแนะนำเป็นแพ็กเกจ 30 มื้อ ราคาพิเศษเพียง 1,799 บาท (ตกมื้อละ 60 บาทเท่านั้น!) ได้เมนูพรีเมียมครบถ้วนเลยค่ะ'
  },
  {
    id: 'd1',
    category: 'delivery',
    label: 'แจ้งรอบการส่ง',
    content: 'เราจัดส่งรอบเช้า 08:00 - 10:00 และรอบเย็น 15:00 - 17:00 ค่ะ ลูกค้าสามารถเลือกเวลาที่สะดวกรับได้เลยค่ะ'
  },
  {
    id: 'p1',
    category: 'payment',
    label: 'แจ้งเลขบัญชี',
    content: 'สามารถโอนชำระได้ที่: ธนาคารกสิกรไทย เลขที่บัญชี 000-0-00000-0 ชื่อบัญชี บจก. คลีนฟู้ด เออร์ลี่ ค่ะ'
  },
  {
    id: 'c1',
    category: 'closing',
    label: 'ปิดการขาย/ขอบคุณ',
    content: 'เรียบร้อยค่ะ บันทึกข้อมูลคอร์สของลูกค้าเข้าระบบแล้วค่ะ ขอบคุณที่ไว้วางใจให้เราดูแลสุขภาพนะค่ะ'
  }
];

export const PromotionManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Promotion Form State
  const [newPromo, setNewPromo] = useState({
    name: '',
    code: '',
    promotion_type: 'PINTO',
    price: 0,
    meals_count: 0,
    days_count: 14,
    description: '',
    sales_script: '',
    conditions: ''
  });

  // Form State for Sales Tab
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    nickname: '',
    phone: '',
    lineId: '',
    address: '',
    startDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    deliverySlot: '11:00 - 13:00',
    selectedPromoId: '',
    healthGoal: 'ไม่ระบุ',
    allergyNotes: '',
    memberType: 'pinto', // pinto, retail, or promo
    deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    googleMapsUrl: '',
    distanceKm: '' as string | number,
    locationType: 'inside', // inside or outside
    deliveryFee: '' as string | number
  });

  const [logisticsConfig, setLogisticsConfig] = useState({
    BASE_FARE: 25,
    BASE_INCLUDED_DISTANCE: 3,
    FEE_PER_KM_NORMAL: 4,
    PROMO_FREE_DIST: 7.1
  });

  const DAYS = [
    { id: 'Mon', label: 'จ' },
    { id: 'Tue', label: 'อ' },
    { id: 'Wed', label: 'พ' },
    { id: 'Thu', label: 'พฤ' },
    { id: 'Fri', label: 'ศ' },
    { id: 'Sat', label: 'ส' },
    { id: 'Sun', label: 'อา' }
  ];

  const toggleDay = (dayId: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      deliveryDays: prev.deliveryDays.includes(dayId)
        ? prev.deliveryDays.filter(d => d !== dayId)
        : [...prev.deliveryDays, dayId]
    }));
  };

  useEffect(() => {
    fetchPromotions();
    fetchLogisticsConfig();
  }, []);

  const fetchLogisticsConfig = async () => {
    try {
      const { data } = await supabase.from('erp_settings').select('value').eq('key', 'logistics_config').single();
      if (data) {
        const val = data.value;
        setLogisticsConfig({
          BASE_FARE: Number(val.base_fare),
          BASE_INCLUDED_DISTANCE: Number(val.base_included_distance),
          FEE_PER_KM_NORMAL: Number(val.fee_per_km_normal),
          PROMO_FREE_DIST: 7.1
        });
      }
    } catch (err) { console.error('Error fetching logistics config:', err); }
  };

  // Auto-calculate delivery fee for all types
  useEffect(() => {
    const dist = Number(customerInfo.distanceKm || 0);
    const promo = promotions.find(p => p.id === customerInfo.selectedPromoId);
    
    // Determine rounds: Members/Promo use package days, Retail uses 1 round
    let rounds = 1;
    if (customerInfo.memberType === 'pinto' || customerInfo.memberType === 'promo') {
      rounds = promo ? promo.days_count : 14;
    }
    
    if (dist <= logisticsConfig.PROMO_FREE_DIST) {
      setCustomerInfo(prev => ({ ...prev, deliveryFee: 0 }));
    } else {
      const excessDist = dist - logisticsConfig.PROMO_FREE_DIST;
      // Normal logic applied to the excess distance
      let feePerRound = logisticsConfig.BASE_FARE;
      if (excessDist > logisticsConfig.BASE_INCLUDED_DISTANCE) {
        const ex = excessDist - logisticsConfig.BASE_INCLUDED_DISTANCE;
        feePerRound += ex * logisticsConfig.FEE_PER_KM_NORMAL;
      }
      setCustomerInfo(prev => ({ ...prev, deliveryFee: Math.ceil(feePerRound * rounds) }));
    }
  }, [customerInfo.distanceKm, customerInfo.memberType, customerInfo.selectedPromoId, logisticsConfig, promotions]);

  const handleSaveCustomer = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      toast.error('กรุณาระบุชื่อและเบอร์โทรศัพท์');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Find or Create Member
      let memberId;
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('phone', customerInfo.phone)
        .single();

      if (existingMember) {
        memberId = existingMember.id;
        await supabase.from('members').update({
          full_name: customerInfo.name,
          nickname: customerInfo.nickname,
          line_id: customerInfo.lineId,
          address: customerInfo.address,
          health_goal: customerInfo.healthGoal,
          allergy_notes: customerInfo.allergyNotes,
          member_type: customerInfo.memberType,
          delivery_time: customerInfo.deliverySlot,
          updated_at: new Date().toISOString()
        }).eq('id', memberId);
      } else {
        const { data: newMember, error: createError } = await supabase.from('members').insert({
          full_name: customerInfo.name,
          nickname: customerInfo.nickname,
          phone: customerInfo.phone,
          line_id: customerInfo.lineId,
          address: customerInfo.address,
          health_goal: customerInfo.healthGoal,
          allergy_notes: customerInfo.allergyNotes,
          member_type: customerInfo.memberType,
          delivery_time: customerInfo.deliverySlot,
          member_status: 'active'
        }).select().single();
        
        if (createError) throw createError;
        memberId = newMember.id;
      }

      // 2. If a promotion is selected, create a pinto_package
      if (customerInfo.selectedPromoId) {
        const promo = promotions.find(p => p.id === customerInfo.selectedPromoId);
        if (promo) {
          const { error: pkgError } = await supabase.from('pinto_packages').insert({
            member_id: memberId,
            package_name: promo.name,
            meals_total: promo.meals_count,
            meals_remaining: promo.meals_count,
            days_total: promo.days_count,
            days_remaining: promo.days_count,
            price_paid: promo.price + Number(customerInfo.deliveryFee || 0),
            promotion_id: promo.id,
            start_date: customerInfo.startDate,
            delivery_slot: customerInfo.deliverySlot,
            status: 'active',
            phone: customerInfo.phone,
            internal_notes: `วันส่ง: ${customerInfo.deliveryDays.join(', ')} | ระยะทาง: ${customerInfo.distanceKm || 0} กม. | พื้นที่: ${customerInfo.locationType === 'inside' ? 'ในเมือง' : 'นอกเมือง'} | Maps: ${customerInfo.googleMapsUrl}`
          });
          if (pkgError) throw pkgError;
        }
      }

      toast.success('บันทึกข้อมูลลูกค้าและสมัครแพ็กเกจเรียบร้อยแล้ว');
      // Reset form
      setCustomerInfo({
        name: '', nickname: '', phone: '', lineId: '', address: '',
        startDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
        deliverySlot: '11:00 - 13:00',
        selectedPromoId: '',
        healthGoal: 'ไม่ระบุ', allergyNotes: '',
        memberType: 'pinto',
        deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        googleMapsUrl: '', distanceKm: '', locationType: 'inside', deliveryFee: ''
      });
    } catch (err: any) {
      toast.error('ล้มเหลว: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateOrderSummary = () => {
    const promo = promotions.find(p => p.id === customerInfo.selectedPromoId);
    const totalPrice = (promo?.price || 0) + Number(customerInfo.deliveryFee || 0);
    const startDateFormatted = dayjs(customerInfo.startDate).locale('th').format('ddddที่ D MMM');
    
    return `รับออเดอร์โปรโมชั่น ${promo?.name || 'ผูกปิ่นโต'} รวมยอดทั้งหมด: ${totalPrice.toLocaleString()} บาท 

สแกน QR Code ในรูปเพื่อชำระเงิน รบกวนโอนเรียบร้อยแล้วแจ้งสลิป:

- ตรวจสอบข้อมูล
1. ชื่อ: ${customerInfo.name || '-'}
2. เบอร์โทร: ${customerInfo.phone || '-'}
3. ที่อยู่จัดส่ง/จุดสังเกต: ${customerInfo.address || '-'}
${customerInfo.googleMapsUrl ? `📍 พิกัด: ${customerInfo.googleMapsUrl}` : ''}
4. ตารางจัดส่ง (เริ่มส่ง): ${startDateFormatted}
วันส่งประจำ: ${customerInfo.deliveryDays.map(d => DAYS.find(day => day.id === d)?.label).join(', ')}
5. เวลารับอาหาร : เวลา ${customerInfo.deliverySlot}

ได้รับยอด ${totalPrice.toLocaleString()} บาทเรียบร้อยค่ะ ขอบคุณที่ไว้วางใจให้ Clean Food CR ดูแลโภชนาการค่ะ ทางร้านจะจัดเตรียมวัตถุดิบและเริ่มจัดส่งมื้อแรก ในวัน ${startDateFormatted} ช่วงเวลา ${customerInfo.deliverySlot} ค่ะ`;
  };

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPromotions(data || []);
    } catch (error: any) {
      toast.error('ไม่สามารถดึงข้อมูลโปรโมชั่นได้: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePromotion = async () => {
    if (!newPromo.name || !newPromo.code) return toast.error('กรุณาระบุชื่อและรหัสโปรโมชั่น');
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('promotions').insert([{
        name: newPromo.name,
        code: newPromo.code,
        promotion_type: newPromo.promotion_type,
        price: Number(newPromo.price),
        meals_count: Number(newPromo.meals_count),
        days_count: Number(newPromo.days_count),
        description: newPromo.description,
        sales_script: newPromo.sales_script,
        conditions: newPromo.conditions,
        discount_type: 'FIXED',
        discount_value: 0
      }]);

      if (error) throw error;
      toast.success('สร้างโปรโมชั่นใหม่เรียบร้อยแล้ว');
      setIsModalOpen(false);
      fetchPromotions();
      setNewPromo({
        name: '', code: '', promotion_type: 'PINTO', price: 0, meals_count: 0,
        days_count: 14, description: '', sales_script: '', conditions: ''
      });
    } catch (error: any) {
      toast.error('ล้มเหลว: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!window.confirm('คุณต้องการลบโปรโมชั่นนี้ใช่หรือไม่?')) return;
    try {
      const { error } = await supabase.from('promotions').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast.success('ลบโปรโมชั่นแล้ว');
      fetchPromotions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('คัดลอกข้อความแล้ว');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] min-h-screen">
      {/* Header Area */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-[1.25rem] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/10 border border-slate-800">
              <Rocket size={28} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Promotion Management
                <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Sales War Room</span>
              </h2>
              <p className="text-sm text-slate-500 font-medium">จัดการเสนอขายและแคตตาล็อกโปรโมชั่นอัจฉริยะ</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner min-w-[320px]">
            <button 
              onClick={() => setActiveTab('sales')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === 'sales' ? "bg-white text-slate-900 shadow-md ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <MessageSquare size={18} /> งานเสนอขาย
            </button>
            <button 
              onClick={() => setActiveTab('catalog')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === 'catalog' ? "bg-white text-slate-900 shadow-md ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Tag size={18} /> แคตตาล็อกโปรฯ
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-[1600px] mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'sales' ? (
            <motion.div 
              key="sales-tab"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="grid grid-cols-1 xl:grid-cols-12 gap-8"
            >
              {/* Left Column: Customer Planner Form */}
              <div className="xl:col-span-7 space-y-6">
                <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                   <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                               <Users size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Customer Planner & Intake</h3>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Promotion</span>
                            <select 
                               className="bg-slate-50 border-none text-sm font-bold text-emerald-600 outline-none cursor-pointer"
                               value={customerInfo.selectedPromoId}
                               onChange={(e) => setCustomerInfo({...customerInfo, selectedPromoId: e.target.value})}
                            >
                               <option value="">เลือกโปรโมชั่นที่เสนอ...</option>
                               {promotions.map(p => (
                                 <option key={p.id} value={p.id}>{p.name} (฿{p.price})</option>
                               ))}
                            </select>
                         </div>
                      </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <UserPlus size={14} /> ชื่อ-นามสกุล
                             </label>
                             <input 
                                type="text" 
                                placeholder="เช่น คุณณัฐพล (ณัฐ)"
                                value={customerInfo.name}
                                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Phone size={14} /> เบอร์โทรศัพท์
                             </label>
                             <input 
                                type="text" 
                                placeholder="09X-XXX-XXXX"
                                value={customerInfo.phone}
                                onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                             />
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare size={14} /> LINE ID
                             </label>
                             <input 
                                type="text" 
                                placeholder="ไอดีไลน์ลูกค้า"
                                value={customerInfo.lineId}
                                onChange={(e) => setCustomerInfo({...customerInfo, lineId: e.target.value})}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Tag size={14} /> ประเภทลูกค้า
                             </label>
                             <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button 
                                  onClick={() => setCustomerInfo({...customerInfo, memberType: 'pinto'})}
                                  className={cn(
                                    "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                                    customerInfo.memberType === 'pinto' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"
                                  )}
                                >
                                  สมาชิกปิ่นโต
                                </button>
                                <button 
                                  onClick={() => setCustomerInfo({...customerInfo, memberType: 'promo'})}
                                  className={cn(
                                    "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                                    customerInfo.memberType === 'promo' ? "bg-white shadow-sm text-blue-600" : "text-slate-500"
                                  )}
                                >
                                  สมาชิกโปรฯ
                                </button>
                                <button 
                                  onClick={() => setCustomerInfo({...customerInfo, memberType: 'retail'})}
                                  className={cn(
                                    "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                                    customerInfo.memberType === 'retail' ? "bg-white shadow-sm text-emerald-600" : "text-slate-500"
                                  )}
                                >
                                  ลูกค้ารายย่อย
                                </button>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <MapPin size={14} /> ลิ้งค์ Google Maps
                             </label>
                             <input 
                                type="text" 
                                placeholder="วางลิ้งค์พิกัดลูกค้า..."
                                value={customerInfo.googleMapsUrl}
                                onChange={(e) => setCustomerInfo({...customerInfo, googleMapsUrl: e.target.value})}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                   <Rocket size={14} /> ระยะทาง (กม.)
                                </label>
                                <input 
                                   type="number" 
                                   placeholder="5.5"
                                   value={customerInfo.distanceKm}
                                   onChange={(e) => setCustomerInfo({...customerInfo, distanceKm: e.target.value})}
                                   className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold"
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                   <Home size={14} /> เขตพื้นที่
                                </label>
                                <select 
                                  value={customerInfo.locationType}
                                  onChange={(e) => setCustomerInfo({...customerInfo, locationType: e.target.value})}
                                  className="w-full px-3 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold appearance-none"
                                >
                                  <option value="inside">ในตัวเมือง</option>
                                  <option value="outside">นอกเขตเมือง</option>
                                </select>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-2 mb-8">
                          <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                             <CreditCard size={14} /> ค่าจัดส่งรวม (บาท)
                          </label>
                          <input 
                             type="number" 
                             placeholder="เช่น 150"
                             value={customerInfo.deliveryFee}
                             onChange={(e) => setCustomerInfo({...customerInfo, deliveryFee: e.target.value})}
                             className="w-full px-5 py-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-black text-lg text-indigo-700"
                          />
                       </div>

                       <div className="space-y-2 mb-8">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                             <MapPin size={14} /> ที่อยู่จัดส่ง
                          </label>
                          <textarea 
                             placeholder="บ้านเลขที่, ถนน, หมู่บ้าน, จุดสังเกต..."
                             value={customerInfo.address}
                             onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                             className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium min-h-[80px] resize-none"
                          />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles size={14} /> เป้าหมายสุขภาพ
                             </label>
                             <select 
                               value={customerInfo.healthGoal}
                               onChange={(e) => setCustomerInfo({...customerInfo, healthGoal: e.target.value})}
                               className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium appearance-none"
                             >
                               <option value="ไม่ระบุ">ไม่ระบุ</option>
                               <option value="ลดน้ำหนัก">ลดน้ำหนัก</option>
                               <option value="สร้างกล้ามเนื้อ">สร้างกล้ามเนื้อ</option>
                               <option value="ดูแลสุขภาพ">ดูแลสุขภาพ</option>
                               <option value="คุมโรค">คุมโรค (เบาหวาน/ความดัน)</option>
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                                <AlertTriangle size={14} /> สิ่งที่แพ้ / ไม่ทาน
                             </label>
                             <input 
                                type="text" 
                                placeholder="เช่น ไม่ทานเผ็ด, แพ้ถั่ว"
                                value={customerInfo.allergyNotes}
                                onChange={(e) => setCustomerInfo({...customerInfo, allergyNotes: e.target.value})}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500/10 focus:border-red-200 outline-none transition-all font-medium"
                             />
                          </div>
                       </div>

                       <div className="space-y-4 mb-8 pt-4 border-t border-slate-100">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                             <CalendarIcon size={14} /> วันที่ต้องการรับอาหาร (วันส่ง)
                          </label>
                          <div className="flex flex-wrap gap-2">
                             {DAYS.map(day => (
                                <button
                                  key={day.id}
                                  onClick={() => toggleDay(day.id)}
                                  className={cn(
                                    "w-10 h-10 rounded-xl font-bold text-sm transition-all border-2",
                                    customerInfo.deliveryDays.includes(day.id)
                                      ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                  )}
                                >
                                   {day.label}
                                </button>
                             ))}
                             <div className="ml-2 flex items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">
                                   {customerInfo.deliveryDays.length} วัน/สัปดาห์
                                </span>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <CalendarIcon size={14} /> วันที่เริ่มจัดส่ง
                             </label>
                             <input 
                                type="date" 
                                value={customerInfo.startDate}
                                onChange={(e) => setCustomerInfo({...customerInfo, startDate: e.target.value})}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Clock size={14} /> รอบเวลาจัดส่ง
                             </label>
                             <select 
                               value={customerInfo.deliverySlot}
                               onChange={(e) => setCustomerInfo({...customerInfo, deliverySlot: e.target.value})}
                               className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold appearance-none"
                             >
                               <option value="11:00 - 13:00">11:00 - 13:00 (รอบเช้า)</option>
                               <option value="15:00 - 17:00">15:00 - 17:00 (รอบเย็น)</option>
                             </select>
                          </div>
                       </div>

                       <div className="flex gap-4">
                          <button 
                            onClick={handleSaveCustomer}
                            disabled={isSubmitting}
                            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                          >
                             {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <UserPlus size={24} />} 
                             บันทึกข้อมูลลูกค้าและสมัครแพ็กเกจ
                          </button>
                       </div>
                   </div>
                   {/* Decoration */}
                   <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                </div>
              </div>

               {/* Right Column: Sales Toolkit (Sticky) */}
               <div className="xl:col-span-5 space-y-6">
                 <div className="sticky top-[140px] space-y-6">
                    {/* Real-time Order Summary Preview */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border-4 border-emerald-500/20 relative overflow-hidden">
                       <div className="relative z-10">
                          <div className="flex items-center justify-between mb-6">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                   <Check size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">Order Summary</h3>
                             </div>
                             <button 
                               onClick={() => handleCopyText('summary', generateOrderSummary())}
                               className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                             >
                                <Copy size={14} /> COPY ORDER
                             </button>
                          </div>

                          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 font-mono text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap select-all">
                             {generateOrderSummary()}
                          </div>
                          
                          <div className="mt-6 flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                             <div>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase">ยอดโอนสุทธิ</p>
                                <p className="text-2xl font-black text-emerald-700">
                                   ฿{((promotions.find(p => p.id === customerInfo.selectedPromoId)?.price || 0) + Number(customerInfo.deliveryFee || 0)).toLocaleString()}
                                </p>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">รวมค่าส่งแล้ว</p>
                                <p className="text-xs font-bold text-slate-600">
                                   +{Number(customerInfo.deliveryFee || 0).toLocaleString()} บาท
                                </p>
                             </div>
                          </div>
                       </div>
                       <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                    </div>

                    <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl shadow-slate-900/20 text-white relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                              <Sparkles size={20} />
                          </div>
                          <h3 className="text-xl font-bold">Ready-to-use Templates</h3>
                        </div>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                           {/* Dynamic Templates from Selected Promo */}
                           {customerInfo.selectedPromoId && promotions.find(p => p.id === customerInfo.selectedPromoId)?.sales_script && (
                             <div className="group p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                <div className="flex items-center justify-between mb-3">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/20 px-2 py-0.5 rounded-md">
                                      Custom Sales Script
                                   </span>
                                   <button 
                                     onClick={() => handleCopyText('dynamic', promotions.find(p => p.id === customerInfo.selectedPromoId)?.sales_script)}
                                     className={cn(
                                       "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-500 text-white"
                                     )}
                                   >
                                      <Copy size={14} /> Copy Script
                                   </button>
                                </div>
                                <p className="text-sm font-bold text-white mb-2">บทพูดเสนอขายเฉพาะโปรฯ นี้</p>
                                <p className="text-xs text-emerald-100 leading-relaxed italic">
                                  "{promotions.find(p => p.id === customerInfo.selectedPromoId)?.sales_script}"
                                </p>
                             </div>
                           )}

                           {DEFAULT_TEMPLATES.map((tmpl) => (
                             <div key={tmpl.id} className="group p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">
                                      {tmpl.category}
                                   </span>
                                   <button 
                                     onClick={() => handleCopyText(tmpl.id, tmpl.content)}
                                     className={cn(
                                       "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                       copiedId === tmpl.id 
                                         ? "bg-emerald-500 text-white" 
                                         : "bg-white/10 text-white hover:bg-emerald-500"
                                     )}
                                   >
                                      {copiedId === tmpl.id ? <Check size={14} /> : <Copy size={14} />}
                                      {copiedId === tmpl.id ? 'Copied!' : 'Copy Text'}
                                   </button>
                                </div>
                                <p className="text-sm font-bold text-white mb-2">{tmpl.label}</p>
                                <p className="text-xs text-slate-400 leading-relaxed italic">"{tmpl.content}"</p>
                             </div>
                           ))}
                        </div>
                      </div>
                   </div>

                   <div className="bg-indigo-600 rounded-[2rem] p-6 shadow-xl shadow-indigo-600/20 text-white flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
                         <CreditCard size={28} />
                      </div>
                      <div className="flex-1">
                         <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">Quick Tool</p>
                         <h4 className="text-lg font-bold">บันทึกการชำระเงิน</h4>
                         <p className="text-xs text-indigo-100 opacity-80">อัปโหลดสลิปและยืนยันยอด</p>
                      </div>
                      <button className="w-10 h-10 rounded-full bg-white text-indigo-600 flex items-center justify-center hover:scale-110 transition-all">
                         <ChevronRight size={20} />
                      </button>
                   </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="catalog-tab"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                       <Tag size={20} />
                    </div>
                    <div>
                       <h3 className="text-xl font-bold">คลังโปรโมชั่นทั้งหมด</h3>
                       <p className="text-xs text-slate-500">จัดการข้อมูลแพ็กเกจและโปรโมชั่นในฐานข้อมูล</p>
                    </div>
                 </div>
                 <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all"
                 >
                    <Plus size={18} /> เพิ่มโปรโมชั่นใหม่
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-200 h-64 animate-pulse" />
                  ))
                ) : promotions.length > 0 ? (
                  promotions.map((promo) => {
                    return (
                      <div key={promo.id} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:border-emerald-500/30 transition-all group flex flex-col">
                        <div className="p-6 bg-slate-900 text-white flex flex-col gap-1 relative overflow-hidden">
                           <div className="relative z-10">
                              <div className="flex items-center justify-between mb-4">
                                 <span className="text-[10px] font-black bg-emerald-500 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                    {promo.promotion_type}
                                 </span>
                                 <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleDeletePromotion(promo.id)}
                                      className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                    >
                                       <Trash2 size={14} />
                                    </button>
                                 </div>
                              </div>
                              <h4 className="text-lg font-bold line-clamp-1">{promo.name}</h4>
                              <p className="text-[10px] text-slate-400">ชื่อ: {promo.code}</p>
                           </div>
                           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
                        </div>
                        
                        <div className="p-6 flex-1 space-y-5">
                           <div className="flex justify-between items-end">
                              <div>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">ราคาแพ็กเกจ</p>
                                 <p className="text-2xl font-black text-slate-900">฿{(promo.price || 0).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">จำนวนมื้อ</p>
                                 <p className="text-lg font-bold text-slate-800">{promo.meals_count || '0'} มื้อ</p>
                              </div>
                           </div>

                           <div className="h-px bg-slate-100" />

                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                 <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Package size={10} /> เฉลี่ยมื้อละ</p>
                                 <p className="text-sm font-black text-indigo-600">฿{promo.meals_count > 0 ? (promo.price / promo.meals_count).toFixed(2) : '0'}</p>
                              </div>
                              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                                 <p className="text-[9px] font-bold text-emerald-600/60 uppercase mb-1 flex items-center gap-1"><Clock size={10} /> ระยะเวลา</p>
                                 <p className="text-sm font-black text-emerald-600">{promo.days_count || '0'} วัน</p>
                              </div>
                           </div>

                           {promo.sales_script && (
                             <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                <p className="text-[9px] font-bold text-indigo-400 uppercase mb-1">Sales Script</p>
                                <p className="text-[10px] text-indigo-700 italic line-clamp-2">"{promo.sales_script}"</p>
                             </div>
                           )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                           <button 
                             onClick={() => setSelectedPromo(promo)}
                             className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center justify-center gap-2"
                           >
                              <Info size={14} /> ดูเงื่อนไขและรายละเอียด
                           </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                     <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-6">
                        <Tag size={40} />
                     </div>
                     <h4 className="text-xl font-bold text-slate-800">ไม่พบข้อมูลโปรโมชั่น</h4>
                     <p className="text-slate-500 mt-2">กรุณาสร้างโปรโมชั่นใหม่ที่หน้า Finance หรือตรวจสอบสถานะในฐานข้อมูล</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Promotion Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col my-8"
              >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white">
                      <Tag size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-2xl">สร้างโปรโมชั่นใหม่</h3>
                      <p className="text-xs text-slate-400">กำหนดข้อมูลแพ็กเกจและกลยุทธ์การขาย</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">ชื่อโปรโมชั่น</label>
                         <input 
                            type="text" 
                            placeholder="เช่น โปร 5.5 ลดกระหน่ำ"
                            value={newPromo.name}
                            onChange={(e) => setNewPromo({...newPromo, name: e.target.value})}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">รหัสโปรโมชั่น (Code)</label>
                         <input 
                            type="text" 
                            placeholder="PROMO55"
                            value={newPromo.code}
                            onChange={(e) => setNewPromo({...newPromo, code: e.target.value})}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono"
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">ราคาขาย (฿)</label>
                         <input 
                            type="number" 
                            value={newPromo.price}
                            onChange={(e) => setNewPromo({...newPromo, price: Number(e.target.value)})}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">จำนวนมื้อ</label>
                         <input 
                            type="number" 
                            value={newPromo.meals_count}
                            onChange={(e) => setNewPromo({...newPromo, meals_count: Number(e.target.value)})}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">ประเภท</label>
                         <select 
                            value={newPromo.promotion_type}
                            onChange={(e) => setNewPromo({...newPromo, promotion_type: e.target.value})}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold"
                         >
                            <option value="PINTO">ปิ่นโต (Subscription)</option>
                            <option value="RETAIL">ขายปลีก (Retail)</option>
                            <option value="MUSCLE">เพิ่มกล้ามเนื้อ (Muscle)</option>
                         </select>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">บทพูดเสนอขาย (Sales Script)</label>
                      <textarea 
                         placeholder="ข้อความที่ Concierge จะใช้ Copy ไปเสนอขายลูกค้า..."
                         value={newPromo.sales_script}
                         onChange={(e) => setNewPromo({...newPromo, sales_script: e.target.value})}
                         className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none min-h-[100px] resize-none text-sm italic"
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">เงื่อนไขเพิ่มเติม</label>
                      <textarea 
                         placeholder="เช่น ส่งฟรีเฉพาะเขตกทม, ไม่รวมวันหยุด..."
                         value={newPromo.conditions}
                         onChange={(e) => setNewPromo({...newPromo, conditions: e.target.value})}
                         className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none min-h-[80px] resize-none text-sm"
                      />
                   </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                   <button 
                     onClick={() => setIsModalOpen(false)}
                     className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                   >
                     ยกเลิก
                   </button>
                   <button 
                     onClick={handleCreatePromotion}
                     disabled={isSubmitting}
                     className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
                   >
                     {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                     สร้างโปรโมชั่น
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Promotion Detail Modal */}
        <AnimatePresence>
          {selectedPromo && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPromo(null)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col my-8"
              >
                <div className="p-8 bg-slate-900 text-white relative overflow-hidden">
                   <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                         <span className="text-[10px] font-black bg-emerald-500 px-2.5 py-1 rounded-md uppercase tracking-wider">
                            {selectedPromo.promotion_type}
                         </span>
                         <button 
                            onClick={() => setSelectedPromo(null)}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                         >
                            <X size={20} />
                         </button>
                      </div>
                      <h3 className="text-2xl font-bold">{selectedPromo.name}</h3>
                      <p className="text-xs text-slate-400">ชื่อโปรโมชั่น: {selectedPromo.code}</p>
                   </div>
                   <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4" />
                </div>

                <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                         <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">ราคาขาย</p>
                         <p className="text-xl font-black text-indigo-700">฿{(selectedPromo.price || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                         <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">จำนวนมื้อ</p>
                         <p className="text-xl font-black text-emerald-700">{selectedPromo.meals_count || 0} มื้อ</p>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <MessageSquare size={14} className="text-indigo-500" /> บทพูดเสนอขาย (Sales Script)
                      </h4>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 relative group">
                         <p className="text-sm text-slate-700 leading-relaxed italic">
                           "{selectedPromo.sales_script || 'ไม่มีบทพูดเสนอขาย'}"
                         </p>
                         <button 
                            onClick={() => handleCopyText('modal-script', selectedPromo.sales_script)}
                            className="absolute top-3 right-3 p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all opacity-0 group-hover:opacity-100"
                         >
                            <Copy size={14} />
                         </button>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <Info size={14} className="text-emerald-500" /> เงื่อนไขและรายละเอียด
                      </h4>
                      <div className="p-5 bg-emerald-50/30 rounded-2xl border border-emerald-500/10">
                         <p className="text-sm text-slate-600 whitespace-pre-line">
                           {selectedPromo.conditions || 'ไม่มีเงื่อนไขเพิ่มเติม'}
                         </p>
                      </div>
                   </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100">
                   <button 
                     onClick={() => setSelectedPromo(null)}
                     className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                   >
                     ปิดหน้าต่างนี้
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};
