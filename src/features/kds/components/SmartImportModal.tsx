import React, { useState, useEffect } from 'react';
import { X, Search, Check, AlertTriangle, FileText, Wand2 } from 'lucide-react';
import { useMemberStore } from '../../../store/memberStore';
import { useMenuStore } from '../../../store/menuStore';
import { parseOrderText, type ParsedOrder, type ParsedOrderItem } from '../../../utils/orderParser';
import { dayjs } from '../../../lib/dateUtils';
import { toast } from 'sonner';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (order: ParsedOrder) => Promise<void>;
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [rawText, setRawText] = useState('');
  const [defaultDate, setDefaultDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [parsedData, setParsedData] = useState<ParsedOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const { members } = useMemberStore();
  const { menus } = useMenuStore();

  useEffect(() => {
    if (!isOpen) {
      setRawText('');
      setParsedData(null);
    }
  }, [isOpen]);

  const handleParse = () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      const data = parseOrderText(rawText, members, menus, new Date(), defaultDate);
      setParsedData(data);
      setIsProcessing(false);
    }, 100); // Slight delay for UI feedback
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.items.length === 0) return;
    
    // Check if dates or menus are missing
    const hasErrors = parsedData.items.some(i => !i.date || !i.menuId);
    if (hasErrors) {
      toast.error('กรุณาตรวจสอบข้อมูลที่ขาดหายไปก่อนนำเข้า (วันที่ หรือ เมนู)');
      return;
    }

    setIsImporting(true);
    try {
      await onImport(parsedData);
      toast.success('นำเข้าออเดอร์เรียบร้อย');
      onClose();
    } catch (err: any) {
      toast.error('นำเข้าไม่สำเร็จ: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
              <Wand2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">นำเข้าออเดอร์อัตโนมัติ</h2>
              <p className="text-sm text-slate-500">วางข้อความแชทเพื่อดึงข้อมูลเมนูและวันจัดส่ง</p>
            </div>
          </div>
          <button title="Button" type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left: Input */}
          <div className="w-full md:w-1/3 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50 p-6">
            <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              ข้อความออเดอร์
            </label>
            <textarea title="Textarea"
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="วางข้อความแชทที่นี่..."
              className="flex-1 w-full p-3 text-sm font-normal text-slate-700 bg-white border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mb-4"
            />
            <label className="text-sm font-medium text-slate-700 mb-2">
              วันที่จัดส่ง (ค่าเริ่มต้น)
            </label>
            <input title="Date"
              type="date"
              value={defaultDate}
              onChange={e => setDefaultDate(e.target.value)}
              className="w-full p-2.5 text-sm font-normal text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button title="Button" type="button"
              onClick={handleParse}
              disabled={isProcessing || !rawText.trim()}
              className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? 'กำลังวิเคราะห์...' : <><Search size={16} /> วิเคราะห์ข้อมูล</>}
            </button>
          </div>

          {/* Right: Results */}
          <div className="w-full md:w-2/3 p-6 overflow-y-auto bg-white">
            {!parsedData ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Wand2 size={48} className="mb-4 text-slate-200" />
                <p>วางข้อความและกดวิเคราะห์ข้อมูล</p>
                <p className="text-sm mt-1">ระบบจะค้นหาชื่อลูกค้า เมนู และวันที่อัตโนมัติ</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ข้อมูลลูกค้า</h3>
                  {parsedData.memberId ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Check size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{parsedData.fullName}</p>
                        <p className="text-xs text-slate-500">{parsedData.phone}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <AlertTriangle size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-700">ไม่พบลูกค้าในระบบ</p>
                        <p className="text-xs text-orange-600 mt-0.5">เบอร์โทรศัพท์ที่ตรวจพบ: {parsedData.phone || 'ไม่พบ'}</p>
                        <p className="text-xs text-slate-500 mt-1">ออเดอร์นี้จะถูกบันทึกเป็นรายย่อยทั่วไป (No Package)</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">รายการอาหารที่พบ ({parsedData.items.length})</h3>
                  {parsedData.items.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                      ไม่พบชื่อเมนูที่ตรงกับในระบบ
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                          <tr>
                            <th className="px-4 py-3">วันที่</th>
                            <th className="px-4 py-3">เมนูที่จับคู่ได้</th>
                            <th className="px-4 py-3 text-right">จำนวน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedData.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3">
                                {item.date ? (
                                  <span className="text-slate-700">{dayjs(item.date).format('DD MMM')}</span>
                                ) : (
                                  <span className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={12}/> ระบุวันไม่ได้</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className={item.menuId ? "text-slate-900" : "text-red-500"}>
                                    {item.menuName}
                                  </span>
                                  {item.menuId && item.confidence < 1 && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                                      AI
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-900 font-medium">
                                x{item.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button title="Button" type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors">
            ยกเลิก
          </button>
          <button title="Button" type="button"
            onClick={handleImport}
            disabled={!parsedData || parsedData.items.length === 0 || isImporting}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isImporting ? 'กำลังบันทึก...' : 'บันทึกออเดอร์'}
          </button>
        </div>
      </div>
    </div>
  );
};
