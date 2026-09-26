import React from 'react';
import { Compass, Sun, Wind, CloudSun, Eye, Sparkles, Building, Clock, CheckCircle2 } from 'lucide-react';
import { resolveDirection, resolveViewType, getFloorLevelInsight } from '../utils/directionInsight';
import { Room } from '../types';

interface DirectionViewInsightWidgetProps {
  room: Room;
  compact?: boolean;
}

export const DirectionViewInsightWidget: React.FC<DirectionViewInsightWidgetProps> = ({ room, compact = false }) => {
  const dir = resolveDirection(room.facingDirection);
  const view = resolveViewType(room.viewType, room.description, room.floor);
  const floorInsight = getFloorLevelInsight(room.floor);

  if (compact) {
    // Ultra compact chip or banner for quick glance
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 font-medium border border-stone-200/80">
          <Compass className="w-3.5 h-3.5 text-stone-600" />
          <span>{dir.name}</span>
          <span className="text-[10px] text-stone-400 font-mono">({dir.shortName} {dir.angle}°)</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-medium border border-amber-200/70">
          <Sun className="w-3.5 h-3.5 text-amber-600" />
          <span>{room.sunlightExposure || dir.sunlightSummary}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-200/80">
          <span>{view.icon}</span>
          <span>{room.viewType || view.name}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-gradient-to-br from-white via-stone-50/50 to-stone-100/40 p-4 sm:p-6 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 tracking-tight flex items-center gap-2">
              <span>ข้อมูลทิศทางระเบียง & วิวห้องชุด</span>
              <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                Direction & View Insight
              </span>
            </h3>
            <p className="text-xs text-stone-500">
              วิเคราะห์สภาพแสงแดด ลมธรรมชาติ และทัศนียภาพจริงของระเบียงห้อง {room.roomNumber}
            </p>
          </div>
        </div>

        {/* View Badge */}
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${view.badgeStyle}`}>
            <span className="text-sm">{view.icon}</span>
            <span>{room.viewType || view.name}</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Compass Radar (Left) + Detailed Metrics (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        
        {/* Left Column: Visual Compass Radar (4 cols) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
          
          {/* Compass Graphic */}
          <div className="relative w-40 h-40 flex items-center justify-center my-1 select-none">
            {/* Outer Circle Ring with ticks */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-stone-300" />
            <div className="absolute inset-2 rounded-full border border-stone-200 bg-stone-50/50" />
            
            {/* Cardinal Labels */}
            <span className="absolute top-1 text-[11px] font-bold text-stone-800">N</span>
            <span className="absolute bottom-1 text-[11px] font-bold text-stone-400">S</span>
            <span className="absolute right-1 text-[11px] font-bold text-stone-800">E</span>
            <span className="absolute left-1 text-[11px] font-bold text-stone-400">W</span>

            {/* Sub-cardinal light dots */}
            <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-stone-300" />
            <div className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full bg-stone-300" />
            <div className="absolute bottom-4 left-4 w-1.5 h-1.5 rounded-full bg-stone-300" />
            <div className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full bg-stone-300" />

            {/* Rotating Arrow Needle pointing in the room's facing angle */}
            <div 
              className="absolute w-full h-full flex items-center justify-center transition-transform duration-700 ease-out"
              style={{ transform: `rotate(${dir.angle}deg)` }}
            >
              {/* Compass Needle Pointer */}
              <div className="relative w-2 h-28 flex flex-col items-center justify-between">
                {/* North/Active Pointer Tip */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[38px] border-b-amber-500 filter drop-shadow-xs" />
                {/* Center Pivot */}
                <div className="w-4 h-4 rounded-full bg-stone-900 border-2 border-white shadow-md z-10 -my-2 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </div>
                {/* Opposite Tail */}
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[34px] border-t-stone-300" />
              </div>
            </div>
          </div>

          {/* Compass Info Footer */}
          <div className="text-center mt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 text-white text-xs font-bold font-mono shadow-2xs">
              <span>{dir.name}</span>
              <span className="text-amber-400 font-normal">({dir.angle}°)</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1 font-medium">
              ระเบียงหันสู่ {dir.shortName} • {dir.sunlightSummary}
            </p>
          </div>

        </div>

        {/* Right Column: 4 Cards Matrix (8 cols) */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* Card 1: Sunlight Schedule */}
          <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                    ช่วงเวลาแสงแดด
                  </span>
                  <h4 className="text-xs font-bold text-stone-900">
                    {dir.sunlightSchedule}
                  </h4>
                </div>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                {dir.sunlightDetail}
              </p>
            </div>
            
            <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center gap-1.5 text-[10px] text-stone-500">
              <Clock className="w-3 h-3 text-stone-400" />
              <span>ความร้อนสะสม: <strong>ต่ำ - ปานกลาง</strong></span>
            </div>
          </div>

          {/* Card 2: Wind & Ventilation */}
          <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                  <Wind className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                    ทิศทางลม & อากาศ
                  </span>
                  <h4 className="text-xs font-bold text-stone-900">
                    ลมระบายดี ไม่อับชื้น
                  </h4>
                </div>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                {dir.windDetail}
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center gap-1.5 text-[10px] text-stone-500">
              <Sparkles className="w-3 h-3 text-sky-500" />
              <span>การถ่ายเท: <strong>โปร่งสบาย ไม่อับ</strong></span>
            </div>
          </div>

          {/* Card 3: View & Horizon */}
          <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                    ทัศนียภาพจากระเบียง
                  </span>
                  <h4 className="text-xs font-bold text-stone-900">
                    {room.viewType || view.name}
                  </h4>
                </div>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                {room.viewDescription || view.description}
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center gap-1.5 text-[10px] text-stone-500">
              <CheckCircle2 className="w-3 h-3 text-indigo-500" />
              <span className="truncate">{view.advantage}</span>
            </div>
          </div>

          {/* Card 4: Floor Height Perspective */}
          <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                    มุมมองระดับความสูง
                  </span>
                  <h4 className="text-xs font-bold text-stone-900">
                    ชั้น {room.floor} ({floorInsight.badge})
                  </h4>
                </div>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                {floorInsight.desc}
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center gap-1.5 text-[10px] text-stone-500">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>ความเป็นส่วนตัว: <strong>สูง ไร้เสียงรบกวน</strong></span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
