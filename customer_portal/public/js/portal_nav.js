/* ═══════════════════════════════════════════════════════════
   portal_nav.js — Navigation, filters, and search
   Location: assets/customer_portal/js/portal_nav.js
   ═══════════════════════════════════════════════════════════ */

// ── Navigation ────────────────────────────────────────────────────────────
const SECTIONS = {
  'overview':     'Dashboard',
  'quotations':   'Quotations',
  'sales-orders': 'Sales Orders',
  'invoices':     'Invoices',
  'payments':     'Payments',
  'issues':       'Support Issues',
  'addresses':    'Addresses',
};

function navigate(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');
  const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (navItem) navItem.classList.add('active');
  document.getElementById('topbar-title').textContent = SECTIONS[sectionId] || '';
  history.replaceState(null, '', `#${sectionId}`);
}

// Restore section from URL hash on page load (including post-modal-save reload)
(function restoreFromHash() {
  const hash = location.hash.replace('#', '');
  if (hash && SECTIONS[hash]) navigate(hash);
})();

// Reload helper used by modals — lands back on the current section
function reloadToSection() {
  location.href = location.pathname + (location.hash || '#overview');
}

document.querySelectorAll('.nav-item[data-section]').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); navigate(item.dataset.section); });
});

document.querySelectorAll('.card-action[data-section]').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); navigate(link.dataset.section); });
});

// ── Filter + Search ───────────────────────────────────────────────────────
//
// Each filterable section has:
//   .filter-bar  with  .filter-chip  buttons  and  a  .filter-input > input
//   Rows carry  data-status  (lowercase)  and  data-search  (searchable text)

function applyFilters(section) {
  const bar = section.querySelector('.filter-bar');
  if (!bar) return;

  const activeChip  = bar.querySelector('.filter-chip.active');
  const chipLabel   = activeChip ? activeChip.textContent.trim().toLowerCase() : 'all';
  const searchInput = bar.querySelector('.filter-input input');
  const query       = searchInput ? searchInput.value.trim().toLowerCase() : '';

  const rows = section.querySelectorAll('tbody tr[data-status], .issue-row[data-status]');
  let visibleCount = 0;

  rows.forEach(row => {
    const status  = (row.dataset.status  || '').toLowerCase();
    const search  = (row.dataset.search  || '').toLowerCase();
    const visible = (chipLabel === 'all' || status.includes(chipLabel))
                 && (query === '' || search.includes(query));
    row.style.display = visible ? '' : 'none';
    if (visible) visibleCount++;
  });

  const emptyRow = section.querySelector('.no-results-row');
  if (emptyRow) emptyRow.style.display = (visibleCount === 0 && rows.length > 0) ? '' : 'none';
}

document.querySelectorAll('.filter-bar').forEach(bar => {
  const section = bar.closest('.section');

  // Inject "no results" row into each table
  section.querySelectorAll('tbody').forEach(tbody => {
    const colspan = tbody.closest('table').querySelectorAll('thead th').length || 6;
    const noResultsRow = document.createElement('tr');
    noResultsRow.className = 'no-results-row';
    noResultsRow.style.display = 'none';
    noResultsRow.innerHTML = `<td colspan="${colspan}"><div class="empty-state"><div class="icon">🔍</div><p>No results match your filter.</p></div></td>`;
    tbody.appendChild(noResultsRow);
  });

  // Inject "no results" div for issue list
  const issueList = section.querySelector('.issue-list');
  if (issueList) {
    const noResultsDiv = document.createElement('div');
    noResultsDiv.className = 'no-results-row empty-state';
    noResultsDiv.style.display = 'none';
    noResultsDiv.innerHTML = `<div class="icon">🔍</div><p>No results match your filter.</p>`;
    issueList.appendChild(noResultsDiv);
  }

  // Chip click
  bar.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyFilters(section);
    });
  });

  // Search input — debounced
  const input = bar.querySelector('.filter-input input');
  if (input) {
    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => applyFilters(section), 150);
    });
  }
});

// ── Global topbar search ──────────────────────────────────────────────────
const globalInput = document.querySelector('.topbar-search input');
if (globalInput) {
  let debounceTimer;
  globalInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const activeSection = document.querySelector('.section.active');
      if (!activeSection) return;
      const localInput = activeSection.querySelector('.filter-input input');
      if (localInput) {
        localInput.value = globalInput.value;
        localInput.dispatchEvent(new Event('input'));
      } else {
        const query = globalInput.value.trim().toLowerCase();
        activeSection.querySelectorAll('tbody tr, .issue-row, .address-card, .timeline-item').forEach(el => {
          el.style.display = (!query || el.textContent.toLowerCase().includes(query)) ? '' : 'none';
        });
      }
    }, 150);
  });

  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => { globalInput.value = ''; });
  });
}
