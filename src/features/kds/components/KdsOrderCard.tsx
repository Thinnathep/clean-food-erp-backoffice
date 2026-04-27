import React, { useEffect, useState } from 'react';
import { Printer, Check } from 'lucide-react';
import type { KdsTask } from '../../../types';

interface Props {
  task: KdsTask;
  onFinish: (id: string) => void;
}

const cleanMenuDetails = (text: string) => {
  if (!text || text === 'EMPTY') return <p className="text-slate-400 italic">No items found</p>;
  
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  
  return lines.map((line, idx) => {
    let cleanLine = line.replace(/=\s*฿[\d,.]+/, '').trim();
    const parts = cleanLine.split('[');
    const main = parts[0];
    const details = parts.slice(1).join('[').replace(']', '');

    return (
      <div key={idx} className="mb-3 last:mb-0 pb-3 border-b border-slate-100 last:border-0">
        <div className="flex justify-between items-start gap-2">
          <span className="text-[11px] font-black text-slate-900 leading-tight">{main.replace(/^-/, '').trim()}</span>
        </div>
        {details && (
          <p className="text-[9px] text-slate-400 mt-1 font-bold leading-relaxed bg-slate-100/50 p-1.5 rounded-lg line-clamp-3">
            {details.trim()}
          </p>
        )}
      </div>
    );
  });
};

export const KdsOrderCard: React.FC<Props> = ({ task, onFinish }) => {
  const [timeDiff, setTimeDiff] = useState(Math.floor((new Date().getTime() - new Date(task.created_at).getTime()) / 1000));
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeDiff(Math.floor((new Date().getTime() - new Date(task.created_at).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [task.created_at]);

  const isLate = timeDiff > (20 * 60); // 20 mins target
  const minutes = Math.floor(timeDiff / 60);
  const seconds = (timeDiff % 60).toString().padStart(2, '0');

  const handleFinish = () => {
    if (window.confirm('ยืนยันปรุงเสร็จสิ้น? (สถานะจะเปลี่ยนเป็นรอส่งอัตโนมัติ)')) {
      onFinish(task.id);
    }
  };

  const printLabel = () => {
    alert(`Printing Kitchen Label for #${task.id.substring(0, 8)}`);
  };

  return (
    <div className={`group bg-white rounded-3xl p-6 shadow-sm border transition-all hover:border-emerald-300 flex flex-col h-full ${isLate ? 'border-red-500 ring-2 ring-red-500/5' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start mb-5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${isLate ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <h4 className="text-xs font-black text-slate-400 tracking-widest uppercase">#{task.order_id}</h4>
          </div>
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter italic">Source: Orders Master</span>
        </div>
        <div className="bg-slate-900 text-white px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest">
          {minutes}:{seconds}
        </div>
      </div>
      
      <div className="flex-1 bg-slate-50/50 p-5 rounded-2xl mb-6 overflow-y-auto max-h-[300px] border border-slate-100">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200/50">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Recipe & Items</span>
          <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">{task.kitchen_status}</span>
        </div>
        {cleanMenuDetails(task.menu_name)}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-auto">
        <button 
          onClick={printLabel}
          className="bg-white border-2 border-slate-100 text-slate-400 p-3 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50">
          <Printer size={14} /> LABEL
        </button>
        <button 
          onClick={handleFinish}
          className="bg-emerald-600 text-white p-3 rounded-2xl hover:bg-slate-900 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
          <Check size={14} /> DONE
        </button>
      </div>
    </div>
  );
};
