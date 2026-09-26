import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  User, 
  Phone, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Clock,
  UserCheck,
  Key,
  ShieldCheck,
  RotateCcw,
  Tag
} from 'lucide-react';
import { Room, BookingReceipt, AppSettings } from '../../types';

export const DEFAULT_BOOKING_TERMS = `1. ผู้จองตกลงชำระเงินมัดจำการจองเพื่อล็อคสิทธิ์ห้องชุดดังกล่าวข้างต้น
2. ผู้จองจะเข้าทำสัญญาเช่า/สัญญาจะซื้อจะขายอย่างเป็นทางการ พร้อมชำระเงินประกันสัญญา/เงินดาวน์ส่วนที่เหลือ ณ สำนักงานนิติบุคคลฯ ภายในวันที่กำหนด
3. เงินมัดจำการจองนี้จะถูกนำไปหักกับเงินประกันสัญญาเช่าในวันทำสัญญา`;

interface IssueBookingQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRooms: Room[]; // rooms that are 'available' or 'pending'
  preselectedRoom?: Room | null;
  settings: AppSettings;
  onSaveBooking: (booking: BookingReceipt, targetRoomId: string) => void;
  onNotify: (msg: string) => void;
}

export const IssueBookingQuickModal: React.FC<IssueBookingQuickModalProps> = ({
  isOpen,
  onClose,
  availableRooms,
  preselectedRoom,
  settings,
  onSaveBooking,
  onNotify
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // ราคาเช่า/ขายตกลง (เริ่มต้นเป็นราคาตามประกาศ แต่สามารถแก้ไขต่อรองได้)
  const [agreedPrice, setAgreedPrice] = useState<string>('');
  const [bookingFee, setBookingFee] = useState<string>('5000');
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash' | 'credit'>('transfer');
  const [contractSignDate, setContractSignDate] = useState('');
  
  // ข้อตกลงและเงื่อนไขการจอง (เริ่มต้นเป็นข้อความมาตรฐาน สามารถแก้ไขเพิ่มเติมได้)
  const [terms, setTerms] = useState<string>(DEFAULT_BOOKING_TERMS);
  
  // ตัวเลือกผู้รับเงิน: เจ้าหน้าที่นิติบุคคล, เจ้าของห้องชุด, หรือกำหนดเอง
  const [recipientType, setRecipientType] = useState<'juristic' | 'owner' | 'other'>('juristic');
  const [recipientName, setRecipientName] = useState<string>('');

  const [errors, setErrors] = useState<{ customerName?: string; customerPhone?: string; agreedPrice?: string; bookingFee?: string; room?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const initialRoom = preselectedRoom || (availableRooms.length > 0 ? availableRooms[0] : null);

    if (initialRoom) {
      setSelectedRoomId(initialRoom.id);
      const isSale = initialRoom.listingType === 'sale';
      const listedPrice = isSale ? (initialRoom.salePrice || 0) : (initialRoom.rentPrice || 0);
      setAgreedPrice(String(listedPrice || 10000));
      setBookingFee(String(isSale ? Math.min(50000, (listedPrice || 1000000) * 0.05) : Math.min(10000, (listedPrice || 10000) * 0.5)));
    } else {
      setSelectedRoomId('');
      setAgreedPrice('10000');
      setBookingFee('5000');
    }

    setCustomerName('');
    setCustomerPhone('');
    
    // Default sign date 7 days ahead
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setContractSignDate(nextWeek.toISOString().split('T')[0]);
    
    // ข้อตกลงมาตรฐาน
    setTerms(DEFAULT_BOOKING_TERMS);
    setErrors({});

    // ตั้งค่าผู้รับเงินเริ่มต้นเป็นเจ้าหน้าที่นิติบุคคล
    setRecipientType('juristic');
    setRecipientName(settings.agencyName || 'สำนักงานนิติบุคคล แบงค์คอก ฮอไรซอน ราม 60');
  }, [isOpen, preselectedRoom, availableRooms, settings.agencyName]);

  if (!isOpen) return null;

  const currentRoom = availableRooms.find(r => r.id === selectedRoomId) || preselectedRoom;
  const isSale = currentRoom?.listingType === 'sale';
  const listedPrice = isSale ? (currentRoom?.salePrice || 0) : (currentRoom?.rentPrice || 0);

  // เมื่อเปลี่ยนห้อง ให้อัปเดตราคาตามประกาศ และชื่อเจ้าของห้อง
  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = availableRooms.find(r => r.id === roomId);
    if (room) {
      const roomIsSale = room.listingType === 'sale';
      const price = roomIsSale ? (room.salePrice || 0) : (room.rentPrice || 0);
      setAgreedPrice(String(price));
      setBookingFee(String(roomIsSale ? Math.min(50000, price * 0.05) : Math.min(10000, price * 0.5)));
      
      if (recipientType === 'owner') {
        setRecipientName(room.ownerName ? `${room.ownerName} (เจ้าของห้อง)` : 'เจ้าของห้องชุด');
      }
    }
  };

  const handleSelectRecipientType = (type: 'juristic' | 'owner' | 'other') => {
    setRecipientType(type);
    if (type === 'juristic') {
      setRecipientName(settings.agencyName || 'สำนักงานนิติบุคคล แบงค์คอก ฮอไรซอน ราม 60');
    } else if (type === 'owner') {
      setRecipientName(currentRoom?.ownerName ? `${currentRoom.ownerName} (เจ้าของห้อง)` : 'เจ้าของห้องชุด');
    } else {
      setRecipientName('');
    }
  };

  const handleResetPriceToListed = () => {
    if (listedPrice) {
      setAgreedPrice(String(listedPrice));
      if (errors.agreedPrice) setErrors(prev => ({ ...prev, agreedPrice: undefined }));
    }
  };

  const handleResetTerms = () => {
    setTerms(DEFAULT_BOOKING_TERMS);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { customerName?: string; customerPhone?: string; agreedPrice?: string; bookingFee?: string; room?: string } = {};

    if (!selectedRoomId) {
      newErrors.room = 'กรุณาเลือกห้องชุดที่จะออกใบจอง';
    }
    if (!customerName.trim()) {
      newErrors.customerName = 'กรุณากรอกชื่อลูกค้า';
    }
    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'กรุณากรอกเบอร์โทรศัพท์';
    }
    const finalPriceNum = parseFloat(agreedPrice);
    if (!agreedPrice || isNaN(finalPriceNum) || finalPriceNum <= 0) {
      newErrors.agreedPrice = 'กรุณาระบุราคาค่าเช่า/ราคาขายที่ตกลง';
    }
    const bookingAmountNum = parseFloat(bookingFee);
    if (!bookingFee || isNaN(bookingAmountNum) || bookingAmountNum <= 0) {
      newErrors.bookingFee = 'กรุณาระบุยอดเงินจอง';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const price = finalPriceNum || listedPrice || 10000;
    const receiptNum = `BK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const resolvedRecipientName = recipientName.trim() || (
      recipientType === 'owner' 
        ? (currentRoom?.ownerName ? `${currentRoom.ownerName} (เจ้าของห้อง)` : 'เจ้าของห้องชุด')
        : (settings.agencyName || 'สำนักงานนิติบุคคล แบงค์คอก ฮอไรซอน ราม 60')
    );

    // Remaining Deposit = (rent 2 months or sale 10%) - booking amount
    const remainingDeposit = Math.max(0, (isSale ? price * 0.1 : price * 2) - bookingAmountNum);

    const newReceipt: BookingReceipt = {
      id: `bk-${Date.now()}`,
      receiptNumber: receiptNum,
      bookingDate: new Date().toISOString().split('T')[0],
      roomId: currentRoom?.id || selectedRoomId,
      roomNumber: currentRoom?.roomNumber || '-',
      condoName: currentRoom?.condoName || 'Bangkok Horizon Ram 60',
      bookingType: isSale ? 'sale' : 'rent',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      price: price,
      bookingAmount: bookingAmountNum,
      paymentMethod: paymentMethod,
      contractSignDate: contractSignDate || new Date().toISOString().split('T')[0],
      remainingDeposit: remainingDeposit,
      recipientType: recipientType,
      recipientName: resolvedRecipientName,
      agentName: resolvedRecipientName,
      terms: terms.trim() || DEFAULT_BOOKING_TERMS,
      createdAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    setTimeout(() => {
      onSaveBooking(newReceipt, selectedRoomId);
      onNotify(`ออกใบจอง ${receiptNum} ห้อง ${currentRoom?.roomNumber} สำเร็จ และเปลี่ยนสถานะห้องเป็น "รอดำเนินการ" เรียบร้อยแล้ว`);
      setIsSubmitting(false);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-700/80 flex items-center justify-center text-white">
              <FileText className="w-4 h-4 text-amber-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">ออกใบเสร็จรับเงินจองห้องชุด</h3>
              <p className="text-amber-100 text-xs">จองสิทธิ์ห้องชุด ล็อคห้อง และออกใบเสร็จทางการ A4</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-100 hover:text-white hover:bg-amber-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          
          {/* 1. Target Room Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-stone-600" />
              <span>1. เลือกห้องชุดที่ต้องการจอง</span>
              <span className="text-rose-600">*</span>
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => handleRoomChange(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-sm border ${
                errors.room ? 'border-rose-500 bg-rose-50' : 'border-stone-300 bg-white'
              } focus:ring-2 focus:ring-stone-900 focus:outline-none`}
            >
              <option value="">-- กรุณาเลือกห้องชุด --</option>
              {preselectedRoom && !availableRooms.some(r => r.id === preselectedRoom.id) && (
                <option value={preselectedRoom.id}>
                  ห้อง {preselectedRoom.roomNumber} - ชั้น {preselectedRoom.floor} ({preselectedRoom.bedrooms} นอน, {preselectedRoom.areaSqM} ตร.ม.) - ฿{(preselectedRoom.rentPrice || preselectedRoom.salePrice || 0).toLocaleString()} {preselectedRoom.ownerName ? `[เจ้าของ: ${preselectedRoom.ownerName}]` : ''}
                </option>
              )}
              {availableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  ห้อง {room.roomNumber} - ชั้น {room.floor} ({room.bedrooms} นอน, {room.areaSqM} ตร.ม.) - ฿{(room.rentPrice || room.salePrice || 0).toLocaleString()} {room.ownerName ? `[เจ้าของ: ${room.ownerName}]` : ''}
                </option>
              ))}
            </select>
            {errors.room && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.room}</p>}

            {currentRoom && (
              <div className="mt-2 p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                <span>
                  ห้อง: <strong className="text-stone-900 font-mono">{currentRoom.roomNumber}</strong> ({currentRoom.bedrooms} นอน, {currentRoom.areaSqM} ตร.ม.)
                  {currentRoom.ownerName && <span className="ml-1 text-stone-500">| เจ้าของ: {currentRoom.ownerName}</span>}
                </span>
                <span className="text-stone-500">
                  ราคาตามประกาศ: <strong className="font-bold text-stone-800 font-mono">฿{listedPrice.toLocaleString()}</strong> {isSale ? 'บาท' : 'บ./ด.'}
                </span>
              </div>
            )}
          </div>

          {/* 2. Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-600" />
                <span>2. ชื่อ-นามสกุล ผู้จอง</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (errors.customerName) setErrors(prev => ({ ...prev, customerName: undefined }));
                }}
                placeholder=""
                className={`w-full px-3 py-2 rounded-xl text-sm border ${
                  errors.customerName ? 'border-rose-500 bg-rose-50' : 'border-stone-300 bg-white'
                } focus:ring-2 focus:ring-stone-900 focus:outline-none`}
              />
              {errors.customerName && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.customerName}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-stone-600" />
                <span>เบอร์โทรศัพท์ติดต่อ</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  if (errors.customerPhone) setErrors(prev => ({ ...prev, customerPhone: undefined }));
                }}
                placeholder=""
                className={`w-full px-3 py-2 rounded-xl text-sm border ${
                  errors.customerPhone ? 'border-rose-500 bg-rose-50' : 'border-stone-300 bg-white'
                } focus:ring-2 focus:ring-stone-900 focus:outline-none`}
              />
              {errors.customerPhone && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.customerPhone}</p>}
            </div>
          </div>

          {/* 3. Pricing Section: Agreed Rental Price (ราคาเช่าตกลง) + Booking Fee (ยอดเงินจอง) */}
          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* ราคาเช่าตกลง / ราคาขายตกลง (แก้ไขได้หากมีการต่อรองราคา) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-700" />
                    <span>3. ราคาเช่าตกลง {isSale ? '(หรือราคาขาย)' : '(บาท/เดือน)'}</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  {listedPrice > 0 && parseFloat(agreedPrice) !== listedPrice && (
                    <button
                      type="button"
                      onClick={handleResetPriceToListed}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
                    >
                      ใช้ราคาประกาศ ({listedPrice.toLocaleString()})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={agreedPrice}
                    onChange={(e) => {
                      setAgreedPrice(e.target.value);
                      if (errors.agreedPrice) setErrors(prev => ({ ...prev, agreedPrice: undefined }));
                    }}
                    placeholder=""
                    className={`w-full px-3 py-2 rounded-xl text-sm font-bold border ${
                      errors.agreedPrice ? 'border-rose-500 bg-rose-50' : 'border-amber-300 bg-white'
                    } font-mono text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none`}
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-stone-500 font-semibold">
                    {isSale ? 'บาท' : 'บ./ด.'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  * ปรับแก้ได้หากต่อรองราคา (ประกาศไว้: ฿{listedPrice.toLocaleString()})
                </p>
                {errors.agreedPrice && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.agreedPrice}</p>}
              </div>

              {/* ยอดเงินจอง (Booking Fee) */}
              <div>
                <label className="block text-xs font-bold text-stone-900 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                  <span>ยอดเงินมัดจำการจอง (Booking Fee)</span>
                  <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={bookingFee}
                    onChange={(e) => {
                      setBookingFee(e.target.value);
                      if (errors.bookingFee) setErrors(prev => ({ ...prev, bookingFee: undefined }));
                    }}
                    placeholder=""
                    className={`w-full px-3 py-2 rounded-xl text-sm font-bold border ${
                      errors.bookingFee ? 'border-rose-500 bg-rose-50' : 'border-amber-300 bg-white'
                    } font-mono text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none`}
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-stone-500 font-semibold">บาท</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  * จะนำไปหักกับเงินประกันสัญญาในวันทำสัญญา
                </p>
                {errors.bookingFee && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.bookingFee}</p>}
              </div>

            </div>

            {/* Quick Math Preview */}
            {parseFloat(agreedPrice) > 0 && parseFloat(bookingFee) > 0 && (
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-950 font-medium">
                <span>
                  เงินประกันสัญญาคงเหลือที่จะต้องชำระในวันทำสัญญา (โดยประมาณ):
                </span>
                <span className="font-mono font-bold text-amber-900 text-sm">
                  ฿{Math.max(0, (isSale ? parseFloat(agreedPrice) * 0.1 : parseFloat(agreedPrice) * 2) - parseFloat(bookingFee)).toLocaleString()} บาท
                </span>
              </div>
            )}
          </div>

          {/* 4. ผู้รับเงินมัดจำ (Payee / Recipient) - เจ้าหน้าที่นิติ หรือ เจ้าของห้อง */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>4. ผู้รับเงินมัดจำ (Payee)</span>
                <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-stone-500 font-normal">นิติบุคคล หรือ เจ้าของห้อง</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              <button
                type="button"
                onClick={() => handleSelectRecipientType('juristic')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                  recipientType === 'juristic'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                <span>🏢 เจ้าหน้าที่นิติ</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRecipientType('owner')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                  recipientType === 'owner'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                <span>🔑 เจ้าของห้อง</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRecipientType('other')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                  recipientType === 'other'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                <span>✏️ กำหนดเอง</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-stone-600 mb-1 font-medium">
                {recipientType === 'juristic' && 'ชื่อผู้รับเงิน / สำนักงานนิติบุคคล:'}
                {recipientType === 'owner' && 'ชื่อเจ้าของห้องชุดผู้รับเงิน:'}
                {recipientType === 'other' && 'ระบุชื่อผู้รับเงิน / บริษัท:'}
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder=""
                className="w-full px-3 py-2 rounded-lg text-xs border border-stone-300 bg-white font-medium focus:ring-2 focus:ring-stone-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method & Sign Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                วิธีชำระเงิน
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-stone-300 bg-white focus:outline-none"
              >
                <option value="transfer">โอนเงินผ่านธนาคาร</option>
                <option value="cash">เงินสด</option>
                <option value="credit">บัตรเครดิต</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                วันนัดทำสัญญา
              </label>
              <input
                type="date"
                value={contractSignDate}
                onChange={(e) => setContractSignDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-stone-300 bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* 5. ข้อตกลงและเงื่อนไขการจองห้องชุด (Terms & Conditions) */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
                <span>5. ข้อตกลงและเงื่อนไขการจอง (Terms & Conditions)</span>
              </label>
              {terms !== DEFAULT_BOOKING_TERMS && (
                <button
                  type="button"
                  onClick={handleResetTerms}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                  title="คืนค่าข้อความเริ่มต้นตามมาตรฐาน"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>คืนค่าเริ่มต้น</span>
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder=""
              className="w-full p-2.5 rounded-lg border border-stone-300 bg-white text-xs text-stone-700 leading-relaxed font-sans focus:ring-2 focus:ring-stone-900 focus:outline-none"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              * ข้อความเริ่มต้นตามมาตรฐานนิติบุคคล สามารถแก้ไขหรือเพิ่มข้อตกลงเฉพาะห้องได้ตามสะดวก
            </p>
          </div>

          {/* Quick Notice Badge */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              เมื่อกด <strong>&quot;บันทึกและออกใบจอง&quot;</strong> ระบบจะล็อคห้องชุดนี้ และเปลี่ยนสถานะห้องเป็น <strong>&quot;รอดำเนินการ&quot;</strong> ในแดชบอร์ดทันที พร้อมออกใบเสร็จรับเงินมัดจำขนาด A4
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังบันทึกและออกใบจอง...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>บันทึกและออกใบจอง</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
