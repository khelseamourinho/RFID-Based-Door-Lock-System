// ========================================
// IoT Access Dashboard - Shared App Logic
// DILARANG MENGUBAH URL INI
// ========================================
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyVnycUTNCVd4vEoCFczMX5rX0qEsO7lATiUnT__ZYxzjd0NwuAqAwGnZ_QX0GDNX6TlQ/exec";

// Global data cache
let appData = null;
let registeredUIDs = new Set();
let userMapByUid = new Map();
let isFetching = false;

// ---- Data Fetching ----
async function fetchAllData() {
  if (isFetching) return appData;
  isFetching = true;
  try {
    const res = await fetch(WEB_APP_URL + "?action=getData");
    const data = await res.json();
    appData = data;

    // Reset cache
    registeredUIDs.clear();
    userMapByUid.clear();

    // Sesuai kodingan Apps Script terbaru: data.users dari Sheet "Database User"
    // Format: [[header: UID, Nama, NIM, Fakultas, Prodi], [row1...], ...]
    if (data.users && data.users.length > 1) {
      for (let i = 1; i < data.users.length; i++) {
        const row = data.users[i];
        if (row && row[0]) {
          const uidClean = String(row[0]).trim().toUpperCase();
          registeredUIDs.add(uidClean);
          userMapByUid.set(uidClean, {
            uid: String(row[0]).trim(),
            nama: String(row[1] || '').trim(),
            nim: String(row[2] || '').trim(),
            fakultas: String(row[3] || '').trim(),
            prodi: String(row[4] || '').trim()
          });
        }
      }
    } else if (data.absens && data.absens.length > 1) {
      // Fallback kompatibilitas jika masih data versi lama
      for (let i = 1; i < data.absens.length; i++) {
        if (data.absens[i][1]) {
          const uidClean = String(data.absens[i][1]).trim().toUpperCase();
          registeredUIDs.add(uidClean);
          userMapByUid.set(uidClean, {
            uid: String(data.absens[i][1]).trim(),
            nama: String(data.absens[i][2] || '').trim(),
            nim: String(data.absens[i][3] || '').trim(),
            fakultas: String(data.absens[i][4] || '').trim(),
            prodi: String(data.absens[i][5] || '').trim()
          });
        }
      }
    }

    return data;
  } catch (err) {
    console.error("Gagal memuat data", err);
    throw err;
  } finally {
    isFetching = false;
  }
}

function isRegistered(uid) {
  if (!uid) return false;
  return registeredUIDs.has(String(uid).trim().toUpperCase());
}

function getUserInfo(uid) {
  if (!uid) return null;
  return userMapByUid.get(String(uid).trim().toUpperCase()) || null;
}

// ---- CRUD API Helpers (Sinkron dengan doPost Google Apps Script) ----
async function apiAddUser(uid, nama, nim, fakultas, prodi) {
  const bodyData = {
    action: "create",
    uid: String(uid).trim(),
    nama: String(nama).trim(),
    nim: String(nim).trim(),
    fakultas: String(fakultas).trim(),
    prodi: String(prodi).trim(),
  };
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(bodyData),
  });
  return await res.json();
}

async function apiEditUser(uid, nama, nim, fakultas, prodi) {
  const bodyData = {
    action: "update",
    uid: String(uid).trim(),
    nama: String(nama).trim(),
    nim: String(nim).trim(),
    fakultas: String(fakultas).trim(),
    prodi: String(prodi).trim(),
  };
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(bodyData),
  });
  return await res.json();
}

async function apiDeleteUser(uid) {
  const bodyData = {
    action: "delete",
    uid: String(uid).trim(),
  };
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(bodyData),
  });
  return await res.json();
}

// ---- Sidebar ----
function initSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const close = document.getElementById('sidebarClose');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (toggle) toggle.addEventListener('click', () => openSidebar());
  if (close) close.addEventListener('close', () => closeSidebar());
  if (overlay) overlay.addEventListener('click', () => closeSidebar());

  // Set active nav
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      item.classList.add('active');
    }
  });
}

function openSidebar() {
  document.getElementById('sidebar').classList.remove('-translate-x-full');
  document.getElementById('sidebarOverlay').classList.remove('hidden');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.add('-translate-x-full');
  document.getElementById('sidebarOverlay').classList.add('hidden');
}

// ---- Toast Notification ----
function showToast(message, type = 'success') {
  // Remove existing
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'} mr-2"></i>${message}`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---- Pagination Helper ----
function renderPagination(containerId, currentPage, totalPages, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = '<div class="flex items-center gap-2 flex-wrap">';

  // Prev
  html += `<button class="pagination-btn" onclick="${onPageChange}(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left text-xs"></i></button>`;

  // Page numbers
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) {
    html += `<button class="pagination-btn" onclick="${onPageChange}(1)">1</button>`;
    if (start > 2) html += '<span class="px-1 text-gray-400">...</span>';
  }
  for (let i = start; i <= end; i++) {
    html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="${onPageChange}(${i})">${i}</button>`;
  }
  if (end < totalPages) {
    if (end < totalPages - 1) html += '<span class="px-1 text-gray-400">...</span>';
    html += `<button class="pagination-btn" onclick="${onPageChange}(${totalPages})">${totalPages}</button>`;
  }

  // Next
  html += `<button class="pagination-btn" onclick="${onPageChange}(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right text-xs"></i></button>`;

  html += '</div>';
  container.innerHTML = html;
}

// ---- Utility ----
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('UID disalin ke clipboard!', 'info');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('UID disalin ke clipboard!', 'info');
  });
}

// ---- Dropdown menu (3-dot) ----
let activeDropdown = null;
function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (activeDropdown && activeDropdown !== el) {
    activeDropdown.classList.remove('show');
  }
  el.classList.toggle('show');
  activeDropdown = el.classList.contains('show') ? el : null;
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (activeDropdown && !e.target.closest('.dropdown-wrapper')) {
    activeDropdown.classList.remove('show');
    activeDropdown = null;
  }
});

// Init sidebar on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initSidebar);
