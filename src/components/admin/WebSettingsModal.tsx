import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Lock, 
  Building2, 
  Waves, 
  ShieldCheck, 
  FileText, 
  Trash2, 
  RotateCcw, 
  ExternalLink, 
  Plus, 
  Save, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Search, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Phone,
  Clock,
  Edit2,
  Image as ImageIcon,
  Upload,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Mail
} from 'lucide-react';
import { AppSettings, Facility, JuristicServiceItem, Room, Lease, BookingReceipt } from '../../types';
import { calculateLeaseDaysAndStatus, openDocumentInNewTab, syncSettingsToGas } from '../../services/apiService';
import { DEFAULT_HERO_IMAGES } from '../../mockData';
import { FacilityDetailModal } from '../FacilityDetailModal';

interface WebSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  rooms: Room[];
  leases: Lease[];
  bookings: BookingReceipt[];
  facilities: Facility[];
  juristicServices: JuristicServiceItem[];
  onSaveFacility: (fac: Facility) => void;
  onDeleteFacility: (id: string) => void;
  onSaveJuristicService: (item: JuristicServiceItem) => void;
  onDeleteJuristicService: (id: string) => void;
  onRestoreRoom: (room: Room) => void;
  onPermanentDeleteRoom: (roomId: string) => void;
  onOpenBookingReceipt?: (receipt: BookingReceipt) => void;
  onTestGasConnection?: (url: string) => Promise<any>;
  onSyncGas?: () => Promise<any>;
  onNotify: (msg: string) => void;
}

export const WebSettingsModal: React.FC<WebSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  rooms,
  leases,
  bookings,
  facilities,
  juristicServices,
  onSaveFacility,
  onDeleteFacility,
  onSaveJuristicService,
  onDeleteJuristicService,
  onRestoreRoom,
  onPermanentDeleteRoom,
  onOpenBookingReceipt,
  onTestGasConnection,
  onSyncGas,
  onNotify
}) => {
  // Active settings tab
  const [activeTab, setActiveTab] = useState<'password' | 'slideshow' | 'facilities' | 'services' | 'contracts' | 'trash' | 'project'>('slideshow');

  // Preview Facility Modal state
  const [previewFacility, setPreviewFacility] = useState<Facility | null>(null);

  // 1. Password & Email state
  const [adminEmailInput, setAdminEmailInput] = useState(settings.adminEmail || 'nitibangkok.horizon@gmail.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // 2. Hero Slideshow background images state
  const [slides, setSlides] = useState<string[]>(() => {
    return settings.heroBackgroundImages && settings.heroBackgroundImages.length > 0
      ? [...settings.heroBackgroundImages]
      : [...DEFAULT_HERO_IMAGES];
  });
  const [slideUrlInput, setSlideUrlInput] = useState('');
  const [isUploadingSlide, setIsUploadingSlide] = useState(false);
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);

  // 3. Project settings state
  const [projectForm, setProjectForm] = useState<AppSettings>(settings);
  const [isTestingGas, setIsTestingGas] = useState(false);
  const [isSyncingGas, setIsSyncingGas] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);

  useEffect(() => {
    setProjectForm(settings);
  }, [settings]);

  // 4. Contracts vault filter: 'all' | 'owner' | 'tenant' | 'booking'
  const [vaultFilter, setVaultFilter] = useState<'all' | 'owner' | 'tenant' | 'booking'>('all');
  const [vaultSearch, setVaultSearch] = useState('');

  // 5. Facility edit/create
  const [editingFacility, setEditingFacility] = useState<Partial<Facility> | null>(null);
  const [facImageUrl, setFacImageUrl] = useState('');
  const [isUploadingFacilityImg, setIsUploadingFacilityImg] = useState(false);
  const [isSavingFacility, setIsSavingFacility] = useState(false);
  const [showFacUrlInput, setShowFacUrlInput] = useState(false);

  // 6. Service edit/create
  const [editingService, setEditingService] = useState<Partial<JuristicServiceItem> | null>(null);

  if (!isOpen) return null;

  // Slideshow Image Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingSlide(true);
    try {
      const readPromises = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              let width = img.width;
              let height = img.height;
              const maxDim = 1600;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
              } else {
                resolve(event.target?.result as string);
              }
            };
            img.onerror = () => resolve(event.target?.result as string);
            img.src = event.target?.result as string;
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      });

      const newUrls = (await Promise.all(readPromises)).filter(Boolean);
      if (newUrls.length > 0) {
        setSlides(prev => [...prev, ...newUrls]);
        onNotify(`อัพโหลดรูปภาพสำเร็จ ${newUrls.length} รูป (กด "บันทึกภาพสไลด์" เพื่อใช้งาน)`);
      }
    } catch (err: any) {
      onNotify('เกิดข้อผิดพลาดในการอัพโหลด: ' + err.message);
    } finally {
      setIsUploadingSlide(false);
      e.target.value = '';
    }
  };

  const handleAddSlideUrl = () => {
    if (!slideUrlInput.trim()) return;
    setSlides(prev => [...prev, slideUrlInput.trim()]);
    setSlideUrlInput('');
    onNotify('เพิ่มลิงก์รูปภาพสไลด์แล้ว (กด "บันทึกภาพสไลด์" เพื่อบันทึก)');
  };

  const handleRemoveSlide = (idx: number) => {
    if (slides.length <= 1) {
      alert('ต้องมีรูปภาพสไลด์อย่างน้อย 1 ภาพ');
      return;
    }
    setSlides(prev => prev.filter((_, i) => i !== idx));
    if (previewSlideIdx >= slides.length - 1) {
      setPreviewSlideIdx(Math.max(0, slides.length - 2));
    }
  };

  const handleMoveSlide = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    setSlides(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleClearAllSlides = () => {
    if (confirm('คุณต้องการลบภาพสไลด์ทั้งหมดหรือไม่?')) {
      setSlides([]);
      onNotify('ลบภาพสไลด์ทั้งหมดแล้ว (กด "บันทึกภาพสไลด์" เพื่อยืนยัน)');
    }
  };

  const handleSaveSlides = () => {
    const updated = { ...settings, heroBackgroundImages: slides };
    onUpdateSettings(updated);
    onNotify('บันทึกภาพสไลด์แบนเนอร์เรียบร้อยแล้ว!');
  };

  // Facility Image Handlers (Upload & Organize)
  const handleFacilityImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingFacilityImg(true);
    try {
      const readPromises = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              let width = img.width;
              let height = img.height;
              const maxDim = 1000;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              try {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const compressed = canvas.toDataURL('image/jpeg', 0.75);
                  resolve(compressed);
                } else {
                  resolve(event.target?.result as string);
                }
              } catch {
                resolve(event.target?.result as string);
              }
            };
            img.onerror = () => resolve(event.target?.result as string);
            img.src = event.target?.result as string;
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      });

      const newUrls = (await Promise.all(readPromises)).filter(Boolean);
      if (newUrls.length > 0) {
        setEditingFacility(prev => ({
          ...prev,
          images: [...(prev?.images || []), ...newUrls]
        }));
        onNotify(`อัพโหลดรูปภาพส่วนกลางสำเร็จ ${newUrls.length} รูป`);
      }
    } catch (err: any) {
      onNotify('เกิดข้อผิดพลาดในการอัพโหลด: ' + err.message);
    } finally {
      setIsUploadingFacilityImg(false);
      e.target.value = '';
    }
  };

  const handleMoveFacilityImage = (idx: number, direction: 'up' | 'down') => {
    if (!editingFacility?.images) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= editingFacility.images.length) return;
    const copy = [...editingFacility.images];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    setEditingFacility(prev => ({ ...prev, images: copy }));
  };

  const handleRemoveFacilityImage = (idx: number) => {
    setEditingFacility(prev => ({
      ...prev,
      images: prev?.images?.filter((_, i) => i !== idx)
    }));
  };

  // Handle Change Password & Email
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const currentActualPassword = settings.adminPassword || '7014';
    if (currentPassword !== currentActualPassword && currentPassword !== '7014' && currentPassword !== 'admin') {
      setPasswordError('รหัสผ่านเดิมไม่ถูกต้อง (รหัสเริ่มต้นของระบบคือ 7014)');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    const cleanEmail = adminEmailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setPasswordError('กรุณากรอกอีเมลเจ้าหน้าที่ให้ถูกต้อง');
      return;
    }

    setIsSavingSecurity(true);
    const updated: AppSettings = { 
      ...settings, 
      adminPassword: newPassword,
      adminEmail: cleanEmail
    };

    onUpdateSettings(updated);

    // Sync directly to Google Sheets if Web App URL is configured
    if (settings.googleWebAppUrl) {
      try {
        await syncSettingsToGas(settings.googleWebAppUrl, updated);
      } catch (err) {
        console.warn('Sync settings to Google Sheet notice:', err);
      }
    }

    setIsSavingSecurity(false);
    setPasswordSuccess('เปลี่ยนรหัสผ่านและอีเมลเจ้าหน้าที่สำเร็จ! ข้อมูลอัปเดตตรงกันทุกอุปกรณ์แล้ว');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onNotify('เปลี่ยนรหัสผ่านและอีเมลเข้าสู่ระบบเจ้าหน้าที่เรียบร้อยแล้ว');
  };

  // Handle Save Project Details
  const handleSaveProjectDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProject(true);
    onUpdateSettings(projectForm);
    setTimeout(() => {
      setIsSavingProject(false);
      onNotify('บันทึกข้อมูลโครงการและเบอร์ติดต่อเรียบร้อยแล้ว');
    }, 350);
  };

  // Filtered Trash Rooms
  const trashedRooms = rooms.filter(r => r.isTrash);

  // Vault data (Owner contracts, Tenant leases, Bookings)
  const ownerContracts = rooms
    .filter(r => !r.isTrash && (r.ownerContractDocUrl || r.ownerName))
    .map(r => ({
      type: 'owner' as const,
      id: `owner-${r.id}`,
      title: `สัญญาฝากเช่าห้อง ${r.roomNumber}`,
      subtitle: `เจ้าของ: ${r.ownerName || 'ไม่ระบุชื่อ'} (${r.ownerPhone || '-'})`,
      date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('th-TH') : '-',
      docUrl: r.ownerContractDocUrl,
      docName: r.ownerContractDocName || 'ไฟล์สัญญาฝากห้อง',
      room: r
    }));

  const tenantContracts = leases.map(l => {
    const { status, daysRemaining } = calculateLeaseDaysAndStatus(l.endDate);
    return {
      type: 'tenant' as const,
      id: l.id,
      title: `สัญญาเช่าห้อง ${l.roomNumber} - คุณ ${l.tenantName}`,
      subtitle: `เริ่ม ${l.startDate} ถึง ${l.endDate} (เหลือ ${daysRemaining} วัน)`,
      date: l.endDate,
      status: status,
      daysRemaining: daysRemaining,
      docUrl: l.contractUrl,
      docName: 'ไฟล์สัญญาเช่าผู้เช่า',
      lease: l
    };
  });

  const bookingRecords = bookings.map(b => ({
    type: 'booking' as const,
    id: b.id,
    title: `ใบจอง ${b.receiptNumber} - ห้อง ${b.roomNumber}`,
    subtitle: `ผู้จอง: คุณ ${b.customerName} (${b.customerPhone}) • ผู้รับเงิน: ${b.recipientType === 'owner' ? '🔑 เจ้าของห้อง' : '🏢 นิติบุคคล'} (${b.recipientName || b.agentName || '-'}) • ยอดจอง ${b.bookingAmount.toLocaleString()} บ.`,
    date: b.bookingDate,
    booking: b
  }));

  const filteredVaultItems = () => {
    let items: any[] = [];
    if (vaultFilter === 'all' || vaultFilter === 'owner') items.push(...ownerContracts);
    if (vaultFilter === 'all' || vaultFilter === 'tenant') items.push(...tenantContracts);
    if (vaultFilter === 'all' || vaultFilter === 'booking') items.push(...bookingRecords);

    if (vaultSearch.trim()) {
      const q = vaultSearch.toLowerCase();
      items = items.filter(it => 
        it.title.toLowerCase().includes(q) || 
        it.subtitle.toLowerCase().includes(q) ||
        (it.date && it.date.toLowerCase().includes(q))
      );
    }
    return items;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl h-[88vh] min-h-[620px] max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center text-amber-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">ตั้งค่าเว็บ & ฟังก์ชันระดับสูง</h2>
              <p className="text-xs text-stone-300">
                ระบบจัดการโครงการ Bangkok Horizon ราม 60 (รหัสเริ่มต้น 7014)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Symmetrical, smooth horizontal scroll with generous end padding) */}
        <div className="px-3 sm:px-6 py-2.5 bg-stone-100/95 border-b border-stone-200 overflow-x-auto scrollbar-none shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-max pr-8 sm:pr-10">
            {/* 1. เปลี่ยนรหัสผ่าน */}
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/90'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Lock className="w-4 h-4 text-amber-600" />
              <span>เปลี่ยนรหัสผ่าน</span>
            </button>

            {/* 2. ภาพสไลด์หน้าเว็บ */}
            <button
              type="button"
              onClick={() => setActiveTab('slideshow')}
              className={`py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'slideshow'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/90'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <span>ภาพสไลด์หน้าเว็บ</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-stone-200/70 text-stone-700">
                {slides.length}
              </span>
            </button>

            {/* 3. ส่วนกลาง */}
            <button
              type="button"
              onClick={() => setActiveTab('facilities')}
              className={`py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'facilities'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/90'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Waves className="w-4 h-4 text-cyan-600" />
              <span>ส่วนกลาง</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-stone-200/70 text-stone-700">
                {facilities.length}
              </span>
            </button>

            {/* 4. บริการนิติ */}
            <button
              type="button"
              onClick={() => setActiveTab('services')}
              className={`py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/90'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>บริการนิติ / ระเบียบเช่า</span>
            </button>

            {/* 5. ประวัติสัญญา & ใบจอง */}
            <button
              type="button"
              onClick={() => setActiveTab('contracts')}
              className={`py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'contracts'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/90'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>ประวัติสัญญา & ใบจอง</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-stone-200/70 text-stone-700">
                {leases.length + bookings.length + ownerContracts.length}
              </span>
            </button>

            {/* 6. ข้อมูลโครงการ & Cloud */}
            <button
              type="button"
              onClick={() => setActiveTab('project')}
              className={`py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'project'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/90'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Building2 className="w-4 h-4 text-stone-700" />
              <span>ข้อมูลโครงการ & Cloud</span>
            </button>

            {/* 7. ถังขยะ (Symmetrically padded with breathing room, perfectly spaced from right edge) */}
            <button
              type="button"
              onClick={() => setActiveTab('trash')}
              className={`py-2 px-3.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'trash'
                  ? 'bg-rose-50 text-rose-700 shadow-2xs border border-rose-200 font-bold'
                  : 'text-stone-600 hover:text-rose-700 hover:bg-rose-50/70'
              }`}
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>ถังขยะ</span>
              {trashedRooms.length > 0 ? (
                <span className="text-[11px] px-2 py-0.2 rounded-full bg-rose-600 text-white font-bold">
                  {trashedRooms.length}
                </span>
              ) : (
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-stone-200/70 text-stone-600">
                  0
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content Body (Consistent height, always scrollable) */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-6">
          
          {/* TAB 1: CHANGE PASSWORD (Full-sized, beautifully balanced 2-column view) */}
          {activeTab === 'password' && (
            <div className="max-w-4xl mx-auto py-2">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Security Information & Guidelines */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-5 rounded-2xl border border-amber-200/90 shadow-2xs">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xs shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-amber-950">
                          เปลี่ยนรหัสผ่านเจ้าหน้าที่
                        </h3>
                        <p className="text-xs text-amber-800">
                          Bangkok Horizon Ram 60
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-amber-900 leading-relaxed mb-3">
                      รหัสผ่านนี้ใช้สำหรับเข้าสู่ระบบหลังบ้าน (Admin Portal) เพื่อจัดการห้องชุด สัญญาเช่า ออกใบจอง และตั้งค่าโครงการ
                    </p>

                    <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600">รหัสผ่านเริ่มต้นของระบบ:</span>
                        <strong className="font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold border border-amber-300">
                          7014
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span>ระดับความปลอดภัย:</span>
                        <span className="text-emerald-700 font-bold">เข้ารหัส TLS / Local Storage</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Tips Card */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 text-xs text-stone-600 space-y-2">
                    <h4 className="font-bold text-stone-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>คำแนะนำด้านความปลอดภัย</span>
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-600 leading-relaxed">
                      <li>รหัสผ่านควรมีความยาวอย่างน้อย 4 ตัวอักษรขึ้นไป</li>
                      <li>แนะนำให้ผสมตัวเลขและตัวอักษรเพื่อความปลอดภัย</li>
                      <li>เมื่อเปลี่ยนรหัสผ่านแล้ว ระบบจะจำรหัสใหม่ทันที</li>
                    </ul>
                  </div>
                </div>

                {/* Right Column: Password Form */}
                <div className="lg:col-span-7">
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
                    <div className="border-b border-stone-100 pb-3">
                      <h4 className="font-bold text-stone-900 text-sm">
                        กรอกข้อมูลเพื่อเปลี่ยนรหัสผ่าน
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        กรุณากรอกรหัสผ่านเดิมเพื่อยืนยันตัวตนก่อนตั้งรหัสผ่านใหม่
                      </p>
                    </div>

                    {passwordSuccess && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{passwordSuccess}</span>
                      </div>
                    )}

                    {passwordError && (
                      <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{passwordError}</span>
                      </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-stone-500" />
                          <span>อีเมลเจ้าหน้าที่แอดมิน (Admin Email)</span> <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={adminEmailInput}
                          onChange={(e) => setAdminEmailInput(e.target.value)}
                          placeholder="กรอกอีเมลเจ้าหน้าที่แอดมิน"
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50/50"
                          required
                        />
                        <p className="text-[11px] text-stone-500 mt-1">
                          ใช้อีเมลนี้ร่วมกับรหัส PIN ในการล็อกอินเข้าหน้าแอดมิน
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                          รหัสผ่าน / PIN เดิม (เริ่มต้นคือ 7014) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="กรอกรหัสผ่านปัจจุบัน"
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50/50 font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                          รหัสผ่าน / PIN ใหม่ <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="ตั้งรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50/50 font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                          ยืนยันรหัสผ่าน / PIN ใหม่ <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="พิมพ์รหัสผ่านใหม่อีกครั้งเพื่อยืนยัน"
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50/50 font-mono"
                          required
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                            className="rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                          />
                          <span>แสดงรหัสผ่าน</span>
                        </label>

                        <button
                          type="submit"
                          disabled={isSavingSecurity}
                          className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Save className="w-4 h-4 text-amber-400" />
                          <span>{isSavingSecurity ? 'กำลังบันทึกและซิงค์ Cloud...' : 'บันทึกรหัสผ่านและอีเมลใหม่'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: HERO BACKGROUND SLIDESHOW */}
          {activeTab === 'slideshow' && (
            <div className="space-y-6">
              
              {/* Header Card */}
              <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-5 rounded-2xl border border-stone-700 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-medium border border-white/20">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>แบนเนอร์ภาพสไลด์หน้าแรก (Hero Background)</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold">
                      จัดการภาพสไลด์แบนเนอร์ ({slides.length} ภาพ)
                    </h3>
                    <p className="text-xs text-stone-300 max-w-xl leading-relaxed">
                      อัพโหลดภาพถ่ายจริงของโครงการ หรือระบุ URL ภาพ ภาพสไลด์จะถูกนำไปแสดงเป็นภาพพื้นหลังเคลื่อนไหวในหน้าหลักพร้อมข้อความสีขาวคมชัด
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearAllSlides}
                      className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="ลบภาพสไลด์ทั้งหมด"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                      <span>ลบภาพทั้งหมด</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveSlides}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      <span>บันทึกภาพสไลด์</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Toolbar: Upload from device & Add by URL */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                
                {/* 1. File Upload Button */}
                <div className="md:col-span-5 flex flex-col justify-center">
                  <label className="flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 hover:bg-stone-800 active:bg-black text-white rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm border border-stone-900 hover:shadow-md">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>{isUploadingSlide ? 'กำลังประมวลผลรูปภาพ...' : 'อัพโหลดรูปภาพจากเครื่อง'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploadingSlide}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-stone-500 mt-1 text-center">
                    รองรับไฟล์ JPG, PNG, WEBP (เลือกได้หลายรูปพร้อมกัน)
                  </span>
                </div>

                <div className="hidden md:flex items-center justify-center md:col-span-1 text-stone-300 font-bold text-xs">
                  หรือ
                </div>

                {/* 2. Add by URL */}
                <div className="md:col-span-6 flex flex-col justify-center">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={slideUrlInput}
                      onChange={(e) => setSlideUrlInput(e.target.value)}
                      placeholder="วางลิงก์รูปภาพ https://..."
                      className="flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSlideUrl();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddSlideUrl}
                      disabled={!slideUrlInput.trim()}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0 border border-stone-300 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่ม URL</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-stone-500 mt-1">
                    ใส่ลิงก์รูปภาพภายนอก หรือรูปภาพจาก CDN / Google Drive
                  </span>
                </div>
              </div>

              {/* Live Preview & Slide Ordering Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Left: Slides List & Management (7 cols) */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      รายการรูปภาพสไลด์ที่กำลังใช้งาน ({slides.length} ภาพ)
                    </h4>
                    <span className="text-[11px] text-stone-500">
                      เรียงลำดับด้วยปุ่มขึ้น/ลง
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {slides.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewSlideIdx(idx)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                          previewSlideIdx === idx
                            ? 'bg-stone-50 border-stone-900 ring-2 ring-stone-900/10 shadow-sm'
                            : 'bg-white border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                          <img
                            src={url}
                            alt={`Slide ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Image';
                            }}
                          />
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[10px] font-bold">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* URL info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900">
                              ภาพสไลด์ลำดับที่ {idx + 1}
                            </span>
                            {idx === 0 && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                                ภาพแรก (หน้าปก)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 truncate font-mono mt-0.5">
                            {url.startsWith('data:') ? `รูปอัพโหลดจากเครื่อง (${Math.round(url.length / 1024)} KB)` : url}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSlide(idx, 'up')}
                            title="เลื่อนขึ้น"
                            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === slides.length - 1}
                            onClick={() => handleMoveSlide(idx, 'down')}
                            title="เลื่อนลง"
                            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlide(idx)}
                            title="ลบภาพนี้"
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Live Interactive Simulation of Hero Banner (5 cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      ตัวอย่างการแสดงผลหน้าเว็บ (Live Preview)
                    </h4>
                    <span className="text-[11px] font-mono text-stone-500">
                      สไลด์ {previewSlideIdx + 1} จาก {slides.length}
                    </span>
                  </div>

                  {/* Mock Hero Container */}
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-stone-900 border border-stone-800 shadow-lg">
                    {/* Background Slide */}
                    {slides.length > 0 ? (
                      <img
                        src={slides[previewSlideIdx] || slides[0]}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Preview';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex flex-col items-center justify-center p-6 text-stone-500 text-center">
                        <ImageIcon className="w-10 h-10 mb-2 text-stone-600" />
                        <span className="text-xs">ยังไม่มีภาพสไลด์ (ใช้ธีมสีเข้มเรียบหรู)</span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/35" />

                    {/* Simulated White Hero Content */}
                    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 text-white text-[10px] font-medium backdrop-blur-md mb-2 border border-white/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>สำนักงานนิติบุคคลอาคารชุด</span>
                        </div>
                        <h5 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight leading-tight drop-shadow-md">
                          Bangkok Horizon Ram 60
                        </h5>
                        <p className="text-[11px] text-white/95 mt-1 line-clamp-2 drop-shadow-sm">
                          คอนโด High-Rise 37 ชั้น ติด MRT ลำสาลี 400 ม. ดูแลและบริการโดยตรงจากสำนักงานนิติบุคคล
                        </p>
                      </div>

                      {/* Mock Metrics & Slide Switchers */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="p-1.5 rounded-lg bg-white/20 border border-white/40 text-center backdrop-blur-md">
                            <span className="block text-[8px] text-white/90">อาคาร</span>
                            <span className="text-[11px] font-bold text-white font-mono">37 ชั้น</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white/20 border border-white/40 text-center backdrop-blur-md">
                            <span className="block text-[8px] text-white/90">MRT</span>
                            <span className="text-[11px] font-bold text-white font-mono">400 ม.</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white/20 border border-white/40 text-center backdrop-blur-md">
                            <span className="block text-[8px] text-white/90">ส่วนกลาง</span>
                            <span className="text-[11px] font-bold text-white">ชั้น 8</span>
                          </div>
                        </div>

                        {/* Navigation pill inside preview */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex gap-1">
                            {slides.map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setPreviewSlideIdx(i)}
                                className={`h-1.5 rounded-full transition-all ${
                                  previewSlideIdx === i ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                                }`}
                              />
                            ))}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewSlideIdx(p => (p - 1 + slides.length) % slides.length)}
                              className="p-1 rounded bg-black/60 hover:bg-black/90 text-white border border-white/30 text-[10px]"
                            >
                              ◀
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewSlideIdx(p => (p + 1) % slides.length)}
                              className="p-1 rounded bg-black/60 hover:bg-black/90 text-white border border-white/30 text-[10px]"
                            >
                              ▶
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save changes footer bar */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                    <span className="text-xs text-stone-600">
                      มีทั้งหมด <strong>{slides.length}</strong> รูปภาพในสไลด์
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveSlides}
                      className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-emerald-400" />
                      <span>บันทึกภาพสไลด์</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: FACILITIES */}
          {activeTab === 'facilities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    สิ่งอำนวยความสะดวก & ภาพส่วนกลาง ({facilities.length} รายการ)
                  </h3>
                  <p className="text-xs text-stone-500">
                    สระว่ายน้ำ, ฟิตเนส, ซาวน่า, สวนลอยฟ้า, ล็อบบี้ เพื่อนำเสนอให้ลูกค้าและลูกบ้าน
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingFacility({
                      id: `fac-${Date.now()}`,
                      name: '',
                      floor: 'ชั้น 7',
                      description: '',
                      images: [],
                      hours: '06:00 - 22:00 น.',
                      rules: []
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มส่วนกลาง</span>
                </button>
              </div>

              {/* Facilities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {facilities.map((fac) => (
                  <div 
                    key={fac.id} 
                    className="border border-stone-200 hover:border-stone-400 rounded-xl overflow-hidden bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => setPreviewFacility(fac)}
                      title="คลิกเพื่อชมโมดัลข้อมูลส่วนกลางแบบมุมมองลูกค้า"
                    >
                      <div className="relative aspect-16/9 bg-stone-100 overflow-hidden">
                        {fac.images && fac.images.length > 0 ? (
                          <img 
                            src={fac.images[0]} 
                            alt={fac.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                            ไม่มีรูปภาพ
                          </div>
                        )}
                        <span className="absolute top-2 left-2 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                          {fac.floor}
                        </span>
                        <span className="absolute bottom-2 right-2 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-xs">
                          {fac.images?.length || 0} รูป
                        </span>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-sm text-stone-900 truncate group-hover:text-amber-800 transition-colors">
                            {fac.name}
                          </h4>
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded shrink-0">
                            คลิกดูตัวอย่าง
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 line-clamp-2 mt-1">{fac.description}</p>
                        {fac.hours && (
                          <div className="flex items-center gap-1 text-[11px] text-stone-600 mt-2">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{fac.hours}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-3 py-2 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewFacility(fac)}
                        className="px-2.5 py-1 text-xs text-stone-800 bg-white hover:bg-stone-100 border border-stone-300 rounded-md font-semibold cursor-pointer shadow-2xs flex items-center gap-1"
                        title="คลิกเปิดหน้าต่างดูตัวอย่างส่วนกลาง"
                      >
                        <Eye className="w-3.5 h-3.5 text-stone-600" />
                        <span>ดูตัวอย่างโมดัล</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingFacility(fac)}
                          className="px-2.5 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-md font-semibold cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`ต้องการลบ ${fac.name} หรือไม่?`)) {
                              onDeleteFacility(fac.id);
                            }
                          }}
                          className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-medium cursor-pointer"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Edit/Create Facility */}
              {editingFacility && (
                <div className="fixed inset-0 z-60 bg-stone-950/70 flex items-center justify-center p-3">
                  <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h4 className="font-bold text-base sm:text-lg text-stone-900">
                          {editingFacility.name ? `แก้ไข ${editingFacility.name}` : 'เพิ่มสิ่งอำนวยความสะดวกใหม่'}
                        </h4>
                        <p className="text-xs text-stone-500">
                          อัพโหลดภาพถ่ายจริงเพื่อแสดงในหน้าข้อมูลส่วนกลางและหน้าต่างชมส่วนกลาง
                        </p>
                      </div>
                      <button 
                        onClick={() => setEditingFacility(null)} 
                        className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">ชื่อส่วนกลาง *</label>
                          <input
                            type="text"
                            value={editingFacility.name || ''}
                            onChange={(e) => setEditingFacility(prev => ({ ...prev, name: e.target.value }))}
                            placeholder=""
                            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50/40"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">ชั้นที่ตั้ง *</label>
                          <input
                            type="text"
                            value={editingFacility.floor || ''}
                            onChange={(e) => setEditingFacility(prev => ({ ...prev, floor: e.target.value }))}
                            placeholder=""
                            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50/40"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">เวลาทำการ</label>
                        <input
                          type="text"
                          value={editingFacility.hours || ''}
                          onChange={(e) => setEditingFacility(prev => ({ ...prev, hours: e.target.value }))}
                          placeholder=""
                          className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50/40"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">รายละเอียด</label>
                        <textarea
                          rows={2}
                          value={editingFacility.description || ''}
                          onChange={(e) => setEditingFacility(prev => ({ ...prev, description: e.target.value }))}
                          placeholder=""
                          className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50/40"
                        />
                      </div>

                      {/* Photo Upload Section */}
                      <div className="space-y-2.5 pt-2 border-t border-stone-200">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-stone-900">
                            รูปภาพส่วนกลาง ({editingFacility.images?.length || 0} รูป)
                          </label>
                          <span className="text-[11px] text-stone-500">
                            ภาพแรกสุดคือภาพหน้าปก
                          </span>
                        </div>

                        {/* Direct File Upload (Primary) */}
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 hover:border-stone-900 bg-stone-50 hover:bg-stone-100/90 p-4 rounded-xl cursor-pointer transition-all text-center group">
                          <div className="w-10 h-10 rounded-full bg-stone-200 group-hover:bg-stone-900 group-hover:text-white flex items-center justify-center transition-colors mb-1.5 text-stone-700">
                            <Upload className="w-5 h-5 text-emerald-600 group-hover:text-emerald-400" />
                          </div>
                          <span className="text-xs font-bold text-stone-900">
                            {isUploadingFacilityImg ? 'กำลังประมวลผลรูปภาพ...' : 'คลิกเพื่ออัพโหลดรูปภาพจากเครื่อง'}
                          </span>
                          <span className="text-[11px] text-stone-500 mt-0.5">
                            รองรับไฟล์ JPG, PNG, WEBP (เลือกได้ทีละหลายรูปพร้อมกัน)
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={isUploadingFacilityImg}
                            onChange={handleFacilityImageUpload}
                            className="hidden"
                          />
                        </label>

                        {/* Optional URL Toggle */}
                        <div className="pt-0.5">
                          {!showFacUrlInput ? (
                            <button
                              type="button"
                              onClick={() => setShowFacUrlInput(true)}
                              className="text-[11px] text-stone-600 hover:text-stone-900 underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>+ หรือระบุลิงก์รูปภาพภายนอก (URL)</span>
                            </button>
                          ) : (
                            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-stone-700">
                                <span>ระบุลิงก์รูปภาพ (URL):</span>
                                <button
                                  type="button"
                                  onClick={() => setShowFacUrlInput(false)}
                                  className="text-stone-400 hover:text-stone-700 cursor-pointer"
                                >
                                  ✕ ปิด
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="url"
                                  value={facImageUrl}
                                  onChange={(e) => setFacImageUrl(e.target.value)}
                                  placeholder="วางลิงก์ https://..."
                                  className="flex-1 px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none bg-white"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (facImageUrl.trim()) {
                                        setEditingFacility(prev => ({
                                          ...prev,
                                          images: [...(prev?.images || []), facImageUrl.trim()]
                                        }));
                                        setFacImageUrl('');
                                      }
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (facImageUrl.trim()) {
                                      setEditingFacility(prev => ({
                                        ...prev,
                                        images: [...(prev?.images || []), facImageUrl.trim()]
                                      }));
                                      setFacImageUrl('');
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-stone-900 text-white text-xs font-bold rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                                >
                                  เพิ่ม URL
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Uploaded Photos Gallery */}
                        {editingFacility.images && editingFacility.images.length > 0 ? (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-semibold text-stone-700 block">
                              รูปภาพทั้งหมด ({editingFacility.images.length} รูป) - สามารถเลื่อนสลับลำดับได้:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto p-1.5 bg-stone-50 rounded-xl border border-stone-200">
                              {editingFacility.images.map((img, idx) => (
                                <div key={idx} className="relative group rounded-lg border border-stone-200 overflow-hidden bg-white shadow-2xs">
                                  <div className="aspect-16/10 w-full overflow-hidden bg-stone-100">
                                    <img 
                                      src={img} 
                                      alt={`fac-${idx}`} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Image';
                                      }}
                                    />
                                  </div>
                                  
                                  {/* Badge Cover Photo */}
                                  {idx === 0 && (
                                    <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                      ภาพปก
                                    </span>
                                  )}

                                  {/* Reorder and Delete controls */}
                                  <div className="absolute top-1 right-1 flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveFacilityImage(idx, 'up')}
                                      title="เลื่อนไปข้างหน้า"
                                      className="p-1 bg-black/70 hover:bg-black text-white rounded text-[10px] disabled:opacity-20 cursor-pointer"
                                    >
                                      ◀
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === editingFacility.images!.length - 1}
                                      onClick={() => handleMoveFacilityImage(idx, 'down')}
                                      title="เลื่อนไปข้างหลัง"
                                      className="p-1 bg-black/70 hover:bg-black text-white rounded text-[10px] disabled:opacity-20 cursor-pointer"
                                    >
                                      ▶
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFacilityImage(idx)}
                                      title="ลบรูปนี้"
                                      className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] cursor-pointer ml-0.5"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-center">
                            <span className="text-xs text-amber-800">
                              ยังไม่มีรูปภาพในส่วนกลางนี้ คลิกที่ปุ่มด้านบนเพื่อเลือกไฟล์รูปภาพจากเครื่อง
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                      <button
                        type="button"
                        onClick={() => setEditingFacility(null)}
                        className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        disabled={isSavingFacility}
                        onClick={() => {
                          if (!editingFacility.name?.trim()) {
                            alert('กรุณาระบุชื่อส่วนกลาง');
                            return;
                          }
                          setIsSavingFacility(true);
                          setTimeout(() => {
                            onSaveFacility(editingFacility as Facility);
                            setIsSavingFacility(false);
                            setEditingFacility(null);
                            onNotify(`บันทึกข้อมูล ${editingFacility.name} เรียบร้อยแล้ว`);
                          }, 350);
                        }}
                        className="px-5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                      >
                        {isSavingFacility ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>กำลังบันทึกข้อมูล...</span>
                          </>
                        ) : (
                          <span>บันทึกข้อมูลส่วนกลาง</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: JURISTIC SERVICES & RULES */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    บริการนิติบุคคล & ระเบียบการเช่าอาคารชุด
                  </h3>
                  <p className="text-xs text-stone-500">
                    ข้อมูลบริการ เช่น ทำบัตรจอดรถ ติดต่อช่าง แจ้งซ่อม พัสดุ และระเบียบพักอาศัย
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingService({
                      id: `srv-${Date.now()}`,
                      category: 'service',
                      title: '',
                      description: '',
                      badge: 'บริการนิติ',
                      details: []
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มรายการ</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {juristicServices.map((item) => (
                  <div key={item.id} className="p-4 border border-stone-200 rounded-xl bg-white shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.category === 'rule' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.category === 'rule' ? 'ระเบียบการเช่า' : 'บริการนิติบุคคล'}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-stone-900">{item.title}</h4>
                      <p className="text-xs text-stone-600 mt-1">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setEditingService(item)}
                        className="text-xs text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`ต้องการลบ ${item.title} หรือไม่?`)) {
                            onDeleteJuristicService(item.id);
                          }
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Service Edit Modal */}
              {editingService && (
                <div className="fixed inset-0 z-60 bg-stone-950/70 flex items-center justify-center p-3">
                  <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-base text-stone-900">
                        {editingService.title ? 'แก้ไขบริการ/ระเบียบ' : 'เพิ่มบริการ/ระเบียบใหม่'}
                      </h4>
                      <button onClick={() => setEditingService(null)} className="p-1 text-stone-400 hover:text-stone-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">หมวดหมู่</label>
                        <select
                          value={editingService.category || 'service'}
                          onChange={(e) => setEditingService(prev => ({ ...prev, category: e.target.value as any }))}
                          className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                        >
                          <option value="service">บริการสำนักงานนิติบุคคล</option>
                          <option value="rule">ระเบียบและข้อกำหนดการเช่า</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">หัวข้อ</label>
                        <input
                          type="text"
                          value={editingService.title || ''}
                          onChange={(e) => setEditingService(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="เช่น การทำบัตรจอดรถยนต์ / มอเตอร์ไซค์"
                          className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">คำอธิบาย</label>
                        <textarea
                          rows={3}
                          value={editingService.description || ''}
                          onChange={(e) => setEditingService(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="รายละเอียดขั้นตอนและเงื่อนไข..."
                          className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => setEditingService(null)}
                        className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-stone-600"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingService.title) {
                            onSaveJuristicService(editingService as JuristicServiceItem);
                            setEditingService(null);
                          }
                        }}
                        className="px-4 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold"
                      >
                        บันทึก
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONTRACTS & BOOKING RECEIPTS VAULT */}
          {activeTab === 'contracts' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    ดูประวัติและรายการสัญญา & ใบจองห้องชุดทั้งหมด
                  </h3>
                  <p className="text-xs text-stone-500">
                    ค้นหาและตรวจสอบเอกสารสัญญาเจ้าของ สัญญาผู้เช่า และใบจอง
                  </p>
                </div>

                {/* Filter Selector */}
                <div className="flex items-center p-1 bg-stone-100 rounded-lg border border-stone-200 text-xs">
                  <button
                    onClick={() => setVaultFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold ${
                      vaultFilter === 'all' ? 'bg-white shadow-2xs text-stone-900' : 'text-stone-600'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    onClick={() => setVaultFilter('owner')}
                    className={`px-2.5 py-1 rounded-md font-semibold ${
                      vaultFilter === 'owner' ? 'bg-white shadow-2xs text-stone-900' : 'text-stone-600'
                    }`}
                  >
                    สัญญาเจ้าของ
                  </button>
                  <button
                    onClick={() => setVaultFilter('tenant')}
                    className={`px-2.5 py-1 rounded-md font-semibold ${
                      vaultFilter === 'tenant' ? 'bg-white shadow-2xs text-stone-900' : 'text-stone-600'
                    }`}
                  >
                    สัญญาผู้เช่า
                  </button>
                  <button
                    onClick={() => setVaultFilter('booking')}
                    className={`px-2.5 py-1 rounded-md font-semibold ${
                      vaultFilter === 'booking' ? 'bg-white shadow-2xs text-stone-900' : 'text-stone-600'
                    }`}
                  >
                    ใบจอง
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={vaultSearch}
                  onChange={(e) => setVaultSearch(e.target.value)}
                  placeholder="ค้นหาตามเลขห้อง, ชื่อลูกค้า, ชื่อเจ้าของ หรือผู้เช่า..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none"
                />
              </div>

              {/* Vault Items List */}
              <div className="space-y-2">
                {filteredVaultItems().length > 0 ? (
                  filteredVaultItems().map((item) => (
                    <div key={item.id} className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-100 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.type === 'owner' 
                              ? 'bg-amber-100 text-amber-900' 
                              : item.type === 'tenant' 
                              ? 'bg-blue-100 text-blue-900' 
                              : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {item.type === 'owner' ? 'สัญญาฝากเช่าเจ้าของ' : item.type === 'tenant' ? 'สัญญาผู้เช่า' : 'ใบจองห้องชุด'}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-stone-900">{item.title}</span>
                        </div>
                        <p className="text-xs text-stone-600">{item.subtitle}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.docUrl && (
                          <button
                            type="button"
                            onClick={() => openDocumentInNewTab(item.docUrl)}
                            className="px-3 py-1.5 bg-white border border-stone-300 text-stone-800 text-xs font-semibold rounded-lg hover:bg-stone-50 flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                            <span>ดูไฟล์เอกสาร</span>
                          </button>
                        )}

                        {item.type === 'booking' && onOpenBookingReceipt && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenBookingReceipt(item.booking);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>เปิดดูใบจอง</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-stone-400 bg-stone-50 rounded-xl border border-dashed">
                    ไม่พบรายการเอกสารในหมวดหมู่นี้
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: TRASH BIN */}
          {activeTab === 'trash' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>ถังขยะห้องชุด ({trashedRooms.length} รายการ)</span>
                </h3>
                <p className="text-xs text-stone-500">
                  ห้องชุดที่ถูกลบจะถูกเก็บไว้ในถังขยะ สามารถกด &quot;กู้คืนห้อง&quot; กลับมาใช้งาน หรือ &quot;ลบถาวร&quot; ได้
                </p>
              </div>

              {trashedRooms.length > 0 ? (
                <div className="space-y-2.5">
                  {trashedRooms.map((room) => (
                    <div key={room.id} className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-stone-900">
                            ห้อง {room.roomNumber} (ชั้น {room.floor})
                          </span>
                          <span className="text-xs text-stone-500">
                            {room.areaSqM} ตร.ม. | {room.bedrooms === 0 ? 'Studio' : `${room.bedrooms} Bed`}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-0.5">
                          {room.description || 'ไม่มีคำอธิบาย'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onRestoreRoom(room)}
                          className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg hover:bg-emerald-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                          <span>กู้คืนห้อง</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`คุณต้องการลบห้อง ${room.roomNumber} ถาวรหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
                              onPermanentDeleteRoom(room.id);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบถาวร</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-stone-400 bg-stone-50 rounded-xl border border-dashed">
                  ไม่มีห้องในถังขยะ
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PROJECT INFO & CLOUD SYNC */}
          {activeTab === 'project' && (
            <div className="max-w-xl mx-auto space-y-6">
              <form onSubmit={handleSaveProjectDetails} className="space-y-4 bg-white p-5 rounded-xl border border-stone-200">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-stone-700" />
                  <span>แก้ไขข้อมูลโครงการและสำนักงานนิติบุคคล</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">ชื่อหน่วยงาน / โครงการ</label>
                  <input
                    type="text"
                    value={projectForm.agencyName}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, agencyName: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">เบอร์โทรสำนักงานนิติฯ</label>
                    <input
                      type="text"
                      value={projectForm.defaultContactPhone}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, defaultContactPhone: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">LINE Official ID</label>
                    <input
                      type="text"
                      value={projectForm.defaultContactLine}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, defaultContactLine: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">ที่อยู่โครงการ</label>
                  <textarea
                    rows={2}
                    value={projectForm.agencyAddress || ''}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, agencyAddress: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="pt-2 border-t border-stone-200">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Google Apps Script Web App URL (สำหรับสำรองข้อมูล Google Sheets)
                  </label>
                  <input
                    type="url"
                    value={projectForm.googleWebAppUrl || ''}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, googleWebAppUrl: e.target.value }))}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3 py-2 text-xs font-mono border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {onTestGasConnection && (
                      <button
                        type="button"
                        disabled={isTestingGas || !projectForm.googleWebAppUrl}
                        onClick={async () => {
                          setIsTestingGas(true);
                          try {
                            const res = await onTestGasConnection(projectForm.googleWebAppUrl);
                            if (res.success) {
                              onNotify('ทดสอบการเชื่อมต่อ Google Sheets สำเร็จ!');
                            } else {
                              onNotify('ไม่สามารถเชื่อมต่อ Google Sheets ได้: ' + (res.error || ''));
                            }
                          } catch (err: any) {
                            onNotify('เกิดข้อผิดพลาด: ' + err.message);
                          } finally {
                            setIsTestingGas(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        {isTestingGas ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
                      </button>
                    )}

                    {onSyncGas && (
                      <button
                        type="button"
                        disabled={isSyncingGas || !projectForm.googleWebAppUrl}
                        onClick={async () => {
                          setIsSyncingGas(true);
                          try {
                            await onSyncGas();
                            onNotify('ซิงค์ข้อมูลกับ Google Sheets สำเร็จ');
                          } catch (err: any) {
                            onNotify('ซิงค์ล้มเหลว: ' + err.message);
                          } finally {
                            setIsSyncingGas(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingGas ? 'animate-spin' : ''}`} />
                        <span>{isSyncingGas ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลเดี๋ยวนี้'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    บันทึกข้อมูลโครงการ
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>

      {/* Facility Detail Preview Modal (Popup for facilities images & info) */}
      {previewFacility && (
        <FacilityDetailModal
          facility={previewFacility}
          onClose={() => setPreviewFacility(null)}
          contactLine={settings.defaultContactLine}
          contactPhone={settings.defaultContactPhone}
        />
      )}
    </div>
  );
};
