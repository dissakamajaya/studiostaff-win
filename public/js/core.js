// ════════════════════════════════════════
// CORE: Users, Auth, DB
// ════════════════════════════════════════
// USERS is populated dynamically from Supabase via /api/auth?action=users
var USERS=[];
const rp=n=>'Rp '+Math.round(n).toLocaleString('id-ID');
const fmtDate=d=>d?new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'—';
const initials=n=>n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const avColors=['#6c63f5','#22c55e','#f5a623','#4a9eff','#f04444','#22d3ee','#e879f9'];
const avColor=n=>avColors[n.charCodeAt(0)%avColors.length];
const getUserColor=id=>(USERS.find(u=>u.id===id)||{color:'#888'}).color;
const getUserName=id=>(USERS.find(u=>u.id===id)||{name:id||'?'}).name;
const getUserRole=id=>(USERS.find(u=>u.id===id)||{role:'staff'}).role;
const isAdmin=id=>getUserRole(id)==='admin';
function requireAdmin(){
  if(isAdmin(currentUser))return true;
  // Show modal popup
  var existing=document.getElementById('modal-admin-required');
  if(existing){existing.style.display='flex';return false;}
  var m=document.createElement('div');
  m.id='modal-admin-required';
  m.className='modal-bg';
  m.style.cssText='display:flex;z-index:9999';
  m.innerHTML='<div class="modal" style="max-width:360px;text-align:center">'
    +'<div style="font-size:28px;margin-bottom:8px">🔒</div>'
    +'<div style="font-size:15px;font-weight:700;margin-bottom:6px">Admin Required</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-bottom:20px">You need admin access to perform this action. Please ask an admin to do it.</div>'
    +'<button class="btn" onclick="document.getElementById(\'modal-admin-required\').style.display=\'none\'">OK</button>'
    +'</div>';
  document.body.appendChild(m);
  m.addEventListener('click',function(e){if(e.target===m)m.style.display='none';});
  return false;
}
const prioColor={high:'var(--red)',medium:'var(--amber)',low:'var(--green)',normal:'var(--blue)',High:'var(--red)',Medium:'var(--amber)',Low:'var(--green)',Normal:'var(--blue)'};

// ════════ PAGINATION HELPER ════════
var _pgState={}; // stores {key: {page:0, size:10}}
function _pgGet(key){if(!_pgState[key])_pgState[key]={page:0,size:10};return _pgState[key];}
function _pgSlice(arr,key){
  var s=_pgGet(key);
  var start=s.page*s.size;
  return arr.slice(start,start+s.size);
}
function _pgControls(totalItems,key,renderFn,sizes){
  var s=_pgGet(key);
  var totalPages=Math.ceil(totalItems/s.size)||1;
  if(s.page>=totalPages)s.page=totalPages-1;
  if(s.page<0)s.page=0;
  var start=s.page*s.size+1;
  var end=Math.min((s.page+1)*s.size,totalItems);
  sizes=Array.isArray(sizes)&&sizes.length?sizes:[10,20,30];
  return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;flex-wrap:wrap;gap:6px">'
    +'<div style="display:flex;align-items:center;gap:6px">'
    +'<span style="font-size:10px;color:var(--text3)">Show:</span>'
    +sizes.map(function(sz){return '<button class="btn-xs btn-o" style="font-size:10px;padding:2px 8px;'+
      (s.size===sz?'border-color:var(--accent);color:var(--accent)':'')
      +'" onclick="_pgState[\''+key+'\'].size='+sz+';_pgState[\''+key+'\'].page=0;'+renderFn+'()">'+sz+'</button>';}).join('')
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:8px">'
    +'<span style="font-size:10px;color:var(--text3)">'+(totalItems?start+'–'+end+' of '+totalItems:'0 items')+'</span>'
    +'<button class="btn-xs btn-o" style="font-size:10px;padding:2px 6px" onclick="_pgState[\''+key+'\'].page=Math.max(0,_pgState[\''+key+'\'].page-1);'+renderFn+'()" '+(s.page<=0?'disabled':'')+'>‹</button>'
    +'<button class="btn-xs btn-o" style="font-size:10px;padding:2px 6px" onclick="_pgState[\''+key+'\'].page=Math.min('+(totalPages-1)+',_pgState[\''+key+'\'].page+1);'+renderFn+'()" '+(s.page>=totalPages-1?'disabled':'')+'>›</button>'
    +'</div></div>';
}
const isRevisionTask=t=>/\brevision\b/i.test(`${t.title||''} ${t.desc||''}`);

let currentUser=null;
let DB={clients:[],projects:[],rentals:[],invoices:[],tasks:[],transactions:[],domestics:[],classes:[],products:[],docs:[],events:[],notifications:[],journals:[],inventoryItems:[],leaveNotices:[],foodCredits:[],reimbursements:[],students:[],classNotes:[],payrolls:[],debts:[],purchases:[],sales:[],feedbacks:[],cleanings:[],zakats:[],financeLogs:[],waterLogs:[],activityLog:[],releaseNotes:[],suratJalan:[],crewMembers:[],galonStatus:{status:'ready',lastUpdated:null},nextId:{c:1,p:1,r:1,i:1,t:1,tx:1,dm:1,ac:1,pr:1,dc:1,ev:1,n:1,jn:1,inv:1,lv:1,fc:1,rb:1,st:1,py:1,dt:1,pu:1,sl:1,fb:1,zk:1,cl:1,wl:1,act:1,fl:1,sj:1,cr:1,rel:1},settings:{name:'House of EXP',email:'studio@houseofexp.id',phone:'',npwp:'',icalUrl:''},bankAccounts:[{id:'bca',name:'EXP-BCA',owner:'studio',balance:0},{id:'jenius',name:'EXP-Jenius',owner:'studio',balance:0},{id:'nah',name:'NAH',owner:'rental',balance:0}]};

// ── localStorage DB cache for instant paint ──────────────────
var _DB_CACHE_KEY = 'ss-db-cache';
function _saveCacheDB() {
  try { localStorage.setItem(_DB_CACHE_KEY, JSON.stringify(DB)); } catch(e) {}
}
function _loadCacheDB() {
  try {
    var raw = localStorage.getItem(_DB_CACHE_KEY);
    if (raw) { var d = JSON.parse(raw); if (d && Object.keys(d).length > 0) return d; }
  } catch(e) {}
  return null;
}

// ── Diff snapshot ────────────────────────────────────────────
// _lastSyncedDB holds the deep-cloned state we last successfully pushed to
// (or pulled from) the server. _doSave diffs the live DB against it to send
// only changed/new/deleted records, so concurrent writers on other devices
// no longer get clobbered by a NOT-IN sweep.
var _lastSyncedDB = null;
var _DIFF_COLLECTIONS = ['clients','projects','tasks','transactions','students','inventoryItems','rentals','invoices','domestics','classes','products','docs','events','notifications','journals','leaveNotices','foodCredits','reimbursements','payrolls','debts','purchases','sales','feedbacks','zakats','cleanings','waterLogs','activityLog','financeLogs','suratJalan','crewMembers','releaseNotes'];
function _snapshotDB() {
  try { _lastSyncedDB = JSON.parse(JSON.stringify(DB)); } catch(e) { _lastSyncedDB = null; }
}

function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme') || 'light';
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  try { localStorage.setItem('ss-theme', next); } catch(e) {}
}
function _rowKey(r) { return r && (r._uuid || (r.id != null ? 'aid:'+r.id : null)); }
function _rowsEqual(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch(e) { return false; }
}
function _diffDB() {
  // Returns {changes, deletes} where:
  //   changes[col] = array of new or modified rows from current DB
  //   deletes[col] = array of _uuid strings (or {_uuid,_source} for transactions)
  var changes = {};
  var deletes = {};
  var prev = _lastSyncedDB || {};
  _DIFF_COLLECTIONS.forEach(function(col){
    var curArr  = Array.isArray(DB[col])   ? DB[col]   : [];
    var prevArr = Array.isArray(prev[col]) ? prev[col] : [];
    var prevByKey = {};
    prevArr.forEach(function(r){ var k=_rowKey(r); if(k) prevByKey[k]=r; });
    var curKeys = {};
    var dirty = [];
    curArr.forEach(function(r){
      var k = _rowKey(r);
      if (k) curKeys[k] = true;
      if (!r._uuid) { dirty.push(r); return; } // new row, never persisted
      var pr = prevByKey[k];
      if (!pr) { dirty.push(r); return; }       // appeared since last sync
      if (!_rowsEqual(pr, r)) dirty.push(r);     // mutated since last sync
    });
    var dels = [];
    prevArr.forEach(function(r){
      var k = _rowKey(r);
      if (!r._uuid) return;          // never persisted, nothing to delete
      if (curKeys[k]) return;        // still present
      if (col === 'transactions') dels.push({ _uuid: r._uuid, _source: r._source || (r.type==='Income'?'income':'expense') });
      else dels.push(r._uuid);
    });
    if (dirty.length) changes[col] = dirty;
    if (dels.length) deletes[col]  = dels;
  });
  // Singletons — always send when changed.
  ['settings','bankAccounts','galonStatus','nextId'].forEach(function(col){
    if (DB[col] !== undefined) {
      var pv = prev ? prev[col] : undefined;
      if (!_rowsEqual(pv, DB[col])) changes[col] = DB[col];
    }
  });
  return { changes: changes, deletes: deletes };
}

async function loadDB(){
  var token=localStorage.getItem('ss-token');

  // ── Step 1: Paint instantly from localStorage cache ──────────
  var cached=_loadCacheDB();
  if(cached){
    DB=cached;
    migrateDB();
    if(typeof recalcAllProjectValues==='function')recalcAllProjectValues();
    // Render immediately with cached data — LCP fires here
    if(typeof renderSidebar==='function')renderSidebar();
    if(typeof renderTopbar==='function')renderTopbar();
    if(typeof nav==='function')nav('dashboard');
  }

  // ── Step 2: Fetch fresh data from network in background ──────
  if(token){
    try{
      var r=await fetch('/api/data',{headers:{'Authorization':'Bearer '+token}});
      if(r.ok){
        var j=await r.json();
        if(j.data&&Object.keys(j.data).length>0){
          DB=j.data;
          // Track the workspace timestamp this snapshot is built on. Subsequent
          // saves send it back so the server can reject saves built on stale
          // state instead of clobbering newer rows from another device.
          window._workspaceMetaTs=j.updated_at||null;
          migrateDB();
          if(typeof recalcAllProjectValues==='function')recalcAllProjectValues();
          _snapshotDB(); // diff baseline = the freshly fetched server state
          _saveCacheDB(); // update cache with fresh data
          // Silently re-render the active view to reflect fresh server data.
          if(cached){
            if(typeof renderSidebar==='function')renderSidebar();
            if(typeof renderTopbar==='function')renderTopbar();
            if(typeof renderPage==='function')renderPage(_currentPage||'dashboard');
            else if(typeof renderDash==='function')renderDash();
          }
          return;
        }
      } else {
        console.warn('API load failed: HTTP', r.status, r.statusText||'');
      }
    }catch(e){console.warn('API load failed', e.message||e);}
  }
  migrateDB();
}
function migrateDB(){
  ['journals','journalComments','journalReactions','inventoryItems','leaveNotices','foodCredits','reimbursements','students','classNotes','payrolls','debts','purchases','sales','feedbacks','cleanings','zakats','financeLogs','waterLogs','activityLog','releaseNotes','suratJalan','crewMembers'].forEach(function(k){if(!DB[k])DB[k]=[];});
  ['lv','fc','rb','st','py','dt','pu','sl','fb','cl','zk','wl','act','fl','sj','cr','rel'].forEach(function(k){if(!DB.nextId[k])DB.nextId[k]=1;});
  if(!DB.galonStatus)DB.galonStatus={status:'ready',lastUpdated:null};
  if(!DB.bankAccounts)DB.bankAccounts=[{id:'bca',name:'EXP-BCA',owner:'studio',balance:0},{id:'jenius',name:'EXP-Jenius',owner:'studio',balance:0},{id:'nah',name:'NAH',owner:'rental',balance:0}];
  DB.bankAccounts.forEach(function(a){if(!a.customCategories)a.customCategories=[];});
  DB.classes.forEach(function(c){
    if(c.batchNo===undefined||c.batchNo===null||c.batchNo==='')c.batchNo=1;
    if(c.totalMeet===undefined||c.totalMeet===null||c.totalMeet==='')c.totalMeet=Math.max(parseInt(c.duration)||1,1);
    if(c.completedMeet===undefined||c.completedMeet===null||c.completedMeet==='')c.completedMeet=0;
    if(!c.code)c.code=`AC-${String(c.id||0).padStart(4,'0')}`;
  });
  DB.students.forEach(function(s){
    if(s.totalMeetEnrolled===undefined||s.totalMeetEnrolled===null)s.totalMeetEnrolled=0;
    if(s.completedMeet===undefined||s.completedMeet===null)s.completedMeet=0;
    if(s.progress===undefined||s.progress===null)s.progress=0;
    if(!s.status)s.status='Active';
  });
  // Backfill activity log from existing data (runs once)
  if(typeof backfillActivityLog==='function') backfillActivityLog();
  if(typeof backfillFinanceLog==='function') backfillFinanceLog();
}
// ════════ ACTIVITY LOG ════════
// Uses `type`/`desc`/`module` keys matching activityLog.js + dashboard renderer
function addActivityLog(type, action, desc, module){
  if(!DB.activityLog) DB.activityLog=[];
  DB.activityLog.push({
    id: Date.now(),
    ts: new Date().toISOString(),
    user: currentUser||'unknown',
    type: type,       // e.g. 'Transaction', 'Invoice', 'Client'
    action: action,   // e.g. 'Added', 'Edited', 'Deleted'
    desc: desc,       // human-readable detail
    module: module||null  // e.g. 'finance', 'invoices'
  });
  // Keep latest 2000
  if(DB.activityLog.length>2000) DB.activityLog=DB.activityLog.slice(-2000);
}

var _saveTimer=null;
var _saveRetryCount=0;
var _saveRetryTimer=null;
var _MAX_SAVE_RETRIES=2;
var _spActive=false;
var _spCallback=null;

// ════════ SAVE PROGRESS MODAL ════════
function triggerSaveWithFeedback(label,onSuccess){
  _spActive=true;
  _spCallback=onSuccess||null;
  var m=document.getElementById('modal-save-progress');
  var icon=document.getElementById('sp-icon');
  var lbl=document.getElementById('sp-label');
  var fill=document.getElementById('sp-bar-fill');
  var status=document.getElementById('sp-status');
  var ok=document.getElementById('sp-ok');
  if(m){
    if(icon)icon.textContent='⏳';
    if(lbl)lbl.textContent=label||'Saving...';
    if(fill){fill.className='sp-bar-fill indeterminate';fill.style.background='var(--accent)';}
    if(status)status.innerHTML='';
    if(ok)ok.style.display='none';
    m.style.display='flex';
  }
  clearTimeout(_saveTimer);
  _doSave();
}
function _closeSaveProgressModal(){
  var m=document.getElementById('modal-save-progress');
  if(m)m.style.display='none';
  var fill=document.getElementById('sp-bar-fill');
  if(fill){fill.className='sp-bar-fill';fill.style.width='0%';fill.style.background='var(--accent)';}
  _spActive=false;
  var cb=_spCallback;
  _spCallback=null;
  if(cb)cb();
}
function _updateSaveProgress(success,errMsg){
  if(!_spActive)return;
  var icon=document.getElementById('sp-icon');
  var fill=document.getElementById('sp-bar-fill');
  var status=document.getElementById('sp-status');
  var ok=document.getElementById('sp-ok');
  if(fill){fill.className='sp-bar-fill';fill.style.transition='width .3s ease';}
  if(success){
    if(icon)icon.textContent='✅';
    if(fill){fill.style.background='var(--green)';fill.style.width='100%';}
    if(status)status.innerHTML='<span style="color:var(--green)">Saved successfully</span>';
  }else{
    if(icon)icon.textContent='❌';
    if(fill){fill.style.background='var(--red)';fill.style.width='100%';}
    if(status)status.innerHTML='<span style="color:var(--red)">Save failed'+(errMsg?': '+errMsg:'')+'</span>';
  }
  if(ok)ok.style.display='';
}

// ════════ TOAST ════════
function showToast(msg,type){
  var el=document.createElement('div');
  el.className='toast toast-'+(type||'info');
  el.textContent=msg;
  document.body.appendChild(el);
  requestAnimationFrame(function(){el.classList.add('toast-show');});
  var dur=(type==='error')?6000:3000;
  setTimeout(function(){
    el.classList.remove('toast-show');
    setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},300);
  },dur);
}

// ════════ SAVE STATUS ════════
function _setSaveStatus(status,detail){
  var el=document.getElementById('save-status');
  if(!el)return;
  clearTimeout(el._t);
  if(status==='saving'){
    el.textContent='● Saving…';
    el.className='save-status saving';
  }else if(status==='saved'){
    el.textContent='✓ Saved';
    el.className='save-status saved';
    el._t=setTimeout(function(){el.className='save-status';el.textContent='';},2500);
  }else if(status==='error'){
    el.textContent='✕ Save failed';
    el.className='save-status error';
  }
}

function saveDBFn(){
  clearTimeout(_saveTimer);
  _saveTimer=setTimeout(function(){_doSave();},600);
}

// Flush pending saves before tab closes
window.addEventListener('beforeunload', function() {
  if (_lastSyncedDB) {
    var diff = _diffDB();
    var hasChanges = Object.keys(diff.changes).length > 0 || Object.keys(diff.deletes).length > 0;
    if (hasChanges) {
      var token = localStorage.getItem('ss-token');
      if (token) {
        var body = JSON.stringify({ changes: diff.changes, deletes: diff.deletes, client_updated_at: window._workspaceMetaTs||null, _sendbeacon_token: token });
        try {
          navigator.sendBeacon('/api/data', new Blob([body], { type: 'application/json' }));
        } catch(_) {}
      }
    }
  }
});
async function _doSave(){
  clearTimeout(_saveRetryTimer);
  var token=localStorage.getItem('ss-token');
  if(!token)return;
  _setSaveStatus('saving');
  // Compute per-record diff against last synced snapshot. If we have no
  // baseline yet (e.g. cache-only paint with failed initial fetch), fall back
  // to the legacy full-DB POST — but the server's conflict guard will reject
  // it as a stale snapshot before any rows are touched.
  // _pendingSnapshot freezes the DB state we're about to send. On success we
  // advance _lastSyncedDB to it, NOT to the live DB — that way any edits the
  // user made during the in-flight request remain dirty against the new
  // baseline and are picked up by the next save.
  var _diff = _lastSyncedDB ? _diffDB() : null;
  var _pendingSnapshot;
  try { _pendingSnapshot = JSON.parse(JSON.stringify(DB)); } catch(e) { _pendingSnapshot = null; }
  var _body;
  if (_diff) {
    _body = { changes: _diff.changes, deletes: _diff.deletes, client_updated_at: window._workspaceMetaTs||null };
  } else {
    _body = { data: DB, client_updated_at: window._workspaceMetaTs||null };
  }
  try{
    var r=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(_body)});
    if(r.status===409){
      // Another device wrote first. Pull fresh state and merge local edits
      // on top so the user doesn't lose their work.
      var conflict={};
      try{conflict=await r.json();}catch(e){}
      console.warn('[Save] Stale snapshot, refusing to clobber',conflict);
      _saveRetryCount=0;
      _setSaveStatus('error');
      _updateSaveProgress(false,'workspace changed elsewhere');
      // Capture local edits before overwriting DB
      var localEdits = JSON.parse(JSON.stringify(DB));
      try{
        var fr=await fetch('/api/data',{headers:{'Authorization':'Bearer '+token}});
        if(fr.ok){
          var fj=await fr.json();
          if(fj.data&&Object.keys(fj.data).length>0){
            DB=fj.data;
            window._workspaceMetaTs=fj.updated_at||null;
            migrateDB();
            _snapshotDB();
            _saveCacheDB();
            // Re-apply local edits that aren't yet persisted
            _DIFF_COLLECTIONS.forEach(function(col){
              var local = localEdits[col];
              var server = DB[col];
              if (Array.isArray(local) && Array.isArray(server)) {
                local.forEach(function(lr){
                  if (!lr._uuid) {
                    // New row that hasn't been saved — keep it
                    server.push(lr);
                  } else {
                    // Try to find matching server row and apply diffs
                    var idx = server.findIndex(function(sr){ return sr._uuid === lr._uuid; });
                    if (idx >= 0) server[idx] = lr;
                  }
                });
              }
            });
            if (typeof renderSidebar==='function')renderSidebar();
            if (typeof renderPage==='function')renderPage();
            showToast('Workspace merged with latest data from server. Your local edits have been re-applied.','info');
          }
        }
      }catch(e){}
      return;
    }
    if(!r.ok){
      var rawText=await r.text().catch(function(){return'';});
      var errJson={};
      try{errJson=JSON.parse(rawText);}catch(e){}
      var msg=errJson.error||(rawText?rawText.slice(0,200):('HTTP '+r.status));
      console.error('[Save] Failed ('+r.status+'):', errJson.error ? errJson : rawText);
      _setSaveStatus('error');
      _updateSaveProgress(false,msg);
      if(_saveRetryCount<_MAX_SAVE_RETRIES){
        _saveRetryCount++;
        var attempt=_saveRetryCount;
        _saveRetryTimer=setTimeout(_doSave,4000);
        if(!_spActive)showToast('Save failed — retrying ('+attempt+'/'+_MAX_SAVE_RETRIES+')…','error');
      }else{
        _saveRetryCount=0;
        if(!_spActive)showToast('Save failed: '+msg+'. Please refresh and try again.','error');
      }
      return;
    }
    _saveRetryCount=0;
    var j=await r.json();
    // Advance our workspace baseline so the next save's conflict check
    // compares against this fresh write, not the snapshot we loaded with.
    if(j.updated_at)window._workspaceMetaTs=j.updated_at;
    // Merge _uuid fields assigned server-side back into in-memory DB
    if(j.data){
      ['clients','projects','tasks','transactions','students','inventoryItems',
       'rentals','invoices','domestics','classes','products','docs','events',
       'notifications','journals','leaveNotices','foodCredits','reimbursements',
       'payrolls','debts','purchases','sales','feedbacks','zakats','cleanings',
       'waterLogs','financeLogs','activityLog','releaseNotes','suratJalan','crewMembers'].forEach(function(k){
        if(j.data[k]&&DB[k]){
          j.data[k].forEach(function(sr){
            var lr=DB[k].find(function(item){return item.id===sr.id;});
            if(lr&&sr._uuid&&!lr._uuid)lr._uuid=sr._uuid;
          });
        }
      });
    }
    // Mirror server-assigned _uuids into the pending snapshot so it accurately
    // reflects what the server now has. Then promote it to the new baseline.
    if (_pendingSnapshot && j.data) {
      ['clients','projects','tasks','transactions','students','inventoryItems',
       'rentals','invoices','domestics','classes','products','docs','events',
       'notifications','journals','leaveNotices','foodCredits','reimbursements',
       'payrolls','debts','purchases','sales','feedbacks','zakats','cleanings',
       'waterLogs','financeLogs','activityLog','releaseNotes','suratJalan','crewMembers'].forEach(function(k){
        if(j.data[k]&&_pendingSnapshot[k]){
          j.data[k].forEach(function(sr){
            var lr=_pendingSnapshot[k].find(function(item){return item.id===sr.id;});
            if(lr&&sr._uuid&&!lr._uuid)lr._uuid=sr._uuid;
          });
        }
      });
      _lastSyncedDB = _pendingSnapshot;
    } else {
      _snapshotDB();
    }
    _saveCacheDB(); // keep localStorage cache in sync
    _setSaveStatus('saved');
    _updateSaveProgress(true);
  }catch(e){
    console.error('[Save] Network error:',e);
    _setSaveStatus('error');
    _updateSaveProgress(false,'network error');
    if(_saveRetryCount<_MAX_SAVE_RETRIES){
      _saveRetryCount++;
      _saveRetryTimer=setTimeout(_doSave,4000);
      if(!_spActive)showToast('Save failed (network) — retrying…','error');
    }else{
      _saveRetryCount=0;
      if(!_spActive)showToast('Save failed: network error. Check your connection.','error');
    }
  }
}
