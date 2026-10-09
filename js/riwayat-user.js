// ========================================
// Riwayat Keluar Masuk User - Page Logic
// Menampilkan riwayat user terdaftar:
// Kapan pertama masuk dan terakhir keluar berdasarkan log tap
// ========================================

const HISTORY_PER_PAGE = 20;
let currentHistoryPage = 1;
let processedHistory = [];
let availableDates = [];

async function loadUserHistory() {
  try {
    const data = await fetchAllData();
    processedHistory = processLogsToHistory(data);
    updateDateFilterOptions();
    renderHistoryPage(currentHistoryPage);
  } catch (err) {
    console.error('Error loadUserHistory:', err);
    document.getElementById('tableUserHistory').innerHTML =
      '<tr><td colspan="7" class="px-6 py-8 text-center text-sm text-red-400">Gagal memuat data</td></tr>';
  }
}

function processLogsToHistory(data) {
  if (!data.logs || data.logs.length <= 1) return [];

  // Map: "tanggal|UID" => { tanggal, uid, nama, nim, fakultas, prodi, taps: [] }
  const groupMap = {};
  const dateSet = new Set();

  for (let i = 1; i < data.logs.length; i++) {
    const waktu = String(data.logs[i][0] || '').trim();
    const uid = String(data.logs[i][1] || '').trim();
    const namaLog = String(data.logs[i][2] || '').trim();

    // HANYA proses user yang TERDAFTAR di Database User
    if (!isRegistered(uid)) continue;

    // Pisahkan tanggal dan jam
    // Format standar dari ESP/Google Apps Script: "dd/MM/yyyy HH:mm:ss"
    const parts = waktu.split(' ');
    const tanggal = parts[0] || '-';
    const jam = parts.slice(1).join(' ') || waktu;

    dateSet.add(tanggal);

    const uidKey = uid.toUpperCase();
    const groupKey = `${tanggal}|${uidKey}`;

    if (!groupMap[groupKey]) {
      // Ambil data user lengkap dari Database User
      const userInfo = getUserInfo(uid);
      groupMap[groupKey] = {
        tanggal: tanggal,
        uid: uid,
        nama: userInfo ? userInfo.nama : (namaLog !== 'Tidak Dikenal' ? namaLog : uid),
        nim: userInfo ? userInfo.nim : '-',
        fakultas: userInfo ? userInfo.fakultas : '-',
        prodi: userInfo ? userInfo.prodi : '-',
        taps: []
      };
    }

    groupMap[groupKey].taps.push({ raw: waktu, jam: jam });
  }

  availableDates = Array.from(dateSet).sort().reverse();

  // Olah setiap grup untuk menentukan Pertama Masuk & Terakhir Keluar
  const result = [];
  for (const key in groupMap) {
    const item = groupMap[key];

    // Urutkan tap berdasarkan waktu dari yang paling awal ke yang paling akhir
    item.taps.sort((a, b) => (a.raw > b.raw ? 1 : a.raw < b.raw ? -1 : 0));

    const totalTap = item.taps.length;
    // Tap pertama kali pada hari tersebut = Pertama Masuk
    const pertamaMasuk = item.taps[0].jam;

    let terakhirKeluar = '-';
    let statusBadge = '';

    if (totalTap >= 2) {
      // Tap paling akhir pada hari tersebut = Terakhir Keluar
      terakhirKeluar = item.taps[totalTap - 1].jam;
      statusBadge = '<span class="px-2.5 py-0.5 text-xs rounded-full bg-green-100 text-green-800 font-medium">Selesai (Sudah Keluar)</span>';
    } else {
      // Baru tap 1 kali = Sedang Masuk / Belum tap keluar
      terakhirKeluar = '-';
      statusBadge = '<span class="px-2.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">Sedang Di Dalam</span>';
    }

    result.push({
      tanggal: item.tanggal,
      uid: item.uid,
      nama: item.nama,
      nim: item.nim,
      fakultas: item.fakultas,
      prodi: item.prodi,
      pertamaMasuk: pertamaMasuk,
      terakhirKeluar: terakhirKeluar,
      totalTap: totalTap,
      statusBadge: statusBadge,
      sortKey: item.taps[0].raw
    });
  }

  // Urutkan data dari yang paling baru (tanggal & waktu terbaru di atas)
  result.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));

  return result;
}

function updateDateFilterOptions() {
  const select = document.getElementById('filterTanggal');
  if (!select) return;

  const currentVal = select.value;
  let optionsHtml = '<option value="all">Semua Tanggal</option>';
  availableDates.forEach(tgl => {
    const selected = tgl === currentVal ? 'selected' : '';
    optionsHtml += `<option value="${escapeHtml(tgl)}" ${selected}>${escapeHtml(tgl)}</option>`;
  });
  select.innerHTML = optionsHtml;
}

function getFilteredHistory() {
  const selectedTanggal = document.getElementById('filterTanggal')?.value || 'all';
  const search = (document.getElementById('searchHistory')?.value || '').toLowerCase().trim();

  return processedHistory.filter(item => {
    // Filter tanggal
    if (selectedTanggal !== 'all' && item.tanggal !== selectedTanggal) {
      return false;
    }
    // Filter pencarian (nama, nim, uid, prodi)
    if (search) {
      const match =
        item.nama.toLowerCase().includes(search) ||
        item.nim.toLowerCase().includes(search) ||
        item.uid.toLowerCase().includes(search) ||
        item.prodi.toLowerCase().includes(search);
      if (!match) return false;
    }
    return true;
  });
}

function renderHistoryPage(page) {
  currentHistoryPage = page;
  const filtered = getFilteredHistory();
  const totalPages = Math.ceil(filtered.length / HISTORY_PER_PAGE) || 1;

  if (page > totalPages) page = totalPages;
  if (page < 1) page = 1;
  currentHistoryPage = page;

  const start = (page - 1) * HISTORY_PER_PAGE;
  const end = start + HISTORY_PER_PAGE;
  const pageData = filtered.slice(start, end);

  const infoEl = document.getElementById('historyInfo');
  if (infoEl) {
    infoEl.textContent = `Menampilkan ${start + 1}-${Math.min(end, filtered.length)} dari ${filtered.length} data`;
  }

  let html = '';
  if (pageData.length === 0) {
    html = '<tr><td colspan="7" class="px-6 py-8 text-center text-sm text-gray-400">Tidak ada riwayat untuk user terdaftar</td></tr>';
  } else {
    pageData.forEach(item => {
      html += `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-6 py-3.5 text-sm text-gray-900 whitespace-nowrap font-medium">${escapeHtml(item.tanggal)}</td>
          <td class="px-6 py-3.5">
            <div class="text-sm font-semibold text-gray-900">${escapeHtml(item.nama)}</div>
            <div class="text-xs text-gray-500">NIM: <span class="font-mono">${escapeHtml(item.nim)}</span> &bull; UID: <span class="font-mono">${escapeHtml(item.uid)}</span></div>
          </td>
          <td class="px-6 py-3.5 text-sm text-gray-600">
            <div>${escapeHtml(item.prodi)}</div>
            <div class="text-xs text-gray-400">${escapeHtml(item.fakultas)}</div>
          </td>
          <td class="px-6 py-3.5 text-sm">
            <span class="inline-flex items-center gap-1.5 text-green-700 bg-green-50 px-2.5 py-1 rounded-md font-mono">
              <i class="fas fa-sign-in-alt text-green-600"></i> ${escapeHtml(item.pertamaMasuk)}
            </span>
          </td>
          <td class="px-6 py-3.5 text-sm">
            ${item.terakhirKeluar !== '-' ? `
              <span class="inline-flex items-center gap-1.5 text-red-700 bg-red-50 px-2.5 py-1 rounded-md font-mono">
                <i class="fas fa-sign-out-alt text-red-600"></i> ${escapeHtml(item.terakhirKeluar)}
              </span>
            ` : `
              <span class="text-gray-400 italic text-xs">Belum tap keluar</span>
            `}
          </td>
          <td class="px-6 py-3.5 text-center">
            <span class="px-2.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 font-semibold">${item.totalTap}x</span>
          </td>
          <td class="px-6 py-3.5 text-center">${item.statusBadge}</td>
        </tr>`;
    });
  }

  document.getElementById('tableUserHistory').innerHTML = html;
  renderPagination('userHistoryPagination', currentHistoryPage, totalPages, 'goToHistoryPage');
}

function goToHistoryPage(page) {
  renderHistoryPage(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Polling / Refresh otomatis setiap 5 detik dipertahankan
setInterval(loadUserHistory, 5000);
loadUserHistory();
