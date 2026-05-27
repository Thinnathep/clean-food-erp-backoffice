import React, { useMemo, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat,
  CheckCircle2,
  AlertTriangle,
  Package,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Printer,
  Sparkles,
  Info,
  Power,
  Download,
  Copy,
} from "lucide-react";
import html2canvas from "html2canvas";
import dayjs from "dayjs";
import "dayjs/locale/th";
import { usePlannerStore } from "../../../store/plannerStore";
import { useMemberStore } from "../../../store/memberStore";
import { useKdsStore } from "../../../store/kdsStore";
import { useMenuStore } from "../../../store/menuStore";
import { useAuthStore } from "../../../store/authStore";
import {
  closeKitchenSession,
  updateSchedulesKitchenStatus,
  updateOrdersKitchenStatus,
  fetchBulkRecipes,
} from "../api";
import { supabase } from "../../../config/supabase";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { cn, isUUID } from "../../../lib/utils";
import type { MemberMealSchedule, KdsTask } from "../../../types";
import {
  useSystemStore,
  encodeThaiCP874,
  encodeThaiOverprint,
  renderTextToCanvas,
  convertCanvasToEscPosBytes,
} from "../../../store/systemStore";

const CATEGORY_PRIORITY: Record<string, number> = {
  ของหวาน: 1,
  ทานเล่น: 1.5,
  สลัด: 2,
  ซูวี: 3,
  ซุป: 4,
  ต้ม: 5,
  แกง: 6,
  เส้น: 7,
  ผัด: 8,
  ชุดเซต: 9,
  แพ็กเกจ: 9,
  เมนูหลัก: 10,
  อื่นๆ: 99,
};

const CATEGORY_COLORS: Record<string, string> = {
  ของหวาน: "#E11D48", // rose-600
  ทานเล่น: "#8B5CF6", // violet-500
  สลัด: "#10B981", // emerald-500
  ซูวี: "#4F46E5", // indigo-600
  ซุป: "#0D9488", // teal-600
  ต้ม: "#0D9488",
  แกง: "#0D9488",
  เส้น: "#D97706", // amber-600
  ผัด: "#EA580C", // orange-600
  ชุดเซต: "#475569", // slate-600
  เมนูหลัก: "#475569",
};

const getCategoryBgClass = (category: string) => {
  switch (category) {
    case "ของหวาน":
      return "bg-rose-600";
    case "ทานเล่น":
      return "bg-violet-500";
    case "สลัด":
      return "bg-emerald-500";
    case "ซูวี":
      return "bg-indigo-600";
    case "ซุป":
    case "ต้ม":
    case "แกง":
      return "bg-teal-600";
    case "เส้น":
      return "bg-amber-600";
    case "ผัด":
      return "bg-orange-600";
    case "ชุดเซต":
    case "เมนูหลัก":
      return "bg-slate-600";
    default:
      return "bg-slate-300";
  }
};

const getCategoryTextClass = (category: string) => {
  switch (category) {
    case "ของหวาน":
      return "text-rose-600";
    case "ทานเล่น":
      return "text-violet-500";
    case "สลัด":
      return "text-emerald-500";
    case "ซูวี":
      return "text-indigo-600";
    case "ซุป":
    case "ต้ม":
    case "แกง":
      return "text-teal-600";
    case "เส้น":
      return "text-amber-600";
    case "ผัด":
      return "text-orange-600";
    case "ชุดเซต":
    case "เมนูหลัก":
      return "text-slate-600";
    default:
      return "text-slate-500";
  }
};

const getCategoryBgLightClass = (category: string) => {
  switch (category) {
    case "ของหวาน":
      return "bg-rose-600/20";
    case "ทานเล่น":
      return "bg-violet-500/20";
    case "สลัด":
      return "bg-emerald-500/20";
    case "ซูวี":
      return "bg-indigo-600/20";
    case "ซุป":
    case "ต้ม":
    case "แกง":
      return "bg-teal-600/20";
    case "เส้น":
      return "bg-amber-600/20";
    case "ผัด":
      return "bg-orange-600/20";
    case "ชุดเซต":
    case "เมนูหลัก":
      return "bg-slate-600/20";
    default:
      return "bg-slate-100/20";
  }
};

const getCleanTimeLabel = (rawTime: string) => {
  if (!rawTime) return "ออเดอร์สมาชิกทั่วไป";
  const timeMatch = rawTime.match(/(\d{1,2})[:.](\d{2})/);
  const hour = timeMatch ? parseInt(timeMatch[1]) : -1;
  const isEvening =
    (hour >= 14 && hour <= 21) ||
    rawTime.includes("เย็น") ||
    rawTime.toLowerCase().includes("evening");
  const isMorning =
    (hour >= 4 && hour <= 13) ||
    rawTime.includes("เช้า") ||
    rawTime.toLowerCase().includes("morning");
  const cleanTime = rawTime
    .replace(/รอบเช้า|รอบเย็น|\(Morning\)|\(Evening\)/g, "")
    .trim()
    .replace(/^\(|\)$/g, "");

  if (isEvening) return `รอบเย็น (${cleanTime})`;
  if (isMorning) return `รอบเช้า (${cleanTime})`;
  return rawTime;
};

export const TodayView: React.FC = () => {
  const memberSchedules = usePlannerStore((state) => state.memberSchedules);
  const tasks = useKdsStore((state) => state.tasks);
  const loadMemberPlanner = usePlannerStore((state) => state.loadMemberPlanner);
  const fetchTasks = useKdsStore((state) => state.fetchTasks);
  const menus = useMenuStore((state) => state.menus);
  const loadMasterData = useMemberStore((state) => state.loadMemberData);

  const {
    isKitchenOpen,
    loadSystemSettings,
    printerEnabled,
    bluetoothDevice,
    printToBluetooth,
    serialPort,
    printToSerial,
    thaiCodePage,
    printerMode,
  } = useSystemStore();
  const [parent] = useAutoAnimate();

  useEffect(() => {
    loadSystemSettings();
  }, [loadSystemSettings]);

  useEffect(() => {
    const fetchMealIndices = async () => {
      const pids = Array.from(
        new Set(
          memberSchedules
            .map((s) => s.package_id)
            .filter((pid): pid is string => !!pid && isUUID(pid)),
        ),
      );

      if (pids.length === 0) return;

      try {
        const { data, error } = await supabase
          .from("erp_member_meal_schedules")
          .select("id, package_id, delivery_date, meal_type")
          .in("package_id", pids)
          .eq("is_extra_order", false)
          .order("delivery_date", { ascending: true })
          .order("meal_type", { ascending: true });

        if (error) throw error;

        if (data) {
          const map: Record<string, number> = {};
          const groupedByPackage: Record<string, typeof data> = {};
          data.forEach((row) => {
            if (row.package_id) {
              if (!groupedByPackage[row.package_id]) {
                groupedByPackage[row.package_id] = [];
              }
              groupedByPackage[row.package_id].push(row);
            }
          });

          Object.keys(groupedByPackage).forEach((pid) => {
            const list = groupedByPackage[pid];
            list.forEach((row, idx) => {
              map[row.id] = idx + 1;
            });
          });

          setMealIndices(map);
        }
      } catch (err) {
        console.error("Error fetching meal indices for UI:", err);
      }
    };

    fetchMealIndices();
  }, [memberSchedules]);

  const [filterType, setFilterType] = useState<
    "all" | "member" | "retail" | "extra" | "menu"
  >("all");
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [isSummaryMode, setIsSummaryMode] = useState(false);
  const [summarySearchTerm, setSummarySearchTerm] = useState("");
  const [summaryCategoryFilter, setSummaryCategoryFilter] = useState("all");
  const [selectedSummaryMenu, setSelectedSummaryMenu] = useState<any>(null);
  const [isPrepSummaryOpen, setIsPrepSummaryOpen] = useState(false);
  const [isLoadingPrep, setIsLoadingPrep] = useState(false);
  const [prepSummary, setPrepSummary] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    dayjs().format("YYYY-MM-DD"),
  );
  const [isKitchenMode, setIsKitchenMode] = useState(false);
  const [mealIndices, setMealIndices] = useState<Record<string, number>>({});

  const handlePrintReceipt = async (
    memberName: string,
    time: string,
    item: any,
  ) => {
    if (bluetoothDevice || serialPort) {
      try {
        let finalBytes: Uint8Array;

        if (printerMode === "graphic") {
          const { thaiFont } = useSystemStore.getState();

          // 1. Gather all unique package IDs in this receipt
          const uniquePackageIds = Array.from(
            new Set(
              item.orders
                .map((o: any) => o.packageId)
                .filter((pid: any) => pid),
            ),
          ) as string[];

          // 2. Fetch all scheduled meals for these packages to find the exact global sequence
          const packageSchedulesMap: Record<string, any[]> = {};
          for (const pid of uniquePackageIds) {
            try {
              const { data } = await supabase
                .from("erp_member_meal_schedules")
                .select("id, delivery_date, meal_type")
                .eq("package_id", pid)
                .eq("is_extra_order", false) // Only count regular subscription meals
                .order("delivery_date", { ascending: true })
                .order("meal_type", { ascending: true });

              if (data) {
                packageSchedulesMap[pid] = data;
              }
            } catch (err) {
              console.error(`Error loading schedules for package ${pid}:`, err);
            }
          }

          let fullText =
            "[B] ใบสั่งเตรียมอาหาร KDS\n" +
            "[B] ออเดอร์อาหาร Clean Food CR\n" +
            "--------------------------------\n" +
            `ลูกค้า | คุณ${memberName}\n` +
            (item.dropPointName ? `จุดจัดส่ง | ${item.dropPointName}\n` : "") +
            (time === "ออเดอร์สมาชิกทั่วไป" || time.includes("ลูกค้ารายย่อย") ? "" : `รอบส่ง | ${time}\n`) +
            `วันที่ | ${dayjs(selectedDate).format("DD/MM/YYYY")}\n` +
            `จำนวนกล่อง | ${item.orders.reduce((sum: number, o: any) => sum + o.qty, 0)} กล่อง\n` +
            "--------------------------------\n";

          item.orders.forEach((o: any) => {
            let mealNumText = "";
            if (o.packageId && packageSchedulesMap[o.packageId]) {
              const list = packageSchedulesMap[o.packageId];
              const idx = list.findIndex((s: any) => s.id === o.id);
              if (idx !== -1) {
                mealNumText = ` (มื้อที่ ${idx + 1})`;
              }
            } else if (o.mealType) {
              const matchDigit = String(o.mealType).match(/\d+/);
              mealNumText = matchDigit ? ` (มื้อที่ ${matchDigit[0]})` : "";
            }

            fullText += `[B] ${o.menuName}${mealNumText} | [B] x${o.qty}\n`;

            // Compact individual menu macros (light charcoal italic)
            const mKcal = Math.max(0, o.kcal || 0);
            const mP = Math.max(0, o.protein || 0);
            const mC = Math.max(0, o.carbs || 0);
            const mF = Math.max(0, o.fat || 0);
            if (mKcal > 0 || mP > 0 || mC > 0 || mF > 0) {
              fullText += `   [I] (Cal:${mKcal} P:${mP.toFixed(1)} C:${mC.toFixed(1)} F:${mF.toFixed(1)})\n`;
            }

            if (o.note) {
              fullText += ` *โน้ต: ${o.note}\n`;
            }
          });

          fullText += "--------------------------------\n";
          fullText += `[B] แคลอรี่รวม | [B] ${Math.max(0, item.totalKcal || 0)} KCAL\n`;
          fullText += `โภชนาการ | โปรตีน:${Math.max(0, item.totalP || 0).toFixed(1)}g  คาร์บ:${Math.max(0, item.totalC || 0).toFixed(1)}g  ไขมัน:${Math.max(0, item.totalF || 0).toFixed(1)}g\n`;
          fullText += "--------------------------------\n";

          // Warm thank you greetings in thin italic text
          fullText +=
            "[I][C] *หมายเหตุ: ข้อมูลโภชนาการเป็นค่าประมาณการ\n" +
            "[I][C] อาจจะคลาดเคลื่อนเล็กน้อย\n\n";
          fullText += "[I][C] ขอบคุณที่ให้เราดูแลสุขภาพของคุณนะคะ\n";
          fullText += "[I][C] ทานให้อร่อยและสุขภาพแข็งแรงในทุกๆ วันนะคะ ♥\n";

          const canvas = renderTextToCanvas(fullText, 576, thaiFont);
          const imgBytes = convertCanvasToEscPosBytes(canvas);

          finalBytes = new Uint8Array([
            0x1b,
            0x40, // Initialize
            ...Array.from(imgBytes),
            0x0a,
            0x0a,
            0x0a,
            0x0a, // Feed lines
            0x1d,
            0x56,
            66,
            0x00, // ESC/POS Cut paper command (GS V 66 0)
          ]);
        } else {
          const esc = [
            0x1b,
            0x40, // Initialize
            0x1b,
            0x74,
            thaiCodePage, // Select dynamic Thai code page
            0x1b,
            0x61,
            0x01, // Center align
            0x1b,
            0x21,
            0x10, // Double height for Title
          ];

          const headerBytes = encodeThaiCP874("ใบสั่งเตรียมอาหาร KDS\n");

          let bodyText =
            `สมาชิก: คุณ${memberName}\n` +
            (item.dropPointName ? `จุดจัดส่ง: ${item.dropPointName}\n` : "") +
            (time === "ออเดอร์สมาชิกทั่วไป" || time.includes("ลูกค้ารายย่อย") ? "" : `รอบส่ง: ${time}\n`) +
            `วันที่: ${dayjs(selectedDate).format("DD/MM/YYYY")}\n` +
            "--------------------------------\n";

          item.orders.forEach((o: any) => {
            bodyText += `${o.menuName} x${o.qty}\n`;
            if (o.note) {
              bodyText += ` *โน้ต: ${o.note}\n`;
            }
          });

          bodyText += "--------------------------------\n";
          bodyText += `โภชนาการรวม: ${item.totalKcal} KCAL\n`;
          bodyText += "--------------------------------\n";

          const bodyBytes = encodeThaiOverprint(bodyText);

          const footerText =
            "*ข้อมูลโภชนาการเป็นค่าประมาณการ\n" +
            "อาจจะคลาดเคลื่อนเล็กน้อย\n\n" +
            "ขอบคุณที่ให้เราดูแลสุขภาพของคุณนะคะ\n" +
            "ทานให้อร่อยและสุขภาพแข็งแรงในทุกๆ วันนะคะ ♥\n";

          const footerBytes = encodeThaiOverprint(footerText);

          finalBytes = new Uint8Array([
            ...esc,
            ...Array.from(headerBytes),
            0x1b,
            0x21,
            0x00, // Reset character size
            0x1b,
            0x61,
            0x00, // Left align
            ...Array.from(bodyBytes),
            0x1b,
            0x61,
            0x01, // Center align for footer
            ...Array.from(footerBytes),
            0x0a,
            0x0a,
            0x0a,
            0x0a, // Feed lines
            0x1d,
            0x56,
            66,
            0x00, // ESC/POS Cut paper command (GS V 66 0)
          ]);
        }

        if (serialPort) {
          await printToSerial(finalBytes);
          toast.success("พิมพ์ใบสั่งสำเร็จผ่าน USB/Serial 🖨️");
        } else {
          await printToBluetooth(finalBytes);
          toast.success("พิมพ์ใบสั่งสำเร็จผ่านบลูทูธ 🖨️");
        }
      } catch (err: any) {
        toast.error("การพิมพ์ล้มเหลว: " + err.message);
      }
    } else {
      window.print();
    }
  };

  useEffect(() => {
    let start = selectedDate;
    let end = selectedDate;

    if (viewMode === "week") {
      const d = dayjs(selectedDate);
      const day = d.day();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start = d.add(diffToMonday, "day").format("YYYY-MM-DD");
      end = d.add(diffToMonday + 6, "day").format("YYYY-MM-DD");
    }

    loadMemberPlanner(start, end);
    fetchTasks();

    const schedulesChannel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "erp_member_meal_schedules",
        },
        () => {
          if (viewMode === "week") {
            const d = dayjs(selectedDate);
            const day = d.day();
            const diffToMonday = day === 0 ? -6 : 1 - day;
            const s = d.add(diffToMonday, "day").format("YYYY-MM-DD");
            const e = d.add(diffToMonday + 6, "day").format("YYYY-MM-DD");
            loadMemberPlanner(s, e);
          } else {
            loadMemberPlanner(selectedDate, selectedDate);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          fetchTasks();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(schedulesChannel);
    };
  }, [selectedDate, viewMode]);

  const todayProduction = useMemo(() => {
    const getDropPointName = (dp: any) => {
      if (!dp) return null;
      return (Array.isArray(dp) ? dp[0]?.name : dp?.name) || null;
    };

    const todaySchedules = memberSchedules.filter((s) => {
      const member = Array.isArray(s.members) ? s.members[0] : s.members;
      if (member?.is_banned) return false;

      if (viewMode === "day") {
        if (s.delivery_date !== selectedDate) return false;
      } else {
        const d = dayjs(selectedDate);
        const day = d.day();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const start = d.add(diffToMonday, "day").format("YYYY-MM-DD");
        const end = d.add(diffToMonday + 6, "day").format("YYYY-MM-DD");
        if (s.delivery_date < start || s.delivery_date > end) return false;
      }

      // If filtering specifically for extras
      if (filterType === "extra") return s.is_extra_order;

      // If filtering for retail, we skip schedules
      if (filterType === "retail") return false;

      // For 'all', 'menu', 'member', we show both regular and extras
      return true;
    });

    const todayTasks = tasks.filter((t) => {
      const taskDate = dayjs(t.created_at).format("YYYY-MM-DD");

      if (viewMode === "day") {
        if (taskDate !== selectedDate) return false;
      } else {
        const d = dayjs(selectedDate);
        const day = d.day();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const start = d.add(diffToMonday, "day").format("YYYY-MM-DD");
        const end = d.add(diffToMonday + 6, "day").format("YYYY-MM-DD");
        if (taskDate < start || taskDate > end) return false;
      }

      // In 'extra' view, we only show schedules, not retail tasks
      if (filterType === "extra") return false;

      // In other views (all, menu, member, retail), we show retail tasks
      return true;
    });

    const grouped: Record<string, any> = {};
    let specialNotes = 0;

    todaySchedules.forEach((schedule) => {
      const memberData = Array.isArray(schedule.members)
        ? schedule.members[0]
        : schedule.members;
      const rawTime = (
        schedule.delivery_time ||
        memberData?.delivery_time ||
        ""
      ).trim();
      let timeLabel = getCleanTimeLabel(rawTime);

      if (viewMode === "week") {
        const dateLabel = dayjs(schedule.delivery_date)
          .locale("th")
          .format("dddที่ DD");
        timeLabel = `${dateLabel} - ${timeLabel}`;
      }

      const memberName = memberData?.full_name || "ไม่ระบุชื่อ";
      const menuName = schedule.menu_items?.name || "ไม่ทราบชื่อเมนู";
      const groupKey = filterType === "menu" ? menuName : memberName;

      let category = schedule.menu_items?.category || "อื่นๆ";
      if (category.includes("ของหวาน")) category = "ของหวาน";
      else if (category.includes("ทานเล่น")) category = "ทานเล่น";
      else if (category.includes("เส้น")) category = "เส้น";
      else if (category.includes("ผัด")) category = "ผัด";
      else if (category.includes("สลัด")) category = "สลัด";
      else if (category.includes("ซูวี")) category = "ซูวี";
      else if (category.includes("ซุป")) category = "ซุป";
      else if (category.includes("แกง")) category = "แกง";
      else if (category.includes("ต้ม")) category = "ต้ม";
      else if (category.includes("ชุดเซต") || category.includes("โปรโมชั่น"))
        category = "ชุดเซต";

      if (!grouped[timeLabel]) {
        grouped[timeLabel] = {
          totalRoundQty: 0,
          members: {},
          categoryStats: {},
          sortKey: schedule.delivery_date + (rawTime || "99:99"),
        };
      }

      if (!grouped[timeLabel].members[groupKey]) {
        grouped[timeLabel].members[groupKey] = {
          memberName: groupKey,
          totalQty: 0,
          totalKcal: 0,
          totalP: 0,
          totalC: 0,
          totalF: 0,
          hasNotes: false,
          hasExtraOrder: false,
          dropPointName: getDropPointName(schedule.pinto_packages?.drop_point),
          orders: [],
        };
      } else if (!grouped[timeLabel].members[groupKey].dropPointName && schedule.pinto_packages?.drop_point) {
        const dpName = getDropPointName(schedule.pinto_packages.drop_point);
        if (dpName) grouped[timeLabel].members[groupKey].dropPointName = dpName;
      }

      if (schedule.notes) {
        specialNotes++;
        grouped[timeLabel].members[groupKey].hasNotes = true;
      }

      if (schedule.is_extra_order) {
        grouped[timeLabel].members[groupKey].hasExtraOrder = true;
      }

      grouped[timeLabel].totalRoundQty += schedule.quantity;
      grouped[timeLabel].members[groupKey].totalQty += schedule.quantity;

      let kcal = schedule.menu_items?.calories || 0;
      let protein = schedule.menu_items?.protein || 0;
      let carbs = schedule.menu_items?.carbs || 0;
      let fat = schedule.menu_items?.fat || 0;

      if (schedule.notes?.includes("[ไม่รับข้าว]")) {
        // Standard rice portion: ~108 kcal, ~23g Carbs
        kcal -= 108;
        carbs -= 23;

        // Ensure minimum 5g carbs remains for sauces/vegetables if the dish isn't purely plain
        // This prevents unrealistic "0 Carbs" for dishes like Teriyaki or Stir-fry
        carbs = Math.max(5, carbs);
      }

      // Ensure values are not negative
      kcal = Math.max(0, kcal);
      protein = Math.max(0, protein);
      carbs = Math.max(0, carbs);
      fat = Math.max(0, fat);

      grouped[timeLabel].members[groupKey].totalKcal +=
        kcal * schedule.quantity;
      grouped[timeLabel].members[groupKey].totalP +=
        protein * schedule.quantity;
      grouped[timeLabel].members[groupKey].totalC += carbs * schedule.quantity;
      grouped[timeLabel].members[groupKey].totalF += fat * schedule.quantity;

      grouped[timeLabel].members[groupKey].orders.push({
        id: schedule.id,
        menuId: schedule.menu_items?.id,
        menuName: filterType === "menu" ? memberName : menuName,
        category,

        qty: schedule.quantity,
        note: schedule.notes || "",
        deliveryTime: rawTime,
        type: "member",
        status: schedule.kitchen_status,
        isExtra: schedule.is_extra_order || false,
        createdAt: schedule.created_at || "",
        kcal,
        macros: `P:${protein} C:${carbs} F:${fat}`,
        protein,
        carbs,
        fat,
        mealType: schedule.meal_type,
        packageId: schedule.package_id,
        deliveryDate: schedule.delivery_date,
      });

      grouped[timeLabel].categoryStats[category] =
        (grouped[timeLabel].categoryStats[category] || 0) + schedule.quantity;
    });

    todayTasks.forEach((task) => {
      const timeLabel = "ออเดอร์สมาชิกทั่วไป";
      const memberName = "ลูกค้ารายย่อย";
      const menuNameRaw = task.menu_name || "";
      const cleanTaskName = menuNameRaw.replace(/\(x\d+\)/g, "").trim();
      const matchedMenu =
        menus.find((m) => m.name.trim() === cleanTaskName) ||
        menus.find((m) => cleanTaskName.includes(m.name.trim()));

      const menuId = matchedMenu?.id || `retail_${task.id}`;
      const category = matchedMenu?.category || "รายย่อย";

      const targetLabel =
        viewMode === "week"
          ? `${dayjs(task.created_at).locale("th").format("dddที่ DD")} - ${timeLabel}`
          : timeLabel;

      if (!grouped[targetLabel]) {
        grouped[targetLabel] = {
          totalRoundQty: 0,
          members: {},
          categoryStats: {},
          sortKey: dayjs(task.created_at).format("YYYY-MM-DD") + "99:99",
        };
      }

      const qtyMatch = menuNameRaw.match(/\(x(\d+)\)/);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      const groupKey =
        filterType === "menu" ? matchedMenu?.name || menuNameRaw : memberName;

      if (!grouped[targetLabel].members[groupKey]) {
        grouped[targetLabel].members[groupKey] = {
          memberName: groupKey,
          totalQty: 0,
          totalKcal: 0,
          totalP: 0,
          totalC: 0,
          totalF: 0,
          hasNotes: false,
          isRetail: true,
          dropPointName: getDropPointName(task.drop_point),
          orders: [],
        };
      } else if (!grouped[targetLabel].members[groupKey].dropPointName && task.drop_point) {
        const dpName = getDropPointName(task.drop_point);
        if (dpName) grouped[targetLabel].members[groupKey].dropPointName = dpName;
      }

      grouped[targetLabel].totalRoundQty += qty;
      grouped[targetLabel].members[groupKey].totalQty += qty;

      const kcal = Math.max(0, matchedMenu?.calories || 0);
      const protein = Math.max(0, matchedMenu?.protein || 0);
      const carbs = Math.max(0, matchedMenu?.carbs || 0);
      const fat = Math.max(0, matchedMenu?.fat || 0);

      grouped[targetLabel].members[groupKey].totalKcal += kcal * qty;
      grouped[targetLabel].members[groupKey].totalP += protein * qty;
      grouped[targetLabel].members[groupKey].totalC += carbs * qty;
      grouped[targetLabel].members[groupKey].totalF += fat * qty;

      grouped[targetLabel].members[groupKey].orders.push({
        id: task.id,
        menuId,
        menuName:
          filterType === "menu" ? memberName : matchedMenu?.name || menuNameRaw,
        category,

        qty: qty,
        note: "",
        type: "retail",
        status: task.kitchen_status,
        createdAt: task.created_at,
        isRetail: true,
        kcal,
        macros: `P:${protein} C:${carbs} F:${fat}`,
        protein,
        carbs,
        fat,
      });

      grouped[targetLabel].categoryStats[category] =
        (grouped[targetLabel].categoryStats[category] || 0) + qty;
    });

    Object.values(grouped).forEach((group: any) => {
      if (group.members) {
        Object.values(group.members).forEach((member: any) => {
          if (member.orders && Array.isArray(member.orders)) {
            member.orders.sort((a: any, b: any) => {
              let mealA = 999999;
              if (a.id && mealIndices[a.id]) {
                mealA = mealIndices[a.id];
              } else if (a.mealType) {
                const matchDigit = String(a.mealType).match(/\d+/);
                if (matchDigit) mealA = parseInt(matchDigit[0], 10);
              }

              let mealB = 999999;
              if (b.id && mealIndices[b.id]) {
                mealB = mealIndices[b.id];
              } else if (b.mealType) {
                const matchDigit = String(b.mealType).match(/\d+/);
                if (matchDigit) mealB = parseInt(matchDigit[0], 10);
              }

              return mealA - mealB;
            });
          }
        });
      }
    });

    return { groups: grouped, specialNotesCount: specialNotes };
  }, [
    memberSchedules,
    tasks,
    menus,
    selectedDate,
    filterType,
    viewMode,
    mealIndices,
  ]);

  const weeklySummary = useMemo(() => {
    if (viewMode !== "week") return null;

    const days: Record<string, any> = {};
    const menuTotals: Record<
      string,
      { id: string; qty: number; category: string; details: any[] }
    > = {};

    const d = dayjs(selectedDate);
    const day = d.day();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    for (let i = 0; i < 7; i++) {
      const date = d.add(diffToMonday + i, "day").format("YYYY-MM-DD");
      days[date] = {
        date,
        total: 0,
        rounds: {} as Record<string, number>,
        topMenus: [] as { name: string; qty: number }[],
      };
    }

    const tempDayMenus: Record<string, Record<string, number>> = {};
    for (const date of Object.keys(days)) tempDayMenus[date] = {};

    // Process Member Schedules
    memberSchedules.forEach((s) => {
      const memberData = Array.isArray(s.members) ? s.members[0] : s.members;
      if (memberData?.is_banned) return;

      if (days[s.delivery_date]) {
        days[s.delivery_date].total += s.quantity;
        const rawTime = (
          s.delivery_time ||
          memberData?.delivery_time ||
          ""
        ).trim();
        const round = getCleanTimeLabel(rawTime);
        days[s.delivery_date].rounds[round] =
          (days[s.delivery_date].rounds[round] || 0) + s.quantity;

        const name = s.menu_items?.name || "Unknown";
        tempDayMenus[s.delivery_date][name] =
          (tempDayMenus[s.delivery_date][name] || 0) + s.quantity;

        if (!menuTotals[name]) {
          let category = s.menu_items?.category || "อื่นๆ";
          if (category.includes("ของหวาน")) category = "ของหวาน";
          else if (category.includes("ทานเล่น")) category = "ทานเล่น";
          else if (category.includes("เส้น")) category = "เส้น";
          else if (category.includes("ผัด")) category = "ผัด";
          else if (category.includes("สลัด")) category = "สลัด";
          else if (category.includes("ซูวี")) category = "ซูวี";
          else if (category.includes("ซุป")) category = "ซุป";
          else if (category.includes("แกง")) category = "แกง";
          else if (category.includes("ต้ม")) category = "ต้ม";
          else if (
            category.includes("ชุดเซต") ||
            category.includes("โปรโมชั่น")
          )
            category = "ชุดเซต";
          menuTotals[name] = {
            id: s.menu_items?.id || "",
            qty: 0,
            category,
            details: [],
          };
        }
        menuTotals[name].qty += s.quantity;
        menuTotals[name].details.push({
          id: s.id,
          date: s.delivery_date,
          time: round,
          memberName: memberData?.full_name || "ไม่ระบุชื่อ",
          qty: s.quantity,
          notes: s.notes,
        });
      }
    });

    // Process Retail Tasks
    tasks.forEach((t) => {
      const taskDate = dayjs(t.created_at).format("YYYY-MM-DD");
      if (days[taskDate]) {
        const qtyMatch = (t.menu_name || "").match(/\(x(\d+)\)/);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

        days[taskDate].total += qty;
        const round = "รายย่อย";
        days[taskDate].rounds[round] =
          (days[taskDate].rounds[round] || 0) + qty;

        const cleanName = (t.menu_name || "").replace(/\(x\d+\)/g, "").trim();
        tempDayMenus[taskDate][cleanName] =
          (tempDayMenus[taskDate][cleanName] || 0) + qty;

        if (!menuTotals[cleanName]) {
          menuTotals[cleanName] = {
            id: t.menu_item_id || "",
            qty: 0,
            category: "รายย่อย",
            details: [],
          };
        }
        menuTotals[cleanName].qty += qty;
        menuTotals[cleanName].details.push({
          id: t.id,
          date: taskDate,
          time: "รายย่อย",
          memberName: "ลูกค้ารายย่อย",
          qty: qty,
          notes: "",
        });
      }
    });

    // Populate top menus for each day
    Object.keys(days).forEach((date) => {
      days[date].topMenus = Object.entries(tempDayMenus[date])
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 3);
    });

    const filteredMenus = Object.entries(menuTotals)
      .map(([name, data]) => ({ name, ...data }))
      .filter((m) => {
        const matchesSearch = m.name
          .toLowerCase()
          .includes(summarySearchTerm.toLowerCase());
        const matchesCategory =
          summaryCategoryFilter === "all" ||
          m.category === summaryCategoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => b.qty - a.qty);

    return {
      days: Object.values(days),
      menuTotals: filteredMenus,
    };
  }, [
    memberSchedules,
    tasks,
    viewMode,
    selectedDate,
    summarySearchTerm,
    summaryCategoryFilter,
  ]);

  const handleOpenPrepSummary = async () => {
    if (!weeklySummary) return;

    setIsPrepSummaryOpen(true);
    setIsLoadingPrep(true);
    try {
      const menuItemIds = weeklySummary.menuTotals
        .map((m: any) => m.id)
        .filter((id: string) => id && isUUID(id));

      const recipes = await fetchBulkRecipes(menuItemIds);

      // Aggregate by ingredient
      const aggregates: Record<string, any> = {};

      weeklySummary.menuTotals.forEach((menu: any) => {
        const menuRecipes = recipes.filter((r) => r.menu_item_id === menu.id);
        menuRecipes.forEach((recipe) => {
          const key = recipe.item_id;
          if (!aggregates[key]) {
            aggregates[key] = {
              name: recipe.item_name || "Unknown",
              unit: recipe.storage_unit || "หน่วย",
              total: 0,
              menus: [],
            };
          }
          const amount = recipe.quantity_required * menu.qty;
          aggregates[key].total += amount;
          aggregates[key].menus.push({
            name: menu.name,
            qty: menu.qty,
            recipeQty: recipe.quantity_required,
          });
        });
      });

      setPrepSummary(
        Object.values(aggregates).sort((a, b) =>
          a.name.localeCompare(b.name, "th"),
        ),
      );
    } catch (error) {
      toast.error("ไม่สามารถโหลดข้อมูลเตรียมวัตถุดิบได้");
      setIsPrepSummaryOpen(false);
    } finally {
      setIsLoadingPrep(false);
    }
  };

  const toggleComplete = async (
    _time: string,
    _memberId: string,
    item: any,
  ) => {
    const isCurrentlyDone = item.orders.every(
      (o: any) =>
        o.status === "ready" || o.status === "done" || o.status === "เสร็จสิ้น",
    );

    const newMemberStatus = isCurrentlyDone ? "pending" : "done";
    const newRetailStatus = isCurrentlyDone ? "ยืนยันแล้ว" : "เสร็จสิ้น";

    const memberOrderIds = item.orders
      .filter((o: any) => o.type === "member" && isUUID(o.id))
      .map((o: any) => o.id);

    const retailOrderIds = item.orders
      .filter((o: any) => o.type === "retail" && isUUID(o.id))
      .map((o: any) => o.id);

    // --- Optimistic Update ---
    const plannerStore = usePlannerStore.getState();
    const kdsStore = useKdsStore.getState();

    const newSchedules = plannerStore.memberSchedules.map((s) => {
      if (memberOrderIds.includes(s.id))
        return { ...s, kitchen_status: newMemberStatus };
      return s;
    });
    const newTasks = kdsStore.tasks.map((t) => {
      if (retailOrderIds.includes(t.id))
        return { ...t, kitchen_status: newRetailStatus };
      return t;
    });

    usePlannerStore.setState({
      memberSchedules: newSchedules as MemberMealSchedule[],
    });
    useKdsStore.setState({ tasks: newTasks as KdsTask[] });
    // --------------------------

    try {
      const promises = [];
      if (memberOrderIds.length > 0)
        promises.push(
          updateSchedulesKitchenStatus(memberOrderIds, newMemberStatus),
        );
      if (retailOrderIds.length > 0)
        promises.push(
          updateOrdersKitchenStatus(retailOrderIds, newRetailStatus),
        );

      await Promise.all(promises);

      // Update data in background
      loadMemberPlanner(selectedDate, selectedDate, undefined, true);
      fetchTasks(true);

      if (!isCurrentlyDone) {
        const user = useAuthStore.getState().user;

        // Group orders by menuId to update sessions
        const menuQuantities: Record<string, number> = {};
        item.orders.forEach((o: any) => {
          if (o.menuId && isUUID(o.menuId)) {
            menuQuantities[o.menuId] = (menuQuantities[o.menuId] || 0) + o.qty;
          }
        });

        for (const [realMenuId, qty] of Object.entries(menuQuantities)) {
          const { data: session } = await supabase
            .from("erp_kitchen_sessions")
            .select("id")
            .eq("session_date", selectedDate)
            .eq("menu_item_id", realMenuId)
            .maybeSingle();

          let targetSessionId = session?.id;

          if (!targetSessionId) {
            const { data: newSession } = await supabase
              .from("erp_kitchen_sessions")
              .insert({
                session_date: selectedDate,
                menu_item_id: realMenuId,
                planned_qty: qty,
              })
              .select()
              .single();
            if (newSession) targetSessionId = newSession.id;
          }

          if (targetSessionId) {
            await closeKitchenSession({
              sessionId: targetSessionId,
              actualQty: qty,
              currentStaffId: user?.id,
            });
          }
        }
        await loadMasterData(true);
      }

      toast.success(
        isCurrentlyDone ? "ยกเลิกสถานะสำเร็จ" : "บันทึกสถานะเสร็จสิ้น",
        {
          description: !isCurrentlyDone
            ? `จัดเตรียมอาหารของ ${item.memberName} เรียบร้อยแล้ว`
            : undefined,
        },
      );
    } catch (error: any) {
      console.error("Toggle status error:", error);
      Swal.fire("Error", "ไม่สามารถเปลี่ยนสถานะได้: " + error.message, "error");
    }
  };

  const toggleSingleItem = async (order: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyDone =
      order.status === "ready" ||
      order.status === "done" ||
      order.status === "เสร็จสิ้น";
    const newStatus =
      order.type === "member"
        ? isCurrentlyDone
          ? "pending"
          : "done"
        : isCurrentlyDone
          ? "ยืนยันแล้ว"
          : "เสร็จสิ้น";

    // --- Optimistic Update ---
    if (order.type === "member") {
      const store = usePlannerStore.getState();
      const newSchedules = store.memberSchedules.map((s) =>
        s.id === order.id
          ? {
              ...s,
              kitchen_status: newStatus as "done" | "pending" | "cooking",
            }
          : s,
      );
      usePlannerStore.setState({
        memberSchedules: newSchedules as MemberMealSchedule[],
      });
    } else {
      const store = useKdsStore.getState();
      const newTasks = store.tasks.map((t) =>
        t.id === order.id ? { ...t, kitchen_status: newStatus } : t,
      );
      useKdsStore.setState({ tasks: newTasks as KdsTask[] });
    }
    // --------------------------

    try {
      if (order.type === "member") {
        await updateSchedulesKitchenStatus([order.id], newStatus);
      } else {
        await updateOrdersKitchenStatus([order.id], newStatus);
      }

      if (!isCurrentlyDone && order.menuId) {
        const user = useAuthStore.getState().user;

        if (isUUID(order.menuId)) {
          const { data: session } = await supabase
            .from("erp_kitchen_sessions")
            .select("id")
            .eq("session_date", selectedDate)
            .eq("menu_item_id", order.menuId)
            .maybeSingle();

          let targetSessionId = session?.id;
          if (!targetSessionId) {
            const { data: newSession } = await supabase
              .from("erp_kitchen_sessions")
              .insert({
                session_date: selectedDate,
                menu_item_id: order.menuId,
                planned_qty: order.qty,
              })
              .select()
              .single();
            if (newSession) targetSessionId = newSession.id;
          }

          if (targetSessionId) {
            await closeKitchenSession({
              sessionId: targetSessionId,
              actualQty: order.qty,
              currentStaffId: user?.id,
            });
          }
        }
      }

      loadMemberPlanner(selectedDate, selectedDate, undefined, true);
      fetchTasks(true);
      await loadMasterData(true);
    } catch (error: any) {
      console.error("Toggle single item error:", error);
      Swal.fire("Error", "ไม่สามารถเปลี่ยนสถานะได้: " + error.message, "error");
    }
  };

  const handleToggleClick = async (
    time: string,
    memberName: string,
    item: any,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    const isCurrentlyDone = item.orders.every(
      (o: any) =>
        o.status === "ready" || o.status === "done" || o.status === "เสร็จสิ้น",
    );

    if (!isCurrentlyDone) {
      const result = await Swal.fire({
        title: "ยืนยันการจัดเตรียม",
        html: `ยืนยันการจัดเตรียมอาหารของ <b>${memberName}</b><br/>จำนวน <b>${item.totalQty}</b> กล่อง ใช่หรือไม่?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#94a3b8",
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        toggleComplete(time, memberName, item);
      }
    } else {
      toggleComplete(time, memberName, item);
    }
  };

  const totalBoxes = useMemo(() => {
    let total = 0;
    Object.values(todayProduction.groups).forEach((group: any) => {
      total += group.totalRoundQty;
    });
    return total;
  }, [todayProduction.groups]);

  const kitchenInsight = useMemo(() => {
    if (Object.keys(todayProduction.groups).length === 0)
      return "วันนี้ยังไม่มีรายการผลิตที่ต้องดำเนินการ";
    const shifts = Object.entries(todayProduction.groups).sort(
      (a: any, b: any) => b[1].totalRoundQty - a[1].totalRoundQty,
    );
    const busiestShift = shifts[0][0];

    const allUniqueKeys = new Set<string>();
    Object.values(todayProduction.groups).forEach((timeGroup: any) => {
      Object.keys(timeGroup.members).forEach((key) => allUniqueKeys.add(key));
    });

    const totalUniqueCount = allUniqueKeys.size;
    const unitLabel = filterType === "menu" ? "เมนู" : "ลูกค้า";
    const unitSuffix = filterType === "menu" ? "รายการ" : "ท่าน";

    return `ยอดผลิตรวม ${totalBoxes} กล่อง สำหรับ${unitLabel} ${totalUniqueCount} ${unitSuffix} โดยรอบที่งานเยอะที่สุดคือ ${busiestShift} (${shifts[0][1].totalRoundQty} กล่อง) ${todayProduction.specialNotesCount > 0 ? `และมีคำขอพิเศษ ${todayProduction.specialNotesCount} รายการ` : "ไม่มีหมายเหตุพิเศษ"}`;
  }, [todayProduction, totalBoxes]);

  const changeDate = (days: number) => {
    if (viewMode === "week") {
      setSelectedDate((prev) =>
        dayjs(prev)
          .add(days * 7, "day")
          .format("YYYY-MM-DD"),
      );
    } else {
      setSelectedDate((prev) =>
        dayjs(prev).add(days, "day").format("YYYY-MM-DD"),
      );
    }
  };

  const getDateLabel = () => {
    if (viewMode === "week") {
      const d = dayjs(selectedDate);
      const day = d.day();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = d.add(diffToMonday, "day");
      const end = start.add(6, "day");
      return `สัปดาห์นี้ (${start.format("D MMM")} - ${end.format("D MMM")})`;
    }
    const diff = dayjs(selectedDate).diff(dayjs().startOf("day"), "day");
    if (diff === 0) return "วันนี้";
    if (diff === 1) return "พรุ่งนี้";
    if (diff === -1) return "เมื่อวาน";
    return dayjs(selectedDate).locale("th").format("dddd");
  };

  const [nutritionModal, setNutritionModal] = useState<{
    open: boolean;
    memberName: string;
    item: any;
    time: string;
  } | null>(null);

  const ticketRef = useRef<HTMLDivElement>(null);

  const handleSaveAsPNG = async () => {
    if (!nutritionModal || !ticketRef.current) return;

    const toastId = toast.loading("กำลังเตรียมจัดทำไฟล์รูปภาพสลิป PNG...");
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2.5, // Crisp resolution for high-density reading
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (_clonedDoc, clonedElement) => {
          if (!ticketRef.current || !clonedElement) return;

          // Helper to dynamically translate oklch() color strings into safe rgba() format using native Canvas2D parsing
          const resolveOklchColor = (colorStr: string): string => {
            if (!colorStr || typeof colorStr !== 'string') return colorStr;
            if (!colorStr.includes('oklch')) return colorStr;
            
            try {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = 1;
              tempCanvas.height = 1;
              const ctx = tempCanvas.getContext('2d');
              if (!ctx) return colorStr;
              
              ctx.fillStyle = colorStr;
              ctx.fillRect(0, 0, 1, 1);
              const data = ctx.getImageData(0, 0, 1, 1).data;
              return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
            } catch (e) {
              return colorStr;
            }
          };

          // 1. Copy and resolve ONLY color properties to keep exact visual colors (green, rose, slate)
          const colorProps = [
            'color', 'backgroundColor', 'borderColor',
            'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor'
          ];

          const copyColorStyles = (src: HTMLElement, dest: HTMLElement) => {
            const computed = window.getComputedStyle(src);
            colorProps.forEach(prop => {
              const val = computed.getPropertyValue(prop) || (computed as any)[prop];
              if (val) {
                const resolvedColor = resolveOklchColor(val);
                dest.style.setProperty(prop, resolvedColor);
              }
            });
          };

          // Copy color styles for the root cloned element
          copyColorStyles(ticketRef.current, clonedElement);

          // Copy color styles for all descendants
          const originalElements = ticketRef.current.getElementsByTagName("*");
          const clonedElements = clonedElement.getElementsByTagName("*");
          
          for (let i = 0; i < originalElements.length; i++) {
            const origEl = originalElements[i] as HTMLElement;
            const cloneEl = clonedElements[i] as HTMLElement;
            if (origEl && cloneEl) {
              copyColorStyles(origEl, cloneEl);
            }
          }

          // 2. Sanitize all <style> tags in the cloned document by replacing oklch definitions with standard colors
          // This keeps the stylesheet fully active for layout (so no squishing/overlapping!) but makes it crash-free.
          const styleTags = _clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const tag = styleTags[i];
            if (tag.textContent && tag.textContent.includes('oklch')) {
              tag.textContent = tag.textContent.replace(/oklch\([^)]+\)/g, 'rgb(30, 41, 59)');
            }
          }

          // 3. Recursive CSS rule sanitizer for same-origin stylesheets (including linked css files)
          const sanitizeRule = (rule: CSSRule, sheet: CSSStyleSheet | CSSGroupingRule, index: number) => {
            try {
              if (rule.cssText && rule.cssText.includes('oklch')) {
                const groupingRule = rule as CSSGroupingRule;
                if (groupingRule.cssRules) {
                  for (let k = groupingRule.cssRules.length - 1; k >= 0; k--) {
                    sanitizeRule(groupingRule.cssRules[k], groupingRule, k);
                  }
                } else {
                  const newCssText = rule.cssText.replace(/oklch\([^)]+\)/g, 'rgb(30, 41, 59)');
                  try {
                    sheet.deleteRule(index);
                    sheet.insertRule(newCssText, index);
                  } catch (err) {
                    try {
                      sheet.deleteRule(index);
                    } catch (e) {}
                  }
                }
              }
            } catch (e) {}
          };

          try {
            const sheets = _clonedDoc.styleSheets;
            for (let i = 0; i < sheets.length; i++) {
              try {
                const sheet = sheets[i];
                const rules = sheet.cssRules || sheet.rules;
                if (!rules) continue;
                for (let j = rules.length - 1; j >= 0; j--) {
                  sanitizeRule(rules[j], sheet, j);
                }
              } catch (e) {
                // Ignore security exceptions for cross-origin stylesheets
              }
            }
          } catch (e) {}
        }
      });

      const dataUrl = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = dataUrl;

      const dateStr = dayjs(selectedDate).format("YYYYMMDD");
      const cleanName = nutritionModal.memberName.replace(/[^a-zA-Z0-9ก-๙]/g, "");
      link.download = `CF_Slip_${cleanName}_${dateStr}.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("บันทึกสลิปใบเสร็จ (.png) เรียบร้อยแล้ว! 💾", {
        id: toastId,
        description: "รูปภาพนามสกุล PNG คมชัดสูง อ่านง่ายสะดวกย้อนหลัง",
      });
    } catch (err: any) {
      console.error("Failed to generate PNG image:", err);
      toast.error("บันทึกสลิปรูปภาพล้มเหลว: " + err.message, {
        id: toastId,
      });
    }
  };

  const handleCopyNutrition = (memberName: string, item: any, time: string) => {
    const dateStr = dayjs(selectedDate).locale("th").format("DD MMMM YYYY");
    let text = `📋 ข้อมูลโภชนาการประจำวันที่ ${dateStr}\n`;
    text += `👤 ลูกค้า: คุณ${memberName}\n`;
    text += `⏰ รอบ: ${time}\n`;
    text += `──────────────────\n`;

    item.orders.forEach((o: any, i: number) => {
      let mealNumText = "";
      if (o.id && mealIndices[o.id]) {
        mealNumText = ` (มื้อที่ ${mealIndices[o.id]})`;
      } else if (o.mealType) {
        const matchDigit = String(o.mealType).match(/\d+/);
        mealNumText = matchDigit ? ` (มื้อที่ ${matchDigit[0]})` : "";
      }
      text += `${i + 1}.${o.menuName}${mealNumText} (x${o.qty})\n`;
      text += `   🔥 ${o.kcal * o.qty} kcal | ${o.macros}\n`;
    });

    text += `──────────────────\n`;
    text += `📊 ยอดรวมทั้งหมด: ${Math.max(0, item.totalKcal)} kcal\n`;
    text += `💪 P:${Math.max(0, item.totalP).toFixed(1)} C:${Math.max(0, item.totalC).toFixed(1)} F:${Math.max(0, item.totalF).toFixed(1)}`;

    navigator.clipboard.writeText(text);
    toast.success("คัดลอกข้อมูลแล้ว", {
      description: "คุณสามารถวางข้อมูลโภชนาการได้ทันที",
    });
  };

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar print:bg-white print:p-0 transition-all duration-300",
        isKitchenMode && "bg-slate-900 p-2 sm:p-4",
      )}
    >
      {/* Kitchen Mode UI Overlay */}
      {isKitchenMode && (
        <div className="fixed top-4 right-4 z-[120] flex gap-2">
          <button
            onClick={() => setIsKitchenMode(false)}
            className="px-8 py-4 bg-rose-600 text-white rounded-[24px] text-xl font-black shadow-2xl border-4 border-rose-500 active:scale-95 transition-all"
          >
            ออกจากโหมดครัว
          </button>
        </div>
      )}
      {/* Nutrition Modal / Upgraded Details & Digital Slip */}
      <AnimatePresence>
        {nutritionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#F8FAFC] rounded-[36px] shadow-2xl w-full max-w-7xl md:w-[94vw] overflow-hidden border border-slate-100 flex flex-col max-h-[95vh] h-[92vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-none">
                    รายละเอียดและสลิปโภชนาการ
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">
                    Order Details & Nutrition Slip
                  </p>
                </div>
                <button
                  onClick={() => setNutritionModal(null)}
                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center border border-slate-100 shadow-sm"
                  title="ปิด"
                  aria-label="ปิด"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body - Dual Column Grid */}
              <div className="flex-1 overflow-y-auto md:overflow-hidden p-6 pb-16 md:p-8 bg-slate-50/50 flex flex-col min-h-0 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start md:items-stretch flex-1 min-h-0">
                  
                   {/* Left Column: Interactive Details */}
                  <div className="md:col-span-7 flex flex-col md:h-full md:min-h-0 space-y-5">
                    {/* Customer & Delivery Card */}
                    <div className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 space-y-3 shrink-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2.5 py-0.5 rounded font-medium">
                          ข้อมูลจัดส่ง (Delivery Info)
                        </span>
                        {/* Status Badge */}
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-medium border",
                          nutritionModal.item.orders.every((o: any) => o.status === "ready" || o.status === "done" || o.status === "เสร็จสิ้น")
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {nutritionModal.item.orders.every((o: any) => o.status === "ready" || o.status === "done" || o.status === "เสร็จสิ้น")
                            ? "จัดเตรียมแล้ว"
                            : "รอจัดเตรียม"}
                        </span>
                      </div>

                      {/* Clean Tabular Customer Info - Matching the Print structure but beautifully styled */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
                          <span className="text-slate-400">ลูกค้า (Customer):</span>
                          <span className="text-slate-800 font-normal">คุณ{nutritionModal.memberName}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
                          <span className="text-slate-400">รอบส่ง (Round):</span>
                          <span className="text-slate-800 font-normal">{nutritionModal.time}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
                          <span className="text-slate-400">วันที่ (Date):</span>
                          <span className="text-slate-800 font-normal">{dayjs(selectedDate).format("DD/MM/YYYY")}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
                          <span className="text-slate-400">จำนวน (Quantity):</span>
                          <span className="text-slate-800 font-normal">
                            {nutritionModal.item.orders.reduce((sum: number, o: any) => sum + o.qty, 0)} กล่อง
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* List of Dishes */}
                    <div className="space-y-3 md:flex-1 flex flex-col md:min-h-0">
                      <p className="text-xs text-slate-400 uppercase tracking-widest pl-2 shrink-0">รายการเตรียมอาหาร</p>
                      
                      <div className="space-y-2.5 md:overflow-y-auto custom-scrollbar pr-1 md:flex-1 md:min-h-0 overflow-visible">
                        {nutritionModal.item.orders.map((o: any, idx: number) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-slate-200 transition-colors">
                            {/* Food Row: Title and Qty */}
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className={cn("w-1.5 h-1.5 rounded-full", getCategoryBgClass(o.category))} />
                                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">{o.category}</span>
                                </div>
                                <h5 className="text-sm text-slate-800 font-normal leading-snug">
                                  {o.menuName}
                                  {(() => {
                                    if (o.id && mealIndices[o.id]) {
                                      return ` (มื้อที่ ${mealIndices[o.id]})`;
                                    } else if (o.mealType) {
                                      const matchDigit = String(o.mealType).match(/\d+/);
                                      return matchDigit ? ` (มื้อที่ ${matchDigit[0]})` : "";
                                    }
                                    return "";
                                  })()}
                                </h5>
                              </div>
                              <span className="text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 font-normal shrink-0">
                                x{o.qty}
                              </span>
                            </div>

                            {/* Macro Info row - matching print macros info exactly but clean and light */}
                            <div className="pt-2 border-t border-dashed border-slate-50 flex justify-between items-center text-[10.5px]">
                              <span className="text-slate-400">โภชนาการอาหาร</span>
                              <div className="flex gap-3 text-slate-500 font-normal">
                                <span>🔥 {o.kcal * o.qty} KCAL</span>
                                <span>•</span>
                                <span className="text-slate-500">P: {o.protein}g</span>
                                <span className="text-slate-500">C: {o.carbs}g</span>
                                <span className="text-slate-500">F: {o.fat}g</span>
                              </div>
                            </div>

                            {/* Note pill - extremely compact and not bold */}
                            {o.note && (
                              <div className="mt-1 bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-start gap-2">
                                <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] font-normal text-rose-700 leading-tight">
                                  {o.note}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Ticket Preview */}
                  <div className="md:col-span-5 flex flex-col items-center gap-4 md:h-full md:min-h-0 justify-between w-full">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest w-full text-center shrink-0">ใบเสร็จดิจิทัลโภชนาการ (Digital Slip)</p>
                    
                    {/* Ticket Outer Wrapper - representing a physical receipt roll */}
                    <div className="relative w-full max-w-[340px] md:flex-1 md:overflow-y-auto custom-scrollbar py-1 shrink md:min-h-0 overflow-visible">
                      {/* Ticket Header Dark Top bar */}
                      <div className="h-1.5 bg-slate-900 rounded-t-xl w-full"></div>
                      
                      {/* Main Ticket Target - Thermal Receipt Monochrome Simulator */}
                      <div 
                        ref={ticketRef} 
                        className="bg-white p-6 pb-8 text-black border-x border-slate-200 text-left select-none relative overflow-hidden flex flex-col font-receipt"
                      >
                        {/* Header Brand */}
                        <div className="text-center space-y-1 mb-3 text-black">
                          <h5 className="text-sm font-bold tracking-tight uppercase leading-none">ใบสั่งเตรียมอาหาร KDS</h5>
                          <h6 className="text-[10px] font-bold uppercase leading-none mt-1.5">ใบออเดอร์อาหาร Clean Food CR</h6>
                        </div>
                        
                        <div className="border-b border-dashed border-slate-400 my-2"></div>
                        
                        {/* Ticket Info */}
                        <div className="space-y-1.5 text-xs text-black">
                          <div className="flex justify-between">
                            <span className="text-slate-900">ลูกค้า</span>
                            <span className="font-bold">คุณ{nutritionModal.memberName}</span>
                          </div>
                          {nutritionModal.item.dropPointName && (
                            <div className="flex justify-between text-indigo-700 font-bold">
                              <span className="text-indigo-600">จุดจัดส่ง</span>
                              <span>📍 {nutritionModal.item.dropPointName}</span>
                            </div>
                          )}
                          {nutritionModal.time !== "ออเดอร์สมาชิกทั่วไป" && !nutritionModal.time.includes("ลูกค้ารายย่อย") && (
                            <div className="flex justify-between">
                              <span className="text-slate-900">รอบส่ง</span>
                              <span className="font-bold">{nutritionModal.time}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-900">วันที่</span>
                            <span className="font-bold">{dayjs(selectedDate).format("DD/MM/YYYY")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-900">จำนวนกล่อง</span>
                            <span className="font-bold">
                              {nutritionModal.item.orders.reduce((sum: number, o: any) => sum + o.qty, 0)} กล่อง
                            </span>
                          </div>
                        </div>
                        
                        <div className="border-b border-dashed border-slate-400 my-2"></div>
                        
                        {/* Itemized List */}
                        <div className="space-y-2.5 text-black">
                          {nutritionModal.item.orders.map((o: any, idx: number) => {
                            let mealNumText = "";
                            if (o.id && mealIndices[o.id]) {
                              mealNumText = ` (มื้อที่ ${mealIndices[o.id]})`;
                            } else if (o.mealType) {
                              const matchDigit = String(o.mealType).match(/\d+/);
                              mealNumText = matchDigit ? ` (มื้อที่ ${matchDigit[0]})` : "";
                            }
                            return (
                              <div key={idx} className="space-y-0.5 text-xs">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-bold leading-tight">
                                    {o.menuName}{mealNumText}
                                  </span>
                                  <span className="font-bold shrink-0">x{o.qty}</span>
                                </div>
                                {o.note && (
                                  <div className="text-[10px] text-black font-normal">
                                    *โน้ต: {o.note}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="border-b border-dashed border-slate-400 my-2"></div>
                        
                        {/* Summary Totals */}
                        <div className="space-y-1.5 text-xs text-black">
                          <div className="flex justify-between font-bold">
                            <span>พลังงานรวม</span>
                            <span>{Math.max(0, nutritionModal.item.totalKcal)} KCAL</span>
                          </div>
                          <div className="flex justify-between">
                            <span>โปรตีน (Protein)</span>
                            <span>{Math.max(0, nutritionModal.item.totalP).toFixed(1)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>คาร์โบไฮเดรต (Carbs)</span>
                            <span>{Math.max(0, nutritionModal.item.totalC).toFixed(1)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>ไขมัน (Fat)</span>
                            <span>{Math.max(0, nutritionModal.item.totalF).toFixed(1)} g</span>
                          </div>
                        </div>
                        
                        <div className="border-b border-dashed border-slate-400 my-2"></div>
                        
                        {/* Receipt Footer with Remark Note */}
                        <div className="text-center space-y-3 text-black">
                          <p className="text-[9px] text-slate-600 leading-tight">
                            *หมายเหตุ: ข้อมูลโภชนาการเป็นค่าประมาณการ<br/>อาจจะคลาดเคลื่อนเล็กน้อย
                          </p>
                          <p className="text-[9px] text-black leading-tight">
                            ขอบคุณที่ให้เราดูแลสุขภาพของคุณนะคะ<br/>
                            ทานให้อร่อยและสุขภาพแข็งแรงในทุกๆ วันนะคะ ♥
                          </p>
                        </div>
                      </div>
                      
                      {/* Ticket bottom jagged/dashed edge visual */}
                      <div className="h-3 bg-white w-full rounded-b-xl border-x border-b border-slate-200 relative overflow-hidden flex gap-1 px-2">
                        {Array.from({ length: 15 }).map((_, i) => (
                          <div key={i} className="w-4 h-4 bg-slate-50 rounded-full -mt-2 shrink-0 border border-slate-200/20"></div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Buttons Panel */}
                    <div className="w-full max-w-[340px] space-y-3 pb-6 md:pb-0">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveAsPNG}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-slate-900/20 text-sm cursor-pointer"
                      >
                        <Download size={18} /> บันทึกสลิปรูปภาพ (PNG) 💾
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCopyNutrition(nutritionModal.memberName, nutritionModal.item, nutritionModal.time)}
                        className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold flex items-center justify-center gap-2 transition-all text-sm cursor-pointer"
                      >
                        <Copy size={16} className="text-slate-400" /> คัดลอกข้อความสรุป 📋
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="hidden print:block mb-8 border-b-4 border-slate-900 pb-4 p-8">
        <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tighter">
          ใบสั่งงานผลิตอาหารประจำวัน
        </h1>
        <div className="flex justify-between mt-6">
          <div className="space-y-1">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
              วันที่จัดส่ง
            </p>
            <p className="text-xl font-bold text-slate-900">
              {dayjs(selectedDate).locale("th").format("DD MMMM YYYY")}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
              ยอดผลิตรวมทั้งหมด
            </p>
            <p className="text-xl font-bold text-slate-900">
              {totalBoxes} กล่อง
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-10 space-y-8 max-w-full mx-auto print:p-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden flex-wrap">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <ChefHat size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
                แผนงานเตรียมอาหาร
              </h2>
              <p className="text-slate-500 text-xs font-semibold">
                {viewMode === "day"
                  ? "รายการผลิตประจำวันที่"
                  : isSummaryMode
                    ? "สรุปภาพรวมสัปดาห์"
                    : "รายการผลิตประจำสัปดาห์"}{" "}
                •{" "}
                {dayjs(selectedDate).locale("th").format("ddddที่ DD MMM YYYY")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white border border-slate-100 rounded-2xl p-1 flex gap-1 shadow-sm mr-2">
              <button
                onClick={() => setViewMode("day")}
                className={cn(
                  "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                  viewMode === "day"
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                รายวัน
              </button>
              <button
                onClick={() => {
                  setViewMode("week");
                  setIsSummaryMode(true);
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                  viewMode === "week"
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                สัปดาห์
              </button>
            </div>

            {viewMode === "week" && (
              <div className="bg-white border border-slate-100 rounded-2xl p-1 flex gap-1 shadow-sm">
                <button
                  onClick={() => setIsSummaryMode(true)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                    isSummaryMode
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  ภาพรวม
                </button>
                <button
                  onClick={() => setIsSummaryMode(false)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                    !isSummaryMode
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  รายการละเอียด
                </button>
              </div>
            )}

            <div className="bg-white border border-slate-100 rounded-2xl p-1.5 flex items-center shadow-sm">
              <button
                onClick={() => setFilterType("menu")}
                className={cn(
                  "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                  filterType === "menu"
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                เมนู
              </button>
              <button
                onClick={() => setFilterType("member")}
                className={cn(
                  "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                  filterType === "member"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                สมาชิก
              </button>

              <button
                onClick={() => setFilterType("retail")}
                className={cn(
                  "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                  filterType === "retail"
                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                รายย่อย
              </button>
              <button
                onClick={() => setFilterType("extra")}
                className={cn(
                  "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                  filterType === "extra"
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                สั่งแยก
              </button>
              {filterType !== "all" && (
                <button
                  onClick={() => setFilterType("all")}
                  className="px-2 text-slate-300 hover:text-slate-500"
                  title="ล้างตัวกรอง"
                  aria-label="ล้างตัวกรอง"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedDate(dayjs().format("YYYY-MM-DD"));
                setViewMode("day");
              }}
              className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center active:scale-95"
            >
              วันนี้
            </button>

            <div className="bg-white border border-slate-100 rounded-2xl p-1.5 flex items-center shadow-sm">
              <button
                onClick={() => changeDate(-1)}
                className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                title="วันก่อนหน้า"
                aria-label="วันก่อนหน้า"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-6 text-center min-w-[140px]">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">
                  {getDateLabel()}
                </p>
                <p className="text-sm font-bold text-slate-700 leading-none">
                  {dayjs(selectedDate).locale("th").format("D MMMM YYYY")}
                </p>
              </div>
              <button
                onClick={() => changeDate(1)}
                className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                title="วันถัดไป"
                aria-label="วันถัดไป"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <Package size={28} />
            </div>
            <div>
              <p className="text-[12px] uppercase text-slate-400 font-bold mb-1">
                ยอดผลิตรวม
              </p>
              <h3 className="text-3xl font-black text-slate-900">
                {totalBoxes}{" "}
                <span className="text-sm font-bold text-slate-400">กล่อง</span>
              </h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <UtensilsCrossed size={28} />
            </div>
            <div>
              <p className="text-[12px] uppercase text-slate-400 font-bold mb-1">
                {filterType === "menu" ? "จำนวนเมนู" : "จำนวนลูกค้า"}
              </p>
              <h3 className="text-3xl font-black text-slate-900">
                {(() => {
                  const allKeys = new Set();
                  Object.values(todayProduction.groups).forEach((tg: any) => {
                    Object.keys(tg.members).forEach((k) => allKeys.add(k));
                  });
                  return allKeys.size;
                })()}
                <span className="text-sm font-bold text-slate-400">
                  {" "}
                  {filterType === "menu" ? "รายการ" : "ท่าน"}
                </span>
              </h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle size={28} />
            </div>
            <div>
              <p className="text-[12px] uppercase text-slate-400 font-bold mb-1">
                หมายเหตุแพ้อาหาร
              </p>
              <h3 className="text-3xl font-black text-slate-900">
                {todayProduction.specialNotesCount}{" "}
                <span className="text-sm font-bold text-slate-400">รายการ</span>
              </h3>
            </div>
          </div>
          <div
            className={cn(
              "p-6 rounded-2xl shadow-lg flex flex-col items-center text-center gap-4 border transition-all duration-500",
              isKitchenOpen
                ? "bg-emerald-500 border-emerald-400"
                : "bg-rose-500 border-rose-400",
            )}
          >
            <div className="w-14 h-14 bg-white/20 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              {isKitchenOpen ? <CheckCircle2 size={28} /> : <Power size={28} />}
            </div>
            <div>
              <p
                className={cn(
                  "text-[12px] uppercase font-bold mb-1",
                  isKitchenOpen ? "text-emerald-100" : "text-rose-100",
                )}
              >
                สถานะระบบ
              </p>
              <h3 className="text-xl font-black text-white italic">
                {isKitchenOpen ? "พร้อมทำงาน" : "ปิดทำการ"}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl text-white relative overflow-hidden shadow-xl print:border print:border-slate-900 print:text-black print:bg-white print:shadow-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-xl shrink-0 w-fit">
              <ChefHat size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-1">
                วิเคราะห์งานครัว (Kitchen Insights)
              </p>
              <p className="text-base font-semibold leading-relaxed text-slate-200 print:text-slate-800">
                {kitchenInsight}
              </p>
            </div>
          </div>
        </div>

        <div className={cn("space-y-16", isKitchenMode && "space-y-24 pb-40")}>
          {viewMode === "week" && isSummaryMode && weeklySummary && (
            <div className="space-y-12">
              {/* Daily Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {weeklySummary.days.map((day: any, idx: number) => (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3 hover:shadow-lg transition-all group"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                        {dayjs(day.date).locale("th").format("dddd")}
                      </span>
                      <span className="text-base font-black text-slate-900">
                        {dayjs(day.date).locale("th").format("D MMM")}
                      </span>
                    </div>
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-100 group-hover:border-emerald-500 group-hover:bg-emerald-50 transition-all">
                      <span className="text-3xl font-black text-slate-900 group-hover:text-emerald-600">
                        {day.total}
                      </span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest -mt-1">
                      กล่องรวม
                    </p>

                    <div className="w-full space-y-1 mt-2">
                      {Object.entries(day.rounds).map(
                        ([round, qty]: [any, any]) => (
                          <div
                            key={round}
                            className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-lg"
                          >
                            <span className="text-[11px] font-bold text-slate-500 truncate mr-2">
                              {round}
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              {qty}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Weekly Menu Totals */}
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="shrink-0">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                      สรุปยอดเตรียมอาหารทั้งสัปดาห์
                    </h3>
                    <p className="text-slate-500 text-xs font-semibold mt-1">
                      รายการเมนูทั้งหมดที่ต้องผลิตในสัปดาห์นี้
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                    <button
                      onClick={handleOpenPrepSummary}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 shrink-0"
                    >
                      <Package size={18} />
                      <span>สรุปเตรียมวัตถุดิบ</span>
                    </button>

                    <div className="flex-1 relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                        <Sparkles size={16} />
                      </div>
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อเมนู..."
                        value={summarySearchTerm}
                        onChange={(e) => setSummarySearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-semibold placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all shadow-inner"
                      />
                      {summarySearchTerm && (
                        <button
                          onClick={() => setSummarySearchTerm("")}
                          className="absolute inset-y-0 right-4 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
                          title="ล้างคำค้นหา"
                          aria-label="ล้างคำค้นหา"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <div className="relative min-w-[180px]">
                      <select
                        value={summaryCategoryFilter}
                        onChange={(e) =>
                          setSummaryCategoryFilter(e.target.value)
                        }
                        className="w-full pl-4 pr-10 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all shadow-inner appearance-none cursor-pointer"
                        title="เลือกหมวดหมู่"
                        aria-label="เลือกหมวดหมู่"
                      >
                        <option value="all">ทุกหมวดหมู่</option>
                        {Array.from(new Set(Object.keys(CATEGORY_PRIORITY)))
                          .sort(
                            (a, b) =>
                              (CATEGORY_PRIORITY[a] || 99) -
                              (CATEGORY_PRIORITY[b] || 99),
                          )
                          .map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-emerald-50 text-emerald-600 px-5 py-3 rounded-2xl border border-emerald-100 shadow-sm shrink-0">
                    <UtensilsCrossed size={18} />
                    <span className="text-sm font-black">
                      {weeklySummary.menuTotals.length} รายการ
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {Object.entries(
                    weeklySummary.menuTotals.reduce(
                      (acc: any, menu: any) => {
                        const cat = menu.category || "อื่นๆ";
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(menu);
                        return acc;
                      },
                      {} as Record<string, any[]>,
                    ),
                  )
                    .sort(
                      ([catA], [catB]) =>
                        (CATEGORY_PRIORITY[catA] || 99) -
                        (CATEGORY_PRIORITY[catB] || 99),
                    )
                    .map(([category, items]: [string, any]) => (
                      <div key={category} className="p-4 md:p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div
                            className={cn(
                              "w-1.5 h-5 rounded-full",
                              getCategoryBgClass(category),
                            )}
                          />
                          <h4 className="text-[13px] font-bold text-slate-600 uppercase tracking-widest">
                            {category}
                          </h4>
                          <span className="text-[11px] font-bold text-slate-300">
                            ({items.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                          {items.map((menu: any, idx: number) => {
                            const activeDays = Array.from(
                              new Set(
                                menu.details.map((d: any) =>
                                  dayjs(d.date).day(),
                                ),
                              ),
                            );
                            const dayLabels = [
                              "อา",
                              "จ",
                              "อ",
                              "พ",
                              "พฤ",
                              "ศ",
                              "ส",
                            ];
                            const dayStyles: Record<number, string> = {
                              0: "bg-rose-50 text-rose-600 border-rose-100/50",
                              1: "bg-amber-50 text-amber-600 border-amber-100/50",
                              2: "bg-pink-50 text-pink-600 border-pink-100/50",
                              3: "bg-emerald-50 text-emerald-600 border-emerald-100/50",
                              4: "bg-orange-50 text-orange-600 border-orange-100/50",
                              5: "bg-sky-50 text-sky-600 border-sky-100/50",
                              6: "bg-purple-50 text-purple-600 border-purple-100/50",
                            };

                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedSummaryMenu(menu)}
                                className="p-2.5 bg-slate-50/50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-emerald-100 flex items-center justify-between gap-2 group cursor-pointer active:scale-95"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={cn(
                                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                      getCategoryBgLightClass(category),
                                      getCategoryTextClass(category),
                                    )}
                                  >
                                    <ChefHat size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[15px] font-bold text-slate-800 truncate leading-none mb-1.5">
                                      {menu.name}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {activeDays
                                        .sort(
                                          (a: any, b: any) =>
                                            (a === 0 ? 7 : a) -
                                            (b === 0 ? 7 : b),
                                        )
                                        .map((d: any) => (
                                          <span
                                            key={d}
                                            className={`text-[11px] font-normal px-1.5 py-0.5 rounded border ${dayStyles[d] || "bg-slate-50 text-slate-600 border-slate-100/50"}`}
                                          >
                                            {dayLabels[d]}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shrink-0 min-w-[36px] text-center shadow-sm group-hover:bg-emerald-600 transition-colors">
                                  <span className="text-sm font-black leading-none">
                                    {menu.qty}
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
            </div>
          )}

          {(!isSummaryMode || viewMode === "day") && (
            <>
              {Object.keys(todayProduction.groups).length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-200 shadow-sm flex flex-col items-center">
                  <ChefHat size={60} className="text-slate-100 mb-6" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2 italic">
                    ไม่มีรายการผลิตในวันที่เลือก
                  </h3>
                  <p className="text-slate-400 max-w-sm font-semibold">
                    ระบบไม่พบแผนการจัดส่งในวันที่{" "}
                    {dayjs(selectedDate).locale("th").format("DD MMMM YYYY")}
                  </p>
                </div>
              ) : (
                Object.entries(todayProduction.groups)
                  .sort((a, b) => {
                    if (viewMode === "week") {
                      return a[1].sortKey.localeCompare(b[1].sortKey);
                    }
                    const [labelA] = a;
                    const [labelB] = b;
                    const getPriority = (label: string) => {
                      if (label.includes("เช้า")) return 1;
                      if (label.includes("เย็น")) return 2;
                      return 3;
                    };
                    return getPriority(labelA) - getPriority(labelB);
                  })
                  .map(([time, group]: [string, any]) => (
                    <section
                      key={time}
                      className="space-y-6 print:break-inside-avoid"
                    >
                      <div
                        className={cn(
                          "flex items-center justify-between px-2",
                          isKitchenMode &&
                            "bg-slate-800/80 p-6 rounded-[32px] mb-8 border border-slate-700",
                        )}
                      >
                        <div className="flex items-center gap-6">
                          <div
                            className={cn(
                              "h-10 w-1.5 rounded-full",
                              time.includes("เย็น")
                                ? "bg-indigo-500 shadow-lg shadow-indigo-500/20"
                                : "bg-orange-500 shadow-lg shadow-orange-500/20",
                              isKitchenMode && "h-16 w-3 bg-emerald-500",
                            )}
                          ></div>
                          <div>
                            <h3
                              className={cn(
                                "text-2xl font-semibold text-slate-900 tracking-tight uppercase",
                                isKitchenMode &&
                                  "text-3xl text-white font-bold",
                              )}
                            >
                              {(time === "ออเดอร์สมาชิกทั่วไป" || time.includes("ลูกค้ารายย่อย")) ? time : `รอบจัดส่ง: ${time}`}
                            </h3>
                            <div className="flex items-center gap-4 mt-0.5">
                              <span
                                className={cn(
                                  "text-sm font-medium text-slate-400 flex items-center gap-2",
                                  isKitchenMode &&
                                    "text-xl text-emerald-400 font-bold",
                                )}
                              >
                                <Package size={isKitchenMode ? 20 : 14} />
                                ยอดผลิตรวม {group.totalRoundQty} กล่อง
                              </span>
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "flex flex-wrap gap-2 ml-8 print:hidden",
                            isKitchenMode && "hidden",
                          )}
                        >
                          {Object.entries(group.categoryStats)
                            .sort(
                              (a: any, b: any) =>
                                (CATEGORY_PRIORITY[a[0]] || 99) -
                                (CATEGORY_PRIORITY[b[0]] || 99),
                            )
                            .map(([cat, qty]) => (
                              <div
                                key={cat}
                                className="px-3 py-1 bg-white border border-slate-200 rounded-full flex items-center gap-2 shadow-sm"
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      CATEGORY_COLORS[cat] || "#CBD5E1",
                                  }}
                                ></div>
                                <span className="text-[10px] font-bold text-slate-500">
                                  {cat}
                                </span>
                                <span className="text-[11px] font-black text-slate-900">
                                  {qty as number}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div
                        ref={parent}
                        className={cn(
                          "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4",
                          isKitchenMode &&
                            "grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-10",
                        )}
                      >
                        {Object.entries(group.members)
                          .sort(([a], [b]) => a.localeCompare(b, "th"))
                          .map(([memberName, item]: [string, any]) => {
                            const isDone = item.orders.every(
                              (o: any) =>
                                o.status === "ready" ||
                                o.status === "done" ||
                                o.status === "เสร็จสิ้น",
                            );
                            return (
                              <div
                                key={memberName}
                                className={cn(
                                  "bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300 group relative",
                                  isDone &&
                                    "border-slate-300 shadow-inner opacity-40 grayscale-[0.5]",
                                  isKitchenMode &&
                                    "border-4 border-slate-800 shadow-2xl",
                                  !isDone &&
                                    isKitchenMode &&
                                    "bg-slate-800 ring-8 ring-emerald-500/10",
                                )}
                              >
                                {/* Header Section (Always Prominent) */}
                                <div
                                  className={cn(
                                    "p-5 pb-0 flex justify-between items-start gap-2 relative z-10",
                                    isKitchenMode && "p-8",
                                  )}
                                >
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) =>
                                          handleToggleClick(
                                            time,
                                            memberName,
                                            item,
                                            e,
                                          )
                                        }
                                        className={cn(
                                          "w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-md",
                                          isDone
                                            ? "bg-emerald-500 text-white shadow-emerald-500/40"
                                            : "bg-emerald-50 text-emerald-500 hover:bg-emerald-100 border border-emerald-100",
                                          isKitchenMode &&
                                            "w-16 h-16 rounded-[24px]",
                                        )}
                                      >
                                        <CheckCircle2
                                          size={isKitchenMode ? 36 : 24}
                                          strokeWidth={3}
                                        />
                                      </motion.button>
                                      {item.isRetail && (
                                        <span
                                          className={cn(
                                            "text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-900 text-white",
                                            isKitchenMode &&
                                              "text-base px-4 py-2",
                                          )}
                                        >
                                          Retail
                                        </span>
                                      )}
                                      {item.hasExtraOrder && (
                                        <span
                                          className={cn(
                                            "text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-lg bg-orange-500 text-white",
                                            isKitchenMode &&
                                              "text-base px-4 py-2",
                                          )}
                                        >
                                          สั่งแยก
                                        </span>
                                      )}
                                      {item.hasNotes && !isDone && (
                                        <AlertTriangle
                                          size={isKitchenMode ? 40 : 20}
                                          className="text-red-500 animate-pulse"
                                        />
                                      )}
                                    </div>
                                    <h4
                                      className={cn(
                                        "text-xl font-semibold transition-colors",
                                        isDone
                                          ? "text-slate-400 line-through"
                                          : "text-slate-900 group-hover:text-emerald-600",
                                        isKitchenMode &&
                                          "text-3xl text-white mt-2",
                                      )}
                                    >
                                      {memberName}
                                    </h4>
                                    {item.dropPointName && (
                                      <div className="mt-1">
                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100/50 uppercase tracking-wider",
                                            isKitchenMode && "text-lg px-4 py-1.5 bg-indigo-900 text-indigo-200 border-none mt-2"
                                          )}
                                        >
                                          📍 {item.dropPointName}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div
                                    onClick={(e) =>
                                      handleToggleClick(
                                        time,
                                        memberName,
                                        item,
                                        e,
                                      )
                                    }
                                    className={cn(
                                      "cursor-pointer text-white px-3 py-2 rounded-2xl flex flex-col items-center justify-center shrink-0 min-w-[50px] shadow-lg transition-all hover:scale-105 active:scale-95",
                                      isDone ? "bg-slate-300" : "bg-slate-900",
                                      isKitchenMode &&
                                        "bg-emerald-600 px-8 py-6 rounded-[32px] min-w-[100px]",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "text-2xl font-semibold leading-none",
                                        isKitchenMode && "text-5xl",
                                      )}
                                    >
                                      {item.totalQty}
                                    </span>
                                    <span
                                      className={cn(
                                        "text-[8px] font-semibold uppercase opacity-60 leading-none mt-1",
                                        isKitchenMode && "text-sm",
                                      )}
                                    >
                                      BOX
                                    </span>
                                  </div>
                                </div>

                                {/* Content Section (Faded when Done) */}
                                <div
                                  className={cn(
                                    `px-5 pt-4 flex flex-col gap-4 flex-1`,
                                    isDone ? "opacity-25 grayscale-[1]" : "",
                                    isKitchenMode && "p-8",
                                  )}
                                >
                                  <div className="space-y-3">
                                    {item.orders.map(
                                      (order: any, oIdx: number) => {
                                        const orderDone =
                                          order.status === "ready" ||
                                          order.status === "done" ||
                                          order.status === "เสร็จสิ้น";
                                        return (
                                          <div
                                            key={oIdx}
                                            onClick={(e) =>
                                              toggleSingleItem(order, e)
                                            }
                                            className={cn(
                                              "p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
                                              orderDone
                                                ? "bg-slate-50 border-transparent opacity-60"
                                                : "bg-slate-50 border-slate-100 hover:border-emerald-300 hover:bg-white hover:shadow-sm",
                                              isKitchenMode &&
                                                "p-8 rounded-[32px] border-4",
                                              isKitchenMode &&
                                                !orderDone &&
                                                "bg-slate-700/50 border-slate-600 text-white",
                                            )}
                                          >
                                            <div className="flex justify-between items-start gap-4">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                  <span
                                                    className={cn(
                                                      "w-2 h-2 rounded-full",
                                                      getCategoryBgClass(order.category),
                                                    )}
                                                  ></span>
                                                  <span
                                                    className={cn(
                                                      "text-[11px] font-bold text-slate-900 uppercase tracking-widest",
                                                      isKitchenMode &&
                                                        "text-xl text-emerald-400 font-bold",
                                                    )}
                                                  >
                                                    {order.category}
                                                  </span>
                                                </div>
                                                <p
                                                  className={cn(
                                                    "text-base font-bold leading-tight",
                                                    orderDone
                                                      ? "text-slate-400 line-through"
                                                      : "text-slate-800",
                                                    isKitchenMode && "text-3xl",
                                                    isKitchenMode &&
                                                      !orderDone &&
                                                      "text-white",
                                                  )}
                                                >
                                                  {order.menuName}
                                                  {(() => {
                                                    if (
                                                      order.id &&
                                                      mealIndices[order.id]
                                                    ) {
                                                      return ` (มื้อที่ ${mealIndices[order.id]})`;
                                                    } else if (order.mealType) {
                                                      const matchDigit = String(
                                                        order.mealType,
                                                      ).match(/\d+/);
                                                      return matchDigit
                                                        ? ` (มื้อที่ ${matchDigit[0]})`
                                                        : "";
                                                    }
                                                    return "";
                                                  })()}
                                                </p>
                                              </div>
                                              <div className="flex flex-col items-end gap-1">
                                                <span
                                                  className={cn(
                                                    "text-lg font-bold",
                                                    orderDone
                                                      ? "text-slate-300"
                                                      : "text-slate-900",
                                                    isKitchenMode &&
                                                      "text-5xl font-bold",
                                                    isKitchenMode &&
                                                      !orderDone &&
                                                      "text-emerald-400",
                                                  )}
                                                >
                                                  x{order.qty}
                                                </span>
                                                {orderDone && (
                                                  <CheckCircle2
                                                    size={
                                                      isKitchenMode ? 32 : 16
                                                    }
                                                    className="text-emerald-500"
                                                  />
                                                )}
                                              </div>
                                            </div>
                                            {order.note && (
                                              <div
                                                className={cn(
                                                  `mt-3 flex gap-3 items-start p-3 rounded-2xl`,
                                                  orderDone
                                                    ? "bg-slate-100/30"
                                                    : "bg-rose-50 border border-rose-100",
                                                  isKitchenMode &&
                                                    "p-6 bg-rose-600 border-none shadow-xl animate-pulse mt-6",
                                                )}
                                              >
                                                <AlertTriangle
                                                  size={isKitchenMode ? 32 : 14}
                                                  className={cn(
                                                    orderDone
                                                      ? "text-slate-200"
                                                      : "text-rose-500",
                                                    isKitchenMode &&
                                                      "text-white",
                                                  )}
                                                />
                                                <p
                                                  className={cn(
                                                    `text-xs font-bold leading-tight italic`,
                                                    orderDone
                                                      ? "text-slate-300"
                                                      : "text-rose-700",
                                                    isKitchenMode &&
                                                      "text-2xl text-white not-italic font-bold",
                                                  )}
                                                >
                                                  {order.note}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                </div>

                                <div className="px-4 pb-4 flex flex-col gap-2">
                                  <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-900 uppercase tracking-[0.1em]">
                                      ข้อมูลโภชนาการรวม
                                    </p>
                                    <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                                      {Math.max(0, item.totalKcal)} KCAL
                                    </span>
                                  </div>
                                  <div
                                    className={cn(
                                      "grid gap-2",
                                      printerEnabled
                                        ? "grid-cols-2"
                                        : "grid-cols-1",
                                    )}
                                  >
                                    {printerEnabled && (
                                      <motion.button
                                        whileHover={{ y: -1 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePrintReceipt(
                                            memberName,
                                            time,
                                            item,
                                          );
                                        }}
                                        className="flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600 transition-all border border-slate-100"
                                      >
                                        <Printer size={13} /> พิมพ์
                                      </motion.button>
                                    )}
                                    <motion.button
                                      whileHover={{ y: -1 }}
                                      whileTap={{ scale: 0.96 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNutritionModal({
                                          open: true,
                                          memberName,
                                          item,
                                          time,
                                        });
                                      }}
                                      className="flex items-center justify-center gap-2 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-[10px] font-bold text-emerald-600 transition-all border border-emerald-100 w-full"
                                    >
                                      <Info size={13} /> รายละเอียด
                                    </motion.button>
                                  </div>
                                </div>

                                <div
                                  onClick={(e) =>
                                    handleToggleClick(time, memberName, item, e)
                                  }
                                  className={`h-12 border-t flex items-center justify-center gap-2 cursor-pointer transition-all ${isDone ? "bg-slate-800 border-slate-900 hover:bg-slate-700" : "bg-emerald-50/30 border-emerald-100 hover:bg-emerald-100"}`}
                                >
                                  {isDone ? (
                                    <>
                                      <X size={14} className="text-white" />
                                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                                        ยกเลิกรายการ (UNDO)
                                      </span>
                                    </>
                                  ) : (
                                    <span
                                      className={`text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600`}
                                    >
                                      ยืนยันแพ็คอาหาร (READY)
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </section>
                  ))
              )}
            </>
          )}
        </div>
      </div>

      {/* --- Kitchen Ticket Template (Thermal 80mm) --- */}
      <style>{`
        @media print {
          .custom-scrollbar { overflow: visible !important; }
        }
        .font-receipt {
          font-family: 'Courier New', Courier, monospace;
        }
      `}</style>

      {/* Summary Detail Modal */}
      <AnimatePresence>
        {selectedSummaryMenu && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSummaryMenu(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                      getCategoryBgLightClass(selectedSummaryMenu.category),
                      getCategoryTextClass(selectedSummaryMenu.category),
                    )}
                  >
                    <ChefHat size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">
                      {selectedSummaryMenu.name}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      รายละเอียดการผลิตทั้งสัปดาห์
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSummaryMenu(null)}
                  className="w-10 h-10 rounded-xl bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center border border-slate-100 shadow-sm"
                  title="ปิด"
                  aria-label="ปิด"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {/* Group details by date */}
                {Object.entries(
                  selectedSummaryMenu.details.reduce((acc: any, d: any) => {
                    if (!acc[d.date]) acc[d.date] = [];
                    acc[d.date].push(d);
                    return acc;
                  }, {}),
                )
                  .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                  .map(([date, items]: [string, any]) => (
                    <div key={date} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h4 className="text-sm font-black text-slate-900">
                          {dayjs(date)
                            .locale("th")
                            .format("ddddที่ DD MMMM YYYY")}
                        </h4>
                        <div className="h-[1px] flex-1 bg-slate-100" />
                        <span className="text-xs font-bold text-slate-400">
                          รวม{" "}
                          {items.reduce(
                            (sum: number, i: any) => sum + i.qty,
                            0,
                          )}{" "}
                          กล่อง
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {items.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-white hover:border-emerald-100 transition-all group"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 text-[10px] font-black text-slate-900 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-sm">
                                {item.qty}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">
                                  {item.memberName}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded uppercase tracking-wider">
                                    {item.time}
                                  </span>
                                  {item.notes && (
                                    <span className="text-[10px] font-medium text-amber-600 flex items-center gap-1">
                                      <AlertTriangle size={10} /> {item.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    ยอดรวมทั้งสัปดาห์:
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {selectedSummaryMenu.qty} กล่อง
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSummaryMenu(null)}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                  ตกลง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prep Summary Modal */}
      <AnimatePresence>
        {isPrepSummaryOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrepSummaryOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-gradient-to-br from-indigo-50 to-white">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[24px] bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30">
                    <Package size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 leading-none">
                      สรุปการเตรียมวัตถุดิบ
                    </h2>
                    <p className="text-sm font-bold text-indigo-600 uppercase tracking-[0.2em] mt-3">
                      รายการรวมทั้งสัปดาห์สำหรับจัดการสต็อก
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPrepSummaryOpen(false)}
                  className="w-12 h-12 rounded-2xl bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center border border-slate-100 shadow-sm"
                  title="ปิด"
                  aria-label="ปิด"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30">
                {isLoadingPrep ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-slate-400 font-bold animate-pulse">
                      กำลังคำนวณปริมาณวัตถุดิบ...
                    </p>
                  </div>
                ) : prepSummary.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-6 py-20 text-center">
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                      <AlertTriangle size={48} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-600">
                        ไม่พบข้อมูลสูตรอาหาร
                      </h3>
                      <p className="text-slate-400 mt-2">
                        กรุณาตั้งค่า Recipe ในเมนูที่เกี่ยวข้องก่อน
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prepSummary.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="min-w-0">
                            <h4 className="text-lg font-black text-slate-800 truncate">
                              {item.name}
                            </h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                              ยอดรวมที่ต้องเตรียม
                            </p>
                          </div>
                          <div className="px-4 py-2 bg-indigo-50 rounded-2xl text-indigo-700 text-xl font-black shadow-inner flex items-baseline gap-1">
                            {item.total.toLocaleString()}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                              {item.unit}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 pt-4 border-t border-slate-50">
                          {item.menus.map((m: any, midx: number) => (
                            <div
                              key={midx}
                              className="flex items-center justify-between text-xs font-medium text-slate-500"
                            >
                              <span className="truncate pr-4 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                {m.name}
                              </span>
                              <span className="shrink-0 font-bold text-slate-700">
                                {m.qty} x {m.recipeQty} ={" "}
                                {(m.qty * m.recipeQty).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-500 leading-tight">
                    คำนวณจากยอดผลิตทั้งหมดในสัปดาห์นี้
                    <br />
                    <span className="text-emerald-600">
                      พร้อมสำหรับการจัดซื้อวัตถุดิบแล้ว
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {printerEnabled && (
                    <button
                      onClick={() => window.print()}
                      className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                      <Printer size={18} />
                      พิมพ์รายการ
                    </button>
                  )}
                  <button
                    onClick={() => setIsPrepSummaryOpen(false)}
                    className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
