import { Lease } from '../types';
import { calculateLeaseDaysAndStatus } from './apiService';

const STORAGE_KEY_LAST_ALERT_DATE = 'bh_last_push_alert_date';
const STORAGE_KEY_NOTIFIED_IDS = 'bh_notified_lease_ids_today';
const STORAGE_KEY_PUSH_ENABLED = 'bh_browser_push_notifications_enabled';

export type BrowserNotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface ExpiringLeaseAlertItem {
  lease: Lease;
  daysRemaining: number;
}

/**
 * Check if the browser supports Notification API
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getBrowserNotificationPermission(): BrowserNotificationStatus {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as BrowserNotificationStatus;
}

/**
 * Check if staff has enabled automated browser push notification in settings
 */
export function isAutoPushEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(STORAGE_KEY_PUSH_ENABLED);
  return val === null ? true : val === 'true';
}

/**
 * Set automated push notification setting
 */
export function setAutoPushEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PUSH_ENABLED, enabled ? 'true' : 'false');
}

/**
 * Request notification permission from user
 */
export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationStatus> {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as BrowserNotificationStatus;
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return Notification.permission as BrowserNotificationStatus;
  }
}

/**
 * Find all leases expiring within 30 days (0 <= daysRemaining <= 30)
 */
export function getExpiringLeasesWithin30Days(leases: Lease[]): ExpiringLeaseAlertItem[] {
  const expiringList: ExpiringLeaseAlertItem[] = [];

  leases.forEach(lease => {
    if (!lease.endDate) return;
    const { daysRemaining, status } = calculateLeaseDaysAndStatus(lease.endDate);
    
    // Within 30 days (active, not yet past expiration date)
    if (daysRemaining >= 0 && daysRemaining <= 30) {
      expiringList.push({
        lease,
        daysRemaining
      });
    }
  });

  // Sort by urgency: fewest days remaining first
  return expiringList.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Helper to display a single native browser notification
 */
export function showSingleBrowserNotification(
  title: string, 
  options: NotificationOptions & { onClick?: () => void }
): Notification | null {
  if (getBrowserNotificationPermission() !== 'granted') {
    return null;
  }

  try {
    const notif = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });

    notif.onclick = () => {
      window.focus();
      if (options.onClick) {
        options.onClick();
      }
      notif.close();
    };

    return notif;
  } catch (err) {
    console.warn('Failed to construct browser notification:', err);
    return null;
  }
}

/**
 * Send a test browser notification to verify browser & OS settings
 */
export function sendTestBrowserNotification(): { success: boolean; message: string } {
  const perm = getBrowserNotificationPermission();
  
  if (perm === 'unsupported') {
    return {
      success: false,
      message: 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ Push Notification'
    };
  }

  if (perm !== 'granted') {
    return {
      success: false,
      message: 'กรุณากดปุ่ม "อนุญาตการแจ้งเตือน" บนเบราว์เซอร์ก่อนทำการทดสอบ'
    };
  }

  const notif = showSingleBrowserNotification('🔔 ทดสอบการแจ้งเตือน (HORIZON Admin)', {
    body: 'ระบบแจ้งเตือนสัญญาเช่าใกล้หมดอายุ 30 วัน พร้อมทำงานบนเบราว์เซอร์ของคุณแล้ว',
    tag: 'bh-test-notification-' + Date.now(),
  });

  return {
    success: !!notif,
    message: notif ? 'ส่งการแจ้งเตือนไปยังหน้าจอสำเร็จแล้ว!' : 'ไม่สามารถส่งการแจ้งเตือนได้'
  };
}

/**
 * Trigger browser notifications for leases expiring within 30 days
 * With intelligent daily deduplication to avoid annoying staff
 */
export function checkAndNotifyExpiringLeases(
  leases: Lease[],
  options?: {
    force?: boolean;
    onNotificationClick?: (lease: Lease) => void;
  }
): {
  sentCount: number;
  totalExpiring: number;
  expiringItems: ExpiringLeaseAlertItem[];
} {
  const perm = getBrowserNotificationPermission();
  const expiringItems = getExpiringLeasesWithin30Days(leases);
  const totalExpiring = expiringItems.length;

  if (perm !== 'granted' || totalExpiring === 0) {
    return { sentCount: 0, totalExpiring, expiringItems };
  }

  if (!options?.force && !isAutoPushEnabled()) {
    return { sentCount: 0, totalExpiring, expiringItems };
  }

  // Check today's date for deduplication
  const todayStr = new Date().toISOString().split('T')[0];
  const lastAlertDate = localStorage.getItem(STORAGE_KEY_LAST_ALERT_DATE);
  let notifiedIds: string[] = [];

  if (lastAlertDate === todayStr) {
    try {
      notifiedIds = JSON.parse(localStorage.getItem(STORAGE_KEY_NOTIFIED_IDS) || '[]');
    } catch {
      notifiedIds = [];
    }
  } else {
    // Reset for a new day
    localStorage.setItem(STORAGE_KEY_LAST_ALERT_DATE, todayStr);
    localStorage.setItem(STORAGE_KEY_NOTIFIED_IDS, JSON.stringify([]));
  }

  let sentCount = 0;

  // If forced (manual click by staff), notify all expiring items (up to 3 individual + summary)
  const itemsToAlert = options?.force
    ? expiringItems
    : expiringItems.filter(item => !notifiedIds.includes(item.lease.id));

  if (itemsToAlert.length === 0) {
    return { sentCount: 0, totalExpiring, expiringItems };
  }

  // If there are 1-2 expiring leases, show individual detail notifications
  if (itemsToAlert.length <= 2) {
    itemsToAlert.forEach(item => {
      const lease = item.lease;
      const days = item.daysRemaining;
      const daysText = days === 0 ? 'หมดอายุวันนี้!' : `เหลือเวลาอีก ${days} วัน`;
      
      const notif = showSingleBrowserNotification(
        `⚠️ สัญญาใกล้หมดอายุ (ห้อง ${lease.roomNumber})`,
        {
          body: `${daysText} (สิ้นสุด: ${lease.endDate})\nผู้เช่า: ${lease.tenantName} | โทร: ${lease.tenantPhone || 'ไม่ระบุ'}`,
          tag: `bh-lease-30-${lease.id}-${todayStr}`,
          requireInteraction: true,
          onClick: () => {
            if (options?.onNotificationClick) {
              options.onNotificationClick(lease);
            }
          }
        }
      );

      if (notif) {
        sentCount++;
        notifiedIds.push(lease.id);
      }
    });
  } else {
    // Multiple leases expiring (> 2): Show individual top urgent alert + consolidated alert
    const mostUrgent = itemsToAlert[0];
    showSingleBrowserNotification(
      `⚠️ สัญญาใกล้หมดอายุ (ห้อง ${mostUrgent.lease.roomNumber})`,
      {
        body: `ด่วนที่สุด: เหลืออีก ${mostUrgent.daysRemaining} วัน (ผู้เช่า: ${mostUrgent.lease.tenantName})`,
        tag: `bh-lease-urgent-${mostUrgent.lease.id}-${todayStr}`,
        requireInteraction: true,
        onClick: () => {
          if (options?.onNotificationClick) {
            options.onNotificationClick(mostUrgent.lease);
          }
        }
      }
    );
    sentCount++;

    const roomSummary = itemsToAlert.slice(0, 4).map(i => `ห้อง ${i.lease.roomNumber} (${i.daysRemaining} วัน)`).join(', ');
    showSingleBrowserNotification(
      `🔔 แจ้งเตือน: มีสัญญาใกล้หมดอายุ ${itemsToAlert.length} ห้อง (ภายใน 30 วัน)`,
      {
        body: `${roomSummary}${itemsToAlert.length > 4 ? ` และอีก ${itemsToAlert.length - 4} ห้อง` : ''}\nคลิกเพื่อเปิดดูรายละเอียดสัญญาในระบบ`,
        tag: `bh-lease-summary-${todayStr}`,
        requireInteraction: true,
        onClick: () => {
          if (options?.onNotificationClick) {
            options.onNotificationClick(mostUrgent.lease);
          }
        }
      }
    );
    sentCount++;

    itemsToAlert.forEach(item => notifiedIds.push(item.lease.id));
  }

  // Update notified IDs in storage
  localStorage.setItem(STORAGE_KEY_NOTIFIED_IDS, JSON.stringify(notifiedIds));

  return { sentCount, totalExpiring, expiringItems };
}
