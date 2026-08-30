import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Map, 
  Plus, 
  Search, 
  Users, 
  CheckCircle2, 
  Calendar, 
  AlertTriangle, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Layers, 
  Building2, 
  Sparkles,
  Loader2,
  Phone,
  Info,
  Notebook
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TabType = 'drop-points' | 'group-orders' | 'buddy-groups';

export const DropPointManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('drop-points');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [dropPoints, setDropPoints] = useState<any[]>([]);
  const [groupOrders, setGroupOrders] = useState<any[]>([]);
  const [buddyGroups, setBuddyGroups] = useState<any[]>([]);
  
  // Form Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDropPoint, setEditingDropPoint] = useState<any | null>(null);
  const [dropPointForm, setDropPointForm] = useState({
    name: '',
    short_code: '',
    address_line: '',
    lat: '' as string | number,
    lng: '' as string | number,
    radius_km: 0.5,
    contact_name: '',
    contact_phone: '',
    delivery_instructions: '',
    notes: '',
    is_active: true
  });

  const [mapsUrl, setMapsUrl] = useState('');

  const handleMapUrlChange = (url: string) => {
    setMapsUrl(url);
    if (!url) return;

    const patternAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const patternQuery = /[?&](?:q|ll|query)=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const patternCoords = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;

    let match = url.match(patternAt);
    if (!match) {
      match = url.match(patternQuery);
    }
    if (!match) {
      match = url.match(patternCoords);
    }

    if (match && match[1] && match[2]) {
      const latVal = parseFloat(match[1]);
      const lngVal = parseFloat(match[2]);

      if (latVal >= -90 && latVal <= 90 && lngVal >= -180 && lngVal <= 180) {
        setDropPointForm(prev => ({
          ...prev,
          lat: latVal,
          lng: lngVal
        }));
        toast.success(`ดึงพิกัดสำเร็จ: Lat ${latVal.toFixed(6)}, Lng ${lngVal.toFixed(6)}`);
      }
    }
  };

  // Details Modal States
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [selectedBuddyGroup, setSelectedBuddyGroup] = useState<any | null>(null);
  const [groupDetails, setGroupDetails] = useState<any[]>([]);
  const [buddyDetails, setBuddyDetails] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Menus and Members Master Data
  const [menus, setMenus] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);

  // Add Item to Existing Order States
  const [addingItemToOrderId, setAddingItemToOrderId] = useState<string | null>(null);
  const [addingItemForm, setAddingItemForm] = useState({
    menu_item_id: '',
    qty: 1,
    unit_price: 0,
    is_free_addon: false,
    addon_source: 'GROUP_PROMO'
  });

  // Create New Order in Group States
  const [isAddingNewOrder, setIsAddingNewOrder] = useState(false);
  const [addingNewOrderForm, setAddingNewOrderForm] = useState({
    customer_id: '',
    phone: '',
    delivery_address: '',
    menu_item_id: '',
    qty: 1,
    unit_price: 0,
    is_free_addon: false,
    notes: ''
  });

  // Fetch master data on mount
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const { data: menuData, error: menuErr } = await supabase
        .from('menu_items')
        .select('id, name, base_price, category')
        .eq('is_available', true)
        .is('deleted_at', null)
        .order('name');
      if (menuErr) throw menuErr;
      setMenus(menuData || []);

      const { data: memberData, error: memberErr } = await supabase
        .from('members')
        .select('id, full_name, line_display_name, phone, address')
        .or('is_banned.is.null,is_banned.eq.false')
        .order('full_name');
      if (memberErr) throw memberErr;
      setMembersList(memberData || []);
    } catch (err: any) {
      console.error('Error fetching master data:', err);
    }
  };

  const handleSelectCustomer = (memberId: string) => {
    const member = membersList.find(m => m.id === memberId);
    setAddingNewOrderForm(prev => ({
      ...prev,
      customer_id: memberId,
      phone: member?.phone || '',
      delivery_address: member?.address || ''
    }));
  };

  const handleSelectMenuForExisting = (menuId: string) => {
    const menu = menus.find(m => m.id === menuId);
    setAddingItemForm(prev => ({
      ...prev,
      menu_item_id: menuId,
      unit_price: menu?.base_price || 0
    }));
  };

  const handleSelectMenuForNew = (menuId: string) => {
    const menu = menus.find(m => m.id === menuId);
    setAddingNewOrderForm(prev => ({
      ...prev,
      menu_item_id: menuId,
      unit_price: menu?.base_price || 0
    }));
  };
  
  // Date filter for Group Orders
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'drop-points') {
        const { data, error } = await supabase
          .from('erp_drop_points')
          .select('*')
          .order('name', { ascending: true });
        if (error) throw error;
        setDropPoints(data || []);
      } else if (activeTab === 'group-orders') {
        const { data, error } = await supabase
          .from('erp_group_orders')
          .select('*, drop_point:erp_drop_points(*), promotion:promotions(*)')
          .eq('order_date', selectedDate)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setGroupOrders(data || []);
      } else if (activeTab === 'buddy-groups') {
        const { data, error } = await supabase
          .from('erp_buddy_groups')
          .select('*, drop_point:erp_drop_points(*), promotion:promotions(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setBuddyGroups(data || []);
      }
    } catch (error: any) {
      toast.error('ไม่สามารถดึงข้อมูลได้: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateDrawer = () => {
    setEditingDropPoint(null);
    setMapsUrl('');
    setDropPointForm({
      name: '',
      short_code: '',
      address_line: '',
      lat: '',
      lng: '',
      radius_km: 0.5,
      contact_name: '',
      contact_phone: '',
      delivery_instructions: '',
      notes: '',
      is_active: true
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (dp: any) => {
    setEditingDropPoint(dp);
    setMapsUrl(dp.lat && dp.lng ? `https://www.google.com/maps/search/?api=1&query=${dp.lat},${dp.lng}` : '');
    setDropPointForm({
      name: dp.name || '',
      short_code: dp.short_code || '',
      address_line: dp.address_line || '',
      lat: dp.lat || '',
      lng: dp.lng || '',
      radius_km: dp.radius_km || 0.5,
      contact_name: dp.contact_name || '',
      contact_phone: dp.contact_phone || '',
      delivery_instructions: dp.delivery_instructions || '',
      notes: dp.notes || '',
      is_active: dp.is_active !== false
    });
    setIsDrawerOpen(true);
  };

  const handleSaveDropPoint = async () => {
    if (!dropPointForm.name) {
      toast.error('กรุณาระบุชื่อจุดส่งรวม');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: any = {
        name: dropPointForm.name,
        short_code: dropPointForm.short_code || null,
        address_line: dropPointForm.address_line || null,
        lat: dropPointForm.lat ? Number(dropPointForm.lat) : null,
        lng: dropPointForm.lng ? Number(dropPointForm.lng) : null,
        radius_km: Number(dropPointForm.radius_km),
        contact_name: dropPointForm.contact_name || null,
        contact_phone: dropPointForm.contact_phone || null,
        delivery_instructions: dropPointForm.delivery_instructions || null,
        notes: dropPointForm.notes || null,
        is_active: dropPointForm.is_active
      };

      if (editingDropPoint) {
        payload.id = editingDropPoint.id;
      }

      const { error } = await supabase
        .from('erp_drop_points')
        .upsert(payload);

      if (error) throw error;
      toast.success(editingDropPoint ? 'แก้ไขข้อมูลจุดส่งสำเร็จ' : 'สร้างจุดส่งรวมใหม่สำเร็จ');
      setIsDrawerOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error('ล้มเหลว: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDropPoint = async (id: string) => {
    if (!window.confirm('ยืนยันที่จะลบจุดส่งรวมนี้หรือไม่? การลบจะลบข้อมูลออกจากระบบอย่างถาวร')) return;
    try {
      const { error } = await supabase
        .from('erp_drop_points')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('ลบจุดส่งรวมแล้ว');
      fetchData();
    } catch (error: any) {
      toast.error('ลบไม่สำเร็จ: ' + error.message);
    }
  };

  // View group orders details
  const handleViewGroupDetails = async (group: any) => {
    setSelectedGroup(group);
    setGroupDetails([]);
    setIsLoadingDetails(true);
    try {
      // Query orders linked to this group
      const { data, error } = await supabase
        .from('orders')
        .select(`
          order_id,
          member_id,
          customer_id,
          total_amount,
          phone,
          delivery_address,
          kitchen_status,
          delivery_status,
          members (id, full_name, line_display_name),
          order_items (
            id,
            order_id,
            menu_item_id,
            qty,
            unit_price,
            is_free_addon,
            addon_source,
            menu_items (id, name, base_price)
          )
        `)
        .eq('group_order_id', group.id);
      
      if (error) throw error;
      setGroupDetails(data || []);
    } catch (error: any) {
      toast.error('ไม่สามารถโหลดรายละเอียดออเดอร์ในกลุ่มได้: ' + error.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Trigger group order check qualification manual
  const handleTriggerGroupQualify = async (groupId: string) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .rpc('check_group_order_qualification', { p_group_order_id: groupId });
      
      if (error) throw error;
      toast.success(data ? 'กลุ่มผ่านเกณฑ์โปรโมชั่น!' : 'กลุ่มยังไม่เข้าเกณฑ์ขั้นต่ำ');
      fetchData();
      if (selectedGroup?.id === groupId) {
        handleViewGroupDetails(selectedGroup);
      }
    } catch (error: any) {
      toast.error('ตรวจสอบไม่สำเร็จ: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // View buddy group details
  const handleViewBuddyDetails = async (bg: any) => {
    setSelectedBuddyGroup(bg);
    setBuddyDetails([]);
    setIsLoadingDetails(true);
    try {
      // Query packages linked to this buddy group
      const { data, error } = await supabase
        .from('pinto_packages')
        .select(`
          id,
          package_name,
          meals_total,
          meals_remaining,
          bonus_meals,
          status,
          phone,
          members (full_name, line_display_name)
        `)
        .eq('buddy_group_id', bg.id);
      
      if (error) throw error;
      setBuddyDetails(data || []);
    } catch (error: any) {
      toast.error('ไม่สามารถโหลดรายละเอียดสมาชิกคู่หูได้: ' + error.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Trigger buddy group check qualification manual
  const handleTriggerBuddyQualify = async (buddyGroupId: string) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .rpc('check_buddy_group_qualification', { p_buddy_group_id: buddyGroupId });
      
      if (error) throw error;
      toast.success(data ? 'กลุ่มคู่หูผ่านเกณฑ์ ได้มื้อแถมพิเศษ!' : 'กลุ่มคู่หูยังไม่ครบจำนวนขั้นต่ำ');
      fetchData();
      if (selectedBuddyGroup?.id === buddyGroupId) {
        handleViewBuddyDetails(selectedBuddyGroup);
      }
    } catch (error: any) {
      toast.error('ตรวจสอบไม่สำเร็จ: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mutation to add an item to an existing order
  const handleCreateOrderItem = async (orderId: string) => {
    if (!addingItemForm.menu_item_id) {
      toast.error('กรุณาเลือกเมนูอาหาร');
      return;
    }
    if (Number(addingItemForm.qty) <= 0) {
      toast.error('จำนวนต้องมากกว่า 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedMenu = menus.find(m => m.id === addingItemForm.menu_item_id);
      const price = addingItemForm.is_free_addon ? 0 : Number(addingItemForm.unit_price || selectedMenu?.base_price || 0);

      const { error: insertErr } = await supabase
        .from('order_items')
        .insert({
          order_id: orderId,
          menu_item_id: addingItemForm.menu_item_id,
          qty: Number(addingItemForm.qty),
          unit_price: price,
          is_free_addon: addingItemForm.is_free_addon,
          addon_source: addingItemForm.is_free_addon ? addingItemForm.addon_source || 'GROUP_PROMO' : null
        });

      if (insertErr) throw insertErr;

      // Re-sum order total and build menu summary
      const { data: allItems, error: fetchErr } = await supabase
        .from('order_items')
        .select('qty, unit_price, menu_items(name)')
        .eq('order_id', orderId);

      if (fetchErr) throw fetchErr;

      const newTotal = allItems?.reduce((sum, i) => sum + (Number(i.qty) * Number(i.unit_price)), 0) || 0;
      const summaryName = allItems?.map((i: any) => `${i.menu_items?.name || 'อาหาร'} (x${i.qty})`).join(', ') || 'ไม่มีอาหาร';

      const { error: updateErr } = await supabase
        .from('orders')
        .update({ 
          total_amount: newTotal,
          menu_name: summaryName
        })
        .eq('order_id', orderId);

      if (updateErr) throw updateErr;

      toast.success('เพิ่มรายการอาหารเข้าออเดอร์สำเร็จ');
      setAddingItemToOrderId(null);
      setAddingItemForm({
        menu_item_id: '',
        qty: 1,
        unit_price: 0,
        is_free_addon: false,
        addon_source: 'GROUP_PROMO'
      });
      
      if (selectedGroup) {
        handleViewGroupDetails(selectedGroup);
        fetchData();
      }
    } catch (err: any) {
      toast.error('ล้มเหลว: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mutation to delete an item from an existing order
  const handleDeleteOrderItem = async (itemId: string, orderId: string) => {
    if (!window.confirm('ยืนยันที่จะลบรายการอาหารนี้ออกจากออเดอร์หรือไม่?')) return;
    
    setIsSubmitting(true);
    try {
      const { error: deleteErr } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);

      if (deleteErr) throw deleteErr;

      // Re-sum order total and build menu summary
      const { data: allItems, error: fetchErr } = await supabase
        .from('order_items')
        .select('qty, unit_price, menu_items(name)')
        .eq('order_id', orderId);

      if (fetchErr) throw fetchErr;

      const newTotal = allItems?.reduce((sum, i) => sum + (Number(i.qty) * Number(i.unit_price)), 0) || 0;
      const summaryName = allItems?.map((i: any) => `${i.menu_items?.name || 'อาหาร'} (x${i.qty})`).join(', ') || 'ไม่มีอาหาร';

      const { error: updateErr } = await supabase
        .from('orders')
        .update({ 
          total_amount: newTotal,
          menu_name: summaryName
        })
        .eq('order_id', orderId);

      if (updateErr) throw updateErr;

      toast.success('ลบรายการอาหารเรียบร้อยแล้ว');
      
      if (selectedGroup) {
        handleViewGroupDetails(selectedGroup);
        fetchData();
      }
    } catch (err: any) {
      toast.error('ล้มเหลว: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mutation to create a brand new order within a group
  const handleCreateOrderInGroup = async () => {
    if (!addingNewOrderForm.customer_id) {
      toast.error('กรุณาเลือกลูกค้า/สมาชิก');
      return;
    }
    if (!addingNewOrderForm.menu_item_id) {
      toast.error('กรุณาเลือกเมนูอาหาร');
      return;
    }
    if (Number(addingNewOrderForm.qty) <= 0) {
      toast.error('จำนวนต้องมากกว่า 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedMenu = menus.find(m => m.id === addingNewOrderForm.menu_item_id);
      const price = addingNewOrderForm.is_free_addon ? 0 : Number(addingNewOrderForm.unit_price || selectedMenu?.base_price || 0);
      const menuSummary = `${selectedMenu?.name || 'อาหาร'} (x${addingNewOrderForm.qty})`;
      
      const orderCode = 'GP-' + dayjs(selectedGroup.order_date).format('YYMMDD') + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

      const { error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_id: orderCode,
          customer_id: addingNewOrderForm.customer_id,
          member_id: addingNewOrderForm.customer_id,
          phone: addingNewOrderForm.phone || null,
          delivery_address: addingNewOrderForm.delivery_address || null,
          group_order_id: selectedGroup.id,
          drop_point_id: selectedGroup.drop_point_id,
          delivery_date: selectedGroup.order_date,
          total_amount: price * Number(addingNewOrderForm.qty),
          kitchen_status: 'ยืนยันแล้ว',
          delivery_status: 'รอส่ง',
          menu_name: menuSummary,
          notes: addingNewOrderForm.notes || null
        });

      if (orderErr) throw orderErr;

      // Insert into order_items
      const { error: itemErr } = await supabase
        .from('order_items')
        .insert({
          order_id: orderCode,
          menu_item_id: addingNewOrderForm.menu_item_id,
          qty: Number(addingNewOrderForm.qty),
          unit_price: price,
          is_free_addon: addingNewOrderForm.is_free_addon,
          addon_source: addingNewOrderForm.is_free_addon ? 'GROUP_PROMO' : null
        });

      if (itemErr) throw itemErr;

      toast.success('สร้างออเดอร์ใหม่เข้ากลุ่มสำเร็จ');
      setIsAddingNewOrder(false);
      setAddingNewOrderForm({
        customer_id: '',
        phone: '',
        delivery_address: '',
        menu_item_id: '',
        qty: 1,
        unit_price: 0,
        is_free_addon: false,
        notes: ''
      });

      if (selectedGroup) {
        handleViewGroupDetails(selectedGroup);
        fetchData();
      }
    } catch (err: any) {
      toast.error('ล้มเหลว: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search logic for drop points
  const filteredDropPoints = dropPoints.filter(dp => 
    dp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dp.short_code && dp.short_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (dp.address_line && dp.address_line.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] min-h-screen font-prompt pb-12">
      {/* Header Area */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/20">
              <MapPin size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Drop Points & Groups
                <span className="text-[10px] bg-slate-900 text-emerald-400 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">Logistics HUB</span>
              </h2>
              <p className="text-sm text-slate-500 font-medium">จัดการจุดส่งรวมและขยายประสิทธิภาพการส่งกลุ่ม/ปิ่นโตคู่หู</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner min-w-[360px] md:min-w-[450px]">
            <button 
              onClick={() => { setActiveTab('drop-points'); setSearchQuery(''); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all",
                activeTab === 'drop-points' ? "bg-white text-slate-900 shadow-md ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Map size={16} /> จุดส่งรวม ({dropPoints.length})
            </button>
            <button 
              onClick={() => { setActiveTab('group-orders'); setSearchQuery(''); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all",
                activeTab === 'group-orders' ? "bg-white text-slate-900 shadow-md ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Layers size={16} /> สั่งกลุ่มรายวัน
            </button>
            <button 
              onClick={() => { setActiveTab('buddy-groups'); setSearchQuery(''); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all",
                activeTab === 'buddy-groups' ? "bg-white text-slate-900 shadow-md ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Users size={16} /> ปิ่นโตคู่หู
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
        {/* Actions bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder={
                activeTab === 'drop-points' ? "ค้นหาจุดส่ง, ที่อยู่, รหัสย่อ..." :
                activeTab === 'group-orders' ? "กรองออเดอร์กลุ่ม..." : "กรองกลุ่มปิ่นโตคู่หู..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-5 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm text-slate-700"
            />
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'group-orders' && (
              <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm gap-2">
                <Calendar size={16} className="text-slate-400" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border-none bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer"
                />
              </div>
            )}

            {activeTab === 'drop-points' && (
              <button 
                onClick={handleOpenCreateDrawer}
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2"
              >
                <Plus size={16} /> เพิ่มจุดส่งรวม
              </button>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="animate-spin text-emerald-500 mb-3" size={36} />
            <p className="text-slate-500 text-sm font-medium">กำลังดึงข้อมูล...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* TAB 1: DROP POINTS */}
            {activeTab === 'drop-points' && (
              <motion.div 
                key="drop-points"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredDropPoints.length === 0 ? (
                  <div className="col-span-full bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
                    <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500 font-bold text-lg">ไม่พบจุดส่งรวม</p>
                    <p className="text-slate-400 text-sm">ลองค้นหาใหม่อีกครั้ง หรือเพิ่มจุดส่งรวมใหม่เข้าสู่ระบบ</p>
                  </div>
                ) : (
                  filteredDropPoints.map(dp => (
                    <motion.div
                      key={dp.id}
                      whileHover={{ y: -4, boxShadow: "0 12px 20px -8px rgba(0,0,0,0.05), 0 4px 12px -2px rgba(0,0,0,0.03)" }}
                      className={cn(
                        "bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between transition-all",
                        !dp.is_active && "opacity-75 bg-slate-50"
                      )}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                            {dp.short_code && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                {dp.short_code}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => handleOpenEditDrawer(dp)}
                              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
                              title="แก้ไข"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteDropPoint(dp.id)}
                              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all"
                              title="ลบ"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">{dp.name}</h3>
                        <p className="text-xs text-slate-400 font-medium mb-4 flex items-start gap-1">
                          <MapPin size={12} className="shrink-0 mt-0.5" />
                          <span>{dp.address_line || 'ไม่ได้ระบุที่อยู่ละเอียด'}</span>
                        </p>

                        {(dp.contact_name || dp.contact_phone) && (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4 text-xs">
                            <p className="font-bold text-slate-600 mb-1">ผู้ติดต่อหลัก:</p>
                            <p className="text-slate-500">{dp.contact_name || '-'}</p>
                            {dp.contact_phone && (
                              <p className="text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                <Phone size={10} /> {dp.contact_phone}
                              </p>
                            )}
                          </div>
                        )}

                        {dp.delivery_instructions && (
                          <div className="text-xs text-indigo-600 bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3 mb-4">
                            <p className="font-bold mb-1 flex items-center gap-1">
                              <Info size={11} /> คำแนะนำผู้จัดส่ง:
                            </p>
                            <p className="text-slate-500 italic">"{dp.delivery_instructions}"</p>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-400 font-medium">
                        <div>รัศมี: {dp.radius_km || 0.5} กม.</div>
                        <div className={cn(
                          "px-2 py-0.5 rounded font-black text-[10px] uppercase",
                          dp.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                        )}>
                          {dp.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {/* TAB 2: GROUP ORDERS */}
            {activeTab === 'group-orders' && (
              <motion.div 
                key="group-orders"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {groupOrders.length === 0 ? (
                  <div className="col-span-full bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
                    <Layers className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500 font-bold text-lg">ไม่มีกลุ่มออเดอร์ในวันที่เลือก</p>
                    <p className="text-slate-400 text-sm">เมื่อมีการสั่งอาหารที่เลือก Drop Point เดียวกัน ระบบจะสร้างกลุ่มให้อัตโนมัติ</p>
                  </div>
                ) : (
                  groupOrders.map(group => {
                    const progress = Math.min(100, (group.total_boxes / group.min_boxes_required) * 100);
                    return (
                      <motion.div
                        key={group.id}
                        whileHover={{ y: -4, boxShadow: "0 12px 20px -8px rgba(0,0,0,0.05), 0 4px 12px -2px rgba(0,0,0,0.03)" }}
                        className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                {group.group_code || 'GROUP-ORDER'}
                              </span>
                              <h3 className="text-lg font-black text-slate-800 mt-2">{group.drop_point?.name || 'ไม่ทราบจุดส่ง'}</h3>
                            </div>
                            
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                              group.is_qualified 
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}>
                              {group.is_qualified ? 'Qualified' : 'Pending'}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="mb-5">
                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                              <span>กล่องอาหารสะสม</span>
                              <span className={cn(group.is_qualified ? "text-emerald-500" : "text-amber-500")}>
                                {group.total_boxes} / {group.min_boxes_required} กล่อง
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                                className={cn(
                                  "h-full rounded-full",
                                  group.is_qualified ? "bg-emerald-500" : "bg-amber-500"
                                )}
                              />
                            </div>
                          </div>

                          {group.promotion && (
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 mb-4">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles size={10} /> Active Promo
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-1">{group.promotion.name}</p>
                              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{group.promotion.description}</p>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex gap-2">
                          <button
                            onClick={() => handleViewGroupDetails(group)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                          >
                            <Notebook size={14} /> รายละเอียดกลุ่ม
                          </button>
                          
                          <button
                            onClick={() => handleTriggerGroupQualify(group.id)}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shrink-0"
                            title="ตรวจสอบสิทธิ์"
                          >
                            Check
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            )}

            {/* TAB 3: BUDDY GROUPS */}
            {activeTab === 'buddy-groups' && (
              <motion.div 
                key="buddy-groups"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {buddyGroups.length === 0 ? (
                  <div className="col-span-full bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
                    <Users className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500 font-bold text-lg">ไม่พบกลุ่มคู่หูผูกปิ่นโต</p>
                    <p className="text-slate-400 text-sm">เมื่อลูกค้าสมัครแพ็กเกจปิ่นโตในจุดส่งรวมเดียวกันตั้งแต่ 2 คนขึ้นไป ระบบจะจัดกลุ่มคู่หูให้อัตโนมัติ</p>
                  </div>
                ) : (
                  buddyGroups.map(bg => {
                    const progress = Math.min(100, (bg.current_members / bg.min_members) * 100);
                    return (
                      <motion.div
                        key={bg.id}
                        whileHover={{ y: -4, boxShadow: "0 12px 20px -8px rgba(0,0,0,0.05), 0 4px 12px -2px rgba(0,0,0,0.03)" }}
                        className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                {bg.group_code || 'BUDDY-GROUP'}
                              </span>
                              <h3 className="text-lg font-black text-slate-800 mt-2">{bg.group_name || 'กลุ่มปิ่นโตคู่หู'}</h3>
                              <p className="text-xs text-slate-400 font-medium flex items-center gap-0.5 mt-0.5">
                                <MapPin size={11} /> {bg.drop_point?.name || 'ไม่ทราบจุดส่ง'}
                              </p>
                            </div>
                            
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                              bg.is_qualified 
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            )}>
                              {bg.is_qualified ? 'Qualified' : 'Forming'}
                            </span>
                          </div>

                          {/* Member Progress */}
                          <div className="mb-5">
                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                              <span>สมาชิกในกลุ่ม</span>
                              <span className={cn(bg.is_qualified ? "text-emerald-500" : "text-blue-500")}>
                                {bg.current_members} / {bg.min_members} คน
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                                className={cn(
                                  "h-full rounded-full",
                                  bg.is_qualified ? "bg-emerald-500" : "bg-blue-500"
                                )}
                              />
                            </div>
                          </div>

                          {bg.promotion && (
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-4">
                              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles size={10} /> Active Promo
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-1">{bg.promotion.name}</p>
                              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{bg.promotion.description}</p>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex gap-2">
                          <button
                            onClick={() => handleViewBuddyDetails(bg)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                          >
                            <Notebook size={14} /> รายละเอียดกลุ่ม
                          </button>
                          
                          <button
                            onClick={() => handleTriggerBuddyQualify(bg.id)}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shrink-0"
                            title="ตรวจสอบสิทธิ์"
                          >
                            Check
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* CREATE/EDIT DRAWERS */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950 z-[99]"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-[999] shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    {editingDropPoint ? <Edit2 size={18} /> : <Plus size={18} />}
                    {editingDropPoint ? 'แก้ไขจุดส่งรวม' : 'เพิ่มจุดส่งรวมใหม่'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">ระบุพิกัดและข้อมูลนำทางเพื่อให้ไรเดอร์ส่งอาหารได้ถูกต้อง</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-10 h-10 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อจุดส่งรวม *</label>
                  <input 
                    type="text" 
                    placeholder="เช่น รพ.ศูนย์-ตึกสงฆ์, แบงค์สีเขียว-หอนาฬิกา"
                    value={dropPointForm.name}
                    onChange={(e) => setDropPointForm({...dropPointForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">รหัสย่อ (ถ้ามี)</label>
                    <input 
                      type="text" 
                      placeholder="เช่น RSG-MONK"
                      value={dropPointForm.short_code}
                      onChange={(e) => setDropPointForm({...dropPointForm, short_code: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-sm uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">รัศมีกลุ่มส่ง (กม.)</label>
                    <input 
                      type="number" 
                      placeholder="0.5"
                      value={dropPointForm.radius_km}
                      onChange={(e) => setDropPointForm({...dropPointForm, radius_km: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ที่อยู่จัดส่งโดยละเอียด</label>
                  <textarea 
                    placeholder="บ้านเลขที่ ถนน แขวง เขต จังหวัด..."
                    value={dropPointForm.address_line}
                    onChange={(e) => setDropPointForm({...dropPointForm, address_line: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Google Maps Link / URL</label>
                    {dropPointForm.lat && dropPointForm.lng && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${dropPointForm.lat},${dropPointForm.lng}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                      >
                        📍 ตรวจสอบพิกัดในแผนที่
                      </a>
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder="วางลิงก์ Google Maps เพื่อดึงพิกัดอัตโนมัติ..."
                    value={mapsUrl}
                    onChange={(e) => handleMapUrlChange(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                  />
                  <p className="text-[10px] text-slate-400">
                    * สำหรับลิงก์ย่อ maps.app.goo.gl กรุณาเปิดลิงก์ในเบราว์เซอร์ก่อนนำ URL เต็มมาวาง
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Latitude</label>
                    <input 
                      type="number" 
                      placeholder="18.788"
                      value={dropPointForm.lat}
                      onChange={(e) => setDropPointForm({...dropPointForm, lat: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Longitude</label>
                    <input 
                      type="number" 
                      placeholder="98.988"
                      value={dropPointForm.lng}
                      onChange={(e) => setDropPointForm({...dropPointForm, lng: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อคนรับของ/ผู้ติดต่อ</label>
                    <input 
                      type="text" 
                      placeholder="คุณนิชา (เคาน์เตอร์หน้า)"
                      value={dropPointForm.contact_name}
                      onChange={(e) => setDropPointForm({...dropPointForm, contact_name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">เบอร์โทรศัพท์ผู้ติดต่อ</label>
                    <input 
                      type="text" 
                      placeholder="08X-XXX-XXXX"
                      value={dropPointForm.contact_phone}
                      onChange={(e) => setDropPointForm({...dropPointForm, contact_phone: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">คำแนะนำผู้จัดส่ง (สำหรับไรเดอร์)</label>
                  <textarea 
                    placeholder="เช่น ฝากที่ป้อมยามหน้าตึก หรือวางที่ตู้รับหน้าชั้น 1 เท่านั้น..."
                    value={dropPointForm.delivery_instructions}
                    onChange={(e) => setDropPointForm({...dropPointForm, delivery_instructions: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm min-h-[70px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">หมายเหตุภายใน</label>
                  <input 
                    type="text" 
                    placeholder="โน้ตเพิ่มเติมเกี่ยวกับตึกหรือจุดส่ง..."
                    value={dropPointForm.notes}
                    onChange={(e) => setDropPointForm({...dropPointForm, notes: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <input 
                    type="checkbox" 
                    id="dp_is_active"
                    checked={dropPointForm.is_active}
                    onChange={(e) => setDropPointForm({...dropPointForm, is_active: e.target.checked})}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="dp_is_active" className="text-xs font-bold text-slate-700 cursor-pointer uppercase select-none">
                    เปิดใช้งานจุดจัดส่งร่วมนี้ (Active Status)
                  </label>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSaveDropPoint}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  บันทึกข้อมูล
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DETAILS MODAL FOR GROUP ORDERS */}
      <AnimatePresence>
        {selectedGroup && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGroup(null)}
              className="fixed inset-0 bg-slate-950 z-[99]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-x-auto md:mx-auto md:top-20 md:bottom-20 max-w-4xl bg-white rounded-[2rem] z-[999] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-2 py-0.5 rounded uppercase">
                    {selectedGroup.group_code || 'GROUP-ORDER'}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    คำสั่งซื้อในกลุ่ม: {selectedGroup.drop_point?.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    วันจัดส่ง: {dayjs(selectedGroup.order_date).locale('th').format('D MMMM YYYY')}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="w-10 h-10 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingDetails ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="animate-spin text-emerald-500 mb-2" size={28} />
                    <p className="text-slate-400 text-xs">กำลังโหลดรายละเอียด...</p>
                  </div>
                ) : (
                  <>
                    {/* Add New Order to Group Panel */}
                    {isAddingNewOrder ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 mb-6 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                          <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                            <Plus size={16} className="text-emerald-500" /> สร้างออเดอร์ใหม่เข้ากลุ่ม
                          </h4>
                          <button 
                            onClick={() => setIsAddingNewOrder(false)}
                            className="text-slate-400 hover:text-slate-600 transition-colors text-xs font-bold"
                          >
                            ยกเลิก
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">เลือกสมาชิก/ลูกค้า *</label>
                            <select 
                              value={addingNewOrderForm.customer_id}
                              onChange={(e) => handleSelectCustomer(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">-- เลือกลูกค้า --</option>
                              {membersList.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.full_name} {m.line_display_name ? `(${m.line_display_name})` : m.nickname ? `(${m.nickname})` : ''} - {m.phone}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">เบอร์โทรศัพท์</label>
                            <input 
                              type="text" 
                              placeholder="เบอร์โทรติดต่อ..."
                              value={addingNewOrderForm.phone}
                              onChange={(e) => setAddingNewOrderForm({...addingNewOrderForm, phone: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ที่อยู่จัดส่ง</label>
                          <textarea 
                            placeholder="ระบุที่อยู่จัดส่ง..."
                            value={addingNewOrderForm.delivery_address}
                            onChange={(e) => setAddingNewOrderForm({...addingNewOrderForm, delivery_address: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-1 focus:ring-emerald-500 min-h-[60px]"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">เลือกเมนูอาหาร *</label>
                            <select 
                              value={addingNewOrderForm.menu_item_id}
                              onChange={(e) => handleSelectMenuForNew(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">-- เลือกเมนู --</option>
                              {menus.map(m => (
                                <option key={m.id} value={m.id}>
                                  [{m.category}] {m.name} - ฿{m.base_price}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">จำนวน (กล่อง)</label>
                            <input 
                              type="number" 
                              value={addingNewOrderForm.qty}
                              onChange={(e) => setAddingNewOrderForm({...addingNewOrderForm, qty: Number(e.target.value)})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ราคาต่อหน่วย (บาท)</label>
                            <input 
                              type="number" 
                              value={addingNewOrderForm.unit_price}
                              onChange={(e) => setAddingNewOrderForm({...addingNewOrderForm, unit_price: Number(e.target.value)})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={addingNewOrderForm.is_free_addon}
                              onChange={(e) => setAddingNewOrderForm({...addingNewOrderForm, is_free_addon: e.target.checked})}
                              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                            />
                            เป็น Add-on ฟรีสำหรับโปรโมชั่นกลุ่ม
                          </label>

                          <div className="flex-1 space-y-1">
                            <input 
                              type="text" 
                              placeholder="โน้ตเพิ่มเติม (เช่น ไม่เอาผัก, เผ็ดน้อย)..."
                              value={addingNewOrderForm.notes}
                              onChange={(e) => setAddingNewOrderForm({...addingNewOrderForm, notes: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button 
                            onClick={() => setIsAddingNewOrder(false)}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                          >
                            ยกเลิก
                          </button>
                          <button 
                            onClick={handleCreateOrderInGroup}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/10 transition-colors flex items-center gap-1"
                          >
                            {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            สร้างออเดอร์
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end mb-4">
                        <button 
                          onClick={() => setIsAddingNewOrder(true)}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-black transition-colors flex items-center gap-1 border border-indigo-100 shadow-sm"
                        >
                          <Plus size={14} /> เพิ่มสมาชิก/ออเดอร์ใหม่เข้ากลุ่ม
                        </button>
                      </div>
                    )}

                    {groupDetails.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <AlertTriangle className="mx-auto mb-2 text-slate-300" size={32} />
                        <p className="font-bold text-slate-500">ไม่มีคำสั่งซื้อที่ผูกกับกลุ่มนี้ในปัจจุบัน</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {groupDetails.map(order => (
                          <div key={order.order_id} className="border border-slate-100 rounded-2xl p-5 shadow-sm bg-white hover:border-slate-200 transition-all">
                            <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-3">
                              <div>
                                <p className="text-sm font-black text-slate-800">
                                  คุณ{order.members?.full_name || 'ลูกค้าทั่วไป'} {(order.members?.line_display_name || order.members?.nickname) && `(${order.members?.line_display_name || order.members?.nickname})`}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Order ID: {order.order_id}</p>
                              </div>
                              
                              <div className="text-right">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                  order.kitchen_status === 'เสร็จสิ้น' ? "bg-emerald-100 text-emerald-700" :
                                  order.kitchen_status === 'กำลังปรุง' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                                )}>
                                  ครัว: {order.kitchen_status || 'รอรับ'}
                                </span>
                              </div>
                            </div>

                            {/* Food Items List */}
                            <div className="space-y-2">
                              {order.order_items?.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center text-xs bg-slate-50/50 hover:bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 transition-all">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700">{item.menu_items?.name}</span>
                                    {item.is_free_addon && (
                                      <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                                        Free Add-on {item.addon_source ? `(${item.addon_source})` : ''}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    <span className="text-slate-400 font-bold">x{item.qty} (฿{item.unit_price})</span>
                                    <button 
                                      onClick={() => handleDeleteOrderItem(item.id, order.order_id)}
                                      disabled={isSubmitting}
                                      className="text-slate-400 hover:text-red-500 transition-colors"
                                      title="ลบเมนูนี้"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Add Item Form inside order card */}
                            {addingItemToOrderId === order.order_id ? (
                              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-3 space-y-3">
                                <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                                  <h5 className="text-xs font-black text-slate-700">เพิ่มรายการอาหารใหม่</h5>
                                  <button 
                                    onClick={() => setAddingItemToOrderId(null)}
                                    className="text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                                  >
                                    ยกเลิก
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">เลือกเมนูอาหาร *</label>
                                    <select 
                                      value={addingItemForm.menu_item_id}
                                      onChange={(e) => handleSelectMenuForExisting(e.target.value)}
                                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                                    >
                                      <option value="">-- เลือกเมนู --</option>
                                      {menus.map(m => (
                                        <option key={m.id} value={m.id}>
                                          [{m.category}] {m.name} - ฿{m.base_price}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">จำนวน</label>
                                    <input 
                                      type="number" 
                                      value={addingItemForm.qty}
                                      onChange={(e) => setAddingItemForm({...addingItemForm, qty: Number(e.target.value)})}
                                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">ราคา (บาท)</label>
                                    <input 
                                      type="number" 
                                      value={addingItemForm.unit_price}
                                      onChange={(e) => setAddingItemForm({...addingItemForm, unit_price: Number(e.target.value)})}
                                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 select-none cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={addingItemForm.is_free_addon}
                                      onChange={(e) => setAddingItemForm({...addingItemForm, is_free_addon: e.target.checked})}
                                      className="w-3.5 h-3.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                    />
                                    ของแถม/ Add-on ฟรี
                                  </label>

                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => setAddingItemToOrderId(null)}
                                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50"
                                    >
                                      ยกเลิก
                                    </button>
                                    <button 
                                      onClick={() => handleCreateOrderItem(order.order_id)}
                                      disabled={isSubmitting}
                                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1"
                                    >
                                      {isSubmitting ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                                      เพิ่มรายการ
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 flex justify-end">
                                <button 
                                  onClick={() => {
                                    setAddingItemToOrderId(order.order_id);
                                    setAddingItemForm({
                                      menu_item_id: '',
                                      qty: 1,
                                      unit_price: 0,
                                      is_free_addon: false,
                                      addon_source: 'GROUP_PROMO'
                                    });
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                >
                                  <Plus size={12} /> เพิ่มอาหารในออเดอร์นี้
                                </button>
                              </div>
                            )}

                            <div className="border-t border-slate-50 mt-3 pt-3 flex justify-between items-center text-xs">
                              <span className="text-slate-400">เบอร์โทร: {order.phone || '-'}</span>
                              <span className="font-black text-slate-800">ยอดรวม: ฿{order.total_amount?.toLocaleString() || 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="text-xs text-slate-500 font-bold">
                  กล่องรวมในกลุ่ม: {selectedGroup.total_boxes} กล่อง
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedGroup(null)}
                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                  >
                    ปิดหน้าต่าง
                  </button>
                  <button 
                    onClick={() => handleTriggerGroupQualify(selectedGroup.id)}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/10 flex items-center gap-1"
                  >
                    {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    ประเมินสิทธิ์โปรโมชั่น
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DETAILS MODAL FOR BUDDY GROUPS */}
      <AnimatePresence>
        {selectedBuddyGroup && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBuddyGroup(null)}
              className="fixed inset-0 bg-slate-950 z-[99]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-x-auto md:mx-auto md:top-20 md:bottom-20 max-w-4xl bg-white rounded-[2rem] z-[999] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-2 py-0.5 rounded uppercase">
                    {selectedBuddyGroup.group_code || 'BUDDY-GROUP'}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    สมาชิกกลุ่มคู่หู: {selectedBuddyGroup.group_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    จุดส่งร่วม: {selectedBuddyGroup.drop_point?.name}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedBuddyGroup(null)}
                  className="w-10 h-10 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingDetails ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="animate-spin text-emerald-500 mb-2" size={28} />
                    <p className="text-slate-400 text-xs">กำลังโหลดรายละเอียด...</p>
                  </div>
                ) : buddyDetails.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <AlertTriangle className="mx-auto mb-2 text-slate-300" size={32} />
                    <p className="font-bold text-slate-500">ไม่มีสมาชิกสมัครปิ่นโตคู่หูในกลุ่มนี้</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {buddyDetails.map(pkg => (
                      <div key={pkg.id} className="border border-slate-100 rounded-2xl p-5 shadow-sm bg-white hover:border-slate-200 transition-all flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                          <p className="text-sm font-black text-slate-800">
                            คุณ{pkg.members?.full_name || 'สมาชิกปิ่นโต'} {(pkg.members?.line_display_name || pkg.members?.nickname) && `(${pkg.members?.line_display_name || pkg.members?.nickname})`}
                          </p>
                          <p className="text-xs font-bold text-indigo-600 mt-0.5">{pkg.package_name}</p>
                          <p className="text-[10px] text-slate-400">เบอร์โทร: {pkg.phone || '-'}</p>
                        </div>

                        <div className="flex items-center gap-6 text-xs text-right">
                          <div>
                            <p className="text-slate-400">มื้อคงเหลือ</p>
                            <p className="text-lg font-black text-slate-800">{pkg.meals_remaining} / {pkg.meals_total} มื้อ</p>
                          </div>
                          <div>
                            <p className="text-slate-400">ได้รับมื้อแถมพิเศษ</p>
                            <p className="text-lg font-black text-emerald-600">+{pkg.bonus_meals || 0} มื้อ</p>
                          </div>
                          <div>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                              pkg.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                            )}>
                              {pkg.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="text-xs text-slate-500 font-bold">
                  สมาชิกสะสม: {selectedBuddyGroup.current_members} คน
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedBuddyGroup(null)}
                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                  >
                    ปิดหน้าต่าง
                  </button>
                  <button 
                    onClick={() => handleTriggerBuddyQualify(selectedBuddyGroup.id)}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/10 flex items-center gap-1"
                  >
                    {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    ประเมินสิทธิ์กลุ่มคู่หู
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
