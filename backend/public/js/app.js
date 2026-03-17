/* ============================================================
   ShopSathi — app.js  (runs on every authenticated page)
   ============================================================ */

/* ─── Sidebar toggle ─────────────────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function (e) {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('menu-toggle');
  if (
    sidebar &&
    sidebar.classList.contains('open') &&
    !sidebar.contains(e.target) &&
    !toggle.contains(e.target)
  ) {
    sidebar.classList.remove('open');
  }
});

/* ─── Notification panel ─────────────────────────────────── */
let notifOpen = false;

async function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  notifOpen = !notifOpen;
  panel.style.display = notifOpen ? '' : 'none';
  if (notifOpen) await loadNotifications();
}

// Close notif panel when clicking outside
document.addEventListener('click', function (e) {
  const wrap = document.querySelector('.notif-wrap');
  if (wrap && notifOpen && !wrap.contains(e.target)) {
    document.getElementById('notif-panel').style.display = 'none';
    notifOpen = false;
  }
});

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  try {
    const res  = await fetch('/api/notifications');
    const data = await res.json();

    if (!data.length) {
      list.innerHTML = '<div class="notif-empty">No notifications</div>';
      return;
    }

    list.innerHTML = data.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead('${n.id}', this)">
        <div class="notif-item-title">${escHtml(n.title)}</div>
        ${n.message ? `<div class="notif-item-msg">${escHtml(n.message)}</div>` : ''}
        <div class="notif-item-time">${timeSince(new Date(n.created_at))}</div>
      </div>
    `).join('');

    const unread = data.filter(n => !n.is_read).length;
    const dot = document.getElementById('notif-dot');
    if (dot) dot.style.display = unread ? '' : 'none';
  } catch (err) {
    list.innerHTML = '<div class="notif-empty">Failed to load</div>';
  }
}

async function markNotifRead(id, el) {
  await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
  el.classList.remove('unread');
}

async function markAllRead() {
  await fetch('/api/notifications/read-all', { method: 'POST' });
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = 'none';
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
}

/* ─── Low-stock badge ────────────────────────────────────── */
async function loadLowStockBadge() {
  try {
    const res  = await fetch('/api/low-stock-count');
    const data = await res.json();
    const badge = document.getElementById('low-stock-badge');
    if (badge) {
      badge.style.display = data.count > 0 ? '' : 'none';
      badge.textContent   = data.count;
    }
  } catch (_) { /* silent */ }
}

/* ─── Generic modal helpers (for pages that use inline modals) */
function openModal(id)  {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'flex'; el.focus && el.focus(); }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ESC closes any open modal
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(el => {
      if (el.style.display !== 'none') el.style.display = 'none';
    });
    if (notifOpen) {
      const panel = document.getElementById('notif-panel');
      if (panel) panel.style.display = 'none';
      notifOpen = false;
    }
  }
});

/* ─── Utility helpers ────────────────────────────────────── */
function timeSince(date) {
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtRupee(n) {
  return '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/* ─── Boot ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  // Populate notification dot on load
  fetch('/api/notifications')
    .then(r => r.json())
    .then(data => {
      const unread = data.filter(n => !n.is_read).length;
      const dot = document.getElementById('notif-dot');
      if (dot) dot.style.display = unread ? '' : 'none';
    })
    .catch(() => {});

  // Low-stock badge in sidebar
  loadLowStockBadge();
});
