import React, { useState, useMemo } from 'react';
import { 
  Truck, MapPin, Navigation, Clock, CheckCircle2, AlertCircle, 
  Users, DollarSign, Search, Filter, Calendar, ChevronRight,
  Package, User, Plus, X, RefreshCw
} from 'lucide-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useLogisticsStore } from '../../../store/logisticsStore';

export const LogisticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    deliveries, riders, isLoading, 
    loadLogisticsData, syncDeliveries, updateDeliveryStatus, assignRider 
  } = useLogisticsStore();
  const [activeTab, setActiveTab] = useState<'deliveries' | 'riders'>('deliveries');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    loadLogisticsData();
  }, [loadLogisticsData]);

  const stats = useMemo(() => ({
    total: deliveries.length,
    completed: deliveries.filter(d => d.status === 'COMPLETED').length,
    inProgress: deliveries.filter(d => d.status === 'IN_PROGRESS' || d.status === 'PICKED_UP').length,
    pending: deliveries.filter(d => d.status === 'ASSIGNED').length,
    earnings: deliveries.reduce((acc, d) => acc + (d.rider_earnings || 0), 0)
  }), [deliveries]);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => 
      d.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.delivery_address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [deliveries, searchQuery]);

  const filteredRiders = useMemo(() => {
    return riders.filter(r => 
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.nickname && r.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [riders, searchQuery]);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-normal text-slate-800 tracking-tight flex items-center gap-3">
            <Truck className="text-blue-500" size={32} />
            ระบบจัดการการส่งอาหาร
          </h1>
          <p className="text-slate-500 mt-2 font-normal">ติดตามสถานะไรเดอร์ การส่งมอบ และการจ่ายค่ารอบแบบ Real-time</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100 items-center gap-2">
          <button 
             onClick={syncDeliveries}
             className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center gap-2 border border-slate-100"
             title="ซิงค์ข้อมูลจากตารางงานวันนี้"
          >
             <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
             ซิงค์งาน
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button 
            onClick={() => navigate('/logistics/calculator')}
            className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2 border border-emerald-100"
          >
            <Navigation size={16} />
            คำนวณค่าส่ง
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button 
            onClick={() => setActiveTab('deliveries')}
            className={`px-6 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${activeTab === 'deliveries' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Package size={18} /> รายการส่ง
          </button>
          <button 
            onClick={() => setActiveTab('riders')}
            className={`px-6 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${activeTab === 'riders' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Users size={18} /> จัดการไรเดอร์
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
            <Package size={28} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">งานทั้งหมด</p>
            <h4 className="text-2xl font-normal text-slate-800">{stats.total}</h4>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">ส่งสำเร็จ</p>
            <h4 className="text-2xl font-normal text-slate-800">{stats.completed}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
            <Navigation size={28} className="animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">กำลังส่ง</p>
            <h4 className="text-2xl font-normal text-slate-800">{stats.inProgress}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500">
            <DollarSign size={28} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">ค่ารอบรวมวันนี้</p>
            <h4 className="text-2xl font-normal text-slate-800">฿{stats.earnings.toLocaleString()}</h4>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder={activeTab === 'deliveries' ? "ค้นหาหมายเลขออเดอร์หรือที่อยู่..." : "ค้นหาชื่อไรเดอร์..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
             <button className="px-4 py-3 bg-slate-50 text-slate-600 rounded-2xl text-sm flex items-center gap-2 hover:bg-slate-100 transition-all">
               <Calendar size={18} />
               {dayjs().locale('th').format('DD MMM YYYY')}
             </button>
             <button className="px-4 py-3 bg-slate-50 text-slate-600 rounded-2xl text-sm flex items-center gap-2 hover:bg-slate-100 transition-all">
               <Filter size={18} />
               กรองข้อมูล
             </button>
          </div>
        </div>

        <div className="p-0 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          )}
          {activeTab === 'deliveries' ? (
            <div className="divide-y divide-slate-50">
              {filteredDeliveries.map((del) => (
                <div key={del.id} className="p-6 hover:bg-slate-50/50 transition-all flex flex-col md:flex-row md:items-center gap-6 group">
                   <div className="flex items-center gap-4 min-w-[240px]">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        del.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-500' :
                        (del.status === 'IN_PROGRESS' || del.status === 'PICKED_UP') ? 'bg-blue-50 text-blue-500' :
                        del.status === 'ASSIGNED' ? 'bg-orange-50 text-orange-500' :
                        'bg-red-50 text-red-500'
                      }`}>
                        {del.status === 'COMPLETED' ? <CheckCircle2 size={24} /> :
                         (del.status === 'IN_PROGRESS' || del.status === 'PICKED_UP') ? <Navigation size={24} /> :
                         del.status === 'ASSIGNED' ? <Clock size={24} /> :
                         <AlertCircle size={24} />}
                      </div>
                      <div>
                        <p className="text-sm font-normal text-slate-800">{del.order_id}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{del.id.slice(0, 8)}</p>
                      </div>
                   </div>

                   <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-slate-600">
                         <MapPin size={14} className="text-slate-400 shrink-0" />
                         <p className="text-sm font-normal line-clamp-1">{del.delivery_address}</p>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-400">
                         <span className="flex items-center gap-1"><Clock size={12} /> {dayjs(del.created_at).format('HH:mm')} น.</span>
                         <span className="flex items-center gap-1"><User size={12} /> {del.rider?.full_name || 'ไม่ได้มอบหมาย'}</span>
                      </div>
                   </div>

                   <div className="flex items-center gap-8 min-w-[200px] justify-between md:justify-end">
                      <div className="text-right">
                         <p className="text-sm font-normal text-slate-800">฿{del.rider_earnings}</p>
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest">ค่ารอบ</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          del.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                          (del.status === 'IN_PROGRESS' || del.status === 'PICKED_UP') ? 'bg-blue-100 text-blue-600' :
                          del.status === 'ASSIGNED' ? 'bg-orange-100 text-orange-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {del.status}
                        </div>
                        
                        {del.status !== 'COMPLETED' && del.status !== 'CANCELLED' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              updateDeliveryStatus(del.id, 'COMPLETED');
                            }}
                            className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="ทำเครื่องหมายว่าส่งสำเร็จ"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}

                        {del.status === 'PENDING' && (
                          <div className="relative group/menu">
                            <button className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-1 text-xs">
                               <Plus size={16} /> จ่ายงาน
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 hidden group-hover/menu:block z-50 overflow-hidden">
                               <p className="p-3 text-[10px] text-slate-400 uppercase tracking-widest font-bold border-b border-slate-50">เลือกไรเดอร์</p>
                               {riders.map(r => (
                                 <button 
                                   key={r.id}
                                   onClick={() => assignRider(del.id, r.id)}
                                   className="w-full text-left p-3 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                                 >
                                   <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">
                                     {r.nickname?.slice(0, 1) || 'R'}
                                   </div>
                                   {r.nickname || r.full_name}
                                 </button>
                               ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button className="p-2 text-slate-300 group-hover:text-slate-600 transition-colors">
                        <ChevronRight size={20} />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
               {filteredRiders.map((rider) => (
                 <div key={rider.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                        rider.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${rider.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {rider.is_active ? 'พร้อมส่ง' : 'ออฟไลน์'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-50 flex items-center justify-center text-slate-200">
                        {rider.avatar_url ? (
                          <img src={rider.avatar_url} alt={rider.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={32} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-normal text-slate-800">{rider.full_name}</h4>
                        <p className="text-xs text-slate-400">{rider.nickname || 'ไรเดอร์'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl">
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">สถานะ</p>
                         <div className="flex items-center gap-2">
                            <span className="text-sm font-normal text-slate-800">{rider.is_active ? 'กำลังสแตนบาย' : 'พักเบรก'}</span>
                         </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl">
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">ค่ารอบ/วัน</p>
                         <div className="flex items-center gap-2">
                            <DollarSign size={16} className="text-emerald-500" />
                            <span className="text-lg font-normal text-slate-800">฿{rider.daily_rate || 0}</span>
                         </div>
                      </div>
                    </div>

                    <button className="w-full mt-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-normal hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                      <FileText size={18} /> ดูประวัติงาน
                    </button>
                 </div>
               ))}
               
               <button className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500/50 hover:bg-blue-50/20 transition-all gap-3 group">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                  </div>
                  <span className="text-sm font-normal">ลงทะเบียนไรเดอร์ใหม่</span>
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FileText = ({ size }: { size: number }) => <Package size={size} />; // Fallback for demonstration
