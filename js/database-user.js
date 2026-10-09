// ========================================
// Database User - Page Logic
// CRUD operations untuk manajemen user
// ========================================

const USERS_PER_PAGE = 20;
let currentUserPage = 1;
let allUsers = [];

// ---- Init: check URL params for pre-filled UID ----
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('uid');
  if (uid) {
    // Buka form tambah user dan isi UID otomatis
    document.getElementById('addUserSection').classList.remove('hidden');
    document.getElementById('addUid').value = uid;
    document.getElementById('addNama').focus();
    showToast('UID otomatis diisi dari Riwayat Tap', 'info');
    // Bersihkan URL agar tidak re-trigger saat refresh
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// ---- Load Data ----
async function loadUserData() {
  try {
    const data = await fetchAllData();
    allUsers = [];

    // Baca data langsung dari sheet "Database User" (data.users)
    if (data.users && data.users.length > 1) {
      for (let i = 1; i < data.users.length; i++) {
        const row = data.users[i];
        if (row && row[0]) {
          allUsers.push({
            uid: String(row[0]).trim(),
            nama: String(row[1] || '').trim(),
            nim: String(row[2] || '').trim(),
            fakultas: String(row[3] || '').trim(),
            prodi: String(row[4] || '').trim(),
          });
        }
      }
    } else if (data.absens && data.absens.length > 1) {
      // Fallback untuk data absens lama jika ada
      const userMap = {};
      for (let i = 1; i < data.absens.length; i++) {
        const uid = String(data.absens[i][1] || '').trim();
        if (uid && !userMap[uid]) {
          userMap[uid] = {
            uid: uid,
            nama: String(data.absens[i][2] || '').trim(),
            nim: String(data.absens[i][3] || '').trim(),
            fakultas: String(data.absens[i][4] || '').trim(),
            prodi: String(data.absens[i][5] || '').trim(),
          };
        }
      }
      allUsers = Object.values(userMap);
    }

    renderUserTable();
  } catch (err) {
    document.getElementById('tableUsers').innerHTML =
      '<tr><td colspan="7" class="px-6 py-8 text-center text-sm text-red-400">Gagal memuat data</td></tr>';
  }
}

function getFilteredUsers() {
  const search = (document.getElementById('searchUser').value || '').toLowerCase().trim();
  if (!search) return allUsers;
  return allUsers.filter(u =>
    u.nama.toLowerCase().includes(search) ||
    u.nim.toLowerCase().includes(search) ||
    u.uid.toLowerCase().includes(search)
  );
}

function renderUserTable() {
  const filtered = getFilteredUsers();
  const totalPages = Math.ceil(filtered.length / USERS_PER_PAGE) || 1;

  if (currentUserPage > totalPages) currentUserPage = totalPages;
  if (currentUserPage < 1) currentUserPage = 1;

  const start = (currentUserPage - 1) * USERS_PER_PAGE;
  const end = start + USERS_PER_PAGE;
  const pageData = filtered.slice(start, end);

  document.getElementById('userCount').textContent = `${filtered.length} user ditemukan`;

  let html = '';
  if (pageData.length === 0) {
    html = '<tr><td colspan="7" class="px-6 py-8 text-center text-sm text-gray-400">Tidak ada user ditemukan</td></tr>';
  } else {
    pageData.forEach((user, idx) => {
      const no = start + idx + 1;
      html += `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-6 py-3 text-sm text-gray-500">${no}</td>
          <td class="px-6 py-3 text-sm font-mono text-gray-700">${escapeHtml(user.uid)}</td>
          <td class="px-6 py-3 text-sm font-medium text-gray-900">${escapeHtml(user.nama)}</td>
          <td class="px-6 py-3 text-sm text-gray-700">${escapeHtml(user.nim)}</td>
          <td class="px-6 py-3 text-sm text-gray-500">${escapeHtml(user.fakultas)}</td>
          <td class="px-6 py-3 text-sm text-gray-500">${escapeHtml(user.prodi)}</td>
          <td class="px-6 py-3 text-center">
            <div class="flex items-center justify-center gap-2">
              <button onclick="openEditModal('${escapeHtml(user.uid)}', '${escapeHtml(user.nama)}', '${escapeHtml(user.nim)}', '${escapeHtml(user.fakultas)}', '${escapeHtml(user.prodi)}')" class="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition" title="Edit">
                <i class="fas fa-edit text-sm"></i>
              </button>
              <button onclick="confirmDeleteUser('${escapeHtml(user.uid)}', '${escapeHtml(user.nama)}')" class="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition" title="Hapus">
                <i class="fas fa-trash text-sm"></i>
              </button>
            </div>
          </td>
        </tr>`;
    });
  }

  document.getElementById('tableUsers').innerHTML = html;
  renderPagination('userPagination', currentUserPage, totalPages, 'goToUserPage');
}

function goToUserPage(page) {
  currentUserPage = page;
  renderUserTable();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Add User Form Toggle ----
function toggleAddForm() {
  const section = document.getElementById('addUserSection');
  section.classList.toggle('hidden');
  if (!section.classList.contains('hidden')) {
    document.getElementById('addUid').focus();
  }
}

// ---- CREATE: Add New User ----
async function addNewUser() {
  const btn = document.getElementById('btnAddUser');
  const originalText = btn.innerHTML;

  const uid = document.getElementById('addUid').value.trim();
  const nama = document.getElementById('addNama').value.trim();
  const nim = document.getElementById('addNim').value.trim();
  const fakultas = document.getElementById('addFakultas').value.trim();
  const prodi = document.getElementById('addProdi').value.trim();

  if (!uid || !nama || !nim || !fakultas || !prodi) {
    Swal.fire({ icon: 'warning', title: 'Data Tidak Lengkap', text: 'Semua field wajib diisi.', confirmButtonColor: '#2563eb' });
    return;
  }

  // Cek duplikat UID
  if (allUsers.some(u => u.uid === uid)) {
    Swal.fire({ icon: 'warning', title: 'UID Sudah Terdaftar', text: 'UID kartu ini sudah terdaftar di sistem.', confirmButtonColor: '#2563eb' });
    return;
  }

  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
  btn.disabled = true;

  try {
    const res = await apiAddUser(uid, nama, nim, fakultas, prodi);
    if (res && res.status === 'error') {
      Swal.fire({ icon: 'error', title: 'Gagal', text: res.message || 'Gagal menyimpan user.', confirmButtonColor: '#dc2626' });
      return;
    }

    Swal.fire({ icon: 'success', title: 'Berhasil!', text: (res && res.message) ? res.message : 'User baru berhasil didaftarkan.', confirmButtonColor: '#2563eb', timer: 3000 });
    document.getElementById('userForm').reset();
    document.getElementById('addUserSection').classList.add('hidden');
    await loadUserData();
  } catch (error) {
    console.error('Gagal menyimpan', error);
    Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: 'Terjadi kesalahan. Silakan coba lagi.', confirmButtonColor: '#dc2626' });
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ---- UPDATE: Edit User ----
function openEditModal(uid, nama, nim, fakultas, prodi) {
  document.getElementById('editUid').value = uid;
  document.getElementById('editUidDisplay').value = uid;
  document.getElementById('editNama').value = nama;
  document.getElementById('editNim').value = nim;
  document.getElementById('editFakultas').value = fakultas;
  document.getElementById('editProdi').value = prodi;
  document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
}

async function saveEditUser() {
  const btn = document.getElementById('btnSaveEdit');
  const originalText = btn.innerHTML;

  const uid = document.getElementById('editUid').value;
  const nama = document.getElementById('editNama').value.trim();
  const nim = document.getElementById('editNim').value.trim();
  const fakultas = document.getElementById('editFakultas').value.trim();
  const prodi = document.getElementById('editProdi').value.trim();

  if (!nama || !nim || !fakultas || !prodi) {
    Swal.fire({ icon: 'warning', title: 'Data Tidak Lengkap', text: 'Semua field wajib diisi.', confirmButtonColor: '#2563eb' });
    return;
  }

  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
  btn.disabled = true;

  try {
    const res = await apiEditUser(uid, nama, nim, fakultas, prodi);
    closeEditModal();
    if (res && res.status === 'error') {
      Swal.fire({ icon: 'error', title: 'Gagal', text: res.message || 'Gagal memperbarui user.', confirmButtonColor: '#dc2626' });
      return;
    }
    Swal.fire({ icon: 'success', title: 'Berhasil!', text: (res && res.message) ? res.message : 'Data user berhasil diperbarui.', confirmButtonColor: '#2563eb', timer: 3000 });
    await loadUserData();
  } catch (error) {
    console.error('Gagal mengedit', error);
    Swal.fire({ icon: 'error', title: 'Gagal Memperbarui', text: 'Terjadi kesalahan. Silakan coba lagi.', confirmButtonColor: '#dc2626' });
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ---- DELETE: Hapus User ----
async function confirmDeleteUser(uid, nama) {
  const result = await Swal.fire({
    title: 'Hapus User?',
    html: `Anda yakin ingin menghapus <strong>${escapeHtml(nama)}</strong> (UID: <code>${escapeHtml(uid)}</code>) dari sistem?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
  });

  if (result.isConfirmed) {
    try {
      const res = await apiDeleteUser(uid);
      if (res && res.status === 'error') {
        Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: res.message || 'User tidak ditemukan.', confirmButtonColor: '#dc2626' });
        return;
      }
      Swal.fire({ icon: 'success', title: 'Terhapus!', text: (res && res.message) ? res.message : 'User berhasil dihapus dari sistem.', confirmButtonColor: '#2563eb', timer: 3000 });
      await loadUserData();
    } catch (error) {
      console.error('Gagal menghapus', error);
      Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: 'Terjadi kesalahan. Silakan coba lagi.', confirmButtonColor: '#dc2626' });
    }
  }
}

// ---- Init ----
checkUrlParams();
loadUserData();

// Polling / Refresh otomatis setiap 5 detik dipertahankan
setInterval(loadUserData, 5000);
