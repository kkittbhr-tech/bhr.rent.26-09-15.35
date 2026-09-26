import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'th' | 'en';

export interface Translations {
  [key: string]: {
    th: string;
    en: string;
  };
}

export const TRANSLATIONS: Translations = {
  // Navigation & Header
  agency_name: {
    th: 'Bangkok Horizon Ram 60',
    en: 'Bangkok Horizon Ram 60'
  },
  juristic_office: {
    th: 'สำนักงานนิติบุคคล',
    en: 'Juristic Office'
  },
  call_office: {
    th: 'โทรนิติฯ',
    en: 'Call Office'
  },
  line_official: {
    th: 'LINE นิติบุคคล',
    en: 'Official LINE'
  },
  staff_login: {
    th: 'เจ้าหน้าที่',
    en: 'Staff Login'
  },
  customer_mode: {
    th: 'มุมมองลูกค้า',
    en: 'Customer View'
  },
  admin_mode: {
    th: 'ระบบนิติบุคคล',
    en: 'Admin Panel'
  },
  logout: {
    th: 'ออกจากระบบ',
    en: 'Logout'
  },

  // Hero & Sub-banner
  hero_title: {
    th: 'Bangkok Horizon รามคำแหง 60',
    en: 'Bangkok Horizon Ramkhamhaeng 60'
  },
  hero_tagline: {
    th: 'คอนโดมิเนียมพร้อมอยู่ ทำเลศักยภาพ ใกล้ MRT แยกลำสาลี จัดการโดยนิติบุคคลโดยตรง',
    en: 'Ready-to-move-in Condominium near MRT Yaek Lam Sali, managed directly by the Juristic Office'
  },

  // Main Tabs
  tab_units: {
    th: 'ห้องว่างพร้อมอยู่',
    en: 'Available Units'
  },
  tab_facilities: {
    th: 'ส่วนกลาง & ฟิตเนส',
    en: 'Facilities'
  },
  tab_services: {
    th: 'บริการนิติ',
    en: 'Services'
  },
  tab_services_full: {
    th: 'บริการนิติบุคคล & ระเบียบการเช่า',
    en: 'Juristic Services & Rules'
  },
  tab_contact: {
    th: 'ที่ตั้งโครงการ',
    en: 'Location'
  },
  tab_contact_full: {
    th: 'ที่ตั้งสำนักงาน & นัดหมายชมห้อง',
    en: 'Location & Appointments'
  },

  // Filters
  filter_size_title: {
    th: 'เลือกขนาดห้องชุด',
    en: 'Unit Size'
  },
  filter_all_sizes: {
    th: 'ทุกขนาด',
    en: 'All Sizes'
  },
  filter_all_types: {
    th: 'ทุกแบบห้องชุด',
    en: 'All Layouts'
  },
  filter_studio: {
    th: 'สตูดิโอ',
    en: 'Studio'
  },
  filter_1bed: {
    th: '1 ห้องนอน',
    en: '1 Bedroom'
  },
  filter_2bed: {
    th: '2 ห้องนอน',
    en: '2 Bedrooms'
  },
  filter_clear: {
    th: 'ล้างการเลือก',
    en: 'Clear Filter'
  },
  filter_search_placeholder: {
    th: 'ค้นหาเลขห้อง, ชั้น หรือทิศ...',
    en: 'Search unit no., floor, facing...'
  },
  filter_type_all: {
    th: 'ทั้งหมด',
    en: 'All'
  },
  filter_type_rent: {
    th: 'ให้เช่า',
    en: 'For Rent'
  },
  filter_type_sale: {
    th: 'ขาย',
    en: 'For Sale'
  },
  filter_type_both: {
    th: 'ขาย / เช่า',
    en: 'Rent & Sale'
  },

  // Room Card
  unit_word: {
    th: 'ห้อง',
    en: 'Unit'
  },
  floor_word: {
    th: 'ชั้น',
    en: 'Fl.'
  },
  floor_label: {
    th: 'ชั้น',
    en: 'Floor'
  },
  facing_word: {
    th: 'ทิศ',
    en: 'Facing '
  },
  sqm_word: {
    th: 'ตร.ม.',
    en: 'sq.m.'
  },
  bedroom_word: {
    th: 'ห้องนอน',
    en: 'Bedroom'
  },
  bedroom_abbr: {
    th: 'นอน',
    en: 'Bed'
  },
  bathroom_word: {
    th: 'ห้องน้ำ',
    en: 'Bathroom'
  },
  bathroom_abbr: {
    th: 'น้ำ',
    en: 'Bath'
  },
  studio_word: {
    th: 'สตูดิโอ',
    en: 'Studio'
  },
  rent_label: {
    th: 'เช่า',
    en: 'Rent'
  },
  sale_label: {
    th: 'ขาย',
    en: 'Sale'
  },
  per_month: {
    th: '/ เดือน',
    en: '/ month'
  },
  thb_currency: {
    th: 'บาท',
    en: 'THB'
  },
  view_room_btn: {
    th: 'ดูรายละเอียดห้อง',
    en: 'View Details'
  },
  photos_count: {
    th: 'รูป',
    en: 'photos'
  },

  // Modal / Detail Pop-up
  modal_price_terms: {
    th: 'ข้อมูลราคาและเงื่อนไข',
    en: 'Pricing & Terms'
  },
  modal_rent_term: {
    th: 'สัญญาขั้นต่ำ 1 ปี • ประกัน 2 เดือน',
    en: 'Min 1-year contract • 2-month deposit'
  },
  modal_sale_term: {
    th: 'กรรมสิทธิ์ Freehold • ค่าโอนตามตกลง',
    en: 'Freehold Ownership • Transfer fee as agreed'
  },
  modal_area: {
    th: 'พื้นที่',
    en: 'Area'
  },
  modal_desc_title: {
    th: 'รายละเอียดห้องพัก',
    en: 'Room Details'
  },
  modal_highlights_title: {
    th: 'จุดเด่นของห้อง',
    en: 'Room Highlights'
  },
  modal_amenities_title: {
    th: 'สิ่งอำนวยความสะดวก & เฟอร์นิเจอร์',
    en: 'Amenities & Furnishings'
  },
  modal_view_fullscreen: {
    th: 'ดูภาพใหญ่',
    en: 'Fullscreen'
  },
  modal_call_btn: {
    th: 'โทรติดต่อ',
    en: 'Call Office'
  },
  modal_line_btn: {
    th: 'แอด LINE',
    en: 'Add LINE'
  },
  modal_contact_office: {
    th: 'ติดต่อสำนักงานนิติบุคคล Bangkok Horizon ราม 60',
    en: 'Contact Juristic Office - Bangkok Horizon Ram 60'
  },

  // Footer & Callout
  callout_eyebrow: {
    th: 'Bangkok Horizon Ramkhamhaeng 60 Juristic Office',
    en: 'Bangkok Horizon Ramkhamhaeng 60 Juristic Office'
  },
  callout_title: {
    th: 'สนใจนัดหมายเข้าชมห้องจริง หรือปรึกษาการทำสัญญาเช่า',
    en: 'Schedule a unit tour or consult on lease agreements'
  },
  callout_desc: {
    th: 'สำนักงานนิติบุคคลอาคารชุดพร้อมให้บริการและอำนวยความสะดวกทุกวัน ไม่มีวันหยุด',
    en: 'The Juristic Office is available to assist you daily with no holidays.'
  },
  transit_title: {
    th: 'การเดินทางและสถานที่ใกล้เคียง',
    en: 'Transit & Nearby Landmarks'
  },
  office_hours_title: {
    th: 'เวลาทำการสำนักงานนิติบุคคล',
    en: 'Juristic Office Hours'
  },
  office_hours_val: {
    th: 'เปิดให้บริการทุกวัน 08:30 - 17:30 น. (ไม่มีวันหยุด)',
    en: 'Open Daily 08:30 - 17:30 (Everyday)'
  },
  transit_1: {
    th: 'MRT แยกลำสาลี (Interchange): ประมาณ 400 เมตร (สายสีส้ม & สายสีเหลือง)',
    en: 'MRT Yaek Lam Sali (Interchange): ~400m (Orange & Yellow Lines)'
  },
  transit_2: {
    th: 'ห้างสรรพสินค้า: เดอะมอลล์ บางกะปิ, ตะวันนา, โลตัส บางกะปิ',
    en: 'Shopping Malls: The Mall Bangkapi, Tawanna, Lotus\'s Bangkapi'
  },
  transit_3: {
    th: 'สถานศึกษา: มหาวิทยาลัยรามคำแหง, มหาวิทยาลัยอัสสัมชัญ (ABAC), สถาบัน NIDA',
    en: 'Universities: Ramkhamhaeng Univ., ABAC, NIDA Institute'
  },
  transit_4: {
    th: 'สถานพยาบาล: โรงพยาบาลรามคำแหง, โรงพยาบาลเวชธานี',
    en: 'Hospitals: Ramkhamhaeng Hospital, Vejthani Hospital'
  },

  // Facilities
  facilities_title: {
    th: 'พื้นที่ส่วนกลางและสิ่งอำนวยความสะดวก',
    en: 'Facilities & Amenities'
  },
  facilities_desc: {
    th: 'เพลิดเพลินกับสิ่งอำนวยความสะดวกครบครัน สระว่ายน้ำ ฟิตเนส สวนลอยฟ้า และระบบรักษาความปลอดภัย',
    en: 'Enjoy full facilities including swimming pool, fitness center, sky garden, and 24-hr security.'
  },
  view_facility_rules: {
    th: 'ระเบียบการใช้งาน & เวลาเปิด-ปิด',
    en: 'Rules & Operating Hours'
  },

  // Juristic Services
  services_title: {
    th: 'บริการนิติบุคคลและระเบียบการเช่า',
    en: 'Juristic Services & Regulations'
  },
  services_desc: {
    th: 'ข้อมูลเอกสาร สัญญาเช่ามาตรฐาน การแจ้งย้ายเข้า-ออก และการอำนวยความสะดวกสำหรับผู้พักอาศัย',
    en: 'Documentation, standard lease contracts, move-in/out notices, and resident support.'
  }
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
  isTh: boolean;
  isEn: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    // 1. Check if user already manually selected a language previously
    try {
      const saved = localStorage.getItem('bh_user_lang');
      if (saved === 'th' || saved === 'en') {
        return saved;
      }
    } catch (e) {
      // LocalStorage access may fail in private mode
    }

    // 2. Auto-detect from phone/device browser language
    if (typeof window !== 'undefined' && window.navigator) {
      const navLang = (window.navigator.language || (window.navigator as any).userLanguage || '').toLowerCase();
      // If phone is set to Thai, default to 'th'
      if (navLang.startsWith('th')) {
        return 'th';
      }
      // If phone is set to English or any other language, default to 'en'
      return 'en';
    }

    return 'th';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('bh_user_lang', newLang);
    } catch (e) {
      // ignore
    }
  };

  const toggleLang = () => {
    setLang(lang === 'th' ? 'en' : 'th');
  };

  const t = (key: string): string => {
    if (TRANSLATIONS[key]) {
      return TRANSLATIONS[key][lang] || TRANSLATIONS[key]['th'] || key;
    }
    return key;
  };

  useEffect(() => {
    // Set document lang attribute
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, isTh: lang === 'th', isEn: lang === 'en' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
