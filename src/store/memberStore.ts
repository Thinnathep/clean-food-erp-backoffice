import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { Member, PintoPackage } from '../types';
import { 
  fetchMembers, updateMemberProfile, createMember, 
  fetchActivePackages, createPintoPackage, deletePintoPackage 
} from '../features/kds/api';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

interface MemberState {
  members: Member[];
  activePackages: PintoPackage[];
  buddyGroups: any[];
  isLoading: boolean;
  error: string | null;

  loadMemberData: (silent?: boolean) => Promise<void>;
  updateProfile: (id: string, updates: Partial<Member>) => Promise<void>;
  addMember: (member: Omit<Member, 'id'>) => Promise<Member>;
  addPackage: (pkg: Omit<PintoPackage, 'id'> & { buddy_member_id?: string }) => Promise<void>;
  cancelPackage: (id: string) => Promise<void>;
  
  banMember: (id: string, reason: string) => Promise<void>;
  unbanMember: (id: string, reason: string) => Promise<void>;
  createQuickRetailOrder: (order: { 
    member_id?: string; 
    phone?: string; 
    full_name?: string; 
    menu_item_id?: string; 
    menu_name: string; 
    quantity: number; 
    notes?: string; 
  }) => Promise<void>;
}

export const useMemberStore = create<MemberState>((set, get) => ({
  members: [],
  activePackages: [],
  buddyGroups: [],
  isLoading: false,
  error: null,

  loadMemberData: async (silent = false) => {
    try {
      if (!silent) set({ isLoading: true, error: null });
      const [membersData, packagesData, buddyGroupsResponse] = await Promise.all([
        fetchMembers(),
        fetchActivePackages(),
        supabase.from('erp_buddy_groups').select('*').order('created_at', { ascending: false })
      ]);
      set({ 
        members: membersData, 
        activePackages: packagesData, 
        buddyGroups: buddyGroupsResponse.data || [],
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateProfile: async (id, updates) => {
    try {
      set({ isLoading: true });
      await updateMemberProfile(id, updates);
      await get().loadMemberData(true);
      toast.success('อัปเดตข้อมูลสมาชิกเรียบร้อย');
    } catch (error: any) {
      toast.error('อัปเดตข้อมูลไม่สำเร็จ: ' + error.message);
    } finally {
      set({ isLoading: false });
    }
  },

  addMember: async (member) => {
    try {
      set({ isLoading: true });
      const newMember = await createMember(member);
      await get().loadMemberData(true);
      toast.success('เพิ่มสมาชิกใหม่เรียบร้อย');
      return newMember;
    } catch (error: any) {
      toast.error('เพิ่มสมาชิกไม่สำเร็จ');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addPackage: async (pkgInput) => {
    try {
      set({ isLoading: true });
      const { buddy_member_id, ...pkg } = pkgInput;
      let finalBuddyGroupId = pkg.buddy_group_id;

      if (buddy_member_id) {
        // Fetch buddy's active package
        const { data: buddyPackages } = await supabase
          .from('pinto_packages')
          .select('*')
          .eq('member_id', buddy_member_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        const buddyPackage = buddyPackages?.[0];

        if (buddyPackage?.buddy_group_id) {
           finalBuddyGroupId = buddyPackage.buddy_group_id;
        } else {
          // Create new group
          const groupCode = `BG-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const { data: newGroup, error: groupError } = await supabase
            .from('erp_buddy_groups')
            .insert([{
               group_code: groupCode,
               group_name: `คู่หู ${groupCode}`,
               current_members: 2,
               status: 'active'
            }])
            .select()
            .single();
            
          if (groupError) throw groupError;
          finalBuddyGroupId = newGroup.id;
        }

        if (buddyPackage) {
           // Update buddy package with +2 meals, buddy_group_id, and bonus_meals tracking
           await supabase
             .from('pinto_packages')
             .update({ 
               buddy_group_id: finalBuddyGroupId,
               meals_total: (buddyPackage.meals_total || 0) + 2,
               meals_remaining: (buddyPackage.meals_remaining || 0) + 2,
               bonus_meals: 2
             })
             .eq('id', buddyPackage.id);
        }
        
        // Add +2 to the current package being created + track bonus_meals
        pkg.meals_total = (pkg.meals_total || 0) + 2;
        pkg.meals_remaining = (pkg.meals_remaining || 0) + 2;
        (pkg as any).bonus_meals = 2;
      }

      await createPintoPackage({ ...pkg, buddy_group_id: finalBuddyGroupId });
      await get().loadMemberData(true);
      toast.success('สมัครแพ็กเกจเรียบร้อย');
    } catch (error: any) {
      toast.error('สมัครแพ็กเกจไม่สำเร็จ: ' + error.message);
    } finally {
      set({ isLoading: false });
    }
  },

  cancelPackage: async (id) => {
    try {
      set({ isLoading: true });

      // Before deleting, check if this package is part of a buddy group
      const { data: cancellingPkg } = await supabase
        .from('pinto_packages')
        .select('id, buddy_group_id, bonus_meals, member_id')
        .eq('id', id)
        .single();

      if (cancellingPkg?.buddy_group_id) {
        // Find the buddy partner's package in the same group
        const { data: partnerPackages } = await supabase
          .from('pinto_packages')
          .select('id, meals_total, meals_remaining, bonus_meals')
          .eq('buddy_group_id', cancellingPkg.buddy_group_id)
          .neq('id', id)
          .eq('status', 'active');

        const partnerPkg = partnerPackages?.[0];
        if (partnerPkg) {
          // Deduct 2 bonus meals from partner (cap remaining at 0)
          const newTotal = Math.max(0, (partnerPkg.meals_total || 0) - 2);
          const newRemaining = Math.max(0, (partnerPkg.meals_remaining || 0) - 2);
          await supabase
            .from('pinto_packages')
            .update({
              meals_total: newTotal,
              meals_remaining: newRemaining,
              bonus_meals: 0,
              buddy_group_id: null
            })
            .eq('id', partnerPkg.id);
        }

        // Update buddy group status to 'dissolved'
        await supabase
          .from('erp_buddy_groups')
          .update({ status: 'dissolved', current_members: 0 })
          .eq('id', cancellingPkg.buddy_group_id);
      }

      await deletePintoPackage(id);
      await get().loadMemberData(true);
      toast.success('ยกเลิกแพ็กเกจเรียบร้อย');
    } catch (error: any) {
      toast.error('ยกเลิกแพ็กเกจไม่สำเร็จ');
    } finally {
      set({ isLoading: false });
    }
  },

  banMember: async (id, reason) => {
    try {
      set({ isLoading: true });
      
      const { error: memberError } = await supabase
        .from('members')
        .update({ is_banned: true, ban_reason: reason, banned_at: new Date().toISOString() })
        .eq('id', id);

      if (memberError) throw memberError;

      const member = get().members.find(m => m.id === id);
      if (member) {
        await supabase.from('erp_blacklist').upsert({
          phone: member.phone,
          full_name: member.full_name,
          reason: reason
        });
      }

      await supabase.from('erp_member_ban_logs').insert({
        member_id: id,
        action: 'BAN',
        reason: reason
      });

      await get().loadMemberData(true);
      Swal.fire({ icon: 'success', title: 'ระงับผู้ใช้งานเรียบร้อยแล้ว' });
    } catch (error: any) {
      toast.error('ระงับไม่สำเร็จ: ' + error.message);
    } finally {
      set({ isLoading: false });
    }
  },

  unbanMember: async (id, reason) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase
        .from('members')
        .update({ is_banned: false, ban_reason: null, banned_at: null })
        .eq('id', id);

      if (error) throw error;

      const member = get().members.find(m => m.id === id);
      if (member) {
        await supabase.from('erp_blacklist').delete().eq('phone', member.phone);
      }

      await supabase.from('erp_member_ban_logs').insert({
        member_id: id,
        action: 'UNBAN',
        reason: reason
      });

      await get().loadMemberData(true);
      toast.success('ยกเลิกการระงับเรียบร้อย');
    } catch (error: any) {
      toast.error('ดำเนินการไม่สำเร็จ');
    } finally {
      set({ isLoading: false });
    }
  },

  createQuickRetailOrder: async (order) => {
    try {
      set({ isLoading: true });
      const { createRetailOrder, fetchMembers } = await import('../features/kds/api');
      
      let memberId = order.member_id;

      // If no memberId but we have phone, try to find the member
      if (!memberId && order.phone) {
        const members = await fetchMembers();
        const existing = members.find(m => m.phone === order.phone);
        if (existing) {
          memberId = existing.id;
        }
      }

      await createRetailOrder({
        member_id: memberId || 'retail-customer', // Fallback
        menu_item_id: order.menu_item_id,
        menu_name: order.menu_name,
        quantity: order.quantity,
        notes: order.notes
      });
      
      await get().loadMemberData(true);
      toast.success('บันทึกออเดอร์รายย่อยเรียบร้อย');
    } catch (error: any) {
      toast.error('สั่งซื้อไม่สำเร็จ: ' + error.message);
    } finally {
      set({ isLoading: false });
    }
  }
}));
