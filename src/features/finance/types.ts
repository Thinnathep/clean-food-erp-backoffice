// Finance System Types — Clean Food ERP

export interface SplitConfig {
  id: string;
  config_name: string;
  promotion_type: 'PINTO' | 'MUSCLE' | 'RETAIL' | 'ADDON';
  material_pct: number;
  labor_pct: number;
  ops_pct: number;
  profit_pct: number;
  is_default: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

export interface FundPool {
  id: string;
  pool_type: 'MATERIAL' | 'LABOR' | 'OPS' | 'PROFIT' | 'DELIVERY';
  display_name: string;
  display_name_public: string;
  current_balance: number;
  total_in: number;
  total_out: number;
  target_amount: number;
  color_code: string;
  icon: string;
  visibility: 'CEO_ONLY' | 'MANAGER' | 'ALL';
  sort_order: number;
}

export interface RevenueBucket {
  id: string;
  source_type: 'PACKAGE' | 'ORDER' | 'MUSCLE_CUSTOM';
  source_id?: string;
  member_id?: string;
  payment_id?: string;
  gross_amount: number;
  delivery_fee: number;
  net_amount: number;
  split_config_id?: string;
  material_pct: number;
  labor_pct: number;
  ops_pct: number;
  profit_pct: number;
  material_amount: number;
  labor_amount: number;
  ops_amount: number;
  profit_amount: number;
  description?: string;
  status: 'active' | 'completed' | 'refunded';
  period_start?: string;
  period_end?: string;
  notes?: string;
  private_note?: string;
  created_at: string;
  // Joined
  members?: { full_name: string; phone: string };
}

export interface FundTransaction {
  id: string;
  pool_type: 'MATERIAL' | 'LABOR' | 'OPS' | 'PROFIT' | 'DELIVERY';
  direction: 'IN' | 'OUT';
  amount: number;
  category?: string;
  description?: string;
  private_note?: string;
  source_type: 'SPLIT' | 'MANUAL' | 'EXPENSE' | 'TRANSFER';
  source_id?: string;
  receipt_url?: string;
  is_personal: boolean;
  created_by?: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  pool_type: string;
  icon: string;
  color: string;
  visibility: string;
  is_personal: boolean;
  sort_order: number;
  is_active: boolean;
}

export type PoolType = 'MATERIAL' | 'LABOR' | 'OPS' | 'PROFIT' | 'DELIVERY';

export const POOL_CONFIG: Record<PoolType, { 
  label: string; 
  labelPublic: string; 
  color: string; 
  bgColor: string; 
  borderColor: string; 
  icon: string;
  defaultPct: number;
  description: string;
}> = {
  MATERIAL: { 
    label: 'ทุนวัตถุดิบ & บรรจุภัณฑ์', 
    labelPublic: 'ต้นทุนการผลิต', 
    color: '#10b981', 
    bgColor: 'rgba(16,185,129,0.08)', 
    borderColor: 'rgba(16,185,129,0.25)', 
    icon: '🥦',
    defaultPct: 35,
    description: 'สำรองสำหรับซื้อผัก อกไก่ ข้าวไรซ์เบอร์รี่ และกล่องบรรจุภัณฑ์'
  },
  LABOR: { 
    label: 'ค่าแรง & สวัสดิการ', 
    labelPublic: 'สวัสดิการทีม', 
    color: '#3b82f6', 
    bgColor: 'rgba(59,130,246,0.08)', 
    borderColor: 'rgba(59,130,246,0.25)', 
    icon: '👨‍🍳',
    defaultPct: 15,
    description: 'สำรองสำหรับจ่ายค่าจ้างเชฟ ผู้ช่วยครัว และสวัสดิการทีมงาน'
  },
  OPS: { 
    label: 'ค่าดำเนินการ & บิล', 
    labelPublic: 'ค่าบิล', 
    color: '#f59e0b', 
    bgColor: 'rgba(245,158,11,0.08)', 
    borderColor: 'rgba(245,158,11,0.25)', 
    icon: '⚡',
    defaultPct: 20,
    description: 'สำรองสำหรับค่าน้ำ ค่าไฟ ค่าเช่าที่ ค่าแก๊ส และการตลาด'
  },
  PROFIT: { 
    label: 'กำไรสุทธิ & เงินสำรอง', 
    labelPublic: 'สำรองธุรกิจ', 
    color: '#ec4899', 
    bgColor: 'rgba(236,72,153,0.08)', 
    borderColor: 'rgba(236,72,153,0.25)', 
    icon: '💎',
    defaultPct: 30,
    description: 'กำไรสุทธิสะสม กองทุนขยายสาขา และเงินสำรองฉุกเฉิน'
  },
  DELIVERY: { 
    label: 'กองทุนค่าจัดส่ง', 
    labelPublic: 'ค่าจัดส่ง', 
    color: '#f97316', 
    bgColor: 'rgba(249,115,22,0.08)', 
    borderColor: 'rgba(249,115,22,0.25)', 
    icon: '🛵',
    defaultPct: 100,
    description: '100% ของค่าจัดส่ง แยกไว้สำหรับจ่ายค่าน้ำมันและไรเดอร์'
  },
};
