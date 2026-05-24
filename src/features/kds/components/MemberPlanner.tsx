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
} from "lucide-react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { supabase } from "../../../config/supabase";
import { usePlannerStore } from "../../../store/plannerStore";
import { useMemberStore } from "../../../store/memberStore";
import { useMenuStore } from "../../../store/menuStore";
import { useAuthStore } from "../../../store/authStore";
import { getWeekDays, formatDisplayDate } from "../../../lib/dateUtils";
import { fetchMemberSchedules, bulkImportSchedules } from "../../../features/kds/api";
import type { MemberMealSchedule, PintoPackage } from "../../../types";
import { SmartImportModal } from "./SmartImportModal";

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
  } | null>(null);

  // Modal State: New Package
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [newPackage, setNewPackage] = useState({
    member_id: "",
    package_name: "",
    meals_total: 14,
    start_date: dayjs().format("YYYY-MM-DD"),
    end_date: dayjs().add(7, "day").format("YYYY-MM-DD"),
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

  const handleApplyTemplateToMember = async (category: string) => {
    if (!category || !selectedPackageId) return;

    const catName =
      category === "normal"
        ? "เมนูปกติ"
        : category === "non_spicy"
          ? "ไม่เผ็ด"
          : category === "no_rice"
            ? "ไม่เอาข้าว"
            : category === "protein_plus"
              ? "เน้นโปรตีน"
              : "เมนูอื่นๆ";

    const result = await Swal.fire({
      title: `ยืนยันลงเมนูจากแม่แบบ (${catName})?`,
      text: `ระบบจะลงเมนูตามแม่แบบหมวด ${catName} ในช่วงสัปดาห์นี้ให้ลูกค้า (ข้อมูลเดิมในสัปดาห์นี้จะถูกเขียนทับ)`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ตกลง, ลงเมนูเลย",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      const pkg = activePackages.find((p) => p.id === selectedPackageId);
      if (pkg) {
        const startStr = dayjs(currentWeekStart).format("YYYY-MM-DD");
        const { applyTemplateToMember } = usePlannerStore.getState();
        await applyTemplateToMember(pkg.id, pkg.member_id, startStr, category);
      }
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

  useEffect(() => {
    if (currentWeekStart && selectedPackageId) {
      const startStr = dayjs(currentWeekStart).format("YYYY-MM-DD");
      const endStr = dayjs(currentWeekStart).add(6, "day").format("YYYY-MM-DD");
      loadMemberPlanner(startStr, endStr, selectedPackageId);
    }
  }, [currentWeekStart, selectedPackageId, loadMemberPlanner]);

  useEffect(() => {
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
  }, [activePackages.length]); // Only refetch when the number of packages changes

  // Auto-deselect if member gets banned
  useEffect(() => {
    const member = selectedPackage
      ? Array.isArray(selectedPackage.members)
        ? selectedPackage.members[0]
        : selectedPackage.members
      : null;
    if (selectedPackageId && member?.is_banned) {
      setSelectedPackageId(null);
      Swal.fire({
        icon: "info",
        title: "สมาชิกถูกระงับ",
        text: "สมาชิกคนนี้ถูกแบนแล้ว ระบบจะย้ายคุณออกจากหน้านี้",
        timer: 2000,
        showConfirmButton: false,
      });
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

    Swal.fire({
      icon: "success",
      title: "บันทึกสำเร็จ",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
    });
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
      Swal.fire({
        icon: "success",
        title: "ล้างแผนเรียบร้อย",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  const handleOpenProfile = () => {
    if (!selectedPackage?.members) return;
    setMemberUpdates({ ...selectedPackage.members });
    setPackageUpdates({
      package_name: selectedPackage.package_name,
      meals_total: selectedPackage.meals_total,
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
      Swal.fire({
        title: "กำลังบันทึกข้อมูล...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // 1. Update Member Profile
      await updateProfile(selectedPackage.members.id, memberUpdates);

      // 2. Update Package Details (if needed)
      const { error } = await supabase
        .from("pinto_packages")
        .update({
          package_name: packageUpdates.package_name,
          meals_total: packageUpdates.meals_total,
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

      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        text: "ข้อมูลสมาชิกและแพ็กเกจได้รับการอัปเดตแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.message,
      });
    }
  };

  const handleAddPackage = async () => {
    if (!newPackage.member_id || !newPackage.package_name) {
      Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณาเลือกชื่อลูกค้าและระบุชื่อแพ็กเกจ",
      });
      return;
    }

    try {
      await addPackage({
        ...newPackage,
        meals_remaining: newPackage.meals_total,
        days_total: dayjs(newPackage.end_date).diff(
          dayjs(newPackage.start_date),
          "day",
        ),
        days_remaining: dayjs(newPackage.end_date).diff(
          dayjs(newPackage.start_date),
          "day",
        ),
        status: "active",
      });

      setIsAddPackageModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "เปิดแพ็กเกจสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.message,
      });
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
      Swal.fire({
        title: "ลบแล้ว!",
        icon: "success",
        timer: 1000,
        showConfirmButton: false,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden relative">
      <div className={`px-4 md:px-6 py-4 border-b border-slate-200 bg-white flex-col lg:flex-row justify-between items-start lg:items-center gap-4 z-10 shadow-sm ${selectedPackage ? 'hidden md:flex' : 'flex'}`}>
        <div>
          <h2 className="text-lg font-normal text-slate-900 tracking-tight flex items-center gap-2">
            <User className="text-emerald-500" /> แผนอาหารรายบุคคล (Member
            Custom Plan)
          </h2>
          <p className="text-xs font-normal text-slate-500 mt-1">
            จัดเมนู สูงสุด 20 มื้อต่อวัน ระบุรอบส่งและโน้ตพิเศษ
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          {hasUnsavedChanges && (
            <button title="Button" type="button"
              onClick={async () => {
                await saveChanges();
                // Refresh the current view to get real IDs from DB
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
              className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-xl text-base font-bold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all animate-bounce-subtle w-full lg:w-auto justify-center"
            >
              {isSaving ? (
                <Clock className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              ยืนยันบันทึกแผนงานทั้งหมด
            </button>
          )}
        </div>
      </div>

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
                <div className="px-3 py-1.5 text-base font-medium text-slate-900 flex items-center gap-2 border-b border-slate-100 mb-1">
                  <User size={16} className="text-emerald-500" />{" "}
                  {group.member.full_name} {group.member.phone && <span className="text-xs text-slate-400 font-normal ml-1">({group.member.phone})</span>}
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
                        "bg-emerald-50 text-emerald-600 border border-emerald-100";
                    } else if (
                      pkg.meals_total === 28 ||
                      pkg.meals_total === 30
                    ) {
                      statusBadgeClass =
                        "bg-blue-50 text-blue-600 border border-blue-100";
                    } else if (
                      pkg.meals_total === 60 ||
                      pkg.meals_total === 62
                    ) {
                      statusBadgeClass =
                        "bg-purple-50 text-purple-600 border border-purple-100";
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
                                className={`text-[15px] font-medium truncate ${selectedPackageId === pkg.id ? "text-emerald-700" : "text-slate-800"}`}
                              >
                                {pkg.package_name}
                              </p>
                            </div>
                            {rem > 0 && subSchedules.length > 0 && (
                              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                <span>สิ้นสุดประมาณ:</span>
                                <span className="text-blue-500 font-bold">
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
                            className={`text-[13px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-sm border ${statusBadgeClass}`}
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
            <div className="px-3 md:px-6 py-1.5 md:py-2 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-2 border-b border-slate-200 bg-white shadow-sm shrink-0 md:sticky md:top-0 z-30">
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
                      <div className="flex items-center gap-2 w-full sm:w-auto">
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

                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                          <User size={16} />
                        </div>
                        
                        <div className="min-w-0 flex-1 sm:flex-initial">
                          <div className="flex items-center gap-2">
                            <h3
                              onClick={handleOpenProfile}
                              className="text-base md:text-lg font-normal text-black truncate cursor-pointer hover:text-emerald-600 tracking-tight"
                            >
                              {member?.full_name}
                            </h3>
                            {member?.health_goal && (
                              <span className="hidden sm:inline-block text-[11px] font-normal px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                {member?.health_goal}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            <span className="text-xs md:text-sm font-normal text-slate-700 truncate max-w-[100px] md:max-w-none">{selectedPackage.package_name}</span>
                            <div className="flex items-center gap-1 text-xs md:text-sm text-slate-700">
                               <Clock size={12} className="text-slate-400" />
                               <span>{member?.delivery_time || "ไม่ระบุรอบส่ง"}</span>
                            </div>
                            <div className="hidden md:flex items-center gap-1 text-xs md:text-sm text-slate-700">
                               <MapPin size={12} className="text-slate-400" />
                               <span className="truncate max-w-[150px]">{member?.address || "ไม่ระบุที่อยู่"}</span>
                            </div>
                            <button title="Button" type="button" onClick={handleOpenProfile} className="text-xs md:text-sm text-emerald-600 font-normal hover:underline">รายละเอียด</button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                        <span
                          className={`text-xs md:text-sm font-normal px-2.5 py-1 rounded-lg border shadow-sm ${
                            isRetail
                              ? "bg-orange-500 text-white border-orange-600"
                              : projectedRemaining < 0
                                ? "bg-red-500 text-white border-red-600"
                                : projectedRemaining < 3
                                  ? "bg-red-50 text-red-600 border-red-100"
                                  : "bg-white text-black border-slate-300"
                          }`}
                        >
                          {isRetail ? `สั่งไว้ ${totalSubscriptionOrdered} มื้อ` : isLoading ? "..." : `ลงแล้ว ${(selectedPackage.meals_total || 0) - projectedRemaining} / ${selectedPackage.meals_total || 0} มื้อ`}
                        </span>

                        {packageSchedules.some(s => s.is_compensatory) && (
                          <span className="text-[10px] font-normal px-2.5 py-1.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 shadow-sm flex items-center gap-1">
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
                          className="px-2.5 py-1 bg-white text-black hover:text-indigo-600 border border-slate-300 rounded-lg text-xs md:text-sm font-normal transition-all shadow-sm flex items-center gap-1 active:scale-95 whitespace-nowrap"
                        >
                          <Search size={12} className="text-slate-400" /> ตรวจสอบข้อมูลมื้ออาหาร
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto mt-1 xl:mt-0">
                <button title="Button" type="button"
                  onClick={() => setCurrentWeekStart(dayjs().startOf("isoWeek" as any).toDate())}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-xl text-xs font-normal transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                >
                  วันนี้
                </button>

                <div className="flex bg-slate-50 rounded-xl border border-slate-300 shrink-0">
                  <select title="Select option"
                    className="bg-transparent text-xs font-normal px-3 py-2 outline-none text-slate-900 cursor-pointer"
                    value=""
                    onChange={(e) => handleApplyTemplateToMember(e.target.value)}
                  >
                    <option value="">ดึงเมนูอัตโนมัติ...</option>
                    <option value="normal">ชุดเมนูปกติ</option>
                    <option value="non_spicy">ชุดไม่เผ็ด</option>
                    <option value="no_rice">ชุดไม่เอาข้าว</option>
                    <option value="protein_plus">ชุดเน้นโปรตีน</option>
                  </select>
                </div>

                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm shrink-0">
                  <button title="Button" type="button" onClick={handlePrevWeek} className="p-1.5 text-slate-500 hover:text-black transition-colors"><ChevronLeft size={16} /></button>
                  <span className="px-3 text-sm font-normal text-slate-900 min-w-[110px] text-center border-x border-slate-100">
                    {formatDisplayDate(weekDays[0].date)}
                  </span>
                  <button title="Button" type="button" onClick={handleNextWeek} className="p-1.5 text-slate-500 hover:text-black transition-colors"><ChevronRight size={16} /></button>
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

                  return (
                    <div key={day.date} className="flex flex-col h-full">
                      <div
                        className={`bg-white rounded-2xl border ${day.isToday ? "border-blue-400 shadow-md ring-2 ring-blue-500/10" : "border-slate-200 shadow-sm"} overflow-hidden flex flex-col h-full group/card transition-all`}
                      >
                        {/* Card Header with Integrated Actions */}
                        <div
                          className={`px-4 py-3 border-b flex justify-between items-center transition-colors ${day.isToday ? "bg-blue-600 text-white shadow-inner" : "bg-slate-50 border-slate-100 group-hover/card:bg-slate-100"}`}
                        >
                          <div>
                            <p
                              className={`text-[13px] font-bold uppercase tracking-widest ${getDayColorClass(day.dayName, day.isToday)}`}
                            >
                              {day.dayName}
                            </p>
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
                              className={`relative flex flex-col p-3 rounded-xl border cursor-pointer shadow-sm transition-all group ${
                                schedule.is_extra_order
                                  ? "bg-orange-50 border-orange-200 hover:border-orange-400 shadow-orange-100/50"
                                  : "bg-white border-slate-200 hover:border-emerald-500"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex flex-wrap gap-1">
                                  {schedule.is_extra_order && (
                                    <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                      สั่งแยก
                                    </span>
                                  )}
                                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                                    มื้อที่ {idx + 1}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 transition-opacity">
                                  {isAdmin && (
                                    <button type="button"
                                      onClick={(e) =>
                                        handleRemoveClick(e, schedule.id)
                                      }
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-100 hover:border-red-200 rounded-lg transition-all shadow-sm bg-white"
                                      title="ลบมื้อนี้"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0 mb-2">
                                <h4 className="text-base font-medium text-slate-800 leading-snug line-clamp-2">
                                  {schedule.menu_items?.name ||
                                    "ไม่ได้เลือกเมนู"}
                                </h4>
                                {schedule.notes && (
                                  <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 shadow-sm">
                                    <MessageSquare
                                      size={12}
                                      className="text-red-500 mt-0.5 shrink-0"
                                    />
                                    <p className="text-[11px] font-bold text-red-600 leading-tight">
                                      {schedule.notes}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                  {schedule.delivery_time && (
                                    <span className="text-[10px] font-medium text-blue-600 flex items-center gap-1">
                                      <Clock size={10} />{" "}
                                      {schedule.delivery_time}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">
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
                <h3 className="text-xl font-normal text-slate-900 flex items-center gap-2">
                  <FileText className="text-emerald-500" />{" "}
                  รายละเอียดลูกค้าและแพ็กเกจ
                </h3>
                <p className="text-slate-500 text-xs font-normal mt-1">
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
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-normal"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-normal"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-normal resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-1">
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
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-normal"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 ml-1">
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
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-normal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-normal"
                  >
                    <option value="">ไม่ระบุ</option>
                    <option value="ลดน้ำหนัก">ลดน้ำหนัก</option>
                    <option value="เพิ่มกล้ามเนื้อ">เพิ่มกล้ามเนื้อ</option>
                    <option value="เพื่อสุขภาพ">เพื่อสุขภาพ</option>
                    <option value="คุมอาหาร">คุมอาหาร</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-normal"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-normal"
                  placeholder="เช่น ไม่ทานเผ็ด, แพ้ถั่ว"
                />
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button title="Button" type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-normal hover:bg-white transition-all shadow-sm"
              >
                ยกเลิก
              </button>
              <button title="Button" type="button"
                onClick={handleSaveProfile}
                className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-normal hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
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
                <h3 className="text-xl font-normal text-slate-900 flex items-center gap-2">
                  <Plus className="text-emerald-500" />{" "}
                  {editingSlot.scheduleId ? "แก้ไขเมนูอาหาร" : "เพิ่มเมนูอาหาร"}
                </h3>
                <p className="text-slate-500 text-xs font-normal mt-1">
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
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-normal"
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
                            className={`text-sm font-normal truncate ${editingSlot.menuId === menu.id ? "text-emerald-700" : "text-slate-800"}`}
                          >
                            {menu.name}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                            {menu.category}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-normal"
                  >
                    {[...Array(20)].map((_, i) => (
                      <option key={i + 1} value={`meal_${i + 1}`}>
                        มื้อที่ {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-normal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-normal"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    ประเภทออเดอร์
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 h-[46px]">
                    <button title="Button" type="button"
                      onClick={() =>
                        setEditingSlot({
                          ...editingSlot,
                          isExtraOrder: false,
                          orderType: "subscription",
                        })
                      }
                      className={`flex-1 rounded-lg text-[10px] font-bold uppercase transition-all ${!editingSlot.isExtraOrder ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"}`}
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
                      className={`flex-1 rounded-lg text-[10px] font-bold uppercase transition-all ${editingSlot.isExtraOrder ? "bg-orange-500 text-white shadow-sm" : "text-slate-400"}`}
                    >
                      สั่งแยก
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <label className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl cursor-pointer group hover:bg-blue-100 transition-all">
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
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-normal text-slate-900 flex items-center gap-2">
                  <Plus className="text-emerald-500" /> เปิดแพ็กเกจใหม่ให้ลูกค้า
                </h3>
                <p className="text-slate-500 text-xs font-normal mt-1">
                  ระบุรายละเอียดสัญญาและจำนวนมื้ออาหาร
                </p>
              </div>
              <button title="Button" type="button"
                onClick={() => setIsAddPackageModalOpen(false)}
                className="p-2 hover:bg-white rounded-full transition-all text-slate-400 shadow-sm border border-transparent hover:border-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                  เลือกลูกค้า
                </label>
                <select title="Select option"
                  value={newPackage.member_id}
                  onChange={(e) =>
                    setNewPackage({ ...newPackage, member_id: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-normal"
                >
                  <option value="">เลือกชื่อลูกค้า...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                  ชื่อแพ็กเกจ
                </label>
                <input title="Input field"
                  type="text"
                  placeholder="เช่น ผูกปิ่นโต 14 วัน (28 มื้อ)"
                  value={newPackage.package_name}
                  onChange={(e) =>
                    setNewPackage({
                      ...newPackage,
                      package_name: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    จำนวนมื้อทั้งหมด
                  </label>
                  <input title="Input field"
                    type="number"
                    value={newPackage.meals_total}
                    onChange={(e) =>
                      setNewPackage({
                        ...newPackage,
                        meals_total: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-normal"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    วันที่เริ่มแพ็กเกจ
                  </label>
                  <input title="Input field"
                    type="date"
                    value={newPackage.start_date}
                    onChange={(e) =>
                      setNewPackage({
                        ...newPackage,
                        start_date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-normal"
                  />
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button title="Button" type="button"
                onClick={() => setIsAddPackageModalOpen(false)}
                className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-normal hover:bg-white transition-all shadow-sm"
              >
                ยกเลิก
              </button>
              <button title="Button" type="button"
                onClick={handleAddPackage}
                className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-normal hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                ยืนยันเปิดแพ็กเกจ
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
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">
                            {dayjs(s.delivery_date).format("DD/MM/YY")}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md font-medium uppercase">
                            {s.meal_type.replace("meal_", "มื้อ ")}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 truncate max-w-[200px]">
                          {s.menu_items?.name || "ไม่ได้เลือกเมนู"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.is_compensatory && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-lg text-[10px] font-bold">
                          🎁 ชดเชย
                        </span>
                      )}
                      {s.is_extra_order && (
                        <span className="px-2 py-0.5 bg-slate-800 text-white rounded-lg text-[10px] font-bold">
                          ➕ สั่งแยก
                        </span>
                      )}
                      {!s.is_compensatory && !s.is_extra_order && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-200">
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
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="text-[10px] text-slate-500 font-medium">
                    รวมมื้อปกติ (ทั้งแพ็กเกจ)
                  </div>
                  <div className="text-lg font-bold text-slate-900">
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

                        await Swal.fire({
                          icon: "success",
                          title: "ซิงค์ข้อมูลสำเร็จ",
                          text: `ปรับยอดคงเหลือเป็น ${newRemaining} มื้อ เรียบร้อยแล้ว`,
                          timer: 1500,
                          showConfirmButton: false,
                        });
                      } catch (err: any) {
                        Swal.fire("Error", err.message, "error");
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
    </div>
  );
};
