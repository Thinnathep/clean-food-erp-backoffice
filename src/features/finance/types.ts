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

export interface StandardPackageSplit {
  id: string;
  name: string;
  code: string;
  price: number;
  meals: number;
  rounds: number;
  days: number;
  type: 'PINTO' | 'RETAIL';
  subsidyPerRound: number;
  tag: string;
  desc: string;
  splitPct: {
    material: number;
    packaging: number;
    labor: number;
    deliverySub: number;
    marketing: number;
    maintenance: number;
    profit: number;
  };
  splitAmount: {
    material: number;
    packaging: number;
    labor: number;
    deliverySub: number;
    marketing: number;
    maintenance: number;
    profit: number;
  };
}

export const STANDARD_7FUND_PACKAGES: StandardPackageSplit[] = [
  {
    id: 'pinto_7d',
    name: 'ผูกปิ่นโต 7 วัน (15 มื้อ)',
    code: 'PINTO999',
    price: 999,
    meals: 15,
    rounds: 3,
    days: 7,
    type: 'PINTO',
    subsidyPerRound: 35,
    tag: 'ทดลองทาน 7 วัน',
    desc: 'จัดส่ง 3 รอบ (35฿ x 3 = 105฿) | วัตถุดิบ 40% (400฿) | กำไรสุทธิ 17% (174฿)',
    splitPct: {
      material: 40,
      packaging: 10,
      labor: 14,
      deliverySub: 11,
      marketing: 4,
      maintenance: 4,
      profit: 17
    },
    splitAmount: {
      material: 400,
      packaging: 100,
      labor: 140,
      deliverySub: 105,
      marketing: 40,
      maintenance: 40,
      profit: 174
    }
  },
  {
    id: 'pinto_14d',
    name: 'ผูกปิ่นโต 14 วัน (30 มื้อ)',
    code: 'PINTO1899',
    price: 1899,
    meals: 30,
    rounds: 5,
    days: 14,
    type: 'PINTO',
    subsidyPerRound: 35,
    tag: 'ยอดนิยม 🔥',
    desc: 'จัดส่ง 5 รอบ (35฿ x 5 = 175฿) | วัตถุดิบ 40% (760฿) | กำไรสุทธิ 19% (356฿)',
    splitPct: {
      material: 40,
      packaging: 10,
      labor: 14,
      deliverySub: 9,
      marketing: 4,
      maintenance: 4,
      profit: 19
    },
    splitAmount: {
      material: 760,
      packaging: 190,
      labor: 266,
      deliverySub: 175,
      marketing: 76,
      maintenance: 76,
      profit: 356
    }
  },
  {
    id: 'pinto_30d',
    name: 'ผูกปิ่นโต 1 เดือน (63 มื้อ)',
    code: 'PINTO3999',
    price: 3999,
    meals: 63,
    rounds: 11,
    days: 30,
    type: 'PINTO',
    subsidyPerRound: 35,
    tag: 'สุดคุ้ม ⭐️',
    desc: 'จัดส่ง 11 รอบ (35฿ x 11 = 385฿) | วัตถุดิบ 40% (1,600฿) | กำไรสุทธิ 18% (734฿)',
    splitPct: {
      material: 40,
      packaging: 10,
      labor: 14,
      deliverySub: 10,
      marketing: 4,
      maintenance: 4,
      profit: 18
    },
    splitAmount: {
      material: 1600,
      packaging: 400,
      labor: 560,
      deliverySub: 385,
      marketing: 160,
      maintenance: 160,
      profit: 734
    }
  },
  {
    id: 'pack_4box',
    name: 'แพ็ค 4 กล่อง (299.-)',
    code: 'PACK299',
    price: 299,
    meals: 4,
    rounds: 1,
    days: 1,
    type: 'RETAIL',
    subsidyPerRound: 35,
    tag: 'โปร 4 กล่อง',
    desc: 'ส่งรอบเดียว ช่วยค่าส่ง Grab 35฿ (12%) | วัตถุดิบ 40% (120฿) | กำไรสุทธิ 16% (48฿)',
    splitPct: {
      material: 40,
      packaging: 10,
      labor: 14,
      deliverySub: 12,
      marketing: 4,
      maintenance: 4,
      profit: 16
    },
    splitAmount: {
      material: 120,
      packaging: 30,
      labor: 42,
      deliverySub: 35,
      marketing: 12,
      maintenance: 12,
      profit: 48
    }
  },
  {
    id: 'pack_6box',
    name: 'แพ็ค 6 กล่อง (399.-)',
    code: 'PACK399',
    price: 399,
    meals: 6,
    rounds: 1,
    days: 1,
    type: 'RETAIL',
    subsidyPerRound: 35,
    tag: 'โปร 6 กล่อง',
    desc: 'ส่งรอบเดียว ช่วยค่าส่ง Grab 35฿ (9%) | วัตถุดิบ 40% (160฿) | กำไรสุทธิ 19% (76฿)',
    splitPct: {
      material: 40,
      packaging: 10,
      labor: 14,
      deliverySub: 9,
      marketing: 4,
      maintenance: 4,
      profit: 19
    },
    splitAmount: {
      material: 160,
      packaging: 40,
      labor: 56,
      deliverySub: 35,
      marketing: 16,
      maintenance: 16,
      profit: 76
    }
  },
  {
    id: 'pack_7box',
    name: 'แพ็ค 7 กล่อง (459.-)',
    code: 'PACK459',
    price: 459,
    meals: 7,
    rounds: 1,
    days: 1,
    type: 'RETAIL',
    subsidyPerRound: 35,
    tag: 'โปร 7 กล่อง',
    desc: 'ส่งรอบเดียว ช่วยค่าส่ง Grab 35฿ (8%) | วัตถุดิบ 40% (184฿) | กำไรสุทธิ 20% (94฿)',
    splitPct: {
      material: 40,
      packaging: 10,
      labor: 14,
      deliverySub: 8,
      marketing: 4,
      maintenance: 4,
      profit: 20
    },
    splitAmount: {
      material: 184,
      packaging: 46,
      labor: 64,
      deliverySub: 35,
      marketing: 18,
      maintenance: 18,
      profit: 94
    }
  }
];

