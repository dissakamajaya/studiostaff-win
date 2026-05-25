// ════════════════════════════════════════════════════════════════════════
// RENTAL MODULE — Complete Rewrite
// Tabs: Dashboard · Bookings · Surat Jalan · Crew
// ════════════════════════════════════════════════════════════════════════

let rentalTab = 0;

function switchRentalTab(el, idx) {
  rentalTab = idx;
  document.querySelectorAll('#rental-tabs .tab').forEach((t, i) => t.classList.toggle('on', i === idx));
  renderRentals();
}

// ── Helpers ──────────────────────────────────────────────────────────────
function _getBookingClient(r) { return DB.clients.find(c => c.id === r.clientId); }
function _bookingNum(r) { return 'BK-' + String(r.id).padStart(4, '0'); }
function _sjNum(sj) { return 'SJ-' + String(sj.id).padStart(4, '0'); }

// Check how many units of an inventory item are available on a date range
function getItemAvailability(itemName, startDate, endDate, excludeBookingId) {
  var inv = (DB.inventoryItems || []).find(function(i) { return i.name === itemName; });
  var totalStock = inv ? (inv.qty || inv.stock || 1) : 0;
  var start = new Date(startDate);
  var end = new Date(endDate);
  var maxBooked = 0;
  DB.rentals.forEach(function(r) {
    if (excludeBookingId && r.id === excludeBookingId) return;
    if (r.status === 'Returned' || r.status === 'Cancelled') return;
    var hasItem = (r.items || []).some(function(it) { return it.name === itemName; });
    if (!hasItem) return;
    var rStart = new Date(r.start);
    var rEnd = new Date(r.returnDate || r.start);
    if (rStart <= end && rEnd >= start) {
      var it = (r.items || []).find(function(it) { return it.name === itemName; });
      if (it) maxBooked += (it.qty || 1);
    }
  });
  return { total: totalStock, booked: maxBooked, available: Math.max(0, totalStock - maxBooked) };
}

// Countdown text
function _countdown(dateStr) {
  if (!dateStr) return '';
  var now = new Date(); now.setHours(0, 0, 0, 0);
  var target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  var diff = Math.round((target - now) / 864e5);
  if (diff < 0) return '<span style="color:var(--red)">' + Math.abs(diff) + 'd ago</span>';
  if (diff === 0) return '<span style="color:var(--amber);font-weight:600">Today</span>';
  if (diff === 1) return '<span style="color:var(--amber)">Tomorrow</span>';
  return '<span style="color:var(--green)">' + diff + 'd left</span>';
}

function _rentalStatusClass(s) {
  return { 'Active': 'pg_', 'Returned': 'pp_', 'Overdue': 'pr_', 'Cancelled': 'pa_', 'Upcoming': 'pb_' }[s] || 'pa_';
}

// Derive booking status purely from dates — never rely on stored status for Upcoming/Active/Overdue.
// Cancelled and Returned are manual states that must be preserved.
function _bookingStatus(r) {
  if (r.status === 'Cancelled' || r.status === 'Returned') return r.status;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var start = r.start ? new Date(r.start) : null;
  var ret   = r.returnDate ? new Date(r.returnDate) : null;
  if (start) { start.setHours(0, 0, 0, 0); }
  if (ret)   { ret.setHours(0, 0, 0, 0); }
  if (start && start > today) return 'Upcoming';
  if (ret && ret < today)     return 'Overdue';
  return 'Active';
}

// ════════════════════════════════════════════════════════════════════════
// MAIN RENDER
// ════════════════════════════════════════════════════════════════════════
function renderRentals() {
  // Derive and persist statuses from dates (never mutate Cancelled/Returned)
  var changed = false;
  DB.rentals.forEach(function(r) {
    var derived = _bookingStatus(r);
    if (r.status !== derived) { r.status = derived; changed = true; }
  });
  if (changed) saveDBFn();

  var active = DB.rentals.filter(function(r) { return r.status === 'Active'; }).length;
  var upcoming = DB.rentals.filter(function(r) { return r.status === 'Upcoming'; }).length;
  document.getElementById('rental-sub').textContent = DB.rentals.length + ' bookings · ' + active + ' active · ' + upcoming + ' upcoming';

  var rev = DB.rentals.filter(function(r) { return r.status === 'Returned'; }).reduce(function(s, r) { return s + (r.total || 0); }, 0);
  document.getElementById('rental-kpis').innerHTML =
    '<div class="kc"><div class="kl">Active</div><div class="kv" style="color:var(--amber)">' + active + '</div></div>' +
    '<div class="kc"><div class="kl">Upcoming</div><div class="kv" style="color:var(--blue)">' + upcoming + '</div></div>' +
    '<div class="kc"><div class="kl">Returned</div><div class="kv" style="color:var(--green)">' + DB.rentals.filter(function(r) { return r.status === 'Returned'; }).length + '</div></div>' +
    '<div class="kc"><div class="kl">Revenue</div><div class="kv" style="color:var(--green);font-size:15px">' + rp(rev) + '</div></div>';

  var wrap = document.getElementById('rental-tab-content');
  if (rentalTab === 0) renderRentalDashboard(wrap);
  else if (rentalTab === 1) renderRentalBookings(wrap);
  else if (rentalTab === 2) renderSuratJalanTab(wrap);
  else if (rentalTab === 3) renderCrewTab(wrap);
}

// ════════════════════════════════════════════════════════════════════════
// TAB 0: DASHBOARD
// ════════════════════════════════════════════════════════════════════════
function renderRentalDashboard(wrap) {
  var today = new Date().toISOString().slice(0, 10);
  var upcoming = DB.rentals.filter(function(r) { return r.status === 'Upcoming' || r.status === 'Active'; })
    .sort(function(a, b) { return new Date(a.start) - new Date(b.start); });
  var items = DB.inventoryItems || [];

  var html = '';

  // ── Upcoming / Active cards ──
  html += '<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px">📅 Active & Upcoming Bookings</div>';
  if (!upcoming.length) {
    html += '<div class="empty">No active or upcoming bookings.</div>';
  } else {
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">';
    upcoming.forEach(function(r) {
      var c = _getBookingClient(r);
      var sc = _rentalStatusClass(r.status);
      var itemsList = (r.items || []).map(function(it) { return it.name + '×' + (it.qty || 1); }).join(', ') || r.equipment || '—';
      html += '<div class="card-item" style="cursor:pointer" onclick="viewBookingDetail(' + r.id + ')">' +
        '<div class="card-item-header"><div>' +
        '<div class="card-item-title" style="color:var(--accent)">' + _bookingNum(r) + '</div>' +
        '<div class="card-item-sub">' + (c ? c.name : '—') + '</div></div>' +
        '<span class="pill ' + sc + '">' + r.status + '</span></div>' +
        '<div class="card-item-row"><span class="card-item-label">Items</span><span class="card-item-val" style="font-size:10px">' + itemsList + '</span></div>' +
        '<div class="card-item-row"><span class="card-item-label">Period</span><span class="card-item-val">' + fmtDate(r.start) + ' → ' + fmtDate(r.returnDate) + '</span></div>' +
        '<div class="card-item-row"><span class="card-item-label">Countdown</span><span class="card-item-val">' + _countdown(r.start) + '</span></div>' +
        (r.crew ? '<div class="card-item-row"><span class="card-item-label">Crew</span><span class="card-item-val">👥 Yes</span></div>' : '') +
        (r.delivery ? '<div class="card-item-row"><span class="card-item-label">Delivery</span><span class="card-item-val">🚚 Yes</span></div>' : '') +
        '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // ── Inventory availability ──
  html += '<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px">📦 Equipment Availability (Today)</div>';
  if (!items.length) {
    html += '<div class="empty">No inventory items. Add items first.</div>';
  } else {
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">';
    items.forEach(function(inv) {
      var avail = getItemAvailability(inv.name, today, today);
      var availColor = avail.available > 0 ? 'var(--green)' : 'var(--red)';
      html += '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div style="font-size:11px;font-weight:500">' + inv.name + '</div>' +
        '<span style="font-size:10px;color:' + availColor + ';font-weight:600">' + avail.available + '/' + avail.total + '</span></div>' +
        '<div style="font-size:9px;color:var(--text3);margin-top:2px">' + (inv.category || '—') + ' · ' + (inv.condition || 'Good') + '</div></div>';
    });
    html += '</div>';
  }
  html += '</div>';

  wrap.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════════════
// TAB 1: BOOKINGS LIST
// ════════════════════════════════════════════════════════════════════════
function renderRentalBookings(wrap) {
  var data = DB.rentals.slice().sort(function(a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
  if (!data.length) { wrap.innerHTML = '<div class="empty">No bookings yet.</div>'; return; }

  var tblRows = data.map(function(r) {
    var c = _getBookingClient(r);
    var sc = _rentalStatusClass(r.status);
    var itemsList = (r.items || []).map(function(it) { return it.name + '×' + (it.qty || 1); }).join(', ') || r.equipment || '—';
    var durLabel = r.durationType && r.durationType !== 'custom' ? r.durationType + 'h' : (r.days || '?') + 'd';
    return '<tr>' +
      '<td style="color:var(--accent);font-weight:500">' + _bookingNum(r) + '</td>' +
      '<td>' + (c ? c.name : '—') + '</td>' +
      '<td style="font-size:10px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + itemsList + '">' + itemsList + '</td>' +
      '<td class="tc">' + fmtDate(r.start) + '</td>' +
      '<td class="tc">' + fmtDate(r.returnDate) + '</td>' +
      '<td class="tc">' + durLabel + '</td>' +
      '<td><span class="pill ' + sc + '">' + r.status + '</span></td>' +
      '<td style="color:var(--green)">' + rp(r.total || 0) + '</td>' +
      '<td><div style="display:flex;gap:4px;flex-wrap:wrap">' +
      '<button class="btn-o btn-xs" onclick="viewBookingDetail(' + r.id + ')">View</button>' +
      '<button class="btn-o btn-xs" onclick="openEditBooking(' + r.id + ')">✎</button>' +
      (r.status === 'Active' || r.status === 'Overdue' ? '<button class="btn btn-xs" style="background:var(--green)" onclick="markBookingDone(' + r.id + ')">✓ Done</button>' : '') +
      (r.status !== 'Returned' && r.status !== 'Cancelled' ? '<button class="btn-o btn-xs" onclick="createBookingQuote(' + r.id + ')">📋</button>' : '') +
      '<button class="btn-o btn-xs" onclick="createSuratJalan(' + r.id + ')">📄</button>' +
      '<button class="btn-danger btn-xs" onclick="deleteBooking(' + r.id + ')">✕</button>' +
      '</div></td></tr>';
  }).join('');

  var cardRows = data.map(function(r) {
    var c = _getBookingClient(r);
    var sc = _rentalStatusClass(r.status);
    var itemsList = (r.items || []).map(function(it) { return it.name + '×' + (it.qty || 1); }).join(', ') || r.equipment || '—';
    return '<div class="card-item">' +
      '<div class="card-item-header"><div>' +
      '<div class="card-item-title" style="color:var(--accent)">' + _bookingNum(r) + '</div>' +
      '<div class="card-item-sub">' + (c ? c.name : '—') + (r.crew ? ' · 👥' : '') + (r.delivery ? ' · 🚚' : '') + '</div></div>' +
      '<span class="pill ' + sc + '">' + r.status + '</span></div>' +
      '<div class="card-item-row"><span class="card-item-label">Items</span><span class="card-item-val" style="font-size:10px">' + itemsList + '</span></div>' +
      '<div class="card-item-row"><span class="card-item-label">Period</span><span class="card-item-val">' + fmtDate(r.start) + ' → ' + fmtDate(r.returnDate) + '</span></div>' +
      '<div class="card-item-row"><span class="card-item-label">Total</span><span class="card-item-val" style="color:var(--green);font-weight:600">' + rp(r.total || 0) + '</span></div>' +
      '<div class="card-item-actions">' +
      '<button class="btn-o btn-xs" onclick="viewBookingDetail(' + r.id + ')">View</button>' +
      '<button class="btn-o btn-xs" onclick="openEditBooking(' + r.id + ')">✎</button>' +
      (r.status === 'Active' || r.status === 'Overdue' ? '<button class="btn btn-xs" style="background:var(--green)" onclick="markBookingDone(' + r.id + ')">✓ Done</button>' : '') +
      '<button class="btn-o btn-xs" onclick="createBookingQuote(' + r.id + ')">📋</button>' +
      '<button class="btn-o btn-xs" onclick="createSuratJalan(' + r.id + ')">📄</button>' +
      '<button class="btn-danger btn-xs" onclick="deleteBooking(' + r.id + ')">✕</button>' +
      '</div></div>';
  }).join('');

  wrap.innerHTML =
    '<div class="tw"><table class="tbl"><thead><tr><th>#</th><th>Client</th><th>Items</th><th>Start</th><th>Return</th><th>Dur</th><th>Status</th><th>Total</th><th>Action</th></tr></thead><tbody>' + tblRows + '</tbody></table></div>' +
    '<div class="card-list">' + cardRows + '</div>';
}

// ════════════════════════════════════════════════════════════════════════
// TAB 2: SURAT JALAN
// ════════════════════════════════════════════════════════════════════════
function renderSuratJalanTab(wrap) {
  if (!DB.suratJalan) DB.suratJalan = [];
  var data = DB.suratJalan.slice().sort(function(a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
  if (!data.length) { wrap.innerHTML = '<div class="empty">No surat jalan yet. Create one from a booking.</div>'; return; }

  var rows = data.map(function(sj) {
    var r = DB.rentals.find(function(x) { return x.id === sj.bookingId; });
    var c = r ? _getBookingClient(r) : null;
    return '<div class="card-item">' +
      '<div class="card-item-header"><div>' +
      '<div class="card-item-title" style="color:var(--accent)">' + _sjNum(sj) + '</div>' +
      '<div class="card-item-sub">' + (c ? c.name : '—') + ' · ' + (r ? _bookingNum(r) : '—') + '</div></div>' +
      '<span class="pill pb_">' + (sj.type === 'crew' ? '👥 Crew' : '📦 Client') + '</span></div>' +
      '<div class="card-item-row"><span class="card-item-label">Date</span><span class="card-item-val">' + fmtDate(sj.createdAt) + '</span></div>' +
      '<div class="card-item-row"><span class="card-item-label">Items</span><span class="card-item-val" style="font-size:10px">' + (sj.items || []).map(function(it) { return it.name + '×' + it.qty; }).join(', ') + '</span></div>' +
      '<div class="card-item-actions">' +
      '<button class="btn btn-xs" onclick="downloadSuratJalanPDF(' + sj.id + ')">📥 PDF</button>' +
      '<button class="btn-danger btn-xs" onclick="deleteSuratJalan(' + sj.id + ')">✕</button></div></div>';
  }).join('');

  wrap.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">' + rows + '</div>';
}

// ════════════════════════════════════════════════════════════════════════
// TAB 3: CREW DATABASE
// ════════════════════════════════════════════════════════════════════════
function renderCrewTab(wrap) {
  if (!DB.crewMembers) DB.crewMembers = [];
  var crew = DB.crewMembers;
  var today = new Date().toISOString().slice(0, 10);

  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
    '<span style="font-size:11px;color:var(--text3)">' + crew.length + ' crew member' + (crew.length !== 1 ? 's' : '') + '</span>' +
    '<button class="btn btn-xs" onclick="openModal(\'modal-crew\')">+ Add Crew</button></div>';

  if (!crew.length) {
    html += '<div class="empty">No crew members yet.</div>';
  } else {
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">';
    crew.forEach(function(cr) {
      var assignedBookings = DB.rentals.filter(function(r) {
        return (r.status === 'Active' || r.status === 'Upcoming') &&
          (r.crewIds || []).indexOf(cr.id) >= 0 &&
          r.start <= today && (r.returnDate || r.start) >= today;
      });
      var isAvailable = assignedBookings.length === 0;
      var statusColor = isAvailable ? 'var(--green)' : 'var(--amber)';
      var statusText = isAvailable ? '✓ Available' : '⚡ Booked (' + assignedBookings.length + ')';

      var upcomingBookings = DB.rentals.filter(function(r) {
        return (r.status === 'Active' || r.status === 'Upcoming') && (r.crewIds || []).indexOf(cr.id) >= 0;
      });

      html += '<div class="card-item">' +
        '<div class="card-item-header"><div>' +
        '<div class="card-item-title" style="display:flex;align-items:center;gap:8px">' +
        '<div class="av" style="background:' + avColor(cr.name) + '22;color:' + avColor(cr.name) + ';width:28px;height:28px;font-size:10px">' + initials(cr.name) + '</div>' +
        cr.name + '</div>' +
        '<div class="card-item-sub">' + (cr.phone || '—') + '</div></div>' +
        '<span style="font-size:10px;font-weight:600;color:' + statusColor + '">' + statusText + '</span></div>' +
        '<div class="card-item-row"><span class="card-item-label">Role</span><span class="card-item-val">' + (cr.role || 'Crew') + '</span></div>' +
        (upcomingBookings.length ? '<div class="card-item-row"><span class="card-item-label">Assigned</span><span class="card-item-val" style="font-size:10px">' + upcomingBookings.map(function(r) { return _bookingNum(r); }).join(', ') + '</span></div>' : '') +
        '<div class="card-item-actions">' +
        '<button class="btn-o btn-xs" onclick="openEditCrew(' + cr.id + ')">✎ Edit</button>' +
        '<button class="btn-danger btn-xs" onclick="deleteCrew(' + cr.id + ')">✕</button></div></div>';
    });
    html += '</div>';
  }

  wrap.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════════════
// INVENTORY PANEL
// ════════════════════════════════════════════════════════════════════════
function renderInventory() {
  var items = DB.inventoryItems || [];
  var body = document.getElementById('inventory-body');
  if (!body) return;
  var today = new Date().toISOString().slice(0, 10);
  if (!items.length) { body.innerHTML = '<div class="empty" style="padding:20px">No inventory items yet.</div>'; return; }
  body.innerHTML = items.map(function(e) {
    var avail = getItemAvailability(e.name, today, today);
    return '<div class="lr" style="padding:8px 12px">' +
      '<div><div style="font-size:11px;font-weight:500">' + e.name + '</div>' +
      '<div class="td-s">' + e.category + ' · Qty: ' + (e.qty || 1) + ' · ' + (e.condition || 'Good') + '</div></div>' +
      '<div style="text-align:right">' +
      '<div style="font-size:10px;color:' + (avail.available > 0 ? 'var(--green)' : 'var(--red)') + ';font-weight:600">' + avail.available + ' avail</div>' +
      '<div style="font-size:9px;color:var(--text3)">' + avail.booked + ' booked</div></div></div>';
  }).join('');
}

// ════════════════════════════════════════════════════════════════════════
// BOOKING DETAIL VIEW (uses modal-detail)
// ════════════════════════════════════════════════════════════════════════
function viewBookingDetail(id) {
  var r = DB.rentals.find(function(x) { return x.id === id; }); if (!r) return;
  var c = _getBookingClient(r);
  var itemsList = (r.items || []).map(function(it, i) {
    return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)"><span>' + it.name + '</span><span>×' + (it.qty || 1) + (it.price ? ' @ ' + rp(it.price) : '') + '</span></div>';
  }).join('') || '<div class="td-s">No items</div>';

  var crewNames = (r.crewIds || []).map(function(cid) {
    var cr = (DB.crewMembers || []).find(function(x) { return x.id === cid; });
    return cr ? cr.name : '?';
  }).join(', ') || '—';

  // Related quotes & invoices
  var related = DB.invoices.filter(function(i) { return i.bookingId === id; });
  var relatedHtml = related.length ? related.map(function(inv) {
    var num = getInvNum(inv);
    var sc = _statusClass(inv.status);
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)">' +
      '<div><span style="color:var(--accent);font-weight:500;cursor:pointer" onclick="closeModal(\'modal-detail\');setTimeout(function(){viewInvoice(' + inv.id + ')},200)">' + num + '</span> <span class="pill ' + sc + '" style="font-size:9px">' + inv.status + '</span></div>' +
      '<span style="color:var(--green)">' + rp(inv.total) + '</span></div>';
  }).join('') : '<div class="td-s">No quotes or invoices yet.</div>';

  // Related surat jalan
  var relatedSJ = (DB.suratJalan || []).filter(function(sj) { return sj.bookingId === id; });
  var sjHtml = relatedSJ.length ? relatedSJ.map(function(sj) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)">' +
      '<span style="color:var(--accent)">' + _sjNum(sj) + ' (' + sj.type + ')</span>' +
      '<button class="btn-o btn-xs" onclick="downloadSuratJalanPDF(' + sj.id + ')">📥 PDF</button></div>';
  }).join('') : '<div class="td-s">No surat jalan yet.</div>';

  var html =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
    '<div><div style="font-size:16px;font-weight:700;color:var(--accent)">' + _bookingNum(r) + '</div>' +
    '<div style="color:var(--text3);font-size:11px">' + (c ? c.name : '—') + '</div></div>' +
    '<span class="pill ' + _rentalStatusClass(r.status) + '" style="font-size:11px">' + r.status + '</span></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
    '<div><div class="td-s">Start</div><div style="font-size:11px">' + fmtDate(r.start) + '</div></div>' +
    '<div><div class="td-s">Return</div><div style="font-size:11px">' + fmtDate(r.returnDate) + '</div></div>' +
    '<div><div class="td-s">Duration</div><div style="font-size:11px">' + (r.durationType && r.durationType !== 'custom' ? r.durationType + 'h' : (r.days || '?') + ' days') + '</div></div>' +
    '<div><div class="td-s">Total</div><div style="font-size:11px;color:var(--green);font-weight:600">' + rp(r.total || 0) + '</div></div></div>' +
    '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Items</div>' + itemsList + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
    '<div><div class="td-s">Crew</div><div style="font-size:11px">' + (r.crew ? '✓ Yes' : '✕ No') + '</div></div>' +
    '<div><div class="td-s">Delivery</div><div style="font-size:11px">' + (r.delivery ? '✓ Yes' : '✕ No') + '</div></div>' +
    '<div><div class="td-s">Crew Assigned</div><div style="font-size:11px">' + crewNames + '</div></div>' +
    '<div><div class="td-s">Address</div><div style="font-size:11px">' + (r.address || '—') + '</div></div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
    '<div><div class="td-s">Contact Person</div><div style="font-size:11px">' + (r.contactName || '—') + '</div></div>' +
    '<div><div class="td-s">Contact Phone</div><div style="font-size:11px">' + (r.contactPhone || '—') + '</div></div></div>' +
    (r.notes ? '<div style="margin-bottom:10px"><div class="td-s">Notes</div><div style="font-size:11px">' + r.notes + '</div></div>' : '') +
    '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Quotes & Invoices</div>' + relatedHtml + '</div>' +
    '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Surat Jalan</div>' + sjHtml + '</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">' +
    '<button class="btn-o btn-xs" onclick="closeModal(\'modal-detail\');openEditBooking(' + r.id + ')">✎ Edit</button>' +
    (r.status === 'Active' || r.status === 'Overdue' ? '<button class="btn btn-xs" style="background:var(--green)" onclick="closeModal(\'modal-detail\');markBookingDone(' + r.id + ')">✓ Mark Done</button>' : '') +
    '<button class="btn-o btn-xs" onclick="closeModal(\'modal-detail\');createBookingQuote(' + r.id + ')">📋 Create Quote</button>' +
    '<button class="btn-o btn-xs" onclick="closeModal(\'modal-detail\');createSuratJalan(' + r.id + ')">📄 Surat Jalan</button></div>';

  document.getElementById('detail-body').innerHTML = html;
  document.querySelector('#modal-detail .mt').textContent = 'Booking Detail';
  openModal('modal-detail');
}

// ════════════════════════════════════════════════════════════════════════
// BOOKING ACTIONS
// ════════════════════════════════════════════════════════════════════════
function markBookingDone(id) {
  var r = DB.rentals.find(function(x) { return x.id === id; }); if (!r) return;
  r.status = 'Returned';
  r.returnedAt = new Date().toISOString();
  addActivityLog('Rental', 'Returned', _bookingNum(r), 'rental');
  triggerSaveWithFeedback('Marking booking done…');
  renderRentals(); if (typeof renderDash === 'function') renderDash();
}

function deleteBooking(id) {
  if (!confirm('Delete this booking?')) return;
  DB.rentals = DB.rentals.filter(function(x) { return x.id !== id; });
  saveDBFn(); renderRentals(); if (typeof renderDash === 'function') renderDash();
}

// ════════════════════════════════════════════════════════════════════════
// CREATE QUOTE FROM BOOKING
// ════════════════════════════════════════════════════════════════════════
function createBookingQuote(bookingId) {
  var r = DB.rentals.find(function(x) { return x.id === bookingId; }); if (!r) return;
  openModal('modal-quote');
  setTimeout(function() {
    // Set category to Rental first — this populates the booking dropdown
    var cat = document.getElementById('qt-category'); if (cat) cat.value = 'Rental';
    if (typeof onQtCategoryChange === 'function') onQtCategoryChange();

    // Set client via the new search bar
    var clientObj = DB.clients.find(function(c) { return c.id === r.clientId; });
    if (clientObj) {
      var sel = document.getElementById('qt-client');
      if (sel) {
        if (!Array.from(sel.options).find(function(o){return o.value==clientObj.id;})) {
          var opt = document.createElement('option'); opt.value = clientObj.id; opt.text = clientObj.name; sel.appendChild(opt);
        }
        sel.value = clientObj.id;
      }
      var inp = document.getElementById('qt-client-search');
      if (inp) inp.value = clientObj.name;
    }

    // Pre-select the booking in the second dropdown
    var bkSel = document.getElementById('qt-project');
    if (bkSel) bkSel.value = bookingId;

    // Pre-fill items from booking
    qtItems = [];
    document.getElementById('qt-items').innerHTML = '';
    (r.items || []).forEach(function(it, idx) {
      addQtItem();
      var row = document.getElementById('qt-items').children[idx];
      if (!row) return;
      var descIn = row.querySelector('input[placeholder="Description"]');
      var qtyIn = row.querySelectorAll('input[type="number"]')[0];
      var priceIn = row.querySelector('input[inputmode="numeric"]');
      if (descIn) { descIn.value = it.name + (r.days ? ' (' + r.days + ' day' + (r.days > 1 ? 's' : '') + ')' : ''); qtItems[idx].desc = descIn.value; }
      if (qtyIn) { qtyIn.value = it.qty || 1; qtItems[idx].qty = it.qty || 1; }
      if (priceIn && it.price) {
        var p = it.price * (r.days || 1);
        priceIn.value = p.toLocaleString('en-US');
        priceIn.dataset.raw = String(p);
        qtItems[idx].price = p;
      }
    });
    // Store bookingId so saveQuote can link it as fallback
    var mqEl = document.getElementById('modal-quote');
    if (mqEl) mqEl.dataset.bookingId = bookingId;
    calcQtTotal();
  }, 120);
}

// ════════════════════════════════════════════════════════════════════════
// SURAT JALAN
// ════════════════════════════════════════════════════════════════════════
function createSuratJalan(bookingId) {
  var r = DB.rentals.find(function(x) { return x.id === bookingId; }); if (!r) return;
  if (!DB.suratJalan) DB.suratJalan = [];
  if (!DB.nextId.sj) DB.nextId.sj = 1;

  var type = r.crew ? (confirm('Create Surat Jalan for:\n\n[OK] = Client\n[Cancel] = Crew') ? 'client' : 'crew') : 'client';

  var c = _getBookingClient(r);
  var crewNames = (r.crewIds || []).map(function(cid) {
    var cr = (DB.crewMembers || []).find(function(x) { return x.id === cid; });
    return cr ? cr.name : '?';
  });

  var sj = {
    id: DB.nextId.sj++,
    bookingId: r.id,
    type: type,
    clientName: c ? c.name : '—',
    contactName: r.contactName || '',
    contactPhone: r.contactPhone || '',
    address: r.address || '',
    items: (r.items || []).map(function(it) { return { name: it.name, qty: it.qty || 1 }; }),
    crew: type === 'crew' ? crewNames : [],
    startDate: r.start,
    returnDate: r.returnDate,
    notes: r.notes || '',
    createdAt: new Date().toISOString(),
    createdBy: currentUser
  };
  DB.suratJalan.push(sj);
  if (typeof _saveCacheDB === 'function') _saveCacheDB();
  addActivityLog('Surat Jalan', 'Created', _sjNum(sj), 'rental');
  triggerSaveWithFeedback('Creating surat jalan…', function() {
    setTimeout(function() { downloadSuratJalanPDF(sj.id); }, 200);
  });
  renderRentals();
}

function deleteSuratJalan(id) {
  if (!confirm('Delete this surat jalan?')) return;
  DB.suratJalan = (DB.suratJalan || []).filter(function(x) { return x.id !== id; });
  saveDBFn(); renderRentals();
}

function downloadSuratJalanPDF(id) {
  var sj = (DB.suratJalan || []).find(function(x) { return x.id === id; }); if (!sj) return;
  var r = DB.rentals.find(function(x) { return x.id === sj.bookingId; });
  var settings = DB.settings || {};

  var itemRows = (sj.items || []).map(function(it, i) {
    return '<tr><td style="border:1px solid #ccc;padding:6px;text-align:center">' + (i + 1) + '</td><td style="border:1px solid #ccc;padding:6px">' + it.name + '</td><td style="border:1px solid #ccc;padding:6px;text-align:center">' + it.qty + '</td></tr>';
  }).join('');

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Surat Jalan ' + _sjNum(sj) + '</title>' +
    '<style>body{font-family:"Segoe UI",sans-serif;padding:40px;font-size:12px;color:#333}' +
    'h1{font-size:18px;margin:0}h2{font-size:14px;color:#666;margin:4px 0 20px}' +
    'table{border-collapse:collapse;width:100%}th{background:#f5f5f5;border:1px solid #ccc;padding:6px;text-align:left;font-size:11px}' +
    '.info{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}' +
    '.info div{font-size:11px}.info .lbl{color:#888;font-size:10px;text-transform:uppercase}' +
    '.sign{display:flex;justify-content:space-between;margin-top:60px}' +
    '.sign div{text-align:center;width:200px}.sign .line{border-top:1px solid #333;margin-top:60px;padding-top:4px}' +
    '@media print{body{padding:20px}}</style></head><body>' +
    '<h1>' + (settings.name || 'House of EXP') + '</h1>' +
    '<h2>SURAT JALAN — ' + _sjNum(sj) + ' ' + (sj.type === 'crew' ? '(Crew Copy)' : '(Client Copy)') + '</h2>' +
    '<div class="info">' +
    '<div><div class="lbl">Client</div>' + sj.clientName + '</div>' +
    '<div><div class="lbl">Booking</div>' + (r ? _bookingNum(r) : '—') + '</div>' +
    '<div><div class="lbl">Contact Person</div>' + (sj.contactName || '—') + (sj.contactPhone ? ' · ' + sj.contactPhone : '') + '</div>' +
    '<div><div class="lbl">Address</div>' + (sj.address || '—') + '</div>' +
    '<div><div class="lbl">Start Date</div>' + (sj.startDate || '—') + '</div>' +
    '<div><div class="lbl">Return Date</div>' + (sj.returnDate || '—') + '</div></div>' +
    '<table><thead><tr><th>No</th><th>Item</th><th>Qty</th></tr></thead><tbody>' + itemRows + '</tbody></table>' +
    (sj.crew && sj.crew.length ? '<div style="margin-top:20px"><div class="lbl">Crew</div><div style="font-size:11px">' + sj.crew.join(', ') + '</div></div>' : '') +
    (sj.notes ? '<div style="margin-top:12px"><div class="lbl">Notes</div><div style="font-size:11px">' + sj.notes + '</div></div>' : '') +
    '<div class="sign"><div>Pengirim<div class="line">(' + (settings.name || 'House of EXP') + ')</div></div>' +
    '<div>Penerima<div class="line">(' + sj.clientName + ')</div></div></div>' +
    '<script>window.onload=function(){window.print()}<\/script></body></html>';

  var w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// ════════════════════════════════════════════════════════════════════════
// CREW MANAGEMENT
// ════════════════════════════════════════════════════════════════════════
function saveCrew() {
  if (!DB.crewMembers) DB.crewMembers = [];
  if (!DB.nextId.cr) DB.nextId.cr = 1;
  var name = document.getElementById('cr-name').value.trim();
  var phone = document.getElementById('cr-phone').value.trim();
  var role = document.getElementById('cr-role').value.trim() || 'Crew';
  if (!name) { alert('Name required'); return; }
  DB.crewMembers.push({ id: DB.nextId.cr++, name: name, phone: phone, role: role, createdBy: currentUser, createdAt: new Date().toISOString() });
  if (typeof _saveCacheDB === 'function') _saveCacheDB();
  closeModal('modal-crew');
  addActivityLog('Crew', 'Added', name, 'rental');
  triggerSaveWithFeedback('Saving crew…');
  renderRentals();
}

function openEditCrew(id) {
  var cr = (DB.crewMembers || []).find(function(x) { return x.id === id; }); if (!cr) return;
  document.getElementById('ecr-id').value = id;
  document.getElementById('ecr-name').value = cr.name;
  document.getElementById('ecr-phone').value = cr.phone || '';
  document.getElementById('ecr-role').value = cr.role || 'Crew';
  openModal('modal-edit-crew');
}

function updateCrew() {
  var id = parseInt(document.getElementById('ecr-id').value);
  var cr = (DB.crewMembers || []).find(function(x) { return x.id === id; }); if (!cr) return;
  cr.name = document.getElementById('ecr-name').value.trim() || cr.name;
  cr.phone = document.getElementById('ecr-phone').value.trim();
  cr.role = document.getElementById('ecr-role').value.trim() || 'Crew';
  closeModal('modal-edit-crew');
  addActivityLog('Crew', 'Edited', cr.name, 'rental');
  triggerSaveWithFeedback('Updating crew…');
  renderRentals();
}

function deleteCrew(id) {
  if (!confirm('Delete this crew member?')) return;
  DB.crewMembers = (DB.crewMembers || []).filter(function(x) { return x.id !== id; });
  DB.rentals.forEach(function(r) { if (r.crewIds) r.crewIds = r.crewIds.filter(function(c) { return c !== id; }); });
  addActivityLog('Crew', 'Deleted', String(id), 'rental');
  saveDBFn(); renderRentals();
}

function toggleCrewAssign(bookingId, crewId) {
  var r = DB.rentals.find(function(x) { return x.id === bookingId; }); if (!r) return;
  if (!r.crewIds) r.crewIds = [];
  var idx = r.crewIds.indexOf(crewId);
  if (idx >= 0) r.crewIds.splice(idx, 1); else r.crewIds.push(crewId);
  addActivityLog('Rental', 'Edited', _bookingNum(r) + ' crew assignment', 'rental');
  saveDBFn();
}
