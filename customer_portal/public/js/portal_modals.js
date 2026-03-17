/* ═══════════════════════════════════════════════════════════
   portal_modals.js — Modals, notifications, and user menu
   Location: assets/customer_portal/js/portal_modals.js
   Depends on: portal_nav.js (reloadToSection, SECTIONS)
   ═══════════════════════════════════════════════════════════ */

// ── Shared utility ────────────────────────────────────────────────────────
function frappe_csrf_token() {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// ── Address Modal ─────────────────────────────────────────────────────────
const modal          = document.getElementById('address-modal');
const iframe         = document.getElementById('address-iframe');
const loading        = document.getElementById('modal-loading');
const closeBtn       = document.getElementById('modal-close-btn');
const modalTitle     = document.getElementById('modal-title-text');
const modalSubtitle  = document.getElementById('modal-subtitle-text');
const BASE_URL       = 'https://bimxcloud.com/address';
let _addressModalOpen = false;

function openAddressModal(name, title) {
  _addressModalOpen = true;
  modalTitle.textContent    = name ? 'Edit Address' : 'New Address';
  modalSubtitle.textContent = title || '';
  loading.classList.remove('hidden');
  iframe.style.opacity = '0';
  iframe.src = name ? `${BASE_URL}?name=${encodeURIComponent(name)}` : `${BASE_URL}?new=1`;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAddressModal() {
  _addressModalOpen = false;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

iframe.addEventListener('load', () => {
  if (!_addressModalOpen) return;
  loading.classList.add('hidden');
  iframe.style.opacity = '1';
  try {
    const iframeUrl = iframe.contentWindow.location.href;
    if (iframeUrl && !iframeUrl.includes('/address')) { closeAddressModal(); reloadToSection(); }
  } catch (_) { /* cross-origin */ }
});

document.querySelectorAll('.js-edit-address').forEach(btn => {
  btn.addEventListener('click', () => openAddressModal(btn.dataset.name, btn.dataset.title));
});
document.querySelectorAll('.js-new-address').forEach(btn => {
  btn.addEventListener('click', () => openAddressModal(null, null));
});
closeBtn.addEventListener('click', closeAddressModal);
modal.addEventListener('click', e => { if (e.target === modal) closeAddressModal(); });

// ── Issue Modal ───────────────────────────────────────────────────────────
const issueModal     = document.getElementById('issue-modal');
const issueIframe    = document.getElementById('issue-iframe');
const issueLoading   = document.getElementById('issue-modal-loading');
const issueTitle     = document.getElementById('issue-modal-title-text');
const issueSubtitle  = document.getElementById('issue-modal-subtitle');
const ISSUE_BASE_URL = 'https://bimxcloud.com/issues';
let _issueModalOpen  = false;

function openIssueModal({ name = null, subject = null, mode = 'view' }) {
  _issueModalOpen = true;
  const labels = { new: 'New Issue', edit: 'Edit Issue', view: 'View Issue' };
  issueTitle.textContent    = labels[mode] || 'Issue';
  issueSubtitle.textContent = mode === 'new' ? 'Submit a new support request' : (subject || name || '');
  issueLoading.classList.remove('hidden');
  issueIframe.style.opacity = '0';
  issueIframe.src = mode === 'new'
    ? `${ISSUE_BASE_URL}?new=1`
    : `${ISSUE_BASE_URL}?name=${encodeURIComponent(name)}`;
  issueModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeIssueModal() {
  _issueModalOpen = false;
  issueModal.classList.remove('open');
  document.body.style.overflow = '';
}

issueIframe.addEventListener('load', () => {
  if (!_issueModalOpen) return;
  issueLoading.classList.add('hidden');
  issueIframe.style.opacity = '1';
  try {
    const url = issueIframe.contentWindow.location.href;
    if (url && !url.includes('/issues')) { closeIssueModal(); reloadToSection(); }
  } catch (_) { /* cross-origin */ }
});

document.querySelectorAll('.js-new-issue').forEach(btn => {
  btn.addEventListener('click', () => openIssueModal({ mode: 'new' }));
});
document.querySelectorAll('.js-view-issue').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    openIssueModal({ name: btn.dataset.name, subject: btn.dataset.subject, mode: 'view' });
  });
});
document.querySelectorAll('.js-edit-issue').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    openIssueModal({ name: btn.dataset.name, subject: btn.dataset.subject, mode: 'edit' });
  });
});
document.querySelectorAll('.js-close-issue').forEach(btn => {
  btn.addEventListener('click', closeIssueModal);
});
issueModal.addEventListener('click', e => { if (e.target === issueModal) closeIssueModal(); });

// ── Print / PDF Modal ─────────────────────────────────────────────────────
const printModal    = document.getElementById('print-modal');
const printIframe   = document.getElementById('print-iframe');
const printLoading  = document.getElementById('print-modal-loading');
const printTitle    = document.getElementById('print-modal-title-text');
const printSubtitle = document.getElementById('print-modal-subtitle');
const printDownload = document.getElementById('print-modal-download');
const printPrintBtn = document.getElementById('print-modal-print');
let _printModalOpen = false;

function buildPrintUrl(doctype, name) {
  return `/api/method/frappe.utils.print_format.download_pdf?${new URLSearchParams({ doctype, name, no_letterhead: 0 })}`;
}

function openPrintModal(doctype, name) {
  _printModalOpen = true;
  const labels = { 'Quotation': 'Quotation', 'Sales Order': 'Sales Order', 'Sales Invoice': 'Sales Invoice' };
  printTitle.textContent    = `${labels[doctype] || doctype} — ${name}`;
  printSubtitle.textContent = 'PDF Preview';
  printLoading.classList.remove('hidden');
  printIframe.style.opacity = '0';
  const url = buildPrintUrl(doctype, name);
  printDownload.href = url;
  printDownload.setAttribute('download', `${name}.pdf`);
  printPrintBtn.onclick = () => {
    try { printIframe.contentWindow.print(); }
    catch (_) { window.open(url, '_blank'); }
  };
  printIframe.src = url;
  printModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePrintModal() {
  _printModalOpen = false;
  printModal.classList.remove('open');
  document.body.style.overflow = '';
}

printIframe.addEventListener('load', () => {
  if (!_printModalOpen) return;
  printLoading.classList.add('hidden');
  printIframe.style.opacity = '1';
});

document.querySelectorAll('.js-open-print').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    openPrintModal(btn.dataset.doctype, btn.dataset.name);
  });
});
document.querySelectorAll('.js-close-print').forEach(btn => {
  btn.addEventListener('click', closePrintModal);
});
printModal.addEventListener('click', e => { if (e.target === printModal) closePrintModal(); });

// ── Notification Panel ────────────────────────────────────────────────────
const notifToggleBtn  = document.getElementById('notif-toggle-btn');
const notifBackdrop   = document.getElementById('notif-backdrop');
const notifPanel      = document.getElementById('notif-panel');
const notifList       = document.getElementById('notif-list');
const notifCountPill  = document.getElementById('notif-count-pill');
const notifMarkAllBtn = document.getElementById('notif-mark-all-btn');
let _notifOpen  = false;
let _notifCache = [];

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function updateUnreadDot(notifications) {
  notifToggleBtn.classList.toggle('no-unread', !notifications.some(n => !n.read));
}

function updateCountPill(notifications) {
  const count = notifications.filter(n => !n.read).length;
  notifCountPill.textContent  = count;
  notifCountPill.style.display = count > 0 ? '' : 'none';
  notifMarkAllBtn.disabled = count === 0;
}

function renderNotifications(notifications) {
  if (notifications.length === 0) {
    notifList.innerHTML = `<div class="notif-empty"><div class="icon">🔔</div><p>You're all caught up!</p></div>`;
    return;
  }
  notifList.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" data-name="${n.name}">
      <div class="notif-unread-dot ${n.read ? 'read' : ''}"></div>
      <div class="notif-item-body">
        <div class="notif-item-text">${n.subject || 'Notification'}</div>
        <div class="notif-item-meta">
          <span class="notif-item-type">${n.document_type || n.type || 'System'}</span>
          <span>${timeAgo(n.creation)}</span>
        </div>
      </div>
      ${!n.read
        ? `<button class="notif-read-btn js-mark-read" data-name="${n.name}" title="Mark as read">
             <svg width="11" height="11" fill="none" viewBox="0 0 16 16" stroke="currentColor" stroke-width="2.2"><polyline points="2 8 6 12 14 4"/></svg>
           </button>`
        : `<div class="notif-read-btn done">
             <svg width="11" height="11" fill="none" viewBox="0 0 16 16" stroke="currentColor" stroke-width="2.2" opacity=".35"><polyline points="2 8 6 12 14 4"/></svg>
           </div>`}
    </div>`).join('');

  notifList.querySelectorAll('.js-mark-read').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); markOneRead(btn.dataset.name); });
  });
}

async function fetchNotifications() {
  notifList.innerHTML = `<div class="notif-loading"><div class="spinner"></div><span>Loading notifications…</span></div>`;
  try {
    const params = new URLSearchParams({
      doctype:           'Notification Log',
      fields:            JSON.stringify(['name','subject','type','document_type','document_name','creation','read']),
      filters:           JSON.stringify([['for_user','=', PORTAL_USER_EMAIL]]),
      order_by:          'creation desc',
      limit_page_length: 30,
    });
    const res  = await fetch(`/api/resource/Notification Log?${params}`, { headers: { 'X-Frappe-CSRF-Token': frappe_csrf_token() } });
    const data = await res.json();
    _notifCache = data.data || [];
    renderNotifications(_notifCache);
    updateCountPill(_notifCache);
    updateUnreadDot(_notifCache);
  } catch (_) {
    notifList.innerHTML = `<div class="notif-empty"><div class="icon">⚠️</div><p>Could not load notifications.</p></div>`;
  }
}

async function markOneRead(name) {
  const item = notifList.querySelector(`.notif-item[data-name="${name}"]`);
  if (item) {
    item.classList.remove('unread');
    item.querySelector('.notif-unread-dot')?.classList.add('read');
    item.querySelector('.js-mark-read')?.classList.add('done');
  }
  const cached = _notifCache.find(n => n.name === name);
  if (cached) cached.read = 1;
  updateCountPill(_notifCache);
  updateUnreadDot(_notifCache);
  try {
    await fetch('/api/resource/Notification Log/' + encodeURIComponent(name), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': frappe_csrf_token() },
      body: JSON.stringify({ read: 1 }),
    });
  } catch (_) { /* silent */ }
}

async function markAllRead() {
  notifMarkAllBtn.disabled = true;
  _notifCache.forEach(n => { n.read = 1; });
  notifList.querySelectorAll('.notif-item').forEach(item => {
    item.classList.remove('unread');
    item.querySelector('.notif-unread-dot')?.classList.add('read');
    item.querySelector('.js-mark-read')?.classList.add('done');
  });
  updateCountPill(_notifCache);
  updateUnreadDot(_notifCache);
  try {
    await fetch('/api/method/frappe.desk.notifications.mark_all_notifications_as_read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': frappe_csrf_token() },
      body: JSON.stringify({}),
    });
  } catch (_) { /* silent */ }
}

function openNotifPanel()  { _notifOpen = true;  notifBackdrop.classList.add('open');    fetchNotifications(); }
function closeNotifPanel() { _notifOpen = false; notifBackdrop.classList.remove('open'); }

notifToggleBtn.addEventListener('click', e => { e.stopPropagation(); _notifOpen ? closeNotifPanel() : openNotifPanel(); });
notifBackdrop.addEventListener('click', e => { if (!notifPanel.contains(e.target)) closeNotifPanel(); });
notifMarkAllBtn.addEventListener('click', markAllRead);

// Page-load unread dot check (lightweight — fetches only 1 record)
(async () => {
  try {
    const params = new URLSearchParams({
      doctype: 'Notification Log', fields: JSON.stringify(['name','read']),
      filters: JSON.stringify([['for_user','=', PORTAL_USER_EMAIL],['read','=',0]]),
      limit_page_length: 1,
    });
    const res  = await fetch(`/api/resource/Notification Log?${params}`, { headers: { 'X-Frappe-CSRF-Token': frappe_csrf_token() } });
    const data = await res.json();
    notifToggleBtn.classList.toggle('no-unread', (data.data || []).length === 0);
  } catch (_) { /* don't block page load */ }
})();

// ── User Menu ─────────────────────────────────────────────────────────────
const userMenuBtn  = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
let _userMenuOpen  = false;

function openUserMenu()  { _userMenuOpen = true;  userDropdown.classList.add('open');    userMenuBtn.classList.add('open'); }
function closeUserMenu() { _userMenuOpen = false; userDropdown.classList.remove('open'); userMenuBtn.classList.remove('open'); }

userMenuBtn.addEventListener('click', e => {
  e.stopPropagation();
  if (_notifOpen) closeNotifPanel();
  _userMenuOpen ? closeUserMenu() : openUserMenu();
});
document.addEventListener('click', e => {
  if (_userMenuOpen && !userDropdown.contains(e.target) && e.target !== userMenuBtn) closeUserMenu();
});

// ── Logout ────────────────────────────────────────────────────────────────
document.querySelectorAll('.js-logout').forEach(btn => {
  btn.addEventListener('click', async () => {
    closeUserMenu();
    try { await fetch('/api/method/logout', { method: 'GET', headers: { 'X-Frappe-CSRF-Token': frappe_csrf_token() } }); }
    catch (_) { /* proceed regardless */ }
    window.location.href = 'https://bimxcloud.com';
  });
});

// ── Global Escape key handler ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (_userMenuOpen)                            { closeUserMenu();     return; }
  if (issueModal.classList.contains('open'))    { closeIssueModal();   return; }
  if (printModal.classList.contains('open'))    { closePrintModal();   return; }
  if (modal.classList.contains('open'))         { closeAddressModal(); return; }
  if (notifBackdrop.classList.contains('open')) { closeNotifPanel();   return; }
});
