import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tag,
  Sparkles,
  Users,
  Check,
  Clock, 
  MessageSquare, 
  Copy, 
  UserPlus,
  Rocket,
  Plus,
  Loader2,
  Trash2,
  Package,
  X,
  Info,
  Calculator,
  RotateCcw,
  CheckCircle2,
  MapPin,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OrderCalculator } from '../../calculator/components/OrderCalculator';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TabType = 'sales' | 'catalog' | 'calculator';

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
    content: 'สวัสดีค่ะ ยินดีต้อนรับสู่ Clean Food Chiang Rai ค่ะ สนใจดูแลสุขภาพด้วยคอร์สอาหารคลีนเมนูไหนเป็นพิเศษไหมคะ?'
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
    content: 'เราจัดส่งรอบเช้า 11:00 - 13:00 และรอบเย็น 15:00 - 17:00 ค่ะ ลูกค้าสามารถเลือกเวลาที่สะดวกรับได้เลยค่ะ'
  },
  {
    id: 'p1',
    category: 'payment',
    label: 'แจ้งเลขบัญชี',
    content: 'สามารถโอนชำระได้ที่: ธนาคารกสิกรไทย เลขที่บัญชี 000-0-00000-0 ชื่อบัญชี บจก. คลีนฟู้ด เชียงราย ค่ะ'
  },
  {
    id: 'c1',
    category: 'closing',
    label: 'ปิดการขาย/ขอบคุณ',
    content: 'เรียบร้อยค่ะ บันทึกข้อมูลคอร์สของลูกค้าเข้าระบบแล้วค่ะ ขอบคุณที่ไว้วางใจให้เราดูแลสุขภาพนะคะ'
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
    deliveryDays: ['Mon', 'Thu'],
    googleMapsUrl: '',
    distanceKm: '' as string | number,
    locationType: 'inside', // inside or outside
    deliveryFee: '' as string | number,
    packagePrice: '' as string | number
  });

  const [matchedMember, setMatchedMember] = useState<any | null>(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [isManualDeliveryFee, setIsManualDeliveryFee] = useState(false);

  // Search & sorting states
  const [promoSearchQuery, setPromoSearchQuery] = useState('');
  const [isPromoDropdownOpen, setIsPromoDropdownOpen] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  // Check if member already exists on phone input change
  useEffect(() => {
    const cleanPhone = customerInfo.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 9) {
      setIsSearchingPhone(true);
      const checkExistingMember = async () => {
        try {
          const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('phone', customerInfo.phone)
            .maybeSingle();
          
          if (data && !error) {
            setMatchedMember(data);
          } else {
            setMatchedMember(null);
          }
        } catch {
          setMatchedMember(null);
        } finally {
          setIsSearchingPhone(false);
        }
      };
      
      const timer = setTimeout(checkExistingMember, 500);
      return () => clearTimeout(timer);
    } else {
      setMatchedMember(null);
      setIsSearchingPhone(false);
    }
  }, [customerInfo.phone]);

  const handleLoadMatchedMember = () => {
    if (matchedMember) {
      setCustomerInfo(prev => ({
        ...prev,
        name: matchedMember.full_name || prev.name,
        nickname: matchedMember.line_display_name || matchedMember.nickname || prev.nickname,
        lineId: matchedMember.line_id || prev.lineId,
        address: matchedMember.address || prev.address,
        healthGoal: matchedMember.health_goal || prev.healthGoal,
        allergyNotes: matchedMember.allergy_notes || prev.allergyNotes,
        memberType: matchedMember.member_type || prev.memberType,
        deliverySlot: matchedMember.delivery_time || prev.deliverySlot
      }));
      toast.success('โหลดข้อมูลลูกค้าเดิมเรียบร้อยแล้ว');
    }
  };

  const applyDaysPreset = (preset: 'mon-thu' | 'mon-sat' | 'everyday' | 'mon-fri') => {
    let days = ['Mon', 'Thu'];
    if (preset === 'mon-thu') {
      days = ['Mon', 'Thu'];
    } else if (preset === 'mon-sat') {
      days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    } else if (preset === 'everyday') {
      days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    } else if (preset === 'mon-fri') {
      days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    }
    setCustomerInfo(prev => ({ ...prev, deliveryDays: days }));
  };

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
  const [logisticsConfig, setLogisticsConfig] = useState({
    BASE_FARE: 25,
    BASE_INCLUDED_DISTANCE: 3,
    FEE_PER_KM_NORMAL: 4,
    FEE_PER_KM_FAR: 8,
    STORE_SUBSIDY_BASE: 35
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

  const fetchPromotions = useCallback(async () => {
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
  }, []);

  const fetchLogisticsConfig = useCallback(async () => {
    try {
      const { data } = await supabase.from('erp_settings').select('value').eq('key', 'logistics_config').single();
      if (data) {
        const val = data.value;
        setLogisticsConfig({
          BASE_FARE: Number(val.base_fare || 25),
          BASE_INCLUDED_DISTANCE: Number(val.base_included_distance || 3),
          FEE_PER_KM_NORMAL: Number(val.fee_per_km_normal || 4),
          FEE_PER_KM_FAR: Number(val.fee_per_km_far || 8),
          STORE_SUBSIDY_BASE: 35
        });
      }
    } catch (err) { console.error('Error fetching logistics config:', err); }
  }, []);

  useEffect(() => {
    fetchPromotions();
    fetchLogisticsConfig();
  }, [fetchPromotions, fetchLogisticsConfig]);

  // Auto-calculate delivery fee for all types with 30-35 THB store subsidy model
  useEffect(() => {
    if (isManualDeliveryFee) return;
    const dist = Number(customerInfo.distanceKm || 0);
    const promo = promotions.find(p => p.id === customerInfo.selectedPromoId);
    
    // Determine rounds: Use package delivery_rounds, or fallback based on days (7d -> 3 rounds, 14d -> 5 rounds, 30d -> 11 rounds)
    let rounds = 1;
    if (customerInfo.memberType === 'pinto' || customerInfo.memberType === 'promo') {
      if (promo) {
        if (promo.delivery_rounds && Number(promo.delivery_rounds) > 0) {
          rounds = Number(promo.delivery_rounds);
        } else if (promo.days_count === 7) {
          rounds = 3;
        } else if (promo.days_count === 14) {
          rounds = 5;
        } else if (promo.days_count === 30) {
          rounds = 11;
        } else {
          rounds = Math.max(1, Math.ceil(promo.days_count / 3));
        }
      } else {
        rounds = 5;
      }
    }
    
    const baseExtra = customerInfo.locationType === 'outside' ? 20 : 0;

    let targetFee = 0;
    if (customerInfo.memberType === 'pinto' || customerInfo.memberType === 'promo') {
      // 1. Distance-based fare per round
      let actualFarePerRound = (logisticsConfig.BASE_FARE || 25) + baseExtra;
      const baseIncluded = logisticsConfig.BASE_INCLUDED_DISTANCE || 3;
      if (dist > baseIncluded) {
        const excessKm = dist - baseIncluded;
        if (dist <= 8) {
          actualFarePerRound += excessKm * (logisticsConfig.FEE_PER_KM_NORMAL || 4);
        } else {
          actualFarePerRound += (8 - baseIncluded) * (logisticsConfig.FEE_PER_KM_NORMAL || 4) + (dist - 8) * (logisticsConfig.FEE_PER_KM_FAR || 8);
        }
      }

      // 2. Store subsidy model: Store covers 30-35 THB per round (from 9% Grab subsidy fund)
      // 7-day pack (<= 3 rounds) = 30 THB/round, 14-day / 30-day (> 3 rounds) = 35 THB/round
      const storeSubsidyPerRound = rounds <= 3 ? 30 : 35;

      // 3. Customer pays only the excess beyond store subsidy
      const customerFeePerRound = Math.max(0, actualFarePerRound - storeSubsidyPerRound);
      targetFee = Math.ceil(customerFeePerRound * rounds);
    } else {
      let fee = (logisticsConfig.BASE_FARE || 25) + baseExtra;
      const baseIncluded = logisticsConfig.BASE_INCLUDED_DISTANCE || 3;
      if (dist > baseIncluded) {
        fee += (dist - baseIncluded) * (logisticsConfig.FEE_PER_KM_NORMAL || 4);
      }
      targetFee = Math.ceil(fee);
    }

    setCustomerInfo(prev => prev.deliveryFee === targetFee ? prev : { ...prev, deliveryFee: targetFee });
  }, [customerInfo.distanceKm, customerInfo.memberType, customerInfo.selectedPromoId, logisticsConfig, promotions, customerInfo.locationType, isManualDeliveryFee]);

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
          line_display_name: customerInfo.nickname,
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
          line_display_name: customerInfo.nickname,
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

      // 2. Create a pinto_package (or general order)
      const promo = customerInfo.selectedPromoId ? promotions.find(p => p.id === customerInfo.selectedPromoId) : null;
      const packageName = promo ? promo.name : (customerInfo.memberType === 'retail' ? 'ออเดอร์รายย่อย' : 'ออเดอร์ทั่วไป (Custom)');
      const mealsCount = promo ? promo.meals_count : (customerInfo.memberType === 'retail' ? 1 : 0);
      const daysCount = promo ? promo.days_count : (customerInfo.memberType === 'retail' ? 1 : 14);
      // Calculate rounds plan (supporting 6, 6, 3 remainder format)
      const roundsCount = promo?.delivery_rounds || (daysCount === 7 ? 3 : (daysCount === 14 ? 5 : (daysCount === 30 ? 11 : Math.max(1, Math.ceil(daysCount / 3)))));
      let roundsPlan = [6, 6, 6];
      if (daysCount === 7) roundsPlan = [6, 6, 3];
      else if (daysCount === 14) roundsPlan = [6, 6, 6, 6, 6];
      else if (daysCount === 30) roundsPlan = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3];
      else roundsPlan = Array(roundsCount).fill(Math.ceil((mealsCount || 1) / roundsCount));

      const { error: pkgError } = await supabase.from('pinto_packages').insert({
        member_id: memberId,
        package_name: packageName,
        meals_total: mealsCount,
        meals_remaining: mealsCount,
        days_total: daysCount,
        days_remaining: daysCount,
        price_paid: Number(customerInfo.packagePrice || 0) + Number(customerInfo.deliveryFee || 0),
        promotion_id: promo?.id || null,
        start_date: customerInfo.startDate,
        delivery_slot: customerInfo.deliverySlot,
        delivery_days: customerInfo.deliveryDays,
        delivery_rounds: roundsCount,
        delivery_rounds_plan: roundsPlan,
        status: 'active',
        phone: customerInfo.phone,
        internal_notes: `วันส่ง: ${customerInfo.deliveryDays.join(', ')} | ระยะทาง: ${customerInfo.distanceKm || 0} กม. | พื้นที่: ${customerInfo.locationType === 'inside' ? 'ในเมือง' : 'นอกเมือง'} | Maps: ${customerInfo.googleMapsUrl}`
      });
      if (pkgError) throw pkgError;

      toast.success('บันทึกข้อมูลลูกค้าและสร้างออเดอร์เรียบร้อยแล้ว');
      // Reset form
      setCustomerInfo({
        name: '', nickname: '', phone: '', lineId: '', address: '',
        startDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
        deliverySlot: '11:00 - 13:00',
        selectedPromoId: '',
        healthGoal: 'ไม่ระบุ', allergyNotes: '',
        memberType: 'pinto',
        deliveryDays: ['Mon', 'Thu'],
        googleMapsUrl: '', distanceKm: '', locationType: 'inside', deliveryFee: '',
        packagePrice: ''
      });
      setIsManualDeliveryFee(false);
    } catch (err: any) {
      toast.error('ล้มเหลว: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateOrderSummary = () => {
    const promo = promotions.find(p => p.id === customerInfo.selectedPromoId);
    const totalPrice = Number(customerInfo.packagePrice || 0) + Number(customerInfo.deliveryFee || 0);
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
    toast.success('คัดลอกข้อความแล้ว ✨');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-sans">
      
      {/* ─── Top Header Bar ─── */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5 shadow-xs sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Rocket size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                  เพิ่มสมาชิกโปรโมชั่น & เซลส์
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Sales Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">จัดการเสนอขาย คัดลอกสคริปต์ และคำนวณค่าส่งอัจฉริยะ</p>
            </div>
          </div>

          {/* Responsive Tab Switcher */}
          <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('sales')}
              className={cn(
                "flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeTab === 'sales' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <MessageSquare size={15} className={activeTab === 'sales' ? "text-emerald-600" : "text-slate-400"} /> 
              <span>งานเสนอขาย & สมัคร</span>
            </button>
            <button 
              onClick={() => setActiveTab('catalog')}
              className={cn(
                "flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeTab === 'catalog' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Tag size={15} className={activeTab === 'catalog' ? "text-emerald-600" : "text-slate-400"} /> 
              <span>คลังโปรโมชั่น</span>
            </button>
            <button 
              onClick={() => setActiveTab('calculator')}
              className={cn(
                "flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeTab === 'calculator' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Calculator size={15} className={activeTab === 'calculator' ? "text-emerald-600" : "text-slate-400"} /> 
              <span>คำนวณออเดอร์</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'sales' ? (
            <motion.div 
              key="sales-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-6"
            >
              {/* Left Column: High-Density Customer Intake Form */}
              <div className="xl:col-span-8 space-y-5">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs relative overflow-hidden">
                  <div className="space-y-5">
                    
                    {/* Header & Promo Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Users size={16} />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-bold text-slate-900">ลงทะเบียนสมาชิกใหม่ & สมัครคอร์ส</h2>
                          <p className="text-[11px] text-slate-400">กรอกข้อมูลและเลือกแพ็กเกจเพื่อเปิดใช้งาน</p>
                        </div>
                      </div>

                      {/* Promo Dropdown Button */}
                      <div className="relative w-full sm:w-72 select-none">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">เลือกโปรโมชั่นที่เสนอ</span>
                        <div 
                          onClick={() => setIsPromoDropdownOpen(!isPromoDropdownOpen)}
                          className="bg-emerald-50/60 hover:bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-between cursor-pointer transition-all"
                        >
                          <span className="truncate">
                            {customerInfo.selectedPromoId 
                              ? promotions.find(p => p.id === customerInfo.selectedPromoId)?.name + ` (฿${Number(promotions.find(p => p.id === customerInfo.selectedPromoId)?.price || 0).toLocaleString()})`
                              : '-- เลือกโปรโมชั่นที่ต้องการ --'}
                          </span>
                          <ChevronDown size={14} className="text-emerald-600 shrink-0 ml-1.5" />
                        </div>
                        
                        {isPromoDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsPromoDropdownOpen(false)} />
                            <div className="absolute right-0 top-full mt-1.5 w-full sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 space-y-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                              <input 
                                type="text" 
                                placeholder="พิมพ์ค้นหาโปรโมชั่น..."
                                value={promoSearchQuery}
                                onChange={(e) => setPromoSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 outline-none"
                              />
                              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                <div 
                                  onClick={() => {
                                    setCustomerInfo({...customerInfo, selectedPromoId: '', packagePrice: ''});
                                    setIsManualDeliveryFee(false);
                                    setIsPromoDropdownOpen(false);
                                    setPromoSearchQuery('');
                                  }}
                                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer transition-all font-medium"
                                >
                                  -- ไม่ระบุโปรโมชั่น --
                                </div>
                                {getSortedPromotions(promotions)
                                  .filter(p => p.name.toLowerCase().includes(promoSearchQuery.toLowerCase()) || p.code?.toLowerCase().includes(promoSearchQuery.toLowerCase()))
                                  .map(p => (
                                    <div 
                                      key={p.id}
                                      onClick={() => {
                                        const code = (p.code || '').toUpperCase();
                                        const promoType = (p.promotion_type || 'PINTO').toUpperCase();
                                        let derivedType: 'pinto' | 'promo' | 'retail' = 'pinto';
                                        if (code.startsWith('MUSCLE') || p.name.includes('เพิ่มกล้าม')) {
                                          derivedType = 'promo';
                                        } else if (promoType === 'RETAIL' || code.includes('WEEKEND') || code.includes('GROUP') || code.includes('RETAIL')) {
                                          derivedType = 'retail';
                                        }
                                        
                                        setCustomerInfo({
                                          ...customerInfo, 
                                          selectedPromoId: p.id,
                                          memberType: derivedType,
                                          packagePrice: p.price
                                        });
                                        setIsManualDeliveryFee(false);
                                        setIsPromoDropdownOpen(false);
                                        setPromoSearchQuery('');
                                      }}
                                      className={`px-2.5 py-2 text-xs rounded-xl cursor-pointer transition-all flex justify-between items-center ${
                                        customerInfo.selectedPromoId === p.id 
                                          ? 'bg-emerald-50 text-emerald-700 font-bold' 
                                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                                      }`}
                                    >
                                      <span className="truncate mr-2">{p.name}</span>
                                      <span className="text-emerald-600 font-mono font-bold shrink-0">฿{Number(p.price).toLocaleString()}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* High-Density Form Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      
                      {/* Phone Input with Real-time lookup */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="08X-XXX-XXXX"
                            value={customerInfo.phone} 
                            onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                            className={cn(
                              "w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs outline-none transition-all font-mono",
                              matchedMember ? "border-amber-300 bg-amber-50 text-amber-900 pr-24 font-bold" : "border-slate-200 text-slate-800 focus:border-emerald-500 focus:bg-white"
                            )}
                          />
                          {isSearchingPhone && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">ค้นหา...</span>
                          )}
                          {matchedMember && !isSearchingPhone && (
                            <button
                              type="button"
                              onClick={handleLoadMatchedMember}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xs transition-all active:scale-95"
                            >
                              ดึงข้อมูลเดิม
                            </button>
                          )}
                        </div>
                        {matchedMember && (
                          <span className="text-[10px] text-amber-700 font-bold mt-1 block">
                            ✨ พบข้อมูลของ คุณ{matchedMember.full_name || matchedMember.line_display_name}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          ชื่อ-นามสกุล <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          placeholder="คุณสมชาย สุขภาพดี"
                          value={customerInfo.name} 
                          onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ชื่อเล่น / LINE Display</label>
                        <input 
                          type="text" 
                          placeholder="เช่น ตั้ม"
                          value={customerInfo.nickname} 
                          onChange={(e) => setCustomerInfo({...customerInfo, nickname: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">LINE ID</label>
                        <input 
                          type="text" 
                          placeholder="@lineid"
                          value={customerInfo.lineId} 
                          onChange={(e) => setCustomerInfo({...customerInfo, lineId: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">วันที่เริ่มจัดส่ง</label>
                        <input 
                          type="date" 
                          value={customerInfo.startDate} 
                          onChange={(e) => setCustomerInfo({...customerInfo, startDate: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">รอบเวลาจัดส่ง</label>
                        <select 
                          value={customerInfo.deliverySlot} 
                          onChange={(e) => setCustomerInfo({...customerInfo, deliverySlot: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold"
                        >
                          <option value="11:00 - 13:00">11:00 - 13:00 (รอบเที่ยง)</option>
                          <option value="15:00 - 17:00">15:00 - 17:00 (รอบเย็น)</option>
                        </select>
                      </div>

                      {/* Maps URL */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Google Maps URL</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="วางลิงก์พิกัดแผนที่..."
                            value={customerInfo.googleMapsUrl} 
                            onChange={(e) => setCustomerInfo({...customerInfo, googleMapsUrl: e.target.value})}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all truncate font-medium"
                          />
                          <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>

                      {/* Distance & Area Type */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ระยะทาง (กม.)</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={customerInfo.distanceKm} 
                            onChange={(e) => setCustomerInfo({...customerInfo, distanceKm: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">เขตพื้นที่</label>
                          <select 
                            value={customerInfo.locationType} 
                            onChange={(e) => setCustomerInfo({...customerInfo, locationType: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold"
                          >
                            <option value="inside">ในเขตเมือง</option>
                            <option value="outside">นอกเขตเมือง</option>
                          </select>
                        </div>
                      </div>

                      {/* Package Price & Delivery Fee */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ราคาแพ็กเกจ (฿)</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={customerInfo.packagePrice} 
                            onChange={(e) => setCustomerInfo({...customerInfo, packagePrice: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-emerald-700 uppercase mb-1 flex items-center justify-between">
                            <span>ค่าจัดส่ง (฿)</span>
                            {isManualDeliveryFee && (
                              <button type="button" onClick={() => setIsManualDeliveryFee(false)} className="text-[9px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded transition-all">ออโต้</button>
                            )}
                          </label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={customerInfo.deliveryFee} 
                            onChange={(e) => {
                              setIsManualDeliveryFee(true);
                              setCustomerInfo({...customerInfo, deliveryFee: e.target.value});
                            }}
                            className="w-full px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800 focus:border-emerald-500 outline-none transition-all font-mono font-black"
                          />
                        </div>
                      </div>

                      {/* Member Type Switcher */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ประเภทลูกค้า</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 gap-1">
                          {[
                            { key: 'pinto', label: 'ปิ่นโต' },
                            { key: 'promo', label: 'โปรฯ' },
                            { key: 'retail', label: 'รายย่อย' }
                          ].map((t) => (
                            <button 
                              key={t.key}
                              type="button"
                              onClick={() => setCustomerInfo({...customerInfo, memberType: t.key})}
                              className={cn(
                                "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
                                customerInfo.memberType === t.key ? "bg-white shadow-xs text-slate-900" : "text-slate-500 hover:text-slate-700"
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">เป้าหมายสุขภาพ</label>
                        <select 
                          value={customerInfo.healthGoal} 
                          onChange={(e) => setCustomerInfo({...customerInfo, healthGoal: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium"
                        >
                          <option value="ไม่ระบุ">ไม่ระบุ</option>
                          <option value="ลดน้ำหนัก">ลดน้ำหนัก</option>
                          <option value="สร้างกล้ามเนื้อ">สร้างกล้ามเนื้อ</option>
                          <option value="ดูแลสุขภาพ">ดูแลสุขภาพ (Clean Balance)</option>
                          <option value="คุมโรค">คุมโรค (เบาหวาน/ความดัน)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-red-600 uppercase mb-1">สิ่งที่แพ้ / ไม่ทาน</label>
                        <input 
                          type="text" 
                          placeholder="เช่น ไม่ทานเผ็ด, แพ้ถั่ว"
                          value={customerInfo.allergyNotes} 
                          onChange={(e) => setCustomerInfo({...customerInfo, allergyNotes: e.target.value})}
                          className="w-full px-3 py-2 bg-red-50/40 border border-red-200 rounded-xl text-xs text-red-800 focus:border-red-400 focus:bg-white outline-none transition-all font-medium"
                        />
                      </div>

                      {/* Delivery Days (Hidden for Retail) */}
                      {customerInfo.memberType !== 'retail' && (
                        <div className="md:col-span-3 border-t border-slate-100 pt-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <label className="block text-[11px] font-bold text-slate-600 uppercase">วันส่งประจำ</label>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                {customerInfo.deliveryDays.length} วัน / สัปดาห์
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">ปุ่มลัด:</span>
                              <button 
                                type="button"
                                onClick={() => applyDaysPreset('mon-thu')}
                                className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg border border-emerald-300 transition-all"
                              >
                                จ-พฤ ✓
                              </button>
                              <button 
                                type="button"
                                onClick={() => applyDaysPreset('mon-sat')}
                                className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all"
                              >
                                จ-ส
                              </button>
                              <button 
                                type="button"
                                onClick={() => applyDaysPreset('mon-fri')}
                                className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all"
                              >
                                จ-ศ
                              </button>
                              <button 
                                type="button"
                                onClick={() => applyDaysPreset('everyday')}
                                className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all"
                              >
                                ทุกวัน
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {DAYS.map(day => {
                              const isSelected = customerInfo.deliveryDays.includes(day.id);
                              return (
                                <button
                                  key={day.id}
                                  type="button"
                                  onClick={() => toggleDay(day.id)}
                                  className={cn(
                                    "w-9 h-9 rounded-xl font-bold text-xs transition-all border flex items-center justify-center",
                                    isSelected 
                                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" 
                                      : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                  )}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Detailed Address */}
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ที่อยู่จัดส่งโดยละเอียด</label>
                        <textarea 
                          placeholder="บ้านเลขที่, ซอย, ถนน, หมู่บ้าน, จุดสังเกต..."
                          rows={2}
                          value={customerInfo.address} 
                          onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all resize-none font-medium"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-2.5 border-t border-slate-100 pt-4">
                      <button 
                        type="button"
                        onClick={() => setCustomerInfo({
                          name: '', nickname: '', phone: '', lineId: '', address: '',
                          startDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
                          deliverySlot: '11:00 - 13:00', selectedPromoId: '',
                          healthGoal: 'ไม่ระบุ', allergyNotes: '', memberType: 'pinto',
                          deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                          googleMapsUrl: '', distanceKm: '', locationType: 'inside', deliveryFee: '',
                          packagePrice: ''
                        })}
                        className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw size={14} /> ล้างฟอร์ม
                      </button>
                      
                      <button 
                        type="button"
                        onClick={handleSaveCustomer}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} 
                        {customerInfo.memberType === 'retail' ? 'บันทึกออเดอร์รายย่อย' : 'บันทึกข้อมูลและเปิดแพ็กเกจ'}
                      </button>
                    </div>

                  </div>
                </div>
              </div>

              {/* Right Column: Sales Toolkit (Order Summary + Scripts) */}
              <div className="xl:col-span-4 space-y-5">
                <div className="sticky top-[100px] space-y-5">
                  
                  {/* Order Summary Card */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <CheckCircle2 size={16} />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">สรุปรายละเอียดออเดอร์</h3>
                      </div>
                      
                      <button 
                        onClick={() => handleCopyText('summary', generateOrderSummary())}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 shadow-xs active:scale-95"
                      >
                        <Copy size={11} /> คัดลอกข้อความ
                      </button>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 font-mono text-[11px] leading-relaxed text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap select-all custom-scrollbar">
                      {generateOrderSummary()}
                    </div>
                    
                    {/* Price summary badge */}
                    <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
                      <div>
                        <p className="text-[10px] font-bold text-emerald-700 uppercase">ยอดโอนสุทธิ</p>
                        <p className="text-xl font-bold text-emerald-800 font-mono tracking-tight">
                          ฿{(Number(customerInfo.packagePrice || 0) + Number(customerInfo.deliveryFee || 0)).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">รวมค่าส่งแล้ว</p>
                        <p className="text-xs font-mono font-bold text-slate-600">
                          +{Number(customerInfo.deliveryFee || 0).toLocaleString()} ฿
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ready-to-use Templates / Sales Script */}
                  <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xl shadow-slate-900/10 text-white space-y-4 relative overflow-hidden">
                    <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl" />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center">
                          <Sparkles size={16} />
                        </div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">เทมเพลตบทพูดแนะนำการขาย</h3>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar relative z-10">
                      {/* Dynamic Scripts from Selected Promo */}
                      {customerInfo.selectedPromoId && promotions.find(p => p.id === customerInfo.selectedPromoId)?.sales_script && (
                        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-400/20 px-2 py-0.5 rounded-md">
                              บทพูดโปรนี้
                            </span>
                            <button 
                              onClick={() => handleCopyText('dynamic', promotions.find(p => p.id === customerInfo.selectedPromoId)?.sales_script)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95"
                            >
                              <Copy size={10} /> คัดลอก
                            </button>
                          </div>
                          <p className="text-xs text-emerald-100 italic leading-relaxed">
                            "{promotions.find(p => p.id === customerInfo.selectedPromoId)?.sales_script}"
                          </p>
                        </div>
                      )}

                      {DEFAULT_TEMPLATES.map((tmpl) => (
                        <div key={tmpl.id} className="p-3.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">
                              {tmpl.label}
                            </span>
                            <button 
                              onClick={() => handleCopyText(tmpl.id, tmpl.content)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95",
                                copiedId === tmpl.id ? "bg-emerald-500 text-white" : "bg-white/10 text-white hover:bg-emerald-600"
                              )}
                            >
                              {copiedId === tmpl.id ? <Check size={10} /> : <Copy size={10} />}
                              {copiedId === tmpl.id ? 'คัดลอกแล้ว' : 'คัดลอก'}
                            </button>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed italic">"{tmpl.content}"</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          ) : activeTab === 'catalog' ? (
            <motion.div 
              key="catalog-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Catalog Top Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Tag size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">คลังโปรโมชั่นทั้งหมด</h2>
                    <p className="text-xs text-slate-500">จัดการข้อมูลแพ็กเกจและโปรโมชั่นในฐานข้อมูล</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อ หรือ รหัสโปรฯ..."
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    className="flex-1 sm:w-64 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  />
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-slate-800 transition-all active:scale-95"
                  >
                    <Plus size={15} /> เพิ่มโปรโมชั่นใหม่
                  </button>
                </div>
              </div>

              {/* Promotions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-200/80 h-72 animate-pulse" />
                  ))
                ) : promotions.length > 0 ? (
                  getSortedPromotions(promotions)
                    .filter(p => p.name.toLowerCase().includes(catalogSearchQuery.toLowerCase()) || p.code?.toLowerCase().includes(catalogSearchQuery.toLowerCase()))
                    .map((promo) => {
                      return (
                        <div 
                          key={promo.id} 
                          className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-400/80 transition-all group flex flex-col justify-between"
                        >
                          <div className="p-5 bg-slate-900 text-white relative overflow-hidden">
                            <div className="relative z-10 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                                  {promo.promotion_type}
                                </span>
                                <button 
                                  onClick={() => handleDeletePromotion(promo.id)}
                                  className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                  title="ลบโปรโมชั่น"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <h3 className="text-base font-bold text-white line-clamp-1">{promo.name}</h3>
                              <p className="text-[10px] text-slate-400 font-mono">CODE: {promo.code}</p>
                            </div>
                            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
                          </div>
                          
                          <div className="p-5 flex-1 space-y-4">
                            <div className="flex justify-between items-baseline">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">ราคาแพ็กเกจ</p>
                                <p className="text-xl font-bold font-mono text-slate-900">฿{(promo.price || 0).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">จำนวนมื้อ</p>
                                <p className="text-base font-bold font-mono text-slate-800">{promo.meals_count || '0'} มื้อ</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5 flex items-center gap-1">
                                  <Package size={10} /> เฉลี่ยมื้อละ
                                </p>
                                <p className="text-xs font-mono font-bold text-slate-800">
                                  ฿{promo.meals_count > 0 ? (promo.price / promo.meals_count).toFixed(2) : '0'}
                                </p>
                              </div>
                              <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                <p className="text-[9px] font-bold text-emerald-700 uppercase mb-0.5 flex items-center gap-1">
                                  <Clock size={10} /> ระยะเวลา
                                </p>
                                <p className="text-xs font-mono font-bold text-emerald-800">{promo.days_count || '0'} วัน</p>
                              </div>
                            </div>

                            {promo.sales_script && (
                              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Sales Script</p>
                                <p className="text-[11px] text-slate-600 italic line-clamp-2">"{promo.sales_script}"</p>
                              </div>
                            )}
                          </div>

                          <div className="p-3.5 bg-slate-50 border-t border-slate-100">
                            <button 
                              onClick={() => setSelectedPromo(promo)}
                              className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Info size={14} /> ดูเงื่อนไขและรายละเอียด
                            </button>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="col-span-full py-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300 mb-3">
                      <Tag size={28} />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">ไม่พบข้อมูลโปรโมชั่น</h4>
                    <p className="text-xs text-slate-400 mt-1">กรุณากดปุ่ม "เพิ่มโปรโมชั่นใหม่" ด้านบนเพื่อสร้างข้อมูล</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'calculator' ? (
            <motion.div 
              key="calculator-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <OrderCalculator />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ─── Create Promotion Modal ─── */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
              >
                <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                      <Tag size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">สร้างโปรโมชั่นใหม่</h3>
                      <p className="text-[11px] text-slate-400">กำหนดข้อมูลแพ็กเกจและกลยุทธ์การขาย</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ชื่อโปรโมชั่น</label>
                      <input 
                        type="text" 
                        placeholder="เช่น โปรผูกปิ่นโต 30 มื้อ"
                        value={newPromo.name}
                        onChange={(e) => setNewPromo({...newPromo, name: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">รหัสโปรโมชั่น (Code)</label>
                      <input 
                        type="text" 
                        placeholder="PROMO30"
                        value={newPromo.code}
                        onChange={(e) => setNewPromo({...newPromo, code: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ราคาขาย (฿)</label>
                      <input 
                        type="number" 
                        value={newPromo.price}
                        onChange={(e) => setNewPromo({...newPromo, price: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">จำนวนมื้อ</label>
                      <input 
                        type="number" 
                        value={newPromo.meals_count}
                        onChange={(e) => setNewPromo({...newPromo, meals_count: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ประเภท</label>
                      <select 
                        value={newPromo.promotion_type}
                        onChange={(e) => setNewPromo({...newPromo, promotion_type: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold"
                      >
                        <option value="PINTO">ปิ่นโต (PINTO)</option>
                        <option value="RETAIL">ขายปลีก (RETAIL)</option>
                        <option value="MUSCLE">เพิ่มกล้าม (MUSCLE)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">บทพูดเสนอขาย (Sales Script)</label>
                    <textarea 
                      placeholder="ข้อความที่ฝ่ายขายจะใช้ Copy ไปเสนอขายลูกค้า..."
                      rows={3}
                      value={newPromo.sales_script}
                      onChange={(e) => setNewPromo({...newPromo, sales_script: e.target.value})}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white resize-none text-xs italic"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">เงื่อนไขเพิ่มเติม</label>
                    <textarea 
                      placeholder="เช่น จัดส่งฟรีในเขตเมือง, ปรับเปลี่ยนเมนูได้ล่วงหน้า 1 วัน..."
                      rows={2}
                      value={newPromo.conditions}
                      onChange={(e) => setNewPromo({...newPromo, conditions: e.target.value})}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white resize-none text-xs"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={handleCreatePromotion}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    สร้างโปรโมชั่น
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── Promotion Detail Modal ─── */}
        <AnimatePresence>
          {selectedPromo && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPromo(null)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
              >
                <div className="p-6 bg-slate-900 text-white relative overflow-hidden">
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                        {selectedPromo.promotion_type}
                      </span>
                      <button 
                        onClick={() => setSelectedPromo(null)}
                        className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <h3 className="text-xl font-bold text-white">{selectedPromo.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">CODE: {selectedPromo.code}</p>
                  </div>
                  <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl" />
                </div>

                <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">ราคาขาย</p>
                      <p className="text-lg font-bold font-mono text-slate-900">฿{(selectedPromo.price || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase mb-0.5">จำนวนมื้อ</p>
                      <p className="text-lg font-bold font-mono text-emerald-800">{selectedPromo.meals_count || 0} มื้อ</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-emerald-600" /> บทพูดเสนอขาย (Sales Script)
                    </span>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                      <p className="text-xs text-slate-700 leading-relaxed italic">
                        "{selectedPromo.sales_script || 'ไม่มีบทพูดเสนอขาย'}"
                      </p>
                      {selectedPromo.sales_script && (
                        <button 
                          onClick={() => handleCopyText('modal-script', selectedPromo.sales_script)}
                          className="mt-2 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                        >
                          <Copy size={11} /> คัดลอกข้อความ
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Info size={13} className="text-emerald-600" /> เงื่อนไขและรายละเอียด
                    </span>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {selectedPromo.conditions || 'ไม่มีเงื่อนไขเพิ่มเติม'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <button 
                    onClick={() => setSelectedPromo(null)}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xs"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
