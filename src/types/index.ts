export type KdsTask = Order;

export interface Order {
  id: string;
  order_id: string;
  menu_name: string;
  created_at: string;
  kitchen_status: string;
  delivery_status: string;
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
  base_price: number;
  description?: string | null;
  image_url: string;
  tags: string[]; 
  is_available: boolean;
  prep_time_minutes: number;
}

export interface Member {
  id: string;
  full_name: string;
  phone: string;
  line_id?: string;
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
  source?: string;
  food_preferences?: string[];
  
  // Address Details
  address?: string;
  sub_district?: string;
  district?: string;
  province?: string;
  postal_code?: string;
  
  // Internal
  internal_notes?: string;
  member_status?: string;
  member_type?: 'member' | 'retail';
  tags?: string[];
  total_orders?: number;
  lifetime_value?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PintoPackage {
  id: string;
  member_id: string;
  package_name: string;
  days_total: number;
  days_remaining: number;
  meals_total: number;
  meals_remaining: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  delivery_slot?: string;
  internal_notes?: string;
  created_at?: string;
  updated_at?: string;
  
  // Joined
  members?: Member;
}

// --- Kitchen Planner Data ---

export interface GlobalPlanSlot {
  id: string;
  delivery_date: string;
  meal_type: 'meal_1' | 'meal_2';
  menu_item_id: string;
  
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
  created_at?: string;
  
  // Joined
  menu_items?: MenuItem;
  pinto_packages?: PintoPackage;
  members?: Member;
}

// ── KDS Weekly Planner Types (Added) ──

export type MealType = 'meal_1' | 'meal_2';
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
};
export const MEAL_TYPES: MealType[] = ['meal_1', 'meal_2'];

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
}

export interface InventoryBatch {
  id: string;
  inventory_item_id: string;
  qty: number;
  unit_cost: number;
  receipt_no?: string;
  supplier_id?: string;
  received_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}
