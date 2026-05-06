
import fs from 'fs';

const filePath = 'd:/VS CODE/CL FOOD CR erp_backoffice/erp_backoffice/src/features/kds/components/MemberPlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix openSlotModal (existingSchedule branch)
const existingScheduleRegex = /isNoRice:\s*existingSchedule\.notes\?\.includes\('\[ไม่รับข้าว\]'\)\s*\|\|\s*false/;
content = content.replace(existingScheduleRegex, "isNoRice: existingSchedule.notes?.includes('[ไม่รับข้าว]') || false,\n        boxSize: existingSchedule.box_size || 'regular'");

// 2. Fix handleSaveModal call to assignMemberSlot
const assignCallRegex = /editingSlot\.orderType\s+\);/;
content = content.replace(assignCallRegex, "editingSlot.orderType,\n      editingSlot.boxSize\n    );");

fs.writeFileSync(filePath, content);
console.log('File updated successfully');
