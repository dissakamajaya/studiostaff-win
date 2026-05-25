// ════════════════════════════════════════
// TODAY — mobile-first dashboard
// ════════════════════════════════════════

var _todayData       = null;
var _todayLastFetch  = 0;
var TODAY_DEBOUNCE_MS = 30000;

// Pagination state
var _taskPage     = 0;
var _activityPage = 0;
var TODAY_PAGE_SIZE = 10;

// Schedule view: today | week | month
var _scheduleView = 'today';

function _todayGetWIBDate() {
  var d = new Date();
  var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  var wib = new Date(utc + 7 * 3600000);
  return wib.toISOString().split('T')[0];
}

// ── FETCH ────────────────────────────────────────────────────────────────────
async function fetchToday(force) {
  var now = Date.now();
  if (!force && _todayData && (now - _todayLastFetch) < TODAY_DEBOUNCE_MS) return _todayData;
  var token = localStorage.getItem('ss-token');
  if (!token) return null;
  try {
    var r = await fetch('/api/data?today=1&view=' + _scheduleView, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!r.ok) { if (r.status === 401) return null; throw new Error('HTTP ' + r.status); }
    _todayData = await r.json();
    _todayLastFetch = now;
    return _todayData;
  } catch (e) {
    console.warn('[today] fetch failed:', e.message);
    return _todayData;
  }
}

// ── ATTENDANCE SUBMIT ────────────────────────────────────────────────────────
async function submitAttendance(payload) {
  var token = localStorage.getItem('ss-token');
  if (!token) return;
  try {
    var r = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    // Merge into local attendance cache
    var result = await r.json();
    if (_todayData && result.attendance) {
      var att = _todayData.attendance || [];
      var uid = result.attendance.user_id;
      var idx = att.findIndex(function(a) { return a.user_id === uid; });
      if (idx >= 0) att[idx] = result.attendance; else att.push(result.attendance);
      _todayData.attendance = att;
    }
    _renderTodayContent(_todayData);
  } catch (e) {
    console.error('[today] attendance submit failed:', e.message);
    alert('Gagal menyimpan kehadiran: ' + e.message);
  }
}

// ── TASK TOGGLE ──────────────────────────────────────────────────────────────
function toggleTaskDone(taskId, isDone) {
  var t = DB.tasks.find(function(x) { return x.id === taskId || x._uuid === taskId; });
  if (!t) return;
  t.status = isDone ? 'Done' : 'To Do';
  t.done = isDone;
  saveDBFn();
  if (_todayData && _todayData.tasks) {
    var td = _todayData.tasks.find(function(x) { return x.id === taskId; });
    if (td) {
      td.done = isDone;
      td.status = isDone ? 'Done' : 'To Do';
      td.overdue = !isDone && td.deadline < _todayGetWIBDate();
    }
  }
  if (_todayData) _renderTodayContent(_todayData);
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function _todayFmtTime(s) {
  if (!s) return '';
  var p = (s || '').split(':');
  return p.length >= 2 ? String(parseInt(p[0], 10)).padStart(2, '0') + ':' + p[1] : s;
}

function _todayTimeAgo(ts) {
  if (!ts) return '';
  try {
    var d = new Date(ts), now = new Date(), diff = now - d, m = Math.floor(diff / 60000);
    if (m < 1) return 'baru saja';
    if (m < 60) return m + 'm lalu';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'j lalu';
    var dy = Math.floor(h / 24);
    if (dy < 7) return dy + 'h lalu';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch (_) { return ''; }
}

function _todayTypeIcon(type) {
  var icons = { recording:'🎙', mixing:'🎚', mastering:'💿', meeting:'🤝', rehearsal:'🥁', production:'🎬', class:'🎓', podcast:'🎧', rental:'📦', maintenance:'🔧', other:'📅' };
  return icons[type] || '📅';
}

function _todayPriorityBadge(p) {
  var map = { high:{ cls:'high', l:'Tinggi' }, medium:{ cls:'medium', l:'Sedang' }, low:{ cls:'low', l:'Rendah' }, normal:{ cls:'normal', l:'Normal' } };
  var x = map[p] || map.normal;
  return '<span class="td-badge td-badge-' + x.cls + '">' + x.l + '</span>';
}

function _escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _todayUserColor(name) {
  if (!name) return '#888';
  var c = 0;
  for (var i = 0; i < name.length; i++) c += name.charCodeAt(i);
  var colors = ['#6c63f5','#22c55e','#f5a623','#4a9eff','#f04444','#22d3ee','#e879f9','#d49b2c','#3a8a5c'];
  return colors[c % colors.length];
}

function _todayFmtDate(d) {
  if (!d) return '';
  var p = d.split('-');
  if (p.length < 3) return d;
  var months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  return p[2] + ' ' + months[parseInt(p[1], 10) - 1];
}

// ── RENDER ───────────────────────────────────────────────────────────────────
function renderToday() {
  var el = document.getElementById('pg-today');
  if (!el) return;
  _taskPage = 0;
  _activityPage = 0;
  el.innerHTML = '<div class="td-loading"><div class="td-spinner"></div><p class="td-loading-text">Memuat...</p></div>';
  _todayStartPolling();
  fetchToday(true).then(function(data) {
    if (!data) {
      el.innerHTML = '<div class="td-error"><div class="td-error-icon">⚠️</div><div class="td-error-msg">Gagal memuat data</div><button class="td-btn-retry" onclick="renderToday()">Coba Lagi</button></div>';
      return;
    }
    _renderTodayContent(data);
  }).catch(function(e) {
    el.innerHTML = '<div class="td-error"><div class="td-error-icon">⚠️</div><div class="td-error-msg">' + _escapeHtml(e.message) + '</div></div>';
  });
}

function _renderTodayContent(data) {
  var el = document.getElementById('pg-today');
  if (!el) return;

  var userName  = data.user ? (data.user.name || data.user.id) : (currentUser || 'User');
  var myUserId  = data.user ? data.user.id : '';
  var schedule  = data.schedule  || [];
  var tasks     = data.tasks     || [];
  var presence  = data.presence  || [];
  var activity  = data.activity  || [];
  var attendance = data.attendance || [];

  // WIB now
  var now = new Date();
  var utc = now.getTime() + now.getTimezoneOffset() * 60000;
  var wib = new Date(utc + 7 * 3600000);
  var dayNames   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  var monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var greeting   = wib.getHours() < 12 ? 'Selamat pagi' : wib.getHours() < 15 ? 'Selamat siang' : wib.getHours() < 18 ? 'Selamat sore' : 'Selamat malam';
  var dateStr    = dayNames[wib.getDay()] + ', ' + wib.getDate() + ' ' + monthNames[wib.getMonth()] + ' ' + wib.getFullYear();
  var timeStr    = String(wib.getHours()).padStart(2,'0') + ':' + String(wib.getMinutes()).padStart(2,'0');

  // My attendance record
  var myAtt = attendance.find(function(a) { return a.user_id === myUserId; }) || null;

  var html = '';

  // ── HEADER ──
  html += '<div class="td-header">';
  html += '<div class="td-greeting">' + greeting + ', <span class="td-name">' + _escapeHtml(userName) + '</span></div>';
  html += '<div class="td-date-row"><span class="td-date">' + _escapeHtml(dateStr) + '</span><span class="td-time">' + timeStr + ' WIB</span></div>';
  html += '<button class="td-refresh-btn" onclick="renderToday()" title="Refresh">↻ Segarkan</button>';
  html += '</div>';

  // ── MAIN LAYOUT ──
  html += '<div class="td-layout">';

  // ══ LEFT STACK ══
  html += '<div class="td-stack td-stack-left">';

  // ── KEHADIRAN (my check-in) ──
  html += '<section class="td-card">';
  html += '<div class="td-card-header"><span class="td-card-icon">📍</span><span class="td-card-title">Kehadiran Hari Ini</span></div>';
  html += _renderAttendanceForm(myAtt, myUserId);
  html += '</section>';

  // ── TUGAS SAYA ──
  html += '<section class="td-card">';
  var overdue = tasks.filter(function(t){ return t.overdue && !t.done; });
  var pending = tasks.filter(function(t){ return !t.overdue && !t.done; });
  var done    = tasks.filter(function(t){ return t.done; });
  var allTasks = overdue.concat(pending, done);
  var totalTasks = allTasks.length;
  var totalPages = Math.ceil(totalTasks / TODAY_PAGE_SIZE);
  var pageStart  = _taskPage * TODAY_PAGE_SIZE;
  var pageTasks  = allTasks.slice(pageStart, pageStart + TODAY_PAGE_SIZE);

  html += '<div class="td-card-header"><span class="td-card-icon">📋</span><span class="td-card-title">Tugas Saya</span>';
  if (totalTasks > 0) html += '<span class="td-card-count">' + (done.length) + '/' + totalTasks + '</span>';
  html += '</div>';

  if (totalTasks === 0) {
    html += '<div class="td-empty"><div class="td-empty-icon">🎉</div><div class="td-empty-msg">Semua selesai!</div></div>';
  } else {
    pageTasks.forEach(function(t) { html += _renderTaskCard(t); });
    if (totalPages > 1) {
      html += '<div class="td-pagination">';
      html += '<button class="td-pg-btn" onclick="_taskPage=Math.max(0,_taskPage-1);_renderTodayContent(_todayData)" ' + (_taskPage === 0 ? 'disabled' : '') + '>‹</button>';
      html += '<span class="td-pg-info">' + (_taskPage + 1) + ' / ' + totalPages + '</span>';
      html += '<button class="td-pg-btn" onclick="_taskPage=Math.min(' + (totalPages-1) + ',_taskPage+1);_renderTodayContent(_todayData)" ' + (_taskPage >= totalPages-1 ? 'disabled' : '') + '>›</button>';
      html += '</div>';
    }
  }
  html += '</section>';

  html += '</div>'; // end left stack

  // ══ RIGHT STACK ══
  html += '<div class="td-stack td-stack-right">';

  // ── JADWAL ──
  html += '<section class="td-card">';
  html += '<div class="td-card-header"><span class="td-card-icon">📅</span><span class="td-card-title">Jadwal</span>';
  html += '<div class="td-toggle-group">';
  html += '<button class="td-toggle' + (_scheduleView === 'today' ? ' active' : '') + '" onclick="_scheduleView=\'today\';_taskPage=0;fetchToday(true).then(_renderTodayContent)">Hari</button>';
  html += '<button class="td-toggle' + (_scheduleView === 'week'  ? ' active' : '') + '" onclick="_scheduleView=\'week\';_taskPage=0;fetchToday(true).then(_renderTodayContent)">Minggu</button>';
  html += '<button class="td-toggle' + (_scheduleView === 'month' ? ' active' : '') + '" onclick="_scheduleView=\'month\';_taskPage=0;fetchToday(true).then(_renderTodayContent)">Bulan</button>';
  html += '</div></div>';

  if (schedule.length === 0) {
    html += '<div class="td-empty"><div class="td-empty-icon">📭</div><div class="td-empty-msg">Tidak ada jadwal</div></div>';
  } else {
    html += '<div class="td-timeline">';
    // Group by date for week/month view
    var grouped = {};
    var dateOrder = [];
    schedule.forEach(function(e) {
      var key = e.date || '';
      if (!grouped[key]) { grouped[key] = []; dateOrder.push(key); }
      grouped[key].push(e);
    });
    dateOrder.forEach(function(date) {
      if (_scheduleView !== 'today') {
        html += '<div class="td-timeline-date-label">' + _escapeHtml(_todayFmtDateFull(date)) + '</div>';
      }
      grouped[date].forEach(function(e) { html += _renderTimelineEvent(e); });
    });
    html += '</div>';
  }
  html += '</section>';

  // ── SIAPA HADIR ──
  html += '<section class="td-card">';
  html += '<div class="td-card-header"><span class="td-card-icon">👥</span><span class="td-card-title">Siapa Hadir</span></div>';
  html += '<div class="td-presence-list">';
  presence.forEach(function(p) {
    var att = attendance.find(function(a) { return a.user_id === p.user_id; }) || null;
    html += _renderPresenceRow(p, att);
  });
  html += '</div>';
  html += '</section>';

  // ── TASK ACTIVITY ──
  html += '<section class="td-card">';
  var totalAct  = activity.length;
  var actPages  = Math.ceil(totalAct / TODAY_PAGE_SIZE);
  var actStart  = _activityPage * TODAY_PAGE_SIZE;
  var pageAct   = activity.slice(actStart, actStart + TODAY_PAGE_SIZE);

  html += '<div class="td-card-header"><span class="td-card-icon">📝</span><span class="td-card-title">Aktivitas Task</span>';
  if (totalAct > 0) html += '<span class="td-card-count">' + totalAct + '</span>';
  html += '</div>';

  if (totalAct === 0) {
    html += '<div class="td-empty"><div class="td-empty-msg">Belum ada aktivitas task</div></div>';
  } else {
    pageAct.forEach(function(a) { html += _renderActivityItem(a); });
    if (actPages > 1) {
      html += '<div class="td-pagination">';
      html += '<button class="td-pg-btn" onclick="_activityPage=Math.max(0,_activityPage-1);_renderTodayContent(_todayData)" ' + (_activityPage === 0 ? 'disabled' : '') + '>‹</button>';
      html += '<span class="td-pg-info">' + (_activityPage + 1) + ' / ' + actPages + '</span>';
      html += '<button class="td-pg-btn" onclick="_activityPage=Math.min(' + (actPages-1) + ',_activityPage+1);_renderTodayContent(_todayData)" ' + (_activityPage >= actPages-1 ? 'disabled' : '') + '>›</button>';
      html += '</div>';
    }
  }
  html += '</section>';

  html += '</div>'; // end right stack
  html += '</div>'; // end layout

  el.innerHTML = html;
}

// ── ATTENDANCE FORM ──────────────────────────────────────────────────────────
function _renderAttendanceForm(att, userId) {
  var status   = att ? att.status   : '';
  var checkIn  = att ? (att.check_in  || '') : '';
  var checkOut = att ? (att.check_out || '') : '';
  var note     = att ? (att.note     || '') : '';

  var statuses = [
    { val: 'hadir', label: '🏢 Hadir', cls: 'hadir' },
    { val: 'wfh',   label: '🏠 WFH',   cls: 'wfh'   },
    { val: 'izin',  label: '🏖 Izin',  cls: 'izin'  },
    { val: 'sakit', label: '🤒 Sakit', cls: 'sakit' },
  ];

  var html = '<div class="td-att-form" id="td-att-form">';

  // Status buttons
  html += '<div class="td-att-status-row">';
  statuses.forEach(function(s) {
    var active = status === s.val ? ' active' : '';
    html += '<button class="td-att-status-btn td-att-' + s.cls + active + '" onclick="_todaySelectStatus(\'' + s.val + '\')">' + s.label + '</button>';
  });
  html += '</div>';

  // Shift selector (show only if hadir or wfh)
  var shift = att ? (att.note && att.note.match(/^(pagi|siang|sore)$/) ? att.note : '') : '';
  var showShift = !status || status === 'hadir' || status === 'wfh';
  var shifts = [{ val:'pagi', label:'🌅 Pagi' }, { val:'siang', label:'☀️ Siang' }, { val:'sore', label:'🌇 Sore' }];
  html += '<div class="td-att-shift-row" id="td-att-shift-row" style="' + (showShift ? '' : 'display:none') + '">';
  html += '<div class="td-att-label" style="margin-bottom:6px">Sesi</div>';
  html += '<div class="td-att-shift-btns">';
  shifts.forEach(function(s) {
    var active = shift === s.val ? ' active' : '';
    html += '<button class="td-att-shift-btn' + active + '" onclick="_todaySelectShift(\'' + s.val + '\')">' + s.label + '</button>';
  });
  html += '</div>';
  html += '<input type="hidden" id="td-att-shift-val" value="' + _escapeHtml(shift) + '" />';
  html += '</div>';

  // Note
  html += '<input class="td-att-note" type="text" id="td-att-note" placeholder="Catatan (opsional)" value="' + _escapeHtml(note) + '" />';

  // Hidden status field + save button
  html += '<input type="hidden" id="td-att-status-val" value="' + _escapeHtml(status) + '" />';
  html += '<button class="td-att-save-btn" onclick="_todaySaveAttendance()">' + (att ? '💾 Perbarui' : '✅ Simpan') + '</button>';

  if (att) {
    var savedShift = att.note && att.note.match(/^(pagi|siang|sore)$/) ? att.note : '';
    html += '<div class="td-att-saved">Tersimpan · ' + _escapeHtml(_todayAttStatusLabel(att.status));
    if (savedShift) html += ' · sesi ' + savedShift;
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function _todayAttStatusLabel(s) {
  return { hadir:'Hadir', wfh:'WFH', izin:'Izin', sakit:'Sakit' }[s] || s;
}

function _todaySelectStatus(val) {
  var el = document.getElementById('td-att-status-val');
  if (el) el.value = val;

  // Toggle active class
  var btns = document.querySelectorAll('.td-att-status-btn');
  btns.forEach(function(b) {
    b.classList.remove('active');
    if (b.getAttribute('onclick').indexOf("'" + val + "'") >= 0) b.classList.add('active');
  });

  // Show/hide shift row
  var shiftRow = document.getElementById('td-att-shift-row');
  if (shiftRow) shiftRow.style.display = (val === 'hadir' || val === 'wfh') ? '' : 'none';
}

function _todaySelectShift(val) {
  var el = document.getElementById('td-att-shift-val');
  if (el) el.value = val;
  var btns = document.querySelectorAll('.td-att-shift-btn');
  btns.forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('onclick').indexOf("'" + val + "'") >= 0);
  });
}

function _todaySaveAttendance() {
  var status = (document.getElementById('td-att-status-val') || {}).value;
  var shift  = (document.getElementById('td-att-shift-val')  || {}).value;
  var note   = shift || '';
  if (!status) { alert('Pilih status kehadiran dulu'); return; }
  submitAttendance({ status: status, check_in: null, check_out: null, note: note });
}

// ── TASK CARD ────────────────────────────────────────────────────────────────
function _renderTaskCard(t) {
  var isDone  = t.done || t.status === 'Done';
  var taskId  = t.id || '';
  var cls     = 'td-task' + (t.overdue ? ' overdue' : '') + (isDone ? ' done' : '');

  var html = '<div class="' + cls + '">';
  html += '<label class="td-task-check"><input type="checkbox" ' + (isDone ? 'checked' : '') + ' onchange="toggleTaskDone(\'' + taskId + '\',this.checked)" /><span class="td-checkmark"></span></label>';
  html += '<div class="td-task-body">';
  html += '<div class="td-task-title">' + _escapeHtml(t.title) + '</div>';
  html += '<div class="td-task-meta">' + _todayPriorityBadge(t.priority) + '<span class="td-task-dl">📅 ' + _todayFmtDate(t.deadline) + '</span></div>';
  html += '</div></div>';
  return html;
}

// ── TIMELINE EVENT ───────────────────────────────────────────────────────────
function _renderTimelineEvent(e) {
  var html = '<div class="td-tl-item">';
  html += '<div class="td-tl-time"><span class="td-tl-badge">' + _escapeHtml(_todayFmtTime(e.time)) + '</span></div>';
  html += '<div class="td-tl-dot-col"><div class="td-tl-dot"></div><div class="td-tl-line"></div></div>';
  html += '<div class="td-tl-body">';
  html += '<div class="td-tl-title">' + _todayTypeIcon(e.type) + ' ' + _escapeHtml(e.title) + '</div>';
  var meta = [];
  if (e.type)  meta.push(e.type);
  if (e.room)  meta.push(e.room);
  if (e.attendees && e.attendees.length) meta.push(e.attendees.join(', '));
  html += '<div class="td-tl-meta">' + _escapeHtml(meta.join(' · ')) + '</div>';
  html += '</div></div>';
  return html;
}

function _todayFmtDateFull(d) {
  if (!d) return '';
  var p = d.split('-');
  if (p.length < 3) return d;
  var days   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  var months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  var dt = new Date(d + 'T00:00:00');
  return days[dt.getDay()] + ', ' + p[2] + ' ' + months[parseInt(p[1],10)-1];
}

// ── PRESENCE ROW ─────────────────────────────────────────────────────────────
function _renderPresenceRow(p, att) {
  var color   = _todayUserColor(p.name);
  var initial = p.name ? p.name[0].toUpperCase() : '?';
  var status  = att ? att.status : null;
  var dotCls  = !att ? 'td-dot-none' : { hadir:'td-dot-hadir', wfh:'td-dot-wfh', izin:'td-dot-izin', sakit:'td-dot-sakit' }[status] || 'td-dot-none';
  var statusLabel = att ? _todayAttStatusLabel(status) : 'Belum isi';
  var timeInfo = '';
  if (att && att.note && att.note.match(/^(pagi|siang|sore)$/)) timeInfo = att.note;

  var html = '<div class="td-presence-row">';
  html += '<div class="td-presence-av" style="background:' + color + '22;color:' + color + '">' + initial + '</div>';
  html += '<div class="td-presence-info">';
  html += '<div class="td-presence-name">' + _escapeHtml(p.name) + '<span class="td-dot ' + dotCls + '"></span></div>';
  html += '<div class="td-presence-meta">' + _escapeHtml(statusLabel) + (timeInfo ? ' · ' + timeInfo : '') + '</div>';
  html += '</div></div>';
  return html;
}

// ── ACTIVITY ITEM ────────────────────────────────────────────────────────────
function _renderActivityItem(a) {
  var actor  = a.actor || 'Sistem';
  var action = (a.action || '').replace(/_/g,' ');
  var target = a.target || '';
  var timeAgo = _todayTimeAgo(a.timestamp);

  var html = '<div class="td-act-item">';
  html += '<div class="td-act-dot"></div>';
  html += '<div class="td-act-body">';
  html += '<div class="td-act-text"><strong>' + _escapeHtml(actor) + '</strong> ' + _escapeHtml(action) + (target ? ': <em>' + _escapeHtml(target) + '</em>' : '') + '</div>';
  html += '<div class="td-act-time">' + timeAgo + '</div>';
  html += '</div></div>';
  return html;
}

// ── POLLING ──────────────────────────────────────────────────────────────────
var _todayRefreshTimer = null;

function _todayStartPolling() {
  if (_todayRefreshTimer) clearInterval(_todayRefreshTimer);
  _todayRefreshTimer = setInterval(function() {
    if (_currentPage === 'today') {
      fetchToday(true).then(function(data) {
        if (data && _currentPage === 'today') _renderTodayContent(data);
      }).catch(function() {});
    }
  }, 60000);
}

function _todayStopPolling() {
  if (_todayRefreshTimer) { clearInterval(_todayRefreshTimer); _todayRefreshTimer = null; }
}

var _origRenderPage = renderPage;
renderPage = function(pg) {
  if (_origRenderPage) _origRenderPage(pg);
  if (pg !== 'today' && pg !== undefined) {
    _todayData = null;
    _todayStopPolling();
  }
  if (pg === undefined && _currentPage === 'today' && _todayData) {
    fetchToday(true).then(function(data) {
      if (data && _currentPage === 'today') _renderTodayContent(data);
    }).catch(function() {});
  }
};
