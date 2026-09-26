import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  FileText, 
  Lock, 
  Calendar, 
  Phone, 
  User, 
  FileCheck, 
  ExternalLink, 
  Upload, 
  Plus, 
  Clock, 
  DollarSign, 
  ShieldAlert, 
  CheckCircle2, 
  Download, 
  Printer, 
  KeyRound, 
  Share2,
  FolderOpen
} from 'lucide-react';
import { Room, Lease, BookingReceipt, AppSettings } from '../types';
import { calculateLeaseDaysAndStatus, openDocumentInNewTab } from '../services/apiService';
import { useLanguage } from '../context/LanguageContext';

interface RoomContractsVaultModalProps {
  room: Room | null;
  leases: Lease[];
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onOpenBookingReceipt: (room: Room) => void;
  onOpenHorizontalFlyer: (room: Room) => void;
  onEditRoom: (room: Room) => void;
  onSaveRoom: (room: Room) => void;
  onAddLeaseForRoom: (room: Room) => void;
  onOpenLeaseDetail?: (lease: Lease) => void;
  onNotify: (msg: string) => void;
}

export const RoomContractsVaultModal: React.FC<RoomContractsVaultModalProps> = ({
  room,
  leases,
  settings,
  isOpen,
  onClose,
  onOpenBookingReceipt,
  onOpenHorizontalFlyer,
  onEditRoom,
  onSaveRoom,
  onAddLeaseForRoom,
  onOpenLeaseDetail,
  onNotify
}) => {
  const { isTh } = useLanguage();
  const [activeTab, setActiveTab] = useState<'contracts' | 'owner' | 'staff_notes'>('contracts');
  const [staffNotesInput, setStaffNotesInput] = useState(room?.staffNotes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Update staff notes input when room changes
  React.useEffect(() => {
    if (room) {
      setStaffNotesInput(room.staffNotes || '');
    }
  }, [room]);

  if (!isOpen || !room) return null;

  // Find all leases belonging to this room (both current and historical)
  const roomLeases = leases.filter(l => 
    (l.roomId && l.roomId === room.id) || 
    (l.roomNumber && l.roomNumber.trim().toLowerCase() === room.roomNumber.trim().toLowerCase())
  );

  // Separate active lease vs expired leases
  const activeLease = roomLeases.find(l => {
    const { status } = calculateLeaseDaysAndStatus(l.endDate);
    return status !== 'expired' && l.status !== 'terminated';
  });

  const historicalLeases = roomLeases.filter(l => l !== activeLease);

  const handleSaveStaffNotes = () => {
    if (!room) return;
    setIsSavingNotes(true);
    const updated: Room = {
      ...room,
      staffNotes: staffNotesInput,
      updatedAt: new Date().toISOString()
    };
    onSaveRoom(updated);
    setIsSavingNotes(false);
    onNotify(isTh ? 'บันทึกโน้ตลับเฉพาะเจ้าหน้าที่เรียบร้อยแล้ว' : 'Private staff notes saved');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        id="room-contracts-vault-modal"
        className="bg-white/85 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/80 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-stone-900/90 backdrop-blur-xl text-stone-100 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-800/80 border border-stone-700/80 flex items-center justify-center text-amber-300 shadow-inner">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 font-mono">ห้องชุด</span>
                <span className="font-mono font-bold text-lg text-white tracking-wide">{room.roomNumber}</span>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                  room.isTrash
                    ? 'bg-rose-900/80 text-rose-200 border border-rose-700/50'
                    : room.status === 'rented'
                    ? 'bg-amber-900/80 text-amber-200 border border-amber-700/50'
                    : room.isPublished
                    ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-700/50'
                    : 'bg-stone-800/80 text-stone-300 border border-stone-700/50'
                }`}>
                  {room.isTrash 
                    ? (isTh ? 'ถังขยะ' : 'Trash') 
                    : room.status === 'rented'
                    ? (isTh ? 'ติดสัญญาเช่า' : 'Rented')
                    : room.isPublished
                    ? (isTh ? 'ออนไลน์' : 'Online')
                    : (isTh ? 'รอดำเนินการ / ร่าง' : 'Pending')}
                </span>
              </div>
              <div className="text-xs text-stone-300/80 font-light">
                {room.condoName} • ชั้น {room.floor} • {room.areaSqM} ตร.ม. • {room.bedrooms === 0 ? 'Studio' : `${room.bedrooms} ห้องนอน`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenBookingReceipt(room)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="ออกใบจองห้องชุดนี้ให้ลูกค้าทันที"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>{isTh ? 'ออกใบจองห้องนี้' : 'Book Unit'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/60 bg-white/60 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'contracts'
                ? 'border-stone-900 text-stone-900 bg-white rounded-t-lg'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4 text-stone-600" />
            <span>{isTh ? 'แฟ้มประวัติสัญญาเช่า' : 'Lease History'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 text-stone-700">
              {roomLeases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('owner')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'owner'
                ? 'border-stone-900 text-stone-900 bg-white rounded-t-lg'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <User className="w-4 h-4 text-stone-600" />
            <span>{isTh ? 'ข้อมูล & สัญญาเจ้าของห้อง' : 'Owner Agreement'}</span>
            {room.ownerContractDocUrl && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('staff_notes')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'staff_notes'
                ? 'border-stone-900 text-stone-900 bg-white rounded-t-lg'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-600" />
            <span>{isTh ? 'โน้ตลับเฉพาะเจ้าหน้าที่' : 'Staff Only Notes'}</span>
            {room.staffNotes && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-stone-800">
          
          {/* TAB 1: ALL LEASE CONTRACTS (CURRENT + EXPIRED ARCHIVES) */}
          {activeTab === 'contracts' && (
            <div className="space-y-6">
              
              {/* Header with Quick Add Lease Button */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <div>
                  <h3 className="font-display text-sm font-bold text-stone-900">
                    {isTh ? 'ประวัติสัญญาเช่าห้อง ' + room.roomNumber : `Lease Records for Unit ${room.roomNumber}`}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isTh 
                      ? 'รวมสัญญาเช่าปัจจุบันและสัญญาเช่าย้อนหลังทั้งหมดในอดีตของห้องนี้ พร้อมไฟล์สัญญา PDF'
                      : 'All active and archived expired lease contracts for this unit.'}
                  </p>
                </div>
                <button
                  onClick={() => onAddLeaseForRoom(room)}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isTh ? '+ เพิ่มสัญญาเช่าของห้องนี้' : '+ Add Lease'}</span>
                </button>
              </div>

              {/* CURRENT ACTIVE LEASE (IF ANY) */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    {isTh ? 'สัญญาเช่าปัจจุบัน (ผู้พักอาศัยปัจจุบัน)' : 'Current Active Lease'}
                  </h4>
                </div>

                {activeLease ? (
                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200/90 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900">{activeLease.tenantName}</span>
                          <span className="text-xs text-stone-500">({activeLease.tenantPhone})</span>
                        </div>
                        {activeLease.tenantIdCard && (
                          <div className="text-[11px] text-stone-500">
                            เลขบัตรประชาชน / Passport: {activeLease.tenantIdCard}
                          </div>
                        )}
                      </div>

                      {/* Expiration Status Badge */}
                      {(() => {
                        const { daysRemaining, status } = calculateLeaseDaysAndStatus(activeLease.endDate);
                        if (status === 'expiring_30') {
                          return (
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                              หมดสัญญาในอีก {daysRemaining} วัน (ด่วน)
                            </span>
                          );
                        } else if (status === 'expiring_60') {
                          return (
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              หมดสัญญาในอีก {daysRemaining} วัน
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            สัญญาปกติ (เหลือ {daysRemaining} วัน)
                          </span>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                      <div>
                        <span className="text-stone-500 block text-[11px]">เริ่มสัญญา:</span>
                        <span className="font-medium text-stone-800">{activeLease.startDate}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[11px]">สิ้นสุดสัญญา:</span>
                        <span className="font-bold text-stone-900">{activeLease.endDate}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[11px]">ค่าเช่าต่อเดือน:</span>
                        <span className="font-semibold text-stone-900">฿{activeLease.monthlyRent?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[11px]">เงินประกัน (Deposit):</span>
                        <span className="font-medium text-stone-800">฿{activeLease.depositAmount?.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Lease Contract File Attachment */}
                    <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                      {activeLease.contractUrl ? (
                        <button
                          type="button"
                          onClick={() => openDocumentInNewTab(activeLease.contractUrl)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          <span>เปิดดูไฟล์สัญญา PDF ของผู้เช่า</span>
                          <ExternalLink className="w-3 h-3 text-stone-400" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-stone-400 italic">
                          ยังไม่ได้แนบลิงก์เอกสารสัญญา
                        </span>
                      )}

                      {onOpenLeaseDetail && (
                        <button
                          onClick={() => onOpenLeaseDetail(activeLease)}
                          className="text-xs text-stone-700 hover:text-stone-900 font-medium underline"
                        >
                          แก้ไขสัญญาฉบับนี้
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-xl p-6 text-center border border-dashed border-stone-200">
                    <p className="text-xs text-stone-500">
                      ขณะนี้ห้องนี้ไม่มีสัญญาเช่าที่กำลังมีผล (ห้องว่างพร้อมปล่อยเช่า)
                    </p>
                  </div>
                )}
              </div>

              {/* HISTORICAL EXPIRED LEASES ARCHIVE */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    {isTh ? 'แฟ้มสัญญาเช่าเก่าที่หมดอายุไปแล้ว (Historical Contracts)' : 'Archived Expired Leases'}
                    <span className="ml-1.5 font-normal text-stone-500">({historicalLeases.length} ฉบับ)</span>
                  </h4>
                </div>

                {historicalLeases.length === 0 ? (
                  <div className="bg-stone-50 rounded-xl p-5 text-center border border-stone-200 text-xs text-stone-400">
                    ยังไม่มีประวัติสัญญาเก่าที่หมดอายุของห้องนี้
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {historicalLeases.map((l) => (
                      <div 
                        key={l.id}
                        className="bg-white rounded-xl p-3.5 border border-stone-200 hover:border-stone-300 transition-colors shadow-2xs space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900">{l.tenantName}</span>
                            <span className="text-[11px] text-stone-500">{l.tenantPhone}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                            หมดสัญญาแล้ว ({l.startDate} ถึง {l.endDate})
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px] text-stone-500">
                          <div>
                            ค่าเช่า: <span className="font-medium text-stone-700">฿{l.monthlyRent?.toLocaleString()}/ด.</span> • มัดจำ: ฿{l.depositAmount?.toLocaleString()}
                          </div>
                          {l.contractUrl ? (
                            <button
                              type="button"
                              onClick={() => openDocumentInNewTab(l.contractUrl)}
                              className="inline-flex items-center gap-1 text-xs text-stone-800 hover:text-stone-950 font-medium underline cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-stone-600" />
                              <span>เปิดดูสัญญาเก่า (PDF)</span>
                            </button>
                          ) : (
                            <span className="text-stone-400 italic">ไม่มีไฟล์แนบ</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: OWNER INFORMATION & OWNER AGREEMENT CONTRACT */}
          {activeTab === 'owner' && (
            <div className="space-y-4">
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-bold text-stone-900">
                    {isTh ? 'ข้อมูลเจ้าของห้องชุด (ผู้ฝากเช่า/ขาย)' : 'Owner Profile'}
                  </h4>
                  <button
                    onClick={() => onEditRoom(room)}
                    className="text-xs text-stone-700 hover:text-stone-950 font-medium underline"
                  >
                    แก้ไขข้อมูลเจ้าของ
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-500 block text-[11px]">ชื่อ-นามสกุล เจ้าของห้อง:</span>
                    <span className="font-semibold text-stone-900 text-sm">
                      {room.ownerName || (isTh ? '(ยังไม่ได้ระบุชื่อเจ้าของ)' : '(Not specified)')}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[11px]">เบอร์โทรศัพท์เจ้าของห้อง:</span>
                    {room.ownerPhone ? (
                      <a 
                        href={`tel:${room.ownerPhone}`} 
                        className="font-mono font-bold text-stone-900 hover:text-amber-700 flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-stone-500" />
                        <span>{room.ownerPhone}</span>
                      </a>
                    ) : (
                      <span className="text-stone-400 italic">ยังไม่ระบุเบอร์โทร</span>
                    )}
                  </div>
                </div>

                {room.ownerNotes && (
                  <div className="pt-2 border-t border-stone-200">
                    <span className="text-stone-500 block text-[11px] mb-0.5">เงื่อนไขจากเจ้าของห้อง:</span>
                    <p className="text-xs text-stone-700 bg-white p-2.5 rounded-lg border border-stone-200">
                      {room.ownerNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Owner Agreement Document / PDF */}
              <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-semibold text-xs text-stone-900">
                      {isTh ? 'เอกสารสัญญาแต่งตั้งตัวแทน / สัญญาฝากห้องชุด (Owner Agreement)' : 'Owner Agreement Document'}
                    </h4>
                  </div>
                </div>

                {room.ownerContractDocUrl ? (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <div>
                        <div className="font-medium text-xs text-stone-900">
                          {room.ownerContractDocName || `สัญญาฝากห้องชุด_${room.roomNumber}.pdf`}
                        </div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          {room.ownerContractDocUrl.substring(0, 55)}...
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openDocumentInNewTab(room.ownerContractDocUrl)}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isTh ? 'เปิดดูสัญญาฉบับเต็ม' : 'Open Document'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-stone-50 border border-dashed border-stone-200 rounded-lg text-center space-y-2">
                    <p className="text-xs text-stone-500">
                      {isTh 
                        ? 'ยังไม่ได้แนบสัญญาฝากเช่าของเจ้าของห้อง สามารถอัปโหลดหรือใส่ลิงก์ได้ที่ปุ่ม "แก้ไขห้อง"'
                        : 'No owner agreement document attached yet.'}
                    </p>
                    <button
                      onClick={() => onEditRoom(room)}
                      className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded text-xs"
                    >
                      + อัปโหลดสัญญาเจ้าของ
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRIVATE STAFF ONLY NOTES */}
          {activeTab === 'staff_notes' && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-xs">
                    {isTh ? 'พื้นที่บันทึกความลับเฉพาะเจ้าหน้าที่นิติบุคคล' : 'Confidential Staff Notes'}
                  </span>
                </div>
                <p className="text-xs text-stone-600">
                  {isTh
                    ? 'ข้อความในส่วนนี้จะไม่ถูกนำไปแสดงบนหน้าเว็บลูกค้าเด็ดขาด เหมาะสำหรับบันทึกรหัสผ่าน Digital Doorlock, จุดเก็บกุญแจห้อง, หรือข้อมูลติดต่อเฉพาะกิจ'
                    : 'These notes are confidential and will NEVER be shown on the public customer website.'}
                </p>

                <div>
                  <textarea
                    rows={6}
                    value={staffNotesInput}
                    onChange={(e) => setStaffNotesInput(e.target.value)}
                    placeholder="เช่น รหัส Digital Doorlock: 8899# / กุญแจสำรองอยู่ที่ตู้ชั้น 2 ช่อง B12 / เจ้าของขอให้เช็กแอร์ก่อนปล่อยเช่า"
                    className="w-full p-3 rounded-lg border border-amber-300/80 bg-white text-xs font-mono text-stone-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveStaffNotes}
                    disabled={isSavingNotes}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isSavingNotes ? 'กำลังบันทึก...' : (isTh ? 'บันทึกโน้ตเจ้าหน้าที่' : 'Save Notes')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Quick Actions */}
        <div className="px-5 py-3.5 bg-white/70 backdrop-blur-xl border-t border-white/60 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenHorizontalFlyer(room)}
              className="px-3.5 py-1.5 bg-white/80 hover:bg-white text-stone-800 border border-white/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer backdrop-blur-xs"
              title="สร้างใบเสนอห้องพักแนวนอนสำหรับส่งให้ลูกค้าทาง LINE / Facebook"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-600" />
              <span>{isTh ? 'ใบเสนอห้องแนวนอน (Flyer)' : 'Horizontal Flyer'}</span>
            </button>

            <button
              onClick={() => onEditRoom(room)}
              className="px-3.5 py-1.5 bg-white/80 hover:bg-white text-stone-800 border border-white/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer backdrop-blur-xs"
            >
              <span>{isTh ? 'แก้ไขข้อมูลห้อง' : 'Edit Unit'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/60 hover:bg-white/90 text-stone-800 border border-white/80 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer backdrop-blur-xs"
          >
            {isTh ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
