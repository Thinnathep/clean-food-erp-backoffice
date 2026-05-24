import React, { useEffect } from 'react';
import { useSmartProductionStore } from '../../../../../../store/smartProductionStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Calendar as CalendarIcon, ChevronLeft, ChevronRight, PackageOpen, AlertCircle, Loader2 } from 'lucide-react';
import { dayjs } from '../../../../../../lib/dateUtils';

export const KdsChecklistView: React.FC = () => {
  const { 
    ingredientItems, 
    isLoading, 
    productionItems, 
    selectedDate, 
    setSelectedDate,
    fetchProductionPlan 
  } = useSmartProductionStore();

  // Fetch on mount and when date changes
  useEffect(() => {
    fetchProductionPlan(selectedDate);
  }, [fetchProductionPlan, selectedDate]);

  const categories = Object.keys(ingredientItems);
  const hasOrders = productionItems.length > 0;
  const hasIngredients = categories.length > 0;

  const changeDate = (days: number) => {
    const newDate = dayjs(selectedDate).add(days, "day").format("YYYY-MM-DD");
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#F7F7F8] flex flex-col font-prompt relative">
       {/* Header */}
       <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
         <div>
           <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
             <div className="p-2 bg-indigo-50 rounded-xl">
               <ClipboardCheck className="text-indigo-600" size={24} />
             </div>
             ใบสั่งเตรียมวัตถุดิบ (Checklist)
           </h1>
           <p className="text-sm text-slate-500 mt-1.5 ml-1">สรุปรายการวัตถุดิบที่ต้องใช้ตามออเดอร์ผลิตประจำวัน</p>
         </div>

         {/* Date Selector */}
         <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60">
            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-slate-900 shadow-sm hover:shadow active:scale-95">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2 px-4 py-1 min-w-[160px] justify-center bg-white rounded-xl shadow-sm border border-slate-200/50">
              <CalendarIcon size={16} className="text-indigo-500" />
              <span className="text-sm font-bold text-slate-700">
                {dayjs(selectedDate).format('DD MMM YYYY')}
              </span>
            </div>
            <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-slate-900 shadow-sm hover:shadow active:scale-95">
              <ChevronRight size={18} />
            </button>
         </div>
       </div>

       {/* Content */}
       <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
         <AnimatePresence mode="wait">
           {isLoading ? (
             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                <Loader2 className="animate-spin mb-4 text-indigo-500" size={36} />
                <p className="font-medium animate-pulse">กำลังคำนวณวัตถุดิบ...</p>
             </motion.div>
           ) : !hasOrders ? (
             <motion.div key="no-orders" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center">
                <div className="w-28 h-28 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                  <PackageOpen size={56} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">ไม่มีออเดอร์ผลิตในวันนี้</h3>
                <p className="text-slate-500 max-w-md">ยังไม่มีรายการสั่งผลิตอาหารสำหรับวันที่ {dayjs(selectedDate).format('DD MMM YYYY')} จึงไม่มีรายการวัตถุดิบที่ต้องเตรียมครับ</p>
             </motion.div>
           ) : !hasIngredients ? (
             <motion.div key="no-recipes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-5xl mx-auto">
               <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 p-6 md:p-8 rounded-3xl mb-10 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm">
                 <div className="bg-amber-100/80 p-4 rounded-2xl shrink-0">
                   <AlertCircle size={32} className="text-amber-600" />
                 </div>
                 <div>
                   <h4 className="text-xl font-bold text-amber-900 mb-2">ยังไม่ได้ผูกสูตรอาหาร (Recipe)</h4>
                   <p className="text-amber-800/90 leading-relaxed">
                     ระบบไม่พบข้อมูลวัตถุดิบ เนื่องจากเมนูที่มีออเดอร์ในวันนี้ยังไม่ได้กำหนดสูตรอาหาร 
                     กรุณาไปที่แท็บ <b>"สูตรเมนู"</b> เพื่อผูกสูตรวัตถุดิบให้ครบถ้วนก่อนครับ <br/>
                     ด้านล่างนี้คือสรุปยอดกล่องรวมต่อเมนู เพื่อให้เตรียมของคร่าวๆ ไปก่อนครับ
                   </p>
                 </div>
               </div>

               <div className="flex items-center gap-3 mb-6 px-2">
                 <div className="w-1.5 h-6 bg-slate-800 rounded-full"></div>
                 <h3 className="font-bold text-slate-800 text-xl">ออเดอร์ผลิตประจำวัน</h3>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                 {productionItems.map((item, idx) => (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: idx * 0.05 }}
                     key={item.menu_item_id} 
                     className="bg-white border border-slate-200/60 p-5 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all group"
                   >
                     <div className="mb-6">
                       <span className="text-[10px] font-bold tracking-wider uppercase bg-slate-50 border border-slate-100 text-slate-500 px-2.5 py-1 rounded-lg mb-3 inline-block">{item.category}</span>
                       <h3 className="font-bold text-slate-800 text-lg leading-snug group-hover:text-indigo-600 transition-colors">{item.menu_name}</h3>
                     </div>
                     <div className="flex items-end justify-between border-t border-slate-50 pt-4 mt-auto">
                       <span className="text-sm text-slate-400 font-medium">ยอดสั่งทำ</span>
                       <div className="text-right">
                         <span className="text-4xl font-black text-slate-800 tracking-tight">{item.total_quantity}</span>
                         <span className="text-sm text-slate-500 ml-1.5 font-medium">กล่อง</span>
                       </div>
                     </div>
                   </motion.div>
                 ))}
               </div>
             </motion.div>
           ) : (
             <motion.div key="has-ingredients" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
               
               {/* Summary Stats Row */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
                  <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                    <span className="text-slate-500 text-sm font-bold mb-1 relative z-10 uppercase tracking-wider">เมนูที่ต้องทำ</span>
                    <span className="text-4xl font-black text-slate-800 relative z-10">{productionItems.length}</span>
                  </div>
                  <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50/50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                    <span className="text-slate-500 text-sm font-bold mb-1 relative z-10 uppercase tracking-wider">ยอดกล่องรวม</span>
                    <div className="relative z-10 flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-indigo-600">{productionItems.reduce((acc, curr) => acc + curr.total_quantity, 0)}</span>
                      <span className="text-sm text-slate-500 font-bold">กล่อง</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                    <span className="text-slate-500 text-sm font-bold mb-1 relative z-10 uppercase tracking-wider">หมวดหมู่วัตถุดิบ</span>
                    <span className="text-4xl font-black text-slate-800 relative z-10">{categories.length}</span>
                  </div>
                  <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50/50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                    <span className="text-slate-500 text-sm font-bold mb-1 relative z-10 uppercase tracking-wider">วัตถุดิบทั้งหมด</span>
                    <div className="relative z-10 flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-emerald-600">
                        {categories.reduce((acc, cat) => acc + ingredientItems[cat].length, 0)}
                      </span>
                      <span className="text-sm text-slate-500 font-bold">รายการ</span>
                    </div>
                  </div>
               </div>

               {/* Ingredients Masonry / Grid */}
               <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
                 {categories.map((cat, idx) => (
                   <motion.div 
                     initial={{ opacity: 0, y: 20 }} 
                     animate={{ opacity: 1, y: 0 }} 
                     transition={{ delay: idx * 0.05 }}
                     key={cat} 
                     className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col break-inside-avoid"
                   >
                     {/* Category Header */}
                     <div className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                       <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2.5">
                         <div className="w-2.5 h-6 rounded-full bg-indigo-500 shadow-sm"></div>
                         {cat}
                       </h3>
                       <span className="text-[11px] font-bold bg-white text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm uppercase tracking-wider">
                         {ingredientItems[cat].length} รายการ
                       </span>
                     </div>
                     
                     {/* Items List */}
                     <div className="p-3 flex flex-col gap-1.5">
                       {ingredientItems[cat].map((item) => (
                         <div key={item.id} className="group p-4 hover:bg-indigo-50/40 rounded-2xl transition-all duration-300 flex items-center justify-between gap-4 border border-transparent hover:border-indigo-100/60 relative overflow-hidden">
                           {/* Hover gradient background effect */}
                           <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 via-indigo-50/0 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                           
                           <div className="flex-1 min-w-0 relative z-10">
                             <div className="flex items-center gap-2 mb-1.5">
                               <h4 className="font-bold text-slate-800 text-[15px] truncate group-hover:text-indigo-900 transition-colors">{item.name}</h4>
                             </div>
                             <div className="flex flex-wrap gap-1.5 mt-2.5">
                               {item.menuRefs.map((ref, i) => (
                                 <span key={i} className="text-[11px] font-medium bg-slate-50 group-hover:bg-white text-slate-500 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-sm flex items-center gap-1.5">
                                   <span className="truncate max-w-[120px] inline-block">{ref.menuName}</span> 
                                   <span className="text-indigo-500 font-black bg-indigo-50 px-1.5 rounded text-[10px]">x{ref.qty}</span>
                                 </span>
                               ))}
                             </div>
                           </div>
                           <div className="text-right shrink-0 bg-slate-50 group-hover:bg-white px-5 py-3 rounded-2xl border border-slate-100 group-hover:border-indigo-100 group-hover:shadow-sm transition-all flex flex-col items-end justify-center min-w-[100px] relative z-10">
                             <span className="text-2xl font-black text-indigo-600 leading-none mb-1.5 tracking-tight group-hover:scale-105 transition-transform origin-right">
                               {item.totalQuantity.toLocaleString(undefined, {maximumFractionDigits:2})}
                             </span>
                             <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{item.unit}</span>
                           </div>
                         </div>
                       ))}
                     </div>
                   </motion.div>
                 ))}
               </div>
             </motion.div>
           )}
         </AnimatePresence>
       </div>
    </div>
  );
};

