import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { supabase } from '../../../config/supabase';

dayjs.extend(isoWeek);

// 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 7 = Sunday
export const DEFAULT_DELIVERY_DAYS = [1, 4]; // จันทร์ & พฤหัสบดี (Monday & Thursday)
export const DEFAULT_DELIVERY_TIME_SLOT = '11:00 - 13:00';
export const STANDARD_BAGS_PER_ROUND = 6;

export const DAY_NAMES_TH: Record<number, string> = {
  1: 'จันทร์',
  2: 'อังคาร',
  3: 'พุธ',
  4: 'พฤหัสบดี',
  5: 'ศุกร์',
  6: 'เสาร์',
  7: 'อาทิตย์',
};

export const DAY_NAMES_SHORT_TH: Record<number, string> = {
  1: 'จ.',
  2: 'อ.',
  3: 'พ.',
  4: 'พฤ.',
  5: 'ศ.',
  6: 'ส.',
  7: 'อา.',
};

export interface DeliveryScheduleConfig {
  active_days: number[]; // 1..7
  delivery_time_slot: string;
  mode: 'mon_thu' | 'mon_wed_fri' | 'everyday' | 'custom';
}

export interface ScheduledDeliveryRound {
  roundNumber: number;
  deliveryDate: string; // YYYY-MM-DD
  dayOfWeek: number;    // 1..7 (ISO)
  dayName: string;      // e.g. จันทร์
  dayShortName: string; // e.g. จ.
  quantity: number;     // e.g. 6 or 3
  isRemainder: boolean;
}

export interface CorePackageDeliveryModel {
  id: string;
  name: string;
  mealsTotal: number;
  daysTotal: number;
  price: number;
  roundsCount: number;
  roundQuantities: number[];
  tag: string;
  desc: string;
}

/**
 * Standard Core Clean Food CR package delivery models
 * 1. 7 days: 999 THB | 15 meals | 3 rounds: [6, 6, 3] bags
 * 2. 14 days: 1,899 THB | 30 meals | 5 rounds: [6, 6, 6, 6, 6] bags
 * 3. 1 month / 30 days: 3,999 THB | 63 meals | 11 rounds: 10 rounds of 6 + 1 round of 3 = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3] bags
 */
export const CORE_PACKAGE_DELIVERY_MODELS: CorePackageDeliveryModel[] = [
  {
    id: 'pinto_7d_15m',
    name: 'ผูกปิ่นโต 7 วัน (15 มื้อ)',
    mealsTotal: 15,
    daysTotal: 7,
    price: 999,
    roundsCount: 3,
    roundQuantities: [6, 6, 3],
    tag: 'ทดลองทาน',
    desc: 'จัดส่ง 3 รอบ: 6 + 6 + 3 ถุง (จันทร์ & พฤหัสฯ)',
  },
  {
    id: 'pinto_14d_30m',
    name: 'ผูกปิ่นโต 14 วัน (30 มื้อ)',
    mealsTotal: 30,
    daysTotal: 14,
    price: 1899,
    roundsCount: 5,
    roundQuantities: [6, 6, 6, 6, 6],
    tag: 'ยอดนิยม 🔥',
    desc: 'จัดส่ง 5 รอบ: รอบละ 6 ถุง (จันทร์ & พฤหัสฯ)',
  },
  {
    id: 'pinto_30d_63m',
    name: 'ผูกปิ่นโต 1 เดือน (63 มื้อ)',
    mealsTotal: 63,
    daysTotal: 30,
    price: 3999,
    roundsCount: 11,
    roundQuantities: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3],
    tag: 'สุดคุ้ม ⭐️',
    desc: 'จัดส่ง 11 รอบ: 10 รอบละ 6 ถุง + 1 รอบ 3 ถุง',
  },
];

export const DELIVERY_DAY_PRESETS = [
  {
    id: 'mon_thu' as const,
    name: 'จันทร์ & พฤหัสฯ (2 วัน/สัปดาห์)',
    shortName: 'จันทร์ & พฤหัสฯ',
    tag: 'มาตรฐานร้าน ✨',
    days: [1, 4],
    desc: 'รอบหลักของ Clean Food Chiang Rai',
  },
  {
    id: 'mon_wed_fri' as const,
    name: 'จันทร์, พุธ, ศุกร์ (3 วัน/สัปดาห์)',
    shortName: 'จ., พ., ศ.',
    tag: 'วันเว้นวัน',
    days: [1, 3, 5],
    desc: 'สัปดาห์ละ 3 ครั้ง',
  },
  {
    id: 'mon_fri' as const,
    name: 'จันทร์ - ศุกร์ (5 วัน/สัปดาห์)',
    shortName: 'จันทร์ - ศุกร์',
    tag: 'วันทำงาน',
    days: [1, 2, 3, 4, 5],
    desc: 'เฉพาะวันธรรมดา (จันทร์ - ศุกร์)',
  },
  {
    id: 'everyday' as const,
    name: 'จัดส่งทุกวัน (7 วัน/สัปดาห์)',
    shortName: 'ทุกวัน',
    tag: 'ไม่มีวันหยุด',
    days: [1, 2, 3, 4, 5, 6, 7],
    desc: 'จัดส่งครบทุกวัน จันทร์ - อาทิตย์',
  },
];

/**
 * Dynamically calculate delivery rounds and bag counts per round.
 * Supports exact remainder bags like [6, 6, 3] instead of hardcoding 6 everywhere.
 *
 * @param totalMeals Total number of meals in the package (e.g. 15, 30, 63, or custom)
 * @param maxPerRound Standard batch size per round (default: 6)
 * @returns Array of meal quantities per round, e.g. [6, 6, 3] for 15 meals
 */
export function calculateDeliveryRounds(
  totalMeals: number,
  maxPerRound: number = STANDARD_BAGS_PER_ROUND
): number[] {
  if (!totalMeals || totalMeals <= 0) return [];

  // Match known standard packages first for precision
  if (maxPerRound === 6) {
    if (totalMeals === 15) return [6, 6, 3];
    if (totalMeals === 30) return [6, 6, 6, 6, 6];
    if (totalMeals === 63) return [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3];
  }

  // If meals are less than or equal to round size, it's 1 round
  if (totalMeals <= maxPerRound) {
    return [totalMeals];
  }

  const fullRounds = Math.floor(totalMeals / maxPerRound);
  const remainder = totalMeals % maxPerRound;

  const rounds: number[] = Array(fullRounds).fill(maxPerRound);
  if (remainder > 0) {
    rounds.push(remainder);
  }

  return rounds;
}

/**
 * Formats a human-readable summary string of a delivery plan.
 * E.g. "จัดส่ง 3 รอบ: 6, 6, 3 ถุง" or "จัดส่ง 5 รอบ: รอบละ 6 ถุง"
 */
export function getDeliveryPlanSummary(roundQuantities: number[]): string {
  if (!roundQuantities || roundQuantities.length === 0) return 'ยังไม่มีรอบจัดส่ง';

  const totalRounds = roundQuantities.length;
  const isUniform = roundQuantities.every((q) => q === roundQuantities[0]);

  if (isUniform) {
    return `จัดส่ง ${totalRounds} รอบ: รอบละ ${roundQuantities[0]} ถุง`;
  }

  // Check if it's N rounds of X plus 1 round of Y
  const standardQty = roundQuantities[0];
  const standardRounds = roundQuantities.filter((q) => q === standardQty).length;
  const remainderRounds = roundQuantities.filter((q) => q !== standardQty);

  if (standardRounds >= 1 && remainderRounds.length === 1) {
    return `จัดส่ง ${totalRounds} รอบ: ${standardRounds} รอบละ ${standardQty} ถุง + 1 รอบเศษ ${remainderRounds[0]} ถุง (${roundQuantities.join(' + ')})`;
  }

  return `จัดส่ง ${totalRounds} รอบ: [${roundQuantities.join(', ')}] ถุง`;
}

/**
 * Generates an array of specific delivery dates matching the active delivery days.
 * E.g., for start date on Monday with active days [1, 4] and [6, 6, 3]:
 * - Round 1: Mon (6)
 * - Round 2: Thu (6)
 * - Round 3: next Mon (3)
 *
 * @param startDate Starting date (YYYY-MM-DD)
 * @param roundQuantities Array of meal quantities per round (e.g. [6, 6, 3])
 * @param activeDays Delivery days of week (1=Mon..7=Sun), default [1, 4]
 */
export function generateDeliverySchedule(
  startDate: string,
  roundQuantities: number[],
  activeDays: number[] = DEFAULT_DELIVERY_DAYS
): ScheduledDeliveryRound[] {
  if (!roundQuantities || roundQuantities.length === 0) return [];
  const safeDays = activeDays.length > 0 ? activeDays : DEFAULT_DELIVERY_DAYS;

  const result: ScheduledDeliveryRound[] = [];
  const parsedStart = dayjs(startDate);
  let currentDate = parsedStart.isValid() ? parsedStart : dayjs();

  // Maximum search horizon: 365 days
  let iterations = 0;
  let roundIdx = 0;

  while (roundIdx < roundQuantities.length && iterations < 365) {
    const dayOfWeek = currentDate.isoWeekday(); // 1=Mon .. 7=Sun

    if (safeDays.includes(dayOfWeek)) {
      const qty = roundQuantities[roundIdx];
      const isRemainder = roundIdx === roundQuantities.length - 1 && roundQuantities.length > 1 && qty < roundQuantities[0];

      result.push({
        roundNumber: roundIdx + 1,
        deliveryDate: currentDate.format('YYYY-MM-DD'),
        dayOfWeek,
        dayName: DAY_NAMES_TH[dayOfWeek] || `วัน${dayOfWeek}`,
        dayShortName: DAY_NAMES_SHORT_TH[dayOfWeek] || `${dayOfWeek}`,
        quantity: qty,
        isRemainder,
      });

      roundIdx++;
    }

    currentDate = currentDate.add(1, 'day');
    iterations++;
  }

  return result;
}

/**
 * Returns formatted label for active days
 * E.g. "จันทร์ & พฤหัสบดี (2 วัน/สัปดาห์)"
 */
export function formatActiveDaysLabel(days: number[]): string {
  if (!days || days.length === 0) return 'ยังไม่ได้กำหนดวัน';
  if (days.length === 7) return 'จัดส่งทุกวัน (จันทร์ - อาทิตย์)';
  if (days.length === 2 && days.includes(1) && days.includes(4)) return 'จันทร์ & พฤหัสบดี (2 วัน/สัปดาห์)';
  if (days.length === 3 && days.includes(1) && days.includes(3) && days.includes(5)) return 'จันทร์, พุธ, ศุกร์ (3 วัน/สัปดาห์)';
  if (days.length === 5 && !days.includes(6) && !days.includes(7)) return 'จันทร์ - ศุกร์ (5 วัน/สัปดาห์)';

  return [...days]
    .sort()
    .map((d) => DAY_NAMES_TH[d] || `${d}`)
    .join(', ');
}

/**
 * Fetch store delivery schedule configuration from erp_system_configs (or fallback to erp_settings).
 * Defaults to Monday & Thursday ([1, 4]).
 */
export async function getStoreDeliveryScheduleConfig(): Promise<DeliveryScheduleConfig> {
  // 1. Try erp_system_configs first
  try {
    const { data, error } = await supabase
      .from('erp_system_configs')
      .select('value')
      .eq('key', 'DELIVERY_SCHEDULE')
      .maybeSingle();

    if (!error && data && data.value) {
      const val = data.value as any;
      return {
        active_days: Array.isArray(val.active_days) && val.active_days.length > 0 ? val.active_days : DEFAULT_DELIVERY_DAYS,
        delivery_time_slot: val.delivery_time_slot || DEFAULT_DELIVERY_TIME_SLOT,
        mode: val.mode || 'mon_thu',
      };
    }
  } catch {
    // Graceful fallback to erp_settings
  }

  // 2. Fallback to erp_settings if erp_system_configs table doesn't exist or is empty
  try {
    const { data, error } = await supabase
      .from('erp_settings')
      .select('value')
      .eq('key', 'DELIVERY_SCHEDULE')
      .maybeSingle();

    if (!error && data && data.value) {
      const val = data.value as any;
      return {
        active_days: Array.isArray(val.active_days) && val.active_days.length > 0 ? val.active_days : DEFAULT_DELIVERY_DAYS,
        delivery_time_slot: val.delivery_time_slot || DEFAULT_DELIVERY_TIME_SLOT,
        mode: val.mode || 'mon_thu',
      };
    }
  } catch (err) {
    console.warn('Could not load store delivery schedule, using defaults [1, 4]:', err);
  }

  return {
    active_days: DEFAULT_DELIVERY_DAYS,
    delivery_time_slot: DEFAULT_DELIVERY_TIME_SLOT,
    mode: 'mon_thu',
  };
}

/**
 * Save store delivery schedule configuration to erp_system_configs with fallback to erp_settings.
 */
export async function saveStoreDeliveryScheduleConfig(
  config: DeliveryScheduleConfig
): Promise<void> {
  let saved = false;

  // 1. Try saving to erp_system_configs
  try {
    const { error } = await supabase
      .from('erp_system_configs')
      .upsert(
        {
          key: 'DELIVERY_SCHEDULE',
          value: config,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
    if (!error) saved = true;
  } catch {
    // Proceed to fallback
  }

  // 2. Also try/save to erp_settings to ensure cross-table compatibility
  try {
    const { error: settingsError } = await supabase
      .from('erp_settings')
      .upsert(
        {
          key: 'DELIVERY_SCHEDULE',
          value: config,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
    if (!settingsError) saved = true;
  } catch {
    // If erp_system_configs already saved, ignore
  }

  if (!saved) {
    console.warn('Could not persist delivery schedule config to database; using in-memory state.');
  }
}
