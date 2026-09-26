/**
 * ==========================================================================
 * Bangkok Horizon Ram 60 - Google Apps Script Backend (API + Auto Setup Database & Drive)
 * ==========================================================================
 * 
 * คุณสมบัติเด่น:
 * 1. ระบบสร้างโฟลเดอร์ Google Drive ("BangkokHorizonRam60_Storage") อัตโนมัติในคลิกเดียว
 * 2. ระบบสร้างไฟล์ Google Sheet ("BangkokHorizonRam60_Database") พร้อมสร้างแท็บและหัวตารางอัตโนมัติ
 * 3. ไม่ต้องกรอก Folder ID หรือ Sheet ID เอง ระบบจำค่าใน ScriptProperties ให้อัตโนมัติ!
 * 4. รองรับการอัปโหลดรูปภาพและไฟล์สัญญาเช่าลง Google Drive โดยตรง
 * 5. รองรับ CORS และ JSON API ให้ Frontend เรียกใช้งานได้ 100%
 */

const FOLDER_NAME = "BangkokHorizonRam60_Storage";
const SPREADSHEET_NAME = "BangkokHorizonRam60_Database";

// --------------------------------------------------------------------------
// 1. WEB APP ENTRY POINTS (GET / POST)
// --------------------------------------------------------------------------

function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  try {
    var params = {};
    if (e && e.parameter) {
      params = e.parameter;
    }
    
    // Parse JSON body for POST if available
    var postData = null;
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {
        // Fallback for form-encoded
        postData = e.parameter;
      }
    }

    var payload = postData || params;
    var action = payload.action || params.action || "ping";

    var result = {};

    switch (action) {
      case "ping":
      case "status":
        result = getSystemStatus();
        break;

      case "setup":
        result = setupProject();
        break;

      case "getRooms":
        result = { success: true, data: getRoomsData() };
        break;

      case "saveRoom":
        result = saveRoomData(payload.room);
        break;

      case "deleteRoom":
        result = deleteRoomData(payload.id);
        break;

      case "getLeases":
        result = { success: true, data: getLeasesData() };
        break;

      case "saveLease":
        result = saveLeaseData(payload.lease);
        break;

      case "deleteLease":
        result = deleteLeaseData(payload.id);
        break;

      case "getBookings":
        result = { success: true, data: getBookingsData() };
        break;

      case "saveBooking":
        result = saveBookingData(payload.booking);
        break;

      case "uploadFile":
        result = uploadFileToDrive(payload.base64Data, payload.fileName, payload.mimeType, payload.roomNumber, payload.subfolderType);
        break;

      case "getRoomFolder":
        var f = getOrCreateRoomFolder(payload.roomNumber, payload.subfolderType);
        result = {
          success: true,
          folderName: f.getName(),
          folderUrl: f.getUrl()
        };
        break;

      case "syncAll":
        result = {
          success: true,
          rooms: getRoomsData(),
          leases: getLeasesData(),
          bookings: getBookingsData(),
          settings: getSettingsData()
        };
        break;

      case "getSettings":
        result = {
          success: true,
          settings: getSettingsData()
        };
        break;

      case "saveSettings":
        result = saveSettingsData(payload.settings);
        break;

      default:
        result = { success: false, error: "Action not recognized: " + action };
        break;
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --------------------------------------------------------------------------
// 2. AUTO-SETUP: สร้าง GOOGLE DRIVE FOLDER & GOOGLE SHEET อัตโนมัติ 100%
// --------------------------------------------------------------------------

function setupProject() {
  var scriptProperties = PropertiesService.getScriptProperties();
  
  // 1. ตรวจสอบหรือสร้าง Google Drive Folder
  var folder = getOrCreateFolder(FOLDER_NAME);
  var folderId = folder.getId();
  var folderUrl = folder.getUrl();
  scriptProperties.setProperty("FOLDER_ID", folderId);

  // 2. ตรวจสอบหรือสร้าง Google Sheet ภายในโฟลเดอร์นั้น
  var spreadsheet = getOrCreateSpreadsheet(folder, SPREADSHEET_NAME);
  var spreadsheetId = spreadsheet.getId();
  var spreadsheetUrl = spreadsheet.getUrl();
  scriptProperties.setProperty("SPREADSHEET_ID", spreadsheetId);

  // 3. กำหนดโครงสร้างแท็บและหัวตาราง
  initSheetTabs(spreadsheet);

  return {
    success: true,
    message: "ตั้งค่าระบบสำเร็จ! สร้าง Google Drive Folder และ Google Sheet ให้เรียบร้อยแล้ว",
    folderId: folderId,
    folderUrl: folderUrl,
    spreadsheetId: spreadsheetId,
    spreadsheetUrl: spreadsheetUrl
  };
}

function getSystemStatus() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var folderId = props.FOLDER_ID;
  var spreadsheetId = props.SPREADSHEET_ID;

  var status = {
    success: true,
    configured: false,
    folderId: folderId || null,
    spreadsheetId: spreadsheetId || null,
    message: "Google Apps Script Backend พร้อมใช้งาน"
  };

  if (folderId && spreadsheetId) {
    try {
      var sheet = SpreadsheetApp.openById(spreadsheetId);
      status.configured = true;
      status.spreadsheetUrl = sheet.getUrl();
      status.spreadsheetName = sheet.getName();
    } catch (e) {
      status.configured = false;
      status.note = "ยังไม่พบ Spreadsheet หรือยังไม่ได้รัน setupProject()";
    }
  }

  return status;
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newFolder = DriveApp.createFolder(folderName);
  // ตั้งสิทธิ์ให้อ่านไฟล์ภาพได้สำหรับผู้ที่มีลิงก์ (เพื่อให้ภาพโชว์บนหน้าเว็บ)
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

function getOrCreateSpreadsheet(folder, sheetName) {
  var files = folder.getFilesByName(sheetName);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  // ถ้าไม่มี ให้สร้างใหม่
  var ss = SpreadsheetApp.create(sheetName);
  var file = DriveApp.getFileById(ss.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  return ss;
}

function initSheetTabs(ss) {
  // แท็บ 1: Rooms (ข้อมูลห้อง)
  var roomHeaders = [
    "ID", "RoomNumber", "CondoName", "ListingType", "RentPrice", "SalePrice",
    "SizeCategory", "AreaSqM", "Floor", "Building", "Bedrooms", "Bathrooms",
    "FacingDirection", "Status", "Description", "Highlights", "Amenities",
    "Images", "FloorPlanImage", "ContactName", "ContactPhone", "ContactLine",
    "CreatedAt", "UpdatedAt"
  ];
  ensureSheetWithHeaders(ss, "Rooms", roomHeaders);

  // แท็บ 2: Leases (สัญญาเช่าและผู้เช่า)
  var leaseHeaders = [
    "ID", "RoomID", "RoomNumber", "CondoName", "TenantName", "TenantPhone",
    "TenantEmail", "TenantIdCard", "StartDate", "EndDate", "MonthlyRent",
    "DepositAmount", "AdvanceRent", "Status", "ContractUrl", "Notes", "UpdatedAt"
  ];
  ensureSheetWithHeaders(ss, "Leases", leaseHeaders);

  // แท็บ 3: Bookings (ใบจองห้อง)
  var bookingHeaders = [
    "ID", "ReceiptNumber", "BookingDate", "RoomID", "RoomNumber", "CondoName",
    "BookingType", "CustomerName", "CustomerPhone", "CustomerEmail", "CustomerIdCard",
    "Price", "BookingAmount", "PaymentMethod", "ContractSignDate", "RemainingDeposit",
    "AgentName", "Terms", "CreatedAt"
  ];
  ensureSheetWithHeaders(ss, "Bookings", bookingHeaders);

  // แท็บ 4: Settings (การตั้งค่าระบบและรหัสผ่านแอดมิน)
  var settingsHeaders = ["Key", "Value", "Description", "UpdatedAt"];
  var settingsSheet = ensureSheetWithHeaders(ss, "Settings", settingsHeaders);
  if (settingsSheet.getLastRow() <= 1) {
    var nowStr = new Date().toISOString();
    settingsSheet.appendRow(["adminPassword", "7014", "รหัสผ่าน / PIN เจ้าหน้าที่สำหรับเข้าสู่ระบบ", nowStr]);
    settingsSheet.appendRow(["adminEmail", "nitibangkok.horizon@gmail.com", "อีเมลเจ้าหน้าที่แอดมิน", nowStr]);
    settingsSheet.appendRow(["agencyName", "Bangkok Horizon Ram 60 (นิติบุคคลอาคารชุด)", "ชื่อโครงการหรือหน่วยงาน", nowStr]);
    settingsSheet.appendRow(["defaultContactPhone", "02-735-6060", "เบอร์โทรศัพท์ติดต่อ", nowStr]);
    settingsSheet.appendRow(["defaultContactLine", "@052adooe", "LINE Official Account", nowStr]);
  }

  // ลบ Sheet1 เริ่มต้นถ้ามี
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }
}

function ensureSheetWithHeaders(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    // ตกแต่ง Header สวยงาม
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setBackground("#1e293b");
    range.setFontColor("#ffffff");
    range.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getDatabaseSpreadsheet() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var spreadsheetId = props.SPREADSHEET_ID;
  if (!spreadsheetId) {
    // ถ้าระบบยังไม่เคยรัน setupProject ให้รันอัตโนมัติทันที
    var setupRes = setupProject();
    spreadsheetId = setupRes.spreadsheetId;
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

// --------------------------------------------------------------------------
// 3. ROOMS CRUD
// --------------------------------------------------------------------------

function getRoomsData() {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName("Rooms");
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rooms = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    rooms.push({
      id: String(row[0]),
      roomNumber: String(row[1] || ""),
      condoName: String(row[2] || ""),
      listingType: String(row[3] || "rent"),
      rentPrice: Number(row[4]) || 0,
      salePrice: Number(row[5]) || 0,
      sizeCategory: String(row[6] || "small"),
      areaSqM: Number(row[7]) || 0,
      floor: row[8] || "",
      building: String(row[9] || ""),
      bedrooms: Number(row[10]) || 0,
      bathrooms: Number(row[11]) || 1,
      facingDirection: String(row[12] || ""),
      status: String(row[13] || "available"),
      description: String(row[14] || ""),
      highlights: safeJsonParse(row[15], []),
      amenities: safeJsonParse(row[16], []),
      images: safeJsonParse(row[17], []),
      floorPlanImage: String(row[18] || ""),
      contactName: String(row[19] || ""),
      contactPhone: String(row[20] || ""),
      contactLine: String(row[21] || ""),
      createdAt: String(row[22] || ""),
      updatedAt: String(row[23] || "")
    });
  }
  return rooms;
}

function saveRoomData(room) {
  if (!room || !room.id) return { success: false, error: "Missing room data or ID" };
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName("Rooms");
  
  var rowData = [
    room.id,
    room.roomNumber || "",
    room.condoName || "",
    room.listingType || "rent",
    room.rentPrice || 0,
    room.salePrice || 0,
    room.sizeCategory || "small",
    room.areaSqM || 0,
    room.floor || "",
    room.building || "",
    room.bedrooms || 0,
    room.bathrooms || 1,
    room.facingDirection || "",
    room.status || "available",
    room.description || "",
    JSON.stringify(room.highlights || []),
    JSON.stringify(room.amenities || []),
    JSON.stringify(room.images || []),
    room.floorPlanImage || "",
    room.contactName || "",
    room.contactPhone || "",
    room.contactLine || "",
    room.createdAt || new Date().toISOString(),
    new Date().toISOString()
  ];

  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(room.id)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return { success: true, room: room };
}

function deleteRoomData(id) {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName("Rooms");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, deletedId: id };
    }
  }
  return { success: false, error: "Room not found" };
}

// --------------------------------------------------------------------------
// 4. LEASES CRUD (สัญญาเช่า & ผู้เช่า)
// --------------------------------------------------------------------------

function getLeasesData() {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName("Leases");
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var data = sheet.getDataRange().getValues();
  var leases = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    leases.push({
      id: String(row[0]),
      roomId: String(row[1] || ""),
      roomNumber: String(row[2] || ""),
      condoName: String(row[3] || ""),
      tenantName: String(row[4] || ""),
      tenantPhone: String(row[5] || ""),
      tenantEmail: String(row[6] || ""),
      tenantIdCard: String(row[7] || ""),
      startDate: formatDate(row[8]),
      endDate: formatDate(row[9]),
      monthlyRent: Number(row[10]) || 0,
      depositAmount: Number(row[11]) || 0,
      advanceRent: Number(row[12]) || 0,
      status: String(row[13] || "active"),
      contractUrl: String(row[14] || ""),
      notes: String(row[15] || ""),
      updatedAt: String(row[16] || "")
    });
  }
  return leases;
}

function saveLeaseData(lease) {
  if (!lease || !lease.id) return { success: false, error: "Missing lease data" };
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName("Leases");

  var rowData = [
    lease.id,
    lease.roomId || "",
    lease.roomNumber || "",
    lease.condoName || "",
    lease.tenantName || "",
    lease.tenantPhone || "",
    lease.tenantEmail || "",
    lease.tenantIdCard || "",
    lease.startDate || "",
    lease.endDate || "",
    lease.monthlyRent || 0,
    lease.depositAmount || 0,
    lease.advanceRent || 0,
    lease.status || "active",
    lease.contractUrl || "",
    lease.notes || "",
    new Date().toISOString()
  ];

  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(lease.id)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  // ปรับสถานะห้องที่เกี่ยวข้องอัตโนมัติให้เป็น 'rented' ถ้าสัญญากำลัง Active
  if (lease.roomId) {
    try {
      updateRoomStatusForLease(lease.roomId, lease.status === "active" ? "rented" : "available");
    } catch(e) {}
  }

  return { success: true, lease: lease };
}

function deleteLeaseData(id) {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName("Leases");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, deletedId: id };
    }
  }
  return { success: false, error: "Lease not found" };
}

function updateRoomStatusForLease(roomId, newStatus) {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName("Rooms");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(roomId)) {
      sheet.getRange(i + 1, 14).setValue(newStatus);
      break;
    }
  }
}

// --------------------------------------------------------------------------
// 5. BOOKINGS CRUD (ใบจองห้อง)
// --------------------------------------------------------------------------

function getBookingsData() {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName("Bookings");
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var data = sheet.getDataRange().getValues();
  var bookings = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    bookings.push({
      id: String(row[0]),
      receiptNumber: String(row[1] || ""),
      bookingDate: formatDate(row[2]),
      roomId: String(row[3] || ""),
      roomNumber: String(row[4] || ""),
      condoName: String(row[5] || ""),
      bookingType: String(row[6] || "rent"),
      customerName: String(row[7] || ""),
      customerPhone: String(row[8] || ""),
      customerEmail: String(row[9] || ""),
      customerIdCard: String(row[10] || ""),
      price: Number(row[11]) || 0,
      bookingAmount: Number(row[12]) || 0,
      paymentMethod: String(row[13] || "transfer"),
      contractSignDate: formatDate(row[14]),
      remainingDeposit: Number(row[15]) || 0,
      agentName: String(row[16] || ""),
      terms: String(row[17] || ""),
      createdAt: String(row[18] || "")
    });
  }
  return bookings;
}

function saveBookingData(booking) {
  if (!booking || !booking.id) return { success: false, error: "Missing booking data" };
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName("Bookings");

  var rowData = [
    booking.id,
    booking.receiptNumber || "",
    booking.bookingDate || "",
    booking.roomId || "",
    booking.roomNumber || "",
    booking.condoName || "",
    booking.bookingType || "rent",
    booking.customerName || "",
    booking.customerPhone || "",
    booking.customerEmail || "",
    booking.customerIdCard || "",
    booking.price || 0,
    booking.bookingAmount || 0,
    booking.paymentMethod || "transfer",
    booking.contractSignDate || "",
    booking.remainingDeposit || 0,
    booking.agentName || "",
    booking.terms || "",
    booking.createdAt || new Date().toISOString()
  ];

  sheet.appendRow(rowData);

  // ปรับสถานะห้องเป็น reserved
  if (booking.roomId) {
    try {
      updateRoomStatusForLease(booking.roomId, "reserved");
    } catch(e) {}
  }

  return { success: true, booking: booking };
}

// --------------------------------------------------------------------------
// 5.1 APP SETTINGS (ADMIN PASSWORD, EMAIL, SYSTEM CONFIG)
// --------------------------------------------------------------------------

function getSettingsData() {
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) {
    initSheetTabs(ss);
    sheet = ss.getSheetByName("Settings");
  }

  var data = sheet.getDataRange().getValues();
  var settings = {
    adminPassword: "7014",
    adminEmail: "nitibangkok.horizon@gmail.com",
    agencyName: "Bangkok Horizon Ram 60 (นิติบุคคลอาคารชุด)",
    defaultContactPhone: "02-735-6060",
    defaultContactLine: "@052adooe"
  };

  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0] || "").trim();
    var val = data[i][1];
    if (key) {
      if (key === "heroBackgroundImages") {
        settings[key] = safeJsonParse(val, []);
      } else {
        settings[key] = String(val !== undefined && val !== null ? val : "");
      }
    }
  }

  return settings;
}

function saveSettingsData(newSettings) {
  if (!newSettings) return { success: false, error: "No settings provided" };
  var ss = getDatabaseSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) {
    initSheetTabs(ss);
    sheet = ss.getSheetByName("Settings");
  }

  var data = sheet.getDataRange().getValues();
  var keyRowMap = {};
  for (var i = 1; i < data.length; i++) {
    var k = String(data[i][0] || "").trim();
    if (k) keyRowMap[k] = i + 1; // 1-indexed row in sheet
  }

  var nowStr = new Date().toISOString();
  var keys = Object.keys(newSettings);

  for (var j = 0; j < keys.length; j++) {
    var key = keys[j];
    if (key === "googleWebAppUrl") continue; // อย่าเซฟ URL ตัวเองซ้ำ
    var value = newSettings[key];
    if (Array.isArray(value) || typeof value === "object") {
      value = JSON.stringify(value);
    } else {
      value = String(value || "");
    }

    if (keyRowMap[key]) {
      // อัปเดตแถวเดิม
      var rowIndex = keyRowMap[key];
      sheet.getRange(rowIndex, 2).setValue(value);
      sheet.getRange(rowIndex, 4).setValue(nowStr);
    } else {
      // เพิ่มแถวใหม่
      sheet.appendRow([key, value, "ตั้งค่าผ่าน Admin Portal", nowStr]);
      keyRowMap[key] = sheet.getLastRow();
    }
  }

  return { success: true, settings: getSettingsData(), message: "บันทึกการตั้งค่าลง Google Sheet สำเร็จ" };
}

// --------------------------------------------------------------------------
// 6. UPLOAD FILE TO GOOGLE DRIVE WITH AUTOMATIC PER-ROOM FOLDER STRUCTURE
// --------------------------------------------------------------------------

/**
 * ค้นหาหรือสร้างโฟลเดอร์แยกตามเลขห้องอัตโนมัติใน Google Drive
 * เช่น: BangkokHorizonRam60_Storage / ห้อง_B-1905 / สัญญา_Contracts
 */
function getOrCreateRoomFolder(roomNumber, subfolderType) {
  var props = PropertiesService.getScriptProperties().getProperties();
  var rootFolderId = props.FOLDER_ID;
  if (!rootFolderId) {
    setupProject();
    rootFolderId = PropertiesService.getScriptProperties().getProperty("FOLDER_ID");
  }
  var rootFolder = DriveApp.getFolderById(rootFolderId);

  if (!roomNumber) {
    return rootFolder;
  }

  // รูปแบบชื่อโฟลเดอร์ตามเลขห้อง เช่น "ห้อง_B-1905"
  var cleanRoomNum = String(roomNumber).trim().replace(/[\/\\:*?"<>|]/g, "-");
  var roomFolderName = "ห้อง_" + cleanRoomNum;

  var roomFolder = null;
  var roomFolders = rootFolder.getFoldersByName(roomFolderName);
  if (roomFolders.hasNext()) {
    roomFolder = roomFolders.next();
  } else {
    roomFolder = rootFolder.createFolder(roomFolderName);
    roomFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  // หากมีการระบุโฟลเดอร์ย่อย เช่น "สัญญา_Contracts" หรือ "รูปภาพ_Photos"
  if (subfolderType) {
    var subName = subfolderType === "contracts" ? "สัญญา_Contracts" : (subfolderType === "photos" ? "รูปภาพ_Photos" : subfolderType);
    var subFolders = roomFolder.getFoldersByName(subName);
    if (subFolders.hasNext()) {
      return subFolders.next();
    } else {
      var newSub = roomFolder.createFolder(subName);
      newSub.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return newSub;
    }
  }

  return roomFolder;
}

function uploadFileToDrive(base64Data, fileName, mimeType, roomNumber, subfolderType) {
  try {
    if (!base64Data) {
      return { success: false, error: "No base64 data provided" };
    }

    // เลือกว่าจะบันทึกในโฟลเดอร์ของห้อง หรือ โฟลเดอร์หลัก
    var targetFolder = getOrCreateRoomFolder(roomNumber, subfolderType);

    // ล้าง Header Base64 ถ้ามี (เช่น data:image/jpeg;base64,...)
    var cleanBase64 = base64Data;
    if (base64Data.indexOf("base64,") > -1) {
      cleanBase64 = base64Data.split("base64,")[1];
    }

    var decoded = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decoded, mimeType || "application/pdf", fileName || ("doc_" + Date.now()));
    var file = targetFolder.createFile(blob);

    // อนุญาตให้เข้าถึงไฟล์ผ่านลิงก์
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // สร้าง Direct URL สำหรับเปิดดูและแสดงผล
    var fileId = file.getId();
    var viewUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
    var fileViewerUrl = "https://drive.google.com/file/d/" + fileId + "/view";
    var directUrl = "https://lh3.googleusercontent.com/d/" + fileId;

    return {
      success: true,
      fileId: fileId,
      fileName: file.getName(),
      url: (mimeType === "application/pdf" || subfolderType === "contracts") ? fileViewerUrl : directUrl,
      viewUrl: viewUrl,
      driveUrl: fileViewerUrl,
      folderName: targetFolder.getName(),
      folderUrl: targetFolder.getUrl()
    };
  } catch (err) {
    return {
      success: false,
      error: "Upload failed: " + err.toString()
    };
  }
}

// --------------------------------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------------------------------

function safeJsonParse(val, fallback) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

function formatDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "GMT+7", "yyyy-MM-dd");
  }
  return String(val);
}
