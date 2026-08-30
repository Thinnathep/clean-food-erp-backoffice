import React, { useState } from 'react';
import { 
  Map, Truck, Navigation, 
  MapPin, User, ChevronRight, Phone, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface RouteStop {
  id: string;
  sequence: number;
  customer_name: string;
  address: string;
  phone: string;
  boxes: number;
  status: 'PENDING' | 'DELIVERED';
}

interface DeliveryRoute {
  id: string;
  route_name: string;
  zone: string;
  rider_name: string;
  total_stops: number;
  completed_stops: number;
  total_boxes: number;
  departure_time: string;
  status: 'READY' | 'DISPATCHED' | 'COMPLETED';
  stops: RouteStop[];
}

export const RouteManagement: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<'จันทร์' | 'พุธ' | 'ศุกร์'>('จันทร์');
  const [routes, setRoutes] = useState<DeliveryRoute[]>([
    {
      id: 'R-01',
      route_name: 'สายในเมือง 1 (รอบเวียง - ค่ายเม็งราย)',
      zone: 'โซนในเมือง (รัศมี 5 กม.)',
      rider_name: 'สมชาย วงศ์สวัสดิ์',
      total_stops: 6,
      completed_stops: 2,
      total_boxes: 12,
      departure_time: '11:15 น.',
      status: 'DISPATCHED',
      stops: [
        { id: 'S1', sequence: 1, customer_name: 'คุณพัชราพร (รพ.เชียงราย)', address: 'อาคารผู้ป่วยนอก ชั้น 3', phone: '081-234-5678', boxes: 2, status: 'DELIVERED' },
        { id: 'S2', sequence: 2, customer_name: 'คุณณัฐพล', address: '124/5 ถ.สิงหไคล ต.เวียง', phone: '089-987-6543', boxes: 2, status: 'DELIVERED' },
        { id: 'S3', sequence: 3, customer_name: 'คุณกรรณิการ์', address: '88 หมู่ 4 ถ.ธนาลัย', phone: '084-555-1234', boxes: 2, status: 'PENDING' },
      ]
    },
    {
      id: 'R-02',
      route_name: 'สายศูนย์ราชการ & แม่ฟ้าหลวง',
      zone: 'โซนนอกเมือง (สายเหนือ)',
      rider_name: 'วิชาญ แก้วมณี',
      total_stops: 4,
      completed_stops: 0,
      total_boxes: 8,
      departure_time: '11:30 น.',
      status: 'READY',
      stops: [
        { id: 'S4', sequence: 1, customer_name: 'คุณสิทธิชัย (ศาลากลาง)', address: 'ศาลากลางจังหวัดเชียงราย', phone: '082-111-2233', boxes: 4, status: 'PENDING' },
        { id: 'S5', sequence: 2, customer_name: 'ดร.อรัญญา (มฟล.)', address: 'อาคาร C1 มหาวิทยาลัยแม่ฟ้าหลวง', phone: '086-444-7788', boxes: 4, status: 'PENDING' },
      ]
    }
  ]);

  const [activeRouteId, setActiveRouteId] = useState<string>(routes[0]?.id || '');
  const activeRoute = routes.find(r => r.id === activeRouteId) || routes[0];

  const handleGenerateRoutes = () => {
    toast.success(`คำนวณและสร้างแผนเส้นทางรอบวัน${selectedDay} เรียบร้อย ✨`);
  };

  const handleDispatch = (routeId: string) => {
    setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: 'DISPATCHED' } : r));
    toast.success('ปล่อยรถออกส่งอาหารเรียบร้อย 🛵');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-sans">
      
      {/* ─── Top Header Bar ─── */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5 shadow-xs sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Map size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                  วางแผนและจัดการเส้นทางส่ง (Route Dispatch)
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Delivery Routes
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">จัดกลุ่มออเดอร์ตามโซน มอบหมายสายส่งให้ไรเดอร์ และติดตามการวิ่งส่ง</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Delivery Day Switcher */}
            <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
              {(['จันทร์', 'พุธ', 'ศุกร์'] as const).map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedDay === day 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  วัน{day}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleGenerateRoutes}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <Sparkles size={14} />
              <span>สร้างเส้นทางอัตโนมัติ</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
        
        {/* Route Overview & Timeline Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Route Cards */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              สายส่งรอบวัน{selectedDay} ({routes.length} สาย)
            </h3>

            {routes.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <Truck size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">ยังไม่มีการสร้างเส้นทาง</p>
                <p className="text-[11px] text-slate-400 mt-1">กดปุ่ม "สร้างเส้นทางอัตโนมัติ" เพื่อจัดกลุ่ม</p>
              </div>
            ) : (
              routes.map(r => {
                const isSelected = r.id === activeRoute?.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setActiveRouteId(r.id)}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-xs space-y-3 ${
                      isSelected 
                        ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/10' 
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{r.route_name}</h4>
                        <p className="text-xs text-slate-500">{r.zone}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status === 'COMPLETED' ? 'ส่งครบแล้ว' : r.status === 'DISPATCHED' ? 'กำลังนำส่ง' : 'รอปล่อยรถ'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-2xl font-mono text-center text-xs">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 font-sans">จุดส่ง</p>
                        <p className="font-bold text-slate-900">{r.completed_stops}/{r.total_stops}</p>
                      </div>
                      <div className="border-l border-slate-200">
                        <p className="text-[9px] font-bold text-slate-400 font-sans">กล่องรวม</p>
                        <p className="font-bold text-emerald-700">{r.total_boxes} กล่อง</p>
                      </div>
                      <div className="border-l border-slate-200">
                        <p className="text-[9px] font-bold text-slate-400 font-sans">เวลารถออก</p>
                        <p className="font-bold text-slate-700">{r.departure_time}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <span>{r.rider_name}</span>
                      </div>
                      <ChevronRight size={15} className={isSelected ? 'text-emerald-600' : 'text-slate-300'} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Route Stops Timeline & Dispatch Details */}
          <div className="lg:col-span-2 space-y-4">
            {activeRoute ? (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                
                {/* Active Route Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{activeRoute.route_name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>ไรเดอร์: <strong>{activeRoute.rider_name}</strong></span>
                      <span>•</span>
                      <span>รอบเวลาส่ง: 11:00 - 13:00 น.</span>
                    </p>
                  </div>

                  {activeRoute.status === 'READY' && (
                    <button
                      type="button"
                      onClick={() => handleDispatch(activeRoute.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <Navigation size={14} />
                      <span>ปล่อยรถออกส่งทันที</span>
                    </button>
                  )}
                </div>

                {/* Stops Timeline */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    ลำดับจุดแวะส่ง ({activeRoute.stops.length} จุด)
                  </h4>

                  <div className="space-y-3">
                    {activeRoute.stops.map((stop) => (
                      <div 
                        key={stop.id}
                        className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100"
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          stop.status === 'DELIVERED' 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {stop.sequence}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="text-xs font-bold text-slate-900">{stop.customer_name}</h5>
                            <span className="text-xs font-mono font-bold text-emerald-700">{stop.boxes} กล่อง</span>
                          </div>

                          <p className="text-xs text-slate-600 flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span>{stop.address}</span>
                          </p>

                          <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Phone size={11} />
                            <span>{stop.phone}</span>
                          </p>
                        </div>

                        {stop.status === 'DELIVERED' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold shrink-0">
                            ส่งแล้ว ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold shrink-0">
                            รอส่ง
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-8">
                <p className="text-xs text-slate-400">เลือกสายส่งจากรายการทางซ้ายเพื่อดูรายละเอียด</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
