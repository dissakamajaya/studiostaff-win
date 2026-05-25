// ════════ ACTIVITY LOG SYSTEM ════════
const ActivityLog={
  maxEntries:200,
  log(action,details,userId){
    const entry={
      id:Date.now(),
      action,
      details,
      userId:userId||currentUser,
      timestamp:new Date().toISOString()
    };
    if(!DB.activityLog)DB.activityLog=[];
    DB.activityLog.unshift(entry);
    if(DB.activityLog.length>this.maxEntries)DB.activityLog=DB.activityLog.slice(0,this.maxEntries);
    saveDBFn();
    // Update UI if on settings page
    if(typeof _currentPage!=='undefined'&&_currentPage==='settings')renderActivityLog();
  },
  load(){
    if(!DB.activityLog)DB.activityLog=[];
    return Promise.resolve();
  }
};

// ════════ DATABASE CONNECTION MONITOR ════════
let dbConnectionStatus='disconnected';
let lastHeartbeat=null;

async function checkDBConnection(){
  const token=localStorage.getItem('ss-token');
  if(!token){
    setDBStatus('disconnected','Not authenticated');
    return false;
  }
  try{
    const res=await fetch('/api/data',{
      method:'GET',
      headers:{'Authorization':'Bearer '+token}
    });
    const isConnected=res.ok;
    lastHeartbeat=new Date();
    setDBStatus(isConnected?'connected':'error',isConnected?'Connected':'Server error');
    return isConnected;
  }catch(e){
    setDBStatus('error','Network error');
    return false;
  }
}

function setDBStatus(status,message){
  dbConnectionStatus=status;
  const indicator=document.getElementById('db-status-indicator');
  const text=document.getElementById('db-status-text');
  const lastSync=document.getElementById('db-last-sync');
  
  if(!indicator||!text)return;
  
  const statusConfig={
    connected:{color:'var(--green)',icon:'●',text:'Connected'},
    disconnected:{color:'var(--text3)',icon:'○',text:'Disconnected'},
    error:{color:'var(--red)',icon:'●',text:'Connection Error'}
  };
  
  const cfg=statusConfig[status]||statusConfig.disconnected;
  indicator.style.color=cfg.color;
  indicator.textContent=cfg.icon;
  text.textContent=message||cfg.text;
  
  if(lastSync&&lastHeartbeat){
    lastSync.textContent=`Last sync: ${fmtDate(lastHeartbeat.toISOString())}`;
  }
}

// Start connection monitor
setInterval(checkDBConnection,30000); // Check every 30s

// ════════ ACTIVITY LOG TRACKING ════════
// Override save functions to log activity
const _originalSaveDBFn=window.saveDBFn;
window.saveDBFn=function(){
  if(_originalSaveDBFn)_originalSaveDBFn();
};

// Track logins
function logLogin(userId){
  ActivityLog.log('login',`${getUserName(userId)} logged in`,userId);
  checkDBConnection();
}

// Track logouts
function logLogout(userId){
  ActivityLog.log('logout',`${getUserName(userId)} logged out`,userId);
}

// Track creates
function logCreate(type,itemName){
  ActivityLog.log('create',`Created ${type}: ${itemName}`);
}

// Track updates
function logUpdate(type,itemName){
  ActivityLog.log('update',`Updated ${type}: ${itemName}`);
}

// Track deletes
function logDelete(type,itemName){
  ActivityLog.log('delete',`Deleted ${type}: ${itemName}`);
}

// Track data sync
function logSync(direction){
  ActivityLog.log('sync',`Data ${direction} server`);
}

// Track deployments
function logDeploy(version){
  ActivityLog.log('deploy',`Version ${version} is deployed`);
}

// ════════ RENDER: SETTINGS ════════
function renderSettings(){
  // Check if we're actually on the settings page
  const settingsPage=document.getElementById('pg-settings');
  if(!settingsPage||!settingsPage.classList.contains('on'))return;
  
  // Check if elements exist before setting values
  const setName=document.getElementById('set-name');
  const setEmail=document.getElementById('set-email');
  const setPhone=document.getElementById('set-phone');
  const setNpwp=document.getElementById('set-npwp');
  const settingsUsers=document.getElementById('settings-users');
  
  if(setName)setName.value=DB.settings.name||'House of EXP';
  if(setEmail)setEmail.value=DB.settings.email||'';
  if(setPhone)setPhone.value=DB.settings.phone||'';
  if(setNpwp)setNpwp.value=DB.settings.npwp||'';
  if(settingsUsers)settingsUsers.innerHTML=USERS.map(u=>`<div class="lr"><div style="display:flex;align-items:center;gap:8px"><div class="av" style="background:${u.color}22;color:${u.color}">${u.name[0]}</div><span style="font-size:11px">${u.name}</span></div><span class="pill pg_">${u.id===currentUser?'You':'Member'}</span></div>`).join('');
  
  // WA phone inputs per user — value from USERS array (loaded from Supabase)
  var waEl=document.getElementById('settings-wa-phones');
  if(waEl){
    waEl.innerHTML=USERS.map(u=>`
      <div style="display:flex;align-items:center;gap:8px">
        <div class="av" style="background:${u.color}22;color:${u.color};flex-shrink:0">${u.name[0]}</div>
        <span style="font-size:11px;min-width:60px">${u.name}</span>
        <input id="wa-phone-${u.id}" class="fi" type="tel" placeholder="628xxx" value="${u.wa_phone||''}" style="flex:1;padding:5px 8px;font-size:11px" />
      </div>`).join('');
  }
  
  // Only run DB/activity functions if their UI elements exist
  if(document.getElementById('db-status-indicator')){
    checkDBConnection();
  }
  
  if(document.getElementById('activity-log-list')){
    ActivityLog.load();
    renderActivityLog();
  }

  if(typeof _syncVersionLabels==='function') _syncVersionLabels();
}

function renderActivityLog(){
  const container=document.getElementById('activity-log-list');
  if(!container)return;
  
  const logs=(DB.activityLog||[]).slice().reverse();
  const pgLogs=_pgSlice(logs,'settingsActivity');
  
  if(!logs.length){
    container.innerHTML='<div class="empty" style="padding:20px">No activity logged yet</div>';
    return;
  }
  
  const actionIcons={
    login:'🔓',
    logout:'🔒',
    create:'✨',
    update:'✏️',
    delete:'🗑️',
    sync:'🔄',
    deploy:'🚀',
    Added:'✨',
    Edited:'✏️',
    Deleted:'🗑️',
    Paid:'💰',
    Settled:'💰',
    Approved:'✅',
    Rejected:'⛔',
    Created:'✨',
    Returned:'↩',
  };

  const actionColors={
    login:'var(--green)',
    logout:'var(--text3)',
    create:'var(--blue)',
    update:'var(--amber)',
    delete:'var(--red)',
    sync:'var(--accent)',
    deploy:'var(--green)',
    Added:'var(--blue)',
    Edited:'var(--amber)',
    Deleted:'var(--red)',
    Paid:'var(--green)',
    Settled:'var(--green)',
    Approved:'var(--green)',
    Rejected:'var(--red)',
    Created:'var(--blue)',
    Returned:'var(--accent)',
  };
  
  container.innerHTML=pgLogs.map(log=>{
    const action=log.action||log.type||'update';
    const icon=actionIcons[action]||'•';
    const color=actionColors[action]||'var(--text3)';
    const userName=getUserName(log.userId||log.user||currentUser);
    const details=log.details||log.desc||log.description||'—';
    const ts=log.timestamp||log.ts||new Date().toISOString();
    
    return `<div class="lr" style="padding:8px 12px;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:8px;flex:1">
        <span style="font-size:14px">${icon}</span>
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text)">${details}</div>
          <div style="font-size:9px;color:var(--text3);margin-top:2px">${fmtDate(ts)} • ${userName}</div>
        </div>
      </div>
      <span style="font-size:8px;color:${color};background:${color}22;padding:2px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:.05em">${action}</span>
    </div>`;
  }).join('')+_pgControls(logs.length,'settingsActivity','renderActivityLog');
}

// ════════ SETTINGS: WHATSAPP NUMBERS ════════
async function settingsSaveWA(btn){
  if(btn)btn.disabled=true;
  var token=localStorage.getItem('ss-token');
  var errors=0;
  var promises=USERS.map(async function(u){
    var el=document.getElementById('wa-phone-'+u.id);
    if(!el)return;
    var val=el.value.trim().replace(/[^0-9]/g,'');
    var current=u.wa_phone||'';
    if(val===current)return; // no change
    try{
      var r=await fetch('/api/auth?action=updateUser',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+(token||'')},
        body:JSON.stringify({userId:u.id,wa_phone:val||null})
      });
      if(r.ok){
        u.wa_phone=val||'';
        logUpdate('user','WhatsApp number for '+u.name);
      }
      else errors++;
    }catch(e){errors++;}
  });
  await Promise.all(promises);
  if(typeof showToast==='function')showToast(errors?'Some numbers failed to save':'WhatsApp numbers saved',errors?'error':'success');
  if(btn)btn.disabled=false;
}

// ════════ SETTINGS: CHANGE PASSWORD ════════
async function settingsChangePassword(btn){
  var oldPw=document.getElementById('set-pw-old').value;
  var newPw=document.getElementById('set-pw-new').value;
  var confirmPw=document.getElementById('set-pw-confirm').value;
  var msg=document.getElementById('set-pw-msg');
  function setMsg(text,color){if(msg){msg.textContent=text;msg.style.color=color||'var(--text3)';}}
  if(!oldPw||!newPw||!confirmPw){setMsg('Please fill in all fields.','var(--amber)');return;}
  if(newPw!==confirmPw){setMsg('New passwords do not match.','var(--red)');return;}
  if(newPw.length<4){setMsg('New password must be at least 4 characters.','var(--amber)');return;}
  if(btn)btn.disabled=true;
  setMsg('Saving…','var(--text3)');
  var token=localStorage.getItem('ss-token');
  try{
    var r=await fetch('/api/auth?action=changePassword',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+(token||'')},
      body:JSON.stringify({oldPassword:oldPw,newPassword:newPw})
    });
    var data=await r.json();
    if(r.ok){
      setMsg('✓ Password updated successfully.','var(--green)');
      document.getElementById('set-pw-old').value='';
      document.getElementById('set-pw-new').value='';
      document.getElementById('set-pw-confirm').value='';
      logUpdate('security','Password changed');
    } else {
      setMsg(data.error||'Failed to update password.','var(--red)');
    }
  }catch(e){
    setMsg('Network error. Please try again.','var(--red)');
  }
  if(btn)btn.disabled=false;
}

// ════════ SETTINGS: SYNC & SAVE ════════
function _settingsProgress(label,pct,status,color){
  const wrap=document.getElementById('settings-op-progress');
  const lbl=document.getElementById('settings-op-label');
  const pctEl=document.getElementById('settings-op-pct');
  const bar=document.getElementById('settings-op-bar');
  const statusEl=document.getElementById('settings-op-status');
  if(!wrap)return;
  if(pct==null){wrap.style.display='none';return;}
  wrap.style.display='block';
  lbl.textContent=label||'Working...';
  pctEl.textContent=Math.round(pct)+'%';
  bar.style.width=pct+'%';
  bar.style.background=color||'var(--accent)';
  statusEl.textContent=status||'';
}

async function settingsSyncDB(btn){
  if(btn)btn.disabled=true;
  _settingsProgress('Syncing to server...',10,'Preparing data...');
  const token=localStorage.getItem('ss-token');
  if(!token){
    _settingsProgress('Sync failed',100,'No auth token — please sign in first.','var(--red)');
    setTimeout(()=>_settingsProgress(null),3000);
    if(btn)btn.disabled=false;
    return;
  }
  let dataToSync=DB;
  try{
    _settingsProgress('Syncing to server...',40,'Sending data to cloud...');
    await new Promise(r=>setTimeout(r,300));
    const res=await fetch('/api/data',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({data:dataToSync})
    });
    if(!res.ok)throw new Error('Server responded '+res.status);
    _settingsProgress('Sync complete',100,'✓ Data successfully synced to server.','var(--green)');
    logSync('synced to');
    updateNotifCount();renderSidebar();
    await checkDBConnection();
  }catch(e){
    _settingsProgress('Sync failed',100,'Server unreachable. Please try again.','var(--red)');
  }
  setTimeout(()=>_settingsProgress(null),3500);
  if(btn)btn.disabled=false;
}

async function settingsSaveAll(btn){
  if(btn)btn.disabled=true;
  const steps=[
    {label:'Collecting all records...',pct:20,status:'Scanning DB...'},
    {label:'Pushing to server...',pct:60,status:'Uploading to cloud...'},
    {label:'Finalising...',pct:90,status:'Verifying...'},
  ];
  for(const s of steps){
    _settingsProgress(s.label,s.pct,s.status);
    await new Promise(r=>setTimeout(r,280));
  }
  const token=localStorage.getItem('ss-token');
  let serverOk=false;
  if(token){
    try{
      const res=await fetch('/api/data',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body:JSON.stringify({data:DB})
      });
      serverOk=res.ok;
      if(serverOk)logSync('saved to');
    }catch(e){}
  }
  if(serverOk){
    _settingsProgress('All saved!',100,'✓ Saved to server.','var(--green)');
    await checkDBConnection();
  }else if(token){
    _settingsProgress('Save failed',100,'Server unreachable — please try again.','var(--red)');
  }else{
    _settingsProgress('Not signed in',100,'Sign in to save data.','var(--red)');
  }
  setTimeout(()=>_settingsProgress(null),3500);
  if(btn)btn.disabled=false;
}
// ════════════════════════════════════════════════════════════
// BUG REPORT & FEATURE REQUEST
// ════════════════════════════════════════════════════════════

function brPreviewFile(input) {
  const preview = document.getElementById('br-preview');
  const img = document.getElementById('br-preview-img');
  if (!preview || !img) return;
  if (input.files && input.files[0]) {
    if (input.files[0].size > 2 * 1024 * 1024) {
      showToast('File terlalu besar — maksimal 2MB', 'error');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = e => { img.src = e.target.result; preview.style.display = ''; };
    reader.readAsDataURL(input.files[0]);
  } else {
    preview.style.display = 'none';
  }
}

async function submitBugReport(btn) {
  const title = (document.getElementById('br-title')?.value || '').trim();
  const desc  = (document.getElementById('br-desc')?.value  || '').trim();
  const type  = document.getElementById('br-type')?.value  || 'bug';
  const prio  = document.getElementById('br-priority')?.value || 'medium';
  const setStatus = (msg, color) => {
    const el = document.getElementById('br-status');
    if (el) { el.textContent = msg; el.style.color = color || 'var(--text3)'; }
  };

  if (!title) { showToast('Isi judul dulu ya', 'error'); return; }
  if (!desc)  { showToast('Deskripsinya jangan kosong', 'error'); return; }

  if (btn) btn.disabled = true;
  setStatus('Mengirim...', 'var(--text3)');

  // Encode image if attached
  let imageData = null;
  const fileInput = document.getElementById('br-file');
  if (fileInput?.files?.[0]) {
    imageData = await new Promise(res => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.readAsDataURL(fileInput.files[0]);
    });
  }

  const token = localStorage.getItem('ss-token');
  try {
    const res = await fetch('/api/bug-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token || '') },
      body: JSON.stringify({
        title, description: desc, type, priority: prio,
        reported_by: currentUser,
        image_data: imageData,
        app_version: document.querySelector('meta[name="app-version"]')?.content || window.__APP_VERSION__ || '1.9.5',
        user_agent: navigator.userAgent,
      })
    });
    if (res.ok) {
      setStatus('✓ Laporan terkirim — terima kasih!', 'var(--green)');
      showToast('Laporan berhasil dikirim!', 'success');
      // Clear form
      ['br-title', 'br-desc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      if (fileInput) fileInput.value = '';
      const preview = document.getElementById('br-preview');
      if (preview) preview.style.display = 'none';
      setTimeout(() => setStatus(''), 4000);
    } else {
      const j = await res.json().catch(() => ({}));
      setStatus('Gagal kirim: ' + (j.error || res.status), 'var(--red)');
    }
  } catch (e) {
    setStatus('Network error — coba lagi', 'var(--red)');
  }
  if (btn) btn.disabled = false;
}

// ════════════════════════════════════════════════════════════
// RELEASE NOTES
// ════════════════════════════════════════════════════════════

function backfillReleaseNotes() {
  if (!DB.releaseNotes) DB.releaseNotes = [];
  if (DB.releaseNotes.length > 0 || DB._releaseNotesBackfilled) return;

  const seen = new Set();
  const entries = [];

  (DB.activityLog || []).forEach(function(a) {
    const type = (a.type || '').toLowerCase();
    const action = (a.action || '').toLowerCase();
    const desc = a.desc || a.details || '';
    const isDeploy = type === 'deploy' || action === 'deployed' || /version\s+/i.test(desc);
    if (!isDeploy) return;

    const versionMatch = String(desc).match(/version\s+([^\s]+)/i);
    const version = versionMatch ? versionMatch[1].replace(/^v/i, '') : '';
    const key = version || `${a.ts || ''}|${desc}`;
    if (seen.has(key)) return;
    seen.add(key);

    entries.push({
      id: entries.length + 1,
      version: version || 'unknown',
      type: /major/i.test(desc) ? 'major' : /hotfix/i.test(desc) ? 'hotfix' : /minor/i.test(desc) ? 'minor' : 'patch',
      commitMessage: desc || 'Release deployed',
      notes: a.module === 'deploy' ? 'Auto-detected from activity log' : '',
      releasedAt: a.ts || new Date().toISOString(),
    });
  });

  entries.sort((a, b) => new Date(b.releasedAt) - new Date(a.releasedAt));
  DB.releaseNotes = entries;
  DB._releaseNotesBackfilled = true;
  // Do NOT call saveDBFn here. ss_releases is server-managed (bigint id,
  // populated by api/version.js). Pushing client-derived rows back through
  // POST /api/data caused 500s ("invalid input ... type bigint: <UUID>")
  // because client-fabricated entries have no real DB id. Backfill is
  // display-only; the next /api/releases fetch overwrites it with truth.
}

function _releasePageSizeButtons(){
  return [10,20];
}

async function loadReleaseNotes(btn) {
  const container = document.getElementById('release-notes-list');
  if (!container) return;
  if (btn) btn.disabled = true;

  const currentVer = (typeof ensureAppVersion === 'function'
    ? await ensureAppVersion()
    : (window.__APP_VERSION__ || document.querySelector('meta[name="app-version"]')?.content || '1.9.5'));
  backfillReleaseNotes();

  try {
    const res = await fetch('/api/releases');
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const apiReleases = Array.isArray(data.releases) ? data.releases : [];
    const sortedApiReleases = apiReleases.slice().sort((a, b) => {
      const at = new Date(a.released_at || a.created_at || a.releasedAt || 0).getTime();
      const bt = new Date(b.released_at || b.created_at || b.releasedAt || 0).getTime();
      return bt - at;
    });
    const releases = sortedApiReleases.length ? sortedApiReleases : (DB.releaseNotes || []);
    if (sortedApiReleases.length) {
      DB.releaseNotes = sortedApiReleases.map((r, idx) => ({
        id: r.app_id || idx + 1,
        version: r.version || '',
        type: r.type || 'patch',
        commitMessage: r.commit_message || '',
        notes: r.notes || '',
        releasedAt: r.released_at || r.created_at || new Date().toISOString(),
      }));
      if (typeof saveDBFn === 'function') saveDBFn();
    }

    if (!releases.length) {
      container.innerHTML = '<div class="empty" style="padding:16px">Belum ada release yang tercatat.</div>';
      return;
    }

    const fmtReleaseDate = iso => {
      const d = new Date(iso);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const pageKey='releaseNotes';
    const pageState=_pgGet(pageKey);
    const pageReleases=_pgSlice(releases,pageKey);

    container.innerHTML = pageReleases.map((r, i) => {
      const isLatest = pageState.page===0 && i === 0;
      const ver = r.version || r.versionName || '';
      const isCurrent = ver === currentVer;
      const typeColor = { major: 'var(--accent)', minor: 'var(--blue)', patch: 'var(--green)', hotfix: 'var(--red)' };
      const col = typeColor[r.type] || 'var(--text3)';
      return `<div style="padding:12px 0;border-bottom:1px solid var(--border);${isLatest ? '' : 'opacity:.85'}">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
          <span style="font-size:13px;font-weight:700;color:var(--text);font-family:var(--ui)">v${ver}</span>
          ${isLatest ? '<span style="font-size:9px;background:var(--accent);color:#fff;padding:2px 7px;border-radius:10px;font-weight:600">LATEST</span>' : ''}
          ${isCurrent ? '<span style="font-size:9px;background:var(--green)22;color:var(--green);padding:2px 7px;border-radius:10px;border:1px solid var(--green)33">Versi kamu</span>' : ''}
          <span style="font-size:9px;background:${col}22;color:${col};padding:2px 7px;border-radius:10px">${r.type||'patch'}</span>
          <span style="font-size:10px;color:var(--text3);margin-left:auto">${fmtReleaseDate(r.releasedAt || r.released_at || r.created_at)}</span>
        </div>
        ${(r.commitMessage || r.commit_message) ? `<div style="font-size:11px;color:var(--text2);margin-bottom:4px;font-family:monospace;background:var(--bg3);padding:5px 8px;border-radius:5px;border-left:2px solid ${col}">${r.commitMessage || r.commit_message}</div>` : ''}
        ${r.notes ? `<div style="font-size:11px;color:var(--text3);line-height:1.6">${r.notes}</div>` : ''}
        ${isLatest && !isCurrent ? `<div style="margin-top:8px;padding:8px 10px;background:var(--amber)22;border-radius:6px;border:1px solid var(--amber)33;font-size:11px;color:var(--amber)">⚠ Ada versi baru! Tekan <b>↻ Update</b> di pojok kanan atas untuk update.</div>` : ''}
      </div>`;
    }).join('') + _pgControls(releases.length,pageKey,'loadReleaseNotes',_releasePageSizeButtons());
  } catch (e) {
    container.innerHTML = '<div class="empty" style="padding:16px;color:var(--text3)">Gagal load release notes.</div>';
  }
  if (btn) btn.disabled = false;
}

function _backupFilenameFromResponse(header){
  const fallback=`studiostaff-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.sql`;
  if(!header)return fallback;
  const match=String(header).match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
  if(!match||!match[1])return fallback;
  try{
    return decodeURIComponent(match[1].replace(/\"/g,'').trim())||fallback;
  }catch(e){
    return String(match[1]).replace(/\"/g,'').trim()||fallback;
  }
}

async function settingsDownloadBackup(btn){
  if(btn)btn.disabled=true;
  _settingsProgress('Preparing backup...',15,'Reading live database...');
  const token=localStorage.getItem('ss-token');
  if(!token){
    _settingsProgress('Backup failed',100,'Sign in first to download a backup.','var(--red)');
    setTimeout(()=>_settingsProgress(null),3500);
    if(btn)btn.disabled=false;
    return;
  }

  try{
    const res=await fetch('/api/backup',{
      method:'GET',
      headers:{'Authorization':'Bearer '+token,'Accept':'application/sql'},
      cache:'no-store'
    });
    if(!res.ok){
      const text=await res.text().catch(()=>'');
      throw new Error((text||('Server responded '+res.status)).trim());
    }
    _settingsProgress('Preparing backup...',70,'Generating SQL export...');
    const blob=await res.blob();
    const filename=_backupFilenameFromResponse(res.headers.get('content-disposition'));
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{
      URL.revokeObjectURL(url);
      a.remove();
    },500);
    _settingsProgress('Backup ready',100,`✓ Downloaded ${filename}`,'var(--green)');
    if(typeof showToast==='function')showToast('Backup SQL downloaded','success');
  }catch(e){
    const msg=String(e&&e.message||'Could not create backup').trim();
    _settingsProgress('Backup failed',100,msg,'var(--red)');
    if(typeof showToast==='function')showToast(msg,'error');
  }
  setTimeout(()=>_settingsProgress(null),3500);
  if(btn)btn.disabled=false;
}

// Auto-load release notes when settings page opens
const _origRenderSettings = window.renderSettings;
window.renderSettings = function() {
  if (_origRenderSettings) _origRenderSettings();
  setTimeout(loadReleaseNotes, 100);
};
