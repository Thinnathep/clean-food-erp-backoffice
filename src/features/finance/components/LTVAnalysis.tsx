import React, { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase';
import type { Member } from '../../../types';
import { Users, TrendingUp, Search, Crown, ArrowRight } from 'lucide-react';

interface Props {
  isDarkMode?: boolean;
}

export const LTVAnalysis: React.FC<Props> = ({ isDarkMode = false }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTopSpenders();
  }, []);

  const fetchTopSpenders = async () => {
    try {
      const { data, error } = await supabase
        .from('erp_members')
        .select('*')
        .order('lifetime_value', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching LTV:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone.includes(searchTerm)
  );

  const card = isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const heading = isDarkMode ? 'text-white' : 'text-slate-800';
  const subtext = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-6 rounded-3xl border transition-all ${card}`}>
          <div className="flex items-center gap-3 mb-2 text-emerald-500">
            <Crown size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Most Valuable Customer</span>
          </div>
          <p className={`text-2xl font-bold ${heading}`}>
            {members[0]?.full_name || 'Loading...'}
          </p>
          <p className="text-emerald-500 font-bold mt-1">
            ฿{(members[0]?.lifetime_value || 0).toLocaleString()} <span className="text-[10px] font-normal text-slate-500">Spent to date</span>
          </p>
        </div>

        <div className={`p-6 rounded-3xl border transition-all ${card}`}>
          <div className="flex items-center gap-3 mb-2 text-blue-500">
            <Users size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Total Active Clients</span>
          </div>
          <p className={`text-2xl font-bold ${heading}`}>
            {members.length.toLocaleString()} <span className="text-sm font-normal text-slate-500">Profiles analyzed</span>
          </p>
        </div>

        <div className={`p-6 rounded-3xl border transition-all ${card}`}>
          <div className="flex items-center gap-3 mb-2 text-purple-500">
            <TrendingUp size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Avg. LTV</span>
          </div>
          <p className={`text-2xl font-bold ${heading}`}>
            ฿{(members.reduce((s, m) => s + (m.lifetime_value || 0), 0) / (members.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* List */}
      <div className={`rounded-3xl border transition-all overflow-hidden ${card}`}>
        <div className="p-6 border-b border-slate-700/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
              <h3 className={`text-lg font-bold ${heading}`}>ทำเนียบลูกค้าประจำ (Top Spenders)</h3>
              <p className="text-xs text-slate-500 mt-0.5">จัดอันดับลูกค้าตามยอดการใช้จ่ายสะสม (Lifetime Value)</p>
           </div>
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="ค้นหาชื่อหรือเบอร์โทร..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 rounded-2xl border text-sm w-full md:w-64 outline-none transition-all ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-300 focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-emerald-500'
                }`}
              />
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                 <tr className={`text-[10px] font-bold uppercase tracking-wider ${subtext}`}>
                    <th className="px-6 py-4">อันดับ</th>
                    <th className="px-6 py-4">ลูกค้า</th>
                    <th className="px-6 py-4">จำนวนออเดอร์</th>
                    <th className="px-6 py-4">ยอดใช้จ่ายสะสม (LTV)</th>
                    <th className="px-6 py-4">สถานะ</th>
                    <th className="px-6 py-4 text-right">แอ็คชัน</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/10">
                 {loading ? (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
                 ) : filteredMembers.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">ไม่พบข้อมูลลูกค้า</td></tr>
                 ) : filteredMembers.map((m, idx) => (
                    <tr key={m.id} className={`hover:bg-slate-500/5 transition-colors group`}>
                       <td className="px-6 py-4">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                             idx === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                             idx === 1 ? 'bg-slate-300/20 text-slate-400 border border-slate-400/30' :
                             idx === 2 ? 'bg-orange-500/20 text-orange-600 border border-orange-500/30' :
                             'bg-slate-100 text-slate-500'
                          }`}>
                             {idx + 1}
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 flex items-center justify-center text-emerald-600 font-bold border border-emerald-500/20">
                                {m.full_name.charAt(0)}
                             </div>
                             <div>
                                <p className={`text-sm font-bold ${heading}`}>{m.full_name}</p>
                                <p className="text-[10px] text-slate-500">{m.phone}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <p className={`text-sm font-bold ${heading}`}>{m.total_orders || 0} <span className="text-[10px] font-normal text-slate-500">ออเดอร์</span></p>
                       </td>
                       <td className="px-6 py-4">
                          <p className="text-sm font-bold text-emerald-600">฿{(m.lifetime_value || 0).toLocaleString()}</p>
                       </td>
                       <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                             (m.lifetime_value || 0) > 10000 ? 'bg-purple-500/10 text-purple-500 border border-purple-500/30' :
                             (m.lifetime_value || 0) > 3000 ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30' :
                             'bg-slate-100 text-slate-400'
                          }`}>
                             {(m.lifetime_value || 0) > 10000 ? 'VIP Platinum' : (m.lifetime_value || 0) > 3000 ? 'Regular' : 'New Member'}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button className="p-2 rounded-xl hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 transition-all">
                             <ArrowRight size={18} />
                          </button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};
