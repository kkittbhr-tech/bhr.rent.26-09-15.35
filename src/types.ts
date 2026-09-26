export type ListingType = 'rent' | 'sale' | 'both';
export type SizeCategory = 'size_30' | 'size_40' | 'size_60_90' | 'small' | 'medium' | 'large';
export type RoomStatus = 'available' | 'rented' | 'reserved' | 'sold' | 'pending';

export interface Room {
  id: string;
  roomNumber: string;
  condoName: string;
  listingType: ListingType;
  rentPrice?: number;
  salePrice?: number;
  sizeCategory: SizeCategory;
  areaSqM: number;
  floor: number | string;
  building?: string;
  bedrooms: number;
  bathrooms: number;
  facingDirection?: string; // เช่น 'ทิศตะวันออก', 'ทิศเหนือ', 'ทิศใต้', 'ทิศตะวันตก'
  viewType?: string; // เช่น 'วิวสระว่ายน้ำ', 'วิวเมืองโล่ง ไม่บล็อก', 'วิวรถไฟฟ้า MRT ลำสาลี', 'วิวสวนหย่อม'
  viewDescription?: string; // คำอธิบายเชิงลึก เช่น "แดดเช้า บ่ายร่ม ไม่สะสมความร้อน วิวเมืองโล่ง"
  sunlightExposure?: string; // เช่น 'แดดเช้า บ่ายร่ม', 'ร่มตลอดวัน', 'ลมใต้พัดสบายตลอดปี', 'แดดบ่าย ผ้าแห้งไว'
  floorViewLevel?: string; // เช่น 'ชั้นสูง High Floor วิวพาโนรามา', 'ชั้นกลาง Mid Floor', 'ชั้นวิวสระว่ายน้ำ'
  status: RoomStatus;
  isPublished?: boolean; // true = แสดงบนหน้าเว็บสาธารณะ, false = ร่าง / รอถ่ายรูป & ยังไม่เผยแพร่
  isTrash?: boolean; // อยู่ในถังขยะ
  trashedAt?: string; // วันที่ส่งลงถังขยะ (ISO String) สำหรับคำนวณ 60 วัน
  staffNotes?: string; // โน้ตลับเฉพาะพนักงาน เช่น รหัสห้อง กุญแจ ผู้เช่า หรือเงื่อนไขนิติ
  ownerName?: string; // ข้อมูลเจ้าของห้องที่ฝากห้องชุด
  ownerPhone?: string; // เบอร์ติดต่อเจ้าของห้อง
  ownerContractDocUrl?: string; // ลิงก์เอกสารสัญญาแต่งตั้งตัวแทน / สัญญาฝากห้อง
  ownerContractDocName?: string; // ชื่อไฟล์สัญญาฝากห้อง
  ownerNotes?: string; // บันทึกข้อตกลงกับเจ้าของห้อง
  description: string;
  highlights: string[];
  amenities: string[];
  images: string[];
  floorPlanImage?: string;
  contactName: string;
  contactPhone: string;
  contactLine: string;
  createdAt: string;
  updatedAt: string;
}

export interface Facility {
  id: string;
  name: string;
  nameEn?: string;
  floor: string;
  description: string;
  images: string[];
  hours?: string;
  rules?: string[];
  iconType?: string;
}

export interface JuristicServiceItem {
  id: string;
  category: 'service' | 'rule'; // 'service' = บริการสำนักงานนิติบุคคล, 'rule' = ระเบียบและข้อกำหนดการเช่า
  title: string;
  description: string;
  icon?: string; // 'key' | 'file' | 'package' | 'wrench' | 'shield' | 'clock' | 'home' | 'info'
  badge?: string;
  details?: string[];
  hoursOrContact?: string;
  updatedAt?: string;
}

export type LeaseStatus = 'active' | 'expiring_90' | 'expiring_60' | 'expiring_30' | 'expired' | 'terminated';

export interface Lease {
  id: string;
  roomId: string;
  roomNumber: string;
  condoName: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail?: string;
  tenantIdCard?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  monthlyRent: number;
  depositAmount: number;
  advanceRent?: number;
  status: LeaseStatus;
  contractUrl?: string; // Link to Google Drive file
  notes?: string;
  daysRemaining?: number;
}

export interface BookingReceipt {
  id: string;
  receiptNumber: string;
  bookingDate: string;
  roomId: string;
  roomNumber: string;
  condoName: string;
  bookingType: 'rent' | 'sale';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerIdCard?: string;
  price: number;
  bookingAmount: number;
  paymentMethod: 'transfer' | 'cash' | 'credit';
  contractSignDate: string;
  remainingDeposit?: number;
  recipientType?: 'juristic' | 'owner' | 'other';
  recipientName?: string;
  agentName: string;
  terms: string;
  createdAt: string;
}

export interface AppSettings {
  googleWebAppUrl: string;
  agencyName: string;
  condoName?: string;
  defaultContactPhone: string;
  defaultContactLine: string;
  agencyAddress?: string;
  adminEmail?: string;
  adminPassword: string;
  heroBackgroundImages?: string[];
}
