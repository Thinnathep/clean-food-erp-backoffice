import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Receipt, 
  Truck, 
  Tag, 
  Copy,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface OrderItem {
  id: string;
  name: string;
  price: number | '';
  quantity: number;
}

export const OrderCalculator: React.FC = () => {
  const [items, setItems] = useState<OrderItem[]>([
    { id: crypto.randomUUID(), name: '', price: '', quantity: 1 }
  ]);
  const [deliveryFee, setDeliveryFee] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [isCopied, setIsCopied] = useState(false);
  const [customerNote, setCustomerNote] = useState('');

  // Focus management
  const handleAddItem = () => {
    setItems([...items, { id: crypto.randomUUID(), name: '', price: '', quantity: 1 }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      return sum + (price * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const delivery = Number(deliveryFee) || 0;
  const dist = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal + delivery - dist);

  const resetCalculator = () => {
    setItems([{ id: crypto.randomUUID(), name: '', price: '', quantity: 1 }]);
    setDeliveryFee('');
    setDiscount('');
    setCustomerNote('');
    toast.success('รีเซ็ตเครื่องคิดเลขแล้ว');
  };

  const generateReceiptText = () => {
    let text = `🧾 สรุปยอดสั่งซื้อ\n\n`;
    
    if (customerNote.trim()) {
      text += `ลูกค้าระบุ: ${customerNote.trim()}\n\n`;
    }

    let hasItems = false;
    items.forEach((item, index) => {
      const p = Number(item.price) || 0;
      const total = p * item.quantity;
      if (p > 0) {
        hasItems = true;
        text += `${index + 1}. ${item.name || 'เมนูอาหาร'} (${p}฿ x ${item.quantity}) = ${total.toLocaleString()}฿\n`;
      }
    });

    if (!hasItems) return 'ยังไม่มีรายการอาหารที่มีราคาค่ะ';

    text += `\nรวมค่าอาหาร: ${subtotal.toLocaleString()}฿\n`;
    
    if (delivery > 0) {
      text += `ค่าจัดส่ง: ${delivery.toLocaleString()}฿\n`;
    }
    
    if (dist > 0) {
      text += `ส่วนลด: -${dist.toLocaleString()}฿\n`;
    }

    text += `\nยอดสุทธิ: ${grandTotal.toLocaleString()}฿\n`;
    text += `\nขอบคุณที่อุดหนุนค่ะ 🙏`;
    return text;
  };

  const handleCopy = () => {
    const text = generateReceiptText();
    if (text === 'ยังไม่มีรายการอาหารที่มีราคาค่ะ') {
      toast.error('กรุณาระบุราคาอาหารอย่างน้อย 1 รายการ');
      return;
    }
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success('คัดลอกสรุปยอดเรียบร้อยแล้ว นำไปวางในแชทได้เลยค่ะ');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
            <Calculator size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Order Calculator</h3>
            <p className="text-xs text-slate-500 font-medium">ระบบคำนวณยอดออเดอร์สำหรับตอบแชทลูกค้า</p>
          </div>
        </div>
        <button 
          onClick={resetCalculator}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-all"
        >
          <RefreshCw size={16} /> เริ่มใหม่ (Reset)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Input Panel */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
              
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Receipt size={18} className="text-indigo-500" /> รายการอาหาร (Menu Items)
                </h3>
                <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                  {items.length} รายการ
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <div className="col-span-5">ชื่อเมนู (Optional)</div>
                  <div className="col-span-3">ราคา/หน่วย (฿)</div>
                  <div className="col-span-3 text-center">จำนวน</div>
                  <div className="col-span-1"></div>
                </div>

                <AnimatePresence>
                  {items.map((item, index) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-12 gap-3 items-center"
                    >
                      <div className="col-span-5 relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs w-4">
                          {index + 1}.
                        </div>
                        <input 
                          type="text" 
                          placeholder="ชื่อเมนู (ไม่ใส่ก็ได้)"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        />
                      </div>
                      
                      <div className="col-span-3 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">฿</div>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="0"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:font-normal placeholder:text-slate-300"
                        />
                      </div>

                      <div className="col-span-3">
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1">
                          <button 
                            onClick={() => updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm rounded-lg transition-all"
                          >
                            -
                          </button>
                          <span className="text-sm font-black text-slate-800 w-8 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm rounded-lg transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length === 1}
                          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <button 
                  onClick={handleAddItem}
                  className="w-full py-3 mt-1 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all"
                >
                  <Plus size={16} /> เพิ่มรายการ (Add Item)
                </button>

                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase self-center mr-1">เมนูด่วน:</span>
                  {[
                    { name: 'อกไก่ปั่น', price: 59 },
                    { name: 'ข้าวกล่องคลีน', price: 79 },
                    { name: 'โปร 30 มื้อ', price: 1799 }
                  ].map(menu => (
                    <button
                      key={menu.name}
                      onClick={() => setItems([...items, { id: crypto.randomUUID(), name: menu.name, price: menu.price, quantity: 1 }])}
                      className="px-2.5 py-1 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 text-[11px] font-bold rounded-lg transition-all"
                    >
                      + {menu.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra Costs */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-100">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    <Truck size={14} className="text-slate-400" /> ค่าจัดส่ง (Delivery Fee)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    <Tag size={14} className="text-slate-400" /> ส่วนลด (Discount)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2.5 bg-red-50/50 border border-red-100 rounded-xl text-sm font-black text-red-600 focus:border-red-500 focus:bg-red-50 outline-none transition-all placeholder:text-red-200"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Note */}
              <div className="mt-5 pt-5 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                  หมายเหตุ / ชื่อลูกค้า (Note)
                </label>
                <input 
                  type="text" 
                  placeholder="พิมพ์ชื่อลูกค้า หรือข้อความพิเศษ (จะแสดงในบิล)"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Receipt & Summary */}
          <div className="lg:col-span-4">
            <div className="bg-slate-900 rounded-3xl p-6 shadow-xl sticky top-32 text-white">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Grand Total</h3>
              
              <div className="space-y-4 text-sm font-medium border-b border-slate-800 pb-6 mb-6">
                <div className="flex justify-between items-center text-slate-300">
                  <span>ยอดรวมอาหาร ({items.length} รายการ)</span>
                  <span className="font-bold text-white">฿{subtotal.toLocaleString()}</span>
                </div>
                {delivery > 0 && (
                  <div className="flex justify-between items-center text-slate-300">
                    <span>ค่าจัดส่ง</span>
                    <span className="font-bold text-white">฿{delivery.toLocaleString()}</span>
                  </div>
                )}
                {dist > 0 && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>ส่วนลด</span>
                    <span className="font-bold">-฿{dist.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end mb-8">
                <span className="text-slate-400 font-medium">ยอดชำระสุทธิ</span>
                <div className="text-right">
                  <span className="text-4xl font-black tracking-tight text-white">
                    ฿{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <button 
                onClick={handleCopy}
                className={cn(
                  "w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-300",
                  isCopied 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" 
                    : "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25"
                )}
              >
                {isCopied ? (
                  <><CheckCircle2 size={18} /> คัดลอกสำเร็จ!</>
                ) : (
                  <><Copy size={18} /> คัดลอกสรุปยอด (Copy to Chat)</>
                )}
              </button>

              {/* Receipt Preview */}
              <div className="mt-6 pt-6 border-t border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">ตัวอย่างข้อความ</p>
                <div className="bg-slate-800/50 rounded-xl p-4 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {generateReceiptText()}
                </div>
              </div>
            </div>
          </div>

      </div>
    </div>
  );
};
