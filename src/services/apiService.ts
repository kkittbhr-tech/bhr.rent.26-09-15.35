import { Room, Lease, BookingReceipt, AppSettings, LeaseStatus, Facility, JuristicServiceItem } from '../types';
import { DEFAULT_SETTINGS, INITIAL_FACILITIES, INITIAL_JURISTIC_SERVICES } from '../mockData';

const STORAGE_KEYS = {
  ROOMS: 'bh_ram60_rooms_v2',
  LEASES: 'bh_ram60_leases_v1',
  BOOKINGS: 'bh_ram60_bookings_v1',
  SETTINGS: 'bh_ram60_settings_v1',
  FACILITIES: 'bh_ram60_facilities_v1',
  SERVICES: 'bh_ram60_services_v1',
};

// Calculate days remaining and update status
export function calculateLeaseDaysAndStatus(endDateStr: string): { daysRemaining: number; status: LeaseStatus } {
  if (!endDateStr) return { daysRemaining: 0, status: 'active' };
  
  const end = new Date(endDateStr);
  const now = new Date();
  // reset time to midnight for fair day comparison
  end.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let status: LeaseStatus = 'active';
  if (daysRemaining < 0) {
    status = 'expired';
  } else if (daysRemaining <= 30) {
    status = 'expiring_30';
  } else if (daysRemaining <= 60) {
    status = 'expiring_60';
  } else {
    status = 'active';
  }
  
  return { daysRemaining, status };
}

// Generate direct official LINE URL (supports @ official accounts)
export function getLineUrl(lineId?: string): string {
  const clean = (lineId || '@052adooe').trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  const id = clean.startsWith('@') ? clean : `@${clean}`;
  return `https://line.me/R/ti/p/${encodeURIComponent(id)}`;
}

// -----------------------------------------------------------------------------
// Local Storage Operations
// -----------------------------------------------------------------------------

// List of known sample Unsplash mock images used originally
const MOCK_IMAGE_DOMAINS = [
  'images.unsplash.com/photo-1545324418-cc1a3fa10c00',
  'images.unsplash.com/photo-1576013551627-0cc20b96c2a7',
  'images.unsplash.com/photo-1600585154340-be6161a56a0c',
  'images.unsplash.com/photo-1512917774080-9991f1c4c750',
  'images.unsplash.com/photo-1508873696983-2df5703bc20d',
  'images.unsplash.com/photo-1584132967334-10e028bd69f7',
  'images.unsplash.com/photo-1540555700478-4be289fbecef',
  'images.unsplash.com/photo-1534438327276-14e5300c3a48',
  'images.unsplash.com/photo-1540497077202-7c8a3999166f',
  'images.unsplash.com/photo-1518611012118-696072aa579a',
  'images.unsplash.com/photo-1513694203232-719a280e022f',
  'images.unsplash.com/photo-1507652313519-d4e9174996dd',
  'images.unsplash.com/photo-1582719478250-c89cae4dc85b',
  'images.unsplash.com/photo-1557597774-9d273605dfa9',
  'images.unsplash.com/photo-1584622650111-993a426fbf0a',
  'images.unsplash.com/photo-1506521781263-d8422e82f27a',
  'images.unsplash.com/photo-1590674899484-d5640e854abe'
];

function isMockImage(url?: string): boolean {
  if (!url) return false;
  return MOCK_IMAGE_DOMAINS.some(pattern => url.includes(pattern));
}

// In-memory fallback cache to ensure real-time persistence across component cycles
const memoryStorageCache: Record<string, string> = {};

function safeSetItem(key: string, value: any): void {
  try {
    const stringified = typeof value === 'string' ? value : JSON.stringify(value);
    memoryStorageCache[key] = stringified;
    localStorage.setItem(key, stringified);
    // Also mirror to sessionStorage
    try {
      sessionStorage.setItem(key, stringified);
    } catch {
      // Ignore sessionStorage errors
    }
  } catch (err: any) {
    console.warn(`LocalStorage quota exceeded or error for key ${key}:`, err);
    try {
      const stringified = typeof value === 'string' ? value : JSON.stringify(value);
      memoryStorageCache[key] = stringified;
      sessionStorage.setItem(key, stringified);
    } catch (e) {
      console.error(`SessionStorage error for key ${key}:`, e);
    }
  }
}

function safeGetItem(key: string): string | null {
  // First check memory cache
  if (memoryStorageCache[key]) {
    return memoryStorageCache[key];
  }
  try {
    const fromSession = sessionStorage.getItem(key);
    const fromLocal = localStorage.getItem(key);
    // If session has it, compare length or preference
    if (fromLocal !== null) {
      memoryStorageCache[key] = fromLocal;
      return fromLocal;
    }
    if (fromSession !== null) {
      memoryStorageCache[key] = fromSession;
      return fromSession;
    }
  } catch (err) {
    console.warn(`Error reading key ${key} from storage:`, err);
  }
  return null;
}

export function loadSettings(): AppSettings {
  const saved = safeGetItem(STORAGE_KEYS.SETTINGS);
  if (!saved) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(saved);
    if (parsed.defaultContactLine === '@bh_ram60') {
      parsed.defaultContactLine = '@052adooe';
    }
    if (!parsed.adminPassword || parsed.adminPassword === 'admin') {
      parsed.adminPassword = '7014';
    }
    // Set official googleWebAppUrl if empty
    if (!parsed.googleWebAppUrl) {
      parsed.googleWebAppUrl = DEFAULT_SETTINGS.googleWebAppUrl;
    }
    // Filter out mock images from heroBackgroundImages
    if (Array.isArray(parsed.heroBackgroundImages)) {
      parsed.heroBackgroundImages = parsed.heroBackgroundImages.filter((img: string) => !isMockImage(img));
    } else {
      parsed.heroBackgroundImages = [];
    }
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    // Keep user's custom phone and line numbers intact
    if (parsed.defaultContactPhone) {
      merged.defaultContactPhone = parsed.defaultContactPhone;
    }
    if (parsed.defaultContactLine) {
      merged.defaultContactLine = parsed.defaultContactLine;
    }
    safeSetItem(STORAGE_KEYS.SETTINGS, merged);
    return merged;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  safeSetItem(STORAGE_KEYS.SETTINGS, settings);
}

// Mock IDs to ensure any cached sample data in the browser is completely purged
const LEGACY_MOCK_ROOM_IDS = new Set([
  'room-571', 'room-222', 'room-116', 'room-329', 'room-540',
  'room-518', 'room-512', 'room-431', 'room-788-553', 'room-788-497',
  'room-788-451', 'room-788-429', 'room-788-440', 'room-788-194',
  'room-1', 'room-2', 'room-3', 'room-4', 'room-5', 'room-6'
]);

const LEGACY_MOCK_LEASE_IDS = new Set([
  'lease-788-440', 'lease-788-194', 'lease-788-497', 'lease-788-553',
  'lease-1', 'lease-2', 'lease-3', 'lease-old-1', 'lease-old-2'
]);

const LEGACY_MOCK_BOOKING_IDS = new Set([
  'bk-1'
]);

export function loadRooms(): Room[] {
  const saved = safeGetItem(STORAGE_KEYS.ROOMS);
  let loadedRooms: Room[] = [];
  if (saved) {
    try {
      loadedRooms = JSON.parse(saved);
      if (!Array.isArray(loadedRooms)) loadedRooms = [];
    } catch (e) {
      loadedRooms = [];
    }
  }

  // Purge any mock rooms and sanitize
  const sanitizedRooms = loadedRooms
    .filter(r => !LEGACY_MOCK_ROOM_IDS.has(r.id) && !(r.areaSqM === 90 && r.bedrooms === 3))
    .map(r => {
      if (r.contactLine === '@bh_ram60') {
        return { ...r, contactLine: '@052adooe' };
      }
      return r;
    });

  if (sanitizedRooms.length !== loadedRooms.length || !saved) {
    safeSetItem(STORAGE_KEYS.ROOMS, sanitizedRooms);
  }

  return sanitizedRooms;
}

export function saveRooms(rooms: Room[]): void {
  safeSetItem(STORAGE_KEYS.ROOMS, rooms);
}

export function loadLeases(): Lease[] {
  const saved = safeGetItem(STORAGE_KEYS.LEASES);
  let leases: Lease[] = [];
  if (saved) {
    try {
      leases = JSON.parse(saved);
      if (!Array.isArray(leases)) leases = [];
    } catch (e) {
      leases = [];
    }
  }

  // Purge any legacy mock leases
  const sanitizedLeases = leases.filter(l => !LEGACY_MOCK_LEASE_IDS.has(l.id));

  if (sanitizedLeases.length !== leases.length || !saved) {
    safeSetItem(STORAGE_KEYS.LEASES, sanitizedLeases);
  }

  // Recalculate daysRemaining & dynamic status on load
  return sanitizedLeases.map(l => {
    const { daysRemaining, status } = calculateLeaseDaysAndStatus(l.endDate);
    return {
      ...l,
      daysRemaining,
      status: l.status === 'terminated' ? 'terminated' : status
    };
  });
}

export function saveLeases(leases: Lease[]): void {
  safeSetItem(STORAGE_KEYS.LEASES, leases);
}

export function loadBookings(): BookingReceipt[] {
  const saved = safeGetItem(STORAGE_KEYS.BOOKINGS);
  let bookings: BookingReceipt[] = [];
  if (saved) {
    try {
      bookings = JSON.parse(saved);
      if (!Array.isArray(bookings)) bookings = [];
    } catch (e) {
      bookings = [];
    }
  }

  // Purge legacy mock bookings
  const sanitized = bookings.filter(b => !LEGACY_MOCK_BOOKING_IDS.has(b.id));
  if (sanitized.length !== bookings.length || !saved) {
    safeSetItem(STORAGE_KEYS.BOOKINGS, sanitized);
  }
  return sanitized;
}

export function saveBookings(bookings: BookingReceipt[]): void {
  safeSetItem(STORAGE_KEYS.BOOKINGS, bookings);
}

export function loadFacilities(): Facility[] {
  const saved = safeGetItem(STORAGE_KEYS.FACILITIES);
  let facilities: Facility[] = [];
  if (!saved) {
    facilities = INITIAL_FACILITIES;
  } else {
    try {
      facilities = JSON.parse(saved);
      if (!Array.isArray(facilities)) facilities = INITIAL_FACILITIES;
    } catch (e) {
      facilities = INITIAL_FACILITIES;
    }
  }

  // Purge any mock images from facility items
  const sanitizedFacilities = facilities.map(f => ({
    ...f,
    images: Array.isArray(f.images) ? f.images.filter(img => !isMockImage(img)) : []
  }));

  safeSetItem(STORAGE_KEYS.FACILITIES, sanitizedFacilities);
  return sanitizedFacilities;
}

export function saveFacilities(facilities: Facility[]): void {
  safeSetItem(STORAGE_KEYS.FACILITIES, facilities);
}

export function loadJuristicServices(): JuristicServiceItem[] {
  const saved = safeGetItem(STORAGE_KEYS.SERVICES);
  if (!saved) {
    safeSetItem(STORAGE_KEYS.SERVICES, INITIAL_JURISTIC_SERVICES);
    return INITIAL_JURISTIC_SERVICES;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    return INITIAL_JURISTIC_SERVICES;
  }
}

export function saveJuristicServices(services: JuristicServiceItem[]): void {
  safeSetItem(STORAGE_KEYS.SERVICES, services);
}

// -----------------------------------------------------------------------------
// Google Apps Script API Connector
// -----------------------------------------------------------------------------

export async function testGasConnection(webAppUrl: string): Promise<{ success: boolean; message: string; data?: any }> {
  if (!webAppUrl || !webAppUrl.startsWith('http')) {
    return { success: false, message: 'กรุณากรอก Web App URL ให้ถูกต้อง (ขึ้นต้นด้วย https://script.google.com/...)' };
  }

  try {
    const response = await fetch(`${webAppUrl}?action=ping`, {
      method: 'GET',
      mode: 'cors',
    });
    const result = await response.json();
    if (result.success) {
      return {
        success: true,
        message: result.configured 
          ? `เชื่อมต่อ Google Sheet สำเร็จแล้ว! (${result.spreadsheetName || 'พร้อมใช้งาน'})`
          : `เชื่อมต่อสำเร็จ แต่ยังไม่ได้สร้าง Sheet กรุณารัน setupProject หรือกดปุ่ม 'ตั้งค่าชีตอัตโนมัติ'`,
        data: result
      };
    } else {
      return { success: false, message: result.error || 'การเชื่อมต่อผิดพลาด' };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อได้: ${error.message || 'โปรดตรวจสอบว่าได้เลือก "Who has access: Anyone" ในขั้นตอน Deploy แล้วหรือยัง'}`
    };
  }
}

export async function triggerGasSetup(webAppUrl: string): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'setup' })
    });
    const result = await response.json();
    return result;
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function syncFromGas(webAppUrl: string): Promise<{ success: boolean; rooms?: Room[]; leases?: Lease[]; bookings?: BookingReceipt[]; settings?: Partial<AppSettings>; error?: string }> {
  if (!webAppUrl) return { success: false, error: 'ยังไม่ได้ระบุ Web App URL' };

  try {
    const res = await fetch(`${webAppUrl}?action=syncAll`, { 
      method: 'GET', 
      mode: 'cors',
      cache: 'no-cache'
    });
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ไม่สามารถดึงข้อมูลจาก Google Apps Script ได้` };
    }
    const data = await res.json();
    if (data.success) {
      const validRooms = Array.isArray(data.rooms) ? data.rooms : [];
      const validLeases = Array.isArray(data.leases) ? data.leases : [];
      const validBookings = Array.isArray(data.bookings) ? data.bookings : [];

      // SMART MERGE: Never blindly overwrite local changes with older cloud data!
      const localRooms = loadRooms();
      const localLeases = loadLeases();
      const localBookings = loadBookings();

      // Merge rooms: Local rooms are authoritative for user edits, status changes, and new rooms!
      const roomMap = new Map<string, Room>();
      validRooms.forEach(cr => {
        if (cr && cr.id) roomMap.set(cr.id, cr);
      });
      localRooms.forEach(lr => {
        if (!lr || !lr.id) return;
        const cr = roomMap.get(lr.id);
        if (!cr) {
          // Room was created locally and not yet synced to cloud, preserve it!
          roomMap.set(lr.id, lr);
        } else {
          // Parse timestamps safely
          const localTime = Date.parse(lr.updatedAt || lr.createdAt || '') || 0;
          const cloudTime = Date.parse(cr.updatedAt || cr.createdAt || '') || 0;
          // Keep local if local has newer timestamp, or if cloud timestamp is missing/invalid,
          // or if local room has user edits (e.g. status was toggled to publish)
          if (localTime >= cloudTime || isNaN(cloudTime)) {
            roomMap.set(lr.id, lr);
          }
        }
      });
      const finalRooms = Array.from(roomMap.values());

      // Merge leases:
      const leaseMap = new Map<string, Lease>();
      validLeases.forEach(cl => {
        if (cl && cl.id) leaseMap.set(cl.id, cl);
      });
      localLeases.forEach(ll => {
        if (ll && ll.id) leaseMap.set(ll.id, ll); // local takes precedence
      });
      const finalLeases = Array.from(leaseMap.values());

      // Merge bookings:
      const bookingMap = new Map<string, BookingReceipt>();
      validBookings.forEach(cb => {
        if (cb && cb.id) bookingMap.set(cb.id, cb);
      });
      localBookings.forEach(lb => {
        if (lb && lb.id) bookingMap.set(lb.id, lb);
      });
      const finalBookings = Array.from(bookingMap.values());

      saveRooms(finalRooms);
      saveLeases(finalLeases);
      saveBookings(finalBookings);

      const current = loadSettings();
      // Keep local settings if user has configured them, only use cloud if local is empty/default
      const merged: AppSettings = {
        ...current,
        // Preserve current user settings
        defaultContactPhone: current.defaultContactPhone || data.settings?.defaultContactPhone || '02-735-6060',
        defaultContactLine: current.defaultContactLine || data.settings?.defaultContactLine || '@052adooe',
        agencyName: current.agencyName || data.settings?.agencyName || 'Bangkok Horizon Ram 60 (นิติบุคคลอาคารชุด)',
        adminPassword: current.adminPassword || data.settings?.adminPassword || '7014',
        adminEmail: current.adminEmail || data.settings?.adminEmail || '',
      };
      saveSettings(merged);

      return {
        success: true,
        rooms: finalRooms,
        leases: finalLeases,
        bookings: finalBookings,
        settings: merged
      };
    } else {
      return { success: false, error: data.error || 'Google Apps Script ส่งคืนสถานะไม่สำเร็จ' };
    }
  } catch (e: any) {
    return { success: false, error: e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย' };
  }
}

export async function syncSettingsToGas(webAppUrl: string, settings: AppSettings): Promise<{ success: boolean; message?: string }> {
  if (!webAppUrl) return { success: false, message: 'ยังไม่ได้ระบุ Web App URL' };
  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveSettings',
        settings: {
          adminPassword: settings.adminPassword,
          adminEmail: settings.adminEmail,
          agencyName: settings.agencyName,
          defaultContactPhone: settings.defaultContactPhone,
          defaultContactLine: settings.defaultContactLine,
          agencyAddress: settings.agencyAddress
        }
      })
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function syncToGas(webAppUrl: string, rooms: Room[], leases: Lease[], bookings: BookingReceipt[]): Promise<{ success: boolean; message: string }> {
  if (!webAppUrl) return { success: false, message: 'ยังไม่ได้ระบุ Web App URL' };

  try {
    // Send rooms, leases, bookings sequentially to GAS
    for (const r of rooms) {
      await fetch(webAppUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveRoom', room: r })
      });
    }

    for (const l of leases) {
      await fetch(webAppUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveLease', lease: l })
      });
    }

    for (const b of bookings) {
      await fetch(webAppUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveBooking', booking: b })
      });
    }

    return { success: true, message: 'อัปเดตข้อมูลขึ้น Google Sheet ทั้งหมดเรียบร้อยแล้ว' };
  } catch (err: any) {
    return { success: false, message: 'การส่งข้อมูลขัดข้อง: ' + err.message };
  }
}

/**
 * บันทึกห้องชุดเดี่ยวขึ้น Google Sheet ทันที (Background Auto-Sync)
 */
export async function saveRoomToGas(webAppUrl: string, room: Room): Promise<{ success: boolean; error?: string }> {
  if (!webAppUrl) return { success: false, error: 'No GAS URL' };
  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'saveRoom', room })
    });
    const data = await res.json();
    return { success: data.success, error: data.error };
  } catch (err: any) {
    console.warn('Auto-sync room error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * บันทึกสัญญาเช่าเดี่ยวขึ้น Google Sheet ทันที (Background Auto-Sync)
 */
export async function saveLeaseToGas(webAppUrl: string, lease: Lease): Promise<{ success: boolean; error?: string }> {
  if (!webAppUrl) return { success: false, error: 'No GAS URL' };
  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'saveLease', lease })
    });
    const data = await res.json();
    return { success: data.success, error: data.error };
  } catch (err: any) {
    console.warn('Auto-sync lease error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * บันทึกใบจองห้องชุดเดี่ยวขึ้น Google Sheet ทันที (Background Auto-Sync)
 */
export async function saveBookingToGas(webAppUrl: string, booking: BookingReceipt): Promise<{ success: boolean; error?: string }> {
  if (!webAppUrl) return { success: false, error: 'No GAS URL' };
  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'saveBooking', booking })
    });
    const data = await res.json();
    return { success: data.success, error: data.error };
  } catch (err: any) {
    console.warn('Auto-sync booking error:', err);
    return { success: false, error: err.message };
  }
}

export async function uploadImageToDrive(
  webAppUrl: string, 
  base64Data: string, 
  fileName: string, 
  mimeType: string = 'image/jpeg',
  roomNumber?: string,
  subfolderType: string = 'photos'
): Promise<{ success: boolean; url?: string; viewUrl?: string; driveUrl?: string; folderUrl?: string; error?: string }> {
  if (!webAppUrl) {
    // Fallback: return data url in offline mode
    return { success: true, url: base64Data };
  }

  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'uploadFile',
        base64Data,
        fileName,
        mimeType,
        roomNumber,
        subfolderType
      })
    });
    const json = await res.json();
    if (json.success) {
      return { 
        success: true, 
        url: json.url || json.viewUrl, 
        viewUrl: json.viewUrl,
        driveUrl: json.driveUrl,
        folderUrl: json.folderUrl
      };
    } else {
      return { success: false, error: json.error };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function uploadDocumentToDrive(
  webAppUrl: string, 
  base64Data: string, 
  fileName: string, 
  mimeType: string = 'application/pdf',
  roomNumber?: string,
  subfolderType: string = 'contracts'
): Promise<{ success: boolean; url?: string; viewUrl?: string; driveUrl?: string; folderUrl?: string; error?: string }> {
  if (!webAppUrl) {
    // Fallback in offline / demo mode: return the base64 data url directly so user can still preview
    return { success: true, url: base64Data, viewUrl: base64Data };
  }

  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'uploadFile',
        base64Data,
        fileName,
        mimeType,
        roomNumber,
        subfolderType
      })
    });
    const json = await res.json();
    if (json.success) {
      // Prioritize the direct file viewer link (opens the exact file viewer, not the folder)
      const directFileViewer = json.driveUrl || json.viewUrl || json.url;
      return { 
        success: true, 
        url: directFileViewer, 
        viewUrl: json.viewUrl,
        driveUrl: json.driveUrl || directFileViewer,
        folderUrl: json.folderUrl
      };
    } else {
      return { success: false, error: json.error };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * เปิดดูไฟล์เอกสารสัญญาฉบับจริงโดยตรงในแท็บใหม่ (Direct Single-File Viewer)
 * 1. กรณีเป็นไฟล์บน Google Drive: จะเปิดหน้าแสดงผลไฟล์ฉบับนั้นโดยตรง (File Viewer) ไม่ใช่หน้าโฟลเดอร์ ไม่ต้องค้นหาเอง
 * 2. กรณีเป็น Base64 Data URL (โหมดออฟไลน์/ทดสอบ): แปลงเป็น Blob URL แล้วเปิดผ่าน Browser PDF Viewer ทันที
 */
export function openDocumentInNewTab(url: string | undefined): void {
  if (!url) return;

  // Case 1: Base64 Data URL (รองรับการเปิดดูแบบออฟไลน์)
  if (url.startsWith('data:')) {
    try {
      const parts = url.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const byteCharacters = atob(parts[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      return;
    } catch (e) {
      console.error('Failed to convert base64 to blob URL', e);
    }
  }

  // Case 2: Google Drive URL
  // รับประกันว่าจะชี้ไปที่ตัวไฟล์นั้นโดยตรง (https://drive.google.com/file/d/FILE_ID/view)
  let directViewerUrl = url;
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                      url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || 
                      url.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (fileIdMatch && fileIdMatch[1] && (url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com') || url.includes('google.com'))) {
    directViewerUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
  }

  window.open(directViewerUrl, '_blank', 'noopener,noreferrer');
}
