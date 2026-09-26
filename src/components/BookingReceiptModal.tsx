import React, { useRef, useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Building2, 
  FileText, 
  User, 
  DollarSign, 
  Loader2,
  Lock,
  Edit3,
  Calendar,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  UserCheck,
  Key,
  RotateCcw
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Room, BookingReceipt, AppSettings } from '../types';
import { printIsolatedElement } from '../utils/printHelper';

const DEFAULT_BOOKING_TERMS = '1.ผู้จองตกลงชำระเงินมัดจำเพื่อสงวนสิทธิ์ในการจองห้องชุดตามรายละเอียดข้างต้น\n2.ผู้จองตกลงทำสัญญาและชำระเงินส่วนที่เหลือ ณ สำนักงานนิติบุคคลฯ ภายในวันที่กำหนด\n3.หากไม่มาทำสัญญาและไม่ชำระเงินส่วนที่เหลือตามกำหนด จะถือว่าสละสิทธิ์และไม่สามารถขอรับเงินมัดจำคืนได้ทุกกรณี';

interface BookingReceiptModalProps {
  receipt?: BookingReceipt | null;
  selectedRoom?: Room | null;
  settings: AppSettings;
  onSaveReceipt: (receipt: BookingReceipt) => void;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}

// แปลงตัวเลขเป็นข้อความภาษาไทย (บาทถ้วน) ตามหลักไวยากรณ์ไทย
function thaiBahtText(num: number): string {
  if (isNaN(num) || num === 0) return 'ศูนย์บาทถ้วน';
  const thaiNums = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const thaiUnits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  
  const numStr = Math.floor(Math.abs(num)).toString();
  let result = '';
  const len = numStr.length;
  
  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr.charAt(i), 10);
    const pos = len - i - 1;
    if (digit !== 0) {
      if (pos % 6 === 1 && digit === 1) {
        result += (pos > 0 ? '' : 'หนึ่ง') + 'สิบ';
      } else if (pos % 6 === 1 && digit === 2) {
        result += 'ยี่สิบ';
      } else if (pos % 6 === 0 && digit === 1 && len > 1 && (len - i) % 6 === 0) {
        result += 'เอ็ด';
      } else {
        result += thaiNums[digit] + (pos % 6 > 0 ? thaiUnits[pos % 6] : '');
      }
    }
    if (pos > 0 && pos % 6 === 0) {
      result += 'ล้าน';
    }
  }
  return (num < 0 ? 'ลบ' : '') + result + 'บาทถ้วน';
}

// แปลงวันที่เป็นวันที่ไทยที่เป็นทางการ เช่น 23 กันยายน 2569
function formatThaiDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear() + 543; // ปี พ.ศ.
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export const BookingReceiptModal: React.FC<BookingReceiptModalProps> = ({
  receipt,
  selectedRoom,
  settings,
  onSaveReceipt,
  onClose,
  onNotify
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // หากเป็นใบจองเดิมที่มีในประวัติแล้ว ให้เริ่มที่โหมดเอกสารทางการ (Read-Only) ป้องกันการแก้ไข
  const isExistingReceipt = Boolean(receipt && receipt.id);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(isExistingReceipt);
  const [validationError, setValidationError] = useState<string>('');

  const [formData, setFormData] = useState<Partial<BookingReceipt>>(() => {
    if (receipt) {
      return {
        ...receipt,
        recipientType: receipt.recipientType || 'juristic',
        recipientName: receipt.recipientName || receipt.agentName || (settings.agencyName || 'สำนักงานนิติบุคคล แบงค์คอก ฮอไรซอน ราม 60')
      };
    }
    
    // Auto-generate fresh receipt ID & defaults for new bookings
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const signDate = nextWeek.toISOString().split('T')[0];

    const rentPrice = selectedRoom?.rentPrice || 0;
    const salePrice = selectedRoom?.salePrice || 0;
    const isSale = selectedRoom?.listingType === 'sale';
    const price = isSale ? salePrice : rentPrice;
    const defaultBookingAmount = isSale ? Math.min(50000, price * 0.05) : Math.min(10000, price * 0.5);

    const defaultAgentName = 'นิติบุคคล อาคารชุดบางกอกฮอไรซอน รามคำแหง';

    return {
      id: 'bk-' + Date.now(),
      receiptNumber: 'BK-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
      bookingDate: today,
      roomId: selectedRoom?.id || '',
      roomNumber: selectedRoom?.roomNumber || '',
      condoName: selectedRoom?.condoName || 'Bangkok Horizon Ram 60',
      bookingType: (selectedRoom?.listingType === 'sale' ? 'sale' : 'rent'),
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerIdCard: '',
      price: price,
      bookingAmount: defaultBookingAmount,
      paymentMethod: 'transfer',
      contractSignDate: signDate,
      remainingDeposit: price ? Math.max(0, (isSale ? price * 0.1 : price * 2) - defaultBookingAmount) : 0,
      recipientType: 'juristic',
      recipientName: defaultAgentName,
      agentName: defaultAgentName,
      terms: DEFAULT_BOOKING_TERMS,
      createdAt: new Date().toISOString()
    };
  });

  // Re-sync when props change
  useEffect(() => {
    if (receipt) {
      setFormData({
        ...receipt,
        recipientType: receipt.recipientType || 'juristic',
        recipientName: receipt.recipientName || receipt.agentName || (settings.agencyName || 'สำนักงานนิติบุคคล แบงค์คอก ฮอไรซอน ราม 60')
      });
      setIsReadOnly(true);
    } else if (selectedRoom) {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const signDate = nextWeek.toISOString().split('T')[0];
      const rentPrice = selectedRoom.rentPrice || 0;
      const salePrice = selectedRoom.salePrice || 0;
      const isSale = selectedRoom.listingType === 'sale';
      const price = isSale ? salePrice : rentPrice;
      const defaultBookingAmount = isSale ? Math.min(50000, price * 0.05) : Math.min(10000, price * 0.5);
      const defaultAgentName = settings.agencyName || 'นิติบุคคล อาคารชุดบางกอกฮอไรซอน รามคำแหง';

      setFormData({
        id: 'bk-' + Date.now(),
        receiptNumber: 'BK-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
        bookingDate: today,
        roomId: selectedRoom.id || '',
        roomNumber: selectedRoom.roomNumber || '',
        condoName: selectedRoom.condoName || 'Bangkok Horizon Ram 60',
        bookingType: (selectedRoom.listingType === 'sale' ? 'sale' : 'rent'),
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerIdCard: '',
        price: price,
        bookingAmount: defaultBookingAmount,
        paymentMethod: 'transfer',
        contractSignDate: signDate,
        remainingDeposit: price ? Math.max(0, (isSale ? price * 0.1 : price * 2) - defaultBookingAmount) : 0,
        recipientType: 'juristic',
        recipientName: defaultAgentName,
        agentName: defaultAgentName,
        terms: DEFAULT_BOOKING_TERMS,
        createdAt: new Date().toISOString()
      });
      setIsReadOnly(false);
    }
  }, [receipt, selectedRoom, settings.agencyName]);

  // Handle Save (กรณีออกใบจองใหม่ หรือผู้ดูแลกดยืนยันปลดล็อคเพื่อแก้ไข)
  const handleSave = () => {
    if (!formData.customerName?.trim() || !formData.customerPhone?.trim() || !formData.roomNumber?.trim()) {
      setValidationError('กรุณากรอกชื่อลูกค้า, เบอร์โทรศัพท์ และหมายเลขห้องให้ครบถ้วน');
      onNotify?.('กรุณากรอกชื่อลูกค้า เบอร์โทรศัพท์ และหมายเลขห้องให้ครบถ้วน');
      return;
    }
    setValidationError('');

    const resolvedRecipientName = formData.recipientName?.trim() || (
      formData.recipientType === 'owner'
        ? (selectedRoom?.ownerName ? `${selectedRoom.ownerName} (เจ้าของห้อง)` : 'เจ้าของห้อง')
        : (formData.recipientType === 'other' ? 'ผู้รับเงินมัดจำ' : 'นิติบุคคล อาคารชุดบางกอกฮอไรซอน รามคำแหง')
    );

    const updatedData: BookingReceipt = {
      ...(formData as BookingReceipt),
      recipientName: resolvedRecipientName,
      agentName: resolvedRecipientName
    };

    onSaveReceipt(updatedData);
    setIsReadOnly(true);
    onNotify?.(`บันทึกใบจองเลขที่ ${formData.receiptNumber} เรียบร้อยแล้ว`);
  };

  // Download Standard A4 PDF (210mm x 297mm)
  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setIsProcessing(true);

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2.5, // High resolution for crisp Thai fonts & tables
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      // Standard A4 portrait: 210mm x 297mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Fit perfectly to single page A4 with 8mm margin
      const margin = 8;
      const pdfWidth = 210 - (margin * 2); // 194mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', margin, margin, pdfWidth, Math.min(pdfHeight, 281), undefined, 'FAST');
      pdf.save(`ใบจอง_${formData.receiptNumber}_ห้อง${formData.roomNumber || 'ไม่ระบุ'}.pdf`);

      onNotify?.(`ดาวน์โหลดใบจอง PDF ขนาด A4 (${formData.receiptNumber}) สำเร็จ`);
    } catch (err: any) {
      console.error(err);
      onNotify?.(`เกิดข้อผิดพลาดในการสร้าง PDF: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct Print via Browser with A4 single page isolation
  const handlePrint = async () => {
    setIsProcessing(true);
    try {
      await printIsolatedElement(receiptRef.current, `ใบจอง_${formData.receiptNumber}_ห้อง${formData.roomNumber || ''}`, false);
      onNotify?.('เปิดหน้าต่างสั่งพิมพ์ใบจองขนาด A4 เรียบร้อยแล้ว');
    } catch (err: any) {
      console.error(err);
      window.print();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 print:p-0 print:bg-white print:static">
      
      <div className="bg-stone-100/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/60 w-full max-w-4xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        
        {/* Top Control Bar (No Print) */}
        <div className="px-5 py-3.5 bg-stone-900/90 backdrop-blur-xl text-stone-100 flex items-center justify-between no-print gap-3 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-2xs">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-sm sm:text-base text-white tracking-tight truncate">
                  ใบเสร็จรับเงินจองห้องชุด (A4 Standard)
                </span>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-stone-800/80 text-amber-300 border border-stone-700">
                  {formData.receiptNumber}
                </span>
                {isReadOnly ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-700/60">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>เอกสารทางการ (ป้องกันการแก้ไข)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-700/60">
                    <Edit3 className="w-3 h-3 text-amber-400" />
                    <span>โหมดแก้ไขข้อมูล</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-300/80 truncate hidden sm:block font-light">
                เอกสารขนาดกระดาษมาตรฐาน A4 (210 x 297 มม.) พอดี 1 หน้า ไม่ล้น ไม่ตกขอบ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* ปลดล็อคแก้ไข (ถ้าจำเป็น) */}
            {isExistingReceipt && isReadOnly && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('คุณต้องการแก้ไขข้อมูลในใบจองฉบับนี้หรือไม่?')) {
                    setIsReadOnly(false);
                  }
                }}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-stone-200 hover:text-white bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer backdrop-blur-xs"
                title="แก้ไขข้อมูลใบจอง"
              >
                <Edit3 className="w-3 h-3 text-stone-300" />
                <span>แก้ไข</span>
              </button>
            )}

            <button
              id="btn-download-booking-pdf"
              disabled={isProcessing}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="ดาวน์โหลดเป็นไฟล์ PDF ขนาด A4"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>ดาวน์โหลด PDF</span>
            </button>

            <button
              id="btn-print-booking"
              disabled={isProcessing}
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-stone-100 hover:bg-white/20 transition-all border border-white/15 cursor-pointer backdrop-blur-xs"
              title="สั่งพิมพ์ลงกระดาษ A4"
            >
              <Printer className="w-3.5 h-3.5 text-stone-200" />
              <span>พิมพ์ A4</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Workspace (Screen Preview: Exactly scaled like an A4 sheet) */}
        <div className="overflow-auto p-4 sm:p-8 bg-stone-300/60 print:p-0 print:bg-white flex flex-col items-center">
          
          {/* Subtle Screen Indicator */}
          <div className="w-full max-w-[794px] mb-2 flex items-center justify-between text-[11px] text-stone-600 no-print px-1">
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              กระดาษมาตรฐาน A4 (210 × 297 มม.) • สั่งพิมพ์ออก 1 หน้าพอดี
            </span>
            <span className="font-mono text-stone-500">
              สถานะ: ได้รับเงินมัดจำแล้ว
            </span>
          </div>

          {/* ========================================================================= */}
          {/* THE OFFICIAL A4 BOOKING RECEIPT SHEET (210mm x 297mm proportion)           */}
          {/* ========================================================================= */}
          <div
            ref={receiptRef}
            id="booking-receipt-canvas"
            className="w-full max-w-[794px] min-h-[1080px] bg-white shadow-2xl border border-stone-300 p-8 sm:p-11 text-stone-900 print:shadow-none print:border-none print:w-full print:p-0 print:min-h-0 flex flex-col justify-between select-text"
            style={{ boxSizing: 'border-box' }}
          >
            <div>
              {/* 1. OFFICIAL JURISTIC HEADER & TITLE */}
              <div className="flex items-start justify-between pb-5 border-b-2 border-stone-900 gap-4">
                
                {/* Left: Condominium & Juristic Identity */}
                <div className="flex items-start gap-3.5">
                  <div className="w-13 h-13 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 shadow-sm border border-stone-800">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs sm:text-sm font-bold text-stone-950 tracking-wide">
                      BANGKOK HORIZON RAMKHAMHAENG 60 CONDOMINIUM
                    </p>
                    <p className="text-[11px] text-stone-500 max-w-sm leading-snug pt-0.5">
                      {settings.agencyAddress || 'สำนักงานนิติบุคคลอาคารชุด เลขที่ 111 ซอยรามคำแหง 60 แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240'}
                    </p>
                    <p className="text-[10px] text-stone-500 font-mono pt-0.5">
                      โทรศัพท์: <span className="font-semibold text-stone-700">{settings.defaultContactPhone}</span> • Line ID: <span className="font-semibold text-stone-700">{settings.defaultContactLine}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Document Title & Meta Box */}
                <div className="text-right shrink-0">
                  <div className="border border-stone-900 bg-stone-900 text-white text-center px-3.5 py-1.5 rounded-sm shadow-2xs">
                    <div className="text-xs font-extrabold uppercase tracking-wider">
                      ใบเสร็จรับเงินมัดจำการจองห้องชุด
                    </div>
                    <div className="text-[9px] font-medium tracking-wider text-amber-300 opacity-90 uppercase">
                      OFFICIAL BOOKING RECEIPT & DEPOSIT AGREEMENT
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-0.5 text-xs text-stone-600">
                    <div>
                      เลขที่เอกสาร: <span className="font-mono font-extrabold text-stone-950 text-xs">{formData.receiptNumber}</span>
                    </div>
                    <div>
                      วันที่ออกเอกสาร: <span className="font-semibold text-stone-800 text-[11px]">{formatThaiDate(formData.bookingDate)}</span>
                    </div>
                    <div className="pt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                        ✓ ได้รับเงินมัดจำเรียบร้อยแล้ว (PAID)
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* ========================================================================= */}
              {/* 2. BODY CONTENT (READ-ONLY OFFICIAL DOCUMENT VIEW)                        */}
              {/* ========================================================================= */}
              {isReadOnly ? (
                <div className="my-5 space-y-4 text-xs text-stone-800">
                  
                  {/* Section A: Parties Information Table */}
                  <div className="border border-stone-300 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-stone-300 bg-stone-50/50">
                      
                      {/* Customer Details */}
                      <div className="p-3.5 space-y-2">
                        <div className="text-[11px] font-bold text-stone-900 uppercase tracking-wider pb-1 border-b border-stone-200 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-stone-700" />
                          <span>ข้อมูลผู้จองห้องชุด (Customer Information)</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex">
                            <span className="w-28 text-stone-500 shrink-0">ชื่อ - นามสกุล:</span>
                            <span className="font-bold text-stone-950 text-xs sm:text-sm">{formData.customerName || '-'}</span>
                          </div>
                          <div className="flex">
                            <span className="w-28 text-stone-500 shrink-0">เบอร์โทรศัพท์ติดต่อ:</span>
                            <span className="font-mono font-semibold text-stone-900">{formData.customerPhone || '-'}</span>
                          </div>
                          <div className="flex">
                            <span className="w-28 text-stone-500 shrink-0">เลขประจำตัว ปชช./Passport:</span>
                            <span className="font-mono text-stone-700">{formData.customerIdCard || '-'}</span>
                          </div>
                          <div className="flex">
                            <span className="w-28 text-stone-500 shrink-0">อีเมลติดต่อ:</span>
                            <span className="font-mono text-stone-700">{formData.customerEmail || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Unit Details & Recipient */}
                      <div className="p-3.5 space-y-2">
                        <div className="text-[11px] font-bold text-stone-900 uppercase tracking-wider pb-1 border-b border-stone-200 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-stone-700" />
                          <span>ข้อมูลห้องชุดและผู้รับเงิน (Unit & Payee Details)</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex">
                            <span className="w-28 text-stone-500 shrink-0">โครงการ:</span>
                            <span className="font-bold text-stone-950">{formData.condoName || 'Bangkok Horizon Ram 60'}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="w-28 text-stone-500 shrink-0">หมายเลขห้องชุด:</span>
                            <span className="font-bold text-sm text-stone-950">
                              ห้อง {formData.roomNumber || '-'}
                            </span>
                          </div>
                          <div className="flex">
                            <span className="w-28 text-stone-500 shrink-0">ประเภทธุรกรรม:</span>
                            <span className="font-semibold text-stone-800">
                              {formData.bookingType === 'sale' ? 'ซื้อขายกรรมสิทธิ์ (Sale)' : 'เช่าพักอาศัย (Residential Lease)'}
                            </span>
                          </div>
                          <div className="flex items-start">
                            <span className="w-28 text-stone-500 shrink-0 pt-0.5">ผู้รับเงินมัดจำ:</span>
                            <span className="font-bold text-stone-900">
                              {formData.recipientType === 'owner' ? (
                                <span>{formData.recipientName || formData.agentName || 'เจ้าของห้อง'}</span>
                              ) : formData.recipientType === 'juristic' ? (
                                <span>{formData.recipientName || formData.agentName || 'นิติบุคคล อาคารชุดบางกอกฮอไรซอน รามคำแหง'}</span>
                              ) : (
                                <span>{formData.recipientName || formData.agentName || 'ผู้รับเงินมัดจำ'}</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Section B: Official Financial Accounting Table */}
                  <div className="border border-stone-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-900 text-white text-[11px]">
                          <th className="py-2.5 px-4 font-bold w-12 text-center">ลำดับ</th>
                          <th className="py-2.5 px-4 font-bold">รายการเงินมัดจำ (Description)</th>
                          <th className="py-2.5 px-4 font-bold text-right w-40">จำนวนเงิน (บาท)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        <tr className="bg-white">
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-stone-600">1</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-stone-950 text-xs">
                              เงินมัดจำเพื่อจองสิทธิ์ห้องชุดเลขที่ {formData.roomNumber}
                            </div>
                            <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-3">
                              <span>• วันที่ชำระเงินมัดจำ: <strong className="text-stone-800">{formatThaiDate(formData.bookingDate)}</strong></span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-950 text-sm">
                            ฿{Number(formData.bookingAmount || 0).toLocaleString()}.00
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-stone-50 border-t-2 border-stone-300">
                          <td colSpan={2} className="py-3 px-4">
                            <div className="text-[11px] text-stone-600">
                              จำนวนเงินตัวอักษร: <span className="font-bold text-stone-900">({thaiBahtText(Number(formData.bookingAmount || 0))})</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="text-[10px] text-stone-500 uppercase font-semibold">ยอดเงินมัดจำสุทธิ</div>
                            <div className="font-mono font-black text-lg text-stone-950">
                              ฿{Number(formData.bookingAmount || 0).toLocaleString()}.00
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Section C: Contract Agreement & Balance Schedule */}
                  <div className="p-4 bg-stone-50 rounded-lg border border-stone-300 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="block text-stone-500 text-[10px] uppercase font-semibold">
                        {formData.bookingType === 'sale' ? 'ราคาขายที่ตกลง' : 'อัตราค่าเช่าตกลง'}
                      </span>
                      <span className="font-mono font-bold text-sm text-stone-950">
                        ฿{Number(formData.price || 0).toLocaleString()} {formData.bookingType === 'sale' ? 'บาท' : 'บาท/เดือน'}
                      </span>
                    </div>
                    <div className="space-y-0.5 sm:text-right">
                      <span className="block text-stone-500 text-[10px] uppercase font-semibold">
                        กำหนดวันนัดทำสัญญาเช่า/โอน
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-800">
                        {formatThaiDate(formData.contractSignDate)}
                      </span>
                    </div>
                  </div>

                  {/* Section D: Legal Terms and Conditions */}
                  <div className="p-3.5 bg-white rounded-lg border border-stone-200 text-stone-700">
                    <div className="font-bold text-stone-900 mb-1.5 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
                      <span>ข้อตกลงและเงื่อนไขการจองห้องชุด (Terms & Conditions):</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-stone-600 leading-relaxed whitespace-pre-line">
                      {formData.terms || DEFAULT_BOOKING_TERMS}
                    </div>
                  </div>

                  {/* Section E: Formal Signature Blocks & Stamp */}
                  <div className="grid grid-cols-2 gap-8 pt-4 border-t border-stone-300 text-center">
                    
                    {/* Customer Signature */}
                    <div className="space-y-1">
                      <div className="h-16 border-b border-dashed border-stone-400 mx-8 flex items-end justify-center pb-1">
                        <span className="italic text-stone-400 text-xs select-none">
                          (ลงลายมือชื่อผู้จองห้องชุด)
                        </span>
                      </div>
                      <p className="font-bold text-stone-900 text-xs">
                        {formData.customerName || 'ผู้จอง / ลูกค้า'}
                      </p>
                      <p className="text-[10px] text-stone-500">ผู้จองห้องชุด (Customer)</p>
                    </div>

                    {/* Officer / Owner Signature & Official Stamp */}
                    <div className="relative space-y-1">
                      {/* Realistic High-Res Juristic Stamp */}
                      <div className="absolute -top-2 right-4 sm:right-10 border-2 border-emerald-600 text-emerald-700 font-extrabold text-[10px] px-2.5 py-1 rounded rotate-[-7deg] uppercase tracking-wider opacity-90 select-none pointer-events-none bg-white/70 shadow-2xs">
                        PAID / ได้รับเงินมัดจำแล้ว
                        <div className="text-[8px] font-normal text-emerald-800">
                          {formData.recipientType === 'owner' 
                            ? (formData.recipientName || 'เจ้าของห้องชุด')
                            : formData.recipientType === 'other'
                            ? (formData.recipientName || 'ผู้รับเงินมัดจำ')
                            : 'นิติบุคคล อาคารชุดบางกอกฮอไรซอน รามคำแหง'}
                        </div>
                      </div>

                      <div className="h-16 border-b border-dashed border-stone-400 mx-8 flex items-end justify-center pb-1">
                        <span className="italic text-stone-400 text-xs select-none">
                          {formData.recipientType === 'owner' 
                            ? '(ลงลายมือชื่อเจ้าของห้อง)' 
                            : formData.recipientType === 'other'
                            ? '(ลงลายมือชื่อผู้รับเงิน)'
                            : '(ลงลายมือชื่อผู้รับเงิน / นิติบุคคล)'}
                        </span>
                      </div>
                      <p className="font-bold text-stone-900 text-xs">
                        {formData.recipientName || formData.agentName || (formData.recipientType === 'owner' ? 'เจ้าของห้อง' : 'นิติบุคคล อาคารชุดบางกอกฮอไรซอน รามคำแหง')}
                      </p>
                      <p className="text-[10px] text-stone-500">
                        {formData.recipientType === 'owner' 
                          ? 'เจ้าของห้อง (Unit Owner)' 
                          : formData.recipientType === 'other'
                          ? 'ผู้รับเงินมัดจำ (Authorized Recipient)'
                          : 'นิติบุคคล อาคารชุดบางกอกฮอไรซอน รามคำแหง (Juristic Person)'}
                      </p>
                    </div>

                  </div>

                </div>
              ) : (
                /* ========================================================================= */
                /* EDIT MODE: เมื่อต้องการแก้ไขข้อมูลใบจอง                                      */
                /* ========================================================================= */
                <div className="my-5 space-y-4">
                  
                  {/* 1. Customer Details */}
                  <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                    <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-stone-600" />
                      1. ข้อมูลผู้จอง / ผู้เช่า (Customer Details)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">ชื่อ - นามสกุล ผู้จอง *</label>
                        <input
                          type="text"
                          value={formData.customerName || ''}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                          placeholder=""
                          className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">เบอร์โทรศัพท์ติดต่อ *</label>
                        <input
                          type="tel"
                          value={formData.customerPhone || ''}
                          onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                          placeholder=""
                          className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">เลขบัตรประชาชน / Passport</label>
                        <input
                          type="text"
                          value={formData.customerIdCard || ''}
                          onChange={(e) => setFormData({ ...formData, customerIdCard: e.target.value })}
                          placeholder=""
                          className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">อีเมล (ถ้ามี)</label>
                        <input
                          type="email"
                          value={formData.customerEmail || ''}
                          onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                          placeholder=""
                          className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Room Details */}
                  <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                    <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-stone-600" />
                      2. รายละเอียดห้องชุดที่จอง (Room Specification)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">ชื่อโครงการคอนโด *</label>
                        <input
                          type="text"
                          value={formData.condoName || ''}
                          onChange={(e) => setFormData({ ...formData, condoName: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">หมายเลขห้อง *</label>
                        <input
                          type="text"
                          value={formData.roomNumber || ''}
                          onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-mono font-bold text-stone-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">ประเภทการจอง</label>
                        <select
                          value={formData.bookingType || 'rent'}
                          onChange={(e) => setFormData({ ...formData, bookingType: e.target.value as any })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="rent">เช่าพักอาศัย (Rent)</option>
                          <option value="sale">ซื้อคอนโดมิเนียม (Sale)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 3. Financial Summary */}
                  <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200">
                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                      3. ข้อมูลทางการเงินและเงินมัดจำการจอง (Financial Summary)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">
                          {formData.bookingType === 'rent' ? 'ราคาเช่าตกลง (บาท/เดือน)' : 'ราคาขายตกลง (บาท)'}
                        </label>
                        <input
                          type="number"
                          value={formData.price || 0}
                          onChange={(e) => {
                            const newPrice = Number(e.target.value);
                            const isSale = formData.bookingType === 'sale';
                            const bAmt = Number(formData.bookingAmount || 0);
                            setFormData({
                              ...formData,
                              price: newPrice,
                              remainingDeposit: Math.max(0, (isSale ? newPrice * 0.1 : newPrice * 2) - bAmt)
                            });
                          }}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-mono font-bold text-stone-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-900 font-bold mb-1">ยอดเงินมัดจำจอง (บาท) *</label>
                        <input
                          type="number"
                          value={formData.bookingAmount || 0}
                          onChange={(e) => {
                            const newBooking = Number(e.target.value);
                            const isSale = formData.bookingType === 'sale';
                            const curPrice = Number(formData.price || 0);
                            setFormData({
                              ...formData,
                              bookingAmount: newBooking,
                              remainingDeposit: Math.max(0, (isSale ? curPrice * 0.1 : curPrice * 2) - newBooking)
                            });
                          }}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-amber-400 font-mono font-black text-amber-900 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">วันนัดทำสัญญา/โอน *</label>
                        <input
                          type="date"
                          value={formData.contractSignDate || ''}
                          onChange={(e) => setFormData({ ...formData, contractSignDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-mono text-stone-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. ผู้รับเงินมัดจำ (เจ้าหน้าที่นิติ หรือ เจ้าของห้อง) */}
                  <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                        <span>4. ผู้รับเงินมัดจำ (Payee / Recipient) *</span>
                      </h3>
                      <span className="text-[11px] text-stone-500">เลือกเจ้าหน้าที่นิติบุคคล หรือ เจ้าของห้องชุด</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const name = 'นิติบุคคล อาคารชุดบางกอกฮอไรซอน รามคำแหง';
                          setFormData(prev => ({
                            ...prev,
                            recipientType: 'juristic',
                            recipientName: name,
                            agentName: name
                          }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer border ${
                          formData.recipientType === 'juristic' || !formData.recipientType
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        นิติบุคคล อาคารชุดบางกอกฮอไรซอน รามคำแหง
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const ownerText = selectedRoom?.ownerName ? `${selectedRoom.ownerName} (เจ้าของห้อง)` : 'เจ้าของห้อง';
                          setFormData(prev => ({
                            ...prev,
                            recipientType: 'owner',
                            recipientName: ownerText,
                            agentName: ownerText
                          }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer border ${
                          formData.recipientType === 'owner'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        เจ้าของห้อง
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            recipientType: 'other',
                            recipientName: '',
                            agentName: ''
                          }));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer border ${
                          formData.recipientType === 'other'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        กำหนดเอง
                      </button>
                    </div>

                    <div>
                      <label className="block text-stone-600 mb-1 text-xs font-medium">
                        {formData.recipientType === 'owner' && 'ชื่อเจ้าของห้อง:'}
                        {formData.recipientType === 'juristic' && 'ชื่อผู้รับเงิน / นิติบุคคล:'}
                        {formData.recipientType === 'other' && 'ระบุชื่อผู้รับเงินมัดจำ:'}
                      </label>
                      <input
                        type="text"
                        value={formData.recipientName || formData.agentName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({ ...prev, recipientName: val, agentName: val }));
                        }}
                        placeholder=""
                        className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 5. Terms and Conditions */}
                  <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-bold text-stone-800">5. ข้อตกลงและเงื่อนไขการจอง (Terms & Conditions):</div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            terms: DEFAULT_BOOKING_TERMS
                          }));
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                        title="คืนค่าข้อความเริ่มต้นตามมาตรฐาน"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>คืนค่าเริ่มต้น</span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.terms || ''}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-700 leading-relaxed focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      * ข้อความนี้จะปรากฏในใบเสร็จรับเงินจองขนาด A4 ทางการ สามารถแก้ไขหรือเพิ่มข้อตกลงได้ตามต้องการ
                    </p>
                  </div>

                </div>
              )}
            </div>

            {/* 3. A4 FOOTER NOTE (OFFICIAL SYSTEM GENERATED WATERMARK) */}
            <div className="pt-4 border-t border-stone-300 flex items-center justify-between text-[10px] text-stone-400 select-none">
              <div>
                เอกสารนี้สร้างขึ้นจากระบบบริหารจัดการอาคารชุด แบงค์คอก ฮอไรซอน รามคำแหง 60
              </div>
              <div className="font-mono">
                หน้า 1 จาก 1 (Page 1 of 1 • Standard A4)
              </div>
            </div>

          </div>

          {/* Bottom Floating Actions in Web View (No Print) */}
          <div className="w-full max-w-[794px] mt-4 flex items-center justify-between gap-3 no-print bg-white p-3.5 rounded-xl border border-stone-300 shadow-sm">
            <div className="text-xs text-stone-500">
              {validationError ? (
                <span className="text-red-600 font-medium">{validationError}</span>
              ) : isReadOnly ? (
                'เอกสารขนาดมาตรฐาน A4 พร้อมสั่งพิมพ์หรือบันทึกเป็น PDF'
              ) : (
                'โปรดตรวจสอบข้อมูลให้ครบถ้วนก่อนกดบันทึก'
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>

              {isReadOnly ? (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isProcessing}
                    className="px-4 py-2 text-xs font-bold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์ใบจอง A4</span>
                  </button>
                </>
              ) : (
                <button
                  id="btn-save-booking-receipt"
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  บันทึกใบจองเข้าระบบ
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
