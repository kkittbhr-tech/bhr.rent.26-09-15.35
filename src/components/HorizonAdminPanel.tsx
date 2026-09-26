import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  Menu, 
  X, 
  Plus, 
  Settings, 
  Trash2, 
  LogOut, 
  Save, 
  Lock, 
  UploadCloud, 
  AlertCircle,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Room, Lease, AppSettings, RoomStatus, ListingType, SizeCategory } from '../types';
import { calculateLeaseDaysAndStatus } from '../services/apiService';

interface HorizonAdminPanelProps {
  rooms: Room[];
  leases: Lease[];
  settings: AppSettings;
  onSaveRoom: (room: Room) => void;
  onDeleteRoom: (id: string) => void;
  onSaveLease?: (lease: Lease) => void;
  onDeleteLease?: (id: string) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onBackToCustomer?: () => void;
  onLogout: () => void;
  onNotify: (msg: string) => void;
}

export const HorizonAdminPanel: React.FC<HorizonAdminPanelProps> = ({
  rooms,
  leases,
  settings,
  onSaveRoom,
  onDeleteRoom,
  onUpdateSettings,
  onBackToCustomer,
  onLogout,
  onNotify
}) => {
  // Top Navigation Tabs: 'available' (ว่าง) | 'pending' (รอดำเนินการ) | 'rented' (ติดสัญญา)
  const [activeTab, setActiveTab] = useState<'available' | 'pending' | 'rented'>('available');

  // Language toggle (TH / EN)
  const [lang, setLang] = useState<'TH' | 'EN'>('TH');

  // Drawers
  const [isExpiringDrawerOpen, setIsExpiringDrawerOpen] = useState(false);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [expiringDayFilter, setExpiringDayFilter] = useState<30 | 60 | 90>(30);

  // Settings Modal & Trash Modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);

  // Room Edit / Create Modal ("จัดการข้อมูลห้อง")
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Partial<Room> | null>(null);
  const [roomTypeSelection, setRoomTypeSelection] = useState<'Studio' | '1 Bedroom' | '2 Bedroom'>('Studio');
  const [statusSelection, setStatusSelection] = useState<'available' | 'pending' | 'rented' | 'trash'>('available');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);

  // Calculate expiring leases audit
  const leaseAlerts = useMemo(() => {
    return leases.map(lease => {
      const { daysRemaining, status } = calculateLeaseDaysAndStatus(lease.endDate);
      return {
        ...lease,
        daysRemaining,
        calcStatus: status
      };
    }).filter(l => l.daysRemaining >= 0 && l.daysRemaining <= 90)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [leases]);

  const filteredExpiringLeases = useMemo(() => {
    return leaseAlerts.filter(l => l.daysRemaining <= expiringDayFilter);
  }, [leaseAlerts, expiringDayFilter]);

  // Total notification count for bell badge (leases expiring within 60 days)
  const expiringCount = useMemo(() => {
    return leaseAlerts.filter(l => l.daysRemaining <= 60).length;
  }, [leaseAlerts]);

  // Rooms categorized by tab
  const activeRooms = useMemo(() => {
    return rooms.filter(r => !r.isTrash && r.status === 'available');
  }, [rooms]);

  const pendingRooms = useMemo(() => {
    return rooms.filter(r => !r.isTrash && (r.status === 'pending' || r.status === 'reserved' || (r.isPublished === false && r.status !== 'rented')));
  }, [rooms]);

  const rentedRooms = useMemo(() => {
    return rooms.filter(r => !r.isTrash && r.status === 'rented');
  }, [rooms]);

  const trashedRooms = useMemo(() => {
    return rooms.filter(r => r.isTrash);
  }, [rooms]);

  // Current display list
  const currentList = useMemo(() => {
    switch (activeTab) {
      case 'available':
        return activeRooms;
      case 'pending':
        return pendingRooms;
      case 'rented':
        return rentedRooms;
      default:
        return activeRooms;
    }
  }, [activeTab, activeRooms, pendingRooms, rentedRooms]);

  // Open Room Modal for Edit
  const handleOpenEditRoom = (room: Room) => {
    setEditingRoom({ ...room });
    // Determine room type
    if (room.bedrooms === 0 || (room.bedrooms === 1 && room.areaSqM <= 33 && !room.description.includes('1 Bedroom'))) {
      setRoomTypeSelection('Studio');
    } else if (room.bedrooms >= 2) {
      setRoomTypeSelection('2 Bedroom');
    } else {
      setRoomTypeSelection('1 Bedroom');
    }

    if (room.isTrash) {
      setStatusSelection('trash');
    } else if (room.status === 'rented') {
      setStatusSelection('rented');
    } else if (room.status === 'pending' || room.status === 'reserved' || room.isPublished === false) {
      setStatusSelection('pending');
    } else {
      setStatusSelection('available');
    }

    setShowImageUrlInput(false);
    setImageUrlInput('');
    setIsRoomModalOpen(true);
  };

  // Open Room Modal for New Room
  const handleOpenNewRoom = () => {
    setIsMenuDrawerOpen(false);
    const newRoom: Partial<Room> = {
      id: `room-${Date.now()}`,
      roomNumber: '',
      condoName: settings.condoName || 'Bangkok Horizon Ram 60',
      listingType: 'both',
      rentPrice: 0,
      salePrice: 0,
      sizeCategory: 'size_30',
      areaSqM: 30,
      floor: 1,
      bedrooms: 0,
      bathrooms: 1,
      status: 'available',
      isPublished: true,
      isTrash: false,
      staffNotes: '',
      description: '',
      highlights: [],
      amenities: [],
      images: [],
      contactName: settings.agencyName || 'สำนักงานนิติบุคคล',
      contactPhone: settings.defaultContactPhone || '02-735-6060',
      contactLine: settings.defaultContactLine || '@052adooe',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEditingRoom(newRoom);
    setRoomTypeSelection('Studio');
    setStatusSelection('available');
    setShowImageUrlInput(false);
    setImageUrlInput('');
    setIsRoomModalOpen(true);
  };

  // Save Room Changes
  const handleSaveRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingRoom || !editingRoom.roomNumber?.trim()) {
      alert('กรุณาระบุเลขห้อง');
      return;
    }

    let bedrooms = 1;
    if (roomTypeSelection === 'Studio') bedrooms = 0;
    else if (roomTypeSelection === '2 Bedroom') bedrooms = 2;

    let status: RoomStatus = 'available';
    let isPublished = true;
    let isTrash = false;

    if (statusSelection === 'available') {
      status = 'available';
      isPublished = true;
      isTrash = false;
    } else if (statusSelection === 'pending') {
      status = 'pending';
      isPublished = false;
      isTrash = false;
    } else if (statusSelection === 'rented') {
      status = 'rented';
      isPublished = false;
      isTrash = false;
    } else if (statusSelection === 'trash') {
      isTrash = true;
      isPublished = false;
    }

    let listingType: ListingType = 'both';
    const rent = Number(editingRoom.rentPrice) || 0;
    const sale = Number(editingRoom.salePrice) || 0;
    if (rent > 0 && sale > 0) listingType = 'both';
    else if (rent > 0) listingType = 'rent';
    else if (sale > 0) listingType = 'sale';

    const area = Number(editingRoom.areaSqM) || 30;
    let sizeCategory: SizeCategory = 'size_30';
    if (area > 50) sizeCategory = 'size_60_90';
    else if (area > 35) sizeCategory = 'size_40';

    const finalRoom: Room = {
      id: editingRoom.id || `room-${Date.now()}`,
      roomNumber: editingRoom.roomNumber.trim(),
      condoName: editingRoom.condoName || 'Bangkok Horizon Ram 60',
      listingType,
      rentPrice: rent > 0 ? rent : undefined,
      salePrice: sale > 0 ? sale : undefined,
      sizeCategory,
      areaSqM: area,
      floor: editingRoom.floor ?? 1,
      building: editingRoom.building || '',
      bedrooms,
      bathrooms: editingRoom.bathrooms || 1,
      status,
      isPublished,
      isTrash,
      trashedAt: isTrash ? (editingRoom.trashedAt || new Date().toISOString()) : undefined,
      staffNotes: editingRoom.staffNotes?.trim() || '',
      description: editingRoom.description || '',
      highlights: editingRoom.highlights || [],
      amenities: editingRoom.amenities || [],
      images: editingRoom.images || [],
      ownerContractDocName: editingRoom.ownerContractDocName || '',
      ownerContractDocUrl: editingRoom.ownerContractDocUrl || '',
      contactName: editingRoom.contactName || settings.agencyName,
      contactPhone: editingRoom.contactPhone || settings.defaultContactPhone,
      contactLine: editingRoom.contactLine || settings.defaultContactLine,
      createdAt: editingRoom.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveRoom(finalRoom);
    onNotify(`บันทึกข้อมูลห้อง ${finalRoom.roomNumber} เรียบร้อย`);
    setIsRoomModalOpen(false);
  };

  // Upload image handler
  const handleAddImage = (url: string) => {
    if (!url.trim() || !editingRoom) return;
    const currentImages = editingRoom.images || [];
    setEditingRoom({
      ...editingRoom,
      images: [...currentImages, url.trim()]
    });
    setImageUrlInput('');
    setShowImageUrlInput(false);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (!editingRoom) return;
    const filtered = (editingRoom.images || []).filter((_, idx) => idx !== indexToRemove);
    setEditingRoom({ ...editingRoom, images: filtered });
  };

  // Upload file simulation / handler for contract document
  const handleUploadContractFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingRoom) return;
    setEditingRoom({
      ...editingRoom,
      ownerContractDocName: file.name,
      ownerContractDocUrl: URL.createObjectURL(file)
    });
    onNotify(`อัปโหลดเอกสาร ${file.name} เรียบร้อย`);
  };

  // Restore room from trash
  const handleRestoreFromTrash = (room: Room) => {
    const restored: Room = {
      ...room,
      isTrash: false,
      trashedAt: undefined,
      status: 'available',
      isPublished: true
    };
    onSaveRoom(restored);
    onNotify(`กู้คืนห้อง ${room.roomNumber} สำเร็จ`);
  };

  return (
    <div className="min-h-screen bg-[#FAF8FB] text-stone-900 font-sans pb-24 selection:bg-indigo-600 selection:text-white">
      
      {/* ===================================================================== */}
      {/* TOP HEADER (Exact match to screenshot)                                 */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-stone-200 shadow-2xs">
        {/* Left: Brand Logo + Subtitle */}
        <div className="flex items-center gap-2">
          <span className="font-black text-2xl sm:text-3xl tracking-widest text-stone-900 font-sans">
            HORIZON
          </span>
          <span className="text-stone-500 font-bold text-xs sm:text-sm ml-1 select-none tracking-tight">
            Admin Panel
          </span>
        </div>

        {/* Right: Language Pill, Bell Notification, Hamburger Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* TH / EN Toggle */}
          <button
            id="admin-lang-toggle"
            onClick={() => setLang(l => l === 'TH' ? 'EN' : 'TH')}
            className="flex items-center bg-[#ECE9FE] hover:bg-[#E3DEFE] text-[#5B3DF5] rounded-full px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer border border-[#DDD6FE]"
            title="สลับภาษา TH / EN"
          >
            <span className={lang === 'TH' ? 'text-[#4326DA]' : 'text-stone-400'}>TH</span>
            <span className="mx-1 text-stone-300">|</span>
            <span className={lang === 'EN' ? 'text-[#4326DA]' : 'text-stone-400'}>EN</span>
          </button>

          {/* Bell Icon with Red Expiration Badge */}
          <button
            id="admin-bell-btn"
            onClick={() => setIsExpiringDrawerOpen(true)}
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-stone-50 text-stone-700 shadow-2xs border border-stone-200/80 flex items-center justify-center transition-all cursor-pointer"
            title="แจ้งเตือนสัญญาใกล้หมด"
          >
            <Bell className="w-4 h-4 text-stone-700" />
            {expiringCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs border-2 border-white">
                {expiringCount}
              </span>
            )}
          </button>

          {/* Hamburger Menu Icon */}
          <button
            id="admin-hamburger-btn"
            onClick={() => setIsMenuDrawerOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-stone-50 text-stone-800 shadow-2xs border border-stone-200/80 flex items-center justify-center transition-all cursor-pointer"
            title="เมนูหลัก"
          >
            <Menu className="w-5 h-5 text-stone-800" />
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 3 MAIN TABS: [ ว่าง ]  [ รอดำเนินการ ]  [ ติดสัญญา ]                   */}
      {/* ===================================================================== */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tab 1: ว่าง */}
          <button
            id="tab-available"
            onClick={() => setActiveTab('available')}
            className={`px-5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'available'
                ? 'bg-[#18181B] text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200/90 shadow-2xs'
            }`}
          >
            ว่าง
          </button>

          {/* Tab 2: รอดำเนินการ */}
          <button
            id="tab-pending"
            onClick={() => setActiveTab('pending')}
            className={`px-5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-[#18181B] text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200/90 shadow-2xs'
            }`}
          >
            รอดำเนินการ
          </button>

          {/* Tab 3: ติดสัญญา */}
          <button
            id="tab-rented"
            onClick={() => setActiveTab('rented')}
            className={`px-5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'rented'
                ? 'bg-[#18181B] text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200/90 shadow-2xs'
            }`}
          >
            ติดสัญญา
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ROOM CARDS LIST                                                       */}
      {/* ===================================================================== */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 space-y-3 sm:space-y-4">
        {currentList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-stone-200/80 shadow-2xs">
            <p className="text-stone-500 text-sm">ไม่มีห้องในหมวดหมู่นี้</p>
            <button
              onClick={handleOpenNewRoom}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B3DF5] text-white text-xs font-semibold shadow-xs hover:bg-[#4E31E5] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มห้องชุดใหม่</span>
            </button>
          </div>
        ) : (
          currentList.map(room => {
            const hasRent = !!room.rentPrice && room.rentPrice > 0;
            const hasSale = !!room.salePrice && room.salePrice > 0;
            const typeLabel = room.bedrooms === 0 ? 'Studio' : room.bedrooms === 1 ? '1 Bedroom' : `${room.bedrooms} Bedroom`;
            const mainImg = room.images && room.images.length > 0 ? room.images[0] : '';

            return (
              <div
                key={room.id}
                id={`room-card-${room.id}`}
                onClick={() => handleOpenEditRoom(room)}
                className="bg-white rounded-2xl border border-stone-200/80 hover:border-purple-200 shadow-2xs hover:shadow-md transition-all p-3.5 sm:p-4 flex items-start gap-3.5 sm:gap-4 cursor-pointer relative group"
              >
                {/* Left Thumbnail Image */}
                <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-xl bg-stone-100 border border-stone-200/70 overflow-hidden shrink-0 flex items-center justify-center">
                  {mainImg ? (
                    <img
                      src={mainImg}
                      alt={room.roomNumber}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50">
                      <ImageIcon className="w-6 h-6 text-stone-300" />
                    </div>
                  )}
                </div>

                {/* Center Content */}
                <div className="flex-1 min-w-0 pr-2">
                  {/* Top Line: Room Number + Type + Price */}
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-extrabold text-base sm:text-lg text-[#1E1B4B]">
                      {room.roomNumber}
                    </span>
                    <span className="text-[#3730A3] text-xs sm:text-sm font-medium">
                      ({typeLabel})
                    </span>
                    <span className="text-[#2E2888] font-bold text-xs sm:text-sm">
                      {hasRent && hasSale ? (
                        <>เช่า ฿{room.rentPrice?.toLocaleString()} | ขาย ฿{room.salePrice?.toLocaleString()}</>
                      ) : hasRent ? (
                        <>เช่า ฿{room.rentPrice?.toLocaleString()}</>
                      ) : hasSale ? (
                        <>ขาย ฿{room.salePrice?.toLocaleString()}</>
                      ) : (
                        <span className="text-stone-400 font-normal">ยังไม่ได้ระบุราคา</span>
                      )}
                    </span>
                  </div>

                  {/* Subtitle Line: Floor and Area */}
                  <div className="text-stone-500 text-xs sm:text-xs mt-0.5 font-normal">
                    ชั้น {room.floor} · {room.areaSqM} ตร.ม.
                  </div>

                  {/* Red Lock Note (Staff Private Note) */}
                  {room.staffNotes && (
                    <div className="mt-2 bg-[#FEF2F2] border border-[#FECDD3] rounded-lg px-2.5 py-1 text-xs text-[#DC2626] inline-flex items-center gap-1.5 max-w-full">
                      <Lock className="w-3 h-3 text-[#DC2626] shrink-0" />
                      <span className="truncate">{room.staffNotes}</span>
                    </div>
                  )}
                </div>

                {/* Right Status Badge */}
                <div className="shrink-0 self-center sm:self-center">
                  {activeTab === 'available' && (
                    <span className="bg-[#DCFCE7] text-[#166534] font-semibold text-xs px-3 py-1 rounded-full border border-[#BBF7D0]">
                      post
                    </span>
                  )}
                  {activeTab === 'pending' && (
                    <span className="bg-[#FEF9C3] text-[#854D0E] font-semibold text-xs px-3 py-1 rounded-full border border-[#FEF08A]">
                      pending
                    </span>
                  )}
                  {activeTab === 'rented' && (
                    <span className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-xs px-3 py-1 rounded-full border border-[#BAE6FD]">
                      มีผู้เช่า
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ===================================================================== */}
      {/* DRAWER 1: สัญญาใกล้หมด (Alert Expiring Leases)                         */}
      {/* ===================================================================== */}
      {isExpiringDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsExpiringDrawerOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-sm bg-white shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#FEF2F2] flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                  </div>
                  <h3 className="font-bold text-lg text-[#991B1B]">
                    สัญญาใกล้หมด
                  </h3>
                </div>
                <button
                  onClick={() => setIsExpiringDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Day Range Filter Pills: [ 30 วัน ] [ 60 วัน ] [ 90 วัน ] */}
              <div className="grid grid-cols-3 gap-2 py-4">
                <button
                  onClick={() => setExpiringDayFilter(30)}
                  className={`py-1.5 text-xs font-semibold rounded-full text-center transition-colors cursor-pointer ${
                    expiringDayFilter === 30
                      ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECDD3]'
                      : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
                  }`}
                >
                  30 วัน
                </button>
                <button
                  onClick={() => setExpiringDayFilter(60)}
                  className={`py-1.5 text-xs font-semibold rounded-full text-center transition-colors cursor-pointer ${
                    expiringDayFilter === 60
                      ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECDD3]'
                      : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
                  }`}
                >
                  60 วัน
                </button>
                <button
                  onClick={() => setExpiringDayFilter(90)}
                  className={`py-1.5 text-xs font-semibold rounded-full text-center transition-colors cursor-pointer ${
                    expiringDayFilter === 90
                      ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECDD3]'
                      : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
                  }`}
                >
                  90 วัน
                </button>
              </div>

              {/* Expiring Leases List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {filteredExpiringLeases.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 text-xs">
                    ไม่มีสัญญาที่กำลังจะหมดอายุภายใน {expiringDayFilter} วัน
                  </div>
                ) : (
                  filteredExpiringLeases.map(lease => {
                    const d = new Date(lease.endDate);
                    const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`;
                    return (
                      <div
                        key={lease.id}
                        className="bg-[#FFF8F8] border border-[#FECDD3] border-l-4 border-l-[#EF4444] rounded-xl p-3.5 flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <div className="font-extrabold text-[#7F1D1D] text-sm">
                            Room {lease.roomNumber}
                          </div>
                          <div className="text-stone-500 text-xs mt-0.5">
                            Expire: {formattedDate}
                          </div>
                        </div>
                        <div className="font-bold text-[#EA580C] text-sm text-right shrink-0">
                          {lease.daysRemaining} days left
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DRAWER 2: HAMBURGER MENU (➕ เพิ่มห้องใหม่, ⚙️ ตั้งค่า, 🗑️ ถังขยะ, 🚪 ออก) */}
      {/* ===================================================================== */}
      {isMenuDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMenuDrawerOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xs sm:max-w-sm bg-white shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-300">
              
              <div>
                {/* Header with Brand Logo */}
                <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                  <div>
                    <h2 className="font-extrabold text-2xl tracking-tight text-[#4326DA]">
                      HORIZON
                    </h2>
                    <p className="text-stone-500 text-xs font-medium">
                      Admin Panel
                    </p>
                  </div>
                  <button
                    onClick={() => setIsMenuDrawerOpen(false)}
                    className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Menu Action Items */}
                <nav className="py-4 space-y-1">
                  {/* เพิ่มห้องใหม่ */}
                  <button
                    id="menu-add-room-btn"
                    onClick={handleOpenNewRoom}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-stone-800 hover:bg-purple-50 hover:text-[#5B3DF5] transition-colors text-sm font-semibold text-left cursor-pointer"
                  >
                    <Plus className="w-5 h-5 text-stone-700" />
                    <span>เพิ่มห้องใหม่</span>
                  </button>

                  {/* ตั้งค่าเว็บไซต์ */}
                  <button
                    id="menu-settings-btn"
                    onClick={() => {
                      setIsMenuDrawerOpen(false);
                      setIsSettingsModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-stone-800 hover:bg-purple-50 hover:text-[#5B3DF5] transition-colors text-sm font-semibold text-left cursor-pointer"
                  >
                    <Settings className="w-5 h-5 text-stone-700" />
                    <span>ตั้งค่าเว็บไซต์</span>
                  </button>

                  {/* ถังขยะ */}
                  <button
                    id="menu-trash-btn"
                    onClick={() => {
                      setIsMenuDrawerOpen(false);
                      setIsTrashModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-stone-800 hover:bg-purple-50 hover:text-[#5B3DF5] transition-colors text-sm font-semibold text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-5 h-5 text-stone-700" />
                      <span>ถังขยะ</span>
                    </div>
                    {trashedRooms.length > 0 && (
                      <span className="bg-stone-200 text-stone-700 text-xs px-2 py-0.5 rounded-full font-bold">
                        {trashedRooms.length}
                      </span>
                    )}
                  </button>

                  {/* ดูหน้าเว็บลูกค้า (Customer Portal) */}
                  {onBackToCustomer && (
                    <button
                      id="menu-customer-view-btn"
                      onClick={() => {
                        setIsMenuDrawerOpen(false);
                        onBackToCustomer();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-stone-800 hover:bg-purple-50 hover:text-[#5B3DF5] transition-colors text-sm font-semibold text-left cursor-pointer"
                    >
                      <ExternalLink className="w-5 h-5 text-stone-700" />
                      <span>ดูหน้าเว็บลูกค้า</span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Bottom: ออกจากระบบ */}
              <div className="pt-6 border-t border-stone-100">
                <button
                  id="menu-logout-btn"
                  onClick={() => {
                    setIsMenuDrawerOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#DC2626] hover:bg-red-50 transition-colors text-sm font-semibold cursor-pointer"
                >
                  <LogOut className="w-5 h-5 text-[#DC2626]" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: จัดการข้อมูลห้อง (Room Create / Edit Modal)                      */}
      {/* ===================================================================== */}
      {isRoomModalOpen && editingRoom && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="font-bold text-lg text-stone-900">
                จัดการข้อมูลห้อง
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="save-room-btn"
                  onClick={() => handleSaveRoom()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#5B3DF5] hover:bg-[#4E31E5] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึก</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Form Scrollable Body */}
            <div className="overflow-y-auto p-5 space-y-5 flex-1">
              
              {/* Section 1: ข้อมูลทั่วไป */}
              <div className="p-4 bg-stone-50/70 rounded-xl border border-stone-200/80 space-y-3">
                <div className="flex items-center gap-2 text-[#5B3DF5] font-semibold text-xs sm:text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#5B3DF5]" />
                  <span>ข้อมูลทั่วไป</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* เลขห้อง */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      เลขห้อง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น 12/34 หรือ 571"
                      value={editingRoom.roomNumber || ''}
                      onChange={e => setEditingRoom({ ...editingRoom, roomNumber: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#5B3DF5]"
                    />
                  </div>

                  {/* ประเภท */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      ประเภท
                    </label>
                    <select
                      value={roomTypeSelection}
                      onChange={e => setRoomTypeSelection(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#5B3DF5]"
                    >
                      <option value="Studio">Studio</option>
                      <option value="1 Bedroom">1 Bedroom</option>
                      <option value="2 Bedroom">2 Bedroom</option>
                    </select>
                  </div>

                  {/* ชั้น */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      ชั้น
                    </label>
                    <input
                      type="text"
                      placeholder="ชั้น"
                      value={editingRoom.floor ?? ''}
                      onChange={e => setEditingRoom({ ...editingRoom, floor: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#5B3DF5]"
                    />
                  </div>

                  {/* ขนาด (ตร.ม.) */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      ขนาด (ตร.ม.)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingRoom.areaSqM ?? 0}
                      onChange={e => setEditingRoom({ ...editingRoom, areaSqM: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#5B3DF5]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: ราคาและสถานะ */}
              <div className="p-4 bg-stone-50/70 rounded-xl border border-stone-200/80 space-y-3">
                <div className="flex items-center gap-2 text-[#5B3DF5] font-semibold text-xs sm:text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#5B3DF5]" />
                  <span>ราคาและสถานะ</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* เช่า (บาท) */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      เช่า (บาท)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingRoom.rentPrice ?? 0}
                      onChange={e => setEditingRoom({ ...editingRoom, rentPrice: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#5B3DF5]"
                    />
                  </div>

                  {/* ขาย (บาท) */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      ขาย (บาท)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editingRoom.salePrice ?? 0}
                      onChange={e => setEditingRoom({ ...editingRoom, salePrice: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#5B3DF5]"
                    />
                  </div>
                </div>

                {/* สถานะปัจจุบัน */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    สถานะปัจจุบัน
                  </label>
                  <select
                    value={statusSelection}
                    onChange={e => setStatusSelection(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#5B3DF5] font-medium"
                  >
                    <option value="available">✅ ว่าง (ประกาศ)</option>
                    <option value="pending">⚠️ รอดำเนินการ</option>
                    <option value="rented">🔐 ติดสัญญา</option>
                    <option value="trash">🗑️ ถังขยะ</option>
                  </select>
                </div>

                {/* รายละเอียดเพิ่มเติม */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    รายละเอียดเพิ่มเติม
                  </label>
                  <textarea
                    rows={2}
                    placeholder="ระบุรายละเอียด..."
                    value={editingRoom.description || ''}
                    onChange={e => setEditingRoom({ ...editingRoom, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#5B3DF5]"
                  />
                </div>

                {/* Note Box (Staff Private Note) */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center justify-between">
                    <span>โน้ตเฉพาะแอดมิน (แสดงกรอบสีแดงในรายการ)</span>
                    <span className="text-red-500 font-normal text-[11px]">(เห็นเฉพาะแอดมิน)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="เช่น ผู้เช่าชื่อ... เบอร์โทร... หรือราคาโทรศัพท์... (เห็นเฉพาะแอดมิน)"
                    value={editingRoom.staffNotes || ''}
                    onChange={e => setEditingRoom({ ...editingRoom, staffNotes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-dashed border-red-300 focus:border-red-500 focus:outline-hidden text-red-700"
                  />
                </div>
              </div>

              {/* Section 3: รูปภาพ */}
              <div className="p-4 bg-stone-50/70 rounded-xl border border-stone-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#5B3DF5] font-semibold text-xs sm:text-sm">
                    <span className="w-2 h-2 rounded-full bg-[#5B3DF5]" />
                    <span>รูปภาพ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowImageUrlInput(!showImageUrlInput)}
                    className="text-xs text-[#5B3DF5] hover:underline"
                  >
                    + ใส่ลิงก์ URL
                  </button>
                </div>

                {/* URL Image Adder */}
                {showImageUrlInput && (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="วางลิงก์รูปภาพ https://..."
                      value={imageUrlInput}
                      onChange={e => setImageUrlInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white rounded-lg border border-stone-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddImage(imageUrlInput)}
                      className="px-3 py-1.5 bg-[#5B3DF5] text-white text-xs font-semibold rounded-lg"
                    >
                      เพิ่ม
                    </button>
                  </div>
                )}

                {/* Images Grid */}
                <div className="grid grid-cols-4 gap-2.5 pt-1">
                  {(editingRoom.images || []).map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg border border-stone-200 overflow-hidden group bg-stone-100">
                      <img src={img} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Add Image Box */}
                  <label className="aspect-square rounded-lg border-2 border-dashed border-stone-300 hover:border-[#5B3DF5] flex flex-col items-center justify-center text-stone-400 hover:text-[#5B3DF5] cursor-pointer transition-colors bg-white">
                    <Plus className="w-6 h-6" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              handleAddImage(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Section 4: เอกสารสัญญาเจ้าของ */}
              <div className="p-4 bg-stone-50/70 rounded-xl border border-stone-200/80 space-y-3">
                <div className="flex items-center gap-2 text-[#5B3DF5] font-semibold text-xs sm:text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#5B3DF5]" />
                  <span>เอกสาร</span>
                </div>

                <div>
                  <div className="text-xs font-medium text-stone-700 mb-2">
                    สัญญาเจ้าของ
                  </div>

                  {editingRoom.ownerContractDocName ? (
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200">
                      <div className="flex items-center gap-2 text-xs text-stone-800 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium truncate">{editingRoom.ownerContractDocName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingRoom({ ...editingRoom, ownerContractDocName: '', ownerContractDocUrl: '' })}
                        className="text-xs text-red-500 hover:text-red-700 ml-2"
                      >
                        ลบ
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-stone-300 hover:border-[#5B3DF5] rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white">
                      <div className="w-10 h-10 rounded-full bg-[#5B3DF5] text-white flex items-center justify-center mb-1 shadow-xs">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-stone-700">Click to Upload</span>
                      <span className="text-[10px] text-stone-400 mt-0.5">ไฟล์ PDF หรือรูปภาพสัญญาฝากปล่อยห้อง</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={handleUploadContractFile}
                      />
                    </label>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ถังขยะ (Trash Modal)                                           */}
      {/* ===================================================================== */}
      {isTrashModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-stone-600" />
                <h3 className="font-bold text-base text-stone-900">ถังขยะห้องชุด</h3>
              </div>
              <button
                onClick={() => setIsTrashModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-3">
              {trashedRooms.length === 0 ? (
                <div className="text-center py-10 text-stone-400 text-xs">
                  ไม่มีห้องในถังขยะ
                </div>
              ) : (
                trashedRooms.map(r => (
                  <div key={r.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-stone-900">
                        ห้อง {r.roomNumber}
                      </div>
                      <div className="text-stone-500 text-xs">
                        ชั้น {r.floor} · {r.areaSqM} ตร.ม.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreFromTrash(r)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>กู้คืน</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`ยืนยันลบห้อง ${r.roomNumber} ถาวรหรือไม่?`)) {
                            onDeleteRoom(r.id);
                            onNotify(`ลบห้อง ${r.roomNumber} ถาวรแล้ว`);
                          }
                        }}
                        className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs rounded-lg cursor-pointer"
                      >
                        ลบถาวร
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ตั้งค่าเว็บไซต์ (Website Settings Modal)                        */}
      {/* ===================================================================== */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-stone-600" />
                <h3 className="font-bold text-base text-stone-900">ตั้งค่าเว็บไซต์</h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  ชื่อคอนโดมิเนียม
                </label>
                <input
                  type="text"
                  value={tempSettings.condoName || ''}
                  onChange={e => setTempSettings({ ...tempSettings, condoName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  LINE Official ID (ติดต่อฝ่ายนิติบุคคล)
                </label>
                <input
                  type="text"
                  placeholder="@052adooe"
                  value={tempSettings.defaultContactLine || ''}
                  onChange={e => setTempSettings({ ...tempSettings, defaultContactLine: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  เบอร์โทรศัพท์สำนักงานนิติบุคคล
                </label>
                <input
                  type="text"
                  placeholder="02-735-6060"
                  value={tempSettings.defaultContactPhone || ''}
                  onChange={e => setTempSettings({ ...tempSettings, defaultContactPhone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  ชื่อหน่วยงาน / นิติบุคคล
                </label>
                <input
                  type="text"
                  value={tempSettings.agencyName || ''}
                  onChange={e => setTempSettings({ ...tempSettings, agencyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings(tempSettings);
                    onNotify('บันทึกการตั้งค่าเว็บไซต์เรียบร้อย');
                    setIsSettingsModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#5B3DF5] hover:bg-[#4E31E5] rounded-xl shadow-xs"
                >
                  บันทึกการตั้งค่า
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
