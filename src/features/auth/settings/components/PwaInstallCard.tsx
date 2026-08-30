import React, { useEffect, useState } from 'react';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  Share2, 
  PlusSquare, 
  Apple, 
  Sparkles,
  Layers,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { usePwaStore } from '../../../../store/pwaStore';

export const PwaInstallCard: React.FC = () => {
  const { 
    isInstalled, 
    isIOS, 
    isAndroid, 
    isStandalone, 
    checkPwaStatus, 
    installApp 
  } = usePwaStore();

  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    checkPwaStatus();
  }, [checkPwaStatus]);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const result = await installApp();
      if (result === 'accepted') {
        toast.success('🎉 กำลังติดตั้งแอป Clean Food CR ลงบนอุปกรณ์ของคุณ...');
      } else if (result === 'manual_ios') {
        setShowIosGuide(true);
      } else if (result === 'dismissed') {
        toast.info('คุณได้ยกเลิกการติดตั้งแอป');
      } else {
        // Fallback for browsers that hide beforeinstallprompt
        if (isIOS) {
          setShowIosGuide(true);
        } else {
          toast.info('สามารถติดตั้งได้ผ่านเมนู "ติดตั้งแอป" หรือ "เพิ่มลงหน้าจอหลัก" ของเบราว์เซอร์');
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('ไม่สามารถเปิดหน้าต่างติดตั้งได้');
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-[2.5rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-500/20 font-prompt">
      {/* Decorative Glow Background */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Left App Info */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl p-0.5 shadow-lg shadow-emerald-500/30 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center p-2">
              <img src="/favicon.svg" alt="Clean Food CR" className="w-10 h-10 object-contain" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                ติดตั้งแอป Clean Food CR
              </h3>
              {isStandalone || isInstalled ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 size={12} /> ติดตั้งแล้ว (Standalone App)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-slate-950 shadow-sm animate-pulse">
                  <Sparkles size={12} /> รองรับ Android & iOS
                </span>
              )}
            </div>
            
            <p className="text-xs text-slate-300 max-w-xl font-normal leading-relaxed">
              ใช้งาน Clean Food CR ได้เหมือนแอปพลิเคชันเต็มรูปแบบ โหลดเร็ว ไม่ติด URL Bar รองรับโหมดออฟไลน์ และแจ้งเตือนออเดอร์ทันที
            </p>

            {/* Feature Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                <Zap size={12} className="text-amber-400" /> โหลดเร็วกว่า 95%
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                <Layers size={12} className="text-emerald-400" /> Fullscreen Display
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                {isIOS ? <Apple size={12} className="text-slate-200" /> : <Smartphone size={12} className="text-emerald-400" />}
                {isIOS ? 'รองรับ iPhone/iPad' : isAndroid ? 'รองรับ Android' : 'รองรับทุกอุปกรณ์'}
              </span>
            </div>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {isStandalone || isInstalled ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-5 py-3 rounded-2xl text-emerald-300 text-xs font-semibold">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span>เปิดใช้งานในโหมดแอปพลิเคชันสมบูรณ์แล้ว</span>
            </div>
          ) : (
            <>
              {isIOS ? (
                <button
                  onClick={() => setShowIosGuide(true)}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs rounded-2xl hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Apple size={16} />
                  <span>วิธีติดตั้งบน iPhone / iPad</span>
                </button>
              ) : (
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs rounded-2xl hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Download size={16} />
                  <span>{isInstalling ? 'กำลังเตรียมการ...' : 'ติดตั้งแอปทันที (1-Click Install)'}</span>
                </button>
              )}

              {/* Alternative Guide Button */}
              <button
                onClick={() => setShowIosGuide(!showIosGuide)}
                className="px-4 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone size={14} />
                <span>คำแนะนำการติดตั้ง</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Accordion / Modal Guide for iOS and Android */}
      <AnimatePresence>
        {showIosGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-slate-700/60 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* iOS Safari Steps */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Apple size={16} />
                  <span>ขั้นตอนติดตั้งบน iOS (Safari บน iPhone / iPad)</span>
                </div>
                <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside font-normal">
                  <li className="leading-relaxed">
                    เปิดเว็บนี้ในเบราว์เซอร์ <strong className="text-white">Safari</strong>
                  </li>
                  <li className="leading-relaxed flex items-center gap-1.5 flex-wrap">
                    แตะปุ่ม <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-white font-semibold"><Share2 size={12} /> แชร์ (Share)</span> ที่แถบล่างของหน้าจอ
                  </li>
                  <li className="leading-relaxed flex items-center gap-1.5 flex-wrap">
                    เลื่อนลงแล้วเลือก <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-white font-semibold"><PlusSquare size={12} /> เพิ่มไปยังหน้าจอโฮม</span>
                  </li>
                  <li className="leading-relaxed">
                    แตะ <strong className="text-emerald-400">"เพิ่ม" (Add)</strong> ที่มุมขวาบน — ไอคอน Clean Food CR จะปรากฏบนหน้าจอโฮมทันที
                  </li>
                </ol>
              </div>

              {/* Android Chrome Steps */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Smartphone size={16} />
                  <span>ขั้นตอนติดตั้งบน Android (Google Chrome)</span>
                </div>
                <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside font-normal">
                  <li className="leading-relaxed">
                    กดปุ่ม <strong className="text-emerald-400">"ติดตั้งแอปทันที"</strong> ด้านบน
                  </li>
                  <li className="leading-relaxed">
                    หากไม่ขึ้นหน้าต่าง ให้แตะเมนูจุด 3 จุด <strong className="text-white">⋮</strong> ที่มุมขวาบนของ Chrome
                  </li>
                  <li className="leading-relaxed">
                    เลือก <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-white font-semibold"><Download size={12} /> ติดตั้งแอป</span> หรือ <span className="text-white font-semibold">"เพิ่มลงหน้าจอหลัก"</span>
                  </li>
                  <li className="leading-relaxed">
                    กดยืนยัน <strong className="text-emerald-400">"ติดตั้ง"</strong> เพื่อสร้างแอปบนหน้าจอมือถือ
                  </li>
                </ol>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
