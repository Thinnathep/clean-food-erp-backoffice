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
  pool_type: 'MATERIAL' | 'LABOR' | 'OPS' | 'PROFIT';
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
  pool_type: 'MATERIAL' | 'LABOR' | 'OPS' | 'PROFIT';
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

export type PoolType = 'MATERIAL' | 'LABOR' | 'OPS' | 'PROFIT';

export const POOL_CONFIG: Record<PoolType, { label: string; labelPublic: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
  MATERIAL: { label: 'ทุนวัตถุดิบ', labelPublic: 'ต้นทุนการผลิต', color: '#22c55e', bgColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)', icon: '🟢' },
  LABOR:    { label: 'ค่าแรง/สวัสดิการ', labelPublic: 'สวัสดิการทีม', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)', icon: '🔵' },
  OPS:      { label: 'ค่าดำเนินการ', labelPublic: 'ค่าดำเนินการ', color: '#eab308', bgColor: 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.3)', icon: '🟡' },
  PROFIT:   { label: 'กำไรสุทธิ', labelPublic: 'สำรองธุรกิจ', color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', icon: '🔴' },
};
