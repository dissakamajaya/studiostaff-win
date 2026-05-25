// notification-handler.js — Push, Badge, Realtime (Supabase Broadcast + polling fallback)
// All functions are global (no module system). Loaded last before main.js.

var _realtimeInterval = null;   // fallback polling handle
var _realtimeChannel  = null;   // Supabase Realtime channel handle
var _lastWorkspaceTs  = null;   // tracks last known updated_at for polling fallback
var _supabaseClient   = null;   // Supabase JS client (initialized after config fetch)
var _realtimeBound    = false;  // ensures visibility/focus listeners are attached once
const POLLING_FALLBACK_INTERVAL_MS = 15000;

function _summarizeRecentWorkspaceActivity() {
  const logs = Array.isArray(DB?.activityLog) ? DB.activityLog : [];
  if (!logs.length) return '';
  const latest = [...logs]
    .sort((a, b) => new Date((b && (b.ts || b.timestamp || b.createdAt)) || 0) - new Date((a && (a.ts || a.timestamp || a.createdAt)) || 0))
    .find(entry => entry && (entry.desc || entry.details || entry.description || entry.type || entry.action));
  if (!latest) return '';
  const type = latest.type || latest.entityType || 'Workspace';
  const action = latest.action || 'Updated';
  const desc = latest.desc || latest.details || latest.description || '';
  return desc ? `${type} ${action}: ${desc}` : `${type} ${action}`;
}

// ── Push subscription ─────────────────────────────────────────────────────────
async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission === 'denied') return;

  try {
    const keyRes = await fetch('/api/config');
    if (!keyRes.ok) return;
    const { vapidPublicKey: publicKey } = await keyRes.json();
    if (!publicKey) return;

    const reg = await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      if (Notification.permission !== 'granted') return;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: _urlBase64ToUint8Array(publicKey),
      });
    }

    const token = localStorage.getItem('ss-token');
    if (token) {
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      }).catch(() => {});
    }
  } catch (e) {
    // AbortError = push service unavailable or VAPID key mismatch — not a user error
    if (e && e.name !== 'AbortError') console.warn('[Push] Subscribe failed', e);
  }
}

// ── Permission request — sole entry point, must be called from a user gesture ─
async function requestPushPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    await initPushNotifications();
    return;
  }
  if (Notification.permission === 'denied') return;
  const perm = await Notification.requestPermission();
  if (perm === 'granted') await initPushNotifications();
}

// ── Unsubscribe on logout ─────────────────────────────────────────────────────
async function unsubscribePush() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const token = localStorage.getItem('ss-token');
    if (token) {
      await fetch('/api/push-subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
    }
    await sub.unsubscribe();
  } catch (e) {}
}

// ── App badge ─────────────────────────────────────────────────────────────────
function updateAppBadge(count) {
  if ('setAppBadge' in navigator) {
    count > 0
      ? navigator.setAppBadge(count).catch(() => {})
      : navigator.clearAppBadge().catch(() => {});
  } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SET_BADGE', count });
  }
}

// ── Shared data refresh helper ────────────────────────────────────────────────
async function _applyRemoteUpdate(updatedBy, updatedByName, changeSummary) {
  if (typeof currentUser !== 'undefined' && updatedBy === currentUser) return;

  const token = localStorage.getItem('ss-token');
  if (!token) return;
  try {
    const r = await fetch('/api/data', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!r.ok) return;
    const j = await r.json();
    if (!j.data || Object.keys(j.data).length === 0) return;

    DB = j.data;
    if (j.updated_at) {
      _lastWorkspaceTs = j.updated_at;
      window._workspaceMetaTs = j.updated_at;
    }
    if (typeof migrateDB === 'function') migrateDB();
    // Reset the local diff baseline to the freshly fetched server state.
    // Without this, the next save would diff against the pre-pull snapshot
    // and re-upsert rows that were already changed remotely.
    if (typeof _snapshotDB === 'function') _snapshotDB();
    if (typeof _saveCacheDB === 'function') _saveCacheDB();
    if (typeof updateNotifCount === 'function') updateNotifCount();
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof renderPage === 'function') renderPage();

    if (typeof DB !== 'undefined' && DB.notifications && typeof currentUser !== 'undefined') {
      const unread = DB.notifications.filter(n => {
        if (n.userId !== currentUser || n.read) return false;
        if (typeof _isImportantNotification === 'function') return _isImportantNotification(n);
        const type = String(n.type || '').toLowerCase();
        const wideTypes = new Set([
          'quote','invoice','task','project','domestic','journal','leave','payroll',
          'food','reimburse','reminder','doc','alert','announcement','approval',
          'expense','income','payment','event','calendar','update','assignment',
          'deadline','overdue'
        ]);
        if (wideTypes.has(type)) return true;
        const msg = String(n.message || '').toLowerCase();
        return [
          'mentioned you',
          'tagged you',
          'assigned you',
          'assigned to you',
          'awaiting approval',
          'needs approval',
          'pending approval',
          'approved',
          'rejected',
          'paid',
          'overdue',
          'due today',
          'due tomorrow',
          'due soon',
          'new comment',
          'replied to your comment',
          'status changed',
          'created',
          'updated',
          'reminder',
          'completed',
          'cancelled',
          'reopened',
          'submitted',
          'requested',
        ].some(phrase => msg.includes(phrase));
      }).length;
      updateAppBadge(unread);
    }

    if (typeof showToast === 'function') {
      const name = updatedByName || (typeof getUserName === 'function' ? getUserName(updatedBy) : '') || 'Another team member';
      const summary = changeSummary || _summarizeRecentWorkspaceActivity();
      showToast(summary ? `${name} made changes: ${summary}` : `${name} made changes`, 'info');
    }
  } catch (e) {
    console.warn('[Realtime] Failed to apply remote update', e);
  }
}

// ── Supabase Realtime broadcast ───────────────────────────────────────────────
async function initRealtimeBroadcast() {
  if (typeof window.supabase === 'undefined') {
    _startPollingFallback();
    return;
  }

  try {
    const cfgRes = await fetch('/api/config');
    if (!cfgRes.ok) throw new Error('Config fetch failed: ' + cfgRes.status);
    const { supabaseUrl, supabaseAnonKey } = await cfgRes.json();
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase config values');

    _supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

    if (_realtimeChannel) {
      await _supabaseClient.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }

    _realtimeChannel = _supabaseClient
      .channel('workspace-updates')
      .on('broadcast', { event: 'data-changed' }, async (payload) => {
        const { updated_by, updated_by_name, change_summary } = payload.payload || {};
        await _applyRemoteUpdate(updated_by || null, updated_by_name || null, change_summary || null);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to workspace-updates channel');
          _startPollingFallback(POLLING_FALLBACK_INTERVAL_MS);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Expected when Supabase Realtime is not configured or channel doesn't exist
          // Silently fall back to polling — no need to alarm the console
          _startPollingFallback(POLLING_FALLBACK_INTERVAL_MS);
        }
      });
  } catch (e) {
    _startPollingFallback(POLLING_FALLBACK_INTERVAL_MS);
  }
}

// ── Polling fallback ──────────────────────────────────────────────────────────
function _startPollingFallback(intervalMs) {
  if (_realtimeInterval) clearInterval(_realtimeInterval);
  _realtimeInterval = setInterval(_pollWorkspace, intervalMs || 60000);
}

function initRealtimeSync() {
  _lastWorkspaceTs = window._workspaceMetaTs || _lastWorkspaceTs || null;
  if (!_realtimeBound) {
    window.addEventListener('focus', _pollWorkspace);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') _pollWorkspace();
    });
    _realtimeBound = true;
  }
  _pollWorkspace();
  initRealtimeBroadcast();
}

function stopRealtimeSync() {
  if (_realtimeInterval) { clearInterval(_realtimeInterval); _realtimeInterval = null; }
  if (_realtimeChannel && _supabaseClient) {
    _supabaseClient.removeChannel(_realtimeChannel).catch(() => {});
    _realtimeChannel = null;
  }
}

async function _pollWorkspace() {
  if (typeof currentUser === 'undefined' || !currentUser) return;
  const token = localStorage.getItem('ss-token');
  if (!token) return;
  try {
    const r = await fetch('/api/data?meta=1', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!r.ok) return;
    const j = await r.json();
    const ts = j.updated_at || null;
    const updatedBy = j.updated_by || null;
    const updatedByName = j.updated_by_name || null;
    if (_lastWorkspaceTs === null) { _lastWorkspaceTs = ts; return; }
    if (ts && ts !== _lastWorkspaceTs && updatedBy !== currentUser) {
      _lastWorkspaceTs = ts;
      window._workspaceMetaTs = ts;
      await _applyRemoteUpdate(updatedBy, updatedByName, null);
    }
  } catch (e) {}
}

// ── iOS "Add to Home Screen" banner ──────────────────────────────────────────
function showIosInstallBanner() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!isIos || isStandalone) return;
  if (localStorage.getItem('ios-install-dismissed')) return;

  const banner = document.createElement('div');
  banner.id = 'ios-install-banner';
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1e1e2e;color:#e2e8f0;padding:14px 16px 24px;font-size:12px;z-index:9999;display:flex;align-items:flex-start;gap:12px;border-top:1px solid #334155;';
  banner.innerHTML = '<div style="font-size:24px;flex-shrink:0">📲</div><div style="flex:1"><div style="font-weight:600;margin-bottom:3px">Add to Home Screen</div><div style="color:#94a3b8;line-height:1.4">Tap <strong>Share</strong> → <strong>"Add to Home Screen"</strong> to get push notifications and the app icon badge.</div></div><button onclick="document.getElementById(\'ios-install-banner\').remove();localStorage.setItem(\'ios-install-dismissed\',\'1\')" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;flex-shrink:0;padding:0">✕</button>';
  document.body.appendChild(banner);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}
