import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Share2, 
  Phone, 
  MessageCircle, 
  ArrowRight,
  Maximize2,
  X,
  Building,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Waves,
  Dumbbell,
  TreePine,
  Car,
  KeyRound,
  FileCheck,
  Wrench,
  Package,
  CalendarCheck,
  Lock,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
  Sun,
  LayoutDashboard
} from 'lucide-react';
import { Room, ListingType, Facility, JuristicServiceItem } from '../types';
import { INITIAL_JURISTIC_SERVICES, DEFAULT_HERO_IMAGES } from '../mockData';
import { resolveDirection, resolveViewType } from '../utils/directionInsight';
import { FacilityDetailModal } from './FacilityDetailModal';

interface CustomerViewProps {
  rooms: Room[];
  facilities?: Facility[];
  juristicServices?: JuristicServiceItem[];
  heroBackgroundImages?: string[];
  onSelectRoom: (room: Room) => void;
  onShareRoom: (room: Room) => void;
  onSelectFacility?: (facility: Facility) => void;
  onOpenStaffLogin?: () => void;
  isAdminLoggedIn?: boolean;
  onBackToAdmin?: () => void;
  contactLine?: string;
  contactPhone?: string;
  agencyName?: string;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  rooms,
  facilities = [],
  juristicServices = INITIAL_JURISTIC_SERVICES,
  heroBackgroundImages,
  onSelectRoom,
  onShareRoom,
  onSelectFacility,
  onOpenStaffLogin,
  isAdminLoggedIn,
  onBackToAdmin,
  contactLine = '@052adooe',
  contactPhone = '02-735-6060',
  agencyName = 'Bangkok Horizon Ram 60'
}) => {
  // Navigation tabs within single condo portal
  const [activeTab, setActiveTab] = useState<'units' | 'facilities' | 'services' | 'contact'>('units');

  // Local Facility Detail Modal state
  const [localSelectedFacility, setLocalSelectedFacility] = useState<Facility | null>(null);

  // Background Slideshow State
  const activeSlides = useMemo(() => {
    if (heroBackgroundImages && Array.isArray(heroBackgroundImages) && heroBackgroundImages.length > 0) {
      return heroBackgroundImages;
    }
    return DEFAULT_HERO_IMAGES;
  }, [heroBackgroundImages]);

  const [currentSlide, setCurrentSlide] = useState(0);

  // Automatically advance slides continuously every 5 seconds without manual controls
  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSlides.length]);

  // Keep currentSlide in valid range if slides change
  useEffect(() => {
    if (currentSlide >= activeSlides.length) {
      setCurrentSlide(0);
    }
  }, [activeSlides.length, currentSlide]);

  // Unit filter states
  const [searchQuery, setSearchQuery] = useState('');
  // User explicitly requested 3 room sizes:
  // 1. ขนาดที่ 1 30 ตร.ม.
  // 2. ขนาดที่ 2 40 ตร.ม.
  // 3. ขนาดที่ 3 60 และ 90 ตร.ม.
  const [selectedSize, setSelectedSize] = useState<'all' | 'size_30' | 'size_40' | 'size_60_90'>('all');
  const [selectedListingType, setSelectedListingType] = useState<ListingType | 'all'>('all');
  const [selectedDirectionViewFilter, setSelectedDirectionViewFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'area_asc' | 'area_desc' | 'newest'>('newest');
  
  // Track active photo index per room card for sliding photos without opening details
  const [cardImageIndices, setCardImageIndices] = useState<Record<string, number>>({});

  // CRITICAL REQUIREMENT: Customers must ONLY see rooms that are currently AVAILABLE and PUBLISHED!
  // Rooms that are rented (ติดสัญญา), reserved (จองแล้ว), sold (ขายแล้ว), or unpublished draft MUST NOT show.
  const publicRooms = useMemo(() => {
    return rooms.filter(room => room.status === 'available' && room.isPublished !== false);
  }, [rooms]);

  // Size helper to match user's condo sizes
  const matchesSizeCategory = (room: Room, cat: 'size_30' | 'size_40' | 'size_60_90'): boolean => {
    if (cat === 'size_30') {
      return room.sizeCategory === 'size_30' || room.sizeCategory === 'small' || (room.areaSqM >= 25 && room.areaSqM <= 35);
    }
    if (cat === 'size_40') {
      return room.sizeCategory === 'size_40' || room.sizeCategory === 'medium' || (room.areaSqM > 35 && room.areaSqM <= 50);
    }
    if (cat === 'size_60_90') {
      return room.sizeCategory === 'size_60_90' || room.sizeCategory === 'large' || room.areaSqM > 50;
    }
    return true;
  };

  // Filter public rooms
  const filteredRooms = useMemo(() => {
    return publicRooms.filter(room => {
      // 1. Text Search (Room number, building, floor, description, highlights)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchRoom = room.roomNumber.toLowerCase().includes(query);
        const matchBuilding = (room.building || '').toLowerCase().includes(query);
        const matchFloor = String(room.floor).includes(query);
        const matchDesc = room.description.toLowerCase().includes(query);
        const matchHighlights = room.highlights.some(h => h.toLowerCase().includes(query));
        if (!matchRoom && !matchBuilding && !matchFloor && !matchDesc && !matchHighlights) {
          return false;
        }
      }

      // 2. Size category filter
      if (selectedSize !== 'all') {
        if (!matchesSizeCategory(room, selectedSize)) {
          return false;
        }
      }

      // 3. Listing Type (rent / sale / both)
      if (selectedListingType !== 'all') {
        if (room.listingType !== 'both' && room.listingType !== selectedListingType) {
          return false;
        }
      }

      // 4. Direction & View insight filter
      if (selectedDirectionViewFilter !== 'all') {
        const dir = resolveDirection(room.facingDirection);
        const view = resolveViewType(room.viewType, room.description, room.floor);
        const fl = typeof room.floor === 'number' ? room.floor : parseInt(String(room.floor), 10) || 0;

        if (selectedDirectionViewFilter === 'east' && !dir.key.includes('east')) return false;
        if (selectedDirectionViewFilter === 'north' && !dir.key.includes('north')) return false;
        if (selectedDirectionViewFilter === 'south' && !dir.key.includes('south')) return false;
        if (selectedDirectionViewFilter === 'west' && !dir.key.includes('west')) return false;
        if (selectedDirectionViewFilter === 'pool' && view.key !== 'pool') return false;
        if (selectedDirectionViewFilter === 'high_floor' && fl < 20) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') {
        const priceA = a.rentPrice || a.salePrice || 0;
        const priceB = b.rentPrice || b.salePrice || 0;
        return priceA - priceB;
      }
      if (sortBy === 'price_desc') {
        const priceA = a.rentPrice || a.salePrice || 0;
        const priceB = b.rentPrice || b.salePrice || 0;
        return priceB - priceA;
      }
      if (sortBy === 'area_asc') {
        return a.areaSqM - b.areaSqM;
      }
      if (sortBy === 'area_desc') {
        return b.areaSqM - a.areaSqM;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [publicRooms, searchQuery, selectedSize, selectedListingType, selectedDirectionViewFilter, sortBy]);

  // Size category counters (strictly based on available public rooms)
  const sizeCounts = useMemo(() => {
    return {
      all: publicRooms.length,
      size_30: publicRooms.filter(r => matchesSizeCategory(r, 'size_30')).length,
      size_40: publicRooms.filter(r => matchesSizeCategory(r, 'size_40')).length,
      size_60_90: publicRooms.filter(r => matchesSizeCategory(r, 'size_60_90')).length,
    };
  }, [publicRooms]);

  // Juristic services grouped by category
  const officeServices = useMemo(() => {
    return juristicServices.filter(s => s.category === 'service');
  }, [juristicServices]);

  const rentalRules = useMemo(() => {
    return juristicServices.filter(s => s.category === 'rule');
  }, [juristicServices]);

  const renderServiceIcon = (iconName?: string) => {
    switch (iconName) {
      case 'key':
        return <KeyRound className="w-4 h-4 text-stone-200" />;
      case 'file':
        return <FileCheck className="w-4 h-4 text-stone-200" />;
      case 'package':
        return <Package className="w-4 h-4 text-stone-200" />;
      case 'wrench':
        return <Wrench className="w-4 h-4 text-stone-200" />;
      case 'shield':
        return <ShieldCheck className="w-4 h-4 text-stone-200" />;
      case 'clock':
        return <Clock className="w-4 h-4 text-stone-200" />;
      case 'home':
        return <Building className="w-4 h-4 text-stone-200" />;
      default:
        return <Info className="w-4 h-4 text-stone-200" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 pb-16 font-sans">
      
      {/* ===================================================================== */}
      {/* ADMIN PREVIEW TOP BAR: Shown when admin opens customer view           */}
      {/* ===================================================================== */}
      {isAdminLoggedIn && onBackToAdmin && (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between border-b border-stone-200 shadow-2xs">
          {/* Left: Brand Logo + Preview Indicator */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div 
              onClick={onBackToAdmin}
              className="flex items-center gap-2 cursor-pointer select-none group"
              title="คลิกเพื่อกลับสู่แดชบอร์ดแอดมิน"
            >
              <span className="font-black text-2xl sm:text-3xl tracking-widest text-stone-900 font-sans group-hover:text-stone-700 transition-colors">
                HORIZON
              </span>
              <span className="text-stone-700 font-bold text-xs sm:text-sm ml-0.5 select-none bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                โหมดดูหน้าร้านค้า
              </span>
            </div>
          </div>

          {/* Right: Return to Admin Portal Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              id="top-return-to-admin-btn"
              onClick={onBackToAdmin}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer group"
              title="คลิกเพื่อกลับสู่ระบบแอดมินทันทีโดยไม่ต้องเลื่อนหน้าจอลงด้านล่าง"
            >
              <LayoutDashboard className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>กลับสู่ระบบแอดมิน</span>
            </button>
          </div>
        </header>
      )}

      {/* ===================================================================== */}
      {/* 1. ARCHITECTURAL HERO BANNER WITH DYNAMIC BACKGROUND SLIDESHOW        */}
      {/* ===================================================================== */}
      <section className="relative overflow-hidden border-b border-stone-800 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white shadow-xl">
        {/* Dynamic Slideshow Background Layer (or Deep Gradient Refraction if no custom images) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {activeSlides.length > 0 ? (
            activeSlides.map((slideImg, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  index === currentSlide
                    ? 'opacity-100 scale-105'
                    : 'opacity-0 scale-100 pointer-events-none'
                }`}
              >
                <img
                  src={slideImg}
                  alt={`Bangkok Horizon Ram 60 Slide ${index + 1}`}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            ))
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(255,255,255,0))] opacity-70" />
          )}

          {/* Light, Elegant Protective Gradient to keep images vivid while text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/40" />
        </div>

        {/* Foreground Content Container (All Text in Crisp White) */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-9">
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            {/* Project Identity & Distinction */}
            <div className="max-w-3xl space-y-2 sm:space-y-3">
              <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                Bangkok Horizon Ram 60
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-white/95 leading-relaxed font-normal drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] max-w-2xl">
                <span className="hidden sm:inline">
                  คอนโดมิเนียม High-Rise 37 ชั้น ทำเลศักยภาพแยกลำสาลี ซอยรามคำแหง 60
                  เชื่อมต่อสถานีรถไฟฟ้า MRT แยกลำสาลี (Interchange สายสีส้ม & สายสีเหลือง) เพียง 400 เมตร
                  บริการข้อมูลห้องชุดว่าง สัญญาเช่ามาตรฐาน และพาเข้าชมห้องจริงโดยตรงจากสำนักงานนิติบุคคล
                </span>
                <span className="sm:hidden">
                  คอนโด High-Rise 37 ชั้น ติด MRT แยกลำสาลี 400 ม. ดูแลและบริการโดยตรงจากสำนักงานนิติบุคคล
                </span>
              </p>

              {/* Direct Juristic Office Metrics (Bright Frosted Glass Cards) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1 sm:pt-2">
                <div className="p-2.5 sm:p-3 bg-white/20 hover:bg-white/30 hover:-translate-y-1 hover:shadow-lg backdrop-blur-md rounded-xl border border-white/40 text-center sm:text-left transition-all duration-200 shadow-md">
                  <span className="block text-[10px] sm:text-[11px] font-medium text-white/90 truncate drop-shadow-sm">ความสูงอาคาร</span>
                  <span className="font-mono font-bold text-xs sm:text-base text-white drop-shadow-sm">37 ชั้น</span>
                </div>
                <div className="p-2.5 sm:p-3 bg-white/20 hover:bg-white/30 hover:-translate-y-1 hover:shadow-lg backdrop-blur-md rounded-xl border border-white/40 text-center sm:text-left transition-all duration-200 shadow-md">
                  <span className="block text-[10px] sm:text-[11px] font-medium text-white/90 truncate drop-shadow-sm">MRT ลำสาลี</span>
                  <span className="font-mono font-bold text-xs sm:text-base text-white drop-shadow-sm">400 ม.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('facilities')}
                  className="p-2.5 sm:p-3 bg-white/20 hover:bg-white/35 hover:-translate-y-1 hover:shadow-lg backdrop-blur-md rounded-xl border border-white/40 text-center sm:text-left transition-all duration-200 shadow-md cursor-pointer group text-left"
                  title="คลิกดูพื้นที่ส่วนกลางทั้งหมด"
                >
                  <span className="block text-[10px] sm:text-[11px] font-medium text-white/90 truncate drop-shadow-sm">พื้นที่ส่วนกลาง</span>
                  <span className="font-semibold text-[11px] sm:text-sm text-white truncate block drop-shadow-sm group-hover:text-amber-300 transition-colors">
                    <span className="sm:hidden">ชั้น 8 & Sky →</span>
                    <span className="hidden sm:inline">ชั้น 8 & Sky Garden →</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Light Translucent Glass) */}
          <div className="mt-5 sm:mt-8 border-b border-white/30">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center gap-1 sm:gap-2">
              <button
                id="tab-units-btn"
                onClick={() => setActiveTab('units')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-1 sm:px-4 text-center sm:text-left transition-all duration-200 border-b-2 min-h-[44px] cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
                  activeTab === 'units'
                    ? 'border-white text-white font-bold bg-white/30 backdrop-blur-md rounded-t-xl shadow-md'
                    : 'border-transparent text-white/80 hover:text-white hover:bg-white/20 rounded-t-xl'
                }`}
              >
                <Building className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'units' ? 'text-white' : 'text-white/80'}`} />
                <span className="text-[11px] sm:text-sm font-semibold tracking-tight sm:tracking-normal leading-tight text-white drop-shadow-sm">
                  <span className="sm:hidden">ห้องว่าง</span>
                  <span className="hidden sm:inline">ห้องชุดว่างพร้อมอยู่</span>
                </span>
              </button>

              <button
                id="tab-facilities-btn"
                onClick={() => setActiveTab('facilities')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-1 sm:px-4 text-center sm:text-left transition-all duration-200 border-b-2 min-h-[44px] cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
                  activeTab === 'facilities'
                    ? 'border-white text-white font-bold bg-white/30 backdrop-blur-md rounded-t-xl shadow-md'
                    : 'border-transparent text-white/80 hover:text-white hover:bg-white/20 rounded-t-xl'
                }`}
              >
                <Waves className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'facilities' ? 'text-white' : 'text-white/80'}`} />
                <span className="text-[11px] sm:text-sm font-semibold tracking-tight sm:tracking-normal leading-tight text-white drop-shadow-sm">
                  <span className="sm:hidden">ส่วนกลาง</span>
                  <span className="hidden sm:inline">ข้อมูลอาคาร & ส่วนกลาง</span>
                </span>
              </button>

              <button
                id="tab-services-btn"
                onClick={() => setActiveTab('services')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-1 sm:px-4 text-center sm:text-left transition-all duration-200 border-b-2 min-h-[44px] cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
                  activeTab === 'services'
                    ? 'border-white text-white font-bold bg-white/30 backdrop-blur-md rounded-t-xl shadow-md'
                    : 'border-transparent text-white/80 hover:text-white hover:bg-white/20 rounded-t-xl'
                }`}
              >
                <FileCheck className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'services' ? 'text-white' : 'text-white/80'}`} />
                <span className="text-[11px] sm:text-sm font-semibold tracking-tight sm:tracking-normal leading-tight text-white drop-shadow-sm">
                  <span className="sm:hidden">บริการนิติ</span>
                  <span className="hidden sm:inline">บริการนิติบุคคล & ระเบียบการเช่า</span>
                </span>
              </button>

              <button
                id="tab-contact-btn"
                onClick={() => setActiveTab('contact')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-1 sm:px-4 text-center sm:text-left transition-all duration-200 border-b-2 min-h-[44px] cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
                  activeTab === 'contact'
                    ? 'border-white text-white font-bold bg-white/30 backdrop-blur-md rounded-t-xl shadow-md'
                    : 'border-transparent text-white/80 hover:text-white hover:bg-white/20 rounded-t-xl'
                }`}
              >
                <MapPin className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'contact' ? 'text-white' : 'text-white/80'}`} />
                <span className="text-[11px] sm:text-sm font-semibold tracking-tight sm:tracking-normal leading-tight text-white drop-shadow-sm">
                  <span className="sm:hidden">ที่ตั้งสำนักงาน</span>
                  <span className="hidden sm:inline">ที่ตั้งสำนักงาน & นัดหมายชมห้อง</span>
                </span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. TAB CONTENT: AVAILABLE ROOM UNITS                                  */}
      {/* ===================================================================== */}
      {activeTab === 'units' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 sm:mt-7">
          
          {/* Unit Filter Dashboard (Harmonized Frosted Glass & Architectural Style) */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-stone-200/80 shadow-xs space-y-4">
            
            {/* Size Classification Filters (Space-efficient 4-column compact grid) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-stone-400 rounded-full"></span>
                  <span className="text-xs font-semibold text-stone-700 tracking-wide">
                    เลือกขนาดห้องชุด (Unit Size)
                  </span>
                </div>
                {selectedSize !== 'all' && (
                  <button 
                    onClick={() => setSelectedSize('all')}
                    className="text-xs text-stone-500 hover:text-stone-900 font-medium underline transition-colors cursor-pointer"
                  >
                    แสดงทุกขนาด
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                
                {/* 1. All Sizes */}
                <button
                  id="filter-size-all"
                  onClick={() => setSelectedSize('all')}
                  className={`p-2.5 sm:p-3.5 rounded-xl border text-center sm:text-left transition-all duration-200 cursor-pointer relative overflow-hidden backdrop-blur-md hover:-translate-y-0.5 hover:shadow-sm ${
                    selectedSize === 'all'
                      ? 'bg-white text-stone-950 border-stone-400/80 shadow-sm ring-2 ring-stone-400/20 font-bold'
                      : 'bg-white/40 hover:bg-white/90 text-stone-600 hover:text-stone-900 border-stone-200/80 hover:border-stone-300'
                  }`}
                >
                  <span className="text-xs sm:text-sm block">all</span>
                  <p className={`text-[10px] hidden sm:block mt-0.5 ${selectedSize === 'all' ? 'text-stone-600 font-normal' : 'text-stone-400'}`}>
                    ทุกแบบห้องชุด ({sizeCounts.all})
                  </p>
                </button>

                {/* 2. Size 1: 30 sq.m. */}
                <button
                  id="filter-size-30"
                  onClick={() => setSelectedSize('size_30')}
                  className={`p-2.5 sm:p-3.5 rounded-xl border text-center sm:text-left transition-all duration-200 cursor-pointer relative overflow-hidden backdrop-blur-md hover:-translate-y-0.5 hover:shadow-sm ${
                    selectedSize === 'size_30'
                      ? 'bg-white text-stone-950 border-stone-400/80 shadow-sm ring-2 ring-stone-400/20 font-bold'
                      : 'bg-white/40 hover:bg-white/90 text-stone-600 hover:text-stone-900 border-stone-200/80 hover:border-stone-300'
                  }`}
                >
                  <span className="text-xs sm:text-sm block">studio</span>
                  <p className={`text-[10px] hidden sm:block mt-0.5 ${selectedSize === 'size_30' ? 'text-stone-600 font-normal' : 'text-stone-400'}`}>
                    30 ตร.ม. ({sizeCounts.size_30})
                  </p>
                </button>

                {/* 3. Size 2: 40 sq.m. */}
                <button
                  id="filter-size-40"
                  onClick={() => setSelectedSize('size_40')}
                  className={`p-2.5 sm:p-3.5 rounded-xl border text-center sm:text-left transition-all duration-200 cursor-pointer relative overflow-hidden backdrop-blur-md hover:-translate-y-0.5 hover:shadow-sm ${
                    selectedSize === 'size_40'
                      ? 'bg-white text-stone-950 border-stone-400/80 shadow-sm ring-2 ring-stone-400/20 font-bold'
                      : 'bg-white/40 hover:bg-white/90 text-stone-600 hover:text-stone-900 border-stone-200/80 hover:border-stone-300'
                  }`}
                >
                  <span className="text-xs sm:text-sm block">1bd</span>
                  <p className={`text-[10px] hidden sm:block mt-0.5 ${selectedSize === 'size_40' ? 'text-stone-600 font-normal' : 'text-stone-400'}`}>
                    40 ตร.ม. ({sizeCounts.size_40})
                  </p>
                </button>

                {/* 4. Size 3: 60 & 90 sq.m. */}
                <button
                  id="filter-size-60-90"
                  onClick={() => setSelectedSize('size_60_90')}
                  className={`p-2.5 sm:p-3.5 rounded-xl border text-center sm:text-left transition-all duration-200 cursor-pointer relative overflow-hidden backdrop-blur-md hover:-translate-y-0.5 hover:shadow-sm ${
                    selectedSize === 'size_60_90'
                      ? 'bg-white text-stone-950 border-stone-400/80 shadow-sm ring-2 ring-stone-400/20 font-bold'
                      : 'bg-white/40 hover:bg-white/90 text-stone-600 hover:text-stone-900 border-stone-200/80 hover:border-stone-300'
                  }`}
                >
                  <span className="text-xs sm:text-sm block truncate">2bd</span>
                  <p className={`text-[10px] hidden sm:block mt-0.5 ${selectedSize === 'size_60_90' ? 'text-stone-600 font-normal' : 'text-stone-400'}`}>
                    60-90 ตร.ม. ({sizeCounts.size_60_90})
                  </p>
                </button>

              </div>
            </div>

            {/* Bottom Row: Listing Type & Sorting */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-stone-100">
              <div className="flex items-center gap-1 bg-stone-100/80 p-1 rounded-lg border border-stone-200/60">
                <button
                  id="filter-type-all"
                  onClick={() => setSelectedListingType('all')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    selectedListingType === 'all'
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  id="filter-type-rent"
                  onClick={() => setSelectedListingType('rent')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    selectedListingType === 'rent'
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  ให้เช่า
                </button>
                <button
                  id="filter-type-sale"
                  onClick={() => setSelectedListingType('sale')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    selectedListingType === 'sale'
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  ขาย
                </button>
              </div>
            </div>

          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between my-5">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-stone-800">
                พบห้องว่างพร้อมอยู่ {filteredRooms.length} รายการ
              </span>
            </div>
            {(selectedSize !== 'all' || selectedListingType !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedSize('all');
                  setSelectedListingType('all');
                  setSearchQuery('');
                }}
                className="text-xs text-stone-600 hover:text-stone-900 underline cursor-pointer"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>

          {/* Empty State */}
          {filteredRooms.length === 0 ? (
            <div className="bg-white rounded-xl p-10 sm:p-12 text-center border border-stone-200 max-w-md mx-auto my-8 shadow-2xs">
              <div className="w-12 h-12 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-stone-500" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-1">
                {rooms.length === 0 ? 'ขณะนี้ยังไม่มีรายการห้องชุดว่างในระบบ' : 'ไม่พบห้องว่างตามเงื่อนไขที่เลือก'}
              </h3>
              <p className="text-xs text-stone-500 mb-5 leading-relaxed">
                {rooms.length === 0 
                  ? 'ท่านสามารถติดต่อสอบถามห้องว่างล่าสุด หรือฝากเรื่องกับสำนักงานนิติบุคคลได้โดยตรง'
                  : 'ลองปรับตัวกรองขนาดห้อง หรือคลิกล้างตัวกรองเพื่อเรียกดูห้องชุดทั้งหมดในโครงการ'}
              </p>
              {rooms.length > 0 ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSize('all');
                    setSelectedListingType('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  แสดงห้องชุดว่างทั้งหมด
                </button>
              ) : (
                <a
                  href={`tel:${contactPhone}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>โทรสอบถามนิติบุคคล ({contactPhone})</span>
                </a>
              )}
            </div>
          ) : (
            /* Room Cards Grid (Bespoke Architectural Style) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room, roomIndex) => {
                const roomImages = room.images && room.images.length > 0
                  ? room.images
                  : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'];
                const activeCardIndex = (cardImageIndices[room.id] ?? 0) % roomImages.length;
                const mainImage = roomImages[activeCardIndex];

                return (
                  <div
                    key={room.id}
                    className="animate-room-drop h-full flex flex-col"
                    style={{
                      animationDelay: `${Math.min(roomIndex, 15) * 75}ms`
                    }}
                  >
                    <div
                      id={`room-card-${room.id}`}
                      className="bg-white rounded-xl overflow-hidden border border-stone-200/90 hover:border-stone-400 hover:shadow-xl hover:shadow-stone-900/10 hover:-translate-y-2 transition-all duration-300 flex flex-col group shadow-2xs h-full"
                    >
                    
                    {/* Photo Container: 16:10 ratio with direct room preview */}
                    <div 
                      className="relative aspect-16/10 overflow-hidden bg-stone-100 cursor-pointer select-none" 
                      onClick={() => onSelectRoom(room)}
                    >
                      <img
                        src={mainImage}
                        alt={`ห้อง ${room.roomNumber} Bangkok Horizon Ram 60`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />

                      {/* Left Navigation Arrow on Card Cover */}
                      {roomImages.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardImageIndices(prev => ({
                              ...prev,
                              [room.id]: (activeCardIndex - 1 + roomImages.length) % roomImages.length
                            }));
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-stone-950/70 hover:bg-stone-950 text-white backdrop-blur-xs flex items-center justify-center transition-all duration-200 shadow-md hover:scale-110 active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                          title="ดูภาพก่อนหน้า"
                          aria-label="ดูภาพก่อนหน้า"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}

                      {/* Right Navigation Arrow on Card Cover */}
                      {roomImages.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardImageIndices(prev => ({
                              ...prev,
                              [room.id]: (activeCardIndex + 1) % roomImages.length
                            }));
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-stone-950/70 hover:bg-stone-950 text-white backdrop-blur-xs flex items-center justify-center transition-all duration-200 shadow-md hover:scale-110 active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                          title="ดูภาพถัดไป"
                          aria-label="ดูภาพถัดไป"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Top Badges */}
                      <div className="absolute top-3 right-3 pointer-events-none z-10">
                        <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-semibold tracking-wider bg-white/95 text-stone-800 backdrop-blur-xs shadow-2xs">
                          {room.listingType === 'rent' ? 'ให้เช่า' : room.listingType === 'sale' ? 'ขาย' : 'ขาย / เช่า'}
                        </span>
                      </div>

                      {/* Photo Dots Indicator */}
                      {roomImages.length > 1 && roomImages.length <= 6 && (
                        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/45 backdrop-blur-xs px-2 py-1 rounded-full pointer-events-none z-10">
                          {roomImages.map((_, i) => (
                            <span
                              key={i}
                              className={`rounded-full transition-all duration-200 ${
                                i === activeCardIndex ? 'w-3 h-1 bg-white' : 'w-1 h-1 bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Photo Count */}
                      {roomImages.length > 1 && (
                        <div className="absolute bottom-2.5 right-2.5 bg-black/65 backdrop-blur-xs px-2 py-0.5 rounded-md text-white text-[10px] font-mono pointer-events-none z-10">
                          {activeCardIndex + 1} / {roomImages.length}
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title: Room Unit Identity */}
                        <h3 
                          onClick={() => onSelectRoom(room)}
                          className="font-display font-bold text-lg text-stone-900 group-hover:text-amber-800 transition-colors cursor-pointer line-clamp-1 mb-2"
                        >
                          ห้อง {room.roomNumber} (ชั้น {room.floor})
                        </h3>

                        {/* Price Section */}
                        <div className="mb-3 space-y-1">
                          {room.rentPrice && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-medium text-stone-500">เช่า</span>
                              <span className="text-xl font-bold tracking-tight text-stone-900 tabular-nums">
                                ฿{room.rentPrice.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {room.salePrice && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-medium text-stone-500">ขาย</span>
                              <span className="text-base font-bold text-stone-900 tabular-nums">
                                ฿{room.salePrice.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Specs: Clean dividers */}
                        <div className="flex items-center gap-2 text-xs text-stone-600 py-2 border-y border-stone-100 mb-3 font-normal">
                          <span className="font-semibold text-stone-900">{room.areaSqM} ตร.ม.</span>
                          <span className="text-stone-300">•</span>
                          <span>{room.bedrooms === 0 ? 'Studio' : `${room.bedrooms} ห้องนอน`}</span>
                          <span className="text-stone-300">•</span>
                          <span>{room.bathrooms} ห้องน้ำ</span>
                        </div>

                        {/* Highlights (quiet chips) */}
                        {room.highlights && room.highlights.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {room.highlights.slice(0, 2).map((item, idx) => (
                              <span key={idx} className="text-[11px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md line-clamp-1">
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Row (Public Customer Actions Only - NO admin buttons) */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        <button
                          id={`room-detail-btn-${room.id}`}
                          onClick={() => onSelectRoom(room)}
                          className="flex-1 py-2 px-3 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          <span>ดูรายละเอียดห้องชุด</span>
                        </button>

                        <button
                          id={`room-share-btn-${room.id}`}
                          onClick={() => onShareRoom(room)}
                          className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 hover:scale-105 active:scale-95 rounded-lg transition-all border border-stone-200 cursor-pointer"
                          title="คัดลอกลิงก์ส่งให้ลูกค้า"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </section>
      )}

      {/* ===================================================================== */}
      {/* 3. TAB CONTENT: FACILITIES & BUILDING PROFILE (With Popup Dialogs)    */}
      {/* ===================================================================== */}
      {activeTab === 'facilities' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-7 space-y-8">
          
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs">
            <span className="text-xs font-semibold tracking-wider uppercase text-stone-500 block mb-1">
              Bangkok Horizon Ramkhamhaeng 60 Facilities
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
              สิ่งอำนวยความสะดวกและพื้นที่ส่วนกลาง
            </h2>
            <p className="text-sm text-stone-600 font-normal max-w-3xl leading-relaxed mb-6">
              โครงการ แบงค์คอก ฮอไรซอน รามคำแหง 60 ครบครันด้วยพื้นที่ส่วนกลางชั้น 8 และ Sky Garden ชั้น 35-37 
              ท่านสามารถคลิกดูรูปภาพ เวลาเปิด-ปิด และระเบียบการใช้งานของแต่ละจุดได้ด้านล่างนี้
            </p>

            {/* Facilities Cards with Photos & Popup trigger */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilities.map((fac) => {
                const facImg = fac.images && fac.images.length > 0 ? fac.images[0] : null;

                return (
                  <div
                    key={fac.id}
                    id={`facility-card-${fac.id}`}
                    onClick={() => {
                      if (onSelectFacility) {
                        onSelectFacility(fac);
                      } else {
                        setLocalSelectedFacility(fac);
                      }
                    }}
                    className="bg-white rounded-xl overflow-hidden border border-stone-200 hover:border-stone-400 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col"
                  >
                    {/* Facility Image */}
                    <div className="relative aspect-16/10 overflow-hidden bg-stone-100 flex items-center justify-center">
                      {facImg ? (
                        <img
                          src={facImg}
                          alt={fac.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-6 text-stone-400">
                          <Building className="w-8 h-8 text-stone-300 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-medium">รออัพโหลดรูปภาพจากนิติบุคคล</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-stone-900/85 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                        <MapPin className="w-3 h-3 text-amber-300" />
                        <span>{fac.floor}</span>
                      </div>
                      {fac.images && fac.images.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md font-mono">
                          {fac.images.length} รูป
                        </div>
                      )}
                    </div>

                    {/* Facility Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display font-bold text-stone-900 text-base mb-1 group-hover:text-amber-800 transition-colors">
                          {fac.name}
                        </h3>
                        {fac.nameEn && (
                          <p className="text-[11px] text-stone-400 mb-2">
                            {fac.nameEn}
                          </p>
                        )}
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {fac.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="text-stone-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{fac.hours || '06:00 - 22:00 น.'}</span>
                        </span>
                        <span className="text-stone-900 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                          ดูรูป & ข้อมูล →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </section>
      )}

      {/* ===================================================================== */}
      {/* 4. TAB CONTENT: RESIDENT SERVICES & JURISTIC RULES                   */}
      {/* ===================================================================== */}
      {activeTab === 'services' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-7 space-y-6">
          
          {/* Section 1: Juristic Office Services */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-stone-500 block mb-1">
                  Juristic Office Services
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
                  บริการของสำนักงานนิติบุคคลอาคารชุด
                </h2>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 self-start sm:self-auto">
                {officeServices.length} รายการบริการ
              </span>
            </div>

            <p className="text-sm text-stone-600 font-normal max-w-3xl leading-relaxed mb-6">
              สำนักงานนิติบุคคลอาคารชุด แบงค์คอก ฮอไรซอน รามคำแหง 60 ดูแลและอำนวยความสะดวกแก่เจ้าของร่วม ผู้เช่า และผู้พักอาศัยทุกท่าน
            </p>

            {officeServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {officeServices.map((svc) => (
                  <div key={svc.id} className="p-4 sm:p-5 bg-stone-50 hover:bg-white rounded-lg border border-stone-200/80 hover:border-stone-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-md bg-stone-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {renderServiceIcon(svc.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-stone-900 text-sm">
                          {svc.title}
                        </h3>
                        {svc.badge && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                            {svc.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed font-light mb-2">
                        {svc.description}
                      </p>
                      {svc.details && svc.details.length > 0 && (
                        <ul className="mt-2 space-y-1 pt-2 border-t border-stone-200/70">
                          {svc.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-[11px] text-stone-600">
                              <span className="text-stone-400 font-bold">•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {svc.hoursOrContact && (
                        <div className="mt-2 text-[10px] text-stone-500 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-stone-400" />
                          <span>{svc.hoursOrContact}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-stone-50 rounded-lg border border-dashed border-stone-300 text-stone-500 text-xs">
                ยังไม่มีข้อมูลบริการนิติบุคคล
              </div>
            )}
          </div>

          {/* Section 2: Rental Regulations & Residency Guidelines */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-stone-500 block mb-1">
                  Rental Rules & Regulations
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
                  ระเบียบและข้อกำหนดการเช่าพักอาศัย
                </h2>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 self-start sm:self-auto">
                {rentalRules.length} ข้อกำหนดสำคัญ
              </span>
            </div>

            <p className="text-sm text-stone-600 font-normal max-w-3xl leading-relaxed mb-6">
              ข้อควรรู้และแนวทางปฏิบัติสำหรับผู้สนใจเช่าและผู้พักอาศัย เพื่อความสงบสุขและความเป็นระเบียบเรียบร้อยของชุมชนอาคารชุด
            </p>

            {rentalRules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rentalRules.map((rule) => (
                  <div key={rule.id} className="p-4 sm:p-5 bg-stone-50 rounded-lg border border-stone-200/80 flex flex-col justify-between hover:border-stone-300 transition-colors">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center shrink-0">
                          {renderServiceIcon(rule.icon)}
                        </div>
                        {rule.badge && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/60">
                            {rule.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-stone-900 text-sm mb-1.5">
                        {rule.title}
                      </h3>
                      <p className="text-xs text-stone-600 leading-relaxed font-light mb-3">
                        {rule.description}
                      </p>
                      {rule.details && rule.details.length > 0 && (
                        <ul className="space-y-1.5 pt-2.5 border-t border-stone-200/80">
                          {rule.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-[11px] text-stone-600">
                              <CheckCircle2 className="w-3.5 h-3.5 text-stone-700 shrink-0 mt-0.5" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {rule.hoursOrContact && (
                      <div className="mt-3 pt-2 border-t border-stone-200/60 text-[10px] text-stone-500 font-medium">
                        {rule.hoursOrContact}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-stone-50 rounded-lg border border-dashed border-stone-300 text-stone-500 text-xs">
                ยังไม่มีข้อมูลระเบียบการเช่า
              </div>
            )}
          </div>

        </section>
      )}

      {/* ===================================================================== */}
      {/* 5. TAB CONTENT: OFFICE CONTACT & LOCATION DETAILS                     */}
      {/* ===================================================================== */}
      {activeTab === 'contact' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-7 space-y-6">
          
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs">
            <span className="text-xs font-semibold tracking-wider uppercase text-stone-500 block mb-1">
              Contact & Location
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-3">
              ที่ตั้งสำนักงานนิติบุคคลและข้อมูลการเดินทาง
            </h2>
            <p className="text-sm text-stone-600 font-normal max-w-3xl leading-relaxed mb-6">
              สำนักงานนิติบุคคลอาคารชุด แบงค์คอก ฮอไรซอน รามคำแหง 60 ตั้งอยู่บริเวณชั้น 1 โถงล็อบบี้หลักของอาคาร
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Office Details */}
              <div className="p-5 bg-stone-50 rounded-lg border border-stone-200/80 space-y-4">
                <h3 className="font-semibold text-stone-900 text-sm border-b border-stone-200 pb-2">
                  ข้อมูลการติดต่อสำนักงานนิติบุคคล
                </h3>
                
                <div className="space-y-3 text-xs sm:text-sm text-stone-700">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">ที่อยู่:</span>
                      <span>ซอยรามคำแหง 60 แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">เวลาทำการ:</span>
                      <span>08:30 - 17:30 น. (เปิดบริการทุกวัน ไม่เว้นวันหยุดราชการ)</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">เบอร์โทรศัพท์:</span>
                      <a href={`tel:${contactPhone.replace(/[^0-9]/g, '')}`} className="font-mono text-stone-900 hover:underline">
                        {contactPhone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">LINE Official:</span>
                      <a href={`https://line.me/R/ti/p/${encodeURIComponent(contactLine.startsWith('@') ? contactLine : `@${contactLine}`)}`} target="_blank" rel="noreferrer" className="text-stone-900 hover:underline">
                        {contactLine}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transit & Landmarks */}
              <div className="p-5 bg-stone-50 rounded-lg border border-stone-200/80 space-y-3">
                <h3 className="font-semibold text-stone-900 text-sm">
                  การเดินทางและสถานที่ใกล้เคียง
                </h3>
                <ul className="space-y-2 text-xs text-stone-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-700 shrink-0 mt-0.5" />
                    <span><strong>MRT แยกลำสาลี (Interchange):</strong> ประมาณ 400 เมตร (สายสีส้ม & สายสีเหลือง)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-700 shrink-0 mt-0.5" />
                    <span><strong>ห้างสรรพสินค้า:</strong> เดอะมอลล์ บางกะปิ, ตะวันนา, โลตัส บางกะปิ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-700 shrink-0 mt-0.5" />
                    <span><strong>สถานศึกษา:</strong> มหาวิทยาลัยรามคำแหง, มหาวิทยาลัยอัสสัมชัญ (ABAC), สถาบัน NIDA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-700 shrink-0 mt-0.5" />
                    <span><strong>สถานพยาบาล:</strong> โรงพยาบาลรามคำแหง, โรงพยาบาลเวชธานี</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>

        </section>
      )}

      {/* ===================================================================== */}
      {/* 6. CALLOUT FOOTER BANNER (Harmonized Glassmorphism & Architectural Tone) */}
      {/* ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900/95 via-stone-850/90 to-stone-950/95 backdrop-blur-md border border-white/15 p-6 sm:p-8 shadow-xl text-white">
          {/* Ambient Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-[11px] uppercase tracking-wider text-amber-200/90 font-semibold">
                  Bangkok Horizon Ram 60 Juristic Condominium
                </span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug">
                สนใจนัดหมายเข้าชมห้องจริง หรือติดต่อสำนักงานนิติบุคคล
              </h3>
              <p className="text-xs sm:text-sm text-stone-200/90 font-normal leading-relaxed">
                สำนักงานนิติบุคคลเปิดให้บริการทุกวัน นัดหมายชมห้องจริง ทำสัญญาเช่า หรือสอบถามข้อมูลเพิ่มเติมได้ทันที
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3 shrink-0 flex-wrap">
              <a
                id="customer-footer-call-btn"
                href={`tel:${contactPhone.replace(/[^0-9]/g, '')}`}
                className="px-4 py-2.5 rounded-xl bg-white/95 hover:bg-white text-stone-900 font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
              >
                <Phone className="w-4 h-4 text-stone-800" />
                <span className="font-mono">{contactPhone}</span>
              </a>
              <a
                id="customer-footer-line-btn"
                href={`https://line.me/R/ti/p/${encodeURIComponent(contactLine.startsWith('@') ? contactLine : `@${contactLine}`)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>LINE: {contactLine}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 7. DISCREET STAFF ACCESS FOOTER                                      */}
      {/* ===================================================================== */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
        <div>
          © {new Date().getFullYear()} สำนักงานนิติบุคคลอาคารชุด แบงค์คอก ฮอไรซอน รามคำแหง 60 (Bangkok Horizon Ram 60)
        </div>
        
        {/* Discreet Staff Portal Link for Juristic Office team */}
        {isAdminLoggedIn ? (
          <button
            type="button"
            id="staff-return-portal-btn"
            onClick={onBackToAdmin}
            className="inline-flex items-center gap-1.5 text-stone-800 hover:text-stone-950 font-semibold text-xs bg-stone-100 hover:bg-stone-200 transition-colors py-1.5 px-3 rounded-lg border border-stone-300 shadow-2xs cursor-pointer"
            title="กลับสู่ระบบงานเจ้าหน้าที่นิติบุคคล"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>กลับสู่ระบบงานนิติบุคคล (Staff Portal)</span>
          </button>
        ) : (
          onOpenStaffLogin && (
            <button
              type="button"
              id="discreet-staff-login-btn"
              onClick={onOpenStaffLogin}
              className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-700 text-[11px] transition-colors py-1 px-2 rounded-md hover:bg-stone-200/50 cursor-pointer"
              title="สำหรับเจ้าหน้าที่สำนักงานนิติบุคคลเพื่อเข้าจัดการหลังบ้าน"
            >
              <Lock className="w-3 h-3 text-stone-400" />
              <span>เข้าสู่ระบบเจ้าหน้าที่นิติบุคคล</span>
            </button>
          )
        )}
      </footer>

      {/* Facility Detail Modal (Fallback if no parent handler provided) */}
      {!onSelectFacility && localSelectedFacility && (
        <FacilityDetailModal
          facility={localSelectedFacility}
          onClose={() => setLocalSelectedFacility(null)}
          contactLine={contactLine}
          contactPhone={contactPhone}
        />
      )}

    </div>
  );
};
