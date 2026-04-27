import { supabase } from '../../config/supabase';
import { dayjs, toISO } from '../../lib/dateUtils';
import type { KdsTask, MenuItem, PintoPackage, GlobalPlanSlot, MemberMealSchedule, Member, MealType, WeeklyPlan, PintoMealPlan } from '../../types';

// --- Legacy KDS Live Orders (Unchanged for now) ---
export const fetchActiveKdsTasks = async (): Promise<KdsTask[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_id, menu_name, created_at, kitchen_status, delivery_status')
    .eq('kitchen_status', 'ยืนยันแล้ว')
    .neq('delivery_status', 'ส่งเรียบร้อย')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data as KdsTask[];
};

export const finishKdsTask = async (orderUuid: string): Promise<void> => {
  const { error } = await supabase
    .from('orders')
    .update({ kitchen_status: 'เสร็จสิ้น', delivery_status: 'รอส่ง' })
    .eq('id', orderUuid);

  if (error) throw new Error(error.message);
};

// --- Master Menu (Updated for Planner) ---
export const fetchMenuItems = async (): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, category, description, image_url, calories, protein, carbs, fat, base_price, is_available, tags, menu_group, prep_time_minutes')
    .eq('is_available', true)
    .is('deleted_at', null)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data as MenuItem[];
};

export const createMenuItem = async (menuItem: Omit<MenuItem, 'id'>): Promise<MenuItem> => {
  const { data, error } = await supabase
    .from('menu_items')
    .insert([menuItem])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as MenuItem;
};

export const uploadMenuImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('menu-images')
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from('menu-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const updateMenuItem = async (id: string, updates: Partial<MenuItem>): Promise<MenuItem> => {
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as MenuItem;
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// --- Global Weekly Planner (pinto_meal_plan) ---
export const fetchGlobalPlanSlots = async (startDate: string, endDate: string): Promise<GlobalPlanSlot[]> => {
  const { data, error } = await supabase
    .from('pinto_meal_plan')
    .select(`
      id, delivery_date, meal_type, menu_item_id,
      menu_items (id, name, category, protein, calories, image_url, tags)
    `)
    .gte('delivery_date', startDate)
    .lte('delivery_date', endDate);

  if (error) {
     // If column meal_type doesn't exist, it means user hasn't run the SQL. 
     // We will handle this gracefully in the UI.
     return [];
  }
  return data as unknown as GlobalPlanSlot[];
};

export const upsertGlobalPlanSlot = async (delivery_date: string, meal_type: 'meal_1' | 'meal_2', menu_item_id: string): Promise<void> => {
  // First check if slot exists (since we dropped unique constraint on delivery_date, we query by date AND meal_type)
  const { data: existing } = await supabase
    .from('pinto_meal_plan')
    .select('id')
    .eq('delivery_date', delivery_date)
    .eq('meal_type', meal_type)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('pinto_meal_plan')
      .update({ menu_item_id, menu_name: 'Mapped from UI' }) // menu_name is NOT NULL in legacy schema
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('pinto_meal_plan')
      .insert({ delivery_date, meal_type, menu_item_id, menu_name: 'Mapped from UI' });
    if (error) throw new Error(error.message);
  }
};

export const deleteGlobalPlanSlot = async (delivery_date: string, meal_type: 'meal_1' | 'meal_2'): Promise<void> => {
  const { error } = await supabase
    .from('pinto_meal_plan')
    .delete()
    .eq('delivery_date', delivery_date)
    .eq('meal_type', meal_type);

  if (error) throw new Error(error.message);
};

// --- Member Specific Planner ---

export const fetchActivePackages = async (): Promise<PintoPackage[]> => {
  const { data, error } = await supabase
    .from('pinto_packages')
    .select(`
      id, member_id, package_name, days_total, days_remaining, meals_total, meals_remaining, start_date, end_date, status,
      members!pinto_packages_member_id_fkey (
        id, full_name, phone, line_id, avatar_url, date_of_birth, gender, 
        health_goal, allergy_notes, internal_notes, tags, source,
        age_range, zone, address, sub_district, district, province, postal_code, food_preferences
      )
    `)
    .eq('status', 'active');

  if (error) throw new Error(error.message);
  return data as unknown as PintoPackage[];
};

export const decrementMealsRemaining = async (packageId: string, amount: number): Promise<void> => {
  // We use rpc if available, or fetch-then-update for simplicity here
  const { data: pkg, error: fetchError } = await supabase
    .from('pinto_packages')
    .select('meals_remaining')
    .eq('id', packageId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const newCount = Math.max(0, (pkg.meals_remaining || 0) - amount);

  const { error: updateError } = await supabase
    .from('pinto_packages')
    .update({ meals_remaining: newCount })
    .eq('id', packageId);

  if (updateError) throw new Error(updateError.message);
};

export const fetchMemberSchedules = async (startDate: string, endDate: string, packageId?: string): Promise<MemberMealSchedule[]> => {
  let query = supabase
    .from('erp_member_meal_schedules')
    .select(`
      id, package_id, member_id, delivery_date, meal_type, menu_item_id, quantity, box_size, delivery_time, kitchen_status, notes,
      menu_items (id, name, category, protein, calories, image_url, tags),
      pinto_packages (id, package_name, meals_remaining),
      members!erp_member_meal_schedules_member_id_fkey (id, full_name, phone)
    `)
    .gte('delivery_date', startDate)
    .lte('delivery_date', endDate);

  if (packageId) {
    query = query.eq('package_id', packageId);
  }

  const { data, error } = await query;
  if (error) {
     console.error("fetchMemberSchedules error:", error.message);
     return [];
  }
  return data as unknown as MemberMealSchedule[];
};

export const upsertMemberSchedule = async (
  scheduleId: string | null,
  package_id: string, 
  member_id: string, 
  delivery_date: string, 
  meal_type: string, 
  menu_item_id: string,
  quantity: number = 1,
  delivery_time: string = '',
  notes: string = ''
): Promise<void> => {
  if (scheduleId) {
    // Update existing
    const { error } = await supabase
      .from('erp_member_meal_schedules')
      .update({ menu_item_id, quantity, delivery_time, notes })
      .eq('id', scheduleId);
    if (error) throw new Error(error.message);
  } else {
    // Insert new
    const { error } = await supabase
      .from('erp_member_meal_schedules')
      .insert({ package_id, member_id, delivery_date, meal_type, menu_item_id, quantity, delivery_time, notes });
    if (error) throw new Error(error.message);
  }
};

export const removeMemberSchedule = async (scheduleId: string): Promise<void> => {
  const { error } = await supabase
    .from('erp_member_meal_schedules')
    .delete()
    .eq('id', scheduleId);
  if (error) throw new Error(error.message);
};

export const updateMemberScheduleNote = async (scheduleId: string, notes: string): Promise<void> => {
   const { error } = await supabase
     .from('erp_member_meal_schedules')
     .update({ notes })
     .eq('id', scheduleId);
   if (error) throw new Error(error.message);
};

export const updateMemberProfile = async (memberId: string, updates: Partial<Member>): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', memberId);

  if (error) throw new Error(error.message);
};

export const createMember = async (member: Omit<Member, 'id'>): Promise<Member> => {
  const { data, error } = await supabase
    .from('members')
    .insert([member])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Member;
};

export const fetchMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Member[];
};

export const createPintoPackage = async (pkg: Omit<PintoPackage, 'id'>): Promise<PintoPackage> => {
  const { data, error } = await supabase
    .from('pinto_packages')
    .insert([pkg])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PintoPackage;
};

// ── KDS Weekly Planner API (Added) ──

export async function fetchWeeklyPlan(weekStart: string): Promise<WeeklyPlan | null> {
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error) throw error;
  return data as WeeklyPlan | null;
}

export async function upsertWeeklyPlan(weekStart: string, notes?: string): Promise<WeeklyPlan> {
  const { data, error } = await supabase
    .from('weekly_plans')
    .upsert(
      { week_start: weekStart, notes: notes ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'week_start' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as WeeklyPlan;
}

export async function fetchMealPlanForWeek(weekStart: string): Promise<PintoMealPlan[]> {
  const weekEnd = toISO(dayjs(weekStart).add(6, 'day'));
  const { data, error } = await supabase
    .from('pinto_meal_plan')
    .select('*, menu_item:menu_items(id, name, category, calories, protein, carbs, fat, base_price, tags, prep_time_minutes, menu_group)')
    .gte('delivery_date', weekStart)
    .lte('delivery_date', weekEnd)
    .order('delivery_date')
    .order('meal_type');
  if (error) throw error;
  return data as unknown as PintoMealPlan[];
}

export async function upsertMealSlot(payload: {
  delivery_date: string;
  meal_type: MealType;
  menu_item_id: string;
  menu_name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  price?: number;
  week_plan_id?: string | null;
  prep_notes?: string | null;
}): Promise<PintoMealPlan> {
  const { data: existing } = await supabase
    .from('pinto_meal_plan')
    .select('id')
    .eq('delivery_date', payload.delivery_date)
    .eq('meal_type', payload.meal_type)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from('pinto_meal_plan')
      .update({
        menu_item_id: payload.menu_item_id,
        menu_name: payload.menu_name,
        calories: payload.calories ?? 0,
        protein: payload.protein ?? 0,
        carbs: payload.carbs ?? 0,
        fat: payload.fat ?? 0,
        price: payload.price ?? 0,
        week_plan_id: payload.week_plan_id ?? null,
        prep_notes: payload.prep_notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*, menu_item:menu_items(id, name, category, calories, protein, carbs, fat, base_price, tags, prep_time_minutes, menu_group)')
      .single();
    if (error) throw error;
    return data as unknown as PintoMealPlan;
  } else {
    const { data, error } = await supabase
      .from('pinto_meal_plan')
      .insert({
        delivery_date: payload.delivery_date,
        meal_type: payload.meal_type,
        menu_item_id: payload.menu_item_id,
        menu_name: payload.menu_name,
        calories: payload.calories ?? 0,
        protein: payload.protein ?? 0,
        carbs: payload.carbs ?? 0,
        fat: payload.fat ?? 0,
        price: payload.price ?? 0,
        week_plan_id: payload.week_plan_id ?? null,
        prep_notes: payload.prep_notes ?? null,
        is_published: false,
      })
      .select('*, menu_item:menu_items(id, name, category, calories, protein, carbs, fat, base_price, tags, prep_time_minutes, menu_group)')
      .single();
    if (error) throw error;
    return data as unknown as PintoMealPlan;
  }
}

export async function clearMealSlot(deliveryDate: string, mealType: MealType): Promise<void> {
  const { error } = await supabase
    .from('pinto_meal_plan')
    .delete()
    .eq('delivery_date', deliveryDate)
    .eq('meal_type', mealType);
  if (error) throw error;
}

export async function publishWeekMeals(weekStart: string, weekPlanId: string): Promise<void> {
  const weekEnd = toISO(dayjs(weekStart).add(6, 'day'));
  const { error: mealError } = await supabase
    .from('pinto_meal_plan')
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .gte('delivery_date', weekStart)
    .lte('delivery_date', weekEnd)
    .not('menu_item_id', 'is', null);
  if (mealError) throw mealError;

  const { error: planError } = await supabase
    .from('weekly_plans')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', weekPlanId);
  if (planError) throw planError;
}

export async function unpublishWeekMeals(weekStart: string, weekPlanId: string): Promise<void> {
  const weekEnd = toISO(dayjs(weekStart).add(6, 'day'));
  await supabase
    .from('pinto_meal_plan')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .gte('delivery_date', weekStart)
    .lte('delivery_date', weekEnd);
  await supabase
    .from('weekly_plans')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', weekPlanId);
}

export async function fetchTodayMeals(): Promise<PintoMealPlan[]> {
  const today = toISO(dayjs());
  const { data, error } = await supabase
    .from('pinto_meal_plan')
    .select('*, menu_item:menu_items(id, name, category, calories, protein, carbs, fat, prep_time_minutes)')
    .eq('delivery_date', today)
    .order('meal_type');
  if (error) throw error;
  return data as unknown as PintoMealPlan[];
}
