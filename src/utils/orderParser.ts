import Fuse from 'fuse.js';
import { dayjs } from '../lib/dateUtils';
import type { MenuItem, Member } from '../types';

export interface ParsedOrder {
  rawText: string;
  memberId: string | null;
  phone: string | null;
  fullName: string | null;
  items: ParsedOrderItem[];
}

export interface ParsedOrderItem {
  date: string | null;
  menuId: string | null;
  menuName: string;
  quantity: number;
  confidence: number;
}

const parsePhone = (text: string): string | null => {
  const match = text.match(/0[0-9]{1,2}-?[0-9]{3}-?[0-9]{4}/);
  if (match) return match[0].replace(/-/g, '');
  return null;
};

const THAI_DAYS: Record<string, number> = {
  'อาทิตย์': 0, 'อา.': 0,
  'จันทร์': 1, 'จ.': 1,
  'อังคาร': 2, 'อ.': 2,
  'พุธ': 3, 'พ.': 3,
  'พฤหัส': 4, 'พฤหัสบดี': 4, 'พฤ.': 4,
  'ศุกร์': 5, 'ศ.': 5,
  'เสาร์': 6, 'ส.': 6,
};

const parseDate = (token: string, referenceDate: Date): string | null => {
  // Check for day names
  for (const [dayName, dayIndex] of Object.entries(THAI_DAYS)) {
    if (token.includes(dayName)) {
      // Find the next occurrence of this day of week starting from reference date
      let d = dayjs(referenceDate);
      // Limit to searching within the current or next week
      for (let i = 0; i < 14; i++) {
        if (d.day() === dayIndex) {
          return d.format('YYYY-MM-DD');
        }
        d = d.add(1, 'day');
      }
    }
  }

  // Check for explicit dates like 18 พ.ค.
  const dateMatch = token.match(/([0-9]{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthIndex = months.indexOf(dateMatch[2]);
    if (monthIndex !== -1) {
      let d = dayjs().month(monthIndex).date(day);
      if (d.isBefore(dayjs().subtract(3, 'months'))) {
         d = d.add(1, 'year');
      }
      return d.format('YYYY-MM-DD');
    }
  }

  return null;
};

export const parseOrderText = (
  rawText: string, 
  members: Member[], 
  menus: MenuItem[],
  referenceDate: Date = new Date(),
  defaultDateStr?: string
): ParsedOrder => {
  const phone = parsePhone(rawText);
  let memberId = null;
  let fullName = null;
  
  if (phone) {
    const foundMember = members.find(m => m.phone?.replace(/-/g, '') === phone);
    if (foundMember) {
      memberId = foundMember.id;
      fullName = foundMember.full_name;
    }
  }

  // Setup Fuse for fuzzy matching
  const fuse = new Fuse(menus, {
    keys: ['name'],
    threshold: 0.4, // Lower is more strict
    includeScore: true,
  });

  const items: ParsedOrderItem[] = [];
  const lines = rawText.split(/[\n,]/).map(l => l.trim()).filter(l => l.length > 0);
  
  let currentDate: string | null = defaultDateStr || null;

  for (const line of lines) {
    // Try to extract date
    const extractedDate = parseDate(line, referenceDate);
    if (extractedDate) {
      currentDate = extractedDate;
    }

    // Skip modifier lines like "เพิ่ม: ..." or "+ ..."
    if (line.match(/^(เพิ่ม|\+|add)\s*:/i)) {
      continue;
    }

    // Clean up prices at the end like "= ฿49" or "฿ 49" or "= 49"
    let cleanLine = line.replace(/=?\s*฿?\s*[0-9]+(\.[0-9]{2})?\s*$/i, '').trim();

    // Check for quantity, e.g. "(*1)", "(x2)", "x2", "x 2", "2 กล่อง", "2 ที่"
    let qty = 1;
    let textToMatch = cleanLine;
    const qtyMatch = cleanLine.match(/\(\s*(?:x|X|\*)\s*([0-9]+)\s*\)|(?:x|X|\*)\s*([0-9]+)|([0-9]+)\s*(กล่อง|ที่|ห่อ|ชุด)|([0-9]+)$/);
    
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1] || qtyMatch[2] || qtyMatch[3] || qtyMatch[4] || qtyMatch[5]);
      // Remove quantity text from the string to help fuzzy matching
      textToMatch = cleanLine.replace(qtyMatch[0], '').trim();
    }

    // Try to match menu
    if (textToMatch.length > 2) { // Ignore too short strings like "18 พ.ค." left overs
      const results = fuse.search(textToMatch);
      if (results.length > 0) {
        // High confidence match
        const bestMatch = results[0];
        if (bestMatch.score !== undefined && bestMatch.score < 0.4) {
          items.push({
            date: currentDate,
            menuId: bestMatch.item.id,
            menuName: bestMatch.item.name,
            quantity: qty,
            confidence: 1 - bestMatch.score // 1 is perfect match
          });
        }
      }
    }
  }

  return {
    rawText,
    phone,
    memberId,
    fullName,
    items
  };
};
