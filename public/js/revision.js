// ════════ FEEDBACK BOARD ════════
// Feedback is now embedded in Studio tab 3.
// renderRevisionBoard() navigates there for backward compat (dashboard link).

let _fbEditId = null;

function renderRevisionBoard() {
  // Navigate to Studio → Feedback tab
  nav('studio');
  setTimeout(() => { switchStudioTab(null, 3); }, 0);
}

function moveFeedback(id, dir) {
  const f = (DB.feedbacks || []).find(x => x.id === id);
  if (!f) return;
  const order = ['To Do', 'Ongoing', 'Done'];
  const idx = order.indexOf(f.status);
  const next = dir === 'forward' ? order[Math.min(idx + 1, 2)] : order[Math.max(idx - 1, 0)];
  f.status = next;
  saveDBFn();
  if (typeof renderStudioContent === 'function') renderStudioContent();
}

function openFeedbackModal(id) {
  const required = ['fb-title','fb-query','fb-assignee','fb-due','fb-project','fb-phase','fb-status','fb-modal-title','fb-delete-btn'];
  const missing = required.filter(fid => !document.getElementById(fid));
  if (missing.length) {
    console.error('[openFeedbackModal] Missing elements:', missing);
    if (typeof showToast === 'function') showToast('Feedback modal not ready. Please reload.', 'error');
    return;
  }

  _fbEditId = id;
  const f = id ? (DB.feedbacks || []).find(x => x.id === id) : null;

  const projOpts = DB.projects.map(p => `<option value="${p.id}" ${f && f.projectId === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
  const userOpts = USERS.map(u => `<option value="${u.id}" ${f && f.assignee === u.id ? 'selected' : ''}>${u.name}</option>`).join('');

  document.getElementById('fb-title').value = f ? f.title : '';
  document.getElementById('fb-query').value = f ? f.query : '';
  document.getElementById('fb-assignee').innerHTML = `<option value="">— Unassigned —</option>${userOpts}`;
  if (f) document.getElementById('fb-assignee').value = f.assignee || '';
  document.getElementById('fb-due').value = f ? f.dueDate : '';
  document.getElementById('fb-project').innerHTML = `<option value="">— No project —</option>${projOpts}`;
  if (f) document.getElementById('fb-project').value = f.projectId || '';
  document.getElementById('fb-phase').value = f ? f.revisionPhase : '';
  document.getElementById('fb-status').value = f ? f.status : 'To Do';
  setRTEValue('fb-desc', f ? f.description : '');
  document.getElementById('fb-modal-title').textContent = f ? 'Edit Feedback' : 'New Feedback';
  document.getElementById('fb-delete-btn').style.display = f ? '' : 'none';
  openModal('modal-feedback');
}

function saveFeedback() {
  const title = document.getElementById('fb-title').value.trim();
  if (!title) { showToast('Title is required', 'error'); return; }
  const projVal = document.getElementById('fb-project').value;
  if (_fbEditId) {
    const f = (DB.feedbacks || []).find(x => x.id === _fbEditId);
    if (f) {
      f.title = title;
      f.query = document.getElementById('fb-query').value.trim();
      f.assignee = document.getElementById('fb-assignee').value;
      f.dueDate = document.getElementById('fb-due').value;
      f.projectId = projVal ? parseInt(projVal) : null;
      f.revisionPhase = document.getElementById('fb-phase').value.trim();
      f.status = document.getElementById('fb-status').value;
      f.description = document.getElementById('fb-desc').value;
    }
  } else {
    if (!DB.feedbacks) DB.feedbacks = [];
    const newId = DB.nextId.fb || 1;
    DB.feedbacks.push({
      id: newId,
      title,
      query: document.getElementById('fb-query').value.trim(),
      assignee: document.getElementById('fb-assignee').value,
      dueDate: document.getElementById('fb-due').value,
      projectId: projVal ? parseInt(projVal) : null,
      revisionPhase: document.getElementById('fb-phase').value.trim(),
      status: document.getElementById('fb-status').value,
      description: document.getElementById('fb-desc').value,
      createdAt: new Date().toISOString(),
    });
    DB.nextId.fb = newId + 1;
  }
  triggerSaveWithFeedback(_fbEditId ? 'Updating feedback…' : 'Saving feedback…');
  closeModal('modal-feedback');
  if (typeof renderStudioContent === 'function') renderStudioContent();
}

function deleteFeedback() {
  if (!_fbEditId) return;
  if (!confirm('Delete this feedback item?')) return;
  DB.feedbacks = (DB.feedbacks || []).filter(f => f.id !== _fbEditId);
  saveDBFn();
  closeModal('modal-feedback');
  if (typeof renderStudioContent === 'function') renderStudioContent();
  showToast('Feedback deleted', 'success');
}

function viewFeedback(id) {
  const f = (DB.feedbacks || []).find(x => x.id === id); if (!f) return;
  const proj = f.projectId ? DB.projects.find(p => p.id === f.projectId) : null;
  const statusColor = {'To Do':'var(--text3)','Ongoing':'var(--yellow,#f59e0b)','Done':'var(--green)'};
  const sc = statusColor[f.status] || 'var(--text3)';
  const order = ['To Do','Ongoing','Done'];
  const idx = order.indexOf(f.status);
  document.getElementById('detail-title').textContent = f.title || '(Untitled)';
  document.getElementById('detail-body').innerHTML = `<div style="padding:14px 0 0">
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
      <span style="background:${sc}22;color:${sc};border:1px solid ${sc}33;border-radius:4px;padding:2px 8px;font-size:9px;font-weight:600">${f.status}</span>
      ${f.revisionPhase?`<span style="font-size:9px;background:var(--abg);color:var(--accent);padding:2px 8px;border-radius:4px">🔁 ${f.revisionPhase}</span>`:''}
    </div>
    ${f.query?`<div style="background:var(--bg3);border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:11px;color:var(--text2);font-style:italic">"${f.query}"</div>`:''}
    ${f.description?`<div style="font-size:11px;color:var(--text2);margin-bottom:10px;line-height:1.5">${f.description}</div>`:''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      ${proj?`<div style="background:var(--bg3);border-radius:6px;padding:8px"><div style="font-size:9px;color:var(--text3);margin-bottom:2px">PROJECT</div><div style="font-size:11px;color:var(--text2)">📁 ${proj.name}</div></div>`:''}
      ${f.assignee?`<div style="background:var(--bg3);border-radius:6px;padding:8px"><div style="font-size:9px;color:var(--text3);margin-bottom:2px">ASSIGNEE</div><div style="font-size:11px;color:var(--text2)">👤 ${getUserName(f.assignee)}</div></div>`:''}
      ${f.dueDate?`<div style="background:var(--bg3);border-radius:6px;padding:8px"><div style="font-size:9px;color:var(--text3);margin-bottom:2px">DUE DATE</div><div style="font-size:11px;color:var(--text2)">📅 ${fmtDate(f.dueDate)}</div></div>`:''}
    </div>
    <div style="font-size:9px;color:var(--text3)">Created ${fmtDate(f.createdAt)}</div>
  </div>`;
  document.getElementById('detail-actions').innerHTML = `
    <button class="btn-o" onclick="closeModal('modal-detail')">Close</button>
    ${idx > 0 ? `<button class="btn-o" onclick="moveFeedback(${f.id},'back');closeModal('modal-detail');renderStudioContent()">← ${order[idx-1]}</button>` : ''}
    ${idx < 2 ? `<button class="btn-o" style="color:${statusColor[order[idx+1]]}" onclick="moveFeedback(${f.id},'forward');closeModal('modal-detail');renderStudioContent()">→ ${order[idx+1]}</button>` : ''}
    <button class="btn" onclick="closeModal('modal-detail');openFeedbackModal(${f.id})">✎ Edit</button>`;
  openModal('modal-detail');
}