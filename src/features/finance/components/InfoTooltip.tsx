import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const InfoTooltip: React.FC<{ text: string; isDarkMode?: boolean }> = ({ text, isDarkMode }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button 
        type="button" 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="ml-1 text-slate-400 hover:text-indigo-500 transition-colors cursor-help"
      >
        <Info size={13} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 4 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-xl text-[11px] leading-relaxed shadow-2xl border pointer-events-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            {text}
            <div className={`absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 -mt-1 ${isDarkMode ? 'bg-slate-800 border-r border-b border-slate-700' : 'bg-white border-r border-b border-slate-200'}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};
