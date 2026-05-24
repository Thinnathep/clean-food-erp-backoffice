import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Database } from "lucide-react";

interface StatusMetricPillProps {
  icon: any;
  count: number;
  label: string;
  description: string;
  textColor: string;
  iconColor: string;
  onClick: () => void;
}

export const StatusMetricPill: React.FC<StatusMetricPillProps> = ({
  icon: Icon,
  count,
  label,
  description,
  textColor,
  iconColor,
  onClick
}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
    >
      {/* Touchable target area for kitchen ergonomics */}
      <button
        onClick={() => {
          onClick();
          setShowInfo(false);
        }}
        className={`flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-xl transition-all duration-300 group hover:shadow-md hover:bg-white border border-transparent hover:border-slate-200 active:scale-95`}
        aria-label={label}
      >
        <div className={`flex items-center justify-center p-1 md:p-1.5 rounded-lg bg-slate-50 group-hover:bg-opacity-50 transition-colors ${iconColor}`}>
           <Icon size={16} className={`transition-transform duration-300 group-hover:scale-110`} />
        </div>
        <span className={`font-bold text-sm md:text-base tracking-tight ${textColor}`}>{count}</span>
      </button>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="absolute top-full mt-3 left-1/2 -translate-x-1/2 z-50 w-72 bg-slate-900/95 backdrop-blur-md text-white p-5 rounded-3xl shadow-2xl border border-white/10 cursor-pointer overflow-hidden"
          >
            <div className={`absolute -inset-4 bg-gradient-to-br ${iconColor.replace('text-', 'from-')}/20 to-transparent opacity-50 blur-2xl rounded-full pointer-events-none`} />
            
            <div className="relative flex items-start gap-4">
              <div className="p-2 rounded-2xl bg-white/10 shrink-0">
                <Info size={20} className={iconColor.includes('indigo') ? 'text-indigo-400' : iconColor.includes('amber') ? 'text-amber-400' : 'text-emerald-400'} />
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1.5 uppercase tracking-wider">{label}</p>
                <p className="text-xs text-slate-300 font-normal leading-relaxed">{description}</p>
                
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                   <p className="text-xs text-slate-400 font-medium flex items-center gap-2 group-hover:text-white transition-colors">
                     กดเพื่อดูรายละเอียด <Database size={12} className="text-emerald-400"/>
                   </p>
                </div>
              </div>
            </div>
            
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900/95 rotate-45 border-t border-l border-white/10 backdrop-blur-md" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
