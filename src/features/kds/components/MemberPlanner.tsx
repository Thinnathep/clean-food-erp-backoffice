import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Plus,
  User,
  X,
  Clock,
  Save,
  UtensilsCrossed,
  Copy,
  Clipboard as ClipboardIcon,
  Search,
  FileText,
  Trash2,
  MapPin,
  Pin,
  Wand2,
  Truck,
  Sparkles,
  Calendar,
  Check,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { supabase } from "../../../config/supabase";
import { usePlannerStore } from "../../../store/plannerStore";
import { useMemberStore } from "../../../store/memberStore";
import { useMenuStore } from "../../../store/menuStore";
import { useAuthStore } from "../../../store/authStore";
import { getWeekDays, formatDisplayDate } from "../../../lib/dateUtils";
import { fetchMemberSchedules, bulkImportSchedules } from "../../../features/kds/api";
import type { MemberMealSchedule, PintoPackage } from "../../../types";
import { SmartImportModal } from "./SmartImportModal";
import { AdvancedTemplateModal } from "./AdvancedTemplateModal";
import { 
  calculateDeliveryRounds, 
  getDeliveryPlanSummary, 
  generateDeliverySchedule,
  formatActiveDaysLabel
} from "../../../features/logistics/services/deliveryScheduleService";

export const MemberPlanner: React.FC = () => {
  // Authentication & Role
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  // Navigation State
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    dayjs()
      .startOf("isoWeek" as any)
      .toDate(),
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [templateCategories, setTemplateCategories] = useState<any[]>([]);

  // Modal State: Meal Editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [allPackageSchedules, setAllPackageSchedules] = useState<
    MemberMealSchedule[]
  >([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{
    scheduleId: string | null;
    date: string;
    mealType: string;
    menuId: string;
    qty: number;
    deliveryTime: string;
    notes: string;
    isExtraOrder: boolean;
    orderType: "subscription" | "a-la-carte";
    isNoRice: boolean;
    boxSize: string;
    isCompensatory: boolean;
  } | null>(null);

  // Modal State: Profile & Package
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [memberUpdates, setMemberUpdates] = useState<any>(null);
  const [packageUpdates, setPackageUpdates] = useState<{
    package_name: string;
    meals_total: number;
    delivery_days: number[];
    delivery_slot: string;
  } | null>(null);

  // Delivery Schedule Configuration State
  interface DeliveryScheduleConfig {
    active_days: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
    delivery_time_slot: string;
    mode: "mon_thu" | "mon_wed_fri" | "everyday" | "custom";
  }

  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryScheduleConfig>({
    active_days: [1, 4], // Monday (1) & Thursday (4) - Clean Food CR store schedule
    delivery_time_slot: "11:00 - 13:00",
    mode: "mon_thu",
  });
  const [promotionsList, setPromotionsList] = useState<any[]>([]);
  const [selectedPromoPresetId, setSelectedPromoPresetId] = useState<string>("pinto_7d_15m");

  const STANDARD_PINTO_PRESETS = [
    { id: 'pinto_7d_15m', name: 'ผูกปิ่นโต 7 วัน (15 มื้อ)', meals_count: 15, days_count: 7, price: 999, popular: true, tag: 'ทดลองทาน 🔥', desc: 'จัดส่ง 3 รอบ: 6 + 6 + 3 ถุง (จันทร์ & พฤหัสฯ)' },
    { id: 'pinto_14d_30m', name: 'ผูกปิ่นโต 14 วัน (30 มื้อ)', meals_count: 30, days_count: 14, price: 1899, popular: true, tag: 'ยอดนิยม ⭐', desc: 'จัดส่ง 5 รอบ: รอบละ 6 ถุง (จันทร์ & พฤหัสฯ)' },
    { id: 'pinto_30d_63m', name: 'ผูกปิ่นโต 1 เดือน (63 มื้อ)', meals_count: 63, days_count: 30, price: 3999, popular: false, tag: 'สุดคุ้ม ⭐️', desc: 'จัดส่ง 11 รอบ: 10 รอบละ 6 ถุง + 1 รอบ 3 ถุง' },
    { id: 'promo_4box', name: 'โปรโมชั่น 4 กล่อง (299 บ.)', meals_count: 4, days_count: 1, price: 299, popular: false, tag: 'โปร 4 กล่อง', desc: 'เฉลี่ยกล่องละ ฿74.75' },
    { id: 'promo_6box', name: 'โปรโมชั่น 6 กล่อง (399 บ.)', meals_count: 6, days_count: 1, price: 399, popular: false, tag: 'โปร 6 กล่อง', desc: 'เฉลี่ยกล่องละ ฿66.50' },
    { id: 'promo_7box', name: 'โปรโมชั่น 7 กล่อง (459 บ.)', meals_count: 7, days_count: 1, price: 459, popular: false, tag: 'โปร 7 กล่อง', desc: 'เฉลี่ยกล่องละ ฿65.57' },
    { id: 'custom', name: 'กำหนดเอง (Custom Plan)', meals_count: 15, days_count: 7, price: 0, popular: false, tag: 'กำหนดเอง', desc: 'ระบุชื่อและจำนวนมื้อเอง' },
  ];

  // Modal State: New Package
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [isAdvancedTemplateModalOpen, setIsAdvancedTemplateModalOpen] = useState(false);
  const [newPackage, setNewPackage] = useState<{
    member_id: string;
    package_name: string;
    meals_total: number;
    price: number;
    promotion_id: string;
    start_date: string;
    end_date: string;
    is_custom: boolean;
    delivery_days: number[];
    delivery_slot: string;
  }>({
    member_id: "",
    package_name: "ผูกปิ่นโต 7 วัน (15 มื้อ)",
    meals_total: 15,
    price: 999,
    promotion_id: "",
    start_date: dayjs().format("YYYY-MM-DD"),
    end_date: dayjs().add(7, "day").format("YYYY-MM-DD"),
    is_custom: false,
    delivery_days: [1, 4], // Monday (1) & Thursday (4) by default
    delivery_slot: "11:00 - 13:00",
  });

  // Search & Filter State
  const [menuSearch, setMenuSearch] = useState("");
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [sidebarSortBy, setSidebarSortBy] = useState<"latest" | "name">(
    "latest",
  );
  const [sidebarFilterType, setSidebarFilterType] = useState<
    "all" | "member" | "retail"
  >("all");
  const [lastOrderDates, setLastOrderDates] = useState<Record<string, string>>(
    {},
  );
  const [retailSchedules, setRetailSchedules] = useState<any[]>([]);

  const { menus } = useMenuStore();
  const { activePackages, members, loadMemberData, updateProfile, addPackage } =
    useMemberStore();
  const {
    memberSchedules,
    selectedPackageId,
    setSelectedPackageId,
    loadMemberPlanner,
    assignMemberSlot,
    removeMemberSlot,
    copyDayPlan,
    pasteDayPlan,
    clearDayPlan,
    copiedDaySlots,
    clearCopiedPlan,
    hasUnsavedChanges,
    saveChanges,
    isSaving,
    isLoading,
    initialWeekSubscriptionQty,
  } = usePlannerStore();

  // Fetch Delivery Schedule Config
  useEffect(() => {
    let isMounted = true;
    const fetchDeliverySchedule = async () => {
      try {
        const { data } = await supabase
          .from('erp_system_configs')
          .select('value')
          .eq('key', 'DELIVERY_SCHEDULE')
          .maybeSingle();
        if (data && data.value && isMounted) {
          setDeliveryConfig(data.value as DeliveryScheduleConfig);
        }
      } catch (err) {
        console.warn("Could not load delivery schedule config:", err);
      }
    };
    fetchDeliverySchedule();
    return () => { isMounted = false; };
  }, []);

  // Fetch Active Promotions from Database
  useEffect(() => {
    let isMounted = true;
    const fetchPromos = async () => {
      try {
        const { data, error } = await supabase
          .from('promotions')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true });
        if (data && !error && isMounted) {
          setPromotionsList(data);
        }
      } catch (err) {
        console.warn("Could not load promotions:", err);
      }
    };
    fetchPromos();
    return () => { isMounted = false; };
  }, []);

  // Fetch template categories
  useEffect(() => {
    let isMounted = true;
    const fetchTemplateCats = async () => {
      const { data } = await supabase.from('erp_system_configs').select('value').eq('key', 'TEMPLATE_CATEGORIES').single();
      if (data && data.value && isMounted) {
        setTemplateCategories(data.value as any[]);
      }
    };
    fetchTemplateCats();
    return () => { isMounted = false; };
  }, []);

  // Fetch retail schedules for the current week to show badges for unselected retail members
  useEffect(() => {
    let isMounted = true;
    const fetchRetailSchedules = async () => {
      if (!currentWeekStart) return;
      try {
        const startStr = dayjs(currentWeekStart).format("YYYY-MM-DD");
        const endStr = dayjs(currentWeekStart).add(6, "day").format("YYYY-MM-DD");
        
        const { data, error } = await supabase
          .from("erp_member_meal_schedules")
          .select("member_id, delivery_date, quantity")
          .is("package_id", null)
          .gte("delivery_date", startStr)
          .lte("delivery_date", endStr);
          
        if (!error && data && isMounted) {
          setRetailSchedules(data);
        }
      } catch (err) {
        console.error("Error fetching retail schedules:", err);
      }
    };
    
    fetchRetailSchedules();
    return () => {
      isMounted = false;
    };
  }, [currentWeekStart, hasUnsavedChanges]);

  const getDayColorClass = (dayName: string, isToday: boolean) => {
    if (isToday) return "text-white";
    if (dayName.includes("จันทร์")) return "text-amber-500";
    if (dayName.includes("อังคาร")) return "text-pink-500";
    if (dayName.includes("พุธ")) return "text-emerald-500";
    if (dayName.includes("พฤหัสบดี")) return "text-orange-500";
    if (dayName.includes("ศุกร์")) return "text-sky-500";
    if (dayName.includes("เสาร์")) return "text-purple-500";
    if (dayName.includes("อาทิตย์")) return "text-red-500";
    return "text-slate-400";
  };

  const weekDays = getWeekDays(currentWeekStart);

  const handlePrevWeek = () =>
    setCurrentWeekStart(dayjs(currentWeekStart).subtract(1, "week").toDate());
  const handleNextWeek = () =>
    setCurrentWeekStart(dayjs(currentWeekStart).add(1, "week").toDate());

  const handleApplyTemplateToMember = async (config: {
    category: string;
    startDate: string;
    templateWeek: number | "all";
    overwriteRule: "skip" | "overwrite";
    fillUntilDepleted: boolean;
  }) => {
    if (!config.category || !selectedPackageId) return;

    const pkg = activePackages.find((p) => p.id === selectedPackageId);
    if (pkg) {
      const { applyTemplateToMember } = usePlannerStore.getState();
      await applyTemplateToMember(pkg.id, pkg.member_id, config.category, config);
    }
  };

  const filteredPackages = useMemo(() => {
    // 1. Identify retail members
    const packageMembersIds = new Set(activePackages.map((p) => p.member_id));
    const retailMembersWithoutPackages = members.filter(
      (m) => m.member_type === "retail" && !packageMembersIds.has(m.id),
    );

    // 3. Create virtual packages
    const virtualRetailPackages: PintoPackage[] =
      retailMembersWithoutPackages.map((m) => ({
        id: `retail_${m.id}`,
        member_id: m.id,
        package_name: "ออเดอร์รายย่อย (No Package)",
        meals_total: 0,
        meals_remaining: 0,
        days_total: 0,
        days_remaining: 0,
        start_date: m.created_at || new Date().toISOString(),
        end_date: dayjs().add(1, "year").toISOString(),
        status: "active" as const,
        members: m,
        created_at: m.created_at || new Date().toISOString(),
      }));

    // 4. Pre-calculate metrics and filter
    const allPkgs = [...activePackages, ...virtualRetailPackages];

    return allPkgs
      .map((pkg) => {
        const member = Array.isArray(pkg.members)
          ? pkg.members[0]
          : pkg.members;
        if (member?.is_banned) return null;

        const name = member?.full_name || "";
        const phone = member?.phone || "";
        const query = sidebarSearchQuery.toLowerCase();
        const matchesSearch =
          name.toLowerCase().includes(query) || phone.includes(query);

        if (!matchesSearch) return null;

        const isRetail =
          member?.member_type === "retail" ||
          pkg.id.toString().startsWith("retail_");
        if (sidebarFilterType === "member" && isRetail) return null;
        if (sidebarFilterType === "retail" && !isRetail) return null;

        // Calculate metrics using package state (much faster)
        const remaining = pkg.meals_remaining ?? 0;
        const lastOrderDate = lastOrderDates[pkg.id];
        const hasFutureOrders = lastOrderDate ? !dayjs(lastOrderDate).isBefore(dayjs().startOf("day")) : false;
        const isPinned = remaining > 0 || hasFutureOrders;
        const isActive = pkg.status === "active" || remaining > 0;

        return {
          pkg,
          isPinned,
          isActive,
          name,
          createdAt: pkg.created_at ? dayjs(pkg.created_at).valueOf() : 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        // Pinned members (with remaining meals or future orders) come FIRST
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        // Active members come next
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;

        if (sidebarSortBy === "name") {
          return a.name.localeCompare(b.name, "th");
        } else {
          // Newest packages first
          return b.createdAt - a.createdAt;
        }
      })
      .map((item) => item.pkg);
  }, [
    activePackages,
    sidebarSearchQuery,
    sidebarSortBy,
    sidebarFilterType,
    members,
    memberSchedules,
    lastOrderDates,
  ]);

  const selectedPackage = filteredPackages.find(
    (p) => p.id === selectedPackageId,
  );

  // Fetch Schedules: Global View
  useEffect(() => {
    if (!selectedPackageId && currentWeekStart) {
      const startStr = dayjs(currentWeekStart).format("YYYY-MM-DD");
      const endStr = dayjs(currentWeekStart).add(6, "day").format("YYYY-MM-DD");
      loadMemberPlanner(startStr, endStr, undefined);
    }
  }, [currentWeekStart, selectedPackageId]);

  // Fetch Schedules: Package View (Load everything at once for instant week navigation)
  useEffect(() => {
    if (selectedPackageId) {
      // Fetch a wide range (e.g. 1 year) so we don't need to load when changing weeks
      const startStr = dayjs().subtract(3, 'month').format('YYYY-MM-DD');
      const endStr = dayjs().add(9, 'month').format('YYYY-MM-DD');
      loadMemberPlanner(startStr, endStr, selectedPackageId);
    }
  }, [selectedPackageId]);

  useEffect(() => {
    // Only refetch from DB when there are no unsaved changes (e.g. after save completes or initial load)
    if (hasUnsavedChanges) return;

    let isMounted = true;
    const fetchLastDates = async () => {
      if (activePackages.length === 0) return;

      try {
        const { data, error } = await supabase
          .from("erp_member_meal_schedules")
          .select("package_id, delivery_date")
          .in(
            "package_id",
            activePackages.map((p) => p.id),
          );

        if (error) throw error;
        if (data && isMounted) {
          const map: Record<string, string> = {};
          data.forEach((s) => {
            if (
              !map[s.package_id] ||
              dayjs(s.delivery_date).isAfter(dayjs(map[s.package_id]))
            ) {
              map[s.package_id] = s.delivery_date;
            }
          });
          setLastOrderDates(map);
        }
      } catch (err) {
        console.error("Error fetching last order dates:", err);
      }
    };

    fetchLastDates();
    return () => {
      isMounted = false;
    };
  }, [activePackages, hasUnsavedChanges]); // Refetch when packages change or when save completes

  // Auto-deselect if member gets banned
  useEffect(() => {
    const member = selectedPackage
      ? Array.isArray(selectedPackage.members)
        ? selectedPackage.members[0]
        : selectedPackage.members
      : null;
    if (selectedPackageId && member?.is_banned) {
      setSelectedPackageId(null);
      toast.info("สมาชิกคนนี้ถูกระงับ ระบบจะย้ายคุณออกจากหน้านี้");
    }
  }, [selectedPackage, selectedPackageId, setSelectedPackageId]);

  const projectedRemaining = useMemo(() => {
    if (!selectedPackage) return 0;

    // DB value is the source of truth for all SAVED schedules across all time
    const dbRemaining = selectedPackage.meals_remaining ?? 0;

    // For the active package, we adjust the DB value by the "Net Change" in the current week view
    // Net Change = Current Subscription Quantity - Initial Saved Quantity for this week
    const currentWeekSubQty = memberSchedules
      .filter(
        (s) =>
          s.package_id === selectedPackage.id &&
          !s.is_extra_order &&
          !s.is_compensatory,
      )
      .reduce((sum, s) => sum + (s.quantity || 1), 0);

    const delta = currentWeekSubQty - initialWeekSubscriptionQty;

    return dbRemaining - delta;
  }, [selectedPackage, memberSchedules, initialWeekSubscriptionQty]);

  const getSchedulesForDate = (date: string): MemberMealSchedule[] => {
    return memberSchedules
      .filter(
        (s) => s.delivery_date === date && s.package_id === selectedPackageId,
      )
      .sort((a, b) => {
        const numA = parseInt(a.meal_type.split("_")[1]) || 0;
        const numB = parseInt(b.meal_type.split("_")[1]) || 0;
        return numA - numB;
      });
  };

  const openModal = (date: string, existingSchedule?: MemberMealSchedule) => {
    setMenuSearch("");
    if (existingSchedule) {
      setEditingSlot({
        scheduleId: existingSchedule.id,
        date,
        mealType: existingSchedule.meal_type,
        menuId: existingSchedule.menu_item_id,
        qty: existingSchedule.quantity || 1,
        deliveryTime: existingSchedule.delivery_time || "",
        notes: (existingSchedule.notes || "")
          .replace("[ไม่รับข้าว] ", "")
          .replace("[ไม่รับข้าว]", "")
          .trim(),
        isExtraOrder: existingSchedule.is_extra_order || false,
        orderType: existingSchedule.meal_order_type || "subscription",
        isNoRice: existingSchedule.notes?.includes("[ไม่รับข้าว]") || false,
        boxSize: existingSchedule.box_size || "regular",
        isCompensatory: existingSchedule.is_compensatory || false,
      });
    } else {
      const currentSchedules = getSchedulesForDate(date);
      const usedTypes = currentSchedules.map((s) => s.meal_type);
      let nextType: string = "meal_1";
      for (let i = 1; i <= 20; i++) {
        const currentType = `meal_${i}`;
        if (!usedTypes.includes(currentType as any)) {
          nextType = currentType;
          break;
        }
      }

      setEditingSlot({
        scheduleId: null,
        date,
        mealType: nextType,
        menuId: "",
        qty: 1,
        deliveryTime: "",
        notes: "",
        isExtraOrder: false,
        orderType: "subscription",
        isNoRice: false,
        boxSize: "regular",
        isCompensatory: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!editingSlot || !selectedPackage) return;
    if (!editingSlot.menuId) {
      alert("กรุณาเลือกรายการเมนูอาหาร");
      return;
    }

    await assignMemberSlot(
      editingSlot.scheduleId,
      selectedPackage.id,
      selectedPackage.member_id,
      editingSlot.date,
      editingSlot.mealType,
      editingSlot.menuId,
      editingSlot.qty,
      editingSlot.deliveryTime,
      editingSlot.isNoRice
        ? `[ไม่รับข้าว] ${editingSlot.notes}`.trim()
        : editingSlot.notes,
      editingSlot.isExtraOrder,
      editingSlot.orderType,
      editingSlot.boxSize,
      editingSlot.isCompensatory,
    );

    setIsModalOpen(false);
    toast.success(editingSlot.scheduleId ? "บันทึกการแก้ไขเมนูเรียบร้อย ✨" : "เพิ่มเมนูอาหารเรียบร้อย ✨");
  };

  const handleClearDay = async (date: string, packageId: string) => {
    const result = await Swal.fire({
      title: "ล้างแผนทั้งหมดของวันนี้?",
      text: "รายการอาหารทั้งหมดในวันนี้จะถูกลบทิ้ง",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ใช่, ลบทั้งหมด",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      await clearDayPlan(date, packageId);
      toast.success("ล้างแผนอาหารของวันนี้เรียบร้อย ✨");
    }
  };

  const handleOpenProfile = () => {
    if (!selectedPackage?.members) return;
    const currentMember = Array.isArray(selectedPackage.members)
      ? selectedPackage.members[0]
      : selectedPackage.members;

    setMemberUpdates({ ...currentMember });
    const initialDeliveryDays = (selectedPackage.delivery_days && selectedPackage.delivery_days.length > 0)
      ? selectedPackage.delivery_days
      : (currentMember?.preferred_delivery_days && currentMember.preferred_delivery_days.length > 0)
        ? currentMember.preferred_delivery_days
        : [1, 4];

    setPackageUpdates({
      package_name: selectedPackage.package_name,
      meals_total: selectedPackage.meals_total,
      delivery_days: initialDeliveryDays,
      delivery_slot: selectedPackage.delivery_slot || '11:00 - 13:00',
    });
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedPackage?.members || !memberUpdates || !packageUpdates) return;

    const confirmResult = await Swal.fire({
      title: "ยืนยันการบันทึก?",
      text: "ข้อมูลสมาชิกและแพ็กเกจจะถูกอัปเดตใหม่ทันที",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ยืนยัน บันทึกเลย",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const currentMemberId = Array.isArray(selectedPackage.members)
        ? selectedPackage.members[0]?.id
        : selectedPackage.members.id;

      // 1. Update Member Profile
      await updateProfile(currentMemberId, {
        ...memberUpdates,
        preferred_delivery_days: packageUpdates.delivery_days,
      });

      const rounds = calculateDeliveryRounds(packageUpdates.meals_total, 6);

      // 2. Update Package Details (if needed)
      const { error } = await supabase
        .from("pinto_packages")
        .update({
          package_name: packageUpdates.package_name,
          meals_total: packageUpdates.meals_total,
          delivery_days: packageUpdates.delivery_days,
          delivery_slot: packageUpdates.delivery_slot,
          delivery_rounds: rounds.length,
          delivery_rounds_plan: rounds,
        })
        .eq("id", selectedPackage.id);

      if (error) throw new Error(error.message);

      // 3. Trigger Absolute Sync to fix remaining balance
      const allPackageSchedules = await fetchMemberSchedules(
        "2020-01-01",
        "2030-12-31",
        selectedPackage.id,
      );
      const totalSubscriptionUsed = allPackageSchedules
        .filter((s) => !s.is_extra_order)
        .reduce((sum, s) => sum + (s.quantity || 1), 0);
      const newRemaining = packageUpdates.meals_total - totalSubscriptionUsed;

      await supabase
        .from("pinto_packages")
        .update({ meals_remaining: newRemaining })
        .eq("id", selectedPackage.id);

      // 4. Refresh All Master Data to reflect everywhere
      await loadMemberData();

      setIsProfileModalOpen(false);
      toast.success("บันทึกข้อมูลสมาชิกและแพ็กเกจเรียบร้อย ✨");
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleSelectPreset = (preset: any) => {
    setSelectedPromoPresetId(preset.id);
    if (preset.id === 'custom') {
      setNewPackage(prev => ({
        ...prev,
        is_custom: true,
        promotion_id: '',
      }));
    } else {
      setNewPackage(prev => ({
        ...prev,
        package_name: preset.name,
        meals_total: preset.meals_count || 14,
        price: preset.price || 0,
        promotion_id: preset.id && !preset.id.startsWith('pinto_') && !preset.id.startsWith('promo_') ? preset.id : '',
        is_custom: false,
        end_date: dayjs(prev.start_date).add(preset.days_count || 14, 'day').format('YYYY-MM-DD'),
      }));
    }
  };

  const handleAddPackage = async () => {
    if (!newPackage.member_id) {
      toast.warning("กรุณาเลือกชื่อลูกค้าที่จะเปิดแพ็กเกจ");
      return;
    }

    if (!newPackage.package_name) {
      toast.warning("กรุณาระบุชื่อแพ็กเกจหรือเลือกโปรโมชั่น");
      return;
    }

    try {
      const daysCount = Math.max(
        1,
        dayjs(newPackage.end_date).diff(dayjs(newPackage.start_date), "day")
      );

      const meals = Number(newPackage.meals_total) || 15;
      const rounds = calculateDeliveryRounds(meals, 6);
      const deliveryDays = newPackage.delivery_days?.length ? newPackage.delivery_days : [1, 4];

      await addPackage({
        member_id: newPackage.member_id,
        package_name: newPackage.package_name,
        meals_total: meals,
        meals_remaining: meals,
        days_total: daysCount,
        days_remaining: daysCount,
        start_date: newPackage.start_date,
        end_date: newPackage.end_date,
        price_paid: Number(newPackage.price) || 0,
        promotion_id: newPackage.promotion_id || undefined,
        status: "active",
        delivery_days: deliveryDays,
        delivery_rounds: rounds.length,
        delivery_rounds_plan: rounds,
        delivery_slot: newPackage.delivery_slot || "11:00 - 13:00",
      });

      setIsAddPackageModalOpen(false);
      toast.success(`เปิดแพ็กเกจ "${newPackage.package_name}" (${getDeliveryPlanSummary(rounds)}) เรียบร้อยแล้ว ✨`);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleRemoveClick = async (e: React.MouseEvent, scheduleId: string) => {
    e.stopPropagation();

    const result = await Swal.fire({
      title: "ลบมื้อนี้ใช่ไหม?",
      text: "คุณจะไม่สามารถกู้คืนข้อมูลมื้อนี้ได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ใช่, ลบทันที",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      await removeMemberSlot(scheduleId);
      setIsModalOpen(false);
      toast.success("ลบรายการมื้อนี้เรียบร้อย ✨");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden relative">
      {/* Floating Unsaved Changes Alert Action Bar */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 text-white flex items-center justify-between gap-4 z-50 shadow-lg shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-base animate-bounce">⚠️</span>
              <p className="text-xs sm:text-sm font-bold">
                มีการเปลี่ยนแปลงแผนอาหารที่ยังไม่ได้บันทึก
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await saveChanges();
                const startStr = dayjs(currentWeekStart).format("YYYY-MM-DD");
                const endStr = dayjs(currentWeekStart)
                  .add(6, "day")
                  .format("YYYY-MM-DD");
                await loadMemberPlanner(
                  startStr,
                  endStr,
                  selectedPackageId || undefined,
                  true,
                );
              }}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-1.5 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isSaving ? (
                <Clock className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}
              <span>{isSaving ? "กำลังบันทึก..." : "บันทึกแผนงานทั้งหมด 💾"}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden relative">
        <div
          className={`w-full ${isSidebarCollapsed ? "md:w-0 md:opacity-0 overflow-hidden" : "md:w-72 md:opacity-100"} bg-white md:border-r border-slate-200 z-10 absolute md:relative inset-0 transition-all duration-300 ${selectedPackage ? "-translate-x-full md:translate-x-0" : "translate-x-0"} flex flex-col overflow-y-auto overflow-x-hidden`}
        >
          <div className="p-4 border-b border-slate-100 space-y-3 min-w-[288px] md:sticky md:top-0 bg-white z-20">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-normal uppercase tracking-widest text-slate-400">
                ลูกค้าที่กำลังดูแล
              </h3>
              <div className="flex items-center gap-2">
                <button title="Button" type="button"
                  onClick={() => setIsSmartImportOpen(true)}
                  className="bg-indigo-50 hover:bg-indigo-500 hover:text-white text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-normal flex items-center gap-1 transition-all border border-indigo-200"
                >
                  <Wand2 size={12} /> นำเข้าออเดอร์
                </button>
                <button title="Button" type="button"
                  onClick={() => setIsAddPackageModalOpen(true)}
                  className="bg-slate-100 hover:bg-emerald-500 hover:text-white text-slate-600 px-2 py-1 rounded-lg text-[10px] font-normal flex items-center gap-1 transition-all border border-slate-200"
                >
                  <Plus size={12} /> เพิ่ม
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input title="Input field"
                  type="text"
                  placeholder="ค้นหาชื่อลูกค้า..."
                  value={sidebarSearchQuery}
                  onChange={(e) => setSidebarSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-normal focus:border-emerald-500 outline-none transition-all"
                />
                {sidebarSearchQuery && (
                  <button title="Button" type="button"
                    onClick={() => setSidebarSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1">
                <button title="Button" type="button"
                  onClick={() => {
                    setSidebarSortBy("latest");
                    setSidebarFilterType("all");
                  }}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${sidebarSortBy === "latest" && sidebarFilterType === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
                >
                  ล่าสุด
                </button>
                <div className="w-[1px] bg-slate-200 my-1"></div>
                <button title="Button" type="button"
                  onClick={() => setSidebarFilterType("member")}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${sidebarFilterType === "member" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400"}`}
                >
                  สมาชิก
                </button>
                <button title="Button" type="button"
                  onClick={() => setSidebarFilterType("retail")}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${sidebarFilterType === "retail" ? "bg-orange-500 text-white shadow-sm" : "text-slate-400"}`}
                >
                  รายย่อย
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 p-2 space-y-1 custom-scrollbar">
            {filteredPackages.length === 0 && (
              <div className="text-center p-6 text-slate-400 text-xs font-normal">
                ไม่พบข้อมูลลูกค้า
              </div>
            )}
            {Object.values(
              filteredPackages.reduce((acc: any, pkg) => {
                const mId = pkg.member_id;
                if (!acc[mId]) {
                  acc[mId] = {
                    member: Array.isArray(pkg.members)
                      ? pkg.members[0]
                      : pkg.members,
                    packages: [],
                  };
                }
                acc[mId].packages.push(pkg);
                return acc;
              }, {}),
            ).map((group: any) => (
              <div key={group.member.id} className="mb-3">
                <div className="px-3 py-1.5 text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 mb-1">
                  <User size={15} className="text-emerald-600 shrink-0" />{" "}
                  <span className="truncate">{group.member.full_name}</span>
                  {group.member.phone && <span className="text-[11px] text-slate-400 font-normal ml-auto shrink-0">({group.member.phone})</span>}
                </div>
                <div className="space-y-1">
                  {group.packages.map((pkg: any) => {
                    const isSelected = selectedPackageId === pkg.id;

                    // IF selected: use the reactive projected calculation from the component
                    // IF NOT selected: use the DB value directly
                    const rem = isSelected
                      ? projectedRemaining
                      : (pkg.meals_remaining ?? 0);

                    const pkgSchedules = memberSchedules.filter(
                      (s) => s.package_id === pkg.id,
                    );
                    const subSchedules = pkgSchedules.filter(
                      (s) => !s.is_extra_order,
                    );

                    const today = dayjs().startOf("day");
                    const lastOrderDate = lastOrderDates[pkg.id];
                    const hasFutureOrders = lastOrderDate
                      ? !dayjs(lastOrderDate).isBefore(today)
                      : false;
                    const isPinned = rem > 0 || hasFutureOrders;

                    const member = Array.isArray(pkg.members)
                      ? pkg.members[0]
                      : pkg.members;
                    const isRetail =
                      member?.member_type === "retail" ||
                      pkg.id.toString().startsWith("retail_");

                    let statusBadgeClass =
                      "bg-slate-100 text-slate-700 border border-slate-200";
                    const isPkgLoading = isLoading && isSelected;
                    let statusText = isPkgLoading
                      ? "..."
                      : `เหลือ ${rem}/${pkg.meals_total || 0} มื้อ`;

                    if (isRetail) {
                      const sourceSchedules = isSelected 
                        ? pkgSchedules 
                        : retailSchedules.filter(s => s.member_id === member.id);
                        
                      const activeOrders = sourceSchedules
                        .filter((s) => !dayjs(s.delivery_date).isBefore(today))
                        .reduce((sum, s) => sum + (s.quantity || 1), 0);
                      statusBadgeClass =
                        activeOrders > 0
                          ? "bg-orange-500 text-white border border-orange-600 shadow-sm"
                          : "bg-slate-100 text-slate-400 border border-slate-200";
                      statusText =
                        activeOrders > 0
                          ? `สั่งไว้ ${activeOrders} มื้อ`
                          : "ไม่มีออเดอร์";
                    } else if (rem < 0) {
                      statusBadgeClass =
                        "bg-red-500 text-white border border-red-600";
                      statusText = `เกินมา ${Math.abs(rem)} มื้อ`;
                    } else if (rem === 0) {
                      statusBadgeClass =
                        "bg-slate-50 text-slate-400 border border-slate-100";
                    } else if (rem < 3) {
                      statusBadgeClass =
                        "bg-red-50 text-red-600 border border-red-100 animate-pulse";
                    } else if (
                      pkg.meals_total === 14 ||
                      pkg.meals_total === 15
                    ) {
                      statusBadgeClass =
                        "bg-emerald-50 text-emerald-700 border border-emerald-200";
                    } else if (
                      pkg.meals_total === 28 ||
                      pkg.meals_total === 30
                    ) {
                      statusBadgeClass =
                        "bg-blue-50 text-blue-700 border border-blue-200";
                    } else if (
                      pkg.meals_total === 60 ||
                      pkg.meals_total === 62 ||
                      pkg.meals_total === 63
                    ) {
                      statusBadgeClass =
                        "bg-purple-50 text-purple-700 border border-purple-200";
                    }

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all border relative overflow-hidden group ${
                          selectedPackageId === pkg.id
                            ? "bg-emerald-50 border-emerald-500 shadow-md ring-1 ring-emerald-500/20"
                            : isPinned
                              ? "bg-white border-emerald-100 shadow-sm"
                              : "bg-white border-transparent hover:bg-slate-50"
                        }`}
                      >
                        {/* Status Indicator Bar */}
                        {isPinned && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        )}

                        <div className="flex justify-between items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isPinned && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -45 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  className="bg-emerald-500 text-white p-1 rounded-lg shadow-sm shadow-emerald-500/20 shrink-0"
                                >
                                  <Pin size={10} fill="white" />
                                </motion.div>
                              )}
                              <p
                                className={`text-sm font-semibold truncate ${selectedPackageId === pkg.id ? "text-emerald-800" : "text-slate-800"}`}
                              >
                                {pkg.package_name}
                              </p>
                            </div>
                            {rem > 0 && subSchedules.length > 0 && (
                              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                <span>สิ้นสุดประมาณ:</span>
                                <span className="text-blue-600 font-semibold">
                                  {(() => {
                                    const lastPlannedDate = subSchedules.reduce(
                                      (max, s) =>
                                        dayjs(s.delivery_date).isAfter(max)
                                          ? dayjs(s.delivery_date)
                                          : max,
                                      dayjs("1900-01-01"),
                                    );
                                    const mealsPerWeek =
                                      subSchedules.length > 7 ? 14 : 10;
                                    const daysLeft = Math.ceil(
                                      rem / (mealsPerWeek / 7),
                                    );
                                    return lastPlannedDate
                                      .add(daysLeft, "day")
                                      .format("DD/MM/YYYY");
                                  })()}
                                </span>
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap shadow-xs border ${statusBadgeClass}`}
                          >
                            {statusText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedPackage ? (
          <div
            className={`flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-[#F8FAFC] absolute md:relative inset-0 z-20 transition-transform ${selectedPackage ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}
          >
            <div className="px-3 md:px-6 py-2.5 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-2 border-b border-slate-200 bg-white shadow-xs shrink-0 md:sticky md:top-0 z-30">
              {(() => {
                const member = Array.isArray(selectedPackage.members)
                  ? selectedPackage.members[0]
                  : selectedPackage.members;
                const isRetail =
                  member?.member_type === "retail" ||
                  selectedPackage.id.toString().startsWith("retail_");

                const packageSchedules = memberSchedules.filter(
                  (s) => s.package_id === selectedPackage.id,
                );
                const totalSubscriptionOrdered = packageSchedules
                  .filter((s) => !s.is_extra_order)
                  .reduce((sum, s) => sum + (s.quantity || 1), 0);

                return (
                  <div className="flex flex-col xl:flex-row flex-1 justify-between items-start xl:items-center gap-4 min-w-0">
                    {/* Left Group: Info + Stats */}
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 min-w-0">
                      <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button title="Button" type="button"
                          onClick={() => setSelectedPackageId(null)}
                          className="md:hidden bg-slate-100 p-2 rounded-xl text-slate-600 shrink-0"
                        >
                          <ChevronLeft size={18} />
                        </button>

                        <button title="Button" type="button"
                          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                          className="hidden md:flex bg-slate-50 hover:bg-emerald-50 border border-slate-200 p-2 rounded-xl text-slate-400 hover:text-emerald-500 transition-all shrink-0"
                        >
                          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                        </button>

                        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 shrink-0 shadow-xs">
                          <User size={18} />
                        </div>
                        
                        <div className="min-w-0 flex-1 sm:flex-initial">
                          <div className="flex items-center gap-2">
                            <h3
                              onClick={handleOpenProfile}
                              className="text-lg md:text-xl font-bold text-slate-900 truncate cursor-pointer hover:text-emerald-600 tracking-tight"
                            >
                              {member?.full_name}
                            </h3>
                            {member?.health_goal && (
                              <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                                {member?.health_goal}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            <span className="text-xs md:text-sm font-semibold text-slate-700 truncate max-w-[120px] md:max-w-none">{selectedPackage.package_name}</span>
                            <div className="flex items-center gap-1 text-xs md:text-sm text-slate-600 font-medium">
                               <Clock size={13} className="text-slate-400" />
                               <span>{member?.delivery_time || "ไม่ระบุรอบส่ง"}</span>
                            </div>
                            <div className="hidden md:flex items-center gap-1 text-xs md:text-sm text-slate-600 font-normal">
                               <MapPin size={13} className="text-slate-400" />
                               <span className="truncate max-w-[160px]">{member?.address || "ไม่ระบุที่อยู่"}</span>
                            </div>
                            <button title="Button" type="button" onClick={handleOpenProfile} className="text-xs md:text-sm text-emerald-600 font-semibold hover:underline">รายละเอียด</button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                        <span
                          className={`text-xs md:text-sm font-bold px-3 py-1.5 rounded-xl border shadow-xs ${
                            isRetail
                              ? "bg-orange-500 text-white border-orange-600"
                              : projectedRemaining < 0
                                ? "bg-red-500 text-white border-red-600"
                                : projectedRemaining < 3
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : "bg-slate-900 text-white border-slate-900"
                          }`}
                        >
                          {isRetail ? `สั่งไว้ ${totalSubscriptionOrdered} มื้อ` : isLoading ? "..." : `ลงแล้ว ${(selectedPackage.meals_total || 0) - projectedRemaining} / ${selectedPackage.meals_total || 0} มื้อ`}
                        </span>

                        {packageSchedules.some(s => s.is_compensatory) && (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 shadow-xs flex items-center gap-1">
                            🎁 ชดเชย {packageSchedules.filter(s => s.is_compensatory).reduce((sum, s) => sum + (s.quantity || 1), 0)}
                          </span>
                        )}

                        <button title="Button" type="button"
                          onClick={async () => {
                            setIsAuditModalOpen(true);
                            setIsAuditLoading(true);
                            try {
                              const { data, error } = await supabase
                                .from("erp_member_meal_schedules")
                                .select(`id, package_id, delivery_date, meal_type, quantity, is_extra_order, is_compensatory, menu_items (name)`)
                                .eq("package_id", selectedPackage.id)
                                .order("delivery_date", { ascending: true });
                              if (error) throw error;
                              setAllPackageSchedules(data as any);
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setIsAuditLoading(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 hover:text-indigo-600 border border-slate-200 rounded-xl text-xs md:text-sm font-semibold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                        >
                          <Search size={13} className="text-slate-400" /> ตรวจสอบมื้ออาหาร
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto mt-1 xl:mt-0">
                <button title="Button" type="button"
                  onClick={() => setCurrentWeekStart(dayjs().startOf("isoWeek" as any).toDate())}
                  className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition-all hover:bg-slate-50 active:scale-95 shadow-xs"
                >
                  วันนี้
                </button>

                <div className="flex shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAdvancedTemplateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold transition-all hover:bg-indigo-100 active:scale-95 shadow-xs"
                  >
                    <Wand2 size={14} /> ดึงเมนูจากแม่แบบ...
                  </button>
                </div>

                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs shrink-0">
                  <button title="Button" type="button" onClick={handlePrevWeek} className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors"><ChevronLeft size={16} /></button>
                  <span className="px-3 text-xs md:text-sm font-semibold text-slate-900 min-w-[110px] text-center border-x border-slate-100">
                    {formatDisplayDate(weekDays[0].date)}
                  </span>
                  <button title="Button" type="button" onClick={handleNextWeek} className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors"><ChevronRight size={16} /></button>
                </div>

                {copiedDaySlots && (
                  <button type="button"
                    onClick={clearCopiedPlan}
                    className="p-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl shrink-0 transition-all active:scale-90"
                    title="ยกเลิกการคัดลอก"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 p-4 md:p-6">
              <div
                className={`grid gap-4 ${isSidebarCollapsed ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7" : "grid-cols-1 xl:grid-cols-7"}`}
              >
                {weekDays.map((day) => {
                  const daySchedules = getSchedulesForDate(day.date);
                  const dayOfWeek = dayjs(day.date).isoWeekday(); // 1=Mon ... 7=Sun
                  
                  // Package-specific delivery days or store default [1, 4]
                  const pkgDeliveryDays = (selectedPackage?.delivery_days && selectedPackage.delivery_days.length > 0)
                    ? selectedPackage.delivery_days
                    : (selectedPackage?.members?.preferred_delivery_days && selectedPackage.members.preferred_delivery_days.length > 0)
                      ? selectedPackage.members.preferred_delivery_days
                      : deliveryConfig.active_days;
                  const isDeliveryDay = pkgDeliveryDays.includes(dayOfWeek);

                  // Calculate scheduled round and bag count for this package if active
                  let roundInfo: any = null;
                  if (selectedPackage && selectedPackage.meals_total > 0 && selectedPackage.start_date) {
                    const rList = calculateDeliveryRounds(selectedPackage.meals_total, 6);
                    const scheduleList = generateDeliverySchedule(
                      selectedPackage.start_date,
                      rList,
                      pkgDeliveryDays
                    );
                    roundInfo = scheduleList.find((r) => r.deliveryDate === day.date);
                  }

                  return (
                    <div key={day.date} className="flex flex-col h-full">
                      <div
                        className={`bg-white rounded-2xl border ${
                          day.isToday
                            ? "border-blue-400 shadow-md ring-2 ring-blue-500/10"
                            : isDeliveryDay
                              ? roundInfo?.isRemainder
                                ? "border-amber-300 shadow-sm ring-1 ring-amber-400/20"
                                : "border-emerald-200/90 shadow-sm"
                              : "border-slate-200/80 shadow-2xs opacity-95"
                        } overflow-hidden flex flex-col h-full group/card transition-all`}
                      >
                        {/* Card Header with Integrated Actions */}
                        <div
                          className={`px-4 py-3 border-b flex justify-between items-center transition-colors ${
                            day.isToday
                              ? "bg-blue-600 text-white shadow-inner"
                              : isDeliveryDay
                                ? roundInfo?.isRemainder
                                  ? "bg-amber-50/70 border-amber-200 group-hover/card:bg-amber-50/90"
                                  : "bg-emerald-50/60 border-emerald-100 group-hover/card:bg-emerald-50/90"
                                : "bg-slate-50 border-slate-100 group-hover/card:bg-slate-100"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p
                                className={`text-[13px] font-bold uppercase tracking-widest ${getDayColorClass(day.dayName, day.isToday)}`}
                              >
                                {day.dayName}
                              </p>
                              {isDeliveryDay ? (
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                  day.isToday
                                    ? "bg-white/20 text-white border border-white/30"
                                    : roundInfo?.isRemainder
                                      ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                }`}>
                                  <Truck size={10} /> 
                                  {roundInfo ? `รอบ ${roundInfo.roundNumber} (${roundInfo.quantity} ถุง)${roundInfo.isRemainder ? ' [เศษ]' : ''}` : 'วันส่ง'}
                                </span>
                              ) : (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-500">
                                  พักส่ง
                                </span>
                              )}
                            </div>
                            <h3
                              className={`text-base md:text-lg font-bold ${day.isToday ? "text-white" : "text-slate-800"}`}
                            >
                              {day.shortDate}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1">
                            {(daySchedules.length > 0 || copiedDaySlots) && (
                              <div
                                className={`flex items-center rounded-xl p-1 gap-0.5 border ${day.isToday ? "bg-white/20 backdrop-blur-md border-white/20 shadow-lg" : "bg-slate-100 border-slate-200 shadow-sm"}`}
                              >
                                <button type="button"
                                  onClick={() =>
                                    handleClearDay(day.date, selectedPackage.id)
                                  }
                                  className={`p-1.5 rounded-lg transition-all ${day.isToday ? "hover:bg-red-500 hover:text-white" : "hover:bg-red-50 text-slate-500 hover:text-red-500"}`}
                                  title="ล้างแผนทั้งหมด"
                                >
                                  <Trash2 size={14} />
                                </button>

                                <button type="button"
                                  onClick={() => copyDayPlan(day.date)}
                                  className={`p-1.5 rounded-lg transition-all ${day.isToday ? "hover:bg-blue-600 hover:text-white" : "hover:bg-blue-50 text-slate-500 hover:text-blue-600"}`}
                                  title="คัดลอกแผนวันนี"
                                >
                                  <Copy size={14} />
                                </button>
                                {copiedDaySlots && (
                                  <button type="button"
                                    onClick={() =>
                                      pasteDayPlan(
                                        day.date,
                                        selectedPackage.id,
                                        selectedPackage.member_id,
                                      )
                                    }
                                    className={`p-1.5 rounded-lg transition-all ${
                                      day.isToday
                                        ? "bg-white text-blue-600 hover:bg-white shadow-sm"
                                        : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/20"
                                    } ${daySchedules.length === 0 ? "animate-bounce" : ""}`}
                                    title="วางเมนูที่คัดลอกมา"
                                  >
                                    <ClipboardIcon size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-3 space-y-2 flex-1 flex flex-col bg-slate-50/50">
                          {daySchedules.map((schedule, idx) => (
                            <div
                              key={schedule.id}
                              onClick={() => openModal(day.date, schedule)}
                              className={`relative flex flex-col p-3 rounded-2xl border cursor-pointer shadow-2xs transition-all duration-200 group ${
                                schedule.is_extra_order
                                  ? "bg-amber-50/80 border-amber-200 hover:border-amber-400 shadow-amber-100/50"
                                  : "bg-white border-slate-200/80 hover:border-emerald-400 hover:shadow-xs"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="bg-slate-800 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                    มื้อ {idx + 1}
                                  </span>
                                  {schedule.is_extra_order && (
                                    <span className="bg-amber-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                                      สั่งแยก
                                    </span>
                                  )}
                                  {schedule.is_compensatory && (
                                    <span className="bg-pink-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                                      ชดเชย 🎁
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {isAdmin && (
                                    <button type="button"
                                      onClick={(e) =>
                                        handleRemoveClick(e, schedule.id)
                                      }
                                      className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                                      title="ลบมื้อนี้"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0 mb-1.5">
                                <h4 className="text-[13px] sm:text-sm font-normal text-slate-800 leading-relaxed line-clamp-2">
                                  {schedule.menu_items?.name || "ไม่ได้เลือกเมนู"}
                                </h4>
                                {schedule.notes && (
                                  <div className="mt-1.5 p-1.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-1.5 shadow-2xs">
                                    <MessageSquare
                                      size={11}
                                      className="text-rose-600 mt-0.5 shrink-0"
                                    />
                                    <p className="text-xs font-normal text-rose-700 leading-normal">
                                      {schedule.notes}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                  {schedule.delivery_time && (
                                    <span className="text-[11px] font-normal text-blue-600 flex items-center gap-1">
                                      <Clock size={10} />{" "}
                                      {schedule.delivery_time}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-normal text-slate-400">
                                  x{schedule.quantity || 1}
                                </span>
                              </div>
                            </div>
                          ))}

                          <button title="Button" type="button"
                            onClick={() => openModal(day.date)}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-emerald-500 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                          >
                            <Plus size={16} />
                            <span>เพิ่มเมนู</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-[#F8FAFC]">
            <div className="text-center opacity-40">
              <User size={64} className="mx-auto mb-4 text-slate-400" />
              <h2 className="text-2xl font-normal text-slate-800">
                โปรดเลือกลูกค้าทางซ้ายมือ
              </h2>
              <p className="text-slate-500 font-normal mt-2">
                เพื่อเริ่มจัดเมนูอาหารให้ลูกค้าแต่ละท่าน
              </p>
            </div>
          </div>
        )}
      </div>

      {isProfileModalOpen && memberUpdates && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="text-emerald-500" />{" "}
                  รายละเอียดลูกค้าและแพ็กเกจ
                </h3>
                <p className="text-slate-500 text-xs font-medium mt-1">
                  อัปเดตข้อมูลส่วนตัวและเป้าหมายสุขภาพ
                </p>
              </div>
              <button title="Button" type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="p-2 hover:bg-white rounded-full transition-all text-slate-400 shadow-sm border border-transparent hover:border-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 ml-0.5 block">
                    ชื่อ-นามสกุล
                  </label>
                  <input title="Input field"
                    type="text"
                    value={memberUpdates.full_name}
                    onChange={(e) =>
                      setMemberUpdates({
                        ...memberUpdates,
                        full_name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 ml-0.5 block">
                    เบอร์โทรศัพท์
                  </label>
                  <input title="Input field"
                    type="text"
                    value={memberUpdates.phone}
                    onChange={(e) =>
                      setMemberUpdates({
                        ...memberUpdates,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 ml-0.5 block">
                  ที่อยู่จัดส่ง
                </label>
                <textarea
                  rows={2}
                  value={memberUpdates.address || ""}
                  onChange={(e) =>
                    setMemberUpdates({
                      ...memberUpdates,
                      address: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-slate-900 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-800 ml-0.5 block">
                    ชื่อแพ็กเกจ
                  </label>
                  <input title="Input field"
                    type="text"
                    value={packageUpdates?.package_name}
                    onChange={(e) =>
                      setPackageUpdates({
                        ...packageUpdates!,
                        package_name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-semibold text-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-800 ml-0.5 block">
                    จำนวนมื้อทั้งหมด
                  </label>
                  <input title="Input field"
                    type="number"
                    value={packageUpdates?.meals_total}
                    onChange={(e) =>
                      setPackageUpdates({
                        ...packageUpdates!,
                        meals_total: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Delivery Days & Rounds Settings for Package */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase">
                    <Truck size={14} className="text-emerald-600" />
                    วันจัดส่ง & รอบส่งอาหาร (แพ็กเกจนี้)
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-xs">
                    {formatActiveDaysLabel(packageUpdates?.delivery_days || [1, 4])}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>เลือกวันจัดส่ง (ค่าเริ่มต้น: จันทร์ & พฤหัสบดี)</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPackageUpdates({
                            ...packageUpdates!,
                            delivery_days: [1, 4],
                          })
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                          (packageUpdates?.delivery_days?.length === 2 &&
                            packageUpdates.delivery_days.includes(1) &&
                            packageUpdates.delivery_days.includes(4))
                            ? "bg-emerald-600 text-white font-bold"
                            : "bg-white text-slate-600 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        จันทร์ & พฤหัสฯ (ร้าน)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPackageUpdates({
                            ...packageUpdates!,
                            delivery_days: [1, 3, 5],
                          })
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                          (packageUpdates?.delivery_days?.length === 3 &&
                            packageUpdates.delivery_days.includes(1) &&
                            packageUpdates.delivery_days.includes(3) &&
                            packageUpdates.delivery_days.includes(5))
                            ? "bg-emerald-600 text-white font-bold"
                            : "bg-white text-slate-600 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        จ/พ/ศ
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {[
                      { day: 1, name: "จันทร์", short: "จ" },
                      { day: 2, name: "อังคาร", short: "อ" },
                      { day: 3, name: "พุธ", short: "พ" },
                      { day: 4, name: "พฤหัสฯ", short: "พฤ" },
                      { day: 5, name: "ศุกร์", short: "ศ" },
                      { day: 6, name: "เสาร์", short: "ส" },
                      { day: 7, name: "อาทิตย์", short: "อา" },
                    ].map(({ day, short, name }) => {
                      const isSelected = (packageUpdates?.delivery_days || [1, 4]).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const current = packageUpdates?.delivery_days || [1, 4];
                            let next: number[];
                            if (isSelected) {
                              if (current.length === 1) {
                                toast.warning("ต้องเลือกวันจัดส่งอย่างน้อย 1 วัน");
                                return;
                              }
                              next = current.filter((d) => d !== day);
                            } else {
                              next = [...current, day].sort((a, b) => a - b);
                            }
                            setPackageUpdates({
                              ...packageUpdates!,
                              delivery_days: next,
                            });
                          }}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                              : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                          }`}
                          title={name}
                        >
                          <span>{short}</span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-transparent"}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      รอบเวลาจัดส่งแพ็กเกจ
                    </label>
                    <select
                      value={packageUpdates?.delivery_slot || "11:00 - 13:00"}
                      onChange={(e) => {
                        setPackageUpdates({
                          ...packageUpdates!,
                          delivery_slot: e.target.value,
                        });
                        setMemberUpdates({
                          ...memberUpdates,
                          delivery_time: e.target.value,
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium text-slate-800"
                    >
                      <option value="11:00 - 13:00">11:00 - 13:00 (รอบเที่ยง)</option>
                      <option value="15:00 - 17:00">15:00 - 17:00 (รอบเย็น)</option>
                      <option value="09:00 - 11:00">09:00 - 11:00 (รอบเช้า)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      แผนรอบจัดส่งคำนวณอัตโนมัติ
                    </label>
                    <div className="p-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                      {getDeliveryPlanSummary(
                        calculateDeliveryRounds(packageUpdates?.meals_total || 0, 6)
                      )}
                    </div>
                  </div>
                </div>

                {/* Round remainder badge breakdown */}
                {(() => {
                  const rounds = calculateDeliveryRounds(packageUpdates?.meals_total || 0, 6);
                  if (rounds.length === 0) return null;
                  return (
                    <div className="pt-2 border-t border-emerald-200/60">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 mb-1.5 flex items-center justify-between">
                        <span>รอบส่ง ({rounds.length} รอบ | สูงสุด 6 ถุง/รอบ)</span>
                        <span className="font-normal text-slate-500">รวม {packageUpdates?.meals_total} มื้อ</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-0.5">
                        {rounds.map((roundQty, idx) => {
                          const isRemainder = roundQty < 6;
                          return (
                            <span
                              key={idx}
                              className={`px-2 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 border ${
                                isRemainder
                                  ? "bg-amber-100/90 text-amber-900 border-amber-300"
                                  : "bg-emerald-100/80 text-emerald-900 border-emerald-200"
                              }`}
                            >
                              <span>รอบ {idx + 1}:</span>
                              <span>{roundQty} ถุง</span>
                              {isRemainder && (
                                <span className="text-[9px] bg-amber-200 text-amber-800 px-1 py-0.2 rounded">รอบเศษ</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 ml-0.5 block">
                    เป้าหมายสุขภาพ
                  </label>
                  <select title="Select option"
                    value={memberUpdates.health_goal}
                    onChange={(e) =>
                      setMemberUpdates({
                        ...memberUpdates,
                        health_goal: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium text-slate-900"
                  >
                    <option value="">ไม่ระบุ</option>
                    <option value="ลดน้ำหนัก">ลดน้ำหนัก</option>
                    <option value="เพิ่มกล้ามเนื้อ">เพิ่มกล้ามเนื้อ</option>
                    <option value="เพื่อสุขภาพ">เพื่อสุขภาพ</option>
                    <option value="คุมอาหาร">คุมอาหาร</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 ml-0.5 block">
                    รอบเวลาจัดส่ง
                  </label>
                  <input title="Input field"
                    type="text"
                    value={memberUpdates.delivery_time || ""}
                    onChange={(e) =>
                      setMemberUpdates({
                        ...memberUpdates,
                        delivery_time: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 ml-0.5 block">
                  แพ้อาหาร / สิ่งที่ไม่ทาน
                </label>
                <input title="Input field"
                  type="text"
                  value={memberUpdates.allergies || ""}
                  onChange={(e) =>
                    setMemberUpdates({
                      ...memberUpdates,
                      allergies: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-slate-900"
                  placeholder="เช่น ไม่ทานเผ็ด, แพ้ถั่ว"
                />
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button title="Button" type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-white transition-all shadow-sm"
              >
                ยกเลิก
              </button>
              <button title="Button" type="button"
                onClick={handleSaveProfile}
                className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isModalOpen && editingSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="text-emerald-500" />{" "}
                  {editingSlot.scheduleId ? "แก้ไขเมนูอาหาร" : "เพิ่มเมนูอาหาร"}
                </h3>
                <p className="text-slate-500 text-xs font-medium mt-1">
                  วันที่{" "}
                  {dayjs(editingSlot.date).locale("th").format("DD MMMM YYYY")}
                </p>
              </div>
              <button title="Button" type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-full transition-all text-slate-400 shadow-sm border border-transparent hover:border-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="space-y-4">
                <div className="relative group">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"
                    size={18}
                  />
                  <input title="Input field"
                    type="text"
                    placeholder="ค้นหาชื่อเมนู..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar border-b border-slate-100 pb-4">
                  {menus
                    .filter((m) =>
                      m.name.toLowerCase().includes(menuSearch.toLowerCase()),
                    )
                    .map((menu) => (
                      <button title="Button" type="button"
                        key={menu.id}
                        onClick={() =>
                          setEditingSlot({ ...editingSlot, menuId: menu.id })
                        }
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          editingSlot.menuId === menu.id
                            ? "bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500/10"
                            : "bg-white border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${editingSlot.menuId === menu.id ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}
                        >
                          <UtensilsCrossed size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-normal truncate ${editingSlot.menuId === menu.id ? "text-emerald-700 font-medium" : "text-slate-800"}`}
                          >
                            {menu.name}
                          </p>
                          <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">
                            {menu.category}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 ml-0.5 block">
                    มื้อที่
                  </label>
                  <select title="Select option"
                    value={editingSlot.mealType}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        mealType: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium text-slate-900"
                  >
                    {[...Array(20)].map((_, i) => (
                      <option key={i + 1} value={`meal_${i + 1}`}>
                        มื้อที่ {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 ml-0.5 block">
                    จำนวน (ชุด)
                  </label>
                  <input title="Input field"
                    type="number"
                    min="1"
                    value={editingSlot.qty}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        qty: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 ml-0.5 block">
                    รอบเวลาส่ง
                  </label>
                  <input title="Input field"
                    type="text"
                    placeholder="เช่น 11:00 - 13:00"
                    value={editingSlot.deliveryTime}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        deliveryTime: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium text-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 ml-0.5 block">
                    ประเภทออเดอร์
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 h-[42px]">
                    <button title="Button" type="button"
                      onClick={() =>
                        setEditingSlot({
                          ...editingSlot,
                          isExtraOrder: false,
                          orderType: "subscription",
                        })
                      }
                      className={`flex-1 rounded-lg text-xs font-bold transition-all ${!editingSlot.isExtraOrder ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}
                    >
                      ในแพ็กเกจ
                    </button>
                    <button title="Button" type="button"
                      onClick={() =>
                        setEditingSlot({
                          ...editingSlot,
                          isExtraOrder: true,
                          orderType: "a-la-carte",
                        })
                      }
                      className={`flex-1 rounded-lg text-xs font-bold transition-all ${editingSlot.isExtraOrder ? "bg-orange-500 text-white shadow-sm" : "text-slate-500"}`}
                    >
                      สั่งแยก
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl cursor-pointer group hover:bg-blue-100/70 transition-all">
                  <input title="Input field"
                    type="checkbox"
                    checked={editingSlot.isNoRice}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        isNoRice: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded-lg border-blue-300 text-blue-600 focus:ring-blue-500 transition-all"
                  />
                  <div>
                    <span className="text-sm font-bold text-blue-700 block">
                      🍚 ไม่รับข้าว (Nutritional Adjustment)
                    </span>
                    <span className="text-[10px] text-blue-500 font-normal">
                      ระบบจะหักลบแคลอรี่และคาร์บในสรุปสารอาหารให้อัตโนมัติ
                    </span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl cursor-pointer group hover:bg-orange-100 transition-all">
                  <input title="Input field"
                    type="checkbox"
                    checked={editingSlot.isCompensatory}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        isCompensatory: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded-lg border-orange-300 text-orange-600 focus:ring-orange-500 transition-all"
                  />
                  <div>
                    <span className="text-sm font-bold text-orange-700 block">
                      🎁 มื้อชดเชย / แถมพิเศษ
                    </span>
                    <span className="text-[10px] text-orange-500 font-normal">
                      ระบบจะไม่นำมื้อนี้ไปหักออกจากจำนวนมื้อรวมในแพ็กเกจ
                    </span>
                  </div>
                </label>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    โน้ตเพิ่มเติม
                  </label>
                  <textarea
                    placeholder="เช่น ไม่เอาถั่ว, ไม่เอาผักชี..."
                    rows={2}
                    value={editingSlot.notes || ""}
                    onChange={(e) =>
                      setEditingSlot({ ...editingSlot, notes: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-normal resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button title="Button" type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-normal hover:bg-white transition-all shadow-sm"
              >
                ยกเลิก
              </button>
              <button title="Button" type="button"
                onClick={handleSaveModal}
                className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-normal hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                {editingSlot.scheduleId ? "บันทึกการแก้ไข" : "เพิ่มเมนูทันที"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isAddPackageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="text-emerald-500" size={22} /> เปิดแพ็กเกจใหม่ให้ลูกค้า
                </h3>
                <p className="text-slate-500 text-xs font-normal mt-1">
                  เลือกลูกค้าและโปรโมชั่น ระบบจะคำนวณจำนวนมื้อ ราคา และวันที่สิ้นสุดให้อัตโนมัติ
                </p>
              </div>
              <button title="Button" type="button"
                onClick={() => setIsAddPackageModalOpen(false)}
                className="p-2 hover:bg-white rounded-full transition-all text-slate-400 shadow-sm border border-transparent hover:border-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              {/* Step 1: Select Member */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                  <User size={13} className="text-emerald-600" />
                  <span>1. เลือกลูกค้าที่จะเปิดแพ็กเกจ</span>
                </label>
                <select title="Select option"
                  value={newPackage.member_id}
                  onChange={(e) =>
                    setNewPackage({ ...newPackage, member_id: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium text-slate-900"
                >
                  <option value="">-- โปรดเลือกชื่อลูกค้า --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.phone || "ไม่มีเบอร์"}) {m.health_goal ? `[${m.health_goal}]` : ""}
                    </option>
                  ))}
                </select>
                {newPackage.member_id && (() => {
                  const selectedMember = members.find(m => m.id === newPackage.member_id);
                  if (!selectedMember) return null;
                  return (
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{selectedMember.address || "ไม่ระบุที่อยู่"}</span>
                      <span className="ml-auto text-emerald-600 font-semibold shrink-0">
                        {selectedMember.delivery_time || "รอบ 11:00-13:00"}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Step 2: Select Preset / Promotion */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                    <Tag size={13} className="text-emerald-600" />
                    <span>2. เลือกโปรโมชั่น / แพ็กเกจมาตรฐาน (คำนวณอัตโนมัติ)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">คลิกเพื่อเลือกทันที</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Database Promotions if available */}
                  {promotionsList.length > 0 && promotionsList.map((promo) => {
                    const isSelected = selectedPromoPresetId === promo.id;
                    const pricePerMeal = promo.meals_count > 0 && promo.price ? (promo.price / promo.meals_count).toFixed(1) : null;
                    return (
                      <button
                        key={promo.id}
                        type="button"
                        onClick={() => handleSelectPreset({
                          id: promo.id,
                          name: promo.name,
                          meals_count: promo.meals_count || 14,
                          days_count: promo.days_count || 14,
                          price: promo.price || 0,
                          promotion_id: promo.id,
                        })}
                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20"
                            : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {promo.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-emerald-700">
                            {promo.meals_count || 14} มื้อ ({promo.days_count || 14} วัน)
                          </span>
                          <span className="font-bold text-slate-900">
                            ฿{Number(promo.price || 0).toLocaleString()}
                          </span>
                        </div>
                        {pricePerMeal && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            เฉลี่ยมื้อละ ฿{pricePerMeal}
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Standard Presets */}
                  {STANDARD_PINTO_PRESETS.map((preset) => {
                    const isSelected = selectedPromoPresetId === preset.id;
                    const pricePerMeal = preset.meals_count > 0 && preset.price > 0 ? (preset.price / preset.meals_count).toFixed(1) : null;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20"
                            : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {preset.name}
                          </span>
                          {preset.tag && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                              {preset.tag}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-emerald-700">
                            {preset.meals_count} มื้อ ({preset.days_count} วัน)
                          </span>
                          {preset.price > 0 ? (
                            <span className="font-bold text-slate-900">
                              ฿{preset.price.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400">กรอกเอง</span>
                          )}
                        </div>
                        {pricePerMeal && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            เฉลี่ยมื้อละ ฿{pricePerMeal}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom fields if Custom mode selected */}
              {newPackage.is_custom && (
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
                      ชื่อแพ็กเกจ (กำหนดเอง)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ผูกปิ่นโตพิเศษ 20 มื้อ"
                      value={newPackage.package_name}
                      onChange={(e) => setNewPackage({ ...newPackage, package_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
                        จำนวนมื้อรวม
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newPackage.meals_total}
                        onChange={(e) => setNewPackage({ ...newPackage, meals_total: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
                        ราคาแพ็กเกจ (บาท)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newPackage.price}
                        onChange={(e) => setNewPackage({ ...newPackage, price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1">
                    <Calendar size={12} className="text-emerald-600" /> วันที่เริ่มสัญญา
                  </label>
                  <input title="Input field"
                    type="date"
                    value={newPackage.start_date}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const currentDays = dayjs(newPackage.end_date).diff(dayjs(newPackage.start_date), "day") || 14;
                      setNewPackage({
                        ...newPackage,
                        start_date: newStart,
                        end_date: dayjs(newStart).add(currentDays, "day").format("YYYY-MM-DD"),
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-medium text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1">
                    <Calendar size={12} className="text-emerald-600" /> วันที่สิ้นสุดสัญญา (โดยประมาณ)
                  </label>
                  <input title="Input field"
                    type="date"
                    value={newPackage.end_date}
                    onChange={(e) =>
                      setNewPackage({
                        ...newPackage,
                        end_date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Step 3.5: Delivery Schedule & Dynamic Rounds */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Truck size={14} className="text-emerald-600" />
                    กำหนดวันจัดส่ง & รอบส่งอาหาร
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    {formatActiveDaysLabel(newPackage.delivery_days || [1, 4])}
                  </span>
                </div>

                {/* Day Selector Pills */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>เลือกวันจัดส่ง (ค่าเริ่มต้น: จันทร์ & พฤหัสบดี)</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNewPackage({ ...newPackage, delivery_days: [1, 4] })}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                          (newPackage.delivery_days?.length === 2 && newPackage.delivery_days.includes(1) && newPackage.delivery_days.includes(4))
                            ? "bg-emerald-600 text-white font-bold"
                            : "bg-white text-slate-600 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        จันทร์ & พฤหัสฯ (ร้าน)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPackage({ ...newPackage, delivery_days: [1, 3, 5] })}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                          (newPackage.delivery_days?.length === 3 && newPackage.delivery_days.includes(1) && newPackage.delivery_days.includes(3) && newPackage.delivery_days.includes(5))
                            ? "bg-emerald-600 text-white font-bold"
                            : "bg-white text-slate-600 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        จ/พ/ศ
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {[
                      { day: 1, name: "จันทร์", short: "จ" },
                      { day: 2, name: "อังคาร", short: "อ" },
                      { day: 3, name: "พุธ", short: "พ" },
                      { day: 4, name: "พฤหัสฯ", short: "พฤ" },
                      { day: 5, name: "ศุกร์", short: "ศ" },
                      { day: 6, name: "เสาร์", short: "ส" },
                      { day: 7, name: "อาทิตย์", short: "อา" },
                    ].map(({ day, short, name }) => {
                      const isSelected = (newPackage.delivery_days || []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const current = newPackage.delivery_days || [1, 4];
                            let next: number[];
                            if (isSelected) {
                              if (current.length === 1) {
                                toast.warning("ต้องเลือกวันจัดส่งอย่างน้อย 1 วัน");
                                return;
                              }
                              next = current.filter(d => d !== day);
                            } else {
                              next = [...current, day].sort((a, b) => a - b);
                            }
                            setNewPackage({ ...newPackage, delivery_days: next });
                          }}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                              : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                          }`}
                          title={name}
                        >
                          <span>{short}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-transparent"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      ช่วงเวลาจัดส่ง
                    </label>
                    <select
                      value={newPackage.delivery_slot || "11:00 - 13:00"}
                      onChange={(e) => setNewPackage({ ...newPackage, delivery_slot: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="11:00 - 13:00">11:00 - 13:00 (รอบเที่ยง)</option>
                      <option value="15:00 - 17:00">15:00 - 17:00 (รอบเย็น)</option>
                      <option value="09:00 - 11:00">09:00 - 11:00 (รอบเช้า)</option>
                    </select>
                  </div>

                  {/* Calculated Rounds Plan Preview */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      แผนรอบจัดส่ง ({calculateDeliveryRounds(Number(newPackage.meals_total) || 15, 6).length} รอบ)
                    </label>
                    <div className="p-2 bg-white border border-emerald-200 rounded-xl text-xs font-medium text-slate-700">
                      <div className="text-[11px] font-bold text-emerald-800">
                        {getDeliveryPlanSummary(calculateDeliveryRounds(Number(newPackage.meals_total) || 15, 6))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Rounds Breakdown Pills */}
                {(() => {
                  const rounds = calculateDeliveryRounds(Number(newPackage.meals_total) || 15, 6);
                  const schedule = generateDeliverySchedule(
                    newPackage.start_date, 
                    rounds, 
                    newPackage.delivery_days || [1, 4]
                  );
                  return (
                    <div className="pt-2 border-t border-emerald-200/60">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 mb-1.5 flex items-center justify-between">
                        <span>รายละเอียดถุงในแต่ละรอบ (สูงสุด 6 ถุง/รอบ)</span>
                        <span className="font-normal text-slate-500">รวม {newPackage.meals_total} มื้อ</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-0.5">
                        {rounds.map((roundQty, idx) => {
                          const isRemainder = roundQty < 6;
                          const roundDate = schedule[idx]?.deliveryDate;
                          return (
                            <span
                              key={idx}
                              className={`px-2 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 border ${
                                isRemainder
                                  ? "bg-amber-100/90 text-amber-900 border-amber-300"
                                  : "bg-emerald-100/80 text-emerald-900 border-emerald-200"
                              }`}
                            >
                              <span>รอบ {idx + 1}:</span>
                              <span>{roundQty} ถุง</span>
                              {roundDate && (
                                <span className="text-[10px] opacity-75 font-normal">
                                  ({dayjs(roundDate).format("DD/MM")})
                                </span>
                              )}
                              {isRemainder && (
                                <span className="text-[9px] bg-amber-200 text-amber-800 px-1 py-0.2 rounded">รอบเศษ</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Step 4: Summary Card */}
              <div className="p-4 bg-emerald-950 text-white rounded-2xl shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-300">
                  <span className="flex items-center gap-1">
                    <Check size={14} /> สรุปข้อมูลแพ็กเกจที่จะบันทึก
                  </span>
                  <span className="font-semibold bg-emerald-800/80 text-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                    คำนวณเรียบร้อย
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <h4 className="text-base font-bold text-white truncate">
                    {newPackage.package_name || "ยังไม่ได้เลือกแพ็กเกจ"}
                  </h4>
                  <span className="text-lg font-bold text-emerald-400 shrink-0 ml-2">
                    ฿{Number(newPackage.price || 0).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-800/60 text-xs text-emerald-200">
                  <div>
                    <span className="text-emerald-400 block text-[10px]">จำนวนมื้อรวม</span>
                    <strong className="text-white text-sm font-semibold">{newPackage.meals_total} มื้อ</strong>
                  </div>
                  <div>
                    <span className="text-emerald-400 block text-[10px]">รอบจัดส่ง</span>
                    <strong className="text-white text-sm font-semibold">
                      {calculateDeliveryRounds(Number(newPackage.meals_total) || 15, 6).length} รอบ
                    </strong>
                  </div>
                  <div>
                    <span className="text-emerald-400 block text-[10px]">วันจัดส่ง</span>
                    <strong className="text-white text-xs font-semibold">
                      {formatActiveDaysLabel(newPackage.delivery_days || [1, 4])}
                    </strong>
                  </div>
                  <div>
                    <span className="text-emerald-400 block text-[10px]">เฉลี่ยต่อมื้อ</span>
                    <strong className="text-white text-sm font-semibold">
                      ฿{newPackage.meals_total > 0 && newPackage.price > 0 ? (newPackage.price / newPackage.meals_total).toFixed(1) : "0"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 bg-slate-50/80 border-t border-slate-100 flex gap-3">
              <button title="Button" type="button"
                onClick={() => setIsAddPackageModalOpen(false)}
                className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-white transition-all shadow-sm"
              >
                ยกเลิก
              </button>
              <button title="Button" type="button"
                onClick={handleAddPackage}
                className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus size={16} /> ยืนยันเปิดแพ็กเกจ
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Audit Modal */}
      {isAuditModalOpen && selectedPackage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  ตรวจสอบรายการมื้ออาหาร
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  รายการทั้งหมดที่ระบบใช้คำนวณโควต้า
                </p>
              </div>
              <button title="Button" type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isAuditLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-400">
                    กำลังดึงข้อมูลมื้ออาหารทั้งหมด...
                  </p>
                </div>
              ) : allPackageSchedules.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  ไม่พบรายการมื้ออาหารในแพ็กเกจนี้
                </div>
              ) : (
                allPackageSchedules.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shadow-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800">
                            {dayjs(s.delivery_date).format("DD/MM/YY")}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md font-semibold uppercase">
                            {s.meal_type.replace("meal_", "มื้อ ")}
                          </span>
                        </div>
                        <div className="text-sm font-normal text-slate-850 mt-0.5 truncate max-w-[240px]">
                          {s.menu_items?.name || "ไม่ได้เลือกเมนู"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.is_compensatory && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold">
                          🎁 ชดเชย
                        </span>
                      )}
                      {s.is_extra_order && (
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-xs font-bold">
                          ➕ สั่งแยก
                        </span>
                      )}
                      {!s.is_compensatory && !s.is_extra_order && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200">
                          ✅ มื้อปกติ
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group">
                  <div className="text-xs text-slate-500 font-medium">
                    รวมมื้อปกติ (ทั้งแพ็กเกจ)
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {
                      allPackageSchedules.filter(
                        (s) => !s.is_compensatory && !s.is_extra_order,
                      ).reduce((sum, s) => sum + (s.quantity || 1), 0)
                    }{" "}
                    / {selectedPackage.meals_total}
                  </div>
                  <button type="button"
                    onClick={async () => {
                      try {
                        const totalUsed = allPackageSchedules
                          .filter(
                            (s) => !s.is_extra_order && !s.is_compensatory,
                          )
                          .reduce((sum, s) => sum + (s.quantity || 1), 0);

                        const newRemaining =
                          (selectedPackage.meals_total || 0) - totalUsed;

                        const { error } = await supabase
                          .from("pinto_packages")
                          .update({ meals_remaining: newRemaining })
                          .eq("id", selectedPackage.id);

                        if (error) throw error;

                        // Update local store to reflect change immediately
                        const { activePackages } = useMemberStore.getState();
                        useMemberStore.setState({
                          activePackages: activePackages.map((p) =>
                            p.id === selectedPackage.id
                              ? { ...p, meals_remaining: newRemaining }
                              : p,
                          ),
                        });

                        toast.success(`ปรับยอดคงเหลือเป็น ${newRemaining} มื้อ เรียบร้อยแล้ว ✨`);
                      } catch (err: any) {
                        toast.error("เกิดข้อผิดพลาด: " + err.message);
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                    title="ซิงค์ยอดให้ตรงกับจำนวนมื้อจริง"
                  >
                    <Save size={14} />
                  </button>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] text-slate-500 font-medium">
                    มื้อแถม/ชดเชยรวม
                  </div>
                  <div className="text-lg font-bold text-orange-600">
                    {
                      allPackageSchedules.filter((s) => s.is_compensatory)
                        .reduce((sum, s) => sum + (s.quantity || 1), 0)
                    }
                  </div>
                </div>
              </div>
              <button title="Button" type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
        onImport={async (parsedData) => {
          const payloads = parsedData.items.map(item => ({
            package_id: null,
            member_id: parsedData.memberId,
            delivery_date: item.date,
            meal_type: '1',
            menu_item_id: item.menuId,
            quantity: item.quantity,
          }));
          await bulkImportSchedules(payloads.filter(p => p.member_id && p.menu_item_id));
          const startStr = dayjs(currentWeekStart).format("YYYY-MM-DD");
          const endStr = dayjs(currentWeekStart).add(6, "day").format("YYYY-MM-DD");
          await loadMemberPlanner(startStr, endStr, selectedPackageId || undefined, true);
        }}
      />

      {isAdvancedTemplateModalOpen && selectedPackage && (
        <AdvancedTemplateModal
          isOpen={isAdvancedTemplateModalOpen}
          onClose={() => setIsAdvancedTemplateModalOpen(false)}
          onApply={handleApplyTemplateToMember}
          templateCategories={templateCategories}
          currentWeekStart={currentWeekStart}
        />
      )}
    </div>
  );
};
