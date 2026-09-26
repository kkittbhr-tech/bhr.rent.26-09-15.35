import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CustomerView } from './components/CustomerView';
import { AdminPortal } from './components/AdminPortal';
import { RoomDetailModal } from './components/RoomDetailModal';
import { HorizontalRoomFlyerModal } from './components/HorizontalRoomFlyerModal';
import { BookingReceiptModal } from './components/BookingReceiptModal';
import { LoginModal } from './components/LoginModal';
import { Toast } from './components/Toast';

import { Room, Lease, BookingReceipt, AppSettings, Facility, JuristicServiceItem } from './types';
import { 
  loadRooms, 
  saveRooms, 
  loadLeases, 
  saveLeases, 
  loadBookings, 
  saveBookings, 
  loadSettings, 
  saveSettings,
  loadFacilities,
  saveFacilities,
  loadJuristicServices,
  saveJuristicServices,
  testGasConnection,
  syncFromGas,
  syncToGas,
  saveRoomToGas,
  saveLeaseToGas,
  saveBookingToGas,
  calculateLeaseDaysAndStatus
} from './services/apiService';
import { FacilityDetailModal } from './components/FacilityDetailModal';

export default function App() {
  // Current view: customer or admin (defaults to admin if session is already active)
  const [currentView, setCurrentView] = useState<'customer' | 'admin'>(() => {
    return localStorage.getItem('condohub_admin_session') === 'true' || sessionStorage.getItem('condohub_admin_session') === 'true' ? 'admin' : 'customer';
  });

  // Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('condohub_admin_session') === 'true' || sessionStorage.getItem('condohub_admin_session') === 'true';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Core Data Collections
  const [rooms, setRooms] = useState<Room[]>(() => loadRooms());
  const [leases, setLeases] = useState<Lease[]>(() => loadLeases());
  const [bookings, setBookings] = useState<BookingReceipt[]>(() => loadBookings());
  const [facilities, setFacilities] = useState<Facility[]>(() => loadFacilities());
  const [juristicServices, setJuristicServices] = useState<JuristicServiceItem[]>(() => loadJuristicServices());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  // Active Modals & Selection
  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState<Room | null>(null);
  const [selectedFacilityForModal, setSelectedFacilityForModal] = useState<Facility | null>(null);
  const [roomForHorizontalFlyer, setRoomForHorizontalFlyer] = useState<Room | null>(null);
  const [bookingModalState, setBookingModalState] = useState<{
    isOpen: boolean;
    room: Room | null;
    receipt: BookingReceipt | null;
  }>({
    isOpen: false,
    room: null,
    receipt: null
  });

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  // Sync to localStorage whenever state changes
  useEffect(() => {
    saveRooms(rooms);
  }, [rooms]);

  useEffect(() => {
    saveLeases(leases);
  }, [leases]);

  useEffect(() => {
    saveBookings(bookings);
  }, [bookings]);

  useEffect(() => {
    saveFacilities(facilities);
  }, [facilities]);

  useEffect(() => {
    saveJuristicServices(juristicServices);
  }, [juristicServices]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Initial cloud sync from Google Sheet if URL is configured
  useEffect(() => {
    if (settings.googleWebAppUrl) {
      syncFromGas(settings.googleWebAppUrl).then((res) => {
        if (res.success) {
          if (res.rooms && res.rooms.length > 0) setRooms(res.rooms);
          if (res.leases && res.leases.length > 0) setLeases(res.leases);
          if (res.bookings && res.bookings.length > 0) setBookings(res.bookings);
          if (res.settings) {
            setSettings(prev => ({
              ...prev,
              adminPassword: prev.adminPassword || res.settings?.adminPassword || '7014',
              adminEmail: prev.adminEmail || res.settings?.adminEmail || '',
              agencyName: prev.agencyName || res.settings?.agencyName || 'Bangkok Horizon Ram 60 (นิติบุคคลอาคารชุด)',
              defaultContactPhone: prev.defaultContactPhone || res.settings?.defaultContactPhone || '02-735-6060',
              defaultContactLine: prev.defaultContactLine || res.settings?.defaultContactLine || '@052adooe',
            }));
          }
        }
      }).catch((e) => {
        console.warn('Initial cloud sync notice:', e);
      });
    }
  }, [settings.googleWebAppUrl]);

  // Deep Link Handling: Check URL params on initial load (e.g. ?room=room-1 or ?view=admin)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (roomId) {
      const match = rooms.find(r => r.id === roomId);
      if (match) {
        setSelectedRoomForDetail(match);
      }
    }

    const viewParam = params.get('view');
    if (viewParam === 'admin') {
      if (localStorage.getItem('condohub_admin_session') === 'true' || sessionStorage.getItem('condohub_admin_session') === 'true') {
        setCurrentView('admin');
      } else {
        setIsLoginModalOpen(true);
      }
    }
  }, [rooms]);

  // Expiration calculation for Navbar badge
  const urgentLeaseCount = useMemo(() => {
    let count = 0;
    leases.forEach(l => {
      const { status } = calculateLeaseDaysAndStatus(l.endDate);
      if (status === 'expiring_30' || status === 'expiring_60') {
        count++;
      }
    });
    return count;
  }, [leases]);

  // Auth Handlers
  const handleLoginSuccess = (rememberMe: boolean = true) => {
    setIsAdminLoggedIn(true);
    if (rememberMe) {
      localStorage.setItem('condohub_admin_session', 'true');
    }
    sessionStorage.setItem('condohub_admin_session', 'true');
    setCurrentView('admin');
    showToast('ยินดีต้อนรับสู่ระบบบริหารจัดการคอนโดมิเนียม');
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('condohub_admin_session');
    sessionStorage.removeItem('condohub_admin_session');
    setCurrentView('customer');
    showToast('ออกจากระบบเจ้าหน้าที่เรียบร้อยแล้ว', 'info');
  };

  // Share room link handler (Requirement: สามารถส่งลิงก์นี้ให้ลูกค้าดูได้)
  const handleShareRoom = (room: Room) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${room.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast(`คัดลอกลิงก์ห้อง ${room.roomNumber} (${room.condoName}) เรียบร้อยแล้ว สามารถส่งต่อให้ลูกค้าได้ทันที!`);
      }).catch(() => {
        prompt('คัดลอกลิงก์สำหรับส่งให้ลูกค้า:', shareUrl);
      });
    } else {
      prompt('คัดลอกลิงก์สำหรับส่งให้ลูกค้า:', shareUrl);
    }
  };

  // Room CRUD Handlers
  const handleSaveRoom = (savedRoom: Room) => {
    setRooms(prev => {
      const index = prev.findIndex(r => r.id === savedRoom.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = savedRoom;
        return next;
      } else {
        return [savedRoom, ...prev];
      }
    });

    // Auto-sync directly to Google Sheet in background if URL is set
    if (settings.googleWebAppUrl) {
      saveRoomToGas(settings.googleWebAppUrl, savedRoom).catch((err) => {
        console.warn('Background room cloud sync note:', err);
      });
    }

    showToast(`บันทึกข้อมูลห้อง ${savedRoom.roomNumber} สำเร็จ`);
  };

  const handleDeleteRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
    showToast('ลบห้องชุดเรียบร้อยแล้ว');
  };

  // Lease CRUD Handlers
  const handleSaveLease = (savedLease: Lease) => {
    setLeases(prev => {
      const index = prev.findIndex(l => l.id === savedLease.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = savedLease;
        return next;
      } else {
        return [savedLease, ...prev];
      }
    });

    // Automatically update the associated room status to 'rented'
    if (savedLease.roomId) {
      setRooms(prev => prev.map(r => r.id === savedLease.roomId ? { ...r, status: 'rented' } : r));
    }

    // Auto-sync directly to Google Sheet in background if URL is set
    if (settings.googleWebAppUrl) {
      saveLeaseToGas(settings.googleWebAppUrl, savedLease).catch((err) => {
        console.warn('Background lease cloud sync note:', err);
      });
    }

    showToast(`บันทึกสัญญาเช่าของ ${savedLease.tenantName} เรียบร้อยแล้ว`);
  };

  const handleDeleteLease = (id: string) => {
    setLeases(prev => prev.filter(l => l.id !== id));
    showToast('ลบสัญญาเช่าเรียบร้อยแล้ว');
  };

  // Booking Receipt Handlers
  const handleSaveBooking = (booking: BookingReceipt) => {
    setBookings(prev => {
      const index = prev.findIndex(b => b.id === booking.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = booking;
        return next;
      } else {
        return [booking, ...prev];
      }
    });

    // Update room status to reserved
    if (booking.roomId) {
      setRooms(prev => prev.map(r => r.id === booking.roomId ? { ...r, status: 'reserved' } : r));
    }

    // Auto-sync directly to Google Sheet in background if URL is set
    if (settings.googleWebAppUrl) {
      saveBookingToGas(settings.googleWebAppUrl, booking).catch((err) => {
        console.warn('Background booking cloud sync note:', err);
      });
    }

    // If modal is open for this receipt, update receipt in state
    setBookingModalState(prev => prev.isOpen ? { ...prev, receipt: booking } : prev);
    showToast(`บันทึกใบจองเลขที่ ${booking.receiptNumber} สำเร็จ`);
  };

  // Facility Handlers
  const handleSaveFacility = (savedFacility: Facility) => {
    setFacilities(prev => {
      const idx = prev.findIndex(f => f.id === savedFacility.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedFacility;
        return next;
      } else {
        return [savedFacility, ...prev];
      }
    });
    showToast(`บันทึกข้อมูล ${savedFacility.name} เรียบร้อยแล้ว`);
  };

  const handleDeleteFacility = (id: string) => {
    setFacilities(prev => prev.filter(f => f.id !== id));
    showToast('ลบสิ่งอำนวยความสะดวกเรียบร้อยแล้ว');
  };

  // Juristic Services & Rental Rules Handlers
  const handleSaveJuristicService = (savedItem: JuristicServiceItem) => {
    setJuristicServices(prev => {
      const idx = prev.findIndex(s => s.id === savedItem.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedItem;
        return next;
      } else {
        return [savedItem, ...prev];
      }
    });
    showToast(`บันทึกข้อมูล "${savedItem.title}" เรียบร้อยแล้ว`);
  };

  const handleDeleteJuristicService = (id: string) => {
    setJuristicServices(prev => prev.filter(s => s.id !== id));
    showToast('ลบรายการบริการ / ระเบียบเรียบร้อยแล้ว');
  };

  // GAS Integration Handlers
  const handleTestGasConnection = async (url: string) => {
    const res = await testGasConnection(url);
    if (res.success) {
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleSyncGas = async () => {
    if (!settings.googleWebAppUrl) {
      showToast('กรุณาระบุ Web App URL ก่อนทำการซิงค์', 'error');
      return;
    }
    showToast('กำลังซิงค์ข้อมูลกับ Google Sheet...', 'info');
    const res = await syncFromGas(settings.googleWebAppUrl);
    if (res.success) {
      if (res.rooms) setRooms(res.rooms);
      if (res.leases) setLeases(res.leases);
      if (res.bookings) setBookings(res.bookings);
      showToast('ซิงค์ข้อมูลจาก Google Sheets สำเร็จแล้ว');
    } else {
      showToast(`การซิงค์ขัดข้อง: ${res.error}`, 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F5] text-stone-900 selection:bg-stone-800 selection:text-stone-100 font-sans">
      
      {/* Main View Router: Customer View vs Admin Portal */}
      <main className="flex-1">
        {currentView === 'customer' ? (
          <CustomerView
            rooms={rooms}
            facilities={facilities}
            juristicServices={juristicServices}
            onSelectRoom={(room) => setSelectedRoomForDetail(room)}
            onShareRoom={handleShareRoom}
            onSelectFacility={(fac) => setSelectedFacilityForModal(fac)}
            onOpenStaffLogin={() => setIsLoginModalOpen(true)}
            isAdminLoggedIn={isAdminLoggedIn}
            onBackToAdmin={() => setCurrentView('admin')}
            contactLine={settings.defaultContactLine}
            contactPhone={settings.defaultContactPhone}
            agencyName={settings.agencyName}
            heroBackgroundImages={settings.heroBackgroundImages}
          />
        ) : (
          <AdminPortal
            rooms={rooms}
            leases={leases}
            bookings={bookings}
            facilities={facilities}
            juristicServices={juristicServices}
            settings={settings}
            onBackToCustomer={() => setCurrentView('customer')}
            onLogout={handleLogout}
            onSaveRoom={handleSaveRoom}
            onDeleteRoom={handleDeleteRoom}
            onSaveLease={handleSaveLease}
            onDeleteLease={handleDeleteLease}
            onSaveBooking={handleSaveBooking}
            onSaveFacility={handleSaveFacility}
            onDeleteFacility={handleDeleteFacility}
            onSaveJuristicService={handleSaveJuristicService}
            onDeleteJuristicService={handleDeleteJuristicService}
            onUpdateSettings={(newSettings) => {
              setSettings(newSettings);
              saveSettings(newSettings);
              if (newSettings.googleWebAppUrl) {
                syncSettingsToGas(newSettings.googleWebAppUrl, newSettings).catch(err => {
                  console.warn('Background settings cloud sync:', err);
                });
              }
              showToast('บันทึกการตั้งค่าระบบเรียบร้อย');
            }}
            onOpenHorizontalFlyer={(room) => setRoomForHorizontalFlyer(room)}
            onOpenBookingReceipt={(room, receipt) => {
              setBookingModalState({
                isOpen: true,
                room: room || null,
                receipt: receipt || null
              });
            }}
            onTestGasConnection={handleTestGasConnection}
            onSyncGas={handleSyncGas}
            onNotify={showToast}
          />
        )}
      </main>

      {/* Facility Detail Modal (Popup for facilities images & info) */}
      {selectedFacilityForModal && (
        <FacilityDetailModal
          facility={selectedFacilityForModal}
          onClose={() => setSelectedFacilityForModal(null)}
          contactLine={settings.defaultContactLine}
          contactPhone={settings.defaultContactPhone}
        />
      )}

      {/* Room Detail Modal (Photo gallery, specs, amenities, contact, share) */}
      {selectedRoomForDetail && (
        <RoomDetailModal
          room={selectedRoomForDetail}
          onClose={() => setSelectedRoomForDetail(null)}
          onShareRoom={handleShareRoom}
          isAdminLoggedIn={isAdminLoggedIn}
          onOpenHorizontalFlyer={(room) => {
            setSelectedRoomForDetail(null);
            setRoomForHorizontalFlyer(room);
          }}
          onOpenBookingReceipt={(room) => {
            setSelectedRoomForDetail(null);
            setBookingModalState({
              isOpen: true,
              room: room,
              receipt: null
            });
          }}
          onEditRoom={(_room) => {
            setSelectedRoomForDetail(null);
            setCurrentView('admin');
          }}
          onChangeStatus={(room, newStatus) => {
            handleSaveRoom({
              ...room,
              status: newStatus,
              isPublished: newStatus === 'available'
            });
            showToast(`เปลี่ยนสถานะห้อง ${room.roomNumber} เรียบร้อยแล้ว`);
          }}
          settings={settings}
          lease={leases.find(l => (l.roomId && l.roomId === selectedRoomForDetail.id) || (l.roomNumber && l.roomNumber.trim().toLowerCase() === selectedRoomForDetail.roomNumber.trim().toLowerCase()))}
          bookings={bookings.filter(b => (b.roomId && b.roomId === selectedRoomForDetail.id) || (b.roomNumber && b.roomNumber.trim().toLowerCase() === selectedRoomForDetail.roomNumber.trim().toLowerCase()))}
          onViewBookingReceipt={(receipt) => {
            setSelectedRoomForDetail(null);
            setBookingModalState({
              isOpen: true,
              room: selectedRoomForDetail,
              receipt: receipt
            });
          }}
          facilities={facilities}
          onSelectFacility={(fac) => setSelectedFacilityForModal(fac)}
        />
      )}

      {/* Horizontal Room Flyer Modal (Requirement: รูปแนวนอน, เซฟเป็นรูปภาพ, เซฟเป็น PDF, ปริ้นออกเครื่องปริ้น) */}
      {roomForHorizontalFlyer && (
        <HorizontalRoomFlyerModal
          room={roomForHorizontalFlyer}
          settings={settings}
          onClose={() => setRoomForHorizontalFlyer(null)}
          onNotify={showToast}
        />
      )}

      {/* Booking Receipt Modal (Requirement: ออกใบจองห้อง, ทำเป็น PDF, ปริ้น) */}
      {bookingModalState.isOpen && (
        <BookingReceiptModal
          selectedRoom={bookingModalState.room}
          receipt={bookingModalState.receipt}
          settings={settings}
          onSaveReceipt={handleSaveBooking}
          onClose={() => setBookingModalState({ isOpen: false, room: null, receipt: null })}
          onNotify={showToast}
        />
      )}

      {/* Staff Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        correctEmail={settings.adminEmail || 'nitibangkok.horizon@gmail.com'}
        correctPassword={settings.adminPassword || '7014'}
        onNotify={showToast}
      />

      {/* Notification Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

    </div>
  );
}
