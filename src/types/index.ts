export type KdsTask = Order;

export interface Order {
  id: string;
  order_id: string;
  menu_name: string;
  created_at: string;
  kitchen_status: string;
  delivery_status: string;
  menu_item_id?: string;
  drop_point?: { name: string } | { name: string }[] | null;
}

// --- Company Master Data ---

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  menu_group: string;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  base_price: number;
  target_cost?: number;
  cost_percentage?: number;
  packaging_cost?: number;
  labor_cost?: number;
  transport_cost?: number;
  overhead_cost?: number;
  description?: string | null;
  image_url: string;
  tags: string[]; 
  is_available: boolean;
  is_out_of_stock?: boolean;
  prep_time_minutes: number;
  sort_order?: number;
  created_at?: string;
  deleted_at?: string | null;
  
  // Joined
  recipe_steps?: RecipeStep[];
  recipe_items?: RecipeItem[];
}

export interface Member {
  id: string;
  full_name: string;
  phone: string;
  line_id?: string;
  line_user_id?: string;
  line_display_name?: string;
  line_picture_url?: string;
  avatar_url?: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  health_goal?: string;
  allergy_notes?: string;
  
  // Demographic & Marketing
  age_range?: string;
  occupation?: string;
  delivery_time?: string;
  preferred_delivery_days?: number[];
  source?: string;
  referral_member_id?: string;
  food_preferences?: string[] | any;
  
  // Address Details
  address?: string;
  sub_district?: string;
  district?: string;
  province?: string;
  postal_code?: string;
  default_address_id?: string;
  
  // Internal
  internal_notes?: string;
  member_status?: string;
  member_type?: 'member' | 'retail';
  tags?: string[];
  total_orders?: number;
  lifetime_value?: number;
  last_order_at?: string;
  created_at?: string;
  updated_at?: string;
  
  // Banning/Blocking
  is_banned?: boolean;
  ban_reason?: string;
  banned_at?: string;
  is_blocked?: boolean;
  blocked_reason?: string;
}

export interface PintoPackage {
  id: string;
  member_id: string;
  package_name: string;
  package_code?: string;
  days_total: number;
  days_remaining: number;
  meals_total: number;
  meals_remaining: number;
  price_paid?: number;
  promotion_id?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  delivery_slot?: string;
  delivery_days?: number[];
  delivery_rounds?: number;
  delivery_rounds_plan?: number[];
  internal_notes?: string;
  created_at?: string;
  updated_at?: string;
  
  buddy_group_id?: string;
  bonus_meals?: number;
  
  // Joined
  members?: Member;
  drop_point?: { name: string } | { name: string }[] | null;
  buddy_group?: { id: string; group_name: string; group_code: string; };
}

// --- Kitchen Planner Data ---

export interface GlobalPlanSlot {
  id: string;
  delivery_date: string;
  meal_type: MealType;
  menu_item_id: string;
  prep_notes?: string;
  
  // Joined
  menu_items?: MenuItem;
}

export interface MemberMealSchedule {
  id: string;
  package_id: string;
  member_id: string;
  delivery_date: string;
  meal_type: 'meal_1' | 'meal_2' | 'meal_3' | 'meal_4' | 'meal_5' | 'meal_6' | 'meal_7' | 'meal_8' | 'meal_9' | 'meal_10' | 'meal_11' | 'meal_12' | 'meal_13' | 'meal_14' | 'meal_15' | 'meal_16' | 'meal_17' | 'meal_18' | 'meal_19' | 'meal_20';
  menu_item_id: string;
  quantity: number;
  box_size: string;
  delivery_time?: string;
  kitchen_status: 'pending' | 'cooking' | 'done';
  notes: string;
  is_extra_order?: boolean;
  meal_order_type?: 'subscription' | 'a-la-carte';
  is_compensatory?: boolean;
  created_at?: string;
  
  // Joined
  menu_items?: MenuItem;
  pinto_packages?: PintoPackage;
  members?: Member;
}

// ── KDS Weekly Planner Types (Added) ──

export type MealType = string;
export type PlanStatus = 'draft' | 'published';

export interface WeeklyPlan {
  id: string;
  week_start: string;       // YYYY-MM-DD (Monday)
  notes: string | null;
  status: PlanStatus;
  created_at: string;
  updated_at: string;
}

export interface PintoMealPlan {
  id: string;
  delivery_date: string;    // YYYY-MM-DD
  meal_type: MealType;      // meal_1 | meal_2
  menu_name: string;
  menu_item_id: string | null;
  is_published: boolean;
  week_plan_id: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
  max_orders: number | null;
  current_orders: number;
  prep_notes: string | null;
  description: string | null;
  menu_item?: MenuItem;
}

export const DAY_LABELS = ['จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์'];
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  meal_1: 'มื้อที่ 1',
  meal_2: 'มื้อที่ 2',
  meal_3: 'มื้อที่ 3',
  meal_4: 'มื้อที่ 4',
  meal_5: 'มื้อที่ 5',
  meal_6: 'มื้อที่ 6',
};
export const MEAL_TYPES: MealType[] = ['meal_1', 'meal_2', 'meal_3', 'meal_4', 'meal_5', 'meal_6'];

export const CATEGORY_COLORS: Record<string, string> = {
  'main':       '#4ade80',
  'protein':    '#a78bfa',
  'noodle':     '#60a5fa',
  'curry':      '#f59e0b',
  'dessert':    '#f87171',
  'supplement': '#34d399',
};

// --- Inventory System Types ---

export interface InventoryItem {
  id: string;
  name: string;
  storage_unit: string;
  category: string;
  current_stock: number;
  min_stock_level: number;
  avg_unit_cost: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeItem {
  id: string;
  menu_item_id: string;
  menu_name: string;
  item_id: string;
  quantity_required: number;
  yield_percentage: number;
  created_at: string;
  deleted_at?: string | null;
  
  // Joined fields
  item_name?: string;
  storage_unit?: string;
  avg_unit_cost?: number;
  category?: string;
}

export interface RecipeStep {
  id: string;
  menu_item_id: string;
  step_number: number;
  instruction: string;
  time_minutes: number;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface InventoryBatch {
  id: string;
  inventory_item_id: string;
  location_id: string | null;
  qty: number;
  unit_cost: number;
  purchase_unit: string | null;
  purchase_qty: number | null;
  receipt_no: string | null;
  supplier_id: string | null;
  received_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
}

export interface UnitConversion {
  id: string;
  item_id: string;
  from_unit: string;
  to_unit: string;
  conversion_factor: number;
  created_at: string;
}

export interface InventoryLocation {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InventoryAdjustment {
  id: string;
  item_id: string;
  location_id: string | null;
  expected_qty: number;
  actual_qty: number;
  discrepancy: number;
  reason: string | null;
  adjusted_by?: string;
  created_at: string;
}

// --- Production Order Types (Kitchen Depth) ---

export interface ProductionOrder {
  id: string;
  tenant_id: string;
  production_date: string;
  shift: 'morning' | 'evening';
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  total_items: number;
  total_produced: number;
  total_waste: number;
  stock_deducted: boolean;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  items?: ProductionOrderItem[];
  creator?: { full_name: string };
}

export interface ProductionOrderItem {
  id: string;
  tenant_id: string;
  production_order_id: string;
  menu_item_id: string;
  planned_qty: number;
  actual_qty: number;
  waste_qty: number;
  yield_percentage: number;
  notes?: string;
  status: 'pending' | 'cooking' | 'done' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  created_at: string;
  // Joined
  menu_items?: MenuItem;
}

export interface StockDeduction {
  id: string;
  tenant_id: string;
  production_order_id: string;
  production_order_item_id?: string;
  inventory_item_id: string;
  recipe_id?: string;
  qty_deducted: number;
  unit: string;
  unit_cost_at_deduction: number;
  total_cost: number;
  deducted_by?: string;
  deducted_at: string;
  reversed: boolean;
}

export interface FoodSafetyLogEntry {
  id: string;
  tenant_id: string;
  log_date: string;
  log_time: string;
  category: string;
  location?: string;
  check_item: string;
  reading_value?: number;
  reading_unit: string;
  min_acceptable?: number;
  max_acceptable?: number;
  is_pass: boolean;
  corrective_action?: string;
  photo_url?: string;
  checked_by: string;
  verified_by?: string;
  notes?: string;
  created_at: string;
  // Joined
  checker?: { full_name: string };
}

export interface DemandForecast {
  id: string;
  tenant_id: string;
  forecast_date: string;
  menu_item_id?: string;
  inventory_item_id?: string;
  forecast_qty: number;
  confidence_score: number;
  source: string;
  actual_qty?: number;
  variance?: number;
}

// --- Procurement Types ---

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  po_number: string;
  supplier_id: string;
  status: 'draft' | 'submitted' | 'confirmed' | 'partial_received' | 'received' | 'cancelled';
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total_amount: number;
  payment_terms: string;
  payment_status: string;
  paid_amount: number;
  notes?: string;
  internal_notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  inventory_item_id: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_pct: number;
  amount: number;
  received_qty: number;
  remaining_qty: number;
  notes?: string;
  // Joined
  inventory_item?: InventoryItem;
}

export interface GoodsReceipt {
  id: string;
  tenant_id: string;
  gr_number: string;
  purchase_order_id?: string;
  supplier_id: string;
  receipt_date: string;
  status: string;
  total_amount: number;
  invoice_number?: string;
  received_by: string;
  confirmed_by?: string;
  confirmed_at?: string;
  notes?: string;
  created_at: string;
  // Joined
  supplier?: Supplier;
  purchase_order?: PurchaseOrder;
}

export interface GoodsReceiptItem {
  id: string;
  tenant_id: string;
  goods_receipt_id: string;
  inventory_item_id: string;
  po_item_id?: string;
  received_qty: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  expiry_date?: string;
  batch_number?: string;
  location_id?: string;
  quality_status: 'accepted' | 'rejected' | 'quarantine';
  rejection_reason?: string;
  // Joined
  inventory_item?: InventoryItem;
}

export interface SupplierPriceList {
  id: string;
  tenant_id: string;
  supplier_id: string;
  inventory_item_id: string;
  unit: string;
  unit_price: number;
  min_order_qty: number;
  lead_time_days: number;
  valid_from: string;
  valid_until?: string;
  is_preferred: boolean;
  last_purchase_price: number;
  last_purchase_date?: string;
  avg_price_3m: number;
  // Joined
  supplier?: Supplier;
  inventory_item?: InventoryItem;
}

// --- Accounting Types ---

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  invoice_type: 'receipt' | 'tax_invoice' | 'tax_invoice_full' | 'quotation' | 'billing_note' | 'credit_note';
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'voided';
  member_id?: string;
  customer_name: string;
  customer_address?: string;
  customer_tax_id?: string;
  customer_phone?: string;
  subtotal: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  withholding_tax_rate: number;
  withholding_tax_amount: number;
  total_amount: number;
  payment_method?: string;
  issue_date: string;
  due_date?: string;
  notes?: string;
  pdf_url?: string;
  created_by?: string;
  created_at: string;
  // Joined
  member?: Member;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  tenant_id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount: number;
  amount: number;
  sort_order: number;
}

export interface PLSnapshot {
  id: string;
  tenant_id: string;
  period_year: number;
  period_month: number;
  period_type: string;
  revenue_subscription: number;
  revenue_retail: number;
  revenue_addon: number;
  revenue_delivery_fee: number;
  revenue_other: number;
  total_revenue: number;
  cogs_material: number;
  cogs_packaging: number;
  cogs_other: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  opex_labor: number;
  opex_delivery: number;
  opex_rent: number;
  opex_utilities: number;
  opex_marketing: number;
  opex_other: number;
  total_opex: number;
  net_income: number;
  net_margin_pct: number;
  is_finalized: boolean;
}

export interface CashReconciliationEntry {
  id: string;
  tenant_id: string;
  reconciliation_date: string;
  pool_type: string;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  expected_balance: number;
  actual_balance: number;
  variance: number;
  variance_reason?: string;
  status: string;
  counted_by: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
}

// --- CRM Types ---

export interface ChurnScore {
  id: string;
  tenant_id: string;
  member_id: string;
  score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  days_since_last_order: number;
  order_frequency_30d: number;
  order_frequency_90d: number;
  avg_order_value: number;
  streak_current: number;
  total_lifetime_value: number;
  package_status?: string;
  calculated_at: string;
  // Joined
  member?: Member;
}

export interface MenuPreference {
  id: string;
  tenant_id: string;
  member_id: string;
  preference_type: string;
  preference_value: string;
  preference_level: 'love' | 'like' | 'neutral' | 'dislike' | 'allergic';
  source: string;
  confidence: number;
  order_count: number;
}

// --- Delivery Route Types ---

export interface DeliveryRoute {
  id: string;
  tenant_id: string;
  route_date: string;
  shift: string;
  rider_id: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  total_stops: number;
  total_distance_km: number;
  estimated_duration_minutes: number;
  actual_duration_minutes?: number;
  optimization_method: string;
  // Joined
  rider?: { full_name: string; nickname?: string };
  stops?: DeliveryRouteStop[];
}

export interface DeliveryRouteStop {
  id: string;
  tenant_id: string;
  route_id: string;
  stop_order: number;
  delivery_id?: string;
  member_id?: string;
  address?: string;
  lat?: number;
  lng?: number;
  distance_from_prev_km: number;
  status: string;
  // Joined
  member?: Member;
}
