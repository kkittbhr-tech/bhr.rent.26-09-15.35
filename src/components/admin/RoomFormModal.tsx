import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Star, 
  Plus, 
  FileText, 
  ShieldAlert, 
  Check, 
  ArrowLeft, 
  ArrowRight, 
  AlertCircle,
  GripVertical,
  Calendar,
  DollarSign,
  User,
  Phone,
  Layers,
  Sparkles,
  Lock,
  Tag,
  Compass,
  Sun,
  Wind,
  Eye,
  Loader2
} from 'lucide-react';
import { Room, RoomStatus, ListingType, SizeCategory, Lease } from '../../types';
import { uploadImageToDrive, uploadDocumentToDrive, openDocumentInNewTab } from '../../services/apiService';

// Compress image to suitable size (max 1100px width/height, quality 0.75) for fast saving and no quota issues
function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1100;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Preset Tags
const PRESET_HIGHLIGHT_TAGS = [
  'วิวเปิดโล่ง ไม่บล็อกวิว',
  'เฟอร์นิเจอร์ Built-in ครบชุด',
  'เครื่องใช้ไฟฟ้าพร้อมใช้งานครบ',
  'ครัวปิดแยกเป็นสัดส่วน',
  'ระเบียงกว้าง รับลมธรรมชาติ',
  'ห้องมุม มีความเป็นส่วนตัว',
  'ชั้นสูง วิวสวยพาโนรามา',
  'ใกล้สถานีรถไฟฟ้า MRT แยกลำสาลี',
  'ใกล้ลิฟต์โดยสาร',
  'ตกแต่งใหม่ สภาพนางฟ้า',
  'พร้อมเข้าอยู่ได้ทันที'
];

const PRESET_AMENITY_TAGS = [
  'เครื่องปรับอากาศ',
  'เครื่องทำน้ำอุ่น',
  'ตู้เย็น',
  'ทีวี',
  'เครื่องซักผ้า',
  'ไมโครเวฟ',
  'Digital Doorlock',
  'เตาไฟฟ้า & ที่ดูดควัน',
  'เตียงนอน & ที่นอน',
  'ตู้เสื้อผ้า Built-in',
  'โซฟา & โต๊ะกลาง',
  'โต๊ะรับประทานอาหาร',
  'โต๊ะทำงาน',
  'ผ้าม่านกัน UV',
  'อ่างอาบน้ำ',
  'สิทธิ์จอดรถ 1 คัน'
];

interface RoomFormModalProps {
  isOpen: boolean;
  room: Partial<Room> | null;
  onClose: () => void;
  onSave: (room: Room, leaseData?: Partial<Lease>) => void;
  onDeleteToTrash?: (room: Room) => void;
  googleWebAppUrl?: string;
  onNotify: (msg: string) => void;
}

export const RoomFormModal: React.FC<RoomFormModalProps> = ({
  isOpen,
  room,
  onClose,
  onSave,
  onDeleteToTrash,
  googleWebAppUrl = '',
  onNotify
}) => {
  // Form State
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState<string>('');
  const [roomType, setRoomType] = useState<'studio' | '1bd' | '2bd'>('studio');
  const [sizeSqM, setSizeSqM] = useState<string>('');
  const [rentPrice, setRentPrice] = useState<string>('');
  const [salePrice, setSalePrice] = useState<string>('');
  const [description, setDescription] = useState('');
  const [staffNotes, setStaffNotes] = useState('');

  // Direction & View Insight State
  const [facingDirection, setFacingDirection] = useState('ทิศตะวันออก');
  const [viewType, setViewType] = useState('');
  const [sunlightExposure, setSunlightExposure] = useState('แดดเช้า บ่ายร่ม');
  const [viewDescription, setViewDescription] = useState('');

  // Images state (index 0 is cover photo)
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Owner Documents & Info
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerContractDocUrl, setOwnerContractDocUrl] = useState('');
  const [ownerContractDocName, setOwnerContractDocName] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Tags
  const [highlights, setHighlights] = useState<string[]>([]);
  const [customHighlightInput, setCustomHighlightInput] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [customAmenityInput, setCustomAmenityInput] = useState('');

  // Save Status: 'publish' (โพสต์), 'pending' (รอดำเนินการ), 'rented' (ติดสัญญา), 'trash' (ลบ)
  const [selectedStatus, setSelectedStatus] = useState<'publish' | 'pending' | 'rented' | 'trash'>('publish');

  // Conditional Fields when status is 'rented'
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [tenantContractUrl, setTenantContractUrl] = useState('');
  const [tenantContractName, setTenantContractName] = useState('');
  const [monthlyRentInput, setMonthlyRentInput] = useState('');
  const [depositInput, setDepositInput] = useState('');

  // Loading & Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  // Validation errors (ONLY roomNumber and floor are required!)
  const [errors, setErrors] = useState<{ roomNumber?: string; floor?: string }>({});

  // Initialize form when opened or room changes
  useEffect(() => {
    if (!isOpen) return;

    if (room) {
      setRoomNumber(room.roomNumber || '');
      setFloor(room.floor !== undefined ? String(room.floor) : '');
      
      // Map bedrooms to studio/1bd/2bd
      if (room.bedrooms === 0) setRoomType('studio');
      else if (room.bedrooms === 2) setRoomType('2bd');
      else setRoomType('1bd');

      setSizeSqM(room.areaSqM ? String(room.areaSqM) : '');
      setRentPrice(room.rentPrice ? String(room.rentPrice) : '');
      setSalePrice(room.salePrice ? String(room.salePrice) : '');
      setDescription(room.description || '');
      setStaffNotes(room.staffNotes || '');

      setFacingDirection(room.facingDirection || 'ทิศตะวันออก');
      setViewType(room.viewType || '');
      setSunlightExposure(room.sunlightExposure || 'แดดเช้า บ่ายร่ม');
      setViewDescription(room.viewDescription || '');

      setImages(room.images && room.images.length > 0 ? [...room.images] : []);

      setOwnerName(room.ownerName || '');
      setOwnerPhone(room.ownerPhone || '');
      setOwnerContractDocUrl(room.ownerContractDocUrl || '');
      setOwnerContractDocName(room.ownerContractDocName || '');

      setHighlights(room.highlights || []);
      setAmenities(room.amenities || []);

      // Determine initial status
      if (room.isTrash) {
        setSelectedStatus('trash');
      } else if (room.status === 'rented') {
        setSelectedStatus('rented');
      } else if (room.isPublished === false || room.status === 'pending' || room.status === 'reserved') {
        setSelectedStatus('pending');
      } else {
        setSelectedStatus('publish');
      }
    } else {
      // Defaults for brand new room
      setRoomNumber('');
      setFloor('');
      setRoomType('studio');
      setSizeSqM('');
      setRentPrice('');
      setSalePrice('');
      setDescription('');
      setStaffNotes('');
      setFacingDirection('ทิศตะวันออก');
      setViewType(''); // ไม่บังคับเลือก เป็นตัวเผื่อเลือก
      setSunlightExposure('แดดเช้า บ่ายร่ม');
      setViewDescription('');
      setImages([]);
      setOwnerName('');
      setOwnerPhone('');
      setOwnerContractDocUrl('');
      setOwnerContractDocName('');
      setHighlights([]);
      setAmenities([]);
      setSelectedStatus('publish');

      // Default lease dates for next year
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setLeaseStartDate(today);
      setLeaseEndDate(nextYear.toISOString().split('T')[0]);
      setTenantName('');
      setTenantPhone('');
      setTenantContractUrl('');
      setTenantContractName('');
      setMonthlyRentInput('');
      setDepositInput('');
    }
    setErrors({});
  }, [isOpen, room]);

  if (!isOpen) return null;

  // Toggle Highlight Tag
  const toggleHighlight = (tag: string) => {
    setHighlights(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomHighlight = () => {
    const trimmed = customHighlightInput.trim();
    if (trimmed && !highlights.includes(trimmed)) {
      setHighlights(prev => [...prev, trimmed]);
      setCustomHighlightInput('');
    }
  };

  // Toggle Amenity Tag
  const toggleAmenity = (tag: string) => {
    setAmenities(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomAmenity = () => {
    const trimmed = customAmenityInput.trim();
    if (trimmed && !amenities.includes(trimmed)) {
      setAmenities(prev => [...prev, trimmed]);
      setCustomAmenityInput('');
    }
  };

  // Image Upload Handler (Multiple files supported)
  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    setUploadProgressMsg(`กำลังประมวลผลและอัพโหลดรูปภาพห้องชุด (${files.length} รูป)... โปรดรอสักครู่`);
    const newImgs: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgressMsg(`กำลังอัพโหลดรูปที่ ${i + 1} จาก ${files.length} รูป...`);
      try {
        const base64 = await compressImage(file);

        if (googleWebAppUrl) {
          const uploadRes = await uploadImageToDrive(
            googleWebAppUrl,
            base64,
            file.name,
            'image/jpeg',
            roomNumber || 'temp',
            'photos'
          );
          if (uploadRes.success && uploadRes.url) {
            newImgs.push(uploadRes.url);
          } else {
            newImgs.push(base64);
          }
        } else {
          newImgs.push(base64);
        }
      } catch (err) {
        console.error('Photo upload error:', err);
      }
    }

    if (newImgs.length > 0) {
      setImages(prev => [...prev, ...newImgs]);
      onNotify(`อัพโหลดรูปภาพสำเร็จ ${newImgs.length} รูป`);
    }
    setIsUploadingPhoto(false);
    setUploadProgressMsg('');
    e.target.value = '';
  };

  // Add Image from URL
  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      alert('กรุณาระบุ URL รูปภาพที่ขึ้นต้นด้วย http:// หรือ https://');
      return;
    }
    setImages(prev => [...prev, trimmed]);
    setNewImageUrl('');
    onNotify('เพิ่มลิงก์รูปภาพเรียบร้อย');
  };

  // Remove photo
  const handleRemovePhoto = (index: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== index));
  };

  // Make cover photo (move to index 0)
  const handleMakeCoverPhoto = (index: number) => {
    if (index === 0) return;
    setImages(prev => {
      const target = prev[index];
      const rest = prev.filter((_, idx) => idx !== index);
      return [target, ...rest];
    });
    onNotify('ตั้งเป็นภาพหน้าปกเรียบร้อย');
  };

  // Move photo left/right for mobile touch ease
  const handleMovePhoto = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    setImages(prev => {
      const copy = [...prev];
      const item = copy[from];
      copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  // Drag and drop handlers for desktop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setImages(prev => {
      const copy = [...prev];
      const item = copy[draggedIndex];
      copy.splice(draggedIndex, 1);
      copy.splice(index, 0, item);
      return copy;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Owner Contract Document Upload
  const handleOwnerDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ตั้งชื่อไฟล์อัตโนมัติให้เรียบร้อยตามเลขห้อง เช่น "สัญญาเจ้าของ_ห้อง60-123_สมชาย_2026-09-23.pdf"
    const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'pdf';
    const cleanRoom = (roomNumber || '').trim().replace(/[\/\\:*?"<>|]/g, '-');
    const cleanOwner = (ownerName || '').trim().replace(/[\/\\:*?"<>|]/g, '-');
    const todayStr = new Date().toISOString().split('T')[0];
    const autoFileName = `สัญญาเจ้าของ_ห้อง${cleanRoom || 'ไม่ระบุ'}${cleanOwner ? '_' + cleanOwner : ''}_${todayStr}.${fileExt}`;

    setIsUploadingDoc(true);
    setUploadProgressMsg(`กำลังประมวลผลและอัพโหลดเอกสาร "${autoFileName}"... โปรดรอสักครู่`);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (googleWebAppUrl) {
        const res = await uploadDocumentToDrive(
          googleWebAppUrl,
          base64,
          autoFileName,
          file.type || 'application/pdf',
          cleanRoom || 'owner-doc',
          'contracts'
        );
        const directFileUrl = res.driveUrl || res.viewUrl || res.url;
        if (res.success && directFileUrl) {
          setOwnerContractDocUrl(directFileUrl);
          setOwnerContractDocName(autoFileName);
          onNotify(`อัพโหลดสัญญาฝากเช่า "${autoFileName}" ไปที่ Google Drive เรียบร้อย`);
        } else {
          setOwnerContractDocUrl(base64);
          setOwnerContractDocName(autoFileName);
          onNotify(`บันทึกสัญญาฝากเช่า "${autoFileName}" เรียบร้อย`);
        }
      } else {
        setOwnerContractDocUrl(base64);
        setOwnerContractDocName(autoFileName);
        onNotify(`บันทึกสัญญาฝากเช่า "${autoFileName}" เรียบร้อย`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัพโหลดเอกสาร');
    } finally {
      setIsUploadingDoc(false);
      e.target.value = '';
    }
  };

  // Tenant Contract Upload (when status = rented)
  const handleTenantDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ตั้งชื่อไฟล์อัตโนมัติให้เรียบร้อยตามเลขห้อง เช่น "สัญญาเช่า_ห้อง60-123_สมศักดิ์_2026-09-23.pdf"
    const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'pdf';
    const cleanRoom = (roomNumber || '').trim().replace(/[\/\\:*?"<>|]/g, '-');
    const cleanTenant = (tenantName || '').trim().replace(/[\/\\:*?"<>|]/g, '-');
    const todayStr = new Date().toISOString().split('T')[0];
    const autoFileName = `สัญญาเช่า_ห้อง${cleanRoom || 'ไม่ระบุ'}${cleanTenant ? '_' + cleanTenant : ''}_${todayStr}.${fileExt}`;

    setIsUploadingDoc(true);
    setUploadProgressMsg(`กำลังประมวลผลและอัพโหลดสัญญาผู้เช่า "${autoFileName}"... โปรดรอสักครู่`);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (googleWebAppUrl) {
        const res = await uploadDocumentToDrive(
          googleWebAppUrl,
          base64,
          autoFileName,
          file.type || 'application/pdf',
          cleanRoom || 'tenant-doc',
          'contracts'
        );
        const directFileUrl = res.driveUrl || res.viewUrl || res.url;
        if (res.success && directFileUrl) {
          setTenantContractUrl(directFileUrl);
          setTenantContractName(autoFileName);
          onNotify(`อัพโหลดสัญญาผู้เช่า "${autoFileName}" ไปที่ Google Drive สำเร็จ`);
        } else {
          setTenantContractUrl(base64);
          setTenantContractName(autoFileName);
          onNotify(`บันทึกสัญญาผู้เช่า "${autoFileName}" เรียบร้อย`);
        }
      } else {
        setTenantContractUrl(base64);
        setTenantContractName(autoFileName);
        onNotify(`บันทึกสัญญาผู้เช่า "${autoFileName}" เรียบร้อย`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัพโหลดสัญญาผู้เช่า');
    } finally {
      setIsUploadingDoc(false);
      setUploadProgressMsg('');
      e.target.value = '';
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // MANDATORY VALIDATION: Only roomNumber and floor are required!
    const newErrors: { roomNumber?: string; floor?: string } = {};
    if (!roomNumber.trim()) {
      newErrors.roomNumber = 'กรุณาระบุเลขห้อง (จำเป็น)';
    }
    if (!floor.trim()) {
      newErrors.floor = 'กรุณาระบุชั้น (จำเป็น)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // scroll to top
      return;
    }

    // Determine status & publish flags based on user selection
    let isPublished = false;
    let roomStatus: RoomStatus = 'available';
    let isTrash = false;
    let trashedAt: string | undefined = undefined;

    if (selectedStatus === 'publish') {
      isPublished = true;
      roomStatus = 'available';
    } else if (selectedStatus === 'pending') {
      isPublished = false;
      roomStatus = 'pending';
    } else if (selectedStatus === 'rented') {
      isPublished = false;
      roomStatus = 'rented';
    } else if (selectedStatus === 'trash') {
      isTrash = true;
      trashedAt = new Date().toISOString();
      if (room && onDeleteToTrash) {
        onDeleteToTrash(room as Room);
        onClose();
        return;
      }
    }

    // Listing type calculation
    const numRent = rentPrice ? parseFloat(rentPrice) : undefined;
    const numSale = salePrice ? parseFloat(salePrice) : undefined;
    let listingType: ListingType = 'rent';
    if (numRent && numSale) listingType = 'both';
    else if (numSale && !numRent) listingType = 'sale';

    // Size category
    const area = sizeSqM ? parseFloat(sizeSqM) : 0;
    let sizeCategory: SizeCategory = 'size_30';
    if (area > 50) sizeCategory = 'size_60_90';
    else if (area > 35) sizeCategory = 'size_40';

    // Bedrooms / Bathrooms mapped from roomType
    let bedrooms = 0;
    let bathrooms = 1;
    if (roomType === '1bd') {
      bedrooms = 1;
      bathrooms = 1;
    } else if (roomType === '2bd') {
      bedrooms = 2;
      bathrooms = 2;
    }

    // DO NOT force fake mock photos if user did not upload any! Keep user's real images array.
    const finalImages = images;

    setIsSaving(true);
    setUploadProgressMsg('กำลังบันทึกข้อมูลห้องชุดและอัปเดตระบบ... โปรดรอสักครู่');

    const roomPayload: Room = {
      id: room?.id || `room-${Date.now()}`,
      roomNumber: roomNumber.trim(),
      condoName: 'Bangkok Horizon Ram 60',
      listingType,
      rentPrice: numRent,
      salePrice: numSale,
      sizeCategory,
      areaSqM: area,
      floor: floor.trim(),
      building: room?.building || 'อาคาร A',
      bedrooms,
      bathrooms,
      facingDirection: facingDirection.trim() || 'ทิศตะวันออก',
      viewType: viewType.trim() || undefined,
      sunlightExposure: sunlightExposure.trim() || 'แดดเช้า บ่ายร่ม',
      viewDescription: viewDescription.trim() || undefined,
      status: roomStatus,
      isPublished,
      isTrash,
      trashedAt,
      description: description.trim() || `ห้องชุด ${roomType === 'studio' ? 'Studio' : roomType === '1bd' ? '1 ห้องนอน' : '2 ห้องนอน'} ชั้น ${floor.trim()} ขนาด ${area} ตร.ม. พร้อมสิ่งอำนวยความสะดวก`,
      staffNotes: staffNotes.trim(),
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerContractDocUrl: ownerContractDocUrl || undefined,
      ownerContractDocName: ownerContractDocName || undefined,
      highlights,
      amenities,
      images: finalImages,
      contactName: room?.contactName || 'สำนักงานนิติบุคคล แบงค์คอก ฮอไรซอน ราม 60',
      contactPhone: room?.contactPhone || '02-735-6060',
      contactLine: room?.contactLine || '@052adooe',
      createdAt: room?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If status is 'rented', also package lease data
    let leasePayload: Partial<Lease> | undefined = undefined;
    if (selectedStatus === 'rented') {
      leasePayload = {
        roomId: roomPayload.id,
        roomNumber: roomPayload.roomNumber,
        condoName: roomPayload.condoName,
        tenantName: tenantName.trim() || 'ผู้เช่า (รอระบุชื่อ)',
        tenantPhone: tenantPhone.trim() || '-',
        startDate: leaseStartDate || new Date().toISOString().split('T')[0],
        endDate: leaseEndDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        monthlyRent: numRent || (monthlyRentInput ? parseFloat(monthlyRentInput) : 10000),
        depositAmount: depositInput ? parseFloat(depositInput) : (numRent ? numRent * 2 : 20000),
        contractUrl: tenantContractUrl || undefined,
        status: 'active'
      };
    }

    setTimeout(() => {
      onSave(roomPayload, leasePayload);
      setIsSaving(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Global Fixed Loading & Feedback Overlay: Always centered in viewport */}
      {(isUploadingPhoto || isUploadingDoc || isSaving) && (
        <div className="fixed inset-0 z-[100] bg-stone-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xl max-w-sm w-full flex flex-col items-center gap-3.5 border border-stone-200">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border-2 border-amber-300 shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h4 className="font-bold text-base text-stone-900">
                {isSaving ? 'กำลังบันทึกข้อมูลห้องชุด' : 'กำลังอัปโหลดข้อมูล'}
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed font-medium mt-1">
                {uploadProgressMsg || 'ระบบกำลังประมวลผลข้อมูล... โปรดรอสักครู่'}
              </p>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden mt-1">
              <div className="bg-amber-600 h-full rounded-full animate-pulse w-4/5"></div>
            </div>
            <span className="text-[11px] text-stone-400">กรุณาอย่าเพิ่งปิดหน้าต่างขณะกำลังประมวลผล</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-300" />
              <span>{room?.id ? `แก้ไขข้อมูลห้อง ${room.roomNumber || ''}` : 'เพิ่มห้องชุดใหม่'}</span>
            </h2>
            <p className="text-xs text-stone-300">
              * บังคับกรอกเฉพาะ <strong className="text-amber-300">เลขห้อง</strong> และ <strong className="text-amber-300">ชั้น</strong> เท่านั้น ข้อมูลอื่นสามารถเข้ามาใส่เพิ่มเติมภายหลังได้
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            title="ปิด (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Section 1: Mandatory Core Info */}
          <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/80 space-y-4">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">1</span>
              <span>1. ข้อมูลบังคับ</span>
              <span className="text-[11px] font-medium text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">จำเป็นต้องกรอก</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  เลขห้อง (Room Number) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => {
                    setRoomNumber(e.target.value);
                    if (errors.roomNumber) setErrors(prev => ({ ...prev, roomNumber: undefined }));
                  }}
                  placeholder=""
                  className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border ${
                    errors.roomNumber ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-stone-300 bg-white'
                  } focus:ring-2 focus:ring-stone-900 focus:outline-none`}
                  autoFocus
                />
                {errors.roomNumber && (
                  <p className="text-rose-600 text-xs mt-1 font-medium">{errors.roomNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  ชั้น (Floor) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => {
                    setFloor(e.target.value);
                    if (errors.floor) setErrors(prev => ({ ...prev, floor: undefined }));
                  }}
                  placeholder=""
                  className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border ${
                    errors.floor ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-stone-300 bg-white'
                  } focus:ring-2 focus:ring-stone-900 focus:outline-none`}
                />
                {errors.floor && (
                  <p className="text-rose-600 text-xs mt-1 font-medium">{errors.floor}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Owner Documents & Deposit Agreement (2. สัญญาฝากเช่า) */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold">2</span>
                <span>2. สัญญาฝากเช่า</span>
              </div>
              <span className="text-[11px] text-stone-500 font-medium">สัญญาฝากเช่า & ข้อมูลเจ้าของห้อง (ระบุตอนนี้หรือภายหลังได้)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ชื่อเจ้าของห้อง
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg text-sm border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  เบอร์โทรเจ้าของห้อง
                </label>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg text-sm border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                ไฟล์สัญญาฝากเช่า / หนังสือมอบอำนาจ (PDF หรือรูปภาพ)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <label className="cursor-pointer px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0">
                  <FileText className="w-4 h-4 text-stone-600" />
                  <span>{isUploadingDoc ? 'กำลังอัพโหลดเอกสาร...' : 'เลือกไฟล์สัญญาฝากเช่า'}</span>
                  <input
                    type="file"
                    accept="application/pdf,image/*,.doc,.docx"
                    onChange={handleOwnerDocUpload}
                    disabled={isUploadingDoc}
                    className="hidden"
                  />
                </label>

                {ownerContractDocUrl && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex-1 truncate">
                    <span className="text-emerald-800 font-medium truncate">
                      ✓ {ownerContractDocName || 'เอกสารสัญญาฝากเช่าถูกแนบแล้ว'}
                    </span>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openDocumentInNewTab(ownerContractDocUrl)}
                        className="text-emerald-700 hover:text-emerald-900 underline font-bold cursor-pointer"
                      >
                        เปิดดู
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOwnerContractDocUrl('');
                          setOwnerContractDocName('');
                        }}
                        className="text-stone-400 hover:text-rose-600 cursor-pointer"
                        title="ลบเอกสาร"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Room Specs & Pricing (Optional) */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold">3</span>
                <span>3. ประเภทห้อง ขนาด และราคา</span>
              </div>
              <span className="text-[11px] text-stone-500">ระบุภายหลังได้ / กรอกเท่าที่มีก่อนได้</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ประเภทห้อง
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-white border border-stone-300 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setRoomType('studio')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                      roomType === 'studio' ? 'bg-stone-900 text-white shadow-2xs' : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomType('1bd')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                      roomType === '1bd' ? 'bg-stone-900 text-white shadow-2xs' : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    1 Bed
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomType('2bd')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                      roomType === '2bd' ? 'bg-stone-900 text-white shadow-2xs' : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    2 Bed
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ขนาดพื้นที่ (ตร.ม.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={sizeSqM}
                    onChange={(e) => setSizeSqM(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 rounded-lg text-sm border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-medium">ตร.ม.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ราคาเช่า (บาท/เดือน)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={rentPrice}
                    onChange={(e) => setRentPrice(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 rounded-lg text-sm border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-medium">฿/ด.</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ราคาขาย (ถ้ามี)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 rounded-lg text-sm border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-medium">บาท</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  อาคาร / ตึก
                </label>
                <input
                  type="text"
                  defaultValue={room?.building || 'อาคาร A'}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg text-sm border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Direction & View Insight (ทิศทางระเบียง & มุมมองวิว) */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold">4</span>
                <span>4. ทิศทางระเบียง & มุมมองวิวห้องชุด (Direction & View Insight)</span>
              </div>
              <span className="text-[11px] text-stone-500">เผื่อเลือก / ช่วยให้ลูกค้าตัดสินใจเช่า/ซื้อง่ายขึ้น</span>
            </div>

            {/* 1. Balcony Direction Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                <span>ทิศทางระเบียงห้องชุด</span>
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                {[
                  { label: 'ทิศตะวันออก', sub: 'แดดเช้า บ่ายร่ม', deg: '90°' },
                  { label: 'ทิศเหนือ', sub: 'ร่มทั้งวัน ไม่ร้อน', deg: '0°' },
                  { label: 'ทิศใต้', sub: 'รับลมธรรมชาติ 8-9 ด.', deg: '180°' },
                  { label: 'ทิศตะวันตก', sub: 'แดดบ่าย วิว Sunset', deg: '270°' },
                  { label: 'ทิศตะวันออกเฉียงเหนือ', sub: 'แดดเช้าอ่อนๆ', deg: '45°' },
                  { label: 'ทิศตะวันออกเฉียงใต้', sub: 'แดดเช้า ลมดี', deg: '135°' },
                  { label: 'ทิศตะวันตกเฉียงใต้', sub: 'ลมดี ผ้าแห้งไว', deg: '225°' },
                  { label: 'ทิศตะวันตกเฉียงเหนือ', sub: 'วิวโปร่งโล่ง', deg: '315°' }
                ].map((item) => {
                  const isSelected = facingDirection === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setFacingDirection(item.label);
                        if (!sunlightExposure || sunlightExposure === 'แดดเช้า บ่ายร่ม') {
                          setSunlightExposure(item.sub);
                        }
                      }}
                      className={`p-2 rounded-lg text-left text-xs transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs font-bold'
                          : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{item.label}</span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-amber-400' : 'text-stone-400'}`}>
                          {item.deg}
                        </span>
                      </div>
                      <span className={`text-[10px] block mt-0.5 font-normal ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                        {item.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={facingDirection}
                onChange={(e) => setFacingDirection(e.target.value)}
                placeholder=""
                className="w-full px-3 py-1.5 rounded-lg text-xs border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
              />
            </div>

            {/* 2. View Type Selector (ลักษณะมุมมองวิวจากระเบียง - เผื่อเลือก ไม่บังคับกรอก) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ลักษณะมุมมองวิวจากระเบียง (View Character)</span>
                  <span className="text-[11px] font-normal text-stone-500 bg-stone-200/80 px-2 py-0.5 rounded-full">
                    (เผื่อเลือก / ไม่บังคับกรอก - เว้นว่างได้)
                  </span>
                </label>
                {viewType && (
                  <button
                    type="button"
                    onClick={() => setViewType('')}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-medium cursor-pointer flex items-center gap-1"
                  >
                    <span>✕ ล้างการเลือก (ไม่ระบุ)</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {/* Option: ไม่ระบุ (ไม่เลือก) */}
                <button
                  type="button"
                  onClick={() => setViewType('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${
                    !viewType
                      ? 'bg-stone-200 text-stone-900 border-stone-400 font-bold shadow-2xs'
                      : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700'
                  }`}
                  title="คลิกหากไม่ต้องการระบุลักษณะวิวห้อง"
                >
                  <span className="text-xs">⚪</span>
                  <span>ไม่ระบุ (ไม่เลือก)</span>
                  {!viewType && <span className="text-[10px] text-stone-600 ml-0.5">✓</span>}
                </button>

                {[
                  { name: 'วิวเมืองโล่ง ไม่บล็อก', icon: '🏙️' },
                  { name: 'วิวสระว่ายน้ำ', icon: '🏊' },
                  { name: 'วิวรถไฟฟ้า MRT ลำสาลี', icon: '🚇' },
                  { name: 'วิวสวนหย่อม & คอร์ทใน', icon: '🌳' },
                  { name: 'วิวคลองแสนแสบ', icon: '⛵' }
                ].map((vt) => {
                  const isSelected = viewType === vt.name;
                  return (
                    <button
                      key={vt.name}
                      type="button"
                      onClick={() => setViewType(prev => prev === vt.name ? '' : vt.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs font-semibold'
                          : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'
                      }`}
                      title={isSelected ? 'คลิกอีกครั้งเพื่อยกเลิกการเลือก' : 'คลิกเพื่อเลือก'}
                    >
                      <span>{vt.icon}</span>
                      <span>{vt.name}</span>
                      {isSelected && <span className="text-[10px] text-indigo-200 ml-0.5">✕</span>}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={viewType}
                onChange={(e) => setViewType(e.target.value)}
                placeholder=""
                className="w-full px-3 py-1.5 rounded-lg text-xs border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
              />
            </div>

            {/* 3. Sunlight & Climate Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>สรุปสภาพแสงแดด & อากาศ</span>
                </label>
                <input
                  type="text"
                  value={sunlightExposure}
                  onChange={(e) => setSunlightExposure(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg text-xs border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-sky-500" />
                  <span>คำอธิบายบรรยากาศวิวระเบียงเพิ่มเติม (แสดงในป๊อปอัป)</span>
                </label>
                <input
                  type="text"
                  value={viewDescription}
                  onChange={(e) => setViewDescription(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg text-xs border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Descriptions & Internal Admin Notes */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-4">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold">5</span>
              <span>5. รายละเอียดสาธารณะ & บันทึกสำหรับแอดมิน</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  รายละเอียดเพิ่มเติม (ข้อความโชว์สาธารณะบนหน้าเว็บ)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg text-xs sm:text-sm border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>บันทึกสำหรับแอดมิน (ไม่แสดงหน้าเว็บ / ข้อมูลภายใน)</span>
                </label>
                <textarea
                  rows={3}
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg text-xs sm:text-sm border border-amber-300 bg-amber-50/50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Image Management with Drag & Drop to set Cover */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold">6</span>
                <span>6. อัพโหลดรูปภาพ & จัดตำแหน่งภาพหน้าปก</span>
              </div>
              <span className="text-[11px] text-stone-500">
                💡 ลากและวาง หรือกดปุ่ม &quot;หน้าปก&quot; เพื่อเปลี่ยนภาพหลัก
              </span>
            </div>

            {/* Upload buttons & URL input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <label className="cursor-pointer px-4 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-colors shrink-0">
                <Upload className="w-4 h-4 text-amber-300" />
                <span>{isUploadingPhoto ? 'กำลังประมวลผลรูปภาพ...' : 'อัพโหลดรูปภาพจากเครื่อง/กล้อง'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoFileUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>

              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder=""
                  className="flex-1 px-3 py-2 rounded-lg text-xs border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                >
                  เพิ่ม URL
                </button>
              </div>
            </div>

            {/* Images Grid with Reordering */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`group relative rounded-xl overflow-hidden border-2 bg-stone-100 aspect-4/3 transition-all select-none shadow-2xs ${
                      idx === 0 ? 'border-amber-500 ring-2 ring-amber-400/40' : 'border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <img src={img} alt={`room-img-${idx}`} className="w-full h-full object-cover" />

                    {/* Cover Photo Badge */}
                    {idx === 0 ? (
                      <div className="absolute top-1.5 left-1.5 bg-amber-500 text-stone-950 font-extrabold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                        <Star className="w-3 h-3 fill-stone-950" />
                        <span>ภาพหน้าปก</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMakeCoverPhoto(idx)}
                        className="absolute top-1.5 left-1.5 bg-stone-900/80 hover:bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-md transition-colors shadow cursor-pointer opacity-90 group-hover:opacity-100"
                        title="คลิกเพื่อตั้งเป็นภาพหน้าปก"
                      >
                        ตั้งเป็นหน้าปก
                      </button>
                    )}

                    {/* Action Overlay: Delete + Move */}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="p-1.5 bg-stone-900/80 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                        title="ลบรูปนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Left / Right arrow controls for touch/mobile */}
                    <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMovePhoto(idx, idx - 1)}
                        className={`p-1 rounded bg-stone-900/70 text-white ${idx === 0 ? 'opacity-30' : 'hover:bg-stone-900 cursor-pointer'}`}
                        title="เลื่อนไปซ้าย"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] bg-stone-900/80 text-white px-1.5 py-0.5 rounded font-mono">
                        {idx + 1}/{images.length}
                      </span>
                      <button
                        type="button"
                        disabled={idx === images.length - 1}
                        onClick={() => handleMovePhoto(idx, idx + 1)}
                        className={`p-1 rounded bg-stone-900/70 text-white ${idx === images.length - 1 ? 'opacity-30' : 'hover:bg-stone-900 cursor-pointer'}`}
                        title="เลื่อนไปขวา"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 border-2 border-dashed border-stone-300 rounded-xl text-center text-stone-400 bg-white">
                <ImageIcon className="w-8 h-8 mx-auto mb-1 text-stone-300" />
                <p className="text-xs">ยังไม่มีรูปภาพ (สามารถบันทึกห้องไว้ก่อน แล้วอัพโหลดรูปภาพหลังจากเข้าไปถ่ายรูปในห้องได้)</p>
              </div>
            )}
          </div>

          {/* Section 7: Tags (Highlights & Amenities) */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-4">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold">7</span>
              <span>7. แท็กจุดเด่น & เฟอร์นิเจอร์ เครื่องใช้ไฟฟ้า</span>
            </div>

            {/* Highlights */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">
                ✨ แท็กจุดเด่นของห้อง (Highlights Tags)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESET_HIGHLIGHT_TAGS.map((tag) => {
                  const isSelected = highlights.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleHighlight(tag)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-stone-900 text-white border-stone-900 shadow-2xs' 
                          : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  value={customHighlightInput}
                  onChange={(e) => setCustomHighlightInput(e.target.value)}
                  placeholder=""
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomHighlight();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomHighlight}
                  className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  เพิ่ม
                </button>
              </div>
            </div>

            {/* Amenities */}
            <div className="pt-2 border-t border-stone-200">
              <label className="block text-xs font-semibold text-stone-700 mb-2">
                🛋️ สิ่งอำนวยความสะดวก & เฟอร์นิเจอร์ (Amenities Tags)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESET_AMENITY_TAGS.map((tag) => {
                  const isSelected = amenities.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleAmenity(tag)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                          : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  value={customAmenityInput}
                  onChange={(e) => setCustomAmenityInput(e.target.value)}
                  placeholder=""
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomAmenity();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomAmenity}
                  className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  เพิ่ม
                </button>
              </div>
            </div>
          </div>

          {/* Section 8: Save Status Selector (โพสต์ / รอดำเนินการ / ติดสัญญา / ลบ) */}
          <div className="bg-stone-900 text-white rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
            <div>
              <h3 className="text-sm font-bold text-amber-300 mb-1 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center text-xs font-black">8</span>
                <span>8. เลือกสถานะการบันทึก (Save Status)</span>
              </h3>
              <p className="text-xs text-stone-300">
                เลือกสถานะที่ต้องการ เพื่อส่งห้องชุดไปยังแท็บการทำงานที่เกี่ยวข้อง
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Option 1: โพสต์ */}
              <button
                type="button"
                onClick={() => setSelectedStatus('publish')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedStatus === 'publish'
                    ? 'border-emerald-400 bg-emerald-950/60 shadow-lg ring-2 ring-emerald-500/40'
                    : 'border-stone-700 bg-stone-800/70 hover:border-stone-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-emerald-400">โพสต์</span>
                  {selectedStatus === 'publish' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-stone-300">
                  โพสต์สาธารณะ ลูกค้าจะดูได้จากหน้าเว็บทันที
                </p>
              </button>

              {/* Option 2: ดำเนินการ */}
              <button
                type="button"
                onClick={() => setSelectedStatus('pending')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedStatus === 'pending'
                    ? 'border-amber-400 bg-amber-950/60 shadow-lg ring-2 ring-amber-500/40'
                    : 'border-stone-700 bg-stone-800/70 hover:border-stone-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-amber-300">ดำเนินการ</span>
                  {selectedStatus === 'pending' && <Check className="w-4 h-4 text-amber-300" />}
                </div>
                <p className="text-[11px] text-stone-300">
                  ไม่โพสต์สาธารณะ เก็บไว้ให้แอดมินทำงาน เช่น รอถ่ายรูป หรือข้อมูลยังไม่ครบ
                </p>
              </button>

              {/* Option 3: สัญญา */}
              <button
                type="button"
                onClick={() => setSelectedStatus('rented')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedStatus === 'rented'
                    ? 'border-blue-400 bg-blue-950/60 shadow-lg ring-2 ring-blue-500/40'
                    : 'border-stone-700 bg-stone-800/70 hover:border-stone-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-blue-300">สัญญา</span>
                  {selectedStatus === 'rented' && <Check className="w-4 h-4 text-blue-300" />}
                </div>
                <p className="text-[11px] text-stone-300">
                  ห้องปล่อยเช่าแล้ว บันทึกข้อมูลสัญญาผู้เช่าและวันหมดอายุ
                </p>
              </button>

              {/* Option 4: ลบ */}
              <button
                type="button"
                onClick={() => setSelectedStatus('trash')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedStatus === 'trash'
                    ? 'border-rose-400 bg-rose-950/60 shadow-lg ring-2 ring-rose-500/40'
                    : 'border-stone-700 bg-stone-800/70 hover:border-stone-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-rose-400">ลบ</span>
                  {selectedStatus === 'trash' && <Check className="w-4 h-4 text-rose-400" />}
                </div>
                <p className="text-[11px] text-stone-300">
                  ย้ายไปอยู่ในถังขยะ (มีระยะเวลาจัดเก็บ 60 วัน สามารถกู้คืนได้)
                </p>
              </button>
            </div>

            {/* CONDITIONAL INPUTS: If 'ติดสัญญา' is selected */}
            {selectedStatus === 'rented' && (
              <div className="p-4 bg-stone-800/90 rounded-xl border border-blue-400/40 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-blue-300 font-bold text-xs uppercase tracking-wider">
                  <Calendar className="w-4 h-4" />
                  <span>ข้อมูลสัญญาผู้เช่า (สำหรับสถานะติดสัญญา)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-900">
                  <div>
                    <label className="block text-xs font-semibold text-stone-200 mb-1">
                      ชื่อ-สกุล ผู้เช่า
                    </label>
                    <input
                      type="text"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 rounded-lg text-xs bg-white border border-stone-300 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-200 mb-1">
                      เบอร์โทรผู้เช่า
                    </label>
                    <input
                      type="tel"
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 rounded-lg text-xs bg-white border border-stone-300 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-900">
                  <div>
                    <label className="block text-xs font-semibold text-stone-200 mb-1">
                      วันที่เริ่มสัญญา
                    </label>
                    <input
                      type="date"
                      value={leaseStartDate}
                      onChange={(e) => setLeaseStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs bg-white border border-stone-300 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-200 mb-1">
                      วันที่สิ้นสุดสัญญา
                    </label>
                    <input
                      type="date"
                      value={leaseEndDate}
                      onChange={(e) => setLeaseEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs bg-white border border-stone-300 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Tenant Lease Document Upload */}
                <div>
                  <label className="block text-xs font-semibold text-stone-200 mb-1">
                    อัพโหลดสัญญาผู้เช่า (PDF หรือรูปภาพ)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors">
                      <FileText className="w-3.5 h-3.5" />
                      <span>แนบไฟล์สัญญาผู้เช่า</span>
                      <input
                        type="file"
                        accept="application/pdf,image/*,.doc,.docx"
                        onChange={handleTenantDocUpload}
                        className="hidden"
                      />
                    </label>

                    {tenantContractUrl && (
                      <div className="flex items-center gap-2 max-w-full truncate">
                        <span className="text-xs text-blue-200 font-mono truncate">
                          ✓ {tenantContractName || 'แนบสัญญาผู้เช่าเรียบร้อยแล้ว'}
                        </span>
                        <button
                          type="button"
                          onClick={() => openDocumentInNewTab(tenantContractUrl)}
                          className="text-xs text-amber-300 hover:text-white underline font-bold cursor-pointer shrink-0"
                        >
                          เปิดดู
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTenantContractUrl('');
                            setTenantContractName('');
                          }}
                          className="text-stone-400 hover:text-rose-400 cursor-pointer shrink-0"
                          title="ลบเอกสาร"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm font-semibold transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSaving || isUploadingPhoto || isUploadingDoc}
              className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>กำลังบันทึกข้อมูลห้อง...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>บันทึกข้อมูลห้อง</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
