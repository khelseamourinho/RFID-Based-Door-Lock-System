function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetUser = ss.getSheetByName("Database User");
  var sheetLog = ss.getSheetByName("Riwayat Keluar Masuk");
  var sheetAbsen = ss.getSheetByName("Riwayat Absensi");
  
  var uid = e.parameter.uid;
  if (!uid) {
    return ContentService.createTextOutput("Gagal: UID kosong");
  }
  
  var waktu = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
  var tanggal = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy");
  var jam = Utilities.formatDate(new Date(), "Asia/Jakarta", "HH:mm:ss");
  
  // 1. Cek apakah user terdaftar di Database User
  var userData = sheetUser.getDataRange().getValues();
  var isRegistered = false;
  var userInfo = { nama: "Tidak Dikenal", nim: "-", fakultas: "-", prodi: "-" };
  
  for (var j = 1; j < userData.length; j++) {
    if (userData[j][0].toString().trim().toUpperCase() == uid.trim().toUpperCase()) {
      isRegistered = true;
      userInfo.nama = userData[j][1];
      userInfo.nim = userData[j][2];
      userInfo.fakultas = userData[j][3];
      userInfo.prodi = userData[j][4];
      break;
    }
  }
  
  // 2. Catat SELURUH aktivitas tap ke tab "Riwayat Keluar Masuk"
  var ketLog = isRegistered ? "Terdaftar" : "Tidak Terdaftar";
  sheetLog.appendRow([waktu, uid, userInfo.nama, ketLog]);
  
  // Jika tidak terdaftar, tolak akses
  if (!isRegistered) {
    return ContentService.createTextOutput("Ditolak,Tidak Dikenal");
  }
  
  // 3. Kelola "Riwayat Absensi" (Cek apakah sudah tap di hari yang sama)
  var absenData = sheetAbsen.getDataRange().getValues();
  var rowIndex = -1;
  var statusAbsen = "Masuk";
  
  for (var i = 1; i < absenData.length; i++) {
    var rowTanggal = absenData[i][0].toString();
    var rowUid = absenData[i][1].toString();
    if (rowTanggal == tanggal && rowUid.toUpperCase() == uid.toUpperCase()) {
      rowIndex = i + 1; // Baris ditemukan di spreadsheet
      break;
    }
  }
  
  if (rowIndex == -1) {
    // Belum ada absen hari ini -> Catat sebagai Waktu Masuk
    sheetAbsen.appendRow([tanggal, uid, userInfo.nama, userInfo.nim, userInfo.fakultas, userInfo.prodi, jam, "-", "Masuk"]);
    statusAbsen = "Masuk";
  } else {
    // Sudah ada absen hari ini -> Update Waktu Keluar
    sheetAbsen.getRange(rowIndex, 8).setValue(jam); // Kolom H (Waktu Keluar)
    sheetAbsen.getRange(rowIndex, 9).setValue("Keluar"); // Kolom I (Status)
    statusAbsen = "Keluar";
  }
  
  return ContentService.createTextOutput("Sukses," + statusAbsen + "," + userInfo.nama);
}