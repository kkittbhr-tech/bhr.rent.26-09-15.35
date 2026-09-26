export interface DirectionMetadata {
  key: string;
  name: string;
  shortName: string;
  angle: number; // 0 for North, 90 for East, 180 for South, 270 for West
  sunlightSummary: string;
  sunlightSchedule: string;
  sunlightDetail: string;
  windDetail: string;
  livingAdvantage: string;
  iconType: 'sun' | 'sun-moon' | 'wind' | 'shield-check';
  badgeStyle: string;
}

export const DIRECTION_CONFIGS: Record<string, DirectionMetadata> = {
  'north': {
    key: 'north',
    name: 'ทิศเหนือ',
    shortName: 'N',
    angle: 0,
    sunlightSummary: 'ร่มตลอดทั้งวัน ไม่โดนแดดตรง',
    sunlightSchedule: 'แสงธรรมชาติสม่ำเสมอ (ไร้แดดร้อนส่องเข้าห้อง)',
    sunlightDetail: 'รับแสงแดดทางอ้อมตลอดทั้งวัน ห้องไม่สะสมความร้อน เหมาะอย่างยิ่งสำหรับผู้ที่อยู่ห้องช่วงกลางวันหรือทำงาน WFH',
    windDetail: 'รับลมหนาวช่วงเดือน พ.ย. - ก.พ. อากาศหมุนเวียนถ่ายเทสะดวก',
    livingAdvantage: 'ห้องเย็นสบายที่สุด ประหยัดค่าไฟแอร์ ไม่ต้องกังวลเรื่องห้องร้อนอบอ้าว',
    iconType: 'shield-check',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  },
  'northeast': {
    key: 'northeast',
    name: 'ทิศตะวันออกเฉียงเหนือ',
    shortName: 'NE',
    angle: 45,
    sunlightSummary: 'แดดเช้าอ่อนๆ อากาศเย็นสบาย',
    sunlightSchedule: 'รับแสงเช้าช่วง 06:30 - 09:30 น.',
    sunlightDetail: 'ได้รับแสงอรุณยามเช้าเพียงเล็กน้อย ช่วยฆ่าเชื้อโรคตามธรรมชาติ บ่ายร่มเงาสบาย ไม่ร้อน',
    windDetail: 'รับลมเย็นจากทิศเหนือและลมหนาวปลายปีได้ดีเยี่ยม',
    livingAdvantage: 'ทิศยอดนิยมของคอนโดเมืองไทย แดดน้อย ลมดี ห้องเย็นสบายตลอดวัน',
    iconType: 'sun-moon',
    badgeStyle: 'bg-teal-50 text-teal-800 border-teal-200'
  },
  'east': {
    key: 'east',
    name: 'ทิศตะวันออก',
    shortName: 'E',
    angle: 90,
    sunlightSummary: 'รับแดดเช้า บ่ายร่มเงาเย็นสบาย',
    sunlightSchedule: 'รับแดดช่วงเช้า 07:00 - 11:30 น. (บ่ายร่มสนิท)',
    sunlightDetail: 'เปิดรับแดดอ่อนยามเช้าช่วยให้ตื่นอย่างสดชื่น ปราศจากความร้อนสะสมช่วงบ่าย เมื่อกลับห้องหลังเลิกงานห้องจะเย็นสบายพร้อมพักผ่อนทันที',
    windDetail: 'ลมพัดผ่านช่วงเช้า อากาศไม่อับชื้น ระบายกลิ่นได้ดีเยี่ยม',
    livingAdvantage: 'ยอดนิยมสำหรับคนทำงานออฟฟิศ กลางคืนเปิดแอร์เย็นเร็ว ประหยัดไฟ',
    iconType: 'sun',
    badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  'southeast': {
    key: 'southeast',
    name: 'ทิศตะวันออกเฉียงใต้',
    shortName: 'SE',
    angle: 135,
    sunlightSummary: 'แดดเช้า ลมพัดเข้าห้องดีเกือบตลอดปี',
    sunlightSchedule: 'รับแดดเช้าถึงสาย 07:30 - 12:00 น.',
    sunlightDetail: 'รับแดดช่วงเช้าและสายช่วยให้ห้องสว่างโปร่ง ไม่อับชื้น บ่ายร่มเย็นสบาย พร้อมรับลมใต้ธรรมชาติ',
    windDetail: 'รับลมมรสุมตะวันตกเฉียงใต้และลมใต้ได้นาน 8-9 เดือนต่อปี ลมโกรกตลอดวัน',
    livingAdvantage: 'ลมพัดเย็นสบาย ถ่ายเทอากาศได้เป็นเลิศ ไม่ต้องเปิดแอร์ตลอดเวลา',
    iconType: 'wind',
    badgeStyle: 'bg-sky-50 text-sky-800 border-sky-200'
  },
  'south': {
    key: 'south',
    name: 'ทิศใต้',
    shortName: 'S',
    angle: 180,
    sunlightSummary: 'รับลมธรรมชาติแรงสุด ลมดีตลอดปี',
    sunlightSchedule: 'แดดเฉียงช่วงหน้าหนาว (รับแดดบางช่วง)',
    sunlightDetail: 'ทิศที่มีลมธรรมชาติพัดผ่านเข้าห้องต่อเนื่องยาวนานที่สุดในรอบปี (ประมาณ 8-9 เดือน) อากาศหมุนเวียนยอดเยี่ยม',
    windDetail: 'ลมใต้และลมมรสุมพัดเข้าห้องเต็มที่ เปิดระเบียงรับลมธรรมชาติได้สบาย',
    livingAdvantage: 'ลมโกรกเย็นสบาย ห้องไม่อับชื้น สำหรับคนชอบเปิดประตูรับลมธรรมชาติ',
    iconType: 'wind',
    badgeStyle: 'bg-blue-50 text-blue-800 border-blue-200'
  },
  'southwest': {
    key: 'southwest',
    name: 'ทิศตะวันตกเฉียงใต้',
    shortName: 'SW',
    angle: 225,
    sunlightSummary: 'ลมดี รับแดดบ่าย ซักผ้าแห้งไว',
    sunlightSchedule: 'รับแดดช่วงบ่าย 13:00 - 17:00 น. พร้อมลมพัดดี',
    sunlightDetail: 'รับแดดบ่ายทำให้ห้องไม่อับชื้น ฆ่าเชื้อโรคตามธรรมชาติ ระเบียงตากผ้าแห้งเร็วมาก ลมใต้พัดเข้าห้องช่วยระบายความร้อนได้เร็ว',
    windDetail: 'รับลมประจำฤดูต่อเนื่องหลายเดือน อากาศถ่ายเทคล่องตัว',
    livingAdvantage: 'ผ้าแห้งไว ห้องไม่อับชื้น ลมพัดระบายความร้อนได้รวดเร็ว',
    iconType: 'sun',
    badgeStyle: 'bg-orange-50 text-orange-800 border-orange-200'
  },
  'west': {
    key: 'west',
    name: 'ทิศตะวันตก',
    shortName: 'W',
    angle: 270,
    sunlightSummary: 'แดดบ่าย วิวพระอาทิตย์ตกสวย ห้องไม่อับชื้น',
    sunlightSchedule: 'รับแดดยามบ่าย 13:30 - 18:00 น. (วิว Sunset สวย)',
    sunlightDetail: 'แดดบ่ายฆ่าเชื้อโรคและไรฝุ่นตามธรรมชาติ ผึ่งผ้าแห้งสนิท ชมวิวพระอาทิตย์ตกยามเย็น (Sunset Skyline) จากระเบียงห้อง',
    windDetail: 'ลมพัดดีช่วงปลายฤดู แนะนำติดผ้าม่านกัน UV เพื่อควบคุมอุณหภูมิ',
    livingAdvantage: 'วิวพระอาทิตย์ตกสวยงาม ผ้าแห้งเร็ว ห้องปราศจากความชื้นสะสม',
    iconType: 'sun',
    badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200'
  },
  'northwest': {
    key: 'northwest',
    name: 'ทิศตะวันตกเฉียงเหนือ',
    shortName: 'NW',
    angle: 315,
    sunlightSummary: 'รับแดดบ่ายเฉียง ห้องโปร่งโล่งสบาย',
    sunlightSchedule: 'รับแดดบ่ายช่วงสั้น 14:30 - 17:30 น.',
    sunlightDetail: 'แดดบ่ายเฉียงไม่ร้อนจัดเท่าทิศตะวันตกตรงๆ วิวเมืองฝั่งตะวันตกเปิดกว้าง ไม่อึดอัด',
    windDetail: 'ลมระบายดี ได้รับทั้งลมหนาวและลมมรสุมตามช่วงฤดูกาล',
    livingAdvantage: 'วิวเมืองกว้าง ไม่อับชื้น ได้แสงแดดบ่ายพอเหมาะ',
    iconType: 'sun-moon',
    badgeStyle: 'bg-stone-100 text-stone-800 border-stone-200'
  }
};

export interface ViewTypeMetadata {
  key: string;
  name: string;
  icon: string;
  description: string;
  advantage: string;
  badgeStyle: string;
}

export const VIEW_TYPE_CONFIGS: Record<string, ViewTypeMetadata> = {
  'pool': {
    key: 'pool',
    name: 'วิวสระว่ายน้ำ',
    icon: '🏊',
    description: 'มองเห็นสระว่ายน้ำระบบเกลือและสวนหย่อมชั้น 8 ร่มรื่น สบายตา สไตล์รีสอร์ท',
    advantage: 'พักผ่อนสายตากับผืนน้ำสีฟ้าและสวนสีเขียว ร่มรื่น ให้ความรู้สึกสงบผ่อนคลายตลอดวัน',
    badgeStyle: 'bg-cyan-50 text-cyan-800 border-cyan-200'
  },
  'unblocked_city': {
    key: 'unblocked_city',
    name: 'วิวเมืองโล่ง ไม่บล็อก',
    icon: '🏙️',
    description: 'วิวเมืองเปิดโล่งพาโนรามา ไม่มีตึกสูงในระยะประชิดบังสายตา มองเห็นท้องฟ้ากว้างไกล',
    advantage: 'ความเป็นส่วนตัวสูง ไม่มีตึกตรงข้ามส่อง ลมโกรกถ่ายเทสะดวก ท้องฟ้าเปิดโล่ง',
    badgeStyle: 'bg-indigo-50 text-indigo-800 border-indigo-200'
  },
  'mrt': {
    key: 'mrt',
    name: 'วิวรถไฟฟ้า MRT ลำสาลี',
    icon: '🚇',
    description: 'มองเห็นสถานีและแนวรถไฟฟ้า MRT แยกลำสาลี (จุดตัดสายสีส้ม & สายสีเหลือง)',
    advantage: 'ซิตี้ไลฟ์ทันสมัย แสงสีเมืองยามค่ำคืนมีชีวิตชีวา ทำเลศูนย์กลางการเดินทาง',
    badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  'garden': {
    key: 'garden',
    name: 'วิวสวนหย่อม & คอร์ทใน',
    icon: '🌳',
    description: 'มองเห็นพื้นที่สวนพักผ่อนสีเขียวและต้นไม้ใหญ่ ร่มรื่นเป็นธรรมชาติ',
    advantage: 'เงียบสงบ ไร้เสียงรบกวน เหมาะแก่การพักผ่อนและอ่านหนังสือริมระเบียง',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  },
  'canal': {
    key: 'canal',
    name: 'วิวคลองแสนแสบ & ธรรมชาติ',
    icon: '⛵',
    description: 'วิวสายน้ำคลองแสนแสบฝั่งรามคำแหง และแนวต้นไม้ร่มรื่นตลอดแนวคลอง',
    advantage: 'บรรยากาศสบายตา วิวโล่ง ลมพัดผ่านจากแนวคลองธรรมชาติ',
    badgeStyle: 'bg-teal-50 text-teal-800 border-teal-200'
  }
};

/**
 * Normalizes user-entered direction text to a canonical metadata object
 */
export function resolveDirection(raw?: string): DirectionMetadata {
  if (!raw) return DIRECTION_CONFIGS['east']; // default to East (common best-seller)

  const text = raw.toLowerCase().trim();

  if (text.includes('เหนือ') && text.includes('ออก')) return DIRECTION_CONFIGS['northeast'];
  if (text.includes('เหนือ') && text.includes('ตก')) return DIRECTION_CONFIGS['northwest'];
  if (text.includes('ใต้') && text.includes('ออก')) return DIRECTION_CONFIGS['southeast'];
  if (text.includes('ใต้') && text.includes('ตก')) return DIRECTION_CONFIGS['southwest'];

  if (text.includes('เหนือ') || text === 'n' || text === 'north') return DIRECTION_CONFIGS['north'];
  if (text.includes('ใต้') || text === 's' || text === 'south') return DIRECTION_CONFIGS['south'];
  if (text.includes('ออก') || text === 'e' || text === 'east') return DIRECTION_CONFIGS['east'];
  if (text.includes('ตก') || text === 'w' || text === 'west') return DIRECTION_CONFIGS['west'];

  return DIRECTION_CONFIGS['east'];
}

/**
 * Normalizes view text or type into view metadata
 */
export function resolveViewType(viewTypeRaw?: string, roomDescription?: string, floor?: number | string): ViewTypeMetadata {
  const combined = `${viewTypeRaw || ''} ${roomDescription || ''}`.toLowerCase();

  if (combined.includes('สระ') || combined.includes('pool')) {
    return VIEW_TYPE_CONFIGS['pool'];
  }
  if (combined.includes('mrt') || combined.includes('รถไฟฟ้า') || combined.includes('ลำสาลี')) {
    return VIEW_TYPE_CONFIGS['mrt'];
  }
  if (combined.includes('สวน') || combined.includes('garden')) {
    return VIEW_TYPE_CONFIGS['garden'];
  }
  if (combined.includes('คลอง') || combined.includes('แสนแสบ') || combined.includes('canal') || combined.includes('แม่น้ำ')) {
    return VIEW_TYPE_CONFIGS['canal'];
  }

  // Default to unblocked city view (Bangkok Horizon is 37-39 storeys high, most units have great city views)
  return VIEW_TYPE_CONFIGS['unblocked_city'];
}

/**
 * Floor Height Level Evaluation
 */
export function getFloorLevelInsight(floorRaw?: number | string): {
  level: 'high' | 'mid' | 'low';
  title: string;
  badge: string;
  desc: string;
} {
  const floorNum = typeof floorRaw === 'number' ? floorRaw : parseInt(String(floorRaw || '10'), 10) || 10;

  if (floorNum >= 25) {
    return {
      level: 'high',
      title: 'High Floor (ชั้นสูงพาโนรามา)',
      badge: 'ชั้นสูง วิวพาโนรามา',
      desc: `ชั้น ${floorNum} อยู่ในโซนชั้นสูงของอาคาร ทัศนียภาพกว้างไกล ไร้ตึกสูงบดบัง อากาศปลอดโปร่ง ลมโกรกสบาย และปราศจากเสียงรบกวนจากท้องถนน`
    };
  } else if (floorNum >= 12) {
    return {
      level: 'mid',
      title: 'Mid Floor (ชั้นกลาง ทัศนียภาพสมดุล)',
      badge: 'ชั้นกลาง วิวโปร่งสบาย',
      desc: `ชั้น ${floorNum} ความสูงกำลังพอเหมาะ รอลิฟต์รวดเร็ว ทัศนียภาพโปร่งตา มองเห็นทั้งแนวเมืองและพื้นที่โดยรอบอย่างลงตัว`
    };
  } else {
    return {
      level: 'low',
      title: 'Low Floor (ใกล้ชิดธรรมชาติ & พื้นที่ส่วนกลาง)',
      badge: 'ชั้นต่ำ เข้าออกสะดวกรวดเร็ว',
      desc: `ชั้น ${floorNum} ใกล้เคียงกับสิ่งอำนวยความสะดวกส่วนกลางชั้น 8 (สระว่ายน้ำ ฟิตเนส สวนลอยฟ้า) สะดวกรวดเร็วในชั่วโมงเร่งด่วน`
    };
  }
}
