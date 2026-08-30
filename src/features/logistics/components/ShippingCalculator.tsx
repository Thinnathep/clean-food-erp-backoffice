import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
// @ts-ignore
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, Info, Copy, Calculator, ShoppingBag, Loader2, Settings as SettingsIcon, Search, Map as MapIcon, AlertCircle, TrendingDown, TrendingUp, Gauge, Lightbulb, Package, Store, ChevronDown, Droplet, CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getFuelPrices } from '../services/fuelPriceService';

// --- Workaround for React 19 + Leaflet Type mismatch ---
const Map: any = MapContainer;
const Tile: any = TileLayer;
const Mkr: any = Marker;
const Poly: any = Polyline;

// Fix Leaflet marker icon issue in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Shop Icon
const shopIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/606/606363.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Customer Icon
const customerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3177/3177361.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Shop Location: 19.912763, 99.798944
const DEFAULT_SHOP_COORDS: [number, number] = [19.912763, 99.798944];

const DEFAULT_DELIVERY_CONFIG = {
  FREE_DELIVERY_MIN_ORDER: 150.0,
  FREE_DELIVERY_MAX_DISTANCE: 2.0,
  BASE_FARE: 25.0,
  BASE_INCLUDED_DISTANCE: 3.0,
  FEE_PER_KM_NORMAL: 4.0,
  FEE_PER_KM_FAR: 8.0,
  MINIMUM_ORDER_VALUE: 59.0,
  VEHICLE_COST_PER_KM: 5.0,
  PRICE_PER_BOX: 59.0
};

const DEFAULT_DELIVERY_DISCOUNTS: { id?: string; minOrder: number; discount: number; label: string }[] = [
  { minOrder: 1500, discount: 999, label: "ส่งฟรี (ไม่เกิน 8 กม.)" },
  { minOrder: 900, discount: 80, label: "ส่วนลดค่าส่ง ฿80" },
  { minOrder: 600, discount: 50, label: "ส่วนลดค่าส่ง ฿50" },
  { minOrder: 400, discount: 30, label: "ส่วนลดค่าส่ง ฿30" },
  { minOrder: 280, discount: 20, label: "ส่วนลดค่าส่ง ฿20" },
  { minOrder: 180, discount: 15, label: "ส่วนลดค่าส่ง ฿15" },
];

const MapClickHandler: React.FC<{ onMapClick: (coords: [number, number]) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const AutoFitBounds: React.FC<{ shop: [number, number]; customer: [number, number] | null; route: [number, number][] }> = ({ shop, customer, route }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !map.getContainer()) return;
    if (customer) {
      try {
        const bounds = L.latLngBounds([shop, customer]);
        if (route.length > 0) {
          route.forEach(coord => bounds.extend(coord));
        }
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
      } catch {
        // Prevent crashes if map container was destroyed
      }
    }
  }, [customer, shop, route, map]);
  return null;
};

const RecenterMap: React.FC<{ coords: [number, number] }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    let timer: any;
    if (coords && map && map.getContainer()) {
      try {
        map.setView(coords, map.getZoom());
        timer = setTimeout(() => {
          if (map && map.getContainer()) {
            map.invalidateSize();
          }
        }, 100);
      } catch {
        // Safeguard during route transition
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [coords, map]);
  return null;
};

export const ShippingCalculator: React.FC = () => {
  const navigate = useNavigate();
  // --- States ---
  const [shopCoords] = useState<[number, number]>(DEFAULT_SHOP_COORDS);
  const [deliveryConfig, setDeliveryConfig] = useState(DEFAULT_DELIVERY_CONFIG);
  const [deliveryDiscounts, setDeliveryDiscounts] = useState<{ id?: string; minOrder: number; discount: number; label: string }[]>(DEFAULT_DELIVERY_DISCOUNTS);
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [fuelPrices, setFuelPrices] = useState<Record<string, number>>({});
  
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  
  const [customerCoords, setCustomerCoords] = useState<[number, number] | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryType, setDeliveryType] = useState<'normal' | 'hospital' | 'promo' | 'pickup'>('normal');
  const [pricingMode, setPricingMode] = useState<'standard' | 'markup'>('standard');
  const [deliveryRounds, setDeliveryRounds] = useState<string>('14');
  
  const [orderAmountInput, setOrderAmountInput] = useState<string>('59');
  
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [searchInput, setSearchInput] = useState('');
  
  // Pickup Form State
  const [pickupName, setPickupName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [pickupTime, setPickupTime] = useState(dayjs().add(30, 'minute').format('HH:mm'));
  const [isSavingPickup, setIsSavingPickup] = useState(false);

  const [results, setResults] = useState<{
    distance: number;
    shippingFee: number;
    discount: number;
    total: number;
    promoLabel: string;
    ownerView: {
      vehicleCost: number;
      netIncome: number;
      isWarning: boolean;
    };
  } | null>(null);
  
  const [isFuelWidgetOpen, setIsFuelWidgetOpen] = useState(true);

  const orderAmount = parseFloat(orderAmountInput) || 0;

  // --- Search Logic ---
  const handleSearch = () => {
    if (!searchInput.trim()) return;
    let lat, lng;
    const urlPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const qPattern = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const urlMatch = searchInput.match(urlPattern);
    const qMatch = searchInput.match(qPattern);
    if (urlMatch) { lat = parseFloat(urlMatch[1]); lng = parseFloat(urlMatch[2]); }
    else if (qMatch) { lat = parseFloat(qMatch[1]); lng = parseFloat(qMatch[2]); }
    else {
      const coords = searchInput.split(',').map(s => s.trim());
      if (coords.length === 2) { lat = parseFloat(coords[0]); lng = parseFloat(coords[1]); }
    }
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setCustomerCoords([lat, lng]);
      setSearchInput('');
      toast.success('ปักหมุดบ้านลูกค้าเรียบร้อย');
    } else { toast.error('รูปแบบพิกัดหรือลิงก์ไม่ถูกต้อง'); }
  };

  // --- Save Pickup Order ---
  const handleSavePickup = async () => {
    if (!pickupName || !pickupTime) {
      toast.error('กรุณาระบุชื่อลูกค้าและเวลารับ');
      return;
    }
    setIsSavingPickup(true);
    try {
      const { error } = await supabase.from('erp_pickup_orders').insert({
        customer_name: pickupName,
        customer_phone: pickupPhone,
        pickup_date: dayjs().format('YYYY-MM-DD'),
        pickup_time: pickupTime,
        status: 'pending',
        notes: `สร้างจากหน้าคำนวณค่าส่ง`
      });
      if (error) throw error;
      toast.success('สร้างออเดอร์รับที่ร้านสำเร็จ!');
      setPickupName('');
      setPickupPhone('');
    } catch (err: any) {
      console.error(err);
      toast.error('สร้างออเดอร์ไม่สำเร็จ: ' + (err?.message || ''));
    } finally {
      setIsSavingPickup(false);
    }
  };

  // --- Route Fetching ---
  useEffect(() => {
    const fetchRoute = async () => {
      if (!customerCoords) return;
      setLoading(true);
      try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${shopCoords[1]},${shopCoords[0]};${customerCoords[1]},${customerCoords[0]}?overview=full&geometries=geojson`);
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const distKm = data.routes[0].distance / 1000;
          setDistance(distKm);
          setRoute(data.routes[0].geometry.coordinates.map((coord: any) => [coord[1], coord[0]]));
        }
      } catch (error) { toast.error('คำนวณเส้นทางล้มเหลว'); }
      finally { setLoading(false); }
    };
    fetchRoute();
  }, [customerCoords, shopCoords]);

  // --- Initial Data Load ---
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: configData } = await supabase.from('erp_settings').select('value').eq('key', 'logistics_config').single();
        if (configData) {
          const val = configData.value;
          setDeliveryConfig({
            FREE_DELIVERY_MIN_ORDER: Number(val.free_delivery_min_order),
            FREE_DELIVERY_MAX_DISTANCE: Number(val.free_delivery_max_distance),
            BASE_FARE: Number(val.base_fare),
            BASE_INCLUDED_DISTANCE: Number(val.base_included_distance),
            FEE_PER_KM_NORMAL: Number(val.fee_per_km_normal),
            FEE_PER_KM_FAR: Number(val.fee_per_km_far),
            MINIMUM_ORDER_VALUE: Number(val.minimum_order_value),
            VEHICLE_COST_PER_KM: Number(val.vehicle_cost_per_km || 5.0),
            PRICE_PER_BOX: Number(val.price_per_box)
          });
        }
        const { data: dData } = await supabase.from('erp_shipping_discounts').select('*').eq('is_active', true).order('min_order', { ascending: false });
        if (dData) {
          setDeliveryDiscounts(dData.map(d => ({ id: d.id, minOrder: Number(d.min_order), discount: Number(d.discount_amount), label: d.label })));
        }
        
        const { data: vData } = await supabase.from('erp_vehicles').select('*');
        if (vData) {
          setVehicles(vData);
          const defaultVehicle = vData.find(v => v.is_default) || vData[0];
          if (defaultVehicle) setSelectedVehicleId(defaultVehicle.id);
        }
        
        const prices = await getFuelPrices();
        setFuelPrices(prices);
      } catch (err) { console.error(err); }
      finally { setIsSettingsLoading(false); }
    };
    fetchSettings();
  }, []);

  // --- Price Recalculation ---
  useEffect(() => {
    if (deliveryType === 'pickup') {
      setResults({
        distance: 0,
        shippingFee: 0,
        discount: 0,
        total: 0,
        promoLabel: 'รับที่ร้าน',
        ownerView: { vehicleCost: 0, netIncome: 0, isWarning: false }
      });
      return;
    }
  
    if (distance === null) return;
    
    const base = deliveryConfig.BASE_FARE;
    let shipping = 0;
    let discount = 0;
    let label = '';
    
    // 1. Calculate Real Cost
    const rounds = deliveryType === 'promo' ? (parseInt(deliveryRounds) || 1) : 1;
    let vehicleCost = (distance * 2) * deliveryConfig.VEHICLE_COST_PER_KM * rounds;
    
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (selectedVehicle) {
      const fuelType = selectedVehicle.fuel_type || 'gasohol95';
      const fPrice = fuelPrices[fuelType] || 40; // fallback 40 thb
      const fuelCost = ((distance * 2) / (selectedVehicle.fuel_efficiency || 40)) * fPrice;
      const depCost = (selectedVehicle.depreciation_per_km || 0) * (distance * 2);
      const maintCost = (selectedVehicle.maintenance_per_km || 0) * (distance * 2);
      const insCost = (selectedVehicle.insurance_annual || 0) / (selectedVehicle.estimated_trips_per_year || 1000);
      vehicleCost = (fuelCost + depCost + maintCost + insCost) * rounds;
    }
    
    if (deliveryType === 'promo') {
      const PROMO_FREE_DIST = 7.1;
      
      if (distance <= PROMO_FREE_DIST) {
        shipping = 0;
        label = `โปรสมาชิก (ฟรีไม่เกิน ${PROMO_FREE_DIST}กม.)`;
      } else {
        const excessDist = distance - PROMO_FREE_DIST;
        let promoPerRound = base;
        if (excessDist > deliveryConfig.BASE_INCLUDED_DISTANCE) {
          const ex = excessDist - deliveryConfig.BASE_INCLUDED_DISTANCE;
          promoPerRound += ex * deliveryConfig.FEE_PER_KM_NORMAL;
        }
        shipping = promoPerRound * rounds;
        label = `โปรสมาชิก (คิดส่วนเกิน ${PROMO_FREE_DIST}กม. x ${rounds} รอบ)`;
      }
    } else {
      // Normal or Hospital calculation
      let extra = 0;
      if (distance > deliveryConfig.BASE_INCLUDED_DISTANCE) {
        const ex = distance - deliveryConfig.BASE_INCLUDED_DISTANCE;
        if (distance <= 8) extra = ex * deliveryConfig.FEE_PER_KM_NORMAL;
        else extra = (8 - deliveryConfig.BASE_INCLUDED_DISTANCE) * deliveryConfig.FEE_PER_KM_NORMAL + (distance - 8) * deliveryConfig.FEE_PER_KM_FAR;
      }
      shipping = base + extra;

      if (deliveryType === 'hospital') {
        discount = shipping; 
        label = 'ส่งฟรี (โรงพยาบาล)'; 
      } else {
        if (orderAmount >= deliveryConfig.FREE_DELIVERY_MIN_ORDER && distance <= deliveryConfig.FREE_DELIVERY_MAX_DISTANCE) { 
          discount = shipping; 
          label = 'ส่งฟรี (ตามยอดสั่งซื้อ)'; 
        } else {
          const promo = [...deliveryDiscounts].sort((a, b) => b.minOrder - a.minOrder).find(p => orderAmount >= p.minOrder);
          if (promo) { discount = Math.min(promo.discount, shipping); label = promo.label; }
        }
      }
    }

    if (pricingMode === 'markup' && deliveryType !== 'hospital' && deliveryType !== 'promo') {
        shipping = vehicleCost * 1.5;
        discount = 0;
        label = 'ราคาคำนวณตามต้นทุนจริง (Markup 50%)';
    }

    const net = (shipping - discount) - vehicleCost;
    
    setResults({ 
      distance, 
      shippingFee: Math.ceil(shipping), 
      discount: Math.floor(discount), 
      total: Math.ceil(shipping - discount), 
      promoLabel: label, 
      ownerView: { 
        vehicleCost: Math.ceil(vehicleCost), 
        netIncome: Math.ceil(net),
        isWarning: net < 0
      } 
    });
  }, [distance, orderAmount, deliveryType, pricingMode, deliveryConfig, deliveryDiscounts, deliveryRounds, selectedVehicleId, vehicles, fuelPrices]);



  if (isSettingsLoading) return <div className="flex h-full items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-full bg-slate-50 overflow-hidden font-prompt">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0 z-[1001]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl"><Gauge className="text-emerald-600" size={24} /></div>
          <div><h1 className="text-xl font-medium text-slate-900">คำนวณค่าส่งและกำไรสุทธิ</h1><p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest italic">ดูแลรถและธุรกิจให้ยั่งยืน</p></div>
        </div>
        <button onClick={() => navigate('/logistics/delivery-settings')} className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-medium border border-slate-200 transition-all"><SettingsIcon size={16} /> ตั้งค่า</button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main Content Area */}
        {deliveryType === 'pickup' ? (
          <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 border-r border-slate-200 animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-slate-50 p-10 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="w-20 h-20 bg-slate-900 text-white rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
                <Store size={40} />
              </div>
              <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">บริการรับที่ร้าน</h2>
              <p className="text-center text-slate-500 mb-8 text-sm">สร้างออเดอร์สำหรับลูกค้าที่เดินทางมารับอาหารด้วยตนเอง</p>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-widest">ชื่อลูกค้า *</label>
                  <input type="text" value={pickupName} onChange={e => setPickupName(e.target.value)} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-100 transition-all font-medium text-slate-800" placeholder="เช่น คุณเอ" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-widest">เบอร์โทรติดต่อ</label>
                  <input type="tel" value={pickupPhone} onChange={e => setPickupPhone(e.target.value)} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-100 transition-all font-medium text-slate-800" placeholder="08X-XXX-XXXX" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-widest">เวลามารับ *</label>
                  <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-100 transition-all font-medium text-slate-800" />
                </div>
                <button 
                  onClick={handleSavePickup}
                  disabled={isSavingPickup}
                  className="w-full py-4 mt-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50"
                >
                  {isSavingPickup ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  ยืนยันออเดอร์รับที่ร้าน
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative bg-slate-200">
            <Map center={shopCoords} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <Tile url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OSM' />
              <Mkr position={shopCoords} icon={shopIcon}><Popup>ตำแหน่งร้านของคุณ</Popup></Mkr>
              {customerCoords && <Mkr position={customerCoords} icon={customerIcon}><Popup>ตำแหน่งลูกค้า</Popup></Mkr>}
              {route.length > 0 && <Poly positions={route} color="#10b981" weight={6} opacity={0.8} lineCap="round" lineJoin="round" />}
              <MapClickHandler onMapClick={setCustomerCoords} />
              <RecenterMap coords={shopCoords} />
              <AutoFitBounds shop={shopCoords} customer={customerCoords} route={route} />
            </Map>

            {/* Overlays */}
            {loading && (
              <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white/50 flex items-center gap-2">
                <Loader2 size={16} className="text-emerald-500 animate-spin" />
                <span className="text-xs font-medium text-slate-600">กำลังประมวลผล...</span>
              </div>
            )}

            <div className="absolute top-4 left-4 z-[1000] w-full max-w-sm">
              <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-[22px] shadow-2xl border border-white/50 flex items-center gap-1">
                <div className="pl-3 text-slate-400"><Search size={18} /></div>
                <input 
                  type="text" 
                  placeholder="วางลิงก์ Google Maps หรือพิกัด..." 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-slate-700 font-normal placeholder:text-slate-400"
                />
                <button onClick={handleSearch} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-[18px] text-xs font-medium transition-all">คำนวณ</button>
              </div>
            </div>

            {/* Fuel Widget */}
            <div className="absolute bottom-6 left-6 z-[1000]">
              <div className={`bg-white/95 backdrop-blur-md shadow-2xl border border-white/50 rounded-2xl overflow-hidden transition-all duration-300 ${isFuelWidgetOpen ? 'w-56' : 'w-[4.2rem]'}`}>
                <div 
                  className="p-3 bg-slate-900 text-white flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                  onClick={() => setIsFuelWidgetOpen(!isFuelWidgetOpen)}
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1 rounded-lg shrink-0">
                      <Droplet size={14} className="text-white" />
                    </div>
                    {isFuelWidgetOpen && <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">ราคาน้ำมันอ้างอิง</span>}
                  </div>
                  {isFuelWidgetOpen && (
                    <button className="text-slate-400 hover:text-white shrink-0">
                      <ChevronDown size={14} />
                    </button>
                  )}
                </div>
                
                {isFuelWidgetOpen && (
                  <div className="p-4 space-y-3">
                    {Object.entries(fuelPrices).length > 0 ? (
                      Object.entries(fuelPrices).map(([type, price]) => (
                        <div key={type} className="flex items-center justify-between border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                          <span className="text-[11px] font-medium text-slate-500 uppercase">{type.replace('gasohol', 'GSH')}</span>
                          <span className="text-sm font-bold text-slate-900">฿{price.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 italic text-center py-2">กำลังดึงข้อมูล...</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className="w-full md:w-[420px] bg-white border-l border-slate-200 flex flex-col overflow-y-auto p-6 space-y-8 flex-shrink-0 z-10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)]">
          <section className="space-y-4">
            <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2"><Truck size={14} /> เลือกเป้าหมายจัดส่ง</h3>
            <div className="flex flex-wrap p-1.5 bg-slate-50 rounded-2xl border border-slate-100 gap-1">
              <button onClick={() => setDeliveryType('normal')} className={`flex-1 min-w-[70px] py-2.5 rounded-xl text-[10px] font-bold transition-all ${deliveryType === 'normal' ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>บ้านลูกค้า</button>
              <button onClick={() => setDeliveryType('promo')} className={`flex-1 min-w-[70px] py-2.5 rounded-xl text-[10px] font-bold transition-all ${deliveryType === 'promo' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>สมาชิกโปรฯ</button>
              <button onClick={() => setDeliveryType('hospital')} className={`flex-1 min-w-[70px] py-2.5 rounded-xl text-[10px] font-bold transition-all ${deliveryType === 'hospital' ? 'bg-white text-red-500 shadow-sm border border-slate-100' : 'text-slate-400'}`}>โรงพยาบาล</button>
              <button onClick={() => setDeliveryType('pickup')} className={`flex-1 min-w-[70px] py-2.5 rounded-xl text-[10px] font-bold transition-all ${deliveryType === 'pickup' ? 'bg-slate-900 text-white shadow-sm border border-slate-800' : 'text-slate-400 hover:bg-slate-200'}`}>รับที่ร้าน</button>
            </div>
          </section>

          {deliveryType !== 'pickup' && (
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2"><Truck size={14} /> รถที่ใช้จัดส่ง</h3>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setPricingMode('standard')} className={`px-2 py-1 text-[9px] font-bold rounded-lg ${pricingMode === 'standard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>สูตรเดิม</button>
                  <button onClick={() => setPricingMode('markup')} className={`px-2 py-1 text-[9px] font-bold rounded-lg ${pricingMode === 'markup' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}>Markup (ต้นทุนจริง)</button>
                </div>
              </div>
              <select 
                value={selectedVehicleId} 
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm text-slate-700 font-medium"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.fuel_efficiency} กม./ลิตร)</option>
                ))}
              </select>
            </section>
          )}

          {deliveryType === 'promo' && (
            <section className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2"><Package size={14} /> จำนวนรอบที่จัดส่งในแพ็ค</h3>
              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 relative">
                <div className="flex items-center justify-center gap-4">
                  <input 
                    type="number" 
                    value={deliveryRounds}
                    onChange={(e) => setDeliveryRounds(e.target.value)}
                    className="w-32 bg-transparent text-4xl font-semibold text-blue-700 outline-none border-b-2 border-transparent focus:border-blue-500 transition-all tracking-tight text-center"
                  />
                  <span className="text-xl font-bold text-blue-300">รอบ</span>
                </div>
                <p className="mt-3 text-[10px] text-blue-400 leading-relaxed italic text-center font-normal">คูณค่าส่งส่วนเกิน (ถ้ามี) ตามจำนวนวันส่งจริง</p>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2"><ShoppingBag size={14} /> ยอดรวมอาหาร (ประมาณการ)</h3>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter mb-1 text-center">ระบุยอดค่าอาหาร (บาท)</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-medium text-slate-300">฿</span>
                    <input 
                      type="number" 
                      value={orderAmountInput}
                      onChange={(e) => setOrderAmountInput(e.target.value)}
                      className="w-32 bg-transparent text-4xl font-semibold text-slate-900 outline-none border-b-2 border-transparent focus:border-emerald-500 transition-all tracking-tight text-center"
                    />
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-400 leading-relaxed italic text-center font-normal">กรอกราคาเมนู + Add-on ที่ลูกค้าสนใจ</p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2"><Calculator size={14} /> ราคาที่ต้องแจ้งลูกค้า</h3>
            {!results ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[32px] p-12 text-center text-slate-400 flex flex-col items-center gap-4">
                <div className="p-5 bg-white rounded-full shadow-sm text-slate-200"><MapIcon size={32} /></div>
                <p className="text-xs font-medium leading-relaxed italic">ปักหมุดบนแผนที่เพื่อเริ่มคำนวณ</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-12 transition-transform group-hover:scale-105 duration-700"><Truck size={200} /></div>
                  <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest mb-2">ยอดค่าส่งสุทธิ (แจ้งลูกค้า)</p>
                  <div className="flex items-baseline gap-2"><span className="text-5xl font-semibold tracking-tight">฿{results.total}</span></div>
                  {results.promoLabel && <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium rounded-full border border-emerald-500/20">{results.promoLabel}</div>}
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden text-sm">
                  <div className="p-4 flex justify-between border-b border-slate-50 items-center">
                    <span className="text-slate-500 font-medium">ระยะทางจริง (ทางถนน)</span>
                    <span className="text-base font-semibold text-slate-900">{results.distance.toFixed(1)} กม.</span>
                  </div>
                  <div className="p-4 flex justify-between border-b border-slate-50 items-center">
                    <span className="text-slate-500 font-medium">ค่าจัดส่งพื้นฐาน</span>
                    <span className="text-base font-semibold text-slate-900">฿{results.shippingFee}</span>
                  </div>
                  {results.discount > 0 && (
                    <div className="p-4 flex justify-between bg-emerald-50/30 text-emerald-600 items-center font-medium">
                      <span>หักลบโปรโมชั่น</span>
                      <span>-฿{results.discount}</span>
                    </div>
                  )}
                </div>

                {/* Owner Safety Section - Only show if not pickup */}
                {deliveryType !== 'pickup' && (
                  <div className={`p-6 rounded-[24px] border transition-all duration-500 ${results.ownerView.isWarning ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/50">
                      <div className="flex items-center gap-2">
                        <Gauge size={14} className={results.ownerView.isWarning ? 'text-red-500' : 'text-slate-400'} />
                        <span className="text-[10px] font-medium uppercase tracking-widest italic">วิเคราะห์ความคุ้มค่า (เจ้าของ)</span>
                      </div>
                      {results.ownerView.isWarning && (
                          <div className="flex items-center gap-1 text-red-600 text-[9px] font-bold animate-pulse uppercase">
                              <AlertCircle size={10} /> เสี่ยงเข้าเนื้อ
                          </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-normal">
                        <span className="text-slate-500">เงินสำรองค่าเสื่อม (เก็บแยก)</span>
                        <span className="text-red-400 font-medium">-฿{results.ownerView.vehicleCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex flex-col">
                          <span className="text-slate-900 text-[11px] font-medium">รายรับสุทธิ (หลังหักค่าซ่อม)</span>
                          {results.ownerView.isWarning && <p className="text-[9px] text-red-400 font-normal italic">ออเดอร์นี้ทำลายรถฟรีๆ</p>}
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-2xl font-semibold tracking-tighter flex items-center gap-1 ${results.ownerView.isWarning ? 'text-red-500' : 'text-emerald-500'}`}>
                              {results.ownerView.netIncome >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                              ฿{results.ownerView.netIncome.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={() => {
                  const text = `📌 สรุปค่าจัดส่ง:\n📍 ระยะทาง: ${results.distance.toFixed(1)} กม.\n💰 ค่าส่งสุทธิ: ฿${results.total}\n${results.promoLabel ? `🎁 โปรโมชั่น: ${results.promoLabel}\n` : ''}`;
                  navigator.clipboard.writeText(text); toast.success('คัดลอกสรุปสำเร็จ');
                }} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-medium text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 active:scale-95">
                  <Copy size={16} /> คัดลอกสรุปส่งลูกค้า
                </button>
              </div>
            )}
          </section>

          {/* Knowledge Section */}
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2"><Info size={14} /> เพื่อความยั่งยืนของรถคันเดียวที่เรามี</h3>
            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0"></div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                   <span className="font-medium text-amber-600">ห้ามลืมเก็บเงินสำรอง:</span> ทุกๆ 1 กม. เราต้องหักเงินเก็บไว้ {deliveryConfig.VEHICLE_COST_PER_KM} บาท เพื่อเป็นกองทุนซื้อรถใหม่ ห้ามนำมานับเป็นกำไรกินใช้
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0"></div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                   <span className="font-medium text-amber-600">ระวังจุดคุ้มทุน:</span> หาก "รายรับสุทธิ" ติดลบ แสดงว่าคุณกำลังจ่ายเงินเพื่อทำงานให้ลูกค้าฟรีๆ และทำลายรถตัวเองไปเรื่อยๆ ค่ะ
                </p>
              </div>
              <div className="flex items-start gap-3 border-t border-amber-100 pt-2">
                <Lightbulb size={12} className="mt-1 text-amber-600 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">ทางออกสำหรับร้านเล็ก:</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-normal italic">
                    1. พยายามรวมออเดอร์ในเส้นทางเดียวกัน เพื่อหารต้นทุนค่ารถ<br/>
                    2. กำหนดขั้นต่ำการสั่งซื้อให้สูงขึ้นเมื่อต้องส่งไกลกว่า 10 กม.<br/>
                    3. แยกบัญชี "เงินซ่อมรถ" ออกจากบัญชี "กำไรอาหาร" ให้ชัดเจน
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
