import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu, 
  X, 
  PlusCircle, 
  FileText, 
  Settings, 
  LogOut, 
  Building2, 
  Eye, 
  LayoutGrid, 
  List, 
  Search, 
  Edit3, 
  Trash2, 
  Printer, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Bell,
  Calendar, 
  DollarSign, 
  User, 
  Phone, 
  Maximize2, 
  Layers, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  Tag,
  ArrowUpDown,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Room, Lease, BookingReceipt, Facility, JuristicServiceItem, AppSettings, RoomStatus } from '../types';
import { calculateLeaseDaysAndStatus } from '../services/apiService';
import { 
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  checkAndNotifyExpiringLeases,
  isAutoPushEnabled
} from '../services/browserNotificationService';
import { RoomFormModal } from './admin/RoomFormModal';
import { IssueBookingQuickModal } from './admin/IssueBookingQuickModal';
import { WebSettingsModal } from './admin/WebSettingsModal';
import { ExpiringLeasesModal } from './admin/ExpiringLeasesModal';
import { NotificationSidebar } from './admin/NotificationSidebar';
import { SummaryDashboard } from './admin/SummaryDashboard';
import { RoomDetailModal } from './RoomDetailModal';

interface AdminPortalProps {
  rooms: Room[];
  leases: Lease[];
  bookings: BookingReceipt[];
  facilities: Facility[];
  juristicServices: JuristicServiceItem[];
  settings: AppSettings;
  onBackToCustomer: () => void;
  onLogout: () => void;
  onSaveRoom: (room: Room) => void;
  onDeleteRoom: (roomId: string, permanent?: boolean) => void;
  onSaveLease: (lease: Lease) => void;
  onDeleteLease: (leaseId: string) => void;
  onSaveBooking: (booking: BookingReceipt) => void;
  onSaveFacility: (facility: Facility) => void;
  onDeleteFacility: (facilityId: string) => void;
  onSaveJuristicService: (service: JuristicServiceItem) => void;
  onDeleteJuristicService: (serviceId: string) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onOpenHorizontalFlyer: (room: Room) => void;
  onOpenBookingReceipt: (room?: Room | null, receipt?: BookingReceipt | null) => void;
  onTestGasConnection?: (url: string) => Promise<any>;
  onSyncGas?: () => Promise<any>;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  rooms,
  leases,
  bookings,
  facilities,
  juristicServices,
  settings,
  onBackToCustomer,
  onLogout,
  onSaveRoom,
  onDeleteRoom,
  onSaveLease,
  onDeleteLease,
  onSaveBooking,
  onSaveFacility,
  onDeleteFacility,
  onSaveJuristicService,
  onDeleteJuristicService,
  onUpdateSettings,
  onOpenHorizontalFlyer,
  onOpenBookingReceipt,
  onTestGasConnection,
  onSyncGas,
  onNotify
}) => {
  // Sidebar Drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 4 Primary Action Tabs (สำหรับระดับทั่วไปทำงาน):
  // 'publish' (โพสต์), 'pending' (รอดำเนินการ), 'lease' (สัญญา), 'summary' (ภาพรวม / แดชบอร์ด)
  const [currentTab, setCurrentTab] = useState<'publish' | 'pending' | 'lease' | 'summary'>('publish');

  // Filter by room type (for 'publish' & 'pending' tabs): 'all' | 'studio' | '1bd' | '2bd'
  const [roomTypeFilter, setRoomTypeFilter] = useState<'all' | 'studio' | '1bd' | '2bd'>('all');

  // Filter by lease expiry duration (for 'lease' tab): 'all' | '30' | '60' | 'expired' | 'active'
  const [leaseExpiryFilter, setLeaseExpiryFilter] = useState<'all' | '30' | '60' | 'expired' | 'active'>('all');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Display Mode: 'card' (การ์ด) vs 'row' (โรล / ตาราง)
  const [viewMode, setViewMode] = useState<'card' | 'row'>('card');

  // Modals state
  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Partial<Room> | null>(null);

  const [isBookingQuickModalOpen, setIsBookingQuickModalOpen] = useState(false);
  const [bookingPreselectedRoom, setBookingPreselectedRoom] = useState<Room | null>(null);

  const [isWebSettingsOpen, setIsWebSettingsOpen] = useState(false);
  const [isNotificationSidebarOpen, setIsNotificationSidebarOpen] = useState(false);

  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState<Room | null>(null);

  // Status dropdown menu state for individual rooms
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);

  // Calculate urgent notifications count (leases <= 90 days / expired + pending bookings)
  const urgentNotificationsCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiringCount = leases.filter(l => {
      const { daysRemaining } = calculateLeaseDaysAndStatus(l.endDate);
      return daysRemaining <= 90; // Includes expired (< 0) and upcoming <= 90 days
    }).length;

    const pendingBookingCount = bookings.filter(b => {
      if (!b.contractSignDate) return true;
      const signDate = new Date(b.contractSignDate);
      signDate.setHours(0, 0, 0, 0);
      const diffTime = signDate.getTime() - today.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return days >= -3; // Pending sign
    }).length;

    return expiringCount + pendingBookingCount;
  }, [leases, bookings]);

  // Tab counts
  const publishedRoomsCount = useMemo(() => {
    return rooms.filter(r => !r.isTrash && r.status !== 'rented' && r.isPublished).length;
  }, [rooms]);

  const pendingRoomsCount = useMemo(() => {
    return rooms.filter(r => !r.isTrash && r.status !== 'rented' && !r.isPublished).length;
  }, [rooms]);

  const leasedRoomsCount = useMemo(() => {
    return rooms.filter(r => !r.isTrash && r.status === 'rented').length;
  }, [rooms]);

  // Lease tab duration breakdown counts
  const leaseCounts = useMemo(() => {
    let count30 = 0;
    let count60 = 0;
    let countExpired = 0;
    let countActive = 0;

    leases.forEach(l => {
      const { daysRemaining } = calculateLeaseDaysAndStatus(l.endDate);
      if (daysRemaining < 0) {
        countExpired++;
      } else {
        if (daysRemaining <= 30) count30++;
        if (daysRemaining <= 60) count60++;
        if (daysRemaining > 60) countActive++;
      }
    });

    return { count30, count60, countExpired, countActive };
  }, [leases]);

  // Map lease to room by roomNumber or roomId
  const getLeaseForRoom = (room: Room): Lease | undefined => {
    return leases.find(l => l.roomId === room.id || l.roomNumber === room.roomNumber);
  };

  // Filtered rooms for active tab
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Ignore trash in primary tabs
      if (room.isTrash) return false;

      // 1. Tab filter
      if (currentTab === 'publish') {
        if (room.status === 'rented' || !room.isPublished) return false;
      } else if (currentTab === 'pending') {
        if (room.status === 'rented' || room.isPublished) return false;
      } else if (currentTab === 'lease') {
        if (room.status !== 'rented') return false;

        // Lease expiry duration filter (only applies to 'lease' tab)
        if (leaseExpiryFilter !== 'all') {
          const lease = getLeaseForRoom(room);
          if (!lease) return false;
          const { daysRemaining } = calculateLeaseDaysAndStatus(lease.endDate);
          if (leaseExpiryFilter === '30') {
            if (daysRemaining < 0 || daysRemaining > 30) return false;
          } else if (leaseExpiryFilter === '60') {
            if (daysRemaining < 0 || daysRemaining > 60) return false;
          } else if (leaseExpiryFilter === 'expired') {
            if (daysRemaining >= 0) return false;
          } else if (leaseExpiryFilter === 'active') {
            if (daysRemaining <= 60) return false;
          }
        }
      }

      // 2. Room Type filter (Only applies to 'publish' and 'pending' tabs, NOT 'lease')
      if (currentTab !== 'lease') {
        if (roomTypeFilter === 'studio') {
          if (room.bedrooms !== 0) return false;
        } else if (roomTypeFilter === '1bd') {
          if (room.bedrooms !== 1) return false;
        } else if (roomTypeFilter === '2bd') {
          if (room.bedrooms !== 2) return false;
        }
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const lease = getLeaseForRoom(room);
        const matchRoomNum = room.roomNumber.toLowerCase().includes(q);
        const matchFloor = String(room.floor).toLowerCase().includes(q);
        const matchTenant = lease?.tenantName?.toLowerCase().includes(q) || false;
        const matchOwner = room.ownerName?.toLowerCase().includes(q) || false;
        const matchNotes = room.staffNotes?.toLowerCase().includes(q) || false;
        const matchDesc = room.description?.toLowerCase().includes(q) || false;
        if (!matchRoomNum && !matchFloor && !matchTenant && !matchOwner && !matchNotes && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }, [rooms, leases, currentTab, roomTypeFilter, leaseExpiryFilter, searchQuery]);

  // Handle Quick Status Change
  const handleChangeStatus = (room: Room, targetStatus: 'publish' | 'pending' | 'rented') => {
    setActiveStatusDropdownId(null);
    let updated: Room = { ...room };

    if (targetStatus === 'publish') {
      updated = {
        ...room,
        isPublished: true,
        status: 'available',
        isTrash: false,
        updatedAt: new Date().toISOString()
      };
      onSaveRoom(updated);
      onNotify(`ห้อง ${room.roomNumber} โพสต์สาธารณะแล้ว`, 'success');
    } else if (targetStatus === 'pending') {
      updated = {
        ...room,
        isPublished: false,
        status: 'pending',
        isTrash: false,
        updatedAt: new Date().toISOString()
      };
      onSaveRoom(updated);
      onNotify(`ห้อง ${room.roomNumber} ย้ายไปที่ "รอดำเนินการ" แล้ว`, 'info');
    } else if (targetStatus === 'rented') {
      // If setting to rented without existing lease, open RoomFormModal in rented status to input lease details
      setEditingRoom({ ...room, status: 'rented' });
      setIsRoomFormOpen(true);
    }
  };

  // Automated Browser Push Notification for Leases Expiring Within 30 Days
  useEffect(() => {
    if (getBrowserNotificationPermission() === 'granted' && isAutoPushEnabled()) {
      const result = checkAndNotifyExpiringLeases(leases, {
        force: false,
        onNotificationClick: (lease) => {
          setCurrentTab('lease');
          setLeaseExpiryFilter('30');
          setIsNotificationSidebarOpen(true);
        }
      });
      if (result.sentCount > 0) {
        onNotify(`🔔 แจ้งเตือนสัญญาใกล้หมดอายุ 30 วันผ่านเบราว์เซอร์แล้ว ${result.sentCount} รายการ`, 'info');
      }
    }
  }, [leases]);

  const handleTriggerBrowserPush = async () => {
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
      onNotificationClick: (_lease) => {
        setCurrentTab('lease');
        setLeaseExpiryFilter('30');
      }
    });

    if (res.totalExpiring === 0) {
      onNotify('ขณะนี้ไม่มีสัญญาที่ใกล้หมดอายุใน 30 วัน', 'info');
    } else {
      onNotify(`ส่งการแจ้งเตือนสัญญาใกล้หมดอายุ 30 วัน (${res.totalExpiring} ห้อง) ไปยังหน้าจอแล้ว`, 'success');
    }
  };

  // Handle Move to Trash
  const handleMoveToTrash = (room: Room) => {
    if (confirm(`คุณต้องการย้ายห้อง ${room.roomNumber} ไปที่ถังขยะหรือไม่? (สามารถกู้คืนได้ภายใน 60 วัน)`)) {
      const trashedRoom: Room = {
        ...room,
        isTrash: true,
        trashedAt: new Date().toISOString()
      };
      onSaveRoom(trashedRoom);
      onNotify(`ย้ายห้อง ${room.roomNumber} ไปยังถังขยะเรียบร้อย`, 'info');
    }
  };

  // Handle Restore from Trash
  const handleRestoreFromTrash = (room: Room) => {
    const restored: Room = {
      ...room,
      isTrash: false,
      trashedAt: undefined
    };
    onSaveRoom(restored);
    onNotify(`กู้คืนห้อง ${room.roomNumber} สำเร็จ`, 'success');
  };

  // Handle Save from RoomFormModal
  const handleSaveRoomForm = (roomPayload: Room, leasePayload?: Partial<Lease>) => {
    onSaveRoom(roomPayload);
    if (leasePayload && leasePayload.tenantName) {
      const fullLease: Lease = {
        id: `lease-${Date.now()}`,
        roomId: roomPayload.id,
        roomNumber: roomPayload.roomNumber,
        condoName: roomPayload.condoName,
        tenantName: leasePayload.tenantName || 'ผู้เช่า',
        tenantPhone: leasePayload.tenantPhone || '-',
        startDate: leasePayload.startDate || new Date().toISOString().split('T')[0],
        endDate: leasePayload.endDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        monthlyRent: leasePayload.monthlyRent || roomPayload.rentPrice || 10000,
        depositAmount: leasePayload.depositAmount || (roomPayload.rentPrice ? roomPayload.rentPrice * 2 : 20000),
        contractUrl: leasePayload.contractUrl,
        status: 'active'
      };
      onSaveLease(fullLease);
    }
  };

  // Handle Quick Booking Save
  const handleQuickBookingSave = (newBooking: BookingReceipt, targetRoomId: string) => {
    onSaveBooking(newBooking);
    // Automatically set room to pending
    const targetRoom = rooms.find(r => r.id === targetRoomId);
    if (targetRoom) {
      onSaveRoom({
        ...targetRoom,
        isPublished: false,
        status: 'pending'
      });
    }
    // Also open receipt modal for viewing/printing
    onOpenBookingReceipt(targetRoom || null, newBooking);
  };

  // Rooms available for issuing booking (must be published or pending)
  const roomsAvailableForBooking = useMemo(() => {
    return rooms.filter(r => !r.isTrash && r.status !== 'rented');
  }, [rooms]);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col text-stone-900 pb-16">
      
      {/* 1. TOP NAVBAR WITH HAMBURGER MENU (MATCHING REFERENCE / SCREENSHOT DESIGN) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between border-b border-stone-200 shadow-2xs">
        {/* Left: Brand Logo + Subtitle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div 
            onClick={onBackToCustomer}
            className="flex items-center gap-2 cursor-pointer select-none group"
            title="คลิกเพื่อกลับสู่หน้าแรกเว็บไซต์ลูกค้า"
          >
            <span className="font-black text-2xl sm:text-3xl tracking-widest text-stone-900 font-sans group-hover:text-stone-700 transition-colors">
              HORIZON
            </span>
            <span className="text-stone-500 font-bold text-xs sm:text-sm ml-0.5 select-none tracking-tight">
              Admin Panel
            </span>
          </div>
        </div>

        {/* Right: Customer View Link, Bell Notification, Hamburger Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Link to Customer View */}
          <button
            type="button"
            onClick={onBackToCustomer}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold border border-stone-300 shadow-2xs transition-all cursor-pointer"
            title="ดูหน้าเว็บไซต์สำหรับลูกค้า"
          >
            <Eye className="w-3.5 h-3.5 text-stone-700" />
            <span>ดูหน้าลูกค้า</span>
          </button>

          {/* Urgent Notifications Bell Button with Red Badge */}
          <button
            id="admin-bell-btn"
            type="button"
            onClick={() => setIsNotificationSidebarOpen(true)}
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-stone-50 text-stone-700 shadow-2xs border border-stone-200/90 flex items-center justify-center transition-all cursor-pointer"
            title={
              urgentNotificationsCount > 0
                ? `มีการแจ้งเตือนสัญญาใกล้หมดอายุ & ใบจอง ${urgentNotificationsCount} รายการ`
                : 'การแจ้งเตือนสัญญา & ใบจอง'
            }
            aria-label="การแจ้งเตือนงานเร่งด่วน"
          >
            <Bell className="w-4 h-4 text-stone-700" />
            {urgentNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[10px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center shadow-xs border-2 border-white tabular-nums">
                {urgentNotificationsCount}
              </span>
            )}
          </button>

          {/* HAMBURGER MENU BUTTON (Circular Clean Button) */}
          <button
            id="admin-hamburger-btn"
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-stone-50 text-stone-800 shadow-2xs border border-stone-200/90 flex items-center justify-center transition-all cursor-pointer"
            aria-label="เปิดเมนูแอดมิน"
            title="เมนูจัดการระบบ"
          >
            <Menu className="w-5 h-5 text-stone-800" />
          </button>
        </div>
      </header>

      {/* 2. HAMBURGER SLIDE-OVER SIDEBAR (ไซด์บาร์ เมื่อคลิกแฮมเบอร์เกอร์เมนู) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop with soft blur */}
          <div 
            className="fixed inset-0 bg-stone-950/45 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <div className="w-screen max-w-md bg-white text-stone-900 shadow-2xl flex flex-col justify-between border-l border-stone-200 animate-in slide-in-from-right duration-300 h-full">
              
              {/* Top Header */}
              <div className="px-5 sm:px-6 py-4 bg-[#FAF9F5] border-b border-stone-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-black text-xl sm:text-2xl tracking-widest text-stone-900 font-sans">
                    HORIZON
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200/80 text-stone-700">
                    Admin Menu
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-8 h-8 rounded-full bg-white hover:bg-stone-200 text-stone-500 hover:text-stone-800 border border-stone-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  title="ปิดเมนู"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-white">
                
                {/* Juristic Admin Info Card */}
                <div className="bg-gradient-to-br from-stone-50 to-stone-100/80 border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Building2 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                          ฝ่ายบริหารอาคารและทรัพย์สิน
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ออนไลน์
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                        แบงค์คอก ฮอไรซอน ราม 60 (Juristic Portal)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Group 1: Core Operations */}
                <div className="space-y-2">
                  <div className="px-1 text-[10px] font-bold tracking-wider uppercase text-stone-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>การจัดการหลัก (Core Operations)</span>
                  </div>

                  {/* 1. Add Room Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setEditingRoom(null);
                      setIsRoomFormOpen(true);
                    }}
                    className="w-full p-3 sm:p-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-stone-100 flex items-center gap-1.5">
                          <span>เพิ่มห้องชุดใหม่</span>
                          <span className="text-[10px] font-medium bg-stone-800 text-amber-300 px-1.5 py-0.5 rounded">แนะนำ</span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5 font-normal">
                          กรอกข้อมูลห้อง, ภาพถ่าย, สัญญาเช่า
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* 2. Issue Booking Receipt */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setBookingPreselectedRoom(null);
                      setIsBookingQuickModalOpen(true);
                    }}
                    className="w-full p-3 sm:p-3.5 rounded-xl bg-white hover:bg-stone-50 text-stone-900 border border-stone-200/90 hover:border-stone-300 font-medium text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-stone-900">ออกใบจองห้องชุด</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          สร้างใบจองและพิมพ์ใบเสร็จมัดจำ
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* 3. Manage Leases */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setCurrentTab('lease');
                    }}
                    className="w-full p-3 sm:p-3.5 rounded-xl bg-white hover:bg-stone-50 text-stone-900 border border-stone-200/90 hover:border-stone-300 font-medium text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/70 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-stone-900 flex items-center gap-2">
                          <span>รายการสัญญาเช่า</span>
                          {leaseCounts.count30 > 0 && (
                            <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full">
                              ใกล้ครบ {leaseCounts.count30}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          ตรวจสอบวันสิ้นสุดสัญญาและการต่ออายุ
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>

                {/* Group 2: Views & Analytics */}
                <div className="space-y-2">
                  <div className="px-1 text-[10px] font-bold tracking-wider uppercase text-stone-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>มุมมองและรายงาน (Views & Analytics)</span>
                  </div>

                  {/* Dashboard Summary */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setCurrentTab('summary');
                    }}
                    className="w-full p-2.5 sm:p-3 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/80 hover:border-stone-300 font-medium text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-stone-900">สรุปภาพรวม & ค่าคอมมิชชั่น</div>
                        <div className="text-[11px] text-stone-500">อัตราการเช่าและสถิติรายเดือน</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* Storefront Customer View */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      onBackToCustomer();
                    }}
                    className="w-full p-2.5 sm:p-3 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/80 hover:border-stone-300 font-medium text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-stone-900">ดูเว็บไซต์มุมมองลูกค้า</div>
                        <div className="text-[11px] text-stone-500">สลับไปยังหน้าร้านค้าสาธารณะ</div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-colors" />
                  </button>

                  {/* Notification Center */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setIsNotificationSidebarOpen(true);
                    }}
                    className="w-full p-2.5 sm:p-3 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/80 hover:border-stone-300 font-medium text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-stone-900 flex items-center gap-1.5">
                          <span>ศูนย์แจ้งเตือนสัญญา</span>
                          {urgentNotificationsCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-600" />
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500">ตั้งค่าแจ้งเตือนเบราว์เซอร์ 30 วัน</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>

                {/* Group 3: System & Trash */}
                <div className="space-y-2">
                  <div className="px-1 text-[10px] font-bold tracking-wider uppercase text-stone-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                    <span>ระบบและความปลอดภัย (Settings & Maintenance)</span>
                  </div>

                  {/* Web Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setIsWebSettingsOpen(true);
                    }}
                    className="w-full p-2.5 sm:p-3 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/80 hover:border-stone-300 font-medium text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-stone-900">ตั้งค่าเว็บไซต์ & ข้อมูลติดต่อ</div>
                        <div className="text-[11px] text-stone-500">เบอร์โทร, LINE ID, ส่วนกลาง, ภาพแบนเนอร์</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* Trash Bin */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setIsWebSettingsOpen(true);
                    }}
                    className="w-full p-2.5 sm:p-3 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/80 hover:border-stone-300 font-medium text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-stone-900">ถังขยะกู้คืนห้องชุด (60 วัน)</div>
                        <div className="text-[11px] text-stone-500">กู้คืนห้องที่ถูกลบชั่วคราว</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>

                {/* Unpinned Log Out Button & System Info (Part of scrollable list) */}
                <div className="pt-2 border-t border-stone-100 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      onLogout();
                    }}
                    className="w-full p-2.5 sm:p-3 rounded-xl bg-rose-50 hover:bg-rose-100/90 text-rose-700 border border-rose-200/80 font-medium text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-100/80 text-rose-700 flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-rose-700">ออกจากระบบแอดมิน</div>
                        <div className="text-[11px] text-rose-700/80">สิ้นสุดเซสชันเจ้าหน้าที่ (Sign Out)</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-stone-600 px-1 pt-1 font-medium">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
                      <span>ระบบรักษาความปลอดภัย TLS</span>
                    </span>
                    <span>Bangkok Horizon v2.4</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 w-full mt-4 sm:mt-6 flex-1 space-y-4 sm:space-y-6">

        {/* DASHBOARD TOP: 4 MAIN TABS (โพสต์, รอดำเนินการ, สัญญา, ภาพรวม/แดชบอร์ด) */}
        <div className="bg-white rounded-xl p-1.5 shadow-2xs border border-stone-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            
            {/* 1. โพสต์ (Published) */}
            <button
              onClick={() => setCurrentTab('publish')}
              className={`p-3.5 rounded-lg text-left transition-all duration-200 cursor-pointer flex flex-col justify-between border hover:-translate-y-1 hover:shadow-md active:translate-y-0 ${
                currentTab === 'publish'
                  ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${currentTab === 'publish' ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
                  <span className="font-bold text-sm sm:text-base">โพสต์</span>
                </div>
                <span className="min-w-[1.375rem] h-5.5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs tabular-nums">
                  {publishedRoomsCount}
                </span>
              </div>
              <p className={`text-xs line-clamp-1 ${currentTab === 'publish' ? 'text-stone-300' : 'text-stone-700'}`}>
                โชว์สาธารณะบนหน้าเว็บ
              </p>
            </button>

            {/* 2. ดำเนินการ (Pending) */}
            <button
              onClick={() => setCurrentTab('pending')}
              className={`p-3.5 rounded-lg text-left transition-all duration-200 cursor-pointer flex flex-col justify-between border hover:-translate-y-1 hover:shadow-md active:translate-y-0 ${
                currentTab === 'pending'
                  ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${currentTab === 'pending' ? 'bg-amber-400' : 'bg-amber-600'}`} />
                  <span className="font-bold text-sm sm:text-base">ดำเนินการ</span>
                </div>
                <span className="min-w-[1.375rem] h-5.5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs tabular-nums">
                  {pendingRoomsCount}
                </span>
              </div>
              <p className={`text-xs line-clamp-1 ${currentTab === 'pending' ? 'text-stone-300' : 'text-stone-700'}`}>
                ติดจอง / เตรียมข้อมูล
              </p>
            </button>

            {/* 3. สัญญา (Lease / Rented) */}
            <button
              onClick={() => setCurrentTab('lease')}
              className={`p-3.5 rounded-lg text-left transition-all duration-200 cursor-pointer flex flex-col justify-between border hover:-translate-y-1 hover:shadow-md active:translate-y-0 ${
                currentTab === 'lease'
                  ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${currentTab === 'lease' ? 'bg-blue-400' : 'bg-blue-600'}`} />
                  <span className="font-bold text-sm sm:text-base">สัญญา</span>
                </div>
                <span className="min-w-[1.375rem] h-5.5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs tabular-nums">
                  {leasedRoomsCount}
                </span>
              </div>
              <p className={`text-xs line-clamp-1 ${currentTab === 'lease' ? 'text-stone-300' : 'text-stone-700'}`}>
                ติดสัญญา / ติดตามหมดอายุ
              </p>
            </button>

            {/* 4. แดชบอร์ดภาพรวม (Summary Dashboard & ค่าคอมมิชชั่น) */}
            <button
              onClick={() => setCurrentTab('summary')}
              className={`p-3.5 rounded-lg text-left transition-all duration-200 cursor-pointer flex flex-col justify-between border hover:-translate-y-1 hover:shadow-md active:translate-y-0 ${
                currentTab === 'summary'
                  ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${currentTab === 'summary' ? 'bg-amber-400' : 'bg-stone-400'}`} />
                  <span className="font-bold text-sm sm:text-base">ภาพรวม</span>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  currentTab === 'summary' 
                    ? 'bg-stone-800 border-stone-700 text-amber-300' 
                    : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  สถิติ & คอม
                </span>
              </div>
              <p className={`text-xs line-clamp-1 ${currentTab === 'summary' ? 'text-stone-300' : 'text-stone-700'}`}>
                สัดส่วนห้อง, ค่าเช่า, คอมมิชชั่น
              </p>
            </button>

          </div>
        </div>

        {/* CONDITION 1: IF SUMMARY TAB IS SELECTED, RENDER SUMMARY DASHBOARD */}
        {currentTab === 'summary' && (
          <SummaryDashboard 
            rooms={rooms}
            leases={leases}
            bookings={bookings}
            onSelectRoomFilter={(filterType) => {
              if (filterType === 'available') {
                setCurrentTab('publish');
              } else if (filterType === 'rented') {
                setCurrentTab('lease');
              } else if (filterType === 'pending') {
                setCurrentTab('pending');
              }
            }}
          />
        )}

        {/* CONDITION 2: FOR PUBLISH, PENDING, LEASE TABS -> SHOW FILTER BAR AND ROOM ITEMS */}
        {currentTab !== 'summary' && (
          <>
            {/* 4. FILTERS & DISPLAY CONTROLS BAR */}
        <div className="bg-white rounded-xl p-4 shadow-2xs border border-stone-200 space-y-3">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-700" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={currentTab === 'lease' ? "ค้นหาเลขห้อง, ชั้น, ชื่อผู้เช่า, เบอร์โทร..." : "ค้นหาเลขห้อง, ชั้น, ชื่อเจ้าของ, บันทึก..."}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 bg-stone-50/50 focus:bg-white focus:ring-1 focus:ring-stone-900 focus:border-stone-900 focus:outline-none transition-all placeholder:text-stone-700"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-stone-700 hover:text-stone-900 p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Group: Lease Expiry for 'lease' tab, Room Type for 'publish' & 'pending' tabs */}
            {currentTab === 'lease' ? (
              <div className="flex items-center p-1 bg-stone-100 rounded-lg border border-stone-200 text-xs shrink-0 overflow-x-auto gap-1">
                <button
                  type="button"
                  onClick={() => setLeaseExpiryFilter('all')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap cursor-pointer ${
                    leaseExpiryFilter === 'all'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  ทั้งหมด ({leasedRoomsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaseExpiryFilter('30')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    leaseExpiryFilter === '30'
                      ? 'bg-rose-700 text-white shadow-2xs font-bold'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span>หมด ≤ 30 วัน</span>
                  {leaseCounts.count30 > 0 && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      leaseExpiryFilter === '30' ? 'bg-rose-900 text-white' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {leaseCounts.count30}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setLeaseExpiryFilter('60')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    leaseExpiryFilter === '60'
                      ? 'bg-amber-700 text-white shadow-2xs font-bold'
                      : 'text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  <span>หมด ≤ 60 วัน</span>
                  {leaseCounts.count60 > 0 && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      leaseExpiryFilter === '60' ? 'bg-amber-900 text-white' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {leaseCounts.count60}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setLeaseExpiryFilter('expired')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap cursor-pointer ${
                    leaseExpiryFilter === 'expired'
                      ? 'bg-stone-900 text-white shadow-2xs font-bold'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  <span>หมดสัญญาแล้ว</span>
                  {leaseCounts.countExpired > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-stone-200 text-stone-800 font-mono font-bold">
                      {leaseCounts.countExpired}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setLeaseExpiryFilter('active')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap cursor-pointer ${
                    leaseExpiryFilter === 'active'
                      ? 'bg-blue-700 text-white shadow-2xs font-bold'
                      : 'text-blue-800 hover:bg-blue-50'
                  }`}
                >
                  <span>สัญญาปกติ ({leaseCounts.countActive})</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center p-1 bg-stone-100 rounded-lg border border-stone-200 text-xs shrink-0 overflow-x-auto gap-0.5">
                <button
                  type="button"
                  onClick={() => setRoomTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap cursor-pointer ${
                    roomTypeFilter === 'all'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setRoomTypeFilter('studio')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap cursor-pointer ${
                    roomTypeFilter === 'studio'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  Studio
                </button>
                <button
                  type="button"
                  onClick={() => setRoomTypeFilter('1bd')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap cursor-pointer ${
                    roomTypeFilter === '1bd'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  1 Bedroom
                </button>
                <button
                  type="button"
                  onClick={() => setRoomTypeFilter('2bd')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap cursor-pointer ${
                    roomTypeFilter === '2bd'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  2 Bedroom
                </button>
              </div>
            )}

            {/* View Mode Toggle: การ์ด (Card View) vs โรล / ตาราง (Row View) + Quick Add Room */}
            <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
              <div className="flex items-center p-1 bg-stone-100 rounded-lg border border-stone-200">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
                    viewMode === 'card'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                  title="แสดงผลแบบการ์ด"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">การ์ด</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('row')}
                  className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
                    viewMode === 'row'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                  title="แสดงผลแบบตาราง"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ตาราง</span>
                </button>
              </div>

              {/* Quick Add Room button - ONLY show in 'publish' and 'pending' tabs, NOT in 'lease' tab */}
              {currentTab !== 'lease' && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoom(null);
                    setIsRoomFormOpen(true);
                  }}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>เพิ่มห้อง</span>
                </button>
              )}

              {/* Quick Browser Push Alert button for 'lease' tab */}
              {currentTab === 'lease' && (
                <button
                  type="button"
                  onClick={handleTriggerBrowserPush}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#FAF5FF] hover:bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF] font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="ส่งการแจ้งเตือนสัญญาใกล้หมดอายุ 30 วันไปยังหน้าจอเบราว์เซอร์ทันที"
                >
                  <Bell className="w-3.5 h-3.5 text-[#7E22CE]" />
                  <span>แจ้งเตือนสัญญา 30 วันบนหน้าจอ</span>
                  {leaseCounts.count30 > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {leaseCounts.count30}
                    </span>
                  )}
                </button>
              )}
            </div>

          </div>

          {/* Result counter summary */}
          <div className="flex items-center justify-between text-xs text-stone-700 pt-1 border-t border-stone-100">
            <div>
              กำลังแสดง <strong className="text-stone-900 font-bold font-mono">{filteredRooms.length}</strong> ห้องชุด 
              {currentTab === 'publish' && ' (สถานะโพสต์ออนไลน์)'}
              {currentTab === 'pending' && ' (สถานะรอดำเนินการ)'}
              {currentTab === 'lease' && (
                leaseExpiryFilter === '30' ? ' (สัญญาใกล้หมดอายุ ≤ 30 วัน)' :
                leaseExpiryFilter === '60' ? ' (สัญญาใกล้หมดอายุ ≤ 60 วัน)' :
                leaseExpiryFilter === 'expired' ? ' (หมดสัญญาแล้ว)' :
                leaseExpiryFilter === 'active' ? ' (สัญญาปกติ > 60 วัน)' : ' (สถานะติดสัญญาเช่าทั้งหมด)'
              )}
            </div>
            <div className="text-[11px] text-stone-700 hidden sm:block">
              คลิกที่ห้องเพื่อดูรายละเอียด หรือกดแก้ไขเพื่อเปลี่ยนข้อมูล
            </div>
          </div>

        </div>

        {/* 5. ROOMS DISPLAY: CARD VIEW vs ROW VIEW */}
        {filteredRooms.length > 0 ? (
          viewMode === 'card' ? (
            /* CARD VIEW GRID */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRooms.map((room) => {
                const lease = getLeaseForRoom(room);
                const leaseStatus = lease ? calculateLeaseDaysAndStatus(lease.endDate) : null;
                const coverImage = room.images && room.images.length > 0 ? room.images[0] : null;

                return (
                  <div
                    key={room.id}
                    className="bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-stone-400 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
                  >
                    {/* Card Top: Image + Badges (Clicking image opens Detail Modal) */}
                    <div 
                      onClick={() => setSelectedRoomForDetail(room)}
                      className="relative aspect-16/10 bg-stone-100 cursor-pointer overflow-hidden select-none flex items-center justify-center"
                    >
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={`ห้อง ${room.roomNumber}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100/90 text-stone-400 p-4">
                          <ImageIcon className="w-8 h-8 text-stone-300 stroke-[1.5] mb-1" />
                          <span className="text-xs font-semibold text-stone-500">ยังไม่มีรูปภาพ</span>
                          <span className="text-[10px] text-stone-400 mt-0.5">คลิกเพื่อดูรายละเอียดหรือเพิ่มรูป</span>
                        </div>
                      )}

                      {/* Top Left: Room & Floor Tag */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-stone-900/90 text-white backdrop-blur-xs">
                          ห้อง {room.roomNumber}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-stone-800/80 text-stone-200 backdrop-blur-xs">
                          ชั้น {room.floor}
                        </span>
                      </div>

                      {/* Right Tab Status Badge */}
                      <div className="absolute top-2.5 right-2.5">
                        {room.status === 'rented' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-700 text-white">
                            ติดสัญญา
                          </span>
                        ) : room.isPublished ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-700 text-white">
                            โพสต์ออนไลน์
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-700 text-white">
                            รอดำเนินการ
                          </span>
                        )}
                      </div>

                      {/* Lease Days Remaining Pill (if rented) */}
                      {leaseStatus && (
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className={`px-2.5 py-1 rounded text-xs backdrop-blur-xs flex items-center justify-between ${
                            leaseStatus.status === 'expiring_30' || leaseStatus.status === 'expired'
                              ? 'bg-rose-900/90 text-white font-bold'
                              : leaseStatus.status === 'expiring_60'
                              ? 'bg-amber-900/90 text-white font-bold'
                              : 'bg-stone-900/90 text-stone-200'
                          }`}>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[120px]">{lease?.tenantName || 'ผู้เช่า'}</span>
                            </span>
                            <span className="font-mono font-bold">
                              {leaseStatus.status === 'expired' 
                                ? 'หมดสัญญาแล้ว' 
                                : `เหลือ ${leaseStatus.daysRemaining} วัน`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Middle: Specs, Pricing, Notes (Clicking opens Detail Modal) */}
                    <div 
                      onClick={() => setSelectedRoomForDetail(room)}
                      className="p-4 cursor-pointer space-y-2 flex-1"
                    >
                      {/* Pricing */}
                      <div className="flex items-baseline justify-between">
                        <div>
                          {room.rentPrice ? (
                            <span className="font-bold text-lg text-stone-900 font-mono tabular-nums">
                              ฿{room.rentPrice.toLocaleString()}
                              <span className="text-xs text-stone-700 font-normal"> /เดือน</span>
                            </span>
                          ) : room.salePrice ? (
                            <span className="font-bold text-lg text-stone-900 font-mono tabular-nums">
                              ฿{room.salePrice.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-stone-700 italic">ยังไม่ระบุราคา</span>
                          )}
                        </div>

                        <span className="text-xs font-medium text-stone-700 font-mono">
                          {room.bedrooms === 0 ? 'Studio' : `${room.bedrooms} Bed`} · {room.areaSqM} ตร.ม.
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-stone-700 line-clamp-2 leading-relaxed">
                        {room.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                      </p>

                      {/* Admin staff notes (Internal) */}
                      {room.staffNotes && (
                        <div className="p-2 rounded bg-stone-50 border border-stone-200 text-[11px] text-stone-700 flex items-start gap-1.5">
                          <span className="font-semibold text-stone-800 shrink-0">บันทึก:</span>
                          <span className="line-clamp-1">{room.staffNotes}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Bottom: Quick Actions Bar */}
                    <div className="p-2.5 bg-stone-50/80 border-t border-stone-200 flex items-center justify-between gap-1.5">
                      
                      {/* Left Actions: Edit & Booking */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoom(room);
                            setIsRoomFormOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded bg-white border border-stone-300 text-stone-800 hover:bg-stone-100 hover:scale-105 active:scale-95 text-xs font-medium flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                          title="แก้ไขข้อมูลห้อง"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-stone-700" />
                          <span>แก้ไข</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setBookingPreselectedRoom(room);
                            setIsBookingQuickModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded bg-amber-700 hover:bg-amber-800 hover:scale-105 active:scale-95 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                          title="ออกใบจองห้องนี้"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">ออกใบจอง</span>
                        </button>
                      </div>

                      {/* Right Actions: Flyer & Status Dropdown & Trash */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenHorizontalFlyer(room)}
                          className="p-1.5 rounded bg-white border border-stone-300 text-stone-700 hover:text-stone-900 hover:bg-stone-100 hover:scale-110 active:scale-95 shadow-2xs transition-all cursor-pointer"
                          title="พิมพ์เอกสารโบรชัวร์"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Status Dropdown Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStatusDropdownId(activeStatusDropdownId === room.id ? null : room.id);
                            }}
                            className="p-1.5 rounded bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 hover:scale-105 active:scale-95 shadow-2xs transition-all cursor-pointer flex items-center gap-0.5"
                            title="เปลี่ยนสถานะห้อง"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>

                          {activeStatusDropdownId === room.id && (
                            <div className="absolute right-0 bottom-full mb-1 w-36 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-30 text-xs">
                              <div className="px-3 py-1 text-[10px] text-stone-700 font-bold uppercase tracking-wider">
                                ย้ายสถานะ:
                              </div>
                              <button
                                type="button"
                                onClick={() => handleChangeStatus(room, 'publish')}
                                className="w-full px-3 py-1.5 text-left text-emerald-800 hover:bg-emerald-50 font-medium flex items-center gap-1.5"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                <span>โพสต์</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChangeStatus(room, 'pending')}
                                className="w-full px-3 py-1.5 text-left text-amber-800 hover:bg-amber-50 font-medium flex items-center gap-1.5"
                              >
                                <span className="w-2 h-2 rounded-full bg-amber-600" />
                                <span>ดำเนินการ</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChangeStatus(room, 'rented')}
                                className="w-full px-3 py-1.5 text-left text-blue-800 hover:bg-blue-50 font-medium flex items-center gap-1.5"
                              >
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                                <span>สัญญา</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Move to Trash */}
                        <button
                          type="button"
                          onClick={() => handleMoveToTrash(room)}
                          className="p-1.5 rounded text-stone-700 hover:text-rose-700 hover:bg-rose-50 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                          title="ย้ายไปถังขยะ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ROW / TABLE VIEW */
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-semibold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">เลขห้อง</th>
                      <th className="px-4 py-3">ชั้น</th>
                      <th className="px-4 py-3">ประเภท & ขนาด</th>
                      <th className="px-4 py-3">ราคา</th>
                      <th className="px-4 py-3">สถานะ</th>
                      {currentTab === 'lease' && <th className="px-4 py-3">ผู้เช่า & วันหมดสัญญา</th>}
                      <th className="px-4 py-3 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredRooms.map((room) => {
                      const lease = getLeaseForRoom(room);
                      const leaseStatus = lease ? calculateLeaseDaysAndStatus(lease.endDate) : null;

                      return (
                        <tr 
                          key={room.id}
                          className="hover:bg-amber-50/50 hover:shadow-2xs transition-all group cursor-pointer"
                        >
                          {/* Room Number */}
                          <td 
                            onClick={() => setSelectedRoomForDetail(room)}
                            className="px-4 py-3 font-mono font-bold text-stone-900"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-700" />
                              <span>{room.roomNumber}</span>
                            </div>
                          </td>

                          {/* Floor */}
                          <td 
                            onClick={() => setSelectedRoomForDetail(room)}
                            className="px-4 py-3 text-stone-700"
                          >
                            ชั้น {room.floor}
                          </td>

                          {/* Type & Size */}
                          <td 
                            onClick={() => setSelectedRoomForDetail(room)}
                            className="px-4 py-3 text-stone-700"
                          >
                            <span className="font-semibold">{room.bedrooms === 0 ? 'Studio' : `${room.bedrooms} Bed`}</span>
                            <span className="text-stone-700 ml-1.5">({room.areaSqM} ตร.ม.)</span>
                          </td>

                          {/* Price */}
                          <td 
                            onClick={() => setSelectedRoomForDetail(room)}
                            className="px-4 py-3 font-mono font-bold text-stone-900 tabular-nums"
                          >
                            {room.rentPrice ? (
                              <span>฿{room.rentPrice.toLocaleString()} <span className="text-[11px] font-normal text-stone-700">/ด.</span></span>
                            ) : room.salePrice ? (
                              <span>฿{room.salePrice.toLocaleString()}</span>
                            ) : (
                              <span className="text-stone-700">-</span>
                            )}
                          </td>

                          {/* Status */}
                          <td 
                            onClick={() => setSelectedRoomForDetail(room)}
                            className="px-4 py-3"
                          >
                            {room.status === 'rented' ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                                ติดสัญญา
                              </span>
                            ) : room.isPublished ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                โพสต์ออนไลน์
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                รอดำเนินการ
                              </span>
                            )}
                          </td>

                          {/* Lease info if in lease tab */}
                          {currentTab === 'lease' && (
                            <td 
                              onClick={() => setSelectedRoomForDetail(room)}
                              className="px-4 py-3 text-xs"
                            >
                              <div className="font-semibold text-stone-900">{lease?.tenantName || 'ผู้เช่า'}</div>
                              <div className="text-[11px] text-stone-700 font-mono">
                                หมดสัญญา {lease?.endDate} ({leaseStatus?.daysRemaining} วัน)
                              </div>
                            </td>
                          )}

                          {/* Action Buttons */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRoom(room);
                                  setIsRoomFormOpen(true);
                                }}
                                className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 hover:scale-105 active:scale-95 text-stone-800 text-xs font-medium cursor-pointer transition-all"
                              >
                                แก้ไข
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setBookingPreselectedRoom(room);
                                  setIsBookingQuickModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 hover:scale-105 active:scale-95 text-white text-xs font-semibold cursor-pointer transition-all"
                              >
                                ออกใบจอง
                              </button>

                              <button
                                type="button"
                                onClick={() => onOpenHorizontalFlyer(room)}
                                className="p-1 rounded text-stone-700 hover:text-stone-900 hover:bg-stone-100 hover:scale-110 active:scale-95 cursor-pointer transition-all"
                                title="พิมพ์โบรชัวร์"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMoveToTrash(room)}
                                className="p-1 rounded text-stone-700 hover:text-rose-700 hover:bg-rose-50 hover:scale-110 active:scale-95 cursor-pointer transition-all"
                                title="ย้ายไปถังขยะ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* Empty State */
          <div className="p-12 text-center bg-white rounded-xl border border-stone-200 shadow-2xs space-y-3">
            <Building2 className="w-10 h-10 text-stone-400 mx-auto" />
            <h3 className="font-bold text-sm sm:text-base text-stone-900">
              {currentTab === 'lease' ? 'ไม่พบสัญญาเช่าในหมวดนี้' : 'ไม่พบห้องชุดในหมวดนี้'}
            </h3>
            <p className="text-xs text-stone-700 max-w-sm mx-auto">
              {currentTab === 'lease' 
                ? 'ไม่พบห้องชุดที่ติดสัญญาหรือใกล้หมดอายุตามเงื่อนไขที่เลือก ลองสลับเป็นตัวเลือก "ทั้งหมด"'
                : 'ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มห้องใหม่" เพื่อเพิ่มห้องชุดลงในระบบ'}
            </p>
            {currentTab !== 'lease' && (
              <button
                type="button"
                onClick={() => {
                  setEditingRoom(null);
                  setIsRoomFormOpen(true);
                }}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>เพิ่มห้องชุดใหม่</span>
              </button>
            )}
          </div>
        )}
          </>
        )}

      </main>

      {/* 6. WORKFLOW MODAL 1: ADD / EDIT ROOM MODAL */}
      <RoomFormModal
        isOpen={isRoomFormOpen}
        room={editingRoom}
        onClose={() => {
          setIsRoomFormOpen(false);
          setEditingRoom(null);
        }}
        onSave={handleSaveRoomForm}
        onDeleteToTrash={handleMoveToTrash}
        googleWebAppUrl={settings.googleWebAppUrl}
        onNotify={(msg) => onNotify(msg, 'success')}
      />

      {/* 7. WORKFLOW MODAL 2: ISSUE BOOKING QUICK MODAL */}
      <IssueBookingQuickModal
        isOpen={isBookingQuickModalOpen}
        onClose={() => {
          setIsBookingQuickModalOpen(false);
          setBookingPreselectedRoom(null);
        }}
        availableRooms={roomsAvailableForBooking}
        preselectedRoom={bookingPreselectedRoom}
        settings={settings}
        onSaveBooking={handleQuickBookingSave}
        onNotify={(msg) => onNotify(msg, 'success')}
      />

      {/* 8. WORKFLOW MODAL 3: WEB SETTINGS MODAL (ADVANCED FUNCTIONS) */}
      <WebSettingsModal
        isOpen={isWebSettingsOpen}
        onClose={() => setIsWebSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        rooms={rooms}
        leases={leases}
        bookings={bookings}
        facilities={facilities}
        juristicServices={juristicServices}
        onSaveFacility={onSaveFacility}
        onDeleteFacility={onDeleteFacility}
        onSaveJuristicService={onSaveJuristicService}
        onDeleteJuristicService={onDeleteJuristicService}
        onRestoreRoom={handleRestoreFromTrash}
        onPermanentDeleteRoom={(roomId) => onDeleteRoom(roomId, true)}
        onOpenBookingReceipt={(receipt) => onOpenBookingReceipt(null, receipt)}
        onTestGasConnection={onTestGasConnection}
        onSyncGas={onSyncGas}
        onNotify={(msg) => onNotify(msg, 'info')}
      />

      {/* 9. ROOM DETAIL MODAL (WHEN CLICKING CARD/ROW) */}
      {selectedRoomForDetail && (
        <RoomDetailModal
          room={selectedRoomForDetail}
          onClose={() => setSelectedRoomForDetail(null)}
          onShareRoom={(room) => {
            const url = `${window.location.origin}${window.location.pathname}#room-${room.roomNumber}`;
            navigator.clipboard.writeText(url);
            onNotify(`คัดลอกลิงก์ห้อง ${room.roomNumber} เรียบร้อยแล้ว`, 'info');
          }}
          isAdminLoggedIn={true}
          onOpenHorizontalFlyer={(room) => {
            setSelectedRoomForDetail(null);
            onOpenHorizontalFlyer(room);
          }}
          onOpenBookingReceipt={(room) => {
            setSelectedRoomForDetail(null);
            setBookingPreselectedRoom(room);
            setIsBookingQuickModalOpen(true);
          }}
          onEditRoom={(room) => {
            setSelectedRoomForDetail(null);
            setEditingRoom(room);
            setIsRoomFormOpen(true);
          }}
          onChangeStatus={(room, newStatus) => {
            if (newStatus === 'available') handleChangeStatus(room, 'publish');
            else if (newStatus === 'pending') handleChangeStatus(room, 'pending');
            else if (newStatus === 'rented') handleChangeStatus(room, 'rented');
          }}
          settings={settings}
          lease={leases.find(l => (l.roomId && l.roomId === selectedRoomForDetail.id) || (l.roomNumber && l.roomNumber.trim().toLowerCase() === selectedRoomForDetail.roomNumber.trim().toLowerCase()))}
          bookings={bookings.filter(b => (b.roomId && b.roomId === selectedRoomForDetail.id) || (b.roomNumber && b.roomNumber.trim().toLowerCase() === selectedRoomForDetail.roomNumber.trim().toLowerCase()))}
          onViewBookingReceipt={(receipt) => {
            setSelectedRoomForDetail(null);
            onOpenBookingReceipt(null, receipt);
          }}
          facilities={facilities}
        />
      )}

      {/* 10. NOTIFICATION SIDEBAR (SLIDE FROM RIGHT) */}
      <NotificationSidebar
        isOpen={isNotificationSidebarOpen}
        onClose={() => setIsNotificationSidebarOpen(false)}
        leases={leases}
        bookings={bookings}
        rooms={rooms}
        onOpenRoomDetail={(room) => {
          setIsNotificationSidebarOpen(false);
          setSelectedRoomForDetail(room);
        }}
        onEditRoomLease={(room) => {
          setIsNotificationSidebarOpen(false);
          setEditingRoom(room);
          setIsRoomFormOpen(true);
        }}
        onGoToLeasesTab={(filter) => {
          setIsNotificationSidebarOpen(false);
          setCurrentTab('lease');
          if (filter) {
            setLeaseExpiryFilter(filter === '90' ? 'all' : filter);
          }
        }}
        onNotify={onNotify}
      />

    </div>
  );
};
