
import fs from 'fs';

const filePath = 'd:/VS CODE/CL FOOD CR erp_backoffice/erp_backoffice/src/features/kds/components/MemberPlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetDiv = '<div className="flex flex-col lg:flex-row w-full lg:w-auto items-stretch gap-2">';
const replacement = targetDiv + `
                   {copiedDaySlots && (
                     <button 
                       onClick={clearCopiedPlan}
                       className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center justify-center gap-2"
                     >
                       <X size={14} />
                       ยกเลิกการคัดลอก
                     </button>
                   )}`;

content = content.replace(targetDiv, replacement);

fs.writeFileSync(filePath, content);
console.log('File updated successfully');
