import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, MapPin, Navigation, Clock, CheckCircle2, 
  Users, DollarSign, Search, 
  Package, User, X, RefreshCw, Calculator
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLogisticsStore } from '../../../store/logisticsStore';

export const LogisticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    deliveries = [], 
    riders = [], 
    isLoading, 
    loadLogisticsData, 
    syncDeliveries, 
    updateDeliveryStatus
  } = useLogisticsStore();

  const [activeTab, setActiveTab] = useState<'deliveries' | 'riders'>('deliveries');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLogisticsData();
  }, [loadLogisticsData]);

  const stats = useMemo(() => ({
    total: deliveries?.length || 0,
    completed: (deliveries || []).filter(d => d.status === 'COMPLETED').length,
    inProgress: (deliveries || []).filter(d => d.status === 'IN_PROGRESS' || d.status === 'PICKED_UP').length,
    pending: (deliveries || []).filter(d => d.status === 'ASSIGNED' || d.status === 'PENDING').length,
    earnings: (deliveries || []).reduce((acc, d) => acc + (d.rider_earnings || 0), 0)
  }), [deliveries]);

  const filteredDeliveries = useMemo(() => {
    return (deliveries || []).filter(d => 
      (d.order_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.delivery_address || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [deliveries, searchQuery]);

  const filteredRiders = useMemo(() => {
    return (riders || []).filter(r => 
      (r.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.nickname && r.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [riders, searchQuery]);

  const handleSync = async () => {
    toast.promise(syncDeliveries(), {
      loading: 'กำลังซิงค์ข้อมูลจัดส่งจากออเดอร์รอบวันนี้...',
      success: 'ซิงค์ข้อมูลจัดส่งสำเร็จ ✨',
      error: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล'
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-sans">
      
      {/* ─── Top Header Bar ─── */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5 shadow-xs sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Truck size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                  ระบบจัดการการจัดส่ง & โลจิสติกส์
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Dispatch & Fleet
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">ติดตามสถานะไรเดอร์ การจัดส่งรอบ 11:00-13:00 น. และค่ารอบมาตรฐาน ฿45/จุด</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Tab Switcher */}
            <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
              <button 
                type="button"
                onClick={() => setActiveTab('deliveries')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'deliveries' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Package size={14} className={activeTab === 'deliveries' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>รายการส่ง ({stats.total})</span>
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('riders')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'riders' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users size={14} className={activeTab === 'riders' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>จัดการไรเดอร์ ({riders.length})</span>
              </button>
            </div>

            <button 
              type="button"
              onClick={handleSync}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              title="ซิงค์ข้อมูลจัดส่งจากออเดอร์รอบส่งวันนี้"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-emerald-600' : ''} />
              <span>ซิงค์งาน</span>
            </button>

            <button 
              type="button"
              onClick={() => navigate('/logistics/calculator')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Calculator size={14} />
              <span>คำนวณค่าส่ง</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
        
        {/* Top 4 Bento Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">งานส่งทั้งหมด</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{stats.total} <span className="text-xs font-normal text-slate-400 font-sans">จุด</span></p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">ส่งสำเร็จแล้ว</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">{stats.completed} <span className="text-xs font-normal text-slate-400 font-sans">จุด</span></p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs shrink-0">
              <Navigation size={20} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">กำลังเดินทาง</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-amber-700">{stats.inProgress} <span className="text-xs font-normal text-slate-400 font-sans">จุด</span></p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">ค่ารอบไรเดอร์รวม</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-purple-700">฿{stats.earnings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative group w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'deliveries' ? "ค้นหาเลขออเดอร์หรือที่อยู่..." : "ค้นหาชื่อหรือชื่อเล่นไรเดอร์..."}
              className="w-full pl-10 pr-9 py-2 bg-slate-100/80 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all" 
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-[11px] font-medium text-slate-400">
              {activeTab === 'deliveries' ? `แสดง ${filteredDeliveries.length} จุดส่ง` : `แสดง ${filteredRiders.length} คน`}
            </span>
          </div>
        </div>

        {/* ─── Deliveries Tab Content ─── */}
        {activeTab === 'deliveries' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {filteredDeliveries.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-300">
                  <Truck size={32} />
                </div>
                <h3 className="text-base font-bold text-slate-800">ยังไม่มีรายการจัดส่งรอบวันนี้</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  ระบบพร้อมรับงานจัดส่ง คุณสามารถกดปุ่ม "ซิงค์งาน" ด้านบนเพื่อดึงออเดอร์ของรอบส่งวันนี้เข้าสู่ระบบ
                </p>
                <button
                  type="button"
                  onClick={handleSync}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={14} />
                  <span>ดึงข้อมูลออเดอร์รอบส่งวันนี้</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredDeliveries.map((del) => (
                  <div key={del.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        del.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        (del.status === 'IN_PROGRESS' || del.status === 'PICKED_UP') ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                        del.status === 'ASSIGNED' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {del.status === 'COMPLETED' ? <CheckCircle2 size={20} /> :
                         (del.status === 'IN_PROGRESS' || del.status === 'PICKED_UP') ? <Navigation size={20} /> :
                         del.status === 'ASSIGNED' ? <Clock size={20} /> :
                         <Package size={20} />}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{del.order_id}</p>
                          <span className={`px-2 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                            del.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            (del.status === 'IN_PROGRESS' || del.status === 'PICKED_UP') ? 'bg-blue-100 text-blue-800' :
                            del.status === 'ASSIGNED' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {del.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 flex items-center gap-1 line-clamp-1">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span>{del.delivery_address || 'ไม่มีข้อมูลที่อยู่'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-left md:text-right font-mono">
                        <p className="text-xs font-bold text-slate-900">฿{(del.rider_earnings || 45).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-sans">ค่ารอบไรเดอร์</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {del.status !== 'COMPLETED' && del.status !== 'CANCELLED' && (
                          <button 
                            type="button"
                            onClick={() => updateDeliveryStatus(del.id, 'COMPLETED')}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 size={13} />
                            <span>ส่งสำเร็จ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Riders Tab Content ─── */}
        {activeTab === 'riders' && (
          <div>
            {filteredRiders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-8">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-300">
                  <Users size={32} />
                </div>
                <h3 className="text-base font-bold text-slate-800">ยังไม่มีข้อมูลไรเดอร์ในระบบ</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  ลงทะเบียนไรเดอร์เพื่อจัดสรรงานส่งอาหารรอบ 11:00-13:00 น.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredRiders.map((rider) => (
                  <div key={rider.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 overflow-hidden font-bold">
                          {rider.avatar_url ? (
                            <img src={rider.avatar_url} alt={rider.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{rider.full_name}</h4>
                          <p className="text-xs text-slate-400">{rider.nickname || 'ไรเดอร์'}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        rider.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {rider.is_active ? 'พร้อมส่ง' : 'ออฟไลน์'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-center">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">ค่ารอบต่อจุด</p>
                        <p className="text-xs font-bold text-emerald-700">฿45</p>
                      </div>
                      <div className="border-l border-slate-200 pl-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">เบอร์ติดต่อ</p>
                        <p className="text-xs font-bold text-slate-800">{rider.phone || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
