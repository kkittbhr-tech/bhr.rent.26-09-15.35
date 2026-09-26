import React, { useRef, useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Image as ImageIcon, 
  FileText, 
  Building2, 
  Bed, 
  Bath, 
  Layers, 
  Phone, 
  MessageCircle, 
  Check, 
  Sparkles,
  Loader2,
  Compass
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Room, AppSettings } from '../types';
import { resolveDirection, resolveViewType } from '../utils/directionInsight';
import { printIsolatedElement } from '../utils/printHelper';

interface HorizontalRoomFlyerModalProps {
  room: Room;
  settings: AppSettings;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}

export const HorizontalRoomFlyerModal: React.FC<HorizontalRoomFlyerModalProps> = ({
  room,
  settings,
  onClose,
  onNotify
}) => {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string>('');

  // 1. เซฟเป็นรูปภาพ (Save as Image - PNG)
  const handleSaveAsImage = async () => {
    if (!flyerRef.current) return;
    setIsProcessing(true);
    setProcessingAction('กำลังสร้างรูปภาพความละเอียดสูง (PNG)...');
    
    try {
      // Ensure cross-origin images or use loaded canvas
      const canvas = await html2canvas(flyerRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Flyer-${room.roomNumber}-${room.condoName.replace(/\s+/g, '_')}.png`;
      link.click();

      onNotify?.(`บันทึกรูปภาพโบรชัวร์ห้อง ${room.roomNumber} เรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error('Save image error:', err);
      onNotify?.(`เกิดข้อผิดพลาดในการสร้างรูปภาพ: ${err.message || 'โปรดลองอีกครั้ง'}`);
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  // 2. เซฟเป็น PDF (Save as Landscape PDF)
  const handleSaveAsPdf = async () => {
    if (!flyerRef.current) return;
    setIsProcessing(true);
    setProcessingAction('กำลังสร้างไฟล์ PDF แนวนอน (A4 Landscape)...');

    try {
      const canvas = await html2canvas(flyerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // A4 Landscape: 297mm x 210mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 297;
      const pdfHeight = 210;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Flyer-${room.roomNumber}-${room.condoName.replace(/\s+/g, '_')}.pdf`);

      onNotify?.(`ดาวน์โหลด PDF โบรชัวร์แนวนอนห้อง ${room.roomNumber} เรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error('Save PDF error:', err);
      onNotify?.(`เกิดข้อผิดพลาดในการสร้าง PDF: ${err.message || 'โปรดลองอีกครั้ง'}`);
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  // 3. กดปริ้นออกเครื่องปริ้น (Direct Print via Printer - Isolated without webpage)
  const handleDirectPrint = async () => {
    setIsProcessing(true);
    setProcessingAction('กำลังเตรียมหน้าสำหรับพิมพ์ A4 แนวนอน...');
    try {
      await printIsolatedElement(flyerRef.current, `โบรชัวร์ห้อง_${room.roomNumber}_${room.condoName}`, true);
      onNotify?.('เปิดหน้าต่างสั่งพิมพ์ใบประกาศ A4 แนวนอนเรียบร้อยแล้ว');
    } catch (err: any) {
      console.error('Print flyer error:', err);
      window.print();
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  // Size label
  const sizeCategoryLabel = 
    room.sizeCategory === 'small' ? 'ขนาดเล็ก (< 35 ตร.ม.)' :
    room.sizeCategory === 'medium' ? 'ขนาดกลาง (35 - 60 ตร.ม.)' : 'ขนาดใหญ่ (> 60 ตร.ม.)';

  const heroImage = room.images && room.images.length > 0 ? room.images[0] : null;
  const subImages = room.images && room.images.length > 1 ? room.images.slice(1, 4) : [];
  const dir = resolveDirection(room.facingDirection);
  const view = resolveViewType(room.viewType, room.description, room.floor);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      
      <div className="bg-stone-100 rounded-lg shadow-2xl border border-stone-300 w-full max-w-6xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        
        {/* Top Control Bar (Hidden during print) */}
        <div className="px-6 py-4 bg-stone-900 text-stone-100 flex flex-wrap items-center justify-between gap-3 no-print">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-mono font-medium text-stone-400">
                ระบบพิมพ์รูปห้องแนวนอน (Horizontal Flyer)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-sm bg-stone-800 text-stone-300 border border-stone-700 font-mono">
                ห้อง {room.roomNumber}
              </span>
            </div>
            <h2 className="font-display text-base sm:text-lg font-semibold text-white">
              {room.condoName} — ใบนำเสนอห้องรูปแบบแนวนอน
            </h2>
          </div>

          {/* Action Buttons: 1. Save Image, 2. Save PDF, 3. Print */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* 1. เซฟเป็นรูปภาพ */}
            <button
              id="btn-save-flyer-image"
              disabled={isProcessing}
              onClick={handleSaveAsImage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-white text-stone-900 hover:bg-stone-100 transition-colors shadow-2xs border border-stone-200 disabled:opacity-50"
              title="เซฟเป็นรูปภาพ PNG เพื่อโพสต์หรือส่ง Line"
            >
              <ImageIcon className="w-3.5 h-3.5 text-stone-600" />
              <span>เซฟเป็นรูปภาพ (PNG)</span>
            </button>

            {/* 2. เซฟเป็น PDF */}
            <button
              id="btn-save-flyer-pdf"
              disabled={isProcessing}
              onClick={handleSaveAsPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-stone-800 text-stone-100 hover:bg-stone-700 transition-colors border border-stone-700 disabled:opacity-50"
              title="บันทึกเป็นเอกสาร PDF แนวนอน"
            >
              <FileText className="w-3.5 h-3.5 text-stone-300" />
              <span>เซฟเป็น PDF</span>
            </button>

            {/* 3. กดปริ้นออกเครื่องปริ้น */}
            <button
              id="btn-print-flyer"
              disabled={isProcessing}
              onClick={handleDirectPrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-stone-900 text-stone-100 hover:bg-stone-800 transition-colors border border-stone-700"
              title="สั่งพิมพ์ออกเครื่องปริ้นทันที"
            >
              <Printer className="w-3.5 h-3.5 text-stone-300" />
              <span>กดปริ้นออกเครื่องปริ้น</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-md hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="bg-stone-200/90 border-b border-stone-300 px-6 py-2 flex items-center justify-center gap-2 text-stone-800 text-xs font-medium no-print">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-700" />
            <span>{processingAction}</span>
          </div>
        )}

        {/* Scrollable View Container */}
        <div className="overflow-auto p-4 sm:p-8 flex justify-center bg-stone-200/40 print:p-0 print:bg-white">
          
          {/* THE ACTUAL HORIZONTAL FLYER CONTAINER (Landscape 16:9 / A4 Presentation Sheet) */}
          <div 
            ref={flyerRef}
            id="horizontal-flyer-canvas"
            className="w-full max-w-[1050px] aspect-16/10 sm:aspect-16/10 bg-white rounded-lg shadow-sm overflow-hidden border border-stone-200 flex flex-col justify-between p-6 sm:p-8 text-stone-900 print:shadow-none print:border-none print:w-full print:rounded-none"
            style={{ minHeight: '580px' }}
          >
            
            {/* Header: Agency Logo & Room Title */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-stone-900 flex items-center justify-center text-white font-medium">
                  <Building2 className="w-5 h-5 text-stone-200" />
                </div>
                <div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                    {room.condoName}
                  </h1>
                  <p className="text-xs text-stone-500 font-light">
                    ห้อง <span className="font-semibold text-stone-800 tabular-nums">{room.roomNumber}</span> • ชั้น <span className="tabular-nums">{room.floor}</span>
                  </p>
                </div>
              </div>

              {/* Price Callout in Header */}
              <div className="text-right space-y-0.5">
                {room.rentPrice && (
                  <div className="text-xs text-stone-500 font-normal">
                    เช่า: <span className="text-xl sm:text-2xl font-bold text-stone-900 tabular-nums">฿{room.rentPrice.toLocaleString()}</span>
                  </div>
                )}
                {room.salePrice && (
                  <div className="text-xs text-stone-500 font-normal">
                    ขาย: <span className="text-xl sm:text-2xl font-bold text-stone-900 tabular-nums">฿{room.salePrice.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content: Left Photo Gallery (Horizontal focus) + Right Specs & Highlights */}
            <div className="grid grid-cols-12 gap-5 my-4 flex-1 items-stretch">
              
              {/* Left Column: Landscape Photos (7 cols) */}
              <div className="col-span-12 sm:col-span-7 flex flex-col justify-between gap-3">
                
                {/* Big Horizontal Main Photo */}
                <div className="relative rounded-md overflow-hidden aspect-16/9 bg-stone-100 border border-stone-200 shadow-2xs flex-1 flex items-center justify-center">
                  {heroImage ? (
                    <img
                      src={heroImage}
                      alt={room.condoName}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100/90 text-stone-400 p-6 text-center select-none">
                      <div className="w-14 h-14 rounded-xl bg-stone-200/80 flex items-center justify-center text-stone-500 mb-2">
                        <Building2 className="w-7 h-7 stroke-[1.5]" />
                      </div>
                      <h4 className="font-bold text-stone-800 text-sm">{room.condoName}</h4>
                      <p className="text-xs text-stone-500 mt-0.5">ห้อง {room.roomNumber} • ชั้น {room.floor} ({room.areaSqM} ตร.ม.)</p>
                      <span className="text-[10px] text-stone-400 mt-2 font-mono">ติดต่อสอบถามข้อมูลห้องจริงได้ที่สำนักงานนิติบุคคล</span>
                    </div>
                  )}
                  
                  {/* Badges on Hero */}
                  <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                    <span className="px-2.5 py-1 rounded-xs text-[11px] font-medium bg-stone-900/90 text-stone-100 backdrop-blur-xs">
                      {sizeCategoryLabel}
                    </span>
                    <span className="px-2.5 py-1 rounded-xs text-[11px] font-medium bg-stone-800/90 text-stone-200">
                      {room.areaSqM} ตารางเมตร
                    </span>
                  </div>

                  {heroImage && (
                    <div className="absolute bottom-2.5 right-2.5 bg-stone-900/80 backdrop-blur-xs text-stone-200 text-[11px] px-2 py-0.5 rounded-xs font-light">
                      ภาพถ่ายจริง ณ ห้องชุด
                    </div>
                  )}
                </div>

                {/* Sub Photo Strip (3 small horizontal thumbnails) */}
                <div className="grid grid-cols-3 gap-2 h-20 sm:h-24">
                  {subImages.length > 0 ? (
                    subImages.map((img, idx) => (
                      <div key={idx} className="rounded-md overflow-hidden border border-stone-200 bg-stone-100">
                        <img 
                          src={img} 
                          alt="preview" 
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous" 
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 flex items-center justify-center bg-stone-50 border border-dashed border-stone-200 rounded-md text-xs text-stone-400 font-light">
                      ห้องตกแต่งครบ พร้อมเฟอร์นิเจอร์และเครื่องใช้ไฟฟ้า
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Key Details, Highlights, Amenities & Contact (5 cols) */}
              <div className="col-span-12 sm:col-span-5 flex flex-col justify-between bg-stone-50/80 rounded-md p-4 border border-stone-200/80">
                
                <div>
                  {/* Specs Quick Matrix */}
                  <div className="grid grid-cols-3 gap-2 bg-white rounded-md p-2.5 border border-stone-200 text-center mb-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-light">ห้องนอน</span>
                      <span className="font-medium text-stone-900">{room.bedrooms === 0 ? 'Studio' : `${room.bedrooms} ห้องนอน`}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block font-light">ห้องน้ำ</span>
                      <span className="font-medium text-stone-900">{room.bathrooms} ห้องน้ำ</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block font-light">ชั้นที่</span>
                      <span className="font-medium text-stone-900">ชั้น {room.floor}</span>
                    </div>
                  </div>

                  {/* Direction & View Insight Box */}
                  <div className="bg-white rounded-md p-2.5 border border-stone-200 mb-3 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <Compass className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-stone-400 block font-light">ทิศทางระเบียง & มุมมองวิว</span>
                        <span className="font-semibold text-stone-900 truncate block">
                          {dir.name} ({dir.shortName} {dir.angle}°) • {view.icon} {room.viewType || view.name}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-sm font-light shrink-0">
                      {room.sunlightExposure || dir.sunlightSummary}
                    </span>
                  </div>

                  {/* Highlights Bullets */}
                  <div className="mb-3">
                    <h3 className="font-display text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-stone-500" />
                      จุดเด่นของห้องนี้
                    </h3>
                    <ul className="space-y-1 text-xs text-stone-600">
                      {room.highlights && room.highlights.length > 0 ? (
                        room.highlights.slice(0, 4).map((h, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-stone-700 shrink-0 mt-0.5" />
                            <span className="line-clamp-1 font-light">{h}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-stone-400 font-light">เฟอร์นิเจอร์บิวท์อินครบชุด พร้อมอยู่</li>
                      )}
                    </ul>
                  </div>

                  {/* Amenities Tags */}
                  {room.amenities && room.amenities.length > 0 && (
                    <div className="mb-3">
                      <h3 className="text-[11px] font-medium text-stone-700 mb-1">สิ่งอำนวยความสะดวกในห้อง & ส่วนกลาง</h3>
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.slice(0, 5).map((a, i) => (
                          <span key={i} className="text-[10px] bg-white border border-stone-200 px-2 py-0.5 rounded-sm text-stone-700 font-light">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Agent Contact Box at Bottom */}
                <div className="bg-stone-900 text-stone-100 rounded-md p-3 text-xs border border-stone-800">
                  <div className="text-[10px] text-stone-400 font-mono uppercase tracking-wider mb-1">
                    สนใจนัดชมห้องหรือสอบถามข้อมูลเพิ่มเติม
                  </div>
                  <div className="font-semibold text-sm text-white mb-1">
                    {room.contactName || settings.agencyName}
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-300 pt-1.5 border-t border-stone-800">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-stone-400" />
                      {room.contactPhone || settings.defaultContactPhone}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <MessageCircle className="w-3 h-3 text-stone-400" />
                      LINE: {room.contactLine || settings.defaultContactLine}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer Note */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-400 font-light">
              <span>{settings.agencyName || 'Bangkok Horizon Ram 60 (นิติบุคคลอาคารชุด)'} • สำนักงานนิติบุคคลอาคารชุด แบงค์คอก ฮอไรซอน รามคำแหง 60</span>
              <span>เอกสารนำเสนอข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')}</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
