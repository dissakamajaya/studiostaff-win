// ════════════════════════════════════════════════════════════
// ACTIVITY LOG — global append-only feed for Recent Activities
// Load this BEFORE saves.js and finance.js in index.html:
//   <script defer src="/js/activityLog.js"></script>
// ════════════════════════════════════════════════════════════

// ── Append one entry to DB.activityLog ───────────────────────
function addActivityLog(type, action, desc, module) {
  if (!DB.activityLog) DB.activityLog = [];
  DB.activityLog.push({
    ts:     new Date().toISOString(),
    user:   currentUser || 'unknown',
    type:   type,    // 'Transaction','Project','Task','Quote','Invoice','Client','Journal',...
    action: action,  // 'Added','Edited','Deleted','Approved','Rejected','Paid','Comment',...
    desc:   desc,    // human-readable description
    module: module,  // 'finance','studio','client','invoice','journal',...
  });
  // Keep latest 500 entries
  if (DB.activityLog.length > 500) DB.activityLog = DB.activityLog.slice(-500);
}

// ── Stub that saves.js already calls for deletes ─────────────
function logDelete(type, desc) {
  addActivityLog(
    type.charAt(0).toUpperCase() + type.slice(1),
    'Deleted',
    desc,
    type
  );
}

// ── One-time backfill from existing data ─────────────────────
// Runs inside migrateDB() — add this call there, or call it here
// after DB is loaded. Uses _actLogBackfilled flag so it only runs once.
function backfillActivityLog() {
  if (DB._actLogBackfilled) return;
  if (!DB.activityLog) DB.activityLog = [];
  if (DB.activityLog.length > 0) { DB._actLogBackfilled = true; return; }

  var entries = [];

  (DB.transactions || []).forEach(function(t) {
    entries.push({ ts: t.createdAt || new Date().toISOString(), user: t.createdBy || 'unknown', type: 'Transaction', action: 'Added', desc: (t.description || '') + ' (' + (t.type || '') + ')', module: 'finance' });
  });
  (DB.projects || []).forEach(function(p) {
    entries.push({ ts: p.createdAt || new Date().toISOString(), user: p.createdBy || currentUser || 'unknown', type: 'Project', action: 'Added', desc: p.name || '', module: 'studio' });
  });
  (DB.tasks || []).forEach(function(t) {
    entries.push({ ts: t.createdAt || new Date().toISOString(), user: t.createdBy || currentUser || 'unknown', type: 'Task', action: 'Added', desc: '"' + (t.title || '') + '" → ' + (t.assignee ? getUserName(t.assignee) : ''), module: 'studio' });
  });
  (DB.invoices || []).forEach(function(i) {
    var label = i.type === 'quote' ? 'Quote' : 'Invoice';
    var num = i.type === 'quote' ? 'QT-' : 'INV-';
    num += String(i.id).padStart(4, '0');
    entries.push({ ts: i.createdAt || new Date().toISOString(), user: i.createdBy || currentUser || 'unknown', type: label, action: 'Added', desc: num + ' — ' + rp(i.total), module: 'invoice' });
    if (i.status === 'Paid') {
      entries.push({ ts: i.updatedAt || i.createdAt || new Date().toISOString(), user: currentUser || 'unknown', type: 'Invoice', action: 'Paid', desc: num + ' — ' + rp(i.total), module: 'invoice' });
    }
    if (i.status === 'Approved') {
      entries.push({ ts: i.updatedAt || i.createdAt || new Date().toISOString(), user: currentUser || 'unknown', type: 'Quote', action: 'Approved', desc: num, module: 'invoice' });
    }
    if (i.status === 'Rejected') {
      entries.push({ ts: i.updatedAt || i.createdAt || new Date().toISOString(), user: currentUser || 'unknown', type: 'Quote', action: 'Rejected', desc: num, module: 'invoice' });
    }
  });
  (DB.clients || []).forEach(function(c) {
    entries.push({ ts: c.createdAt || new Date().toISOString(), user: c.createdBy || currentUser || 'unknown', type: 'Client', action: 'Added', desc: c.name || '', module: 'client' });
  });
  (DB.journals || []).forEach(function(j) {
    entries.push({ ts: j.createdAt || new Date().toISOString(), user: j.createdBy || 'unknown', type: 'Journal', action: 'Added', desc: j.title || '', module: 'journal' });
    (j.comments || []).forEach(function(c) {
      entries.push({ ts: c.createdAt || j.createdAt || new Date().toISOString(), user: c.userId || 'unknown', type: 'Journal', action: 'Comment', desc: '"' + (c.text || '').slice(0, 60) + '"', module: 'journal' });
    });
  });
  (DB.rentals || []).forEach(function(r) {
    entries.push({ ts: r.createdAt || new Date().toISOString(), user: r.createdBy || currentUser || 'unknown', type: 'Rental', action: 'Added', desc: (r.equipment || '') + (r.clientId ? ' — ' + (DB.clients.find(function(c){return c.id===r.clientId;})||{name:''}).name : ''), module: 'rental' });
  });
  (DB.payrolls || []).forEach(function(p) {
    entries.push({ ts: p.createdAt || new Date().toISOString(), user: p.createdBy || currentUser || 'unknown', type: 'Transaction', action: 'Added', desc: 'Payroll — ' + getUserName(p.userId) + ' ' + (p.period || ''), module: 'finance' });
  });
  (DB.debts || []).forEach(function(d) {
    entries.push({ ts: d.createdAt || new Date().toISOString(), user: d.createdBy || currentUser || 'unknown', type: 'Transaction', action: 'Added', desc: 'Debt — ' + (d.description || '') + (d.party ? ' (' + d.party + ')' : ''), module: 'finance' });
  });
  (DB.financeLogs || []).forEach(function(f) {
    entries.push({ ts: f.ts || new Date().toISOString(), user: f.user || 'unknown', type: f.entityType || 'Finance', action: f.action || 'Added', desc: f.description || '', module: 'finance' });
  });
  (DB.waterLogs || []).forEach(function(w) {
    entries.push({ ts: w.timestamp || new Date().toISOString(), user: w.createdBy || currentUser || 'unknown', type: 'Water', action: w.type === 'payment' ? 'Paid' : 'Updated', desc: (w.type === 'request' ? 'Water request' : w.type === 'satisfied' ? 'Water reloaded' : 'Water log') + (w.location ? ' — ' + w.location : ''), module: 'domestic' });
  });
  (DB.reimbursements || []).forEach(function(r) {
    entries.push({ ts: r.createdAt || new Date().toISOString(), user: r.userId || 'unknown', type: 'Reimbursement', action: 'Added', desc: r.description || '', module: 'finance' });
  });
  (DB.leaveNotices || []).forEach(function(l) {
    entries.push({ ts: l.createdAt || new Date().toISOString(), user: l.userId || 'unknown', type: 'Leave', action: l.status || 'Added', desc: l.type || '', module: 'domestic' });
  });
  (DB.feedbacks || []).forEach(function(fb) {
    entries.push({ ts: fb.createdAt || new Date().toISOString(), user: fb.createdBy || currentUser || 'unknown', type: 'Feedback', action: fb.status || 'Added', desc: fb.title || '', module: 'studio' });
  });
  (DB.classes || []).forEach(function(c) {
    entries.push({ ts: c.createdAt || new Date().toISOString(), user: currentUser || 'unknown', type: 'Class', action: 'Added', desc: c.name || '', module: 'academy' });
  });
  (DB.students || []).forEach(function(s) {
    entries.push({ ts: s.createdAt || new Date().toISOString(), user: currentUser || 'unknown', type: 'Student', action: 'Added', desc: s.name || '', module: 'academy' });
  });
  (DB.crewMembers || []).forEach(function(cr) {
    entries.push({ ts: cr.createdAt || new Date().toISOString(), user: cr.createdBy || currentUser || 'unknown', type: 'Crew', action: 'Added', desc: cr.name || '', module: 'rental' });
  });
  (DB.suratJalan || []).forEach(function(sj) {
    entries.push({
      ts: sj.createdAt || new Date().toISOString(),
      user: sj.createdBy || currentUser || 'unknown',
      type: 'Surat Jalan',
      action: 'Added',
      desc: (sj.type === 'crew' ? 'Crew copy' : 'Client copy') + ' — ' + (sj.bookingId ? 'BK-' + String(sj.bookingId).padStart(4, '0') : '—'),
      module: 'rental',
    });
  });

  entries.sort(function(a, b) { return new Date(a.ts) - new Date(b.ts); });
  if (entries.length > 500) entries = entries.slice(-500);

  DB.activityLog = entries;
  DB._actLogBackfilled = true;
  setTimeout(function() { if (typeof saveDBFn === 'function') saveDBFn(); }, 2000);
}

// ── Login / Logout tracking ───────────────────────────────────
async function logLogin(userId, detail) {
  if (!DB.activityLog) DB.activityLog = [];
  DB.activityLog.push({
    ts:     new Date().toISOString(),
    user:   userId,
    type:   'Session',
    action: 'Login',
    desc:   detail || 'Logged in',
    module: 'auth',
  });
  if (DB.activityLog.length > 500) DB.activityLog = DB.activityLog.slice(-500);
  if (typeof saveDBFn === 'function') saveDBFn();
}

async function logLogout(userId) {
  if (!DB.activityLog) DB.activityLog = [];
  DB.activityLog.push({
    ts:     new Date().toISOString(),
    user:   userId,
    type:   'Session',
    action: 'Logout',
    desc:   'Signed out',
    module: 'auth',
  });
  if (DB.activityLog.length > 500) DB.activityLog = DB.activityLog.slice(-500);
  if (typeof saveDBFn === 'function') saveDBFn();
}
