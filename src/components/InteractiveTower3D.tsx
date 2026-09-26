import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, 
  Compass, 
  Sun, 
  Wind, 
  RotateCw, 
  Layers, 
  Waves, 
  Dumbbell, 
  Sparkles, 
  ChevronRight, 
  Eye, 
  BarChart3, 
  PieChart as PieChartIcon, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight,
  Maximize2,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  AreaChart, 
  Area,
  CartesianGrid 
} from 'recharts';
import { Room, Facility } from '../types';
import { resolveDirection } from '../utils/directionInsight';

interface InteractiveTower3DProps {
  rooms: Room[];
  facilities: Facility[];
  onSelectRoom: (room: Room) => void;
  onSelectFacility?: (facility: Facility) => void;
}

// 4 Cardinal Directions with physical characteristics of Bangkok Horizon Ram 60
const CARDINAL_ZONES = [
  {
    key: 'north',
    name: 'ทิศเหนือ (North)',
    landmark: 'ถนนรามคำแหง / ทางเข้าโครงการ',
    angle: 0,
    sunlight: 'ร่มตลอดวัน ไร้แดดร้อนส่อง',
    wind: 'รับลมหนาวช่วงปลายปี อากาศหมุนเวียนดี',
    color: '#0284c7' // Blue
  },
  {
    key: 'east',
    name: 'ทิศตะวันออก (East)',
    landmark: 'แยกลำสาลี / MRT Interchange สายสีส้ม & สีเหลือง',
    angle: 90,
    sunlight: 'แดดเช้า บ่ายร่มสนิท ห้องไม่สะสมความร้อน',
    wind: 'ลมเช้าพัดผ่านสบาย ระบายความอับชื้นได้ดี',
    color: '#f59e0b' // Amber
  },
  {
    key: 'south',
    name: 'ทิศใต้ (South)',
    landmark: 'พระราม 9 / คลองแสนแสบ / มอเตอร์เวย์',
    angle: 180,
    sunlight: 'แดดเฉียงหน้าหนาว แสงธรรมชาติโปร่งสบาย',
    wind: 'ลมใต้ธรรมชาติพัดแรงสุด 8-9 เดือนต่อปี',
    color: '#10b981' // Emerald
  },
  {
    key: 'west',
    name: 'ทิศตะวันตก (West)',
    landmark: 'ม.รามคำแหง / ราชมังคลากีฬาสถาน / พระอาทิตย์ตก',
    angle: 270,
    sunlight: 'แดดบ่าย วิว Sunset สวยงาม ผ้าแห้งไว ไม่อับชื้น',
    wind: 'ลมมรสุมพัดหมุนเวียน ถ่ายเทความร้อนช่วงค่ำ',
    color: '#f97316' // Orange
  }
];

// Typical facility usage pattern for Floor 8
const FACILITY_HOURLY_DATA = [
  { time: '06:00', poolUsers: 4, gymUsers: 6, label: '06:00' },
  { time: '07:00', poolUsers: 8, gymUsers: 12, label: '07:00' },
  { time: '08:00', poolUsers: 10, gymUsers: 14, label: '08:00' },
  { time: '09:00', poolUsers: 6, gymUsers: 7, label: '09:00' },
  { time: '11:00', poolUsers: 5, gymUsers: 4, label: '11:00' },
  { time: '13:00', poolUsers: 4, gymUsers: 3, label: '13:00' },
  { time: '15:00', poolUsers: 7, gymUsers: 5, label: '15:00' },
  { time: '17:00', poolUsers: 14, gymUsers: 16, label: '17:00' },
  { time: '18:00', poolUsers: 20, gymUsers: 22, label: '18:00' },
  { time: '19:00', poolUsers: 18, gymUsers: 24, label: '19:00' },
  { time: '20:00', poolUsers: 12, gymUsers: 18, label: '20:00' },
  { time: '21:00', poolUsers: 6, gymUsers: 9, label: '21:00' },
  { time: '22:00', poolUsers: 0, gymUsers: 0, label: '22:00 (ปิด)' },
];

export const InteractiveTower3D: React.FC<InteractiveTower3DProps> = ({
  rooms,
  facilities,
  onSelectRoom,
  onSelectFacility
}) => {
  // Available & published rooms only
  const availableRooms = useMemo(() => {
    return rooms.filter(r => r.status === 'available' && r.isPublished !== false);
  }, [rooms]);

  // Selected floor in the 3D tower (Default to floor with most vacant rooms or floor 19)
  const [selectedFloor, setSelectedFloor] = useState<number>(19);

  // 3D Model Rotation Angle (Yaw: 0 to 360 deg) and Tilt (Pitch: 10 to 30 deg)
  const [rotationY, setRotationY] = useState<number>(35);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [startRotationY, setStartRotationY] = useState<number>(35);

  // Active view tab inside 3D Explorer
  const [explorerTab, setExplorerTab] = useState<'tower' | 'analytics' | 'floor8'>('tower');

  // Auto-rotation effect
  useEffect(() => {
    if (!isAutoRotating) return;
    const timer = setInterval(() => {
      setRotationY(prev => (prev + 0.6) % 360);
    }, 40);
    return () => clearInterval(timer);
  }, [isAutoRotating]);

  // Handle Drag / Touch rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setStartRotationY(rotationY);
    setIsAutoRotating(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    setRotationY((startRotationY + deltaX * 0.7 + 360) % 360);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStartX(e.touches[0].clientX);
      setStartRotationY(rotationY);
      setIsAutoRotating(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStartX;
    setRotationY((startRotationY + deltaX * 0.7 + 360) % 360);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Group rooms by floor (Floor 1 to 37)
  const floorDataMap = useMemo(() => {
    const map = new Map<number, Room[]>();
    for (let f = 1; f <= 37; f++) {
      map.set(f, []);
    }
    availableRooms.forEach(room => {
      const flNum = typeof room.floor === 'number' ? room.floor : parseInt(String(room.floor).replace(/\D/g, ''), 10);
      if (flNum && flNum >= 1 && flNum <= 37) {
        const list = map.get(flNum) || [];
        list.push(room);
        map.set(flNum, list);
      }
    });
    return map;
  }, [availableRooms]);

  // Floor 8 Facilities
  const floor8Facilities = useMemo(() => {
    return facilities.filter(f => f.floor.includes('8') || f.name.includes('สระ') || f.name.includes('ฟิตเนส'));
  }, [facilities]);

  // Rooms on current selected floor
  const roomsOnSelectedFloor = useMemo(() => {
    return floorDataMap.get(selectedFloor) || [];
  }, [floorDataMap, selectedFloor]);

  // Group rooms on selected floor by 4 directions
  const directionalRoomsOnSelectedFloor = useMemo(() => {
    const grouped: Record<string, Room[]> = {
      north: [],
      east: [],
      south: [],
      west: []
    };

    roomsOnSelectedFloor.forEach(room => {
      const dirMeta = resolveDirection(room.facingDirection);
      const k = dirMeta.key;
      if (k.includes('east')) {
        grouped.east.push(room);
      } else if (k.includes('north')) {
        grouped.north.push(room);
      } else if (k.includes('south')) {
        grouped.south.push(room);
      } else if (k.includes('west')) {
        grouped.west.push(room);
      } else {
        grouped.east.push(room);
      }
    });

    return grouped;
  }, [roomsOnSelectedFloor]);

  // Tower Analytics: Vacant rooms by direction
  const directionDistribution = useMemo(() => {
    const counts = { north: 0, east: 0, south: 0, west: 0 };
    availableRooms.forEach(room => {
      const dirMeta = resolveDirection(room.facingDirection);
      const k = dirMeta.key;
      if (k.includes('east')) counts.east++;
      else if (k.includes('north')) counts.north++;
      else if (k.includes('south')) counts.south++;
      else if (k.includes('west')) counts.west++;
      else counts.east++;
    });

    return [
      { name: 'ทิศตะวันออก (East)', count: counts.east, fill: '#f59e0b', hint: 'แดดเช้า บ่ายร่ม' },
      { name: 'ทิศเหนือ (North)', count: counts.north, fill: '#0284c7', hint: 'ร่มทั้งวัน' },
      { name: 'ทิศใต้ (South)', count: counts.south, fill: '#10b981', hint: 'รับลม 8-9 เดือน' },
      { name: 'ทิศตะวันตก (West)', count: counts.west, fill: '#f97316', hint: 'วิวพระอาทิตย์ตก' }
    ];
  }, [availableRooms]);

  // Tower Analytics: Vacant rooms by floor elevation tier
  const elevationDistribution = useMemo(() => {
    const tiers = [
      { name: 'ชั้น 8 (ส่วนกลาง)', count: floorDataMap.get(8)?.length || 0, fill: '#06b6d4' },
      { name: 'ชั้น 9 - 15 (วิวสวน/สระ)', count: 0, fill: '#3b82f6' },
      { name: 'ชั้น 16 - 25 (ชั้นกลาง)', count: 0, fill: '#6366f1' },
      { name: 'ชั้น 26 - 34 (ชั้นสูง วิวเมือง)', count: 0, fill: '#8b5cf6' },
      { name: 'ชั้น 35 - 37 (Sky Suite)', count: 0, fill: '#ec4899' }
    ];

    availableRooms.forEach(room => {
      const fl = typeof room.floor === 'number' ? room.floor : parseInt(String(room.floor).replace(/\D/g, ''), 10);
      if (!fl) return;
      if (fl >= 9 && fl <= 15) tiers[1].count++;
      else if (fl >= 16 && fl <= 25) tiers[2].count++;
      else if (fl >= 26 && fl <= 34) tiers[3].count++;
      else if (fl >= 35 && fl <= 37) tiers[4].count++;
    });

    return tiers;
  }, [availableRooms, floorDataMap]);

  // Cardinal facing label based on current rotation
  const currentFacingDirection = useMemo(() => {
    const norm = (rotationY % 360 + 360) % 360;
    if (norm >= 315 || norm < 45) return CARDINAL_ZONES[0]; // North
    if (norm >= 45 && norm < 135) return CARDINAL_ZONES[1]; // East
    if (norm >= 135 && norm < 225) return CARDINAL_ZONES[2]; // South
    return CARDINAL_ZONES[3]; // West
  }, [rotationY]);

  // Generate building floor blocks for the 37-storey tower
  // We render floors grouped into meaningful visual bands to ensure top performance & clarity
  const floorBands = useMemo(() => {
    const bands: {
      id: string;
      label: string;
      subLabel: string;
      floors: number[];
      type: 'sky' | 'upper' | 'mid' | 'lower' | 'facility' | 'parking' | 'lobby';
    }[] = [
      { id: 'band-sky', label: 'ชั้น 37', subLabel: 'Sky Garden & 360° Lounge', floors: [37], type: 'sky' },
      { id: 'band-upper-suites', label: 'ชั้น 35 - 36', subLabel: 'Sky Suites / Penthouse', floors: [36, 35], type: 'upper' },
      { id: 'band-high-26-34', label: 'ชั้น 26 - 34', subLabel: 'High Floor วิวเมืองพาโนรามา', floors: [34, 33, 32, 31, 30, 29, 28, 27, 26], type: 'high' as any },
      { id: 'band-mid-16-25', label: 'ชั้น 16 - 25', subLabel: 'Mid Floor ยูนิตพักอาศัย', floors: [25, 24, 23, 22, 21, 20, 19, 18, 17, 16], type: 'mid' },
      { id: 'band-low-9-15', label: 'ชั้น 9 - 15', subLabel: 'Lower Residential วิวสระว่ายน้ำ', floors: [15, 14, 13, 12, 11, 10, 9], type: 'lower' },
      { id: 'band-fac-8', label: 'ชั้น 8 (ส่วนกลางหลัก)', subLabel: 'สระว่ายน้ำในร่ม, จากุซซี่, ฟิตเนส, ซาวน่า', floors: [8], type: 'facility' },
      { id: 'band-parking', label: 'ชั้น 2 - 7', subLabel: 'อาคารจอดรถในร่ม 7 ชั้น (Easy Pass)', floors: [7, 6, 5, 4, 3, 2], type: 'parking' },
      { id: 'band-lobby', label: 'ชั้น 1', subLabel: 'โถงล็อบบี้เพดานสูง & สำนักงานนิติบุคคล', floors: [1], type: 'lobby' },
    ];
    return bands;
  }, []);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner with View Tabs */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold tracking-wider text-amber-900 uppercase">
                3D Interactive Building & Floor Stacking Explorer
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              ผังอาคาร 37 ชั้น & สำรวจห้องว่างแบบ 3D
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              จำลองอาคารสูง 37 ชั้นของโครงการ แบงค์คอก ฮอไรซอน รามคำแหง 60 สามารถคลิกหมุนดูรอบตัวตึก 360° 
              ตรวจเช็กทิศทางแดด-ลมธรรมชาติ และคลิกเลือกชั้นเพื่อดูห้องว่างจริงได้ทันที
            </p>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 shrink-0 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setExplorerTab('tower')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                explorerTab === 'tower'
                  ? 'bg-white text-stone-950 shadow-xs font-bold border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-700" />
              <span>โมเดลตึก 3D</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExplorerTab('floor8');
                setSelectedFloor(8);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                explorerTab === 'floor8'
                  ? 'bg-white text-stone-950 shadow-xs font-bold border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Waves className="w-4 h-4 text-sky-600" />
              <span>ส่วนกลางชั้น 8</span>
            </button>

            <button
              type="button"
              onClick={() => setExplorerTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                explorerTab === 'analytics'
                  ? 'bg-white text-stone-950 shadow-xs font-bold border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>กราฟภาพรวมอาคาร</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-stone-100 text-xs">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
            <span className="text-stone-500 block text-[11px]">ความสูงอาคาร</span>
            <span className="font-bold text-stone-900 text-sm sm:text-base font-mono">37 ชั้น (High-Rise)</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
            <span className="text-stone-500 block text-[11px]">ห้องว่างพร้อมอยู่</span>
            <span className="font-bold text-emerald-700 text-sm sm:text-base font-mono">{availableRooms.length} ยูนิต</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
            <span className="text-stone-500 block text-[11px]">ชั้นส่วนกลางหลัก</span>
            <span className="font-bold text-sky-700 text-sm sm:text-base">ชั้น 8 & ชั้น 37 (Sky)</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
            <span className="text-stone-500 block text-[11px]">มุมมองปัจจุบัน</span>
            <span className="font-bold text-amber-700 text-sm sm:text-base">{currentFacingDirection.name}</span>
          </div>
        </div>
      </div>

      {/* 2. TAB: 3D TOWER & FLOOR BREAKDOWN */}
      {explorerTab === 'tower' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: 3D Interactive Tower Canvas (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs space-y-4">
            
            {/* 3D View Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-stone-800">หมุนดูทิศ:</span>
                <div className="flex items-center gap-1">
                  {CARDINAL_ZONES.map(z => (
                    <button
                      key={z.key}
                      type="button"
                      onClick={() => {
                        setRotationY(z.angle);
                        setIsAutoRotating(false);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        Math.abs((rotationY % 360 + 360) % 360 - z.angle) < 25
                          ? 'bg-stone-900 text-white shadow-2xs font-bold'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {z.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-rotate Toggle */}
              <button
                type="button"
                onClick={() => setIsAutoRotating(!isAutoRotating)}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAutoRotating 
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs font-bold' 
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${isAutoRotating ? 'animate-spin' : ''}`} />
                <span>{isAutoRotating ? 'กำลังหมุนรอบตึก' : 'หมุนอัตโนมัติ'}</span>
              </button>
            </div>

            {/* Current Direction Info Badge */}
            <div className="p-3 bg-gradient-to-r from-stone-50 to-stone-100 rounded-xl border border-stone-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <span>มุมมองหันหน้า: {currentFacingDirection.name}</span>
                    <span className="text-[10px] text-stone-500 font-mono">({Math.round(rotationY)}°)</span>
                  </div>
                  <div className="text-[11px] text-stone-600">{currentFacingDirection.landmark}</div>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-stone-500 block">จุดเด่นของทิศนี้</span>
                <span className="font-semibold text-emerald-700">{currentFacingDirection.sunlight}</span>
              </div>
            </div>

            {/* 3D Tower Stage (Interactive Drag-to-Rotate Box) */}
            <div 
              className="relative w-full h-[540px] sm:h-[600px] bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none flex items-center justify-center border border-stone-800 shadow-inner"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Sky Background Atmosphere */}
              <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-600/30 via-transparent to-transparent" />
              
              {/* Compass Ring Floor Base */}
              <div 
                className="absolute bottom-6 w-64 h-64 rounded-full border border-white/15 pointer-events-none flex items-center justify-center transition-transform duration-75"
                style={{ 
                  transform: `perspective(800px) rotateX(70deg) rotateZ(${-rotationY}deg)` 
                }}
              >
                <div className="w-full h-full rounded-full border-2 border-dashed border-white/20 relative">
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-bold text-amber-400 font-mono">N (รามคำแหง)</span>
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold text-sky-300 font-mono">S (พระราม 9)</span>
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-300 font-mono">E (ลำสาลี)</span>
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-300 font-mono">W</span>
                </div>
              </div>

              {/* 3D Stacking Building Container */}
              <div 
                className="relative z-10 w-44 sm:w-52 h-[480px] flex flex-col justify-between py-2 transition-transform duration-75 ease-out"
                style={{
                  transform: `perspective(900px) rotateX(12deg) rotateY(${rotationY * 0.4}deg)`,
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* 3D TOWER FLOORS (Stack from Top 37 to Bottom 1) */}
                {floorBands.map((band) => {
                  const isBandSelected = band.floors.includes(selectedFloor);
                  const vacantRoomsInBand = band.floors.reduce((acc, f) => acc + (floorDataMap.get(f)?.length || 0), 0);

                  return (
                    <div
                      key={band.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Select the primary floor of this band or the first vacant floor
                        const firstVacant = band.floors.find(f => (floorDataMap.get(f)?.length || 0) > 0);
                        setSelectedFloor(firstVacant || band.floors[0]);
                        if (band.id === 'band-fac-8') {
                          setExplorerTab('floor8');
                        }
                      }}
                      className={`relative group cursor-pointer transition-all duration-200 rounded-lg p-2 flex items-center justify-between border ${
                        band.type === 'sky'
                          ? 'bg-gradient-to-r from-emerald-900/80 to-teal-800/80 border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : band.type === 'facility'
                          ? 'bg-gradient-to-r from-cyan-900/90 to-blue-800/90 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-pulse'
                          : band.type === 'parking'
                          ? 'bg-stone-800/80 border-stone-700 text-stone-400'
                          : band.type === 'lobby'
                          ? 'bg-stone-800/90 border-amber-600/70'
                          : isBandSelected
                          ? 'bg-amber-950/90 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                          : vacantRoomsInBand > 0
                          ? 'bg-stone-800/90 border-emerald-500/70 hover:border-emerald-400'
                          : 'bg-stone-800/60 border-stone-700/80 hover:border-stone-500'
                      }`}
                    >
                      {/* Left: Floor Band Label */}
                      <div className="flex items-center gap-2">
                        {band.type === 'facility' ? (
                          <Waves className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                        ) : band.type === 'sky' ? (
                          <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${vacantRoomsInBand > 0 ? 'bg-emerald-400 animate-ping' : 'bg-stone-600'}`} />
                        )}
                        <span className={`font-mono text-xs font-bold ${
                          band.type === 'facility' ? 'text-cyan-200' :
                          band.type === 'sky' ? 'text-emerald-200' :
                          isBandSelected ? 'text-amber-300' : 'text-stone-200'
                        }`}>
                          {band.label}
                        </span>
                      </div>

                      {/* Right: Vacancy Status / Tag */}
                      <div>
                        {band.type === 'facility' ? (
                          <span className="text-[10px] font-bold bg-cyan-500/30 text-cyan-200 px-1.5 py-0.5 rounded border border-cyan-400/50">
                            ส่วนกลาง 🏊‍♂️
                          </span>
                        ) : band.type === 'parking' ? (
                          <span className="text-[10px] text-stone-400">ที่จอดรถ</span>
                        ) : band.type === 'lobby' ? (
                          <span className="text-[10px] text-amber-300">ล็อบบี้ & นิติ</span>
                        ) : vacantRoomsInBand > 0 ? (
                          <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded shadow-xs">
                            ว่าง {vacantRoomsInBand} ห้อง
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500">เต็ม</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drag instruction helper at bottom */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-stone-300 pointer-events-none flex items-center gap-1.5 border border-white/10">
                <RotateCw className="w-3 h-3 text-amber-400" />
                <span>คลิกค้างแล้วลากเมาส์เพื่อหมุนดูรอบตัวตึก 360°</span>
              </div>
            </div>

            {/* Quick Floor Selector Strip */}
            <div>
              <span className="text-xs font-semibold text-stone-700 block mb-2">
                คลิกเลือกชั้นที่ต้องการเจาะลึกดูทิศทางและห้องว่าง:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
                {[37, 35, 32, 29, 25, 22, 19, 14, 12, 8].map(fl => {
                  const vCount = floorDataMap.get(fl)?.length || 0;
                  const isSel = selectedFloor === fl;
                  return (
                    <button
                      key={fl}
                      type="button"
                      onClick={() => {
                        setSelectedFloor(fl);
                        if (fl === 8) setExplorerTab('floor8');
                      }}
                      className={`px-3 py-1.5 rounded-lg shrink-0 transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-stone-900 text-white shadow-xs ring-2 ring-amber-500'
                          : vCount > 0
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      <span>ชั้น {fl}</span>
                      {vCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right: Selected Floor Breakdown & Directional Room List (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs space-y-5">
            
            {/* Header of Selected Floor */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Floor Inspection · เจาะลึกแปลนชั้น
                </div>
                <h3 className="font-display text-xl font-bold text-stone-900 flex items-center gap-2 mt-0.5">
                  <span>ชั้น {selectedFloor}</span>
                  {selectedFloor === 8 ? (
                    <span className="text-xs font-sans font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-md">
                      พื้นที่ส่วนกลาง
                    </span>
                  ) : selectedFloor >= 35 ? (
                    <span className="text-xs font-sans font-semibold bg-pink-50 text-pink-800 border border-pink-200 px-2 py-0.5 rounded-md">
                      Sky Floor
                    </span>
                  ) : (
                    <span className="text-xs font-sans font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                      ชั้นพักอาศัย
                    </span>
                  )}
                </h3>
              </div>

              <div className="text-right">
                <span className="text-xs text-stone-500 block">ห้องว่างบนชั้นนี้</span>
                <span className="text-base font-extrabold font-mono text-emerald-700">
                  {roomsOnSelectedFloor.length} ยูนิต
                </span>
              </div>
            </div>

            {/* If Floor 8 is selected: Link directly to Floor 8 tab */}
            {selectedFloor === 8 && (
              <div className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200 space-y-3">
                <div className="flex items-center gap-2 text-cyan-900 font-bold text-sm">
                  <Waves className="w-4 h-4 text-cyan-700" />
                  <span>ชั้น 8 คือพื้นที่ส่วนกลางหลักของโครงการ</span>
                </div>
                <p className="text-xs text-cyan-800 leading-relaxed">
                  ประกอบด้วย สระว่ายน้ำระบบเกลือในร่ม, จากุซซี่, ฟิตเนสเซ็นเตอร์ และห้องซาวน่า 
                  คุณสามารถคลิกด้านล่างเพื่อดูรูปถ่าย เวลาเปิด-ปิด และกราฟสถิติการใช้งานส่วนกลางได้ทันที
                </p>
                <button
                  type="button"
                  onClick={() => setExplorerTab('floor8')}
                  className="w-full py-2 px-3 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>เปิดดูกราฟและข้อมูลส่วนกลางชั้น 8 แบบละเอียด</span>
                </button>
              </div>
            )}

            {/* 4 Cardinal Directions Breakdown for this Floor */}
            {selectedFloor !== 8 && (
              <div className="space-y-4">
                <div className="text-xs font-bold text-stone-900 flex items-center justify-between">
                  <span>ตำแหน่งและทิศทางของห้องบนชั้น {selectedFloor}:</span>
                  <span className="text-[11px] font-normal text-stone-500">จำแนกตาม 4 ทิศหลัก</span>
                </div>

                {/* 4 Directional Cards Accordion / List */}
                <div className="space-y-3">
                  {CARDINAL_ZONES.map((zone) => {
                    const roomsInZone = directionalRoomsOnSelectedFloor[zone.key] || [];
                    const hasRooms = roomsInZone.length > 0;

                    return (
                      <div 
                        key={zone.key}
                        className={`rounded-xl border transition-all p-3.5 ${
                          hasRooms
                            ? 'bg-white border-stone-300 shadow-2xs'
                            : 'bg-stone-50/70 border-stone-200/70 opacity-80'
                        }`}
                      >
                        {/* Zone Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ backgroundColor: zone.color }}
                            />
                            <span className="font-bold text-xs sm:text-sm text-stone-900">
                              {zone.name}
                            </span>
                          </div>

                          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                            hasRooms 
                              ? 'bg-emerald-100 text-emerald-800 font-bold' 
                              : 'bg-stone-200/80 text-stone-600'
                          }`}>
                            {hasRooms ? `ว่าง ${roomsInZone.length} ห้อง` : 'ไม่มีห้องว่าง'}
                          </span>
                        </div>

                        {/* Sunlight & Wind Environmental Tip */}
                        <p className="text-[11px] text-stone-500 mt-1 leading-normal">
                          💡 <strong>{zone.sunlight}</strong> · {zone.wind}
                        </p>

                        {/* Rooms List in this Direction */}
                        {hasRooms && (
                          <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-2">
                            {roomsInZone.map((room) => (
                              <div
                                key={room.id}
                                onClick={() => onSelectRoom(room)}
                                className="p-2.5 rounded-lg bg-stone-50 hover:bg-stone-100/90 border border-stone-200/80 hover:border-amber-600/50 transition-all cursor-pointer flex items-center justify-between group"
                              >
                                <div>
                                  <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5 group-hover:text-amber-800 transition-colors">
                                    <span>ห้อง {room.roomNumber}</span>
                                    <span className="text-[10px] font-normal text-stone-500 font-mono">
                                      ({room.areaSqM} ตร.ม. · {room.bedrooms === 0 ? 'Studio' : `${room.bedrooms} นอน`})
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-stone-600 mt-0.5 font-mono">
                                    {room.rentPrice && `เช่า ฿${room.rentPrice.toLocaleString()}/ด.`}
                                    {room.rentPrice && room.salePrice && ' · '}
                                    {room.salePrice && `ขาย ฿${room.salePrice.toLocaleString()}`}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="p-1.5 rounded-md bg-stone-900 text-white text-xs group-hover:bg-amber-700 transition-colors"
                                  title="คลิกดูรายละเอียดห้องชุดนี้"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* If selected floor has no vacant units */}
                {roomsOnSelectedFloor.length === 0 && (
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-center space-y-1">
                    <Info className="w-4 h-4 text-stone-400 mx-auto" />
                    <p className="text-xs text-stone-600 font-medium">
                      ขณะนี้ชั้น {selectedFloor} ยังไม่มีห้องชุดว่างที่เปิดประกาศสาธารณะ
                    </p>
                    <p className="text-[11px] text-stone-400">
                      คุณสามารถคลิกเลือกชั้นอื่น ๆ ที่มีป้ายกำกับสีเขียวเพื่อเลือกดูห้องว่างได้ครับ
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      )}

      {/* 3. TAB: FLOOR 8 FACILITIES & GRAPH (ส่วนกลางชั้น 8) */}
      {explorerTab === 'floor8' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs space-y-8">
          
          {/* Floor 8 Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <span className="text-xs font-bold tracking-wider uppercase text-cyan-700 block mb-1">
                Floor 8 Recreation & Wellness Deck
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
                สิ่งอำนวยความสะดวกชั้น 8 (สระว่ายน้ำ & ฟิตเนส)
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
                ชั้น 8 ได้รับการออกแบบเป็นพื้นที่พักผ่อนและออกกำลังกายเต็มรูปแบบ เปิดให้บริการลูกบ้านทุกวัน 06:00 - 22:00 น.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>เปิดบริการ 06:00 - 22:00 น.</span>
              </span>
            </div>
          </div>

          {/* Facility Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-cyan-50/60 rounded-xl border border-cyan-200/80">
              <span className="text-xs text-cyan-800 block">สระว่ายน้ำระบบเกลือในร่ม</span>
              <span className="text-xl font-bold text-cyan-950 font-mono">25 x 8 ม.</span>
              <p className="text-[11px] text-cyan-700 mt-0.5">ลึก 1.2 ม. ไร้กังวลแดด/ฝน</p>
            </div>
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80">
              <span className="text-xs text-blue-800 block">เตียงจากุซซี่นวดตัว</span>
              <span className="text-xl font-bold text-blue-950 font-mono">6 หัวฉีด</span>
              <p className="text-[11px] text-blue-700 mt-0.5">ผ่อนคลายกล้ามเนื้อ</p>
            </div>
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80">
              <span className="text-xs text-indigo-800 block">อุปกรณ์ฟิตเนสครบครัน</span>
              <span className="text-xl font-bold text-indigo-950 font-mono">15+ ชิ้น</span>
              <p className="text-[11px] text-indigo-700 mt-0.5">คาร์ดิโอ & เวทเทรนนิ่ง</p>
            </div>
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80">
              <span className="text-xs text-amber-800 block">ห้องซาวน่าระบบอินฟราเรด</span>
              <span className="text-xl font-bold text-amber-950 font-mono">แยก ช/ญ</span>
              <p className="text-[11px] text-amber-700 mt-0.5">อุณหภูมิ 75-85°C</p>
            </div>
          </div>

          {/* GRAPH: Hourly Density / Usage Statistics Chart (Requested by user) */}
          <div className="p-5 sm:p-6 bg-stone-50/80 rounded-2xl border border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-700" />
                  <span>กราฟสถิติช่วงเวลาความหนาแน่นของผู้ใช้งานชั้น 8 ตลอดวัน (06:00 - 22:00 น.)</span>
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  จำแนกระหว่างผู้ใช้สระว่ายน้ำ และผู้ใช้ห้องฟิตเนส เพื่อวางแผนเวลาออกกำลังกายแบบเป็นส่วนตัว
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-cyan-600" />
                  <span className="text-stone-700">สระว่ายน้ำ & จากุซซี่</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-600" />
                  <span className="text-stone-700">ฟิตเนสเซ็นเตอร์</span>
                </div>
              </div>
            </div>

            {/* Recharts Area/Bar Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={FACILITY_HOURLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="poolGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="gymGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    formatter={(value: any, name: any) => [
                      `${value} คน`,
                      name === 'poolUsers' ? 'สระว่ายน้ำ' : 'ฟิตเนส'
                    ]}
                  />
                  <Area type="monotone" dataKey="poolUsers" stroke="#0891b2" strokeWidth={2} fillOpacity={1} fill="url(#poolGradient)" name="poolUsers" />
                  <Area type="monotone" dataKey="gymUsers" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#gymGradient)" name="gymUsers" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-3 border-t border-stone-200 mt-2">
              <span>💡 ช่วงเวลาสงบ เหมาะกับการพักผ่อน: 09:30 - 16:30 น.</span>
              <span>ช่วงเวลาที่มีผู้ใช้งานสูงสุด: 17:30 - 20:30 น. (หลังเลิกงาน)</span>
            </div>
          </div>

          {/* Photo Gallery of Floor 8 */}
          <div>
            <h4 className="font-bold text-stone-900 text-sm sm:text-base mb-3">
              ภาพถ่ายพื้นที่จริงของส่วนกลางชั้น 8
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {floor8Facilities.flatMap(f => f.images || []).slice(0, 6).map((imgUrl, idx) => (
                <div key={idx} className="relative aspect-16/10 rounded-xl overflow-hidden border border-stone-200 shadow-2xs group">
                  <img
                    src={imgUrl}
                    alt={`ส่วนกลางชั้น 8 Bangkok Horizon ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-white text-xs font-semibold">
                      {idx === 0 ? 'สระว่ายน้ำในร่ม & จากุซซี่' : idx === 1 ? 'ฟิตเนสเซ็นเตอร์ วิวเมือง' : 'โซนพักผ่อนริมสระน้ำ'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 4. TAB: TOWER ANALYTICS & DISTRIBUTION GRAPHS */}
      {explorerTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart 1: Vacant Rooms by 4 Cardinal Directions (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Directional Vacancy Analytics
                </div>
                <h3 className="font-display text-lg font-bold text-stone-900">
                  สัดส่วนห้องว่างจำแนกตาม 4 ทิศทางระเบียง
                </h3>
                <p className="text-xs text-stone-500">
                  เปรียบเทียบจำนวนห้องชุดว่างในแต่ละทิศ เพื่อช่วยผู้เช่าตัดสินใจเลือกตามไลฟ์สไตล์แดดและลม
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={directionDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4b5563' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} ห้องชุด (${item.payload.hint})`,
                        'ห้องว่าง'
                      ]}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {directionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-100 text-xs">
                {directionDistribution.map(d => (
                  <div key={d.name} className="p-2 rounded-lg bg-stone-50 border border-stone-200/60">
                    <span className="font-semibold text-stone-900 block truncate">{d.name.split(' ')[0]}</span>
                    <span className="font-mono font-bold text-stone-700">{d.count} ห้อง</span>
                    <span className="text-[10px] text-stone-500 block truncate">{d.hint}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Vacant Rooms by Elevation Tier (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Elevation Stacking Distribution
                </div>
                <h3 className="font-display text-lg font-bold text-stone-900">
                  ห้องว่างจำแนกตามระดับความสูงชั้น
                </h3>
                <p className="text-xs text-stone-500">
                  กระจายตัวตามชั้นวิวสระว่ายน้ำ, ชั้นกลาง, และชั้นสูง
                </p>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={elevationDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {elevationDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`${val} ห้อง`, 'จำนวนห้อง']}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-stone-100 text-xs">
                {elevationDistribution.map(tier => (
                  <div key={tier.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tier.fill }} />
                      <span className="text-stone-700">{tier.name}</span>
                    </div>
                    <span className="font-bold text-stone-900 font-mono">{tier.count} ห้อง</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
