import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { toast } from 'sonner';

export interface Rider {
  id: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  role: 'ADMIN' | 'RIDER' | 'KITCHEN' | 'MANAGER';
  nickname?: string;
  bank_account?: string;
  bank_name?: string;
  daily_rate?: number;
  avatar_url?: string; // We'll use a fallback if not present
}

export interface Delivery {
  id: string;
  order_id: string;
  rider_id: string;
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  rider_earnings: number;
  delivery_address: string;
  completed_at?: string;
  created_at: string;
  fail_reason?: string;
  rider?: Rider;
}

interface LogisticsState {
  deliveries: Delivery[];
  riders: Rider[];
  isLoading: boolean;
  error: string | null;

  loadLogisticsData: () => Promise<void>;
  syncDeliveries: () => Promise<void>;
  updateDeliveryStatus: (id: string, status: Delivery['status'], notes?: string) => Promise<void>;
  assignRider: (deliveryId: string, riderId: string) => Promise<void>;
  addRider: (rider: Omit<Rider, 'id' | 'role'>) => Promise<void>;
}

export const useLogisticsStore = create<LogisticsState>((set, get) => ({
  deliveries: [],
  riders: [],
  isLoading: false,
  error: null,

  loadLogisticsData: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Load Riders
      const { data: ridersData, error: ridersError } = await supabase
        .from('erp_staff')
        .select('*')
        .eq('role', 'RIDER')
        .eq('is_active', true);
      
      if (ridersError) throw ridersError;

      // Load Deliveries for today
      const today = new Date().toISOString().split('T')[0];
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('erp_deliveries')
        .select(`
          *,
          rider:erp_staff(*)
        `)
        .gte('created_at', today);
      
      if (deliveriesError) throw deliveriesError;

      set({ 
        riders: ridersData as Rider[], 
        deliveries: deliveriesData as Delivery[], 
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      toast.error('โหลดข้อมูล Logistics ไม่สำเร็จ');
    }
  },

  syncDeliveries: async () => {
    try {
      set({ isLoading: true });
      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch today's meal schedules
      const { data: schedules, error: schedError } = await supabase
        .from('erp_member_meal_schedules')
        .select(`
          id, member_id, delivery_time,
          pinto_packages(assigned_rider_id),
          members(full_name, address, sub_district, district, province)
        `)
        .eq('delivery_date', today);

      if (schedError) throw schedError;

      // 2. Fetch today's retail orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          order_id, customer_id, delivery_address, kitchen_status
        `)
        .eq('delivery_date', today); // Assuming delivery_date column exists or using created_at

      if (ordersError) throw ordersError;

      // 3. Get existing delivery IDs to avoid duplicates (Audit fix: Check all, not just today's created)
      const { data: existingDeliveries } = await supabase
        .from('erp_deliveries')
        .select('schedule_id, order_id')
        .not('status', 'eq', 'CANCELLED'); // Don't count cancelled as existing if we want to re-sync

      const existingSchedIds = new Set(existingDeliveries?.map(d => d.schedule_id).filter(Boolean));
      const existingOrderIds = new Set(existingDeliveries?.map(d => d.order_id).filter(Boolean));

      const newDeliveries = [];
      const unassignedCount = { schedules: 0, orders: 0 };

      // Process schedules
      for (const s of (schedules || [])) {
        if (!existingSchedIds.has(s.id)) {
          const memberData = s.members as any;
          const member = Array.isArray(memberData) ? memberData[0] : memberData;
          const pkgData = s.pinto_packages as any;
          const pkg = Array.isArray(pkgData) ? pkgData[0] : pkgData;

          const riderId = pkg?.assigned_rider_id;
          
          // rider_id is NOT NULL in DB — skip if no rider assigned yet
          if (!riderId) {
            unassignedCount.schedules++;
            continue;
          }

          const address = member ? `${member.address || ''} ${member.sub_district || ''} ${member.district || ''} ${member.province || ''}`.trim() : 'ไม่ระบุที่อยู่';
          newDeliveries.push({
            schedule_id: s.id,
            member_id: s.member_id,
            order_id: `SCHED-${s.id.slice(0, 8)}`,
            delivery_address: address || 'ไม่ระบุที่อยู่',
            rider_id: riderId,
            status: 'ASSIGNED',
            rider_earnings: 45
          });
        }
      }

      // Process retail orders — these also need a rider
      for (const o of (orders || [])) {
        if (!existingOrderIds.has(o.order_id)) {
          // Retail orders don't have pre-assigned riders — skip for now
          unassignedCount.orders++;
        }
      }

      if (newDeliveries.length > 0) {
        const { error: insertError } = await supabase
          .from('erp_deliveries')
          .insert(newDeliveries);
        
        if (insertError) throw insertError;
        
        let msg = `ซิงค์สำเร็จ เพิ่ม ${newDeliveries.length} งานส่ง`;
        if (unassignedCount.schedules > 0) {
          msg += ` (${unassignedCount.schedules} รายการยังไม่มีไรเดอร์)`;
        }
        toast.success(msg);
      } else if (unassignedCount.schedules > 0 || unassignedCount.orders > 0) {
        toast.info(`มี ${unassignedCount.schedules + unassignedCount.orders} รายการที่ยังไม่ได้มอบหมายไรเดอร์ — กรุณาเพิ่มไรเดอร์ในแพ็กเกจก่อน`);
      } else {
        toast.info('ข้อมูลการส่งเป็นปัจจุบันอยู่แล้ว');
      }

      await get().loadLogisticsData();
    } catch (error: any) {
      console.error(error);
      toast.error('ซิงค์ข้อมูลไม่สำเร็จ: ' + error.message);
    } finally {
      set({ isLoading: false });
    }
  },

  updateDeliveryStatus: async (id, status, notes) => {
    try {
      set({ isLoading: true });
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'COMPLETED') updates.completed_at = new Date().toISOString();
      if (status === 'FAILED') updates.fail_reason = notes;

      const { error } = await supabase
        .from('erp_deliveries')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await get().loadLogisticsData();
      toast.success('อัปเดตสถานะการส่งเรียบร้อย');
    } catch (error: any) {
      toast.error('อัปเดตสถานะไม่สำเร็จ');
    } finally {
      set({ isLoading: false });
    }
  },

  assignRider: async (deliveryId, riderId) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase
        .from('erp_deliveries')
        .update({ rider_id: riderId, status: 'ASSIGNED' })
        .eq('id', deliveryId);

      if (error) throw error;
      await get().loadLogisticsData();
      toast.success('มอบหมายงานให้ไรเดอร์เรียบร้อย');
    } catch (error: any) {
      toast.error('มอบหมายงานไม่สำเร็จ');
    } finally {
      set({ isLoading: false });
    }
  },

  addRider: async (riderData) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase
        .from('erp_staff')
        .insert({ ...riderData, role: 'RIDER', is_active: true });

      if (error) throw error;
      await get().loadLogisticsData();
      toast.success('ลงทะเบียนไรเดอร์ใหม่เรียบร้อย');
    } catch (error: any) {
      toast.error('ลงทะเบียนไม่สำเร็จ');
    } finally {
      set({ isLoading: false });
    }
  }
}));
