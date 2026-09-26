import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Share2, 
  Phone, 
  MessageCircle, 
  Check, 
  Printer, 
  FileText, 
  Maximize2,
  BedDouble,
  Bath,
  Layers,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileCheck,
  ExternalLink,
  Receipt,
  FolderOpen,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Waves
} from 'lucide-react';
import { Room, AppSettings, RoomStatus, Lease, BookingReceipt, Facility } from '../types';
import { getLineUrl, openDocumentInNewTab } from '../services/apiService';
import { DirectionViewInsightWidget } from './DirectionViewInsightWidget';
import { FacilityDetailModal } from './FacilityDetailModal';

interface RoomDetailModalProps {
  room: Room;
  onClose: () => void;
  onShareRoom: (room: Room) => void;
  isAdminLoggedIn: boolean;
  onOpenHorizontalFlyer: (room: Room) => void;
  onOpenBookingReceipt: (room: Room) => void;
  onEditRoom?: (room: Room) => void;
  onChangeStatus?: (room: Room, newStatus: RoomStatus) => void;
  settings: AppSettings;
  lease?: Lease;
  bookings?: BookingReceipt[];
  onViewBookingReceipt?: (receipt: BookingReceipt) => void;
  facilities?: Facility[];
  onSelectFacility?: (facility: Facility) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  onClose,
  onShareRoom,
  isAdminLoggedIn,
  onOpenHorizontalFlyer,
  onOpenBookingReceipt,
  onEditRoom,
  onChangeStatus,
  settings,
  lease,
  bookings = [],
  onViewBookingReceipt,
  facilities = [],
  onSelectFacility
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [previewFacilityModal, setPreviewFacilityModal] = useState<Facility | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [coverTouchStart, setCoverTouchStart] = useState<number | null>(null);
  // In Admin Mode, start with photo section collapsed so data/contracts are immediately readable
  const [isPhotoExpanded, setIsPhotoExpanded] = useState<boolean>(!isAdminLoggedIn);

  const images = room.images && room.images.length > 0 ? room.images : [];

  const lineContactId = room.contactLine || settings.defaultContactLine || '@052adooe';
  const lineUrl = getLineUrl(lineContactId);
  const phoneRaw = (room.contactPhone || settings.defaultContactPhone || '02-735-6060').replace(/[^0-9]/g, '');

  const hasRent = !!room.rentPrice;
  const hasSale = !!room.salePrice;
  const hasBothPrices = hasRent && hasSale;

  const handlePrevImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNextImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Keyboard navigation for both cover photo and lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLightboxOpen) {
        if (e.key === 'ArrowLeft') handlePrevImage();
        if (e.key === 'ArrowRight') handleNextImage();
        if (e.key === 'Escape') setIsLightboxOpen(false);
      } else {
        if (e.key === 'ArrowLeft') handlePrevImage();
        if (e.key === 'ArrowRight') handleNextImage();
        if (e.key === 'Escape') onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, handlePrevImage, handleNextImage, onClose]);

  // Touch handlers for mobile swipe in lightbox
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50) {
      handleNextImage();
    } else if (diff < -50) {
      handlePrevImage();
    }
    setTouchStart(null);
  };

  // Touch handlers for mobile swipe on main cover photo
  const handleCoverTouchStart = (e: React.TouchEvent) => {
    setCoverTouchStart(e.touches[0].clientX);
  };

  const handleCoverTouchEnd = (e: React.TouchEvent) => {
    if (coverTouchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = coverTouchStart - touchEnd;
    if (diff > 40) {
      handleNextImage();
    } else if (diff < -40) {
      handlePrevImage();
    }
    setCoverTouchStart(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-start sm:items-center justify-center p-0 sm:p-4 md:p-6 no-print">
        {/* Backdrop dismiss */}
        <div className="fixed inset-0 -z-10" onClick={onClose} aria-label="ปิดหน้าต่าง" />

        <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-stone-200 w-full max-w-3xl overflow-hidden flex flex-col h-full sm:h-auto min-h-screen sm:min-h-0 max-h-screen sm:max-h-[92vh] animate-in fade-in duration-200">
          
          {/* 1. Ultra-Clean Minimalist Header */}
          <div className="px-4 py-2.5 sm:px-6 sm:py-3 bg-white border-b border-stone-200/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-stone-900 bg-stone-100 border border-stone-300 px-2.5 py-1 rounded-md tabular-nums">
                ห้อง {room.roomNumber}
              </span>
            </div>

            {/* Right Action Icons: Share + ONLY ONE Close button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onShareRoom(room)}
                className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title="แชร์ลิงก์ห้องนี้"
                aria-label="แชร์ลิงก์ห้องนี้"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title="ปิดหน้าต่าง"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. Scrollable Body */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain">
            
            {/* Main Photo Gallery */}
            <div className="space-y-2">
              {images.length === 0 ? (
                <div className="aspect-16/10 sm:aspect-16/9 max-h-56 rounded-xl bg-stone-100 border border-stone-200 flex flex-col items-center justify-center text-stone-400 p-6 select-none">
                  <ImageIcon className="w-10 h-10 mb-2 text-stone-300 stroke-[1.5]" />
                  <span className="text-sm font-semibold text-stone-600">ยังไม่มีรูปภาพห้องชุด</span>
                  <span className="text-xs text-stone-400 mt-0.5">ห้องนี้ยังไม่ได้อัปโหลดรูปภาพจริง</span>
                </div>
              ) : (
                <>
                  {/* Photo Header Bar with Toggle & Lightbox trigger */}
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setIsPhotoExpanded(!isPhotoExpanded)}
                      className="flex items-center gap-1.5 font-bold text-stone-700 hover:text-stone-900 transition-colors cursor-pointer py-1"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                      <span>รูปภาพห้องชุด ({images.length} รูป)</span>
                      {isPhotoExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-[11px] transition-colors cursor-pointer border border-stone-200"
                        title="เปิดดูภาพขยายเต็มจอ"
                      >
                        <Maximize2 className="w-3 h-3 text-stone-600" />
                        <span>ดูภาพใหญ่</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPhotoExpanded(!isPhotoExpanded)}
                        className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
                      >
                        {isPhotoExpanded ? 'ย่อรูปภาพ' : 'ขยายรูปภาพ'}
                      </button>
                    </div>
                  </div>

              {/* Collapsed / Compact Mode (Optimized for Admin reading data) */}
              {!isPhotoExpanded ? (
                <div 
                  onClick={() => setIsLightboxOpen(true)}
                  className="flex items-center gap-3 p-2 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 transition-all cursor-pointer group select-none"
                  title="คลิกเพื่อเปิดดูรูปภาพใหญ่เต็มจอ"
                >
                  <div className="relative w-24 h-16 sm:w-28 sm:h-18 rounded-lg overflow-hidden shrink-0 border border-stone-300 bg-stone-200">
                    <img
                      src={images[activeImageIndex]}
                      alt={`${room.condoName}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 truncate">
                        {room.condoName} - {images.length} รูป
                      </span>
                      <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-mono shrink-0">
                        ภาพที่ {activeImageIndex + 1}/{images.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      โหมดสรุปข้อมูล: คลิกที่นี่เพื่อเปิดดูภาพขนาดใหญ่เต็มจอ หรือกดปุ่ม &quot;ขยายรูปภาพ&quot;
                    </p>
                  </div>

                  {/* Quick Thumbnails */}
                  {images.length > 1 && (
                    <div className="hidden sm:flex items-center gap-1.5 overflow-hidden pl-2 border-l border-stone-200">
                      {images.slice(0, 3).map((img, idx) => (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex(idx);
                            setIsLightboxOpen(true);
                          }}
                          className={`w-11 h-11 rounded-md overflow-hidden border transition-all cursor-pointer ${
                            activeImageIndex === idx ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-300 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="mini" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {images.length > 3 && (
                        <span className="text-[10px] text-stone-500 font-semibold px-1">
                          +{images.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Expanded Mode (Standard Photo Banner + Thumbnails) */
                <div className="space-y-2">
                  <div 
                    onClick={() => setIsLightboxOpen(true)}
                    onTouchStart={handleCoverTouchStart}
                    onTouchEnd={handleCoverTouchEnd}
                    className="group relative aspect-16/10 sm:aspect-16/9 max-h-72 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-2xs cursor-pointer select-none"
                    title="กดเพื่อดูภาพใหญ่เต็มจอ"
                  >
                    <img
                      src={images[activeImageIndex]}
                      alt={`${room.condoName} - ภาพที่ ${activeImageIndex + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />

                    {/* Left Navigation Arrow on Cover Photo */}
                    {images.length > 1 && (
                      <button
                        type="button"
                        onClick={handlePrevImage}
                        className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-950/70 hover:bg-stone-950/95 text-white backdrop-blur-xs flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
                        title="ภาพก่อนหน้า"
                        aria-label="ภาพก่อนหน้า"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}

                    {/* Right Navigation Arrow on Cover Photo */}
                    {images.length > 1 && (
                      <button
                        type="button"
                        onClick={handleNextImage}
                        className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-950/70 hover:bg-stone-950/95 text-white backdrop-blur-xs flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
                        title="ภาพถัดไป"
                        aria-label="ภาพถัดไป"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}

                    {/* Click to expand overlay button */}
                    <div className="absolute top-2.5 right-2.5 bg-stone-900/70 hover:bg-stone-900 text-white text-xs px-2.5 py-1 rounded-md backdrop-blur-xs flex items-center gap-1.5 transition-colors shadow-xs z-10">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium hidden sm:inline">ดูภาพใหญ่</span>
                    </div>

                    {/* Photo Counter */}
                    {images.length > 1 && (
                      <div className="absolute bottom-2.5 right-2.5 bg-stone-900/75 text-white text-[11px] font-mono px-2 py-0.5 rounded-md backdrop-blur-xs z-10">
                        {activeImageIndex + 1} / {images.length}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Strip */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            activeImageIndex === idx ? 'border-stone-900 opacity-100 shadow-xs' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="thumb" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </div>

            {/* 3. Symmetrical Pricing Section (Pure 'เช่า' and 'ขาย' without duplicate badges) */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold block">
                ข้อมูลราคาและเงื่อนไข
              </span>

              {hasBothPrices ? (
                /* Symmetrical 2-Column Grid for Both Rent and Sale */
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                  {/* Rent Card */}
                  <div className="p-3 sm:p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-stone-700 block mb-1">เช่า</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 tabular-nums">
                          ฿{room.rentPrice?.toLocaleString()}
                        </span>
                        <span className="text-xs text-stone-500 font-normal">บาท</span>
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-stone-500 mt-2.5 pt-2 border-t border-stone-200/70">
                      สัญญาขั้นต่ำ 1 ปี • ประกัน 2 เดือน
                    </p>
                  </div>

                  {/* Sale Card */}
                  <div className="p-3 sm:p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-stone-700 block mb-1">ขาย</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 tabular-nums">
                          ฿{room.salePrice?.toLocaleString()}
                        </span>
                        <span className="text-xs text-stone-500 font-normal">บาท</span>
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-stone-500 mt-2.5 pt-2 border-t border-stone-200/70">
                      กรรมสิทธิ์ Freehold • ค่าโอนตามตกลง
                    </p>
                  </div>
                </div>
              ) : hasRent ? (
                /* Single Rent Card */
                <div className="p-3.5 sm:p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-stone-700 block">เช่า</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 tabular-nums">
                        ฿{room.rentPrice?.toLocaleString()}
                      </span>
                      <span className="text-xs sm:text-sm text-stone-500">บาท</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-500 font-normal">
                      สัญญาขั้นต่ำ 1 ปี
                    </span>
                  </div>
                </div>
              ) : hasSale ? (
                /* Single Sale Card */
                <div className="p-3.5 sm:p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-stone-700 block">ขาย</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 tabular-nums">
                        ฿{room.salePrice?.toLocaleString()}
                      </span>
                      <span className="text-xs sm:text-sm text-stone-500">บาท</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-500 font-normal">
                      กรรมสิทธิ์ Freehold
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 4. Room Specs (Compact 4-column cards) */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 sm:p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
                <div className="flex justify-center mb-1">
                  <Maximize2 className="w-4 h-4 text-stone-500" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-stone-400 block">พื้นที่</span>
                <span className="text-xs sm:text-sm font-semibold text-stone-900">{room.areaSqM} ตร.ม.</span>
              </div>

              <div className="p-2.5 sm:p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
                <div className="flex justify-center mb-1">
                  <BedDouble className="w-4 h-4 text-stone-500" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-stone-400 block">ห้องนอน</span>
                <span className="text-xs sm:text-sm font-semibold text-stone-900 truncate block">
                  {room.bedrooms === 0 ? 'สตูดิโอ' : `${room.bedrooms} นอน`}
                </span>
              </div>

              <div className="p-2.5 sm:p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
                <div className="flex justify-center mb-1">
                  <Bath className="w-4 h-4 text-stone-500" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-stone-400 block">ห้องน้ำ</span>
                <span className="text-xs sm:text-sm font-semibold text-stone-900">{room.bathrooms} น้ำ</span>
              </div>

              <div className="p-2.5 sm:p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
                <div className="flex justify-center mb-1">
                  <Layers className="w-4 h-4 text-stone-500" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-stone-400 block">ชั้น</span>
                <span className="text-xs sm:text-sm font-semibold text-stone-900">ชั้น {room.floor}</span>
              </div>
            </div>

            {/* 4.5. DIRECTION & VIEW INSIGHT SECTION (Bespoke Orientation & View Analytics) */}
            <DirectionViewInsightWidget room={room} />

            {/* 5. Description */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                รายละเอียดห้องพัก
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50/70 p-3.5 sm:p-4 rounded-xl border border-stone-200/70">
                {room.description || 'ห้องชุดสวย สภาพดี พร้อมเข้าอยู่ ดูแลประสานงานโดยนิติบุคคลอาคารชุด'}
              </p>
            </div>

            {/* 6. Highlights */}
            {room.highlights && room.highlights.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  จุดเด่นของห้อง
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {room.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 bg-stone-50 rounded-lg border border-stone-200/60 text-xs text-stone-800">
                      <Check className="w-3.5 h-3.5 text-stone-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Amenities */}
            {room.amenities && room.amenities.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  สิ่งอำนวยความสะดวก & เฟอร์นิเจอร์
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {room.amenities.map((item, idx) => (
                    <span key={idx} className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-md border border-stone-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 7.5. Project Shared Facilities Quick Cards */}
            {facilities && facilities.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-200/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-stone-600" />
                    <span>สิ่งอำนวยความสะดวกส่วนกลางของโครงการ (คลิกเพื่อดูรูป)</span>
                  </h3>
                  <span className="text-[11px] text-stone-400">ใช้บริการได้ฟรี</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {facilities.slice(0, 6).map((fac) => (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => {
                        if (onSelectFacility) {
                          onSelectFacility(fac);
                        } else {
                          setPreviewFacilityModal(fac);
                        }
                      }}
                      className="p-2 sm:p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100/90 border border-stone-200/80 hover:border-stone-300 transition-all text-left flex items-center gap-2.5 cursor-pointer group shadow-2xs"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-stone-200 shrink-0 relative">
                        {fac.images && fac.images.length > 0 ? (
                          <img 
                            src={fac.images[0]} 
                            alt="" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] text-stone-400">
                            รูปภาพ
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-stone-800 truncate group-hover:text-amber-800 transition-colors">
                          {fac.name}
                        </div>
                        <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                          <span>{fac.floor}</span>
                          <span>•</span>
                          <span>{fac.hours || '06:00-22:00'}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 8. Documents & Contracts Vault (Exclusive for Admin/Staff: สัญญาเจ้าของ, สัญญาเช่า, ใบจอง) */}
            {isAdminLoggedIn && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/90 p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                      เอกสาร & สัญญาประจำห้องชุด
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-stone-500">
                    ข้อมูลเฉพาะเจ้าหน้าที่
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Doc 1: สัญญาเจ้าของ (สัญญาฝากห้อง) */}
                  <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-amber-600" />
                          <span>1. สัญญาเจ้าของ</span>
                        </span>
                        {room.ownerContractDocUrl && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            มีไฟล์แนบ
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-stone-800 font-medium">
                        <div>เจ้าของ: <strong className="text-stone-900 font-bold">{room.ownerName || 'ไม่ระบุชื่อ'}</strong></div>
                        {room.ownerPhone && (
                          <div className="text-stone-500 font-mono text-[11px]">โทร: {room.ownerPhone}</div>
                        )}
                        {room.ownerContractDocName && (
                          <div className="text-[11px] text-stone-400 truncate mt-0.5" title={room.ownerContractDocName}>
                            ไฟล์: {room.ownerContractDocName}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {room.ownerContractDocUrl ? (
                        <button
                          type="button"
                          onClick={() => openDocumentInNewTab(room.ownerContractDocUrl)}
                          className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>เปิดดูสัญญาเจ้าของ</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </button>
                      ) : (
                        <div className="text-[11px] text-stone-400 bg-stone-50 p-2 rounded-lg border border-stone-200/80 text-center">
                          ยังไม่มีไฟล์สัญญาเจ้าของ
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doc 2: สัญญาเช่า (สัญญาผู้เช่า) */}
                  <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                          <FileCheck className="w-3 h-3 text-blue-600" />
                          <span>2. สัญญาเช่า</span>
                        </span>
                        {lease?.contractUrl && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            มีไฟล์แนบ
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-stone-800 font-medium">
                        {lease ? (
                          <>
                            <div>ผู้เช่า: <strong className="text-stone-900 font-bold">{lease.tenantName}</strong></div>
                            {lease.tenantPhone && (
                              <div className="text-stone-500 font-mono text-[11px]">โทร: {lease.tenantPhone}</div>
                            )}
                            <div className="text-[11px] text-stone-500 mt-0.5">
                              สัญญา: {lease.startDate} ถึง {lease.endDate}
                            </div>
                          </>
                        ) : (
                          <div className="text-stone-400 py-1">
                            {room.status === 'rented' ? 'ห้องติดสัญญา (รอระบุสัญญา)' : 'ห้องว่าง / ยังไม่มีสัญญาเช่า'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {lease?.contractUrl ? (
                        <button
                          type="button"
                          onClick={() => openDocumentInNewTab(lease.contractUrl)}
                          className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>เปิดดูสัญญาเช่า</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </button>
                      ) : (
                        <div className="text-[11px] text-stone-400 bg-stone-50 p-2 rounded-lg border border-stone-200/80 text-center">
                          {lease ? 'ยังไม่ได้แนบไฟล์สัญญาเช่า' : 'ไม่มีสัญญาเช่า'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doc 3: ใบจองห้องชุด */}
                  <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <Receipt className="w-3 h-3 text-emerald-600" />
                          <span>3. ใบจองห้องชุด</span>
                        </span>
                        {bookings && bookings.length > 0 && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                            {bookings.length} ฉบับ
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-stone-800 font-medium">
                        {bookings && bookings.length > 0 ? (
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {bookings.map(b => (
                              <div key={b.id} className="text-[11px] pb-1 border-b border-stone-100 last:border-0">
                                <div className="font-bold text-stone-900 truncate">
                                  {b.receiptNumber}: {b.customerName}
                                </div>
                                <div className="text-stone-500 font-mono">
                                  เงินจอง ฿{b.bookingAmount?.toLocaleString()} ({b.bookingDate})
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-stone-400 py-1">
                            ยังไม่มีประวัติการออกใบจอง
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {bookings && bookings.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewBookingReceipt && bookings[0]) {
                              onViewBookingReceipt(bookings[0]);
                            } else {
                              onOpenBookingReceipt(room);
                            }
                          }}
                          className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-amber-300" />
                          <span>เปิดดูใบจอง ({bookings[0].receiptNumber})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenBookingReceipt(room)}
                          className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-stone-500" />
                          <span>+ ออกใบจองใหม่</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Staff Internal Note if exists */}
                {room.staffNotes && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-stone-800 flex items-start gap-2">
                    <span className="font-bold text-amber-900 shrink-0">บันทึกภายใน:</span>
                    <span className="text-stone-700 whitespace-pre-line">{room.staffNotes}</span>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* 9. Clean Mobile-First Sticky Action Bar */}
          <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-stone-50 border-t border-stone-200 shrink-0">
            {isAdminLoggedIn ? (
              /* Admin Mode: No self-contact buttons; provide direct admin management actions */
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs font-semibold text-stone-700">
                    โหมดผู้ดูแลระบบ • ห้อง {room.roomNumber} (ชั้น {room.floor})
                  </span>
                </div>

                {/* Admin Quick Action Controls */}
                <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                  {onEditRoom && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEditRoom(room);
                      }}
                      className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5 shadow-2xs min-h-[40px] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                      <span>แก้ไขห้อง</span>
                    </button>
                  )}

                  {room.status !== 'rented' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenBookingReceipt(room);
                      }}
                      className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center justify-center gap-1.5 shadow-2xs min-h-[40px] cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>ออกใบจอง</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenHorizontalFlyer(room);
                    }}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-medium bg-white text-stone-700 border border-stone-300 hover:bg-stone-100 transition-colors flex items-center justify-center gap-1.5 shadow-2xs min-h-[40px] cursor-pointer"
                    title="พิมพ์โบรชัวร์แนวนอน"
                  >
                    <Printer className="w-3.5 h-3.5 text-stone-600" />
                    <span className="hidden sm:inline">พิมพ์โบรชัวร์</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2 px-4 rounded-xl text-xs font-semibold bg-stone-200 hover:bg-stone-300 text-stone-800 transition-colors flex items-center justify-center min-h-[40px] cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            ) : (
              /* Customer Mode: Show Juristic Office contact buttons */
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-[11px] text-stone-500 hidden sm:block truncate">
                  ติดต่อสำนักงานนิติบุคคล Bangkok Horizon ราม 60
                </div>

                {/* Direct Contact Buttons */}
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <a
                    id="modal-call-btn"
                    href={`tel:${phoneRaw}`}
                    className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-white text-stone-800 border border-stone-300 active:bg-stone-100 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2 shadow-2xs min-h-[44px]"
                  >
                    <Phone className="w-4 h-4 text-stone-700" />
                    <span>โทรติดต่อ</span>
                  </a>

                  <a
                    id="modal-line-btn"
                    href={lineUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-700 active:bg-emerald-800 hover:bg-emerald-800 text-white transition-colors flex items-center justify-center gap-2 shadow-2xs min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4 text-white" />
                    <span>แอด LINE</span>
                  </a>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ===================================================================== */}
      {/* FULL-SCREEN IMAGE VIEWER / LIGHTBOX                                   */}
      {/* ===================================================================== */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-60 bg-stone-950/95 flex flex-col justify-between p-3 sm:p-5 select-none animate-in fade-in duration-200"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Lightbox Top Bar */}
          <div className="flex items-center justify-between text-white shrink-0 py-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs sm:text-sm bg-stone-800/80 px-2.5 py-1 rounded-md border border-stone-700">
                {activeImageIndex + 1} / {images.length}
              </span>
              <span className="text-xs sm:text-sm text-stone-300 font-medium hidden sm:inline">
                ห้อง {room.roomNumber} - {room.condoName}
              </span>
            </div>

            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 text-stone-300 hover:text-white hover:bg-stone-800/80 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="ปิดภาพเต็มจอ (Esc)"
              aria-label="ปิดภาพเต็มจอ"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Center Image Stage with Prev / Next */}
          <div className="relative flex-1 flex items-center justify-center min-h-0 my-2 overflow-hidden">
            {images.length > 1 && (
              <button
                onClick={handlePrevImage}
                className="absolute left-1 sm:left-4 z-10 p-2 sm:p-3 text-white bg-stone-900/60 hover:bg-stone-800 rounded-full backdrop-blur-xs transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shadow-lg"
                title="ภาพก่อนหน้า"
                aria-label="ภาพก่อนหน้า"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={images[activeImageIndex]}
              alt={`${room.condoName} - ภาพเต็มจอที่ ${activeImageIndex + 1}`}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-opacity duration-200"
            />

            {images.length > 1 && (
              <button
                onClick={handleNextImage}
                className="absolute right-1 sm:right-4 z-10 p-2 sm:p-3 text-white bg-stone-900/60 hover:bg-stone-800 rounded-full backdrop-blur-xs transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shadow-lg"
                title="ภาพถัดไป"
                aria-label="ภาพถัดไป"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Bottom Thumbnail Bar */}
          {images.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto py-2 shrink-0 scrollbar-thin">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-14 h-10 sm:w-16 sm:h-12 rounded-md overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    activeImageIndex === idx ? 'border-amber-400 opacity-100 scale-105' : 'border-stone-700 opacity-50 hover:opacity-90'
                  }`}
                >
                  <img src={img} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Facility Detail Modal inside Room Detail (Fallback if no parent handler) */}
      {!onSelectFacility && previewFacilityModal && (
        <FacilityDetailModal
          facility={previewFacilityModal}
          onClose={() => setPreviewFacilityModal(null)}
          contactLine={lineContactId}
          contactPhone={settings.defaultContactPhone}
        />
      )}
    </>
  );
};
