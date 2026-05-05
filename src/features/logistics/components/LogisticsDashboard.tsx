import React, { useState, useMemo } from 'react';
import { 
  Truck, MapPin, Navigation, Clock, CheckCircle2, AlertCircle, 
  Users, DollarSign, Search, Filter, Calendar, ChevronRight,
  Package, User, Plus
} from 'lucide-react';
import dayjs from 'dayjs';

// Mock data for demonstration since the store isn't built yet for logistics
const MOCK_DELIVERIES = [
  { id: 'DEL-001', order_id: 'RT-240505-A1', rider: 'สมชาย ขยันส่ง', status: 'IN_PROGRESS', address: '123 ม.5 ต.ช้างเผือก อ.เมือง เชียงใหม่', time: '10:30', earnings: 45 },
  { id: 'DEL-002', order_id: 'RT-240505-B2', rider: 'สมพงษ์ ซิ่งไว', status: 'COMPLETED', address: '45/1 ถ.นิมมานเหมินท์ ซอย 9', time: '09:45', earnings: 40 },
  { id: 'DEL-003', order_id: 'RT-240505-C3', rider: 'วิชัย ส่งเร็ว', status: 'PENDING', address: 'หมู่บ้านลานนาวิลล์ ซอย 4', time: '11:15', earnings: 55 },
  { id: 'DEL-004', order_id: 'RT-240505-D4', rider: 'สมชาย ขยันส่ง', status: 'FAILED', address: 'คอนโดดีซี ป่าตัน', time: '10:15', earnings: 0, reason: 'ลูกค้าไม่รับสาย' },
];

const MOCK_RIDERS = [
  { id: 'R-01', name: 'สมชาย ขยันส่ง', status: 'ACTIVE', deliveries: 12, earnings: 540, avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: 'R-02', name: 'สมพงษ์ ซิ่งไว', status: 'ACTIVE', deliveries: 8, earnings: 320, avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: 'R-03', name: 'วิชัย ส่งเร็ว', status: 'OFFLINE', deliveries: 0, earnings: 0, avatar: 'https://i.pravatar.cc/150?u=3' },
];

export const LogisticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'riders'>('deliveries');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => ({
    total: MOCK_DELIVERIES.length,
    completed: MOCK_DELIVERIES.filter(d => d.status === 'COMPLETED').length,
    inProgress: MOCK_DELIVERIES.filter(d => d.status === 'IN_PROGRESS').length,
    pending: MOCK_DELIVERIES.filter(d => d.status === 'PENDING').length,
    earnings: MOCK_DELIVERIES.reduce((acc, d) => acc + d.earnings, 0)
  }), []);

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
        
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
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
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
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

        <div className="p-0">
          {activeTab === 'deliveries' ? (
            <div className="divide-y divide-slate-50">
              {MOCK_DELIVERIES.map((del) => (
                <div key={del.id} className="p-6 hover:bg-slate-50/50 transition-all flex flex-col md:flex-row md:items-center gap-6 group">
                   <div className="flex items-center gap-4 min-w-[240px]">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        del.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-500' :
                        del.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-500' :
                        del.status === 'PENDING' ? 'bg-orange-50 text-orange-500' :
                        'bg-red-50 text-red-500'
                      }`}>
                        {del.status === 'COMPLETED' ? <CheckCircle2 size={24} /> :
                         del.status === 'IN_PROGRESS' ? <Navigation size={24} /> :
                         del.status === 'PENDING' ? <Clock size={24} /> :
                         <AlertCircle size={24} />}
                      </div>
                      <div>
                        <p className="text-sm font-normal text-slate-800">{del.order_id}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{del.id}</p>
                      </div>
                   </div>

                   <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-slate-600">
                         <MapPin size={14} className="text-slate-400 shrink-0" />
                         <p className="text-sm font-normal line-clamp-1">{del.address}</p>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-400">
                         <span className="flex items-center gap-1"><Clock size={12} /> {del.time} น.</span>
                         <span className="flex items-center gap-1"><User size={12} /> {del.rider}</span>
                      </div>
                   </div>

                   <div className="flex items-center gap-8 min-w-[200px] justify-between md:justify-end">
                      <div className="text-right">
                         <p className="text-sm font-normal text-slate-800">฿{del.earnings}</p>
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest">ค่ารอบ</p>
                      </div>
                      
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        del.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                        del.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' :
                        del.status === 'PENDING' ? 'bg-orange-100 text-orange-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {del.status}
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
               {MOCK_RIDERS.map((rider) => (
                 <div key={rider.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                        rider.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${rider.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {rider.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                        <img src={rider.avatar} alt={rider.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-lg font-normal text-slate-800">{rider.name}</h4>
                        <p className="text-xs text-slate-400">{rider.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl">
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">วันนี้</p>
                         <div className="flex items-center gap-2">
                            <Package size={16} className="text-blue-500" />
                            <span className="text-lg font-normal text-slate-800">{rider.deliveries} งาน</span>
                         </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl">
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">รายได้</p>
                         <div className="flex items-center gap-2">
                            <DollarSign size={16} className="text-emerald-500" />
                            <span className="text-lg font-normal text-slate-800">฿{rider.earnings}</span>
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
