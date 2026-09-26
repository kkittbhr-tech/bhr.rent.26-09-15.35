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
  FileText, 
  CheckCircle2, 
  Copy, 
  Building2,
  FileCheck,
  DollarSign,
  ChevronRight,
  Filter,
  ExternalLink,
  Laptop,
  Send,
  ShieldAlert,
  Check
} from 'lucide-react';
import { Lease, Room, BookingReceipt } from '../../types';
import { calculateLeaseDaysAndStatus } from '../../services/apiService';
import { 
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  checkAndNotifyExpiringLeases,
  sendTestBrowserNotification,
  isAutoPushEnabled,
  setAutoPushEnabled,
  isBrowserNotificationSupported,
  BrowserNotificationStatus
} from '../../services/browserNotificationService';

interface NotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  leases: Lease[];
  bookings: BookingReceipt[];
  rooms: Room[];
  onOpenRoomDetail: (room: Room) => void;
  onEditRoomLease: (room: Room) => void;
  onGoToLeasesTab: (filter?: '30' | '60' | '90' | 'expired' | 'all') => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type FilterCategory = 'all' | '30' | '60' | '90' | 'expired' | 'booking';

export const NotificationSidebar: React.FC<NotificationSidebarProps> = ({
  isOpen,
  onClose,
  leases,
  bookings,
  rooms,
  onOpenRoomDetail,
  onEditRoomLease,
  onGoToLeasesTab,
  onNotify
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pushPermission, setPushPermission] = useState<BrowserNotificationStatus>(getBrowserNotificationPermission());
  const [autoPush, setAutoPush] = useState<boolean>(isAutoPushEnabled());
  const [isTriggeringPush, setIsTriggeringPush] = useState(false);

  // Helper to normalize room strings: e.g. "788/440" -> "440", "A-0812" -> "812", "0812" -> "812"
  const normalizeRoomNo = (str?: string): string => {
    if (!str) return '';
    return str.replace(/^788\//, '').replace(/^[A-Za-z]-?0*/, '').replace(/^0+/, '').trim().toLowerCase();
  };

  // Helper to find or synthesize a Room object so RoomDetailModal can ALWAYS open cleanly
  const resolveRoom = (
    roomId?: string,
    roomNumber?: string,
    leaseOrBookingInfo?: {
      condoName?: string;
      rentPrice?: number;
      tenantName?: string;
      tenantPhone?: string;
      notes?: string;
    }
  ): Room => {
    // 1. Try exact ID match
    if (roomId) {
      const match = rooms.find(r => r.id === roomId);
      if (match) return match;
    }

    // 2. Try exact room number match
    if (roomNumber) {
      const match = rooms.find(r => r.roomNumber.trim().toLowerCase() === roomNumber.trim().toLowerCase());
      if (match) return match;

      // 3. Try normalized room number match (e.g. 788/440 matches 440 or 788-440)
      const cleanTarget = normalizeRoomNo(roomNumber);
      if (cleanTarget) {
        const fuzzyMatch = rooms.find(r => normalizeRoomNo(r.roomNumber) === cleanTarget || r.id.toLowerCase().includes(cleanTarget));
        if (fuzzyMatch) return fuzzyMatch;
      }
    }

    // 4. Fallback: Synthesize a full valid Room object from lease/booking info
    const cleanRoomNo = roomNumber || 'N/A';
    const numPart = cleanRoomNo.replace(/\D/g, '');
    let floorNumber = 15;
    if (numPart.length >= 3) {
      const parsedFloor = parseInt(numPart.substring(0, numPart.length - 2), 10);
      if (!isNaN(parsedFloor) && parsedFloor > 0 && parsedFloor < 40) {
        floorNumber = parsedFloor;
      }
    }

    return {
      id: roomId || `virtual-room-${cleanRoomNo.replace(/[^a-zA-Z0-9]/g, '-')}`,
      roomNumber: cleanRoomNo,
      condoName: leaseOrBookingInfo?.condoName || 'Bangkok Horizon Ram 60',
      listingType: 'rent',
      rentPrice: leaseOrBookingInfo?.rentPrice || 10000,
      sizeCategory: 'size_30',
      areaSqM: 31.0,
      floor: floorNumber,
      building: 'อาคาร A',
      bedrooms: 0,
      bathrooms: 1,
      status: 'rented',
      isPublished: false,
      staffNotes: leaseOrBookingInfo?.notes || '',
      description: `ห้องชุดเลขที่ ${cleanRoomNo} โครงการ Bangkok Horizon Ram 60`,
      highlights: [`ชั้น ${floorNumber}`, 'ห้องชุดพักอาศัย'],
      amenities: ['เครื่องปรับอากาศ', 'เครื่องทำน้ำอุ่น'],
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'
      ],
      contactName: leaseOrBookingInfo?.tenantName || 'สำนักงานนิติบุคคล',
      contactPhone: leaseOrBookingInfo?.tenantPhone || '02-735-6060',
      contactLine: '@052adooe',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // 1. Process Leases with remaining days and associated room
  const processedLeases = useMemo(() => {
    return leases.map(lease => {
      const { daysRemaining, status } = calculateLeaseDaysAndStatus(lease.endDate);
      const associatedRoom = resolveRoom(lease.roomId, lease.roomNumber, {
        condoName: lease.condoName,
        rentPrice: lease.monthlyRent,
        tenantName: lease.tenantName,
        tenantPhone: lease.tenantPhone,
        notes: lease.notes
      });
      return {
        ...lease,
        daysRemaining,
        calculatedStatus: status,
        room: associatedRoom
      };
    });
  }, [leases, rooms]);

  // 2. Process Bookings: Find bookings where contractSignDate is today or upcoming (or pending sign)
  const processedBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bookings.map(booking => {
      const associatedRoom = resolveRoom(booking.roomId, booking.roomNumber, {
        condoName: booking.condoName,
        rentPrice: booking.price,
        tenantName: booking.customerName,
        tenantPhone: booking.customerPhone,
        notes: booking.terms
      });

      let daysUntilSign: number | null = null;
      let isPendingSign = false;

      if (booking.contractSignDate) {
        const signDate = new Date(booking.contractSignDate);
        signDate.setHours(0, 0, 0, 0);
        const diffTime = signDate.getTime() - today.getTime();
        daysUntilSign = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // If sign date is today or in future (>= 0), or within recent 3 days overdue
        isPendingSign = daysUntilSign >= -3;
      } else {
        // No date specified, still pending contract
        isPendingSign = true;
      }

      return {
        ...booking,
        daysUntilSign,
        isPendingSign,
        room: associatedRoom
      };
    });
  }, [bookings, rooms]);

  // 3. Count Stats
  const stats = useMemo(() => {
    let expired = 0;
    let within30 = 0;
    let within60 = 0;
    let within90 = 0;

    processedLeases.forEach(item => {
      if (item.daysRemaining < 0) {
        expired++;
      } else if (item.daysRemaining <= 30) {
        within30++;
      } else if (item.daysRemaining <= 60) {
        within60++;
      } else if (item.daysRemaining <= 90) {
        within90++;
      }
    });

    const pendingBookingsCount = processedBookings.filter(b => b.isPendingSign).length;
    const totalAll = expired + within30 + within60 + within90 + pendingBookingsCount;

    return {
      expired,
      within30,
      within60,
      within90,
      pendingBookings: pendingBookingsCount,
      totalAll
    };
  }, [processedLeases, processedBookings]);

  // 4. Filter Items to display
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Matching helper
    const matchQuery = (text?: string) => !query || (text && text.toLowerCase().includes(query));

    let leaseList: typeof processedLeases = [];
    let bookingList: typeof processedBookings = [];

    // Filter Leases
    if (activeFilter === 'all' || activeFilter === 'expired' || activeFilter === '30' || activeFilter === '60' || activeFilter === '90') {
      leaseList = processedLeases.filter(lease => {
        if (activeFilter === 'expired' && lease.daysRemaining >= 0) return false;
        if (activeFilter === '30' && (lease.daysRemaining < 0 || lease.daysRemaining > 30)) return false;
        if (activeFilter === '60' && (lease.daysRemaining < 0 || lease.daysRemaining > 60)) return false;
        if (activeFilter === '90' && (lease.daysRemaining < 0 || lease.daysRemaining > 90)) return false;
        if (activeFilter === 'all' && lease.daysRemaining > 90) return false; // Show up to 90 days or expired in 'all'

        if (query) {
          const matchRoom = matchQuery(lease.roomNumber);
          const matchName = matchQuery(lease.tenantName);
          const matchPhone = matchQuery(lease.tenantPhone);
          if (!matchRoom && !matchName && !matchPhone) return false;
        }
        return true;
      });
    }

    // Filter Bookings
    if (activeFilter === 'all' || activeFilter === 'booking') {
      bookingList = processedBookings.filter(booking => {
        if (!booking.isPendingSign) return false;
        if (query) {
          const matchRoom = matchQuery(booking.roomNumber);
          const matchName = matchQuery(booking.customerName);
          const matchPhone = matchQuery(booking.customerPhone);
          const matchRec = matchQuery(booking.receiptNumber);
          if (!matchRoom && !matchName && !matchPhone && !matchRec) return false;
        }
        return true;
      });
    }

    return {
      leases: leaseList.sort((a, b) => a.daysRemaining - b.daysRemaining),
      bookings: bookingList.sort((a, b) => (a.daysUntilSign ?? 999) - (b.daysUntilSign ?? 999))
    };
  }, [processedLeases, processedBookings, activeFilter, searchQuery]);

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phone);
      onNotify(`คัดลอกเบอร์โทร ${phone} แล้ว`, 'success');
    }
  };

  const formatDate = (dateStr?: string) => {
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

  // Handlers for browser push notifications
  const handleRequestPushPermission = async () => {
    const perm = await requestBrowserNotificationPermission();
    setPushPermission(perm);
    if (perm === 'granted') {
      onNotify('เปิดรับการแจ้งเตือนสัญญาใกล้หมดอายุบนเบราว์เซอร์เรียบร้อยแล้ว', 'success');
      const res = checkAndNotifyExpiringLeases(leases, {
        force: true,
        onNotificationClick: (lease) => {
          onGoToLeasesTab('30');
          onClose();
        }
      });
      if (res.sentCount > 0) {
        onNotify(`ส่งแจ้งเตือนสัญญาใกล้หมดอายุ 30 วันขึ้นหน้าจอแล้ว ${res.sentCount} รายการ`, 'info');
      }
    } else if (perm === 'denied') {
      onNotify('เบราว์เซอร์ปฏิเสธการแจ้งเตือน กรุณาเปิดสิทธิ์ในการตั้งค่าเบราว์เซอร์', 'error');
    }
  };

  const handleTriggerPushNow = () => {
    setIsTriggeringPush(true);
    try {
      const res = checkAndNotifyExpiringLeases(leases, {
        force: true,
        onNotificationClick: (lease) => {
          onGoToLeasesTab('30');
          onClose();
        }
      });
      if (res.totalExpiring === 0) {
        onNotify('ขณะนี้ไม่มีสัญญาที่ใกล้หมดอายุใน 30 วัน', 'info');
      } else if (res.sentCount > 0) {
        onNotify(`ส่งแจ้งเตือนสัญญา 30 วัน (${res.totalExpiring} ห้อง) ขึ้นหน้าจอเรียบร้อยแล้ว`, 'success');
      } else {
        onNotify('กรุณาเปิดรับการแจ้งเตือนบนเบราว์เซอร์ก่อนใช้งาน', 'error');
      }
    } finally {
      setIsTriggeringPush(false);
    }
  };

  const handleTestPush = () => {
    const res = sendTestBrowserNotification();
    if (res.success) {
      onNotify(res.message, 'success');
    } else {
      onNotify(res.message, 'error');
    }
  };

  const handleToggleAutoPush = () => {
    const nextVal = !autoPush;
    setAutoPush(nextVal);
    setAutoPushEnabled(nextVal);
    onNotify(nextVal ? 'เปิดการแจ้งเตือนอัตโนมัติเมื่อเปิดระบบ' : 'ปิดการแจ้งเตือนอัตโนมัติ', 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right Drawer / Sidebar */}
      <aside 
        className="fixed inset-y-0 right-0 max-w-full w-full sm:w-[500px] lg:w-[540px] bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out border-l border-stone-200"
        aria-label="การแจ้งเตือนสัญญาและใบจอง"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between shrink-0 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-stone-800 border border-stone-700 text-amber-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-white tracking-tight">
                  การแจ้งเตือนงานเร่งด่วน
                </h2>
                {stats.totalAll > 0 && (
                  <span className="px-2 py-0.5 rounded bg-rose-700 text-white text-[11px] font-mono font-bold">
                    {stats.totalAll}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                สัญญาใกล้หมดอายุ & ใบจองรอเซ็นสัญญา
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            aria-label="ปิดไซด์บาร์"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar (ด้านบนไซด์บาร์) */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 shrink-0 space-y-2.5">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
            
            {/* Filter: All */}
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-stone-900 text-white font-bold shadow-2xs'
                  : 'bg-white text-stone-700 hover:text-stone-900 border border-stone-200'
              }`}
            >
              ทั้งหมด ({stats.totalAll})
            </button>

            {/* Filter: Expired */}
            <button
              type="button"
              onClick={() => setActiveFilter('expired')}
              className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === 'expired'
                  ? 'bg-rose-700 text-white font-bold shadow-2xs'
                  : 'bg-white text-rose-800 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              หมดสัญญาแล้ว ({stats.expired})
            </button>

            {/* Filter: 30 Days */}
            <button
              type="button"
              onClick={() => setActiveFilter('30')}
              className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === '30'
                  ? 'bg-amber-700 text-white font-bold shadow-2xs'
                  : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              30 วัน ({stats.within30})
            </button>

            {/* Filter: 60 Days */}
            <button
              type="button"
              onClick={() => setActiveFilter('60')}
              className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === '60'
                  ? 'bg-stone-800 text-white font-bold shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              60 วัน ({stats.within60})
            </button>

            {/* Filter: 90 Days */}
            <button
              type="button"
              onClick={() => setActiveFilter('90')}
              className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === '90'
                  ? 'bg-stone-800 text-white font-bold shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              90 วัน ({stats.within90})
            </button>

            {/* Filter: Pending Bookings */}
            <button
              type="button"
              onClick={() => setActiveFilter('booking')}
              className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                activeFilter === 'booking'
                  ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>รอเซ็น ({stats.pendingBookings})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขห้อง, ชื่อผู้เช่า/ผู้จอง, เบอร์โทร..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-100/70">

          {/* BROWSER PUSH NOTIFICATION ALERT CARD (สัญญาใกล้หมดอายุ 30 วัน) */}
          <div className="bg-white rounded-xl p-3.5 border border-amber-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 leading-tight flex items-center gap-1.5">
                    <span>การแจ้งเตือนสัญญา 30 วันบนหน้าจอ (Browser Push)</span>
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    แจ้งเตือนเด้งขึ้นหน้าจอเมื่อสัญญาใกล้ครบกำหนด เพื่อให้เจ้าหน้าที่เตรียมพร้อมล่วงหน้า
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border tabular-nums ${
                pushPermission === 'granted'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : pushPermission === 'denied'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {pushPermission === 'granted' ? '● เปิดใช้งาน' : pushPermission === 'denied' ? '✕ ถูกบล็อก' : '○ รอเปิดสิทธิ์'}
              </span>
            </div>

            {/* Action buttons based on permission */}
            {pushPermission === 'default' && (
              <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <span className="text-[11px] text-amber-800 font-medium">
                  มีสัญญาที่อยู่ในช่วง 30 วัน: <strong>{stats.within30} ห้อง</strong>
                </span>
                <button
                  type="button"
                  onClick={handleRequestPushPermission}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>เปิดการแจ้งเตือนเบราว์เซอร์</span>
                </button>
              </div>
            )}

            {pushPermission === 'granted' && (
              <div className="space-y-2 pt-1 border-t border-stone-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isTriggeringPush}
                      onClick={handleTriggerPushNow}
                      className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                      title="ส่งการแจ้งเตือนสัญญาใน 30 วันเด้งขึ้นหน้าจอทันที"
                    >
                      <Send className="w-3 h-3 text-amber-400" />
                      <span>ส่งแจ้งเตือน 30 วัน ({stats.within30} ห้อง)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestPush}
                      className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-xs font-medium border border-stone-200 transition-colors cursor-pointer"
                      title="ทดสอบส่งการแจ้งเตือนตัวอย่าง"
                    >
                      ทดสอบระบบ
                    </button>
                  </div>

                  {/* Auto-check switch */}
                  <label className="flex items-center gap-1.5 text-[11px] text-stone-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoPush}
                      onChange={handleToggleAutoPush}
                      className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>เตือนอัตโนมัติรายวัน</span>
                  </label>
                </div>
              </div>
            )}

            {pushPermission === 'denied' && (
              <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-100 text-[11px] text-rose-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">เบราว์เซอร์ถูกบล็อกการแจ้งเตือน</p>
                  <p className="text-[10px] text-rose-700 mt-0.5">
                    กรุณาคลิกไอคอนแม่กุญแจ 🔒 ที่แถบ URL ของเบราว์เซอร์ แล้วเลือก &quot;อนุญาตการแจ้งเตือน (Allow Notifications)&quot; เพื่อเปิดใช้งาน
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* SECTION 1: BOOKINGS (ถ้ามีใบจองรอเซ็น) */}
          {filteredItems.bookings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  ใบจองห้องชุดที่ยังไม่ถึงวันเซ็น / รอทำสัญญา ({filteredItems.bookings.length})
                </span>
              </div>

              {filteredItems.bookings.map((booking) => {
                const days = booking.daysUntilSign;
                const isOverdue = days !== null && days < 0;
                const isToday = days === 0;

                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-lg p-3.5 border border-stone-200 hover:border-stone-300 shadow-2xs transition-all space-y-2 cursor-pointer group"
                    onClick={() => {
                      if (booking.room) {
                        onClose();
                        onOpenRoomDetail(booking.room);
                      } else {
                        onNotify(`ไม่พบห้อง ${booking.roomNumber} ในระบบ`, 'info');
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-stone-900 font-mono bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          ห้อง {booking.roomNumber}
                        </span>

                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <FileCheck className="w-3 h-3 text-emerald-600" />
                          <span>ใบจอง {booking.receiptNumber}</span>
                        </span>
                      </div>

                      {/* Due Status */}
                      {isToday ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-700 text-white font-mono">
                          ครบกำหนดวันนี้
                        </span>
                      ) : isOverdue ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-mono">
                          เลยกำหนด {Math.abs(days!)} วัน
                        </span>
                      ) : days !== null ? (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono">
                          อีก {days} วันถึงกำหนด
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                          รอระบุวันเซ็น
                        </span>
                      )}
                    </div>

                    {/* Booking Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-xs text-stone-600 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-stone-500">ผู้จอง:</span>
                        <span className="font-semibold text-stone-900 truncate">{booking.customerName}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-stone-500">โทร:</span>
                        <a
                          href={`tel:${booking.customerPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono font-medium text-stone-800 hover:underline"
                        >
                          {booking.customerPhone}
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(booking.customerPhone, e)}
                          title="คัดลอกเบอร์โทร"
                          className="p-0.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-stone-500">นัดทำสัญญา:</span>
                        <span className="font-semibold text-emerald-800">
                          {formatDate(booking.contractSignDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-stone-500">มัดจำแล้ว:</span>
                        <span className="font-mono font-semibold text-stone-900">
                          ฿{booking.bookingAmount?.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                      <span className="text-[11px] text-stone-500">
                        จนท. {booking.agentName || 'นิติบุคคล'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (booking.room) {
                            onClose();
                            onOpenRoomDetail(booking.room);
                          } else {
                            onNotify(`ไม่พบห้อง ${booking.roomNumber} ในระบบ`, 'info');
                          }
                        }}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Building2 className="w-3 h-3 text-stone-600" />
                        <span>เปิดดูห้อง {booking.roomNumber}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION 2: LEASES (สัญญาใกล้หมดอายุ) */}
          {filteredItems.leases.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  สัญญาเช่าที่ต้องติดตาม ({filteredItems.leases.length})
                </span>
              </div>

              {filteredItems.leases.map((lease) => {
                const isExpired = lease.daysRemaining < 0;
                const isUrgent30 = lease.daysRemaining >= 0 && lease.daysRemaining <= 30;
                const isWithin60 = lease.daysRemaining > 30 && lease.daysRemaining <= 60;

                return (
                  <div
                    key={lease.id}
                    className="bg-white rounded-lg p-3.5 border border-stone-200 hover:border-stone-300 transition-all space-y-2 shadow-2xs cursor-pointer group"
                    onClick={() => {
                      if (lease.room) {
                        onClose();
                        onOpenRoomDetail(lease.room);
                      } else {
                        onNotify(`ไม่พบห้อง ${lease.roomNumber} ในระบบ`, 'info');
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-stone-900 font-mono bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          ห้อง {lease.roomNumber}
                        </span>

                        {lease.room?.floor && (
                          <span className="text-xs text-stone-500 font-medium">
                            ชั้น {lease.room.floor}
                          </span>
                        )}
                      </div>

                      {/* Expiry Badge */}
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold font-mono">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>หมดสัญญาแล้ว ({Math.abs(lease.daysRemaining)} วัน)</span>
                        </span>
                      ) : isUrgent30 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold font-mono">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>เหลือ {lease.daysRemaining} วัน</span>
                        </span>
                      ) : isWithin60 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px] font-medium font-mono">
                          <Clock className="w-3 h-3 text-stone-500" />
                          <span>เหลือ {lease.daysRemaining} วัน</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px] font-medium font-mono">
                          <Clock className="w-3 h-3 text-stone-500" />
                          <span>เหลือ {lease.daysRemaining} วัน</span>
                        </span>
                      )}
                    </div>

                    {/* Tenant Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-xs text-stone-600 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-stone-500">ผู้เช่า:</span>
                        <span className="font-semibold text-stone-900 truncate">{lease.tenantName}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-stone-500">โทร:</span>
                        <a
                          href={`tel:${lease.tenantPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono font-medium text-stone-800 hover:underline"
                        >
                          {lease.tenantPhone}
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(lease.tenantPhone, e)}
                          title="คัดลอกเบอร์โทร"
                          className="p-0.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-stone-500">สิ้นสุดสัญญา:</span>
                        <span className="font-semibold text-stone-900">{formatDate(lease.endDate)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-stone-500">ค่าเช่า:</span>
                        <span className="font-mono font-semibold text-stone-900">
                          ฿{lease.monthlyRent?.toLocaleString()} /ด.
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                      {lease.room ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onEditRoomLease(lease.room!);
                          }}
                          className="text-[11px] font-medium text-stone-700 hover:text-stone-900 flex items-center gap-1 underline cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>ต่อ/แก้ไขสัญญา</span>
                        </button>
                      ) : (
                        <span />
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (lease.room) {
                            onClose();
                            onOpenRoomDetail(lease.room);
                          } else {
                            onNotify(`ไม่พบห้อง ${lease.roomNumber} ในระบบ`, 'info');
                          }
                        }}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Building2 className="w-3 h-3 text-stone-600" />
                        <span>เปิดดูห้อง {lease.roomNumber}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* EMPTY STATE */}
          {filteredItems.leases.length === 0 && filteredItems.bookings.length === 0 && (
            <div className="py-16 px-4 text-center bg-white rounded-2xl border border-stone-200 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base text-stone-900">
                {searchQuery ? 'ไม่พบข้อมูลตามคำค้นหา' : 'ไม่มีรายการเร่งด่วนในหมวดหมู่นี้'}
              </h4>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                {searchQuery
                  ? 'ลองเปลี่ยนคำค้นหาเลขห้อง ชื่อ หรือเบอร์โทรใหม่อีกครั้ง'
                  : 'สัญญาทั้งหมดอยู่ในสถานะปกติ หรือไม่มีใบจองที่รอทำสัญญาในขณะนี้'}
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

        {/* Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToLeasesTab('all');
            }}
            className="text-xs font-bold text-stone-700 hover:text-stone-950 underline cursor-pointer"
          >
            ไปที่แท็บสัญญาเช่าทั้งหมด &rarr;
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            ปิดไซด์บาร์
          </button>
        </div>

      </aside>
    </div>
  );
};
