// ========================================
// Riwayat Tap - Page Logic
// Menampilkan semua log tap dengan pagination
// Terbaru di atas, 20 per halaman
// ========================================

const ITEMS_PER_PAGE = 20;
let currentTapPage = 1;
let allLogs = [];

async function loadTapData() {
  try {
    const data = await fetchAllData();

    if (data.logs && data.logs.length > 1) {
      // Ambil data logs (skip header row index 0), lalu reverse agar terbaru di atas
      allLogs = data.logs.slice(1).reverse();
    } else {
      allLogs = [];
    }

    renderTapPage(currentTapPage);
  } catch (err) {
    document.getElementById('tableTap').innerHTML =
      '<tr><td colspan="5" class="px-6 py-8 text-center text-sm text-red-400">Gagal memuat data</td></tr>';
  }
}

function getFilteredLogs() {
  const filter = document.getElementById('filterStatus').value;
  if (filter === 'registered') {
    return allLogs.filter(log => isRegistered(log[1]));
  } else if (filter === 'unregistered') {
    return allLogs.filter(log => !isRegistered(log[1]));
  }
  return allLogs;
}

function renderTapPage(page) {
  currentTapPage = page;
  const filtered = getFilteredLogs();
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;

  if (page > totalPages) page = totalPages;
  if (page < 1) page = 1;
  currentTapPage = page;

  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageData = filtered.slice(start, end);

  // Info text
  document.getElementById('tapInfo').textContent =
    `Menampilkan ${start + 1}-${Math.min(end, filtered.length)} dari ${filtered.length} data`;

  let html = '';
  if (pageData.length === 0) {
    html = '<tr><td colspan="5" class="px-6 py-8 text-center text-sm text-gray-400">Tidak ada data</td></tr>';
  } else {
    pageData.forEach((log, idx) => {
      const uid = String(log[1] || '').trim();
      const nama = String(log[2] || '').trim();
      const registered = isRegistered(uid);
      const globalIdx = start + idx;

      const statusBadge = registered
        ? '<span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 font-medium">Terdaftar</span>'
        : '<span class="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 font-medium">Tidak Dikenal</span>';

      // Tombol opsi (3-dots) pada SETIAP baris
      const actionCell = `
        <div class="dropdown-wrapper relative inline-block text-left">
          <button onclick="event.stopPropagation(); toggleDropdown('dd-${globalIdx}')" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition" title="Opsi">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div id="dd-${globalIdx}" class="dropdown-menu">
            <button onclick="handleOptionAddUser('${escapeHtml(uid)}', '${escapeHtml(nama)}'); toggleDropdown('dd-${globalIdx}')">
              <i class="fas fa-user-plus text-blue-500 w-4"></i> Tambah User
            </button>
            <button onclick="copyToClipboard('${escapeHtml(uid)}'); toggleDropdown('dd-${globalIdx}')">
              <i class="fas fa-copy text-gray-500 w-4"></i> Salin UID
            </button>
          </div>
        </div>`;

      html += `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">${escapeHtml(String(log[0]))}</td>
          <td class="px-6 py-3">
            <div class="text-sm font-medium text-gray-900">${escapeHtml(nama)}</div>
            <div class="text-xs text-gray-400 font-mono">UID: ${escapeHtml(uid)}</div>
          </td>
          <td class="px-6 py-3 text-sm text-gray-500">${escapeHtml(String(log[3] || ''))}</td>
          <td class="px-6 py-3">${statusBadge}</td>
          <td class="px-6 py-3 text-center">${actionCell}</td>
        </tr>`;
    });
  }

  document.getElementById('tableTap').innerHTML = html;
  renderPagination('tapPagination', currentTapPage, totalPages, 'goToPage');
}

// Logika Opsi Tambah User dari baris riwayat tap
function handleOptionAddUser(uid, nama) {
  if (isRegistered(uid)) {
    // Jika sudah terdaftar: beri notifikasi
    const info = getUserInfo(uid);
    const detailNama = info ? info.nama : nama;
    const detailNim = info && info.nim ? ` (NIM: ${info.nim})` : '';
    Swal.fire({
      icon: 'info',
      title: 'User Sudah Terdaftar',
      html: `Kartu dengan UID <strong class="font-mono text-blue-600">${escapeHtml(uid)}</strong> sudah terdaftar di database atas nama <strong>${escapeHtml(detailNama)}</strong>${escapeHtml(detailNim)}.`,
      confirmButtonColor: '#2563eb'
    });
  } else {
    // Jika belum terdaftar: buka modal tambah user dengan UID otomatis terisi
    openQuickAddUserModal(uid);
  }
}

// Modal Quick Add User
function openQuickAddUserModal(uid) {
  document.getElementById('quickUid').value = uid;
  document.getElementById('quickNama').value = '';
  document.getElementById('quickNim').value = '';
  document.getElementById('quickFakultas').value = '';
  document.getElementById('quickProdi').value = '';
  document.getElementById('quickAddModal').classList.add('active');
  setTimeout(() => document.getElementById('quickNama').focus(), 150);
}

function closeQuickAddModal() {
  document.getElementById('quickAddModal').classList.remove('active');
}

async function submitQuickAddUser() {
  const btn = document.getElementById('btnSubmitQuick');
  const originalText = btn.innerHTML;

  const uid = document.getElementById('quickUid').value.trim();
  const nama = document.getElementById('quickNama').value.trim();
  const nim = document.getElementById('quickNim').value.trim();
  const fakultas = document.getElementById('quickFakultas').value.trim();
  const prodi = document.getElementById('quickProdi').value.trim();

  if (!uid || !nama || !nim || !fakultas || !prodi) {
    Swal.fire({
      icon: 'warning',
      title: 'Data Belum Lengkap',
      text: 'Semua field wajib diisi!',
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
  btn.disabled = true;

  try {
    const result = await apiAddUser(uid, nama, nim, fakultas, prodi);
    closeQuickAddModal();

    if (result && result.status === 'success') {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: result.message || 'User berhasil ditambahkan ke database.',
        confirmButtonColor: '#2563eb',
        timer: 3000
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'User berhasil ditambahkan ke database.',
        confirmButtonColor: '#2563eb',
        timer: 3000
      });
    }

    // Refresh data riwayat tap sehingga status otomatis menjadi "Terdaftar"
    await loadTapData();
  } catch (error) {
    console.error('Gagal menyimpan user:', error);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Menyimpan',
      text: 'Terjadi kesalahan saat menyimpan user ke database.',
      confirmButtonColor: '#dc2626'
    });
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function goToPage(page) {
  renderTapPage(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Polling / Refresh otomatis setiap 5 detik dipertahankan
setInterval(loadTapData, 5000);
loadTapData();
