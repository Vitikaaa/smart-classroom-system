/* ===== Smart Classroom Availability System — Frontend App ===== */

const API = '';
let rooms = [];
let stats = {};
let schedules = [];
let currentPage = 'dashboard';
let pollInterval = null;

// ─── Helpers ────────────────────────────────────────────────
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); Object.entries(attrs).forEach(([k,v]) => e.setAttribute(k,v)); e.innerHTML = html; return e; };

async function api(path, opts = {}) {
  const res = await fetch(API + path, { headers: {'Content-Type':'application/json'}, ...opts });
  return res.json();
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const t = el('div', { class: `toast ${type}` }, `<span>${icons[type]||''}</span> ${msg}`);
  $('#toast-container').appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function today() {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
}

// ─── Data Fetching ──────────────────────────────────────────
async function fetchRooms() { rooms = await api('/api/rooms'); }
async function fetchStats() { stats = await api('/api/stats'); }
async function fetchSchedules(day) { schedules = await api(`/api/schedule${day ? '?day='+day : ''}`); }

async function refreshData() {
  await fetchRooms();
  await fetchStats();
  if (currentPage === 'dashboard') renderDashboard();
  else if (currentPage === 'stats') renderStats();
  else if (currentPage === 'admin') renderAdmin();
}

// ─── Router ─────────────────────────────────────────────────
function navigate(page) {
  currentPage = page;
  $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  renderPage();
}

function renderPage() {
  const main = $('#app-main');
  switch(currentPage) {
    case 'dashboard': fetchRooms().then(() => fetchStats().then(renderDashboard)); break;
    case 'schedule':  fetchSchedules(today()).then(renderSchedule); break;
    case 'report':    fetchRooms().then(renderReport); break;
    case 'admin':     fetchRooms().then(renderAdmin); break;
    case 'stats':     fetchRooms().then(() => fetchStats().then(renderStats)); break;
  }
}

// ─── Dashboard ──────────────────────────────────────────────
function renderDashboard() {
  const main = $('#app-main');
  const buildings = [...new Set(rooms.map(r => r.building))];
  const types = [...new Set(rooms.map(r => r.room_type))];
  const floors = [...new Set(rooms.map(r => r.floor))].sort();

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>Room Availability Dashboard</h1>
        <p>Real-time status of all classrooms, labs, and halls — ${today()}, ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>
      </div>
      <div class="stats-bar">
        <div class="stat-card total"><span class="stat-label">Total Rooms</span><span class="stat-value">${stats.total||0}</span></div>
        <div class="stat-card vacant"><span class="stat-label">Vacant</span><span class="stat-value">${stats.vacant||0}</span></div>
        <div class="stat-card occupied"><span class="stat-label">Occupied</span><span class="stat-value">${stats.occupied||0}</span></div>
        <div class="stat-card maintenance"><span class="stat-label">Maintenance</span><span class="stat-value">${stats.maintenance||0}</span></div>
        <div class="stat-card rate"><span class="stat-label">Utilization</span><span class="stat-value">${stats.utilization_rate||0}%</span></div>
      </div>
      <div class="filters-bar">
        <div class="filter-group"><label>Search</label><input class="filter-input" id="f-search" placeholder="Search rooms..." /></div>
        <div class="filter-group"><label>Building</label><select class="filter-select" id="f-building"><option value="">All</option>${buildings.map(b=>`<option value="${b}">${b}</option>`).join('')}</select></div>
        <div class="filter-group"><label>Floor</label><select class="filter-select" id="f-floor"><option value="">All</option>${floors.map(f=>`<option value="${f}">Floor ${f}</option>`).join('')}</select></div>
        <div class="filter-group"><label>Type</label><select class="filter-select" id="f-type"><option value="">All</option>${types.map(t=>`<option value="${t}">${t.replace('_',' ')}</option>`).join('')}</select></div>
        <div class="filter-group"><label>Status</label><select class="filter-select" id="f-status"><option value="">All</option><option value="vacant">Vacant</option><option value="occupied">Occupied</option><option value="maintenance">Maintenance</option></select></div>
      </div>
      <div class="room-grid" id="room-grid"></div>
    </div>`;

  renderRoomCards(rooms);
  ['f-search','f-building','f-floor','f-type','f-status'].forEach(id => {
    $(`#${id}`).addEventListener(id === 'f-search' ? 'input' : 'change', applyFilters);
  });
}

function applyFilters() {
  const search = ($('#f-search')?.value || '').toLowerCase();
  const building = $('#f-building')?.value || '';
  const floor = $('#f-floor')?.value || '';
  const type = $('#f-type')?.value || '';
  const status = $('#f-status')?.value || '';

  const filtered = rooms.filter(r =>
    (!search || r.name.toLowerCase().includes(search) || r.building.toLowerCase().includes(search)) &&
    (!building || r.building === building) &&
    (!floor || r.floor == floor) &&
    (!type || r.room_type === type) &&
    (!status || r.current_status === status)
  );
  renderRoomCards(filtered);
}

function renderRoomCards(list) {
  const grid = $('#room-grid');
  if (!grid) return;
  if (!list.length) { grid.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>No rooms match your filters</p></div>'; return; }
  grid.innerHTML = list.map(r => `
    <div class="room-card ${r.current_status}" onclick="openRoomDetail(${r.id})">
      <div class="room-card-header">
        <span class="room-name">${r.name}</span>
        <span class="room-status-badge ${r.current_status}"><span class="status-dot ${r.current_status}"></span>${r.current_status}</span>
      </div>
      <div class="room-meta">
        <span>🏢 ${r.building}</span>
        <span>📍 Floor ${r.floor}</span>
        <span>👥 ${r.capacity} seats</span>
        <span>🏷️ ${r.room_type.replace('_',' ')}</span>
      </div>
      <div class="room-card-footer">Updated ${timeAgo(r.last_updated)}</div>
    </div>`).join('');
}

// ─── Room Detail Modal ──────────────────────────────────────
async function openRoomDetail(id) {
  const data = await api(`/api/rooms/${id}`);
  const modal = $('#room-modal');
  const content = $('#room-modal-content');

  const scheduleRows = (data.today_schedule||[]).map(s =>
    `<tr><td>${s.start_time}–${s.end_time}</td><td>${s.subject}</td><td>${s.faculty||'-'}</td><td>${s.section||'-'}</td></tr>`
  ).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No classes scheduled today</td></tr>';

  const historyItems = (data.history||[]).slice(0,10).map(h =>
    `<div class="history-item"><span class="hi-status" style="color:var(--${h.status})">${h.status}</span><span class="hi-by">${h.changed_by}</span><span class="hi-time">${timeAgo(h.timestamp)}</span></div>`
  ).join('') || '<p style="color:var(--text-muted);font-size:0.85rem">No history yet</p>';

  content.innerHTML = `
    <div class="modal-header">
      <h2>${data.name} <span class="room-status-badge ${data.current_status}"><span class="status-dot ${data.current_status}"></span>${data.current_status}</span></h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="room-meta" style="margin-bottom:1rem;">
      <span>🏢 ${data.building}</span><span>📍 Floor ${data.floor}</span><span>👥 ${data.capacity} seats</span><span>🏷️ ${data.room_type.replace('_',' ')}</span>
    </div>
    <div class="modal-section">
      <h3>📅 Today's Schedule (${today()})</h3>
      <table class="schedule-table"><thead><tr><th>Time</th><th>Subject</th><th>Faculty</th><th>Section</th></tr></thead><tbody>${scheduleRows}</tbody></table>
    </div>
    <div class="modal-section">
      <h3>📜 Recent History</h3>
      <div class="history-list">${historyItems}</div>
    </div>`;
  modal.classList.add('active');
}

function closeModal() { $('#room-modal').classList.remove('active'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
$('#room-modal').addEventListener('click', e => { if (e.target === $('#room-modal')) closeModal(); });

// ─── Schedule Page ──────────────────────────────────────────
function renderSchedule() {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const main = $('#app-main');
  main.innerHTML = `
    <div class="page">
      <div class="page-header"><h1>Class Schedule</h1><p>View timetable by day</p></div>
      <div class="filters-bar">
        <div class="filter-group"><label>Day</label><select class="filter-select" id="sch-day">${days.map(d=>`<option value="${d}" ${d===today()?'selected':''}>${d}</option>`).join('')}</select></div>
        <div class="filter-group"><label>Room</label><select class="filter-select" id="sch-room"><option value="">All Rooms</option>${rooms.map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}</select></div>
      </div>
      <div id="schedule-content"></div>
    </div>`;
  renderScheduleTable();
  $('#sch-day').addEventListener('change', () => fetchSchedules($('#sch-day').value).then(renderScheduleTable));
  $('#sch-room').addEventListener('change', renderScheduleTable);
}

function renderScheduleTable() {
  const roomFilter = $('#sch-room')?.value || '';
  const filtered = roomFilter ? schedules.filter(s => s.room_id == roomFilter) : schedules;
  const container = $('#schedule-content');
  if (!filtered.length) { container.innerHTML = '<div class="empty-state"><div class="icon">📅</div><p>No classes scheduled</p></div>'; return; }
  container.innerHTML = `<table class="schedule-table"><thead><tr><th>Room</th><th>Time</th><th>Subject</th><th>Faculty</th><th>Section</th></tr></thead><tbody>
    ${filtered.map(s=>`<tr><td>${s.room_name||''}</td><td>${s.start_time}–${s.end_time}</td><td>${s.subject}</td><td>${s.faculty||'-'}</td><td>${s.section||'-'}</td></tr>`).join('')}
  </tbody></table>`;
}

// ─── Report Page ────────────────────────────────────────────
function renderReport() {
  const main = $('#app-main');
  main.innerHTML = `
    <div class="page">
      <div class="page-header"><h1>Report Room Status</h1><p>Help others by reporting the current status of a room</p></div>
      <div class="report-section">
        <h3>📝 Submit a Report</h3>
        <div class="form-grid" style="margin-bottom:1rem">
          <div class="form-group"><label>Room</label><select class="filter-select" id="rpt-room">${rooms.map(r=>`<option value="${r.id}">${r.name} (${r.building})</option>`).join('')}</select></div>
          <div class="form-group"><label>Status</label><select class="filter-select" id="rpt-status"><option value="vacant">Vacant</option><option value="occupied">Occupied</option></select></div>
          <div class="form-group"><label>Your Name (optional)</label><input class="filter-input" id="rpt-name" placeholder="Anonymous" /></div>
          <div class="form-group"><label>Notes (optional)</label><input class="filter-input" id="rpt-notes" placeholder="e.g. lights off, door locked" /></div>
        </div>
        <button class="btn btn-primary" id="rpt-submit">Submit Report</button>
      </div>
      <div class="report-section">
        <h3>📜 Recent Reports</h3>
        <div id="reports-list">Loading...</div>
      </div>
    </div>`;
  $('#rpt-submit').addEventListener('click', submitReport);
  loadReports();
}

async function submitReport() {
  const body = {
    room_id: parseInt($('#rpt-room').value),
    reported_status: $('#rpt-status').value,
    reporter_name: $('#rpt-name').value || 'Anonymous',
    notes: $('#rpt-notes').value,
  };
  await api('/api/report', { method: 'POST', body: JSON.stringify(body) });
  toast('Report submitted successfully!', 'success');
  $('#rpt-name').value = '';
  $('#rpt-notes').value = '';
  loadReports();
  fetchRooms();
}

async function loadReports() {
  const reports = await api('/api/reports');
  const container = $('#reports-list');
  if (!container) return;
  if (!reports.length) { container.innerHTML = '<p style="color:var(--text-muted)">No reports yet</p>'; return; }
  container.innerHTML = `<table class="schedule-table"><thead><tr><th>Room</th><th>Status</th><th>Reporter</th><th>Notes</th><th>Time</th></tr></thead><tbody>
    ${reports.map(r=>`<tr><td>${r.room_name||''}</td><td><span class="room-status-badge ${r.reported_status}"><span class="status-dot ${r.reported_status}"></span>${r.reported_status}</span></td><td>${r.reporter_name||'Anonymous'}</td><td>${r.notes||'-'}</td><td>${timeAgo(r.timestamp)}</td></tr>`).join('')}
  </tbody></table>`;
}

// ─── Admin Page ─────────────────────────────────────────────
function renderAdmin() {
  const main = $('#app-main');
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  main.innerHTML = `
    <div class="page">
      <div class="page-header"><h1>Admin Panel</h1><p>Manage room status and schedules</p></div>
      <h3 style="margin-bottom:1rem">🔧 Room Status Control</h3>
      <div class="admin-grid" id="admin-grid">
        ${rooms.map(r => `
          <div class="admin-room-card">
            <div class="admin-room-info"><h4>${r.name}</h4><p>${r.building} · Floor ${r.floor}</p></div>
            <div class="status-toggle">
              <button class="status-btn ${r.current_status==='vacant'?'active-vacant':''}" onclick="setStatus(${r.id},'vacant')">Vacant</button>
              <button class="status-btn ${r.current_status==='occupied'?'active-occupied':''}" onclick="setStatus(${r.id},'occupied')">Occupied</button>
              <button class="status-btn ${r.current_status==='maintenance'?'active-maintenance':''}" onclick="setStatus(${r.id},'maintenance')">Maint.</button>
            </div>
          </div>`).join('')}
      </div>
      <h3 style="margin:2rem 0 1rem">📅 Add Schedule Entry</h3>
      <div class="schedule-form">
        <div class="form-grid" style="margin-bottom:1rem">
          <div class="form-group"><label>Room</label><select class="filter-select" id="adm-room">${rooms.map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>Day</label><select class="filter-select" id="adm-day">${days.map(d=>`<option value="${d}">${d}</option>`).join('')}</select></div>
          <div class="form-group"><label>Start Time</label><input type="time" class="filter-input" id="adm-start" value="09:00" /></div>
          <div class="form-group"><label>End Time</label><input type="time" class="filter-input" id="adm-end" value="10:00" /></div>
          <div class="form-group"><label>Subject</label><input class="filter-input" id="adm-subject" placeholder="e.g. Data Structures" /></div>
          <div class="form-group"><label>Faculty</label><input class="filter-input" id="adm-faculty" placeholder="e.g. Dr. Sharma" /></div>
          <div class="form-group"><label>Section</label><input class="filter-input" id="adm-section" placeholder="e.g. CSE-A" /></div>
        </div>
        <button class="btn btn-primary" id="adm-add">Add Schedule</button>
      </div>
      <h3 style="margin-bottom:1rem">📋 Existing Schedules</h3>
      <div class="filters-bar"><div class="filter-group"><label>Day</label><select class="filter-select" id="adm-sch-day">${days.map(d=>`<option value="${d}" ${d===today()?'selected':''}>${d}</option>`).join('')}</select></div></div>
      <div id="adm-sch-list">Loading...</div>
    </div>`;
  $('#adm-add').addEventListener('click', addSchedule);
  $('#adm-sch-day').addEventListener('change', loadAdminSchedules);
  loadAdminSchedules();
}

async function setStatus(id, status) {
  await api(`/api/rooms/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, changed_by: 'admin' }) });
  toast(`Room status updated to ${status}`, 'success');
  await fetchRooms();
  renderAdmin();
}

async function addSchedule() {
  const body = {
    room_id: parseInt($('#adm-room').value),
    day_of_week: $('#adm-day').value,
    start_time: $('#adm-start').value,
    end_time: $('#adm-end').value,
    subject: $('#adm-subject').value,
    faculty: $('#adm-faculty').value,
    section: $('#adm-section').value,
  };
  if (!body.subject) { toast('Subject is required', 'error'); return; }
  await api('/api/schedule', { method: 'POST', body: JSON.stringify(body) });
  toast('Schedule added!', 'success');
  $('#adm-subject').value = '';
  $('#adm-faculty').value = '';
  $('#adm-section').value = '';
  loadAdminSchedules();
}

async function loadAdminSchedules() {
  const day = $('#adm-sch-day')?.value || today();
  const data = await api(`/api/schedule?day=${day}`);
  const container = $('#adm-sch-list');
  if (!container) return;
  if (!data.length) { container.innerHTML = '<div class="empty-state"><div class="icon">📅</div><p>No schedules for this day</p></div>'; return; }
  container.innerHTML = `<table class="schedule-table"><thead><tr><th>Room</th><th>Time</th><th>Subject</th><th>Faculty</th><th>Section</th><th></th></tr></thead><tbody>
    ${data.map(s=>`<tr><td>${s.room_name||''}</td><td>${s.start_time}–${s.end_time}</td><td>${s.subject}</td><td>${s.faculty||'-'}</td><td>${s.section||'-'}</td><td><button class="btn btn-danger" onclick="deleteSchedule(${s.id})">✕</button></td></tr>`).join('')}
  </tbody></table>`;
}

async function deleteSchedule(id) {
  await api(`/api/schedule/${id}`, { method: 'DELETE' });
  toast('Schedule entry deleted', 'info');
  loadAdminSchedules();
}

// ─── Stats Page ─────────────────────────────────────────────
function renderStats() {
  const main = $('#app-main');
  const byBuilding = stats.by_building || {};
  const byType = stats.by_room_type || {};
  const byFloor = stats.by_floor || {};

  function barSection(title, data) {
    const entries = Object.entries(data);
    if (!entries.length) return '';
    const maxTotal = Math.max(...entries.map(([,v])=>v.total));
    return `<div class="chart-card"><h3>${title}</h3><div class="bar-chart">
      ${entries.map(([label, v]) => {
        const vPct = v.total ? (v.vacant/v.total*100) : 0;
        const oPct = v.total ? (v.occupied/v.total*100) : 0;
        const mPct = v.total ? (v.maintenance/v.total*100) : 0;
        return `<div class="bar-row"><span class="bar-label">${label.replace('_',' ')}</span><div class="bar-track">
          <div class="bar-fill vacant" style="width:${vPct}%">${v.vacant?v.vacant:''}</div>
          <div class="bar-fill occupied" style="width:${oPct}%">${v.occupied?v.occupied:''}</div>
          ${v.maintenance?`<div class="bar-fill maintenance" style="width:${mPct}%">${v.maintenance}</div>`:''}
        </div></div>`;
      }).join('')}
    </div></div>`;
  }

  // Donut chart via SVG
  const total = stats.total || 1;
  const vacantPct = (stats.vacant||0)/total;
  const occupiedPct = (stats.occupied||0)/total;
  const maintPct = (stats.maintenance||0)/total;

  function donutArc(startPct, pct, color) {
    if (pct <= 0) return '';
    const r = 60, cx = 80, cy = 80;
    const startAngle = startPct * 360 - 90;
    const endAngle = (startPct + pct) * 360 - 90;
    const largeArc = pct > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle * Math.PI/180);
    const y1 = cy + r * Math.sin(startAngle * Math.PI/180);
    const x2 = cx + r * Math.cos(endAngle * Math.PI/180);
    const y2 = cy + r * Math.sin(endAngle * Math.PI/180);
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" opacity="0.85"/>`;
  }

  const donutSvg = `<svg viewBox="0 0 160 160" width="180" height="180">
    ${donutArc(0, vacantPct, '#10b981')}
    ${donutArc(vacantPct, occupiedPct, '#ef4444')}
    ${donutArc(vacantPct+occupiedPct, maintPct, '#f59e0b')}
    <circle cx="80" cy="80" r="36" fill="var(--bg-secondary)"/>
    <text x="80" y="76" text-anchor="middle" fill="var(--text-primary)" font-size="18" font-weight="700">${stats.total||0}</text>
    <text x="80" y="94" text-anchor="middle" fill="var(--text-muted)" font-size="10">rooms</text>
  </svg>`;

  main.innerHTML = `
    <div class="page">
      <div class="page-header"><h1>Analytics & Statistics</h1><p>Overview of room utilization across the campus</p></div>
      <div class="stats-bar">
        <div class="stat-card total"><span class="stat-label">Total Rooms</span><span class="stat-value">${stats.total||0}</span></div>
        <div class="stat-card vacant"><span class="stat-label">Vacant Now</span><span class="stat-value">${stats.vacant||0}</span></div>
        <div class="stat-card occupied"><span class="stat-label">Occupied Now</span><span class="stat-value">${stats.occupied||0}</span></div>
        <div class="stat-card rate"><span class="stat-label">Utilization Rate</span><span class="stat-value">${stats.utilization_rate||0}%</span></div>
      </div>
      <div class="charts-grid">
        <div class="chart-card">
          <h3>Overall Distribution</h3>
          <div class="donut-container">
            ${donutSvg}
            <div class="donut-legend">
              <div class="legend-item"><span class="legend-dot" style="background:var(--vacant)"></span> Vacant (${stats.vacant||0})</div>
              <div class="legend-item"><span class="legend-dot" style="background:var(--occupied)"></span> Occupied (${stats.occupied||0})</div>
              <div class="legend-item"><span class="legend-dot" style="background:var(--maintenance)"></span> Maintenance (${stats.maintenance||0})</div>
            </div>
          </div>
        </div>
        ${barSection('By Building', byBuilding)}
        ${barSection('By Room Type', byType)}
        ${barSection('By Floor', byFloor)}
      </div>
    </div>`;
}

// ─── Init ───────────────────────────────────────────────────
window.addEventListener('hashchange', () => {
  const page = location.hash.replace('#','') || 'dashboard';
  navigate(page);
});

document.addEventListener('DOMContentLoaded', () => {
  const page = location.hash.replace('#','') || 'dashboard';
  navigate(page);
  // Auto-refresh every 30s
  pollInterval = setInterval(refreshData, 30000);
});

// Expose functions for inline onclick handlers
window.openRoomDetail = openRoomDetail;
window.closeModal = closeModal;
window.setStatus = setStatus;
window.deleteSchedule = deleteSchedule;
