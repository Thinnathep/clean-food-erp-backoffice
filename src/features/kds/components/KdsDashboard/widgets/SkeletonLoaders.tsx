import React from "react";
import { motion } from "framer-motion";

export const DashboardSkeleton: React.FC = () => (
  <div className="flex-1 p-4 md:p-6 space-y-6 overflow-hidden w-full">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <motion.div 
          key={i} 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="h-32 bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
             <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-pulse" />
             <div className="w-20 h-8 rounded-full bg-slate-100 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="w-1/2 h-4 rounded bg-slate-100 animate-pulse" />
            <div className="w-3/4 h-3 rounded bg-slate-50 animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
    
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="w-full h-[400px] bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6"
    >
       <div className="w-1/4 h-8 rounded bg-slate-100 animate-pulse mb-6" />
       <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((j) => (
             <div key={j} className="w-full h-16 rounded-2xl bg-slate-50 animate-pulse" />
          ))}
       </div>
    </motion.div>
  </div>
);
