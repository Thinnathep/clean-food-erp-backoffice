
import fs from 'fs';

const filePath = 'd:/VS CODE/CL FOOD CR erp_backoffice/erp_backoffice/src/features/kds/components/MemberPlanner.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove Macros button
const macrosRegex = /<button\s+onClick=\{\(\) => copyDailyMacros\(day\.date\)\}[\s\S]*?<\/button>/;
content = content.replace(macrosRegex, '');

// 2. Update visibility logic
const visibilityRegex = /\{\s*daySchedules\.length > 0 && \(/;
content = content.replace(visibilityRegex, '{(daySchedules.length > 0 || copiedDaySlots) && (');

// 3. Update styling of the container
const containerRegex = /<div className="flex items-center bg-white\/20 backdrop-blur-sm rounded-lg p-0\.5 border border-white\/10">/;
content = content.replace(containerRegex, '<div className={`flex items-center rounded-xl p-1 gap-0.5 border ${day.isToday ? "bg-white/20 backdrop-blur-md border-white/20 shadow-lg" : "bg-slate-100 border-slate-200 shadow-sm"}`}>');

// 4. Fix buttons styling (Copy and Trash)
// Trash
const trashRegex = /<Trash2 size=\{14\} \/>\s+<\/button>/;
content = content.replace(trashRegex, '<Trash2 size={14} />\n                                       </button>');
// Need more specific replacement for classes
content = content.replace(/className=\{`p-1\.5 rounded-md transition-all \$\{day\.isToday \? 'hover:bg-red-500 hover:text-white' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'\}`\}/, 
                        'className={`p-1.5 rounded-lg transition-all ${day.isToday ? "hover:bg-red-500 hover:text-white" : "hover:bg-red-50 text-slate-500 hover:text-red-500"}`}');

content = content.replace(/className=\{`p-1\.5 rounded-md transition-all \$\{day\.isToday \? 'hover:bg-blue-600 hover:text-white' : 'hover:bg-blue-50 text-slate-400 hover:text-blue-600'\}`\}/, 
                        'className={`p-1.5 rounded-lg transition-all ${day.isToday ? "hover:bg-blue-600 hover:text-white" : "hover:bg-blue-50 text-slate-500 hover:text-blue-600"}`}');

fs.writeFileSync(filePath, content);
console.log('File updated successfully');
