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
  menu_group: 'pinto' | 'standard' | 'special';
  protein: number;
  calories: number;
  image_url: string;
  // We map protein_type locally for UI if needed, but in DB it's inferred or tags
  tags: string[]; 
  is_available: boolean;
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
  zone?: string;
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
