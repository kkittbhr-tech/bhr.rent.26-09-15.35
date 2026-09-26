import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Share2,
  Maximize2,
  Phone,
  MessageCircle,
  Building2,
  Layers,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Facility } from '../types';

interface FacilityDetailModalProps {
  facility: Facility | null;
  onClose: () => void;
  contactLine?: string;
  contactPhone?: string;
  onShareFacility?: (facility: Facility) => void;
}

export const FacilityDetailModal: React.FC<FacilityDetailModalProps> = ({ 
  facility, 
  onClose,
  contactLine = 'https://line.me/ti/p/~@bangkokhorizon',
  contactPhone = '02-735-6000',
  onShareFacility
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Reset index when facility changes
  useEffect(() => {
    setActiveImageIndex(0);
    setIsLightboxOpen(false);
  }, [facility]);

  // Keyboard navigation
  const handlePrevImage = useCallback(() => {
    if (!facility?.images || facility.images.length <= 1) return;
    setActiveImageIndex(prev => (prev === 0 ? facility.images.length - 1 : prev - 1));
  }, [facility]);

  const handleNextImage = useCallback(() => {
    if (!facility?.images || facility.images.length <= 1) return;
    setActiveImageIndex(prev => (prev === facility.images.length - 1 ? 0 : prev + 1));
  }, [facility]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, handlePrevImage, handleNextImage, onClose]);

  if (!facility) return null;

  const images = facility.images && facility.images.length > 0 
    ? facility.images 
    : [];

  const handleShare = () => {
    if (onShareFacility) {
      onShareFacility(facility);
      return;
    }
    const shareText = `พื้นที่ส่วนกลาง: ${facility.name} (ชั้น ${facility.floor}) โครงการ Bangkok Horizon Ram 60`;
    if (navigator.share) {
      navigator.share({
        title: facility.name,
        text: shareText,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      alert('คัดลอกข้อมูลส่วนกลางเรียบร้อยแล้ว');
    }
  };

  return (
    <>
      {/* 1. Main Modal Backdrop & Container (Matching RoomDetailModal) */}
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-start sm:items-center justify-center p-0 sm:p-4 md:p-6 no-print">
        {/* Backdrop Dismiss */}
        <div className="fixed inset-0 -z-10" onClick={onClose} aria-label="ปิดหน้าต่าง" />

        <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-stone-200 w-full max-w-3xl overflow-hidden flex flex-col h-full sm:h-auto min-h-screen sm:min-h-0 max-h-screen sm:max-h-[92vh] animate-in fade-in duration-200">
          
          {/* Header Bar */}
          <div className="px-4 py-2.5 sm:px-6 sm:py-3.5 bg-white border-b border-stone-200/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-xs sm:text-sm text-stone-900 bg-stone-100 border border-stone-300 px-2.5 py-1 rounded-md shrink-0">
                {facility.floor}
              </span>
              <h3 className="font-bold text-sm sm:text-base text-stone-900 truncate">
                {facility.name}
              </h3>
            </div>

            {/* Actions: Share + Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleShare}
                className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                title="แชร์ข้อมูลส่วนกลางนี้"
                aria-label="แชร์ข้อมูลส่วนกลางนี้"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                title="ปิดหน้าต่าง"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain flex-1">
            
            {/* Main Photo Gallery */}
            <div className="space-y-2">
              <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-stone-950 shadow-inner group select-none flex items-center justify-center">
                {images.length > 0 ? (
                  <img
                    src={images[activeImageIndex] || images[0]}
                    alt={facility.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 cursor-zoom-in"
                    onClick={() => setIsLightboxOpen(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 text-stone-400">
                    <Building2 className="w-12 h-12 text-stone-600" />
                    <span className="text-sm font-medium">รออัพโหลดรูปภาพของโครงการ</span>
                  </div>
                )}

                {/* Left/Right Carousel Controls */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white backdrop-blur-xs flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer hover:scale-105 active:scale-95"
                      title="ภาพก่อนหน้า"
                      aria-label="ภาพก่อนหน้า"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white backdrop-blur-xs flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer hover:scale-105 active:scale-95"
                      title="ภาพถัดไป"
                      aria-label="ภาพถัดไป"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Photo Badge & Fullscreen Button */}
                <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-xs">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{facility.floor}</span>
                </div>

                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <span className="bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-mono px-2.5 py-1 rounded-md shadow-xs">
                    {activeImageIndex + 1} / {images.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="p-1.5 rounded-md bg-stone-900/80 hover:bg-stone-900 text-white backdrop-blur-xs transition-colors shadow-xs cursor-pointer"
                    title="ขยายภาพเต็มจอ"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Photo Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 sm:w-20 aspect-16/10 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-stone-900 ring-2 ring-stone-900/20 opacity-100 scale-102'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Facility Header & English Name */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
                  {facility.name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  เปิดให้บริการ
                </span>
              </div>
              {facility.nameEn && (
                <p className="text-xs text-stone-500 mt-0.5">
                  {facility.nameEn} • Bangkok Horizon Ram 60
                </p>
              )}
            </div>

            {/* Key Information 4-Column Grid (Specs style) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
                <div className="flex justify-center mb-1">
                  <MapPin className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-stone-400 block">ตำแหน่งที่ตั้ง</span>
                <span className="text-xs sm:text-sm font-bold text-stone-900">{facility.floor}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
                <div className="flex justify-center mb-1">
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-stone-400 block">เวลาเปิดบริการ</span>
                <span className="text-xs sm:text-sm font-bold text-stone-900">
                  {facility.hours || '06:00 - 22:00 น.'}
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
                <div className="flex justify-center mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-stone-400 block">สิทธิ์การเข้าใช้</span>
                <span className="text-xs sm:text-sm font-bold text-stone-900">ลูกบ้าน & ผู้เช่า</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
                <div className="flex justify-center mb-1">
                  <Building2 className="w-4 h-4 text-stone-600" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-stone-400 block">การดูแล</span>
                <span className="text-xs sm:text-sm font-bold text-stone-900">นิติบุคคลอาคารชุด</span>
              </div>
            </div>

            {/* Description Card */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                รายละเอียดพื้นที่ส่วนกลาง
              </h4>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50/70 p-3.5 sm:p-4 rounded-xl border border-stone-200/80">
                {facility.description || 'สิ่งอำนวยความสะดวกครบครันเพื่อคุณภาพชีวิตของผู้อยู่อาศัยในโครงการ Bangkok Horizon Ram 60'}
              </p>
            </div>

            {/* Rules & Guidelines Section */}
            {facility.rules && facility.rules.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-stone-600" />
                  <span>ข้อกำหนดและระเบียบการใช้บริการ</span>
                </h4>
                <div className="bg-stone-50/70 p-3.5 sm:p-4 rounded-xl border border-stone-200/80 space-y-2">
                  {facility.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-stone-700">
                      <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Juristic Office Inquiry Box */}
            <div className="bg-gradient-to-br from-stone-900 to-stone-850 text-white rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                    ฝ่ายบริหารอาคารและทรัพย์สิน
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-1">
                  สอบถามกฎระเบียบส่วนกลาง จองห้องส่วนกลาง หรือติดต่อเข้าชมโครงการ
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {contactLine && (
                  <a
                    href={contactLine.startsWith('http') ? contactLine : `https://line.me/ti/p/~${contactLine}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>ทัก LINE</span>
                  </a>
                )}
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone}`}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-white/20"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-300" />
                    <span>โทรนิติฯ</span>
                  </a>
                )}
              </div>
            </div>

          </div>

          {/* Footer Bar */}
          <div className="px-4 py-3 sm:px-6 sm:py-3 bg-stone-50 border-t border-stone-200/90 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-stone-500 font-medium">
              Bangkok Horizon Ramkhamhaeng 60
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-800 text-xs font-bold rounded-lg border border-stone-300 transition-colors shadow-2xs cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>

        </div>
      </div>

      {/* 2. Fullscreen Lightbox Mode */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[70] bg-stone-950 flex flex-col justify-between p-3 sm:p-6 select-none animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-between text-white shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-md">
                {facility.name}
              </span>
              <span className="text-xs text-stone-400">
                ({activeImageIndex + 1} / {images.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lightbox Center Image */}
          <div 
            className="flex-1 flex items-center justify-center relative my-2 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStart === null) return;
              const diff = touchStart - e.changedTouches[0].clientX;
              if (diff > 40) handleNextImage();
              else if (diff < -40) handlePrevImage();
              setTouchStart(null);
            }}
          >
            <img
              src={images[activeImageIndex] || images[0]}
              alt={facility.name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl transition-all"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-stone-900/80 hover:bg-stone-900 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-stone-900/80 hover:bg-stone-900 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Bottom Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 justify-center overflow-x-auto py-2 shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-10 sm:w-16 sm:h-11 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                    activeImageIndex === idx ? 'border-amber-400 scale-105' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
