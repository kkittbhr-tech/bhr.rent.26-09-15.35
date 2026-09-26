import React, { useState, useMemo } from 'react';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  User, 
  Phone, 
  Search, 
  ExternalLink, 
  FileText, 
  CheckCircle2, 
  Copy, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Building2
} from 'lucide-react';
import { Lease, Room } from '../../types';
import { calculateLeaseDaysAndStatus } from '../../services/apiService';
import { 
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  checkAndNotifyExpiringLeases
} from '../../services/browserNotificationService';

interface ExpiringLeasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  leases: Lease[];
  rooms: Room[];
  onOpenRoomDetail: (room: Room) => void;
  onEditRoomLease: (room: Room) => void;
  onGoToLeasesTab: (filter?: '30' | '60' | 'expired' | 'all') => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExpiringLeasesModal: React.FC<ExpiringLeasesModalProps> = ({
  isOpen,
  onClose,
  leases,
  rooms,
  onOpenRoomDetail,
  onEditRoomLease,
  onGoToLeasesTab,
  onNotify
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expired' | '30' | '60'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Process and sort all urgent leases (expired, <= 30 days, <= 60 days)
  const processedLeases = useMemo(() => {
    return leases.map(lease => {
      const { daysRemaining, status } = calculateLeaseDaysAndStatus(lease.endDate);
      const associatedRoom = rooms.find(
        r => r.id === lease.roomId || (lease.roomNumber && r.roomNumber.trim().toLowerCase() === lease.roomNumber.trim().toLowerCase())
      );
      return {
        ...lease,
        daysRemaining,
        calculatedStatus: status,
        room: associatedRoom
      };
    });
  }, [leases, rooms]);

  // Statistics
  const stats = useMemo(() => {
    let expired = 0;
    let within30 = 0;
    let within60 = 0;

    processedLeases.forEach(item => {
      if (item.daysRemaining < 0) {
        expired++;
      } else if (item.daysRemaining <= 30) {
        within30++;
      } else if (item.daysRemaining <= 60) {
        within60++;
      }
    });

    const totalUrgent = expired + within30 + within60;
    return { expired, within30, within60, totalUrgent };
  }, [processedLeases]);

  // Filtered List
  const displayedLeases = useMemo(() => {
    return processedLeases
      .filter(item => {
        // Filter by threshold: only show <= 60 days or expired
        if (filterType === 'expired') {
          if (item.daysRemaining >= 0) return false;
        } else if (filterType === '30') {
          if (item.daysRemaining < 0 || item.daysRemaining > 30) return false;
        } else if (filterType === '60') {
          if (item.daysRemaining < 0 || item.daysRemaining > 60) return false;
        } else {
          // 'all' shows all urgent leases (expired or <= 60 days)
          if (item.daysRemaining > 60) return false;
        }

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchRoom = item.roomNumber.toLowerCase().includes(q);
          const matchTenant = item.tenantName.toLowerCase().includes(q);
          const matchPhone = item.tenantPhone.toLowerCase().includes(q);
          if (!matchRoom && !matchTenant && !matchPhone) return false;
        }

        return true;
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining); // Most urgent (lowest days) first
  }, [processedLeases, filterType, searchQuery]);

  if (!isOpen) return null;

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phone);
      onNotify(`คัดลอกเบอร์โทร ${phone} แล้ว`, 'success');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleTriggerPush = async () => {
    const perm = getBrowserNotificationPermission();
    if (perm === 'default') {
      const newPerm = await requestBrowserNotificationPermission();
      if (newPerm !== 'granted') {
        onNotify('กรุณาอนุญาตการแจ้งเตือนบนเบราว์เซอร์เพื่อรับการแจ้งเตือนสัญญา 30 วัน', 'error');
        return;
      }
    } else if (perm === 'denied') {
      onNotify('เบราว์เซอร์ถูกบล็อกการแจ้งเตือน กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์ (คลิกไอคอน 🔒)', 'error');
      return;
    }

    const res = checkAndNotifyExpiringLeases(leases, {
      force: true,
      onNotificationClick: () => {
        setFilterType('30');
      }
    });

    if (res.totalExpiring === 0) {
      onNotify('ขณะนี้ไม่มีสัญญาที่ใกล้หมดอายุใน 30 วัน', 'info');
    } else {
      onNotify(`ส่งแจ้งเตือนสัญญาใกล้หมดอายุ 30 วัน (${res.totalExpiring} ห้อง) ไปยังหน้าจอเรียบร้อยแล้ว`, 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-stone-200">
        
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-inner">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  สัญญาเช่าที่ต้องติดตาม & กำลังจะหมดอายุ
                </h3>
                {stats.totalUrgent > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold">
                    {stats.totalUrgent} ห้อง
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                รายการสัญญาที่หมดอายุหรือครบกำหนดใน 60 วัน เพื่อเตรียมต่อสัญญาหรือตรวจรับห้อง
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stat Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-stone-50 border-b border-stone-200 text-center shrink-0">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white border-stone-900 shadow-xs ring-1 ring-stone-900'
                : 'bg-white/80 border-stone-200 hover:bg-white text-stone-600'
            }`}
          >
            <span className="block text-[11px] font-medium text-stone-500">รวมที่ต้องติดตาม</span>
            <span className="text-base sm:text-lg font-black text-stone-900">{stats.totalUrgent} ห้อง</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('expired')}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              filterType === 'expired'
                ? 'bg-rose-50 border-rose-600 shadow-xs ring-1 ring-rose-600'
                : 'bg-white/80 border-stone-200 hover:bg-rose-50/50 text-stone-600'
            }`}
          >
            <span className="block text-[11px] font-medium text-rose-600 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              หมดอายุแล้ว
            </span>
            <span className="text-base sm:text-lg font-black text-rose-700">{stats.expired} ห้อง</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('30')}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              filterType === '30'
                ? 'bg-amber-50 border-amber-600 shadow-xs ring-1 ring-amber-600'
                : 'bg-white/80 border-stone-200 hover:bg-amber-50/50 text-stone-600'
            }`}
          >
            <span className="block text-[11px] font-medium text-amber-700 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              ใน 30 วัน (ด่วน)
            </span>
            <span className="text-base sm:text-lg font-black text-amber-700">{stats.within30} ห้อง</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('60')}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              filterType === '60'
                ? 'bg-blue-50 border-blue-600 shadow-xs ring-1 ring-blue-600'
                : 'bg-white/80 border-stone-200 hover:bg-blue-50/50 text-stone-600'
            }`}
          >
            <span className="block text-[11px] font-medium text-blue-700 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              ใน 60 วัน
            </span>
            <span className="text-base sm:text-lg font-black text-blue-700">{stats.within60} ห้อง</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-5 py-3 border-b border-stone-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขห้อง, ชื่อผู้เช่า, เบอร์โทร..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto text-xs text-stone-500 font-medium justify-between sm:justify-end">
            <span>แสดง {displayedLeases.length} จากทั้งหมด {stats.totalUrgent} รายการ</span>
            <button
              type="button"
              onClick={handleTriggerPush}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0"
              title="ส่งการแจ้งเตือนสัญญาใกล้หมดอายุ 30 วันไปยังหน้าจอเบราว์เซอร์"
            >
              <Bell className="w-3 h-3 text-stone-950" />
              <span>แจ้งเตือน 30 วันบนจอ</span>
            </button>
          </div>
        </div>

        {/* Leases List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-stone-100/60">
          {displayedLeases.length > 0 ? (
            displayedLeases.map((lease) => {
              const isExpired = lease.daysRemaining < 0;
              const isUrgent30 = lease.daysRemaining >= 0 && lease.daysRemaining <= 30;
              const isWithin60 = lease.daysRemaining > 30 && lease.daysRemaining <= 60;

              return (
                <div
                  key={lease.id}
                  className={`bg-white rounded-xl p-4 sm:p-5 border transition-all shadow-xs hover:shadow-md ${
                    isExpired
                      ? 'border-rose-300 hover:border-rose-500 bg-linear-to-r from-rose-50/40 via-white to-white'
                      : isUrgent30
                      ? 'border-amber-300 hover:border-amber-500 bg-linear-to-r from-amber-50/40 via-white to-white'
                      : 'border-blue-200 hover:border-blue-400'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    
                    {/* Left: Room & Expiry Status */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Room Badge */}
                        <span className="font-extrabold text-base sm:text-lg text-stone-950 font-mono tracking-tight bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-300">
                          ห้อง {lease.roomNumber}
                        </span>

                        {lease.room?.floor && (
                          <span className="text-xs text-stone-500 font-medium">
                            (ชั้น {lease.room.floor})
                          </span>
                        )}

                        {/* Urgency Badge */}
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600 text-white text-xs font-bold shadow-xs animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>หมดอายุแล้ว (เกินมา {Math.abs(lease.daysRemaining)} วัน)</span>
                          </span>
                        ) : isUrgent30 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>จะหมดอายุในอีก {lease.daysRemaining} วัน (เร่งด่วน)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>จะหมดอายุในอีก {lease.daysRemaining} วัน</span>
                          </span>
                        )}
                      </div>

                      {/* Tenant Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1 text-xs text-stone-600">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="text-stone-500">ผู้เช่า:</span>
                          <span className="font-semibold text-stone-900">{lease.tenantName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="text-stone-500">โทร:</span>
                          <a
                            href={`tel:${lease.tenantPhone}`}
                            className="font-mono font-bold text-sky-700 hover:underline"
                            title="กดเพื่อโทรออก"
                          >
                            {lease.tenantPhone}
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(lease.tenantPhone, e)}
                            title="คัดลอกเบอร์โทร"
                            className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="text-stone-500">ระยะสัญญา:</span>
                          <span className="font-medium text-stone-800">
                            {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-stone-500">ค่าเช่า:</span>
                          <span className="font-mono font-bold text-stone-900">
                            {lease.monthlyRent?.toLocaleString()} บาท/ด.
                          </span>
                          {lease.depositAmount && (
                            <span className="text-stone-400 text-[11px]">
                              (ประกัน {lease.depositAmount.toLocaleString()} บ.)
                            </span>
                          )}
                        </div>
                      </div>

                      {lease.notes && (
                        <div className="text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200 mt-1 inline-block">
                          <span className="font-semibold">โน้ต: </span>{lease.notes}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200">
                      {lease.room && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenRoomDetail(lease.room!);
                          }}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Building2 className="w-3.5 h-3.5 text-stone-600" />
                          <span>ดูห้องชุด</span>
                        </button>
                      )}

                      {lease.room && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEditRoomLease(lease.room!);
                          }}
                          className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span>ต่อ/แก้ไขสัญญา</span>
                        </button>
                      )}

                      {lease.contractUrl && (
                        <a
                          href={lease.contractUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-[11px] text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>เปิดไฟล์สัญญา</span>
                        </a>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 px-4 text-center bg-white rounded-2xl border border-stone-200 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base text-stone-900">
                {searchQuery
                  ? 'ไม่พบข้อมูลสัญญาที่ค้นหา'
                  : 'ไม่พบสัญญาที่กำลังจะหมดอายุในหมวดหมู่นี้'}
              </h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                {searchQuery
                  ? 'ลองเปลี่ยนคำค้นหาเลขห้อง หรือชื่อผู้เช่าใหม่อีกครั้ง'
                  : 'สัญญาทั้งหมดของโครงการอยู่ในสถานะปกติ หรือระยะเวลาสัญญาคงเหลือมากกว่า 60 วัน'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1 text-xs text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg font-medium cursor-pointer"
                >
                  ล้างคำค้นหา
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 sm:px-6 border-t border-stone-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ระบบคำนวณและแจ้งเตือนวันหมดอายุอัตโนมัติทุกวัน</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToLeasesTab('all');
              }}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>ไปที่แท็บสัญญาเช่าทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
