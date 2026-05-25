// ════════ INIT ════════
// Accessible to other modules (e.g. notification-handler.js) for push subscription
window.swRegistration = null;

function _semverParts(v){
  return String(v||'').replace(/^v/i,'').split('.').map(n=>parseInt(n,10)||0);
}
function _isVersionNewer(latest,current){
  const a=_semverParts(latest), b=_semverParts(current);
  const len=Math.max(a.length,b.length,3);
  for(let i=0;i<len;i++){
    const da=a[i]||0, db=b[i]||0;
    if(da>db)return true;
    if(da<db)return false;
  }
  return false;
}
var __appVersionPromise = null;
// Force a re-fetch (used on visibility change / focus to catch stale SW caches).
function refreshAppVersion(){
  __appVersionPromise = null;
  return ensureAppVersion();
}
async function ensureAppVersion(){
  if(__appVersionPromise) return __appVersionPromise;
  __appVersionPromise = fetch('/api/version', { cache: 'no-store' })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      const version = String(data?.version || data?.app_version || '').trim();
      if (version) {
        // If server reports newer version than what's loaded, prompt update.
        if (window.__APP_VERSION__ && _isVersionNewer(version, window.__APP_VERSION__)) {
          window.__APP_VERSION__ = version;
          _syncVersionLabels();
          if (typeof showAppUpdateModal === 'function') showAppUpdateModal(version);
        } else {
          window.__APP_VERSION__ = version;
        }
      }
      return window.__APP_VERSION__ || _currentAppVersion();
    })
    .catch(() => _currentAppVersion())
    .finally(() => _syncVersionLabels());
  return __appVersionPromise;
}
// Re-check version whenever the tab regains focus or visibility — catches the
// case where SW served stale assets but a newer deploy is live.
if (typeof window !== 'undefined' && !window.__appVersionWatchersBound) {
  window.__appVersionWatchersBound = true;
  window.addEventListener('focus', () => { try { refreshAppVersion(); } catch(_){} });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { try { refreshAppVersion(); } catch(_){} }
  });
}
function _currentAppVersion(){
  return window.__APP_VERSION__
    || document.querySelector('meta[name="app-version"]')?.content
    || document.getElementById('app-version-label')?.textContent?.replace(/^v/i,'')
    || '1.9.5';
}
function _syncAppVersionLabel(){
  const el=document.getElementById('app-version-label');
  if(el) el.textContent='v'+_currentAppVersion();
}
function _syncAboutAppVersionLabel(){
  const el=document.getElementById('about-app-version');
  if(el) el.textContent=_currentAppVersion();
}
function _syncVersionLabels(){
  _syncAppVersionLabel();
  _syncAboutAppVersionLabel();
}
function _ensureUpdateModal(){
  let modal=document.getElementById('modal-app-update');
  if(modal) return modal;
  modal=document.createElement('div');
  modal.id='modal-app-update';
  modal.className='modal-bg';
  modal.style.cssText='display:none;z-index:10000';
  modal.innerHTML=`<div class="modal" style="max-width:420px;text-align:center">
    <div style="font-size:30px;margin-bottom:10px">↻</div>
    <div style="font-size:16px;font-weight:700;margin-bottom:8px">Update Available</div>
    <div id="app-update-text" style="font-size:12px;color:var(--text3);line-height:1.6;margin-bottom:18px">A new version is available.</div>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <button class="btn-o" onclick="dismissAppUpdateModal()">Later</button>
      <button class="btn" onclick="forceAppUpdate()">Update Now</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',function(e){if(e.target===modal)dismissAppUpdateModal();});
  return modal;
}
function showAppUpdateModal(latestVersion){
  const currentVersion=_currentAppVersion();
  const modal=_ensureUpdateModal();
  const text=modal.querySelector('#app-update-text');
  if(text) text.textContent=`${latestVersion} version is available, click update to proceed`;
  modal.style.display='flex';
  localStorage.setItem('ss-latest-version',String(latestVersion||''));
  localStorage.setItem('ss-current-version',String(currentVersion||''));
}
function dismissAppUpdateModal(){
  const modal=document.getElementById('modal-app-update');
  if(modal) modal.style.display='none';
  const latest=localStorage.getItem('ss-latest-version');
  if(latest) localStorage.setItem('ss-dismissed-update-version', latest);
}
async function forceAppUpdate(){
  sessionStorage.setItem('ss-return-page',_currentPage||'dashboard');
  const modal=document.getElementById('modal-app-update');
  if(modal) modal.style.display='none';
  try{
    if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg){
        await reg.update().catch(()=>{});
        if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
      }
    }
  }catch(e){}
  // NOTE: Don't clear caches here — it breaks service worker bootstrap
  // and can cause auth verification failure → unwanted re-login.
  const url=new URL(window.location.href);
  url.searchParams.set('update', Date.now().toString());
  window.location.replace(url.toString());
}
window.requestAppUpdate = async function(){
  try{
    const current=await ensureAppVersion();
    const dismissed=localStorage.getItem('ss-dismissed-update-version')||'';
    const res=await fetch('/api/releases',{cache:'no-store'});
    if(!res.ok) return forceAppUpdate();
    const data=await res.json().catch(()=>({}));
    const releases=Array.isArray(data.releases)?data.releases:[];
    const latest=releases[0]?.version || releases[0]?.versionName || '';
    if(latest && _isVersionNewer(latest,current)){
      if(dismissed!==String(latest)) showAppUpdateModal(latest);
      else forceAppUpdate();
      return;
    }
  }catch(e){}
  return forceAppUpdate();
};

document.addEventListener('DOMContentLoaded', function() {
  initLogin();
  ensureAppVersion().then(_syncVersionLabels).catch(_syncVersionLabels);

  // Register service worker for PWA + offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        window.swRegistration = reg;
        console.log('[SW] Registered', reg.scope);
        // Proactively look for newer deployments.
        reg.update().catch(()=>{});
      })
      .catch(err => console.warn('[SW] Registration failed', err));
  }

  // Prompt on startup if a newer release exists.
  setTimeout(async function(){
    try{
      const current=await ensureAppVersion();
      const dismissed=localStorage.getItem('ss-dismissed-update-version')||'';
      const res=await fetch('/api/releases',{cache:'no-store'});
      if(!res.ok) return;
      const data=await res.json().catch(()=>({}));
      const latest=(Array.isArray(data.releases)?data.releases:[])[0]?.version || '';
      if(latest && _isVersionNewer(latest,current) && dismissed!==String(latest)){
        showAppUpdateModal(latest);
      }
    }catch(e){}
  }, 1200);

  // Notification permission is ONLY requested via requestPushPermission() after a user gesture.
  // Never call Notification.requestPermission() directly outside that function.

  // Hash routing: handle browser back/forward navigation
  window.addEventListener('hashchange', function(){
    const pg=(window.location.hash||'').replace('#','');
    if(pg&&typeof _currentPage!=='undefined'&&_currentPage!==pg&&typeof nav==='function'){
      nav(pg);
    }
  });
});
