// Finance System Types — Clean Food ERP

export interface SplitConfig {
  id: string;
  config_name: string;
  promotion_type: 'PINTO' | 'MUSCLE' | 'RETAIL' | 'ADDON';
  material_pct: number;
  packaging_pct?: number;
  labor_pct: number;
  delivery_sub_pct?: number;
  marketing_pct?: number;
  maintenance_pct?: number;
  ops_pct: number;
  profit_pct: number;
  is_default: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

export interface FundPool {
  id: string;
  pool_type: PoolType | string;
  display_name: string;
  display_name_public: string;
  current_balance: number;
  total_in: number;
  total_out: number;
  target_amount: number;
  color_code: string;
  icon: string;
  visibility: 'CEO_ONLY' | 'MANAGER' | 'ALL' | string;
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
  packaging_pct?: number;
  labor_pct: number;
  delivery_sub_pct?: number;
  marketing_pct?: number;
  maintenance_pct?: number;
  ops_pct: number;
  profit_pct: number;
  material_amount: number;
  packaging_amount?: number;
  labor_amount: number;
  delivery_sub_amount?: number;
  marketing_amount?: number;
  maintenance_amount?: number;
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
  pool_type: PoolType | string;
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

export type PoolType = 
  | 'MATERIAL' 
  | 'PACKAGING_BILLS' 
  | 'LABOR' 
  | 'DELIVERY' 
  | 'MARKETING' 
  | 'MAINTENANCE' 
  | 'PROFIT' 
  | 'OPS';

export interface PoolConfigItem {
  label: string; 
  labelPublic: string; 
  color: string; 
  bgColor: string; 
  borderColor: string; 
  icon: string;
  defaultPct: number;
  description: string;
}

export const POOL_CONFIG: Record<PoolType, PoolConfigItem> = {
  MATERIAL: { 
    label: 'กองทุนวัตถุดิบ', 
    labelPublic: 'ต้นทุนการผลิต', 
    color: '#10b981', 
    bgColor: 'rgba(16,185,129,0.08)', 
    borderColor: 'rgba(16,185,129,0.25)', 
    icon: '🟢',
    defaultPct: 40,
    description: '40% งบวัตถุดิบ (อกไก่, ผัก, ข้าวไรซ์เบอร์รี่, เครื่องปรุงคลีน)'
  },
  PACKAGING_BILLS: { 
    label: 'ค่าบิล & ถุงซีล', 
    labelPublic: 'บรรจุภัณฑ์ & ค่าสาธารณูปโภค', 
    color: '#eab308', 
    bgColor: 'rgba(234,179,8,0.08)', 
    borderColor: 'rgba(234,179,8,0.25)', 
    icon: '🟡',
    defaultPct: 10,
    description: '10% คลุมค่าถุงซีล 2 ชั้น + ค่าไฟ + ค่าแก๊ส'
  },
  LABOR: { 
    label: 'ค่าแรงคนทำ', 
    labelPublic: 'สวัสดิการทีมครัว', 
    color: '#3b82f6', 
    bgColor: 'rgba(59,130,246,0.08)', 
    borderColor: 'rgba(59,130,246,0.25)', 
    icon: '🔵',
    defaultPct: 14,
    description: '14% จ่ายคนทำอาหารและทีมเตรียมอาหาร'
  },
  DELIVERY: { 
    label: 'ช่วยค่าส่ง Grab & กองทุนจัดส่ง', 
    labelPublic: 'ค่าจัดส่งเดลิเวอรี่', 
    color: '#f97316', 
    bgColor: 'rgba(249,115,22,0.08)', 
    borderColor: 'rgba(249,115,22,0.25)', 
    icon: '🛵',
    defaultPct: 9,
    description: '9% งบช่วยส่ง Grab ของร้าน (~30-34฿/รอบ) + ค่าส่งที่ลูกค้าจ่ายเพิ่ม'
  },
  MARKETING: { 
    label: 'งบการตลาด (Ads/Content)', 
    labelPublic: 'การตลาดและโฆษณา', 
    color: '#8b5cf6', 
    bgColor: 'rgba(139,92,246,0.08)', 
    borderColor: 'rgba(139,92,246,0.25)', 
    icon: '📢',
    defaultPct: 4,
    description: '4% งบสะสมสำหรับยิงแอด ทำคอนเทนต์ และโปรโมตร้าน'
  },
  MAINTENANCE: { 
    label: 'ทุนสำรอง/ซ่อมบำรุง', 
    labelPublic: 'ทุนสำรองซ่อมบำรุง', 
    color: '#64748b', 
    bgColor: 'rgba(100,116,139,0.08)', 
    borderColor: 'rgba(100,116,139,0.25)', 
    icon: '🛠️',
    defaultPct: 4,
    description: '4% งบสะสมซ่อมบำรุงเครื่องซีล ตู้เย็น และอุปกรณ์ครัว'
  },
  PROFIT: { 
    label: 'กำไรสุทธิเข้ากระเป๋า (19%)', 
    labelPublic: 'กำไรสุทธิธุรกิจ (19%)', 
    color: '#ec4899', 
    bgColor: 'rgba(236,72,153,0.08)', 
    borderColor: 'rgba(236,72,153,0.25)', 
    icon: '🔴',
    defaultPct: 19,
    description: '19% กำไรสุทธิเข้ากระเป๋า'
  },
  OPS: { 
    label: 'ค่าดำเนินการส่วนกลาง (เดิม)', 
    labelPublic: 'ค่าดำเนินการ', 
    color: '#f59e0b', 
    bgColor: 'rgba(245,158,11,0.08)', 
    borderColor: 'rgba(245,158,11,0.25)', 
    icon: '⚡',
    defaultPct: 0,
    description: 'กองทุนเดิมสำหรับบันทึกรายการในอดีต'
  },
};

/**
 * ป้องกัน Runtime Exception กรณี pool_type ใดๆ ในระบบ DB ไม่มีใน POOL_CONFIG
 */
export const getPoolConfig = (poolType: string | undefined): PoolConfigItem => {
  if (poolType && poolType in POOL_CONFIG) {
    return POOL_CONFIG[poolType as PoolType];
  }
  return {
    label: poolType || 'กองทุนทั่วไป',
    labelPublic: poolType || 'กองทุน',
    color: '#94a3b8',
    bgColor: 'rgba(148,163,184,0.08)',
    borderColor: 'rgba(148,163,184,0.25)',
    icon: '💰',
    defaultPct: 0,
    description: 'กองทุนการเงิน'
  };
};
