// ════════════════════════════════════════
// MOBILE-LITE SHELL
// Mounted at viewport <= 768px. See DESIGN.md.
// Reuses DB, currentUser, saveDBFn, fmtDate, rp, getUserName, addNotification.
// ════════════════════════════════════════

(function(){
  'use strict';

  var MBP = 1000;
  var DEEP_EDIT_PAGES = ['finance','invoices','database','walog','settings'];
  var _mState = { tab: 'chat', sheet: null, mounted: false, chatGreeted: false };
  var _resizeBound = false;

  // ── today cache (shared across schedule, presence, tasks tabs) ──
  var _mTodayCache = null;
  var _mTodayLastFetch = 0;
  var MTODAY_DEBOUNCE_MS = 30000;
  var _mTodayFetching = false;
  var _mTodayFailCount = 0;

  // ── schedule view state (today/week/month) ──
  var _mScheduleView = 'today';
  var _mLastFetchedView = '';

  async function _fetchMTodayData(force){
    var now = Date.now();
    var viewChanged = _mScheduleView !== _mLastFetchedView;
    if (!force && !viewChanged && _mTodayCache && (now - _mTodayLastFetch) < MTODAY_DEBOUNCE_MS) return _mTodayCache;
    if (_mTodayFetching) return _mTodayCache;
    _mTodayFetching = true;
    var token = (function(){ try { return localStorage.getItem('ss-token'); } catch(_) { return null; } })();
    if (!token){ _mTodayFetching = false; return null; }
    try {
      var r = await fetch('/api/data?today=1&view=' + _mScheduleView, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!r.ok){
        _mTodayFetching = false;
        _mTodayFailCount++;
        return _mTodayCache;
      }
      _mTodayCache = await r.json();
      _mTodayLastFetch = now;
      _mLastFetchedView = _mScheduleView;
      _mTodayFailCount = 0;
      _mTodayFetching = false;
      return _mTodayCache;
    } catch(e){
      console.warn('[mlite] today fetch failed:', e.message);
      _mTodayFailCount++;
      _mTodayFetching = false;
      return _mTodayCache;
    }
  }

  function _today(){ return new Date().toISOString().slice(0,10); }
  function _monthKey(d){ d = d ? new Date(d) : new Date(); return d.toISOString().slice(0,7); }
  function _fmtShort(n){
    if (!Number.isFinite(n)) return '0';
    var abs = Math.abs(n);
    if (abs >= 1e9) return (n/1e9).toFixed(1).replace(/\.0$/,'') + 'B';
    if (abs >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'') + 'M';
    if (abs >= 1e3) return (n/1e3).toFixed(0) + 'k';
    return String(Math.round(n));
  }
  function _esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── unified tap handler (touch+click with double-fire guard) ──
  function _addTapListener(el, handler, preventDefault) {
    var _lastFired = 0, _startX, _startY;
    el.addEventListener('touchstart', function(e) {
      _startX = e.touches[0].clientX;
      _startY = e.touches[0].clientY;
    }, {passive: true});
    el.addEventListener('touchmove', function(e) {
      var dx = Math.abs(e.touches[0].clientX - _startX);
      var dy = Math.abs(e.touches[0].clientY - _startY);
      if (dx > 10 || dy > 10) _startX = NaN;
    }, {passive: true});
    el.addEventListener('touchend', function(e) {
      if (isNaN(_startX)) return;
      _startX = NaN;
      _lastFired = Date.now();
      if (preventDefault !== false) e.preventDefault();
      handler(e);
    });
    el.addEventListener('click', function(e) {
      if (Date.now() - _lastFired < 400) return;
      handler(e);
    });
  }

  // ── icons (inline SVG, 14×14 viewbox to match desktop sidebar) ──────────
  var ICONS = {
    home:    '<rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".7"/><rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".7"/><rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".7"/><rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".7"/>',
    bell:    '<path d="M7 1.5c-2 0-3.5 1.5-3.5 3.5v2.5L2 9.5h10L10.5 7.5V5c0-2-1.5-3.5-3.5-3.5z" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M5.5 10.5c0 .8.67 1.5 1.5 1.5s1.5-.7 1.5-1.5" stroke="currentColor" stroke-width="1.3" fill="none"/>',
    plus:    '<path d="M7 3v8M3 7h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    check:   '<path d="M2 7l3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    user:    '<circle cx="7" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M1 13c0-3 2.5-4.5 6-4.5S13 10 13 13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>',
    moon:    '<path d="M11 8.5A4.5 4.5 0 016.5 4c0-1 .3-1.9.8-2.6A5.5 5.5 0 1011.6 9c-.2 0-.4 0-.6-.1z" fill="currentColor"/>',
    sun:     '<circle cx="7" cy="7" r="2.5" fill="currentColor"/><path d="M7 1v1.5M7 11.5v1.5M1 7h1.5M11.5 7h1.5M2.5 2.5l1 1M10.5 10.5l1 1M2.5 11.5l1-1M10.5 3.5l1-1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
    message: '<path d="M2 3h10a1 1 0 011 1v6a1 1 0 01-1 1H6l-3 2v-2H2a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linejoin="round"/>',
    edit:    '<path d="M2 11.5L2.5 9l6.5-6.5 2 2L4.5 11l-2.5.5z" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linejoin="round"/><path d="M8 3l2 2" stroke="currentColor" stroke-width="1.2"/>',
    send:    '<path d="M1 7l11-5-3 11-3-4-5-2z" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linejoin="round"/>',
    refresh: '<path d="M7 1.5A5.5 5.5 0 001.5 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/><path d="M2 2l-1 1 2 .5-.5-2z" fill="currentColor"/><path d="M7 12.5A5.5 5.5 0 0012.5 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/><path d="M12 12l1-1-2-.5.5 2z" fill="currentColor"/>',
    desktop: '<rect x="2" y="2.5" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M5 12.5h4M7 9.5v3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
    calendar: '<rect x="1.5" y="2" width="11" height="10.5" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="1.5" y1="5.5" x2="12.5" y2="5.5" stroke="currentColor" stroke-width="1"/><line x1="4.5" y1="1" x2="4.5" y2="3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><line x1="9.5" y1="1" x2="9.5" y2="3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
    users: '<circle cx="5" cy="4.5" r="2.3" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M1.5 13c0-3 2-4 3.5-4s3.5 1 3.5 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/><circle cx="10.5" cy="5" r="1.6" stroke="currentColor" stroke-width="1" fill="none"/><path d="M7.5 11.5c0-2 1.5-2.5 2.5-2.5s2.5.5 2.5 2.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" fill="none"/>',
  };
  function _icon(name, sz){
    sz = sz || 18;
    return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 14 14" fill="none">'+(ICONS[name]||'')+'</svg>';
  }

  // ── data slices ─────────────────────────────────────────────────────────
  function _todayEvents(){
    if (typeof DB === 'undefined' || !DB || !DB.events) return [];
    var t = _today();
    return DB.events
      .filter(function(e){ return (e.date||'').slice(0,10) === t; })
      .sort(function(a,b){ return String(a.time||'').localeCompare(String(b.time||'')); });
  }
  function _monthlyTxn(monthKey){
    if (!DB || !DB.transactions) return { income:0, expense:0 };
    var inc = 0, exp = 0;
    DB.transactions.forEach(function(tx){
      var ts = tx.date || tx.createdAt || '';
      if (ts.slice(0,7) !== monthKey) return;
      var amt = Number(tx.amount) || 0;
      if (tx.type === 'income' || tx.type === 'in') inc += amt;
      else if (tx.type === 'expense' || tx.type === 'out') exp += amt;
    });
    return { income: inc, expense: exp };
  }
  function _last12MonthBars(){
    var bars = [];
    var d = new Date();
    for (var i = 11; i >= 0; i--){
      var dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      var key = dt.toISOString().slice(0,7);
      var m = _monthlyTxn(key);
      bars.push(m.income - m.expense);
    }
    var max = Math.max.apply(null, bars.map(Math.abs).concat([1]));
    return bars.map(function(v){ return Math.max(8, Math.round(48 * Math.abs(v)/max + 8)); });
  }
  function _myTasksMerged(){
    if (!DB) return [];
    var tasks = (DB.tasks||[])
      .filter(function(t){ return t.assignee === currentUser && t.status !== 'Done'; })
      .map(function(t){ return { kind:'task', id:t.id, title:t.name||t.title, due:t.dueDate, priority:t.priority||'normal', project:t.projectId, _ref:t }; });
    var dom = (DB.domestics||[])
      .filter(function(t){ return t.assignee === currentUser && t.status !== 'Done'; })
      .map(function(t){ return { kind:'domestic', id:t.id, title:t.name, due:t.dueDate, priority:t.priority||'normal', project:'Domestic', _ref:t }; });
    return tasks.concat(dom).sort(function(a,b){
      var ad = a.due || '9999', bd = b.due || '9999';
      return ad.localeCompare(bd);
    });
  }
  function _activityFeed(limit){
    if (!DB) return [];
    var notifs = (DB.notifications||[])
      .filter(function(n){ return n.userId === currentUser; })
      .map(function(n){
        return { ts: n.createdAt || n.ts || '', who: n.userId, msg: n.message, ic: '🔔', read: !!n.read, _ref: n };
      });
    var acts = (DB.activityLog||[]).map(function(a){
      return { ts: a.ts || a.timestamp || '', who: a.user || a.module || 'system', msg: (a.action || '') + ' ' + (a.desc || a.details || ''), ic: '·', _ref: a };
    });
    return notifs.concat(acts)
      .sort(function(a,b){ return new Date(b.ts) - new Date(a.ts); })
      .slice(0, limit || 60);
  }

  // ── chat helpers ────────────────────────────────────────────────────────
  var CHAT_HISTORY_KEY = 'ss-chat-history';
  function _loadChatHistory(){
    try {
      var raw = sessionStorage.getItem(CHAT_HISTORY_KEY);
      var h = raw ? JSON.parse(raw) : [];
      return Array.isArray(h) ? h : [];
    } catch(_) { return []; }
  }
  function _saveChatHistory(h){
    try {
      if (h.length > 50) h = h.slice(-50);
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(h));
    } catch(_){}
  }
  function _formatChatMsg(text){
    if (typeof window.ssChatFormatMsg === 'function') return window.ssChatFormatMsg(text);
    if (!text) return '';
    var t = String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    t = t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
         .replace(/\*(.+?)\*/g,'<em>$1</em>')
         .replace(/`([^`]+)`/g,'<code>$1</code>')
         .replace(/\n/g,'<br>')
         .replace(/---/g,'—');
    return t;
  }
  function _greetingFor(name){
    var hour = new Date().getHours();
    var first = (name||'').split(' ')[0] || 'Pak/Bu';
    var openers = hour < 11
      ? ['Assalamualaikum '+first+'! Selamat pagi, ada yang bisa Bu Fitri bantu hari ini?',
         'Pagi '+first+'~ Sudah sarapan? Mau cek apa nih?']
      : hour < 15
      ? ['Assalamualaikum '+first+'! Siang gini biasanya repot ya, apa yang bisa Bu Fitri urus?',
         'Halo '+first+'! Mau lihat agenda atau catat sesuatu?']
      : hour < 19
      ? ['Sore '+first+'~ Sudah waktunya rekap, mau Bu Fitri bantu apa?',
         'Halo '+first+'! Ada update transaksi atau task baru?']
      : ['Malam '+first+'~ Mau review hari ini atau jadwalin besok?',
         'Assalamualaikum '+first+'! Jangan lupa istirahat ya. Ada yang perlu dicatat?'];
    return openers[Math.floor(Math.random()*openers.length)];
  }
  function _chatAppendMsg(role, text){
    var msgs = document.getElementById('m-chat-msgs');
    if (!msgs) return null;
    var div = document.createElement('div');
    div.className = 'm-chat-msg m-chat-msg-' + role;
    div.innerHTML = _formatChatMsg(text);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }
  function _chatAppendLoading(){
    var msgs = document.getElementById('m-chat-msgs');
    if (!msgs) return null;
    var div = document.createElement('div');
    div.className = 'm-chat-msg m-chat-msg-loading';
    div.id = 'm-chat-loading';
    div.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }
  function _chatRemoveLoading(){
    var el = document.getElementById('m-chat-loading');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  var _mChatBusy = false;
  async function _chatSend(){
    if (_mChatBusy) return;
    var inp = document.getElementById('m-chat-input');
    var sendBtn = document.getElementById('m-chat-send');
    if (!inp) return;
    var text = (inp.value || '').trim();
    if (!text) return;
    _mChatBusy = true;
    inp.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    var history = _loadChatHistory();
    history.push({ role:'user', content:text });
    _saveChatHistory(history);
    _chatAppendMsg('user', text);
    inp.value = '';
    inp.style.height = 'auto';
    _chatAppendLoading();

    try {
      var token = (function(){ try { return localStorage.getItem('ss-token'); } catch(_) { return null; } })();
      if (!token){
        _chatRemoveLoading();
        var err = 'Belum login nih Pak/Bu. Login dulu ya biar Bu Fitri bisa bantu.';
        history.push({ role:'assistant', content:err });
        _saveChatHistory(history);
        _chatAppendMsg('assistant', err);
        return;
      }
      var apiHistory = history.slice(-21, -1);
      var res = await fetch('/api/chat', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token },
        body: JSON.stringify({ message: text, history: apiHistory }),
      });
      _chatRemoveLoading();
      if (!res.ok){
        var errData = {};
        try { errData = await res.json(); } catch(_){}
        var msg = 'Astaghfirullah, ada kendala: ' + (errData.error || ('HTTP ' + res.status)) + (errData.hint ? '. ' + errData.hint : '') + '.';
        history.push({ role:'assistant', content: msg });
        _saveChatHistory(history);
        _chatAppendMsg('assistant', msg);
      } else {
        var data = await res.json();
        var reply = data.reply || 'Bu Fitri bingung nih. Coba diulangi ya...';
        history.push({ role:'assistant', content: reply });
        _saveChatHistory(history);
        _chatAppendMsg('assistant', reply);
        if (data.action && typeof window.refreshDashboard === 'function'){
          setTimeout(window.refreshDashboard, 600);
        }
      }
    } catch(e){
      _chatRemoveLoading();
      var net = 'Aduh, koneksinya putus nih. Coba lagi ya...';
      history.push({ role:'assistant', content: net });
      _saveChatHistory(history);
      _chatAppendMsg('assistant', net);
    } finally {
      _mChatBusy = false;
      inp.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      inp.focus();
    }
  }

  // ── tab content renderers ───────────────────────────────────────────────
  function _renderChat(){
    var u = (USERS||[]).find(function(x){ return x.id === currentUser; }) || { name:'User', color:'#888' };
    var initial = _esc((u.name||'?')[0].toUpperCase());
    var html = '';
    html += '<div class="m-chat-banner">';
    html += '<div class="m-chat-banner-av">BF<span class="m-chat-banner-dot"></span></div>';
    html += '<div class="m-chat-banner-txt">';
    html += '<div class="m-chat-banner-name">Ibu Fitri</div>';
    html += '<div class="m-chat-banner-sub">Asisten pribadi EXP kamu</div>';
    html += '</div></div>';

    html += '<div class="m-chat-msgs" id="m-chat-msgs">';
    var history = _loadChatHistory();
    if (!history.length){
      html += '<div class="m-chat-msg m-chat-msg-assistant">'+ _formatChatMsg(_greetingFor(u.name)) +'</div>';
    } else {
      history.forEach(function(m){
        html += '<div class="m-chat-msg m-chat-msg-'+ _esc(m.role) +'">'+ _formatChatMsg(m.content) +'</div>';
      });
    }
    html += '</div>';

    html += '<div class="m-chat-input-wrap">';
    html += '<div class="m-chat-avatar" style="background:'+u.color+'22;color:'+u.color+'">'+ initial +'</div>';
    html += '<textarea class="m-chat-input" id="m-chat-input" rows="1" placeholder="Tanya Bu Fitri..."></textarea>';
    html += '<button class="m-chat-send" id="m-chat-send" aria-label="Send">'+ _icon('send', 18) +'</button>';
    html += '</div>';
    return html;
  }

  function _renderActivity(){
    var feed = _activityFeed(60);
    var html = '<div class="m-section-title" style="margin-top:14px">Activity feed</div>';
    if (!feed.length){
      html += '<div class="m-list"><div style="padding:24px;text-align:center;color:var(--ink-4);font-size:12px">No recent activity.</div></div>';
      return html;
    }
    html += '<div class="m-list">';
    feed.forEach(function(a){
      var who = getUserName(a.who) || a.who || '—';
      var ts = a.ts ? new Date(a.ts).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
      html += '<div class="m-list-item">';
      html += '<div class="m-act-ic">'+ _esc(a.ic) +'</div>';
      html += '<div style="flex:1">';
      html += '<div style="font-size:13px"><b>'+ _esc(who) +'</b> <span style="color:var(--ink-4)">'+ _esc(a.msg||'').slice(0,140) +'</span></div>';
      html += '<div style="font-size:10px;color:var(--ink-5);font-family:var(--mono);margin-top:2px">'+ _esc(ts) +'</div>';
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function _relativeTime(ts){
    if (!ts) return '';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 45) return 'just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff/86400) + 'd ago';
    return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
  }

  function _journalLabelColor(label){
    var map = (typeof journalLabelColors !== 'undefined' && journalLabelColors) || {};
    return map[label] || 'var(--ink-4)';
  }

  function _commentsForJournal(jid){
    if (typeof getJournalComments === 'function') return getJournalComments(jid);
    if (!DB || !DB.journalComments) return [];
    return DB.journalComments
      .filter(function(c){ return c.journalId === jid; })
      .sort(function(a,b){ return new Date(b.createdAt) - new Date(a.createdAt); });
  }

  // ── X-style helpers: mentions, threaded replies, likes ─────────────────
  function _parseCommentBody(text){
    var t = String(text == null ? '' : text);
    var m = t.match(/^\[\[reply:(\d+)\]\]([\s\S]*)$/);
    if (m) return { parentId: Number(m[1]), body: m[2] };
    return { parentId: null, body: t };
  }
  function _extractMentions(text){
    if (!text) return [];
    var users = (typeof USERS !== 'undefined' && USERS) ? USERS : [];
    var found = {};
    var re = /@([A-Za-z][A-Za-z0-9 _'-]{0,30})/g;
    var match;
    while ((match = re.exec(text)) !== null){
      var raw = match[1].trim();
      var hit = null;
      // Greedy first-name + last-name match
      users.forEach(function(u){
        if (!u || !u.name || !u.id) return;
        var n = u.name.toLowerCase();
        var r = raw.toLowerCase();
        if (r === n || r.indexOf(n) === 0 || n.split(' ')[0] === r.split(' ')[0]){
          if (!hit || (u.name.length > hit.name.length)) hit = u;
        }
      });
      if (hit) found[hit.id] = true;
    }
    return Object.keys(found);
  }
  function _renderMentionsHTML(text){
    if (!text) return '';
    var users = (typeof USERS !== 'undefined' && USERS) ? USERS : [];
    var safe = _esc(text);
    return safe.replace(/@([A-Za-z][A-Za-z0-9 _&#39;\-]{0,30})/g, function(full, name){
      var clean = name.trim();
      var hit = null;
      users.forEach(function(u){
        if (!u || !u.name) return;
        var n = u.name.toLowerCase();
        var r = clean.toLowerCase();
        if (r === n || r.indexOf(n) === 0){
          if (!hit || u.name.length > hit.name.length) hit = u;
        }
      });
      if (!hit) return full;
      var c = (typeof getUserColor === 'function') ? getUserColor(hit.id) : 'var(--ocean)';
      var label = clean.slice(0, hit.name.length);
      var rest = clean.slice(hit.name.length);
      return '<span class="m-mention" style="color:'+c+';background:'+c+'1a">@'+ _esc(label) +'</span>'+ _esc(rest);
    });
  }
  function _journalLikes(jid){
    if (!DB || !DB.journalReactions) return { count: 0, mine: false };
    var likes = DB.journalReactions.filter(function(r){ return r.journalId === jid && r.emoji === '👍'; });
    return { count: likes.length, mine: likes.some(function(r){ return r.userId === currentUser; }) };
  }
  async function _mLikeJournal(jid){
    if (typeof toggleReaction !== 'function') return;
    await toggleReaction(jid, '👍');
    var j = (DB.journals || []).find(function(x){ return x.id === jid; });
    if (j && j.createdBy && j.createdBy !== currentUser){
      var liked = (DB.journalReactions || []).some(function(r){
        return r.journalId === jid && r.userId === currentUser && r.emoji === '👍';
      });
      if (liked && typeof addNotification === 'function'){
        addNotification(j.createdBy, getUserName(currentUser) + ' liked your post', 'journal', jid);
      }
    }
    var scrollY = window.scrollY;
    renderMobileShell();
    window.scrollTo(0, scrollY);
  }
  async function _mPostComment(jid, parentId, text){
    text = (text || '').trim();
    if (!text) return;
    if (!DB.journalComments) DB.journalComments = [];
    var stored = parentId ? ('[[reply:' + parentId + ']]' + text) : text;
    var localId = Date.now();
    DB.journalComments.push({
      id: localId,
      journalId: jid,
      userId: currentUser,
      text: stored,
      createdAt: new Date().toISOString()
    });
    if (typeof saveDBFn === 'function') saveDBFn();
    var scrollY = window.scrollY;
    renderMobileShell();
    window.scrollTo(0, scrollY);

    // Notifications: journal author, parent comment author, mentioned users
    var j = (DB.journals || []).find(function(x){ return x.id === jid; });
    var notified = {};
    function notify(uid, msg){
      if (!uid || uid === currentUser || notified[uid]) return;
      notified[uid] = true;
      if (typeof addNotification === 'function') addNotification(uid, msg, 'journal', jid);
    }
    if (j) notify(j.createdBy, getUserName(currentUser) + ' commented on your post');
    if (parentId){
      var parent = (DB.journalComments || []).find(function(c){ return c.id === parentId; });
      if (parent) notify(parent.userId, getUserName(currentUser) + ' replied to your comment');
    }
    _extractMentions(text).forEach(function(uid){
      notify(uid, getUserName(currentUser) + ' mentioned you in a comment');
    });

    // Persist to Supabase
    if (typeof insertToSupabase === 'function'){
      await insertToSupabase('journal_comments', {
        journal_id: jid,
        user_id: currentUser,
        text: stored
      });
      if (typeof loadRealtimeJournalData === 'function'){
        setTimeout(function(){
          loadRealtimeJournalData().then(function(){ renderMobileShell(); }).catch(function(){});
        }, 400);
      }
    }
  }
  async function _mDeleteComment(jid, cid){
    if (!DB.journalComments) return;
    DB.journalComments = DB.journalComments.filter(function(c){ return c.id !== cid; });
    if (typeof saveDBFn === 'function') saveDBFn();
    var scrollY = window.scrollY;
    renderMobileShell();
    window.scrollTo(0, scrollY);
    if (typeof deleteFromSupabase === 'function'){
      await deleteFromSupabase('journal_comments', 'id', cid);
      if (typeof loadRealtimeJournalData === 'function') setTimeout(loadRealtimeJournalData, 400);
    }
  }

  // Mention autocomplete (lightweight, no library)
  function _attachMentionPicker(input){
    if (!input) return;
    var users = (typeof USERS !== 'undefined' && USERS) ? USERS : [];
    var picker = null;
    var isRTE = input.contentEditable === 'true' || input.getAttribute('contenteditable') === 'true';
    function close(){ if (picker && picker.parentNode){ picker.parentNode.removeChild(picker); picker = null; } }
    function getCtx(){
      if (isRTE){
        var sel = window.getSelection();
        if (!sel.rangeCount) return null;
        var node = sel.focusNode;
        if (!node || node.nodeType !== 3) return null;
        var text = node.textContent || '';
        var offset = sel.focusOffset;
        var before = text.slice(0, offset);
        var m = before.match(/@([A-Za-z][A-Za-z0-9 _'-]{0,30})$/);
        if (!m) return null;
        return { match: m[0], query: m[1].toLowerCase().trim(), start: offset - m[0].length, end: offset, node: node };
      } else {
        var v = input.value || '';
        var pos = input.selectionStart || v.length;
        var before = v.slice(0, pos);
        var m = before.match(/@([A-Za-z][A-Za-z0-9 _'-]{0,30})$/);
        if (!m) return null;
        return { match: m[0], query: m[1].toLowerCase().trim(), start: pos - m[0].length, end: pos };
      }
    }
    function show(matches, ctx){
      close();
      if (!matches.length) return;
      picker = document.createElement('div');
      picker.className = 'm-mention-picker';
      var rect = input.getBoundingClientRect();
      picker.style.left = rect.left + 'px';
      picker.style.top = (rect.bottom + 4) + 'px';
      picker.style.width = Math.min(rect.width, 260) + 'px';
      matches.forEach(function(u){
        var c = (typeof getUserColor === 'function') ? getUserColor(u.id) : '#888';
        var item = document.createElement('div');
        item.className = 'm-mention-item';
        item.innerHTML = '<span class="m-mention-av" style="background:'+c+'22;color:'+c+'">'+ _esc(u.name[0].toUpperCase()) +'</span><span>'+ _esc(u.name) +'</span>';
        item.addEventListener('mousedown', function(e){
          e.preventDefault();
          if (isRTE && ctx.node){
            var textNode = ctx.node;
            var text = textNode.textContent || '';
            var before = text.slice(0, ctx.start);
            var after = text.slice(ctx.end);
            textNode.textContent = before + '@' + u.name + ' ' + after;
            var newOffset = ctx.start + u.name.length + 2;
            var range = document.createRange();
            range.setStart(textNode, newOffset);
            range.collapse(true);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            var v = input.value;
            var inserted = '@' + u.name + ' ';
            input.value = v.slice(0, ctx.start) + inserted + v.slice(ctx.end);
            var newPos = ctx.start + inserted.length;
            input.setSelectionRange(newPos, newPos);
          }
          input.focus();
          close();
        });
        picker.appendChild(item);
      });
      document.body.appendChild(picker);
    }
    input.addEventListener('input', function(){
      var ctx = getCtx();
      if (!ctx){ close(); return; }
      var matches = users.filter(function(u){
        return u && u.name && u.id && u.name.toLowerCase().indexOf(ctx.query) === 0;
      }).slice(0, 6);
      show(matches, ctx);
    });
    input.addEventListener('blur', function(){ setTimeout(close, 150); });
  }

  function _refreshJournalData(){
    var btn = document.getElementById('m-jrn-refresh');
    if (btn){ btn.style.animation = 'spin .6s linear'; btn.disabled = true; }
    var token = localStorage.getItem('ss-token');
    if (!token){ if(btn){btn.style.animation='';btn.disabled=false;} return; }
    fetch('/api/data', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r){ return r.json(); })
      .then(function(res){
        if (res.data && res.data.journals){
          DB.journals = res.data.journals;
          DB.journalComments = res.data.journalComments || [];
          DB.journalReactions = res.data.journalReactions || [];
          var nid = res.data.nextId;
          if (nid && nid.jn !== undefined) DB.nextId.jn = nid.jn;
          if (typeof _snapshotDB === 'function') _snapshotDB();
          renderMobileShell();
        }
      })
      .catch(function(){})
      .finally(function(){
        if (btn){ btn.style.animation = ''; btn.disabled = false; }
      });
  }

  function _renderJournalBodyHTML(text){
    if (!text) return '';
    if (!/<[a-z][\s\S]*>/i.test(text)) return _renderMentionsHTML(text);
    var div = document.createElement('div');
    div.innerHTML = text;
    _processMentionsInNode(div);
    return div.innerHTML;
  }
  function _processMentionsInNode(node){
    var users = (typeof USERS !== 'undefined' && USERS) ? USERS : [];
    if (node.nodeType === 3){
      var val = node.nodeValue;
      var frag = document.createDocumentFragment();
      var last = 0;
      val.replace(/@([A-Za-z][A-Za-z0-9 _\-]{0,30})/g, function(full, name, idx){
        if (idx > last) frag.appendChild(document.createTextNode(val.slice(last, idx)));
        var clean = name.trim();
        var hit = null;
        users.forEach(function(u){
          if (!u || !u.name) return;
          var n = u.name.toLowerCase();
          var r = clean.toLowerCase();
          if (r === n || r.indexOf(n) === 0){
            if (!hit || u.name.length > hit.name.length) hit = u;
          }
        });
        if (hit){
          var c = (typeof getUserColor === 'function') ? getUserColor(hit.id) : 'var(--ocean)';
          var label = clean.slice(0, hit.name.length);
          var rest = clean.slice(hit.name.length);
          var span = document.createElement('span');
          span.className = 'm-mention';
          span.style.cssText = 'color:'+c+';background:'+c+'1a';
          span.textContent = '@' + label;
          frag.appendChild(span);
          if (rest) frag.appendChild(document.createTextNode(rest));
        } else {
          frag.appendChild(document.createTextNode(full));
        }
        last = idx + full.length;
        return '';
      });
      if (last < val.length) frag.appendChild(document.createTextNode(val.slice(last)));
      if (frag.childNodes.length) node.parentNode.replaceChild(frag, node);
      return;
    }
    if (node.nodeType === 1 && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE'){
      var children = Array.prototype.slice.call(node.childNodes);
      children.forEach(function(child){ _processMentionsInNode(child); });
    }
  }
  function _renderJournal(){
    var u = (USERS||[]).find(function(x){ return x.id === currentUser; }) || { name:'User', color:'#888' };
    var initial = _esc((u.name||'?')[0].toUpperCase());
    var html = '';

    html += '<div class="m-journal-topbar">';
    html += '<span class="m-section-title">Journal</span>';
    html += '<button class="m-journal-refresh-btn" id="m-jrn-refresh" title="Refresh">'+ _icon('refresh', 14) +'</button>';
    html += '</div>';

    html += '<div class="m-journal-compose-inline" id="m-journal-compose-trigger">';
    html += '<div class="m-avatar m-journal-avatar" style="background:'+u.color+'22;color:'+u.color+'">'+ initial +'</div>';
    html += '<div class="m-journal-compose-inline-placeholder">Apa yang baru?</div>';
    html += '</div>';

    var activeFilter = _mState.journalFilter || 'all';
    var filters = [
      { key:'all', label:'Semua', dot:'var(--ink-4)' },
      { key:'Studio', label:'Studio', dot:'var(--ocean)' },
      { key:'Rental', label:'Rental', dot:'var(--forest)' },
      { key:'Academy', label:'Academy', dot:'var(--olive)' },
      { key:'Domestic', label:'Domestic', dot:'var(--amber-c)' },
      { key:'Meeting', label:'Meeting', dot:'var(--brick)' }
    ];
    html += '<div class="m-journal-filters">';
    filters.forEach(function(f){
      var active = activeFilter === f.key;
      html += '<button class="m-journal-filter-chip'+ (active?' active':'') +'" data-jfilter="'+f.key+'">';
      if (f.key !== 'all') html += '<span class="dot" style="background:'+f.dot+'"></span>';
      html += f.label +'</button>';
    });
    html += '</div>';

    var activeTab = _mState.journalTab || 'journal';
    html += '<div class="m-journal-tabs">';
    html += '<button class="m-journal-tab'+ (activeTab==='journal'?' active':'') +'" data-jtab="journal">Journal</button>';
    html += '<button class="m-journal-tab'+ (activeTab==='meetings'?' active':'') +'" data-jtab="meetings">Meetings</button>';
    html += '</div>';

    var allList = ((DB && DB.journals) || []).slice();
    if (activeFilter !== 'all'){
      allList = allList.filter(function(j){ return j.label === activeFilter; });
    }
    var meetings = allList.filter(function(j){ return j.label === 'Meeting'; });
    var journals = allList.filter(function(j){ return j.label !== 'Meeting'; });
    var list = activeTab === 'meetings' ? meetings : journals;

    list.sort(function(a,b){ return new Date(b.createdAt) - new Date(a.createdAt); });

    if (!list.length){
      html += '<div class="m-journal-empty">';
      html += '<div class="m-journal-empty-icon">📝</div>';
      html += '<div class="m-journal-empty-title">Belum ada catatan</div>';
      html += '<div class="m-journal-empty-sub">Mulai dengan menambahkan journal atau meeting baru.</div>';
      html += '</div>';
    } else {
      html += '<div class="m-journal-feed">';
      list.forEach(function(j){
        html += _renderJournalCard(j, u, initial);
      });
      html += '</div>';
    }

    html += '<button class="m-journal-fab" id="m-journal-fab" title="New Journal">+</button>';

    return html;
  }

  function _renderJournalCard(j, currentUserObj, currentInitial){
    var lc = _journalLabelColor(j.label);
    var who = getUserName(j.createdBy) || j.createdBy || '—';
    var whoColor = (typeof getUserColor === 'function') ? getUserColor(j.createdBy) : '#888';
    var rel = _relativeTime(j.createdAt);
    var allComments = _commentsForJournal(j.id);
    var expanded = _mState['jOpen-'+j.id] === true;
    var likes = _journalLikes(j.id);
    var labelClass = String(j.label || 'studio').toLowerCase();

    var html = '<div class="m-journal-card">';

    html += '<div class="m-journal-menu">';
    html += '<button class="m-journal-menu-btn" data-jmenu="'+j.id+'">⋯</button>';
    html += '</div>';

    html += '<div class="m-journal-head">';
    html += '<div class="m-avatar m-journal-avatar" style="background:'+whoColor+'22;color:'+whoColor+'">'+ _esc(who[0].toUpperCase()) +'</div>';
    html += '<div class="m-journal-head-meta">';
    html += '<div class="m-journal-head-name">'+ _esc(who) +'</div>';
    html += '<div class="m-journal-head-time">'+ _esc(rel) +' · '+ _esc(j.label || 'Studio') +'</div>';
    html += '</div>';
    html += '</div>';

    if (j.description){
      var isLong = j.description.length > 280;
      var showMore = _mState['jExpand-'+j.id];
      html += '<div class="m-journal-body" style="'+(isLong && !showMore?'display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden;':'')+'">';
      html += _renderJournalBodyHTML(j.description);
      html += '</div>';
      if (isLong && !showMore){
        html += '<button class="m-comment-action" data-jexpand="'+j.id+'" style="margin-top:6px;color:var(--ocean);font-weight:600">Show more</button>';
      }
    }

    if (j.image){
      html += '<div class="m-journal-media">';
      html += '<img src="'+ _esc(j.image) +'" loading="lazy" alt=""/>';
      html += '</div>';
    }

    var linkedName = '';
    if (j.linkedType==='project'&&j.linkedId){var p=DB.projects&&DB.projects.find(function(x){return x.id===j.linkedId});linkedName=p?'📁 '+p.name:'';}
    else if (j.linkedType==='rental'&&j.linkedId){var r=DB.rentals&&DB.rentals.find(function(x){return x.id===j.linkedId});linkedName=r?'📅 '+r.equipment:'';}
    else if (j.linkedType==='domestic'&&j.linkedId){var d=DB.domestics&&DB.domestics.find(function(x){return x.id===j.linkedId});linkedName=d?'🏠 '+d.name:'';}
    else if (j.linkedType==='class'&&j.linkedId){var c=DB.classes&&DB.classes.find(function(x){return x.id===j.linkedId});linkedName=c?'🎓 '+c.name:'';}
    if (linkedName){
      html += '<div class="m-journal-linked">';
      html += '<span class="m-journal-linked-icon">🔗</span>';
      html += '<span class="m-journal-linked-text">'+_esc(linkedName)+'</span>';
      html += '</div>';
    }

    if ((j.mentions || []).length){
      html += '<div class="m-journal-mentioned">';
      j.mentions.forEach(function(uid){
        var uname = getUserName(uid) || uid;
        var uc = (typeof getUserColor === 'function') ? getUserColor(uid) : '#888';
        html += '<span class="m-mention" style="color:'+uc+';background:'+uc+'1a">@'+_esc(uname)+'</span>';
      });
      html += '</div>';
    }

    var reactionEmojis = ['👍','🔥','😂','😢'];
    html += '<div class="m-journal-reactions">';
    reactionEmojis.forEach(function(emoji){
      var count = (DB.journalReactions || []).filter(function(r){return r.journalId===j.id && r.emoji===emoji;}).length;
      var mine = (DB.journalReactions || []).some(function(r){return r.journalId===j.id && r.emoji===emoji && r.userId===currentUser;});
      if (count > 0){
        html += '<button class="m-journal-reaction'+ (mine?' active':'') +'" data-jreact="'+j.id+'" data-jemoji="'+emoji+'">';
        html += '<span>'+emoji+'</span>';
        html += '<span class="m-journal-reaction-count">'+count+'</span>';
        html += '</button>';
      }
    });
    html += '<button class="m-journal-reaction-add" data-jreact="'+j.id+'" data-jemoji="👍">+</button>';
    html += '</div>';

    html += '<div class="m-journal-actions">';
    html += '<div class="m-journal-actions-left">';
    html += '<button class="m-jact m-jact-reply" data-jcomments="'+ j.id +'">';
    html += '<span class="m-jact-ic">💬</span><span class="m-jact-n">'+ allComments.length +'</span>';
    html += '</button>';
    html += '<button class="m-jact m-jact-like'+ (likes.mine ? ' liked' : '') +'" data-jlike="'+ j.id +'">';
    html += '<span class="m-jact-ic">'+ (likes.mine ? '❤️' : '🤍') +'</span><span class="m-jact-n">'+ likes.count +'</span>';
    html += '</button>';
    html += '</div>';
    html += '</div>';

    if (expanded){
      html += '<div class="m-journal-comments-wrap">';

      var replyTo = _mState['jReplyTo-'+j.id] || null;
      var replyToComment = replyTo ? allComments.find(function(c){ return c.id === replyTo; }) : null;
      var replyToWho = replyToComment ? (getUserName(replyToComment.userId) || replyToComment.userId) : null;

      html += '<div class="m-journal-comment-input">';
      html += '<div class="m-avatar m-comment-avatar" style="background:'+currentUserObj.color+'22;color:'+currentUserObj.color+'">'+ currentInitial +'</div>';
      html += '<div style="flex:1;display:flex;flex-direction:column;gap:4px">';
      if (replyToWho){
        html += '<div class="m-replying-to">Replying to <b>@'+ _esc(replyToWho) +'</b> <button class="m-cancel-reply" data-jcancel="'+ j.id +'">cancel</button></div>';
      }
      html += '<div style="display:flex;gap:8px;align-items:center">';
      html += '<input id="jc-input-'+ j.id +'" class="m-comment-field" placeholder="'+ (replyToWho ? 'Reply to @'+_esc(replyToWho)+'...' : 'Add a comment...') +'"/>';
      html += '<button class="m-comment-send" data-jcsend="'+ j.id +'">➤</button>';
      html += '</div>';
      html += '</div></div>';

      if (allComments.length){
        html += '<div class="m-journal-comments-header">';
        html += '<span>Comments</span>';
        html += '<span class="m-journal-comments-count">'+allComments.length+'</span>';
        html += '</div>';

        var topLevel = [];
        var repliesByParent = {};
        allComments.forEach(function(c){
          var parsed = _parseCommentBody(c.text);
          c._parentId = parsed.parentId;
          c._body = parsed.body;
          if (parsed.parentId){
            (repliesByParent[parsed.parentId] = repliesByParent[parsed.parentId] || []).push(c);
          } else {
            topLevel.push(c);
          }
        });
        Object.keys(repliesByParent).forEach(function(pid){
          if (!allComments.find(function(c){ return c.id === Number(pid); })){
            repliesByParent[pid].forEach(function(c){ topLevel.push(c); });
            delete repliesByParent[pid];
          }
        });
        topLevel.sort(function(a,b){ return new Date(b.createdAt) - new Date(a.createdAt); });

        function renderComment(c, depth){
          var cWho = getUserName(c.userId) || c.userId || '—';
          var cColor = (typeof getUserColor === 'function') ? getUserColor(c.userId) : '#888';
          var s = '<div class="m-journal-comment'+ (depth ? ' m-comment-reply' : '') +'">';
          s += '<div class="m-avatar m-comment-avatar" style="background:'+cColor+'22;color:'+cColor+'">'+ _esc(cWho[0].toUpperCase()) +'</div>';
          s += '<div class="m-journal-comment-body">';
          s += '<div class="m-journal-comment-meta"><b>'+ _esc(cWho) +'</b> · <span>'+ _esc(_relativeTime(c.createdAt)) +'</span></div>';
          s += '<div class="m-journal-comment-text">'+ _renderMentionsHTML(c._body) +'</div>';
          s += '<div class="m-journal-comment-actions">';
          s += '<button class="m-comment-action" data-jreply="'+ j.id +'" data-jrcid="'+ c.id +'">Reply</button>';
          if (c.userId === currentUser){
            s += '<button class="m-comment-action m-comment-del" data-jdel="'+ j.id +'" data-jdcid="'+ c.id +'">Delete</button>';
          }
          s += '</div>';
          s += '</div></div>';
          var kids = (repliesByParent[c.id] || []).slice().sort(function(a,b){ return new Date(a.createdAt) - new Date(b.createdAt); });
          kids.forEach(function(k){ s += renderComment(k, depth + 1); });
          return s;
        }

        topLevel.forEach(function(c){ html += renderComment(c, 0); });
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  function _renderErrorState(label, retryCallback){
    return '<div class="m-section-title" style="margin-top:14px">'+ _esc(label) +'</div>'+
      '<div class="m-list"><div style="padding:24px;text-align:center">'+
      '<div style="font-size:13px;color:var(--brick);margin-bottom:12px">Gagal memuat data. Periksa koneksi internet.</div>'+
      '<button class="m-sheet-save" id="m-retry-btn" style="background:var(--brick);font-size:12px;padding:8px 20px;width:auto;display:inline-block">Coba Lagi</button>'+
      '</div></div>';
  }

  function _getFilteredSchedule(){
    if (!_mTodayCache || !_mTodayCache.schedule) return [];
    var all = _mTodayCache.schedule || [];
    if (_mScheduleView === 'today'){
      var t = _today();
      return all.filter(function(e){ return (e.date||'').slice(0,10) === t; });
    }
    if (_mScheduleView === 'week'){
      // Today → next 7 days
      var start = new Date(); start.setHours(0,0,0,0);
      var end = new Date(start); end.setDate(end.getDate() + 7);
      return all.filter(function(e){
        var ed = new Date(e.date + 'T00:00:00');
        return ed >= start && ed <= end;
      });
    }
    // month: today → next 30 days
    var start = new Date(); start.setHours(0,0,0,0);
    var end = new Date(start); end.setDate(end.getDate() + 30);
    return all.filter(function(e){
      var ed = new Date(e.date + 'T00:00:00');
      return ed >= start && ed <= end;
    });
  }

  function _renderScheduleTab(){
    if (_mTodayFetching){
      return '<div class="m-section-title" style="margin-top:14px">Jadwal</div><div class="m-list"><div style="padding:24px;text-align:center;color:var(--ink-4);font-size:12px">Memuat jadwal...</div></div>';
    }
    if (_mTodayFailCount >= 3){
      return _renderErrorState('Jadwal');
    }
    if (!_mTodayCache || !_mTodayCache.schedule || _mScheduleView !== _mLastFetchedView){
      _fetchMTodayData(true).then(function(){ if (_mState.mounted) renderMobileShell(); });
      return '<div class="m-section-title" style="margin-top:14px">Jadwal</div><div class="m-list"><div style="padding:24px;text-align:center;color:var(--ink-4);font-size:12px">Memuat jadwal...</div></div>';
    }
    var schedule = _getFilteredSchedule();
    var html = '';
    // Toggle nav
    html += '<div style="display:flex;gap:6px;margin:14px 0 10px;padding:0 2px">';
    ['today','week','month'].forEach(function(v){
      var active = _mScheduleView === v;
      var label = v === 'today' ? 'Hari' : v === 'week' ? 'Minggu' : 'Bulan';
      html += '<button class="m-schedule-toggle' + (active ? ' active' : '') + '" data-schedule-view="'+v+'" style="flex:1;padding:8px 0;font-size:12px;border:1px solid '+(active?'var(--ocean)':'var(--line-2)')+';background:'+(active?'var(--ocean)':'transparent')+';color:'+(active?'#fff':'var(--ink-3)')+';border-radius:8px;cursor:pointer">'+label+'</button>';
    });
    html += '</div>';

    html += '<div class="m-section-title" style="margin-top:4px">Jadwal · '+schedule.length+'</div>';
    if (!schedule.length){
      html += '<div class="m-list"><div style="padding:24px;text-align:center;color:var(--ink-4);font-size:12px">Tidak ada jadwal '+(_mScheduleView==='today'?'hari ini':_mScheduleView==='week'?'minggu ini':'bulan ini')+'</div></div>';
      return html;
    }
    // Sort by date then time
    schedule = schedule.slice().sort(function(a,b){
      var da = (a.date||'') + ' ' + (a.time||'');
      var db = (b.date||'') + ' ' + (b.time||'');
      return da.localeCompare(db);
    });
    var typeMap = {
      studio:    { icon:'🎥', label:'Studio',   color:'var(--ocean)' },
      meeting:   { icon:'🤝', label:'Meeting',  color:'var(--amber-c)' },
      rental:    { icon:'📦', label:'Rental',   color:'var(--forest)' },
      academy:   { icon:'📚', label:'Academy',  color:'var(--olive)' },
      domestic:  { icon:'🏠', label:'Domestic', color:'var(--ink-3)' },
      other:     { icon:'📌', label:'Other',    color:'var(--ink-4)' },
    };
    html += '<div class="m-list">';
    var lastDate = '';
    schedule.forEach(function(e){
      var tInfo = typeMap[e.type] || typeMap.other;
      var time = e.time ? String(e.time).slice(0,5) : '—';
      // Show date header for week/month view
      if ((_mScheduleView === 'week' || _mScheduleView === 'month') && e.date !== lastDate){
        lastDate = e.date;
        html += '<div style="font-size:10px;font-weight:600;color:var(--ink-4);text-transform:uppercase;letter-spacing:.06em;margin:10px 2px 6px;padding-bottom:4px;border-bottom:1px solid var(--line-2)">'+_fmtShortDate(e.date)+'</div>';
      }
      html += '<div class="m-list-item">';
      html += '<div class="m-time">'+ _esc(time) +'</div>';
      html += '<span class="m-tag m-tag-'+ (e.type==='studio'?'forest':e.type==='meeting'?'amber':e.type==='rental'?'forest':e.type==='academy'?'olive':'brick') +'" style="font-size:10px;min-width:fit-content">'+ _esc(tInfo.label) +'</span>';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+ _esc(e.title) +'</div>';
      if (e.room){
        html += '<div style="font-size:11px;color:var(--ink-4);margin-top:2px">'+ _esc(e.room) +'</div>';
      }
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function _fmtShortDate(d){
    if (!d) return '';
    var p = d.split('-');
    if (p.length < 3) return d;
    var days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    var months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    var dt = new Date(d + 'T00:00:00');
    return days[dt.getDay()] + ', ' + p[2] + ' ' + months[parseInt(p[1],10)-1];
  }

  // ── Attendance state ──
  var _mAttStatus = '';
  var _mAttShift = '';

  function _mSelectAttStatus(val){
    _mAttStatus = val;
    var btns = document.querySelectorAll('.m-att-status-btn');
    btns.forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-att-status') === val);
    });
    var shiftRow = document.getElementById('m-att-shift-row');
    if (shiftRow) shiftRow.style.display = (val === 'hadir' || val === 'wfh') ? 'block' : 'none';
  }

  function _mSelectAttShift(val){
    _mAttShift = val;
    var btns = document.querySelectorAll('.m-att-shift-btn');
    btns.forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-att-shift') === val);
    });
  }

  function _mAttStatusLabel(s){
    return { hadir:'Hadir', wfh:'WFH', izin:'Izin', sakit:'Sakit' }[s] || s;
  }

  async function _mSaveAttendance(){
    if (!_mAttStatus) { alert('Pilih status kehadiran dulu'); return; }
    var token = localStorage.getItem('ss-token');
    if (!token) { alert('Belum login'); return; }
    var payload = { status: _mAttStatus, note: _mAttShift || '', check_in: null, check_out: null };
    try {
      var r = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var result = await r.json();
      // Update local cache
      if (_mTodayCache && result.attendance){
        var att = _mTodayCache.attendance || [];
        var uid = result.attendance.user_id;
        var idx = att.findIndex(function(a){ return a.user_id === uid; });
        if (idx >= 0) att[idx] = result.attendance; else att.push(result.attendance);
        _mTodayCache.attendance = att;
      }
      _mAttStatus = '';
      _mAttShift = '';
      renderMobileShell();
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    }
  }

  function _renderMyAttendance(att){
    var u = (USERS||[]).find(function(x){ return x.id === currentUser; }) || { name:'User', color:'#888' };
    var initial = _esc((u.name||'?')[0].toUpperCase());
    var status = att ? att.status : '';
    var shift = att && att.note && att.note.match(/^(pagi|siang|sore)$/) ? att.note : '';

    var statuses = [
      { val: 'hadir', label: '🏢 Hadir', cls: 'hadir' },
      { val: 'wfh',   label: '🏠 WFH',   cls: 'wfh'   },
      { val: 'izin',  label: '🏖 Izin',  cls: 'izin'  },
      { val: 'sakit', label: '🤒 Sakit', cls: 'sakit' },
    ];
    var shifts = [
      { val:'pagi', label:'🌅 Pagi' },
      { val:'siang', label:'☀️ Siang' },
      { val:'sore', label:'🌇 Sore' }
    ];

    var html = '<div style="background:var(--paper-2);border:1px solid var(--line-2);border-radius:12px;padding:14px;margin:14px 0">';
    html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">';
    html += '<div class="m-avatar" style="background:'+u.color+'22;color:'+u.color+'">'+initial+'</div>';
    html += '<div><div style="font-size:13px;font-weight:500">Kehadiran Saya</div>';
    if (att){
      html += '<div style="font-size:11px;color:var(--forest)">Tersimpan · '+_mAttStatusLabel(att.status)+(shift?' · sesi '+shift:'')+'</div>';
    } else {
      html += '<div style="font-size:11px;color:var(--ink-4)">Belum isi kehadiran hari ini</div>';
    }
    html += '</div></div>';

    // Status buttons
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">';
    statuses.forEach(function(s){
      var active = status === s.val;
      html += '<button class="m-att-status-btn'+(active?' active':'')+'" data-att-status="'+s.val+'" style="flex:1;min-width:70px;padding:8px 6px;font-size:11px;border:1px solid '+(active?'var(--ocean)':'var(--line-2)')+';background:'+(active?'var(--ocean)':'transparent')+';color:'+(active?'#fff':'var(--ink-3)')+';border-radius:8px;cursor:pointer">'+s.label+'</button>';
    });
    html += '</div>';

    // Shift selector
    var showShift = !status || status === 'hadir' || status === 'wfh';
    html += '<div id="m-att-shift-row" style="'+(showShift?'':'display:none')+'">';
    html += '<div style="font-size:11px;color:var(--ink-4);margin-bottom:6px">Sesi</div>';
    html += '<div style="display:flex;gap:6px">';
    shifts.forEach(function(s){
      var active = shift === s.val;
      html += '<button class="m-att-shift-btn'+(active?' active':'')+'" data-att-shift="'+s.val+'" style="flex:1;padding:6px;font-size:11px;border:1px solid '+(active?'var(--amber)':'var(--line-2)')+';background:'+(active?'var(--amber)':'transparent')+';color:'+(active?'#000':'var(--ink-3)')+';border-radius:6px;cursor:pointer">'+s.label+'</button>';
    });
    html += '</div></div>';

    // Save button
    html += '<button id="m-att-save" style="width:100%;margin-top:12px;padding:10px;background:var(--ocean);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer">'+(att?'💾 Perbarui':'✅ Simpan')+'</button>';

    html += '</div>';
    return html;
  }

  function _renderPresenceTab(){
    if (_mTodayFetching){
      return '<div class="m-section-title" style="margin-top:14px">Hadir</div><div class="m-list"><div style="padding:24px;text-align:center;color:var(--ink-4);font-size:12px">Memuat data kehadiran...</div></div>';
    }
    if (_mTodayFailCount >= 3){
      return _renderErrorState('Hadir');
    }
    if (!_mTodayCache || !_mTodayCache.presence){
      _fetchMTodayData(true).then(function(){ if (_mState.mounted) renderMobileShell(); });
      return '<div class="m-section-title" style="margin-top:14px">Hadir</div><div class="m-list"><div style="padding:24px;text-align:center;color:var(--ink-4);font-size:12px">Memuat data kehadiran...</div></div>';
    }
    var presence = _mTodayCache.presence || [];
    var attendance = _mTodayCache.attendance || [];
    // Build online count: users who have attendance today
    var presentIds = {};
    attendance.forEach(function(a){ if (a.user_id) presentIds[a.user_id] = a; });
    var onlineCount = presence.filter(function(p){ return presentIds[p.user_id]; }).length;

    var html = '';
    // My attendance form at top
    var myAtt = presentIds[currentUser] || null;
    html += _renderMyAttendance(myAtt);

    html += '<div class="m-section-title" style="margin-top:14px">Tim · '+ presence.length +' orang</div>';
    html += '<div style="font-size:12px;color:var(--ink-4);margin:0 0 12px 2px">'+ onlineCount +' hadir hari ini</div>';

    if (!presence.length){
      html += '<div class="m-list"><div style="padding:24px;text-align:center;color:var(--ink-4);font-size:12px">Belum ada data tim</div></div>';
      return html;
    }
    html += '<div class="m-list">';
    presence.forEach(function(p){
      var c = (typeof getUserColor === 'function') ? getUserColor(p.user_id) : '#888';
      var initial = _esc((p.name||'?')[0].toUpperCase());
      var isCuti = p.status === 'cuti';
      var statusLabel = isCuti ? 'Cuti' : (presentIds[p.user_id] ? 'Hadir' : '—');
      var statusColor = isCuti ? 'var(--brick)' : (presentIds[p.user_id] ? 'var(--forest)' : 'var(--ink-4)');

      html += '<div class="m-list-item">';
      html += '<div class="m-avatar" style="width:38px;height:38px;background:'+c+'22;color:'+c+';flex-shrink:0">'+ initial +'</div>';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="display:flex;align-items:center;gap:6px">';
      html += '<div style="font-size:13px;font-weight:500">'+ _esc(p.name) +'</div>';
      if (isCuti){
        html += '<span class="m-tag m-tag-brick" style="font-size:9px">Cuti</span>';
      }
      html += '</div>';
      html += '<div style="font-size:11px;color:var(--ink-4);margin-top:2px">'+ _esc(p.role || 'staff') +' · <span style="color:'+ statusColor +'">'+ statusLabel +'</span></div>';
      html += '</div>';
      html += '<div class="tag-dot" style="background:'+ (presentIds[p.user_id] ? 'var(--forest)' : 'var(--ink-4)') +';opacity:'+ (presentIds[p.user_id] ? '1' : '.25') +'"></div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function _renderTasksTab(){
    if (_mTodayFetching){
      return '<div class="m-section-title" style="margin-top:14px">Tugas</div><div class="m-list"><div style="padding:24px;text-align:center;color:var(--ink-4);font-size:12px">Memuat tugas...</div></div>';
    }
    if (_mTodayFailCount >= 3){
      return _renderErrorState('Tugas');
    }
    // Use API data if available, fall back to local DB merge
    var todayTasks = null;
    if (_mTodayCache && _mTodayCache.tasks){
      todayTasks = _mTodayCache.tasks;
    } else {
      _fetchMTodayData(true).then(function(){ if (_mState.mounted) renderMobileShell(); });
    }
    // Fallback: use local DB merge while API loads
    var list = todayTasks || _myTasksMerged();
    var isApiMode = !!todayTasks;

    var html = '<div class="m-section-title" style="margin-top:14px">Tugas · '+ list.length +'</div>';
    if (!list.length){
      html += '<div class="m-list"><div style="padding:24px;text-align:center;color:var(--ink-4);font-size:12px">Tidak ada tugas</div></div>';
      return html;
    }

    // Group by project_id for API data
    var grouped = {};
    if (isApiMode){
      list.forEach(function(t){
        var projId = t.project_id || '_noproject';
        if (!grouped[projId]) grouped[projId] = [];
        grouped[projId].push(t);
      });
    }

    if (isApiMode && Object.keys(grouped).length){
      var projNames = {};
      (DB && DB.projects || []).forEach(function(p){ projNames[p.id] = p.name; });

      Object.keys(grouped).forEach(function(projId){
        var tasks = grouped[projId];
        var projName = projId === '_noproject' ? 'Umum' : (projNames[projId] || 'Project ' + projId);
        html += '<div style="font-size:10px;font-weight:600;color:var(--ink-4);text-transform:uppercase;letter-spacing:.06em;margin:14px 2px 6px">'+ _esc(projName) +' · '+ tasks.length +'</div>';
        html += '<div class="m-list">';
        tasks.forEach(function(t){
          var done = t.status === 'Done' || t.done;
          var isOverdue = t.overdue;
          var pr = String(t.priority||'normal').toLowerCase();
          var tone = pr === 'high' ? 'brick' : pr === 'normal' ? 'amber' : 'forest';
          var checkboxId = 'mt-api-'+ _esc(String(t.id));
          html += '<div class="m-list-item" style="opacity:'+ (done ? '0.55' : '1') +'">';
          html += '<input type="checkbox" data-tkind="task" data-tid="'+ _esc(String(t.id)) +'" id="'+ checkboxId +'" style="accent-color:var(--ocean);width:18px;height:18px"' + (done ? ' checked' : '') + '/>';
          html += '<div style="flex:1;min-width:0">';
          html += '<div style="display:flex;align-items:center;gap:6px">';
          html += '<div style="font-size:13px;font-weight:500;text-decoration:'+ (done ? 'line-through' : 'none') +'">';
          if (isOverdue && !done) html += '⚠️ ';
          html += _esc(t.title||'(untitled)') +'</div>';
          html += '</div>';
          var deadlineStr = t.deadline ? 'Deadline '+ fmtDate(t.deadline) : '';
          html += '<div style="font-size:11px;color:var(--ink-4);margin-top:2px">'+ _esc(deadlineStr) +'</div>';
          html += '</div>';
          html += '<span class="m-tag m-tag-'+ tone +'">'+ pr.charAt(0).toUpperCase() +'</span>';
          html += '</div>';
        });
        html += '</div>';
      });
    } else {
      // Fallback: render using local DB merge (existing style)
      html += '<div class="m-list">';
      list.forEach(function(t){
        var pr = String(t.priority||'normal').toLowerCase();
        var tone = pr === 'high' ? 'brick' : pr === 'normal' ? 'amber' : 'forest';
        var checkboxId = 'mt-'+t.kind+'-'+t.id;
        html += '<div class="m-list-item">';
        html += '<input type="checkbox" data-tkind="'+t.kind+'" data-tid="'+_esc(t.id)+'" id="'+checkboxId+'" style="accent-color:var(--ocean);width:18px;height:18px"/>';
        html += '<div style="flex:1">';
        html += '<div style="font-size:13px;font-weight:500">'+ _esc(t.title||'(untitled)') +'</div>';
        html += '<div style="font-size:11px;color:var(--ink-4);margin-top:2px">'+ _esc(t.kind === 'domestic' ? 'Domestic' : (t.project ? 'Project '+t.project : 'Studio')) +' · Due '+ fmtDate(t.due) +'</div>';
        html += '</div>';
        html += '<span class="m-tag m-tag-'+ tone +'">'+ pr.charAt(0).toUpperCase() +'</span>';
        html += '</div>';
      });
      html += '</div>';
    }
    return html;
  }

  function _renderMe(){
    var u = (USERS||[]).find(function(x){ return x.id === currentUser; }) || { name:'User', color:'#888', role:'staff' };
    var theme = document.documentElement.getAttribute('data-theme') || 'light';
    var html = '<div style="display:flex;align-items:center;gap:14px;padding:18px 4px 8px">';
    html += '<div class="m-avatar" style="width:56px;height:56px;font-size:22px;background:'+u.color+'22;color:'+u.color+'">'+ _esc((u.name||'?')[0].toUpperCase()) +'</div>';
    html += '<div><div style="font-family:var(--serif);font-size:22px">'+ _esc(u.name) +'</div>';
    html += '<div style="font-size:12px;color:var(--ink-4)">House of EXP · '+ _esc(u.role||'staff') +'</div></div></div>';
    html += '<div class="m-section-title">Settings</div>';
    html += '<div class="m-list">';
    html += '<div class="m-list-item" data-action="theme">'+ _icon(theme==='dark'?'sun':'moon',18) +'<div style="flex:1;font-size:14px">'+(theme==='dark'?'Light mode':'Dark mode')+'</div><span style="color:var(--ink-5)">›</span></div>';
    html += '<div class="m-list-item" data-action="toggle-mview" style="gap:0;justify-content:center">'+ _icon('desktop', 18) +'</div>';
    html += '<div class="m-list-item" data-action="logout"><div style="flex:1;font-size:14px;color:var(--brick)">Log out</div><span style="color:var(--ink-5)">›</span></div>';
    html += '</div>';
    html += '<div class="m-banner-mini" style="margin-top:18px">';
    html += '<div class="lbl">Workspace · admin</div>';
    html += '<div class="ttl">SQL backup, password change, database edits</div>';
    html += '<div class="sub">Available on the desktop terminal.</div>';
    html += '</div>';
    return html;
  }

  function _renderTab(tab){
    if (tab === 'chat') return _renderChat();
    if (tab === 'schedule') return _renderScheduleTab();
    if (tab === 'presence') return _renderPresenceTab();
    if (tab === 'tasks') return _renderTasksTab();
    if (tab === 'journal') return _renderJournal();
    return '';
  }

  // ── tabbar ──────────────────────────────────────────────────────────────
  function _renderTabbar(){
    var tabs = [
      ['chat','Chat','message'],
      ['schedule','Jadwal','calendar'],
      ['presence','Hadir','users'],
      ['tasks','Tugas','check'],
      ['journal','Journal','edit'],
    ];
    var html = '<div class="m-tabbar">';
    tabs.forEach(function(t){
      var id = t[0], label = t[1], ic = t[2];
      var cls = 'm-tab' + (_mState.tab === id ? ' active' : '');
      html += '<div class="'+cls+'" data-tab="'+id+'">';
      html += _icon(ic, 18) +'<span>'+label+'</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // ── user menu popup ─────────────────────────────────────────────────────
  var _mUserMenuOpen = false;

  function _mToggleUserMenu(){
    _mUserMenuOpen = !_mUserMenuOpen;
    var existing = document.getElementById('m-user-menu');
    if (existing) existing.parentNode.removeChild(existing);
    if (!_mUserMenuOpen) return;

    var u = (USERS||[]).find(function(x){ return x.id === currentUser; }) || { name:'User', color:'#888' };
    var menu = document.createElement('div');
    menu.id = 'm-user-menu';
    menu.style.cssText = 'position:absolute;top:52px;right:12px;background:var(--paper-2);border:1px solid var(--line-2);border-radius:12px;padding:8px;min-width:180px;z-index:1000;box-shadow:0 4px 20px rgba(0,0,0,.15)';

    var html = '';
    html += '<div style="display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid var(--line-2);margin-bottom:6px">';
    html += '<div class="m-avatar" style="background:'+u.color+'22;color:'+u.color+'">'+_esc((u.name||'?')[0].toUpperCase())+'</div>';
    html += '<div><div style="font-size:13px;font-weight:500">'+_esc(u.name)+'</div><div style="font-size:11px;color:var(--ink-4)">'+_esc(u.role||'staff')+'</div></div>';
    html += '</div>';
    html += '<button class="m-menu-item" data-action="open-desktop" style="width:100%;text-align:left;padding:10px 8px;font-size:12px;background:transparent;border:none;border-radius:8px;color:var(--ink-2);cursor:pointer;display:flex;align-items:center;gap:8px"><span style="font-size:14px">🖥️</span> Beralih ke Desktop</button>';
    html += '<button class="m-menu-item" data-action="logout" style="width:100%;text-align:left;padding:10px 8px;font-size:12px;background:transparent;border:none;border-radius:8px;color:var(--brick);cursor:pointer;display:flex;align-items:center;gap:8px;margin-top:2px"><span style="font-size:14px">🚪</span> Keluar</button>';

    menu.innerHTML = html;
    document.body.appendChild(menu);

    // Close when clicking outside
    setTimeout(function(){
      function closeMenu(e){
        if (!menu.contains(e.target)){
          _mUserMenuOpen = false;
          if (menu.parentNode) menu.parentNode.removeChild(menu);
          document.removeEventListener('click', closeMenu);
          document.removeEventListener('touchstart', closeMenu);
        }
      }
      document.addEventListener('click', closeMenu);
      document.addEventListener('touchstart', closeMenu);
    }, 10);

    // Bind menu actions
    menu.querySelectorAll('[data-action]').forEach(function(el){
      _addTapListener(el, function(){
        var act = el.getAttribute('data-action');
        _mUserMenuOpen = false;
        if (menu.parentNode) menu.parentNode.removeChild(menu);
        if (act === 'logout'){
          if (typeof logout === 'function') logout();
        } else if (act === 'open-desktop'){
          try { localStorage.setItem('mlite-force', '0'); } catch(_) {}
          window.location.search = '?desktop=1';
        }
      });
    });
  }

  // ── header ──────────────────────────────────────────────────────────────
  function _renderHeader(){
    var u = (USERS||[]).find(function(x){ return x.id === currentUser; }) || { name:'User', color:'#888' };
    var hour = new Date().getHours();
    var greet = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
    var dateStr = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });
    var theme = document.documentElement.getAttribute('data-theme') || 'light';
    var html = '<div class="m-header">';
    html += '<div><div class="m-hello">'+ _esc(dateStr) +'</div>';
    html += '<div class="m-greet">'+ greet +', <em>'+ _esc((u.name||'').split(' ')[0]) +'</em></div></div>';
    html += '<div style="display:flex;gap:8px;align-items:center">';
    html += '<button class="m-icon-btn" data-action="theme" title="Toggle theme">'+ _icon(theme==='dark'?'sun':'moon',15) +'</button>';
    html += '<button id="m-user-menu-btn" style="background:none;border:none;padding:0;cursor:pointer">';
    html += '<div class="m-avatar" style="background:'+u.color+'22;color:'+u.color+'">'+ _esc((u.name||'?')[0].toUpperCase()) +'</div>';
    html += '</button>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  // ── shell render ────────────────────────────────────────────────────────
  function renderMobileShell(){
    if (!_mState.mounted) return;
    var shell = document.getElementById('m-shell');
    if (!shell){
      shell = document.createElement('div');
      shell.id = 'm-shell';
      document.body.appendChild(shell);
    }
    shell.classList.toggle('m-shell-chat', _mState.tab === 'chat');
    var body = '';
    if (_mState.tab === 'chat'){
      body = '<div class="m-chat-wrap">' + _renderChat() + '</div>';
    } else {
      body = '<div class="m-scroll" id="m-scroll">' + _renderTab(_mState.tab) + '</div>';
    }
    shell.innerHTML = _renderHeader() + body + _renderTabbar();

    _bindShellEvents(shell);

    if (_mState.tab === 'chat'){
      var inp = document.getElementById('m-chat-input');
      if (inp){
        inp.addEventListener('input', function(){
          inp.style.height = 'auto';
          inp.style.height = Math.min(inp.scrollHeight, 100) + 'px';
        });
        inp.addEventListener('keydown', function(e){
          if (e.key === 'Enter' && !e.shiftKey){
            e.preventDefault();
            _chatSend();
          }
        });
      }
      var sendBtn = document.getElementById('m-chat-send');
      if (sendBtn) _addTapListener(sendBtn, _chatSend);
      var msgs = document.getElementById('m-chat-msgs');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }
  }

  function _bindShellEvents(shell){
    // Tabs
    shell.querySelectorAll('[data-tab]').forEach(function(el){
      _addTapListener(el, function(){
        _mState.tab = el.getAttribute('data-tab');
        renderMobileShell();
      });
    });
    // Sheet launchers
    shell.querySelectorAll('[data-sheet]').forEach(function(el){
      _addTapListener(el, function(){
        _openSheet(el.getAttribute('data-sheet'));
      });
    });
    // Header / Me actions
    shell.querySelectorAll('[data-action]').forEach(function(el){
      var act = el.getAttribute('data-action');
      _addTapListener(el, function(){
        if (act === 'theme'){
          if (typeof toggleTheme === 'function') toggleTheme();
          renderMobileShell();
        } else if (act === 'logout'){
          if (typeof logout === 'function') logout();
        } else if (act === 'open-desktop'){
          try { localStorage.setItem('mlite-force', '0'); } catch(_) {}
          window.location.search = '?desktop=1';
        } else if (act === 'toggle-mview'){
          try {
            var cur = localStorage.getItem('mlite-force');
            var nextOn = !(cur === '0');
            localStorage.setItem('mlite-force', nextOn ? '0' : '1');
          } catch(_){}
          window.location.search = nextOn ? '?desktop=1' : '?mlite=1';
        }
      });
    });
    // Retry button (error state)
    var retryBtn = shell.querySelector('#m-retry-btn');
    if (retryBtn) _addTapListener(retryBtn, function(){
      _mTodayFailCount = 0;
      _fetchMTodayData(true).then(function(){ renderMobileShell(); });
    });
    // Schedule view toggle
    shell.querySelectorAll('[data-schedule-view]').forEach(function(btn){
      _addTapListener(btn, function(){
        var view = btn.getAttribute('data-schedule-view');
        _mScheduleView = view;
        renderMobileShell();
      });
    });
    // Attendance form buttons
    shell.querySelectorAll('[data-att-status]').forEach(function(btn){
      _addTapListener(btn, function(){
        var val = btn.getAttribute('data-att-status');
        _mSelectAttStatus(val);
      });
    });
    shell.querySelectorAll('[data-att-shift]').forEach(function(btn){
      _addTapListener(btn, function(){
        var val = btn.getAttribute('data-att-shift');
        _mSelectAttShift(val);
      });
    });
    var attSaveBtn = shell.querySelector('#m-att-save');
    if (attSaveBtn) _addTapListener(attSaveBtn, _mSaveAttendance);
    // User menu popup
    var userAvatarBtn = shell.querySelector('#m-user-menu-btn');
    if (userAvatarBtn) _addTapListener(userAvatarBtn, _mToggleUserMenu);
    // Task checkboxes
    shell.querySelectorAll('input[type=checkbox][data-tkind]').forEach(function(cb){
      _addTapListener(cb, function(){
        var kind = cb.getAttribute('data-tkind');
        var id = cb.getAttribute('data-tid');
        _completeTask(kind, id);
      }, false);
    });
    // Journal: refresh button
    var refreshBtn = shell.querySelector('#m-jrn-refresh');
    if (refreshBtn) _addTapListener(refreshBtn, _refreshJournalData);
    // Journal: post button
    var postBtn = shell.querySelector('#m-jn-post');
    if (postBtn) _addTapListener(postBtn, _postJournal);
    // Journal: image attach
    var attachBtn = shell.querySelector('#m-jn-attach');
    var imageInput = shell.querySelector('#m-jn-image');
    if (attachBtn && imageInput){
      _addTapListener(attachBtn, function(){ imageInput.click(); });
      imageInput.addEventListener('change', function(){ _handleJournalImage(imageInput); });
    }
    // Journal: image preview remove
    var previewRemove = shell.querySelector('#m-jn-preview-remove');
    if (previewRemove){
      _addTapListener(previewRemove, function(){
        _mJournalImage = null;
        var img = document.getElementById('m-jn-preview-img');
        var wrap = document.getElementById('m-jn-preview-wrap');
        if (img) img.src = '';
        if (wrap) wrap.style.display = 'none';
      });
    }
    // Journal: comment toggle
    shell.querySelectorAll('[data-jcomments]').forEach(function(btn){
      _addTapListener(btn, function(){
        var jid = Number(btn.getAttribute('data-jcomments'));
        var key = 'jOpen-' + jid;
        _mState[key] = !_mState[key];
        if (!_mState[key]) _mState['jReplyTo-'+jid] = null;
        var scrollY = window.scrollY;
        renderMobileShell();
        window.scrollTo(0, scrollY);
      });
    });
    // Journal: like
    shell.querySelectorAll('[data-jlike]').forEach(function(btn){
      _addTapListener(btn, function(){
        var jid = Number(btn.getAttribute('data-jlike'));
        _mLikeJournal(jid);
      });
    });
    // Journal: reply (target a comment)
    shell.querySelectorAll('[data-jreply]').forEach(function(btn){
      _addTapListener(btn, function(){
        var jid = Number(btn.getAttribute('data-jreply'));
        var cid = Number(btn.getAttribute('data-jrcid'));
        _mState['jOpen-'+jid] = true;
        _mState['jReplyTo-'+jid] = cid;
        var scrollY = window.scrollY;
        renderMobileShell();
        window.scrollTo(0, scrollY);
        setTimeout(function(){
          var inp = document.getElementById('jc-input-' + jid);
          if (inp) inp.focus();
        }, 50);
      });
    });
    // Journal: cancel reply target
    shell.querySelectorAll('[data-jcancel]').forEach(function(btn){
      _addTapListener(btn, function(){
        var jid = Number(btn.getAttribute('data-jcancel'));
        _mState['jReplyTo-'+jid] = null;
        var scrollY = window.scrollY;
        renderMobileShell();
        window.scrollTo(0, scrollY);
      });
    });
    // Journal: comment delete
    shell.querySelectorAll('[data-jdel]').forEach(function(btn){
      _addTapListener(btn, function(){
        var jid = Number(btn.getAttribute('data-jdel'));
        var cid = Number(btn.getAttribute('data-jdcid'));
        _mDeleteComment(jid, cid);
      });
    });
    // Journal: comment send (handles top-level + reply via state)
    shell.querySelectorAll('[data-jcsend]').forEach(function(btn){
      _addTapListener(btn, function(){
        var jid = Number(btn.getAttribute('data-jcsend'));
        var inp = document.getElementById('jc-input-' + jid);
        if (!inp) return;
        var text = (inp.value || '').trim();
        if (!text) return;
        var parent = _mState['jReplyTo-'+jid] || null;
        inp.value = '';
        _mState['jReplyTo-'+jid] = null;
        _mPostComment(jid, parent, text);
      });
    });
    // Journal: Enter-to-send + mention autocomplete in comment inputs
    shell.querySelectorAll('input[id^="jc-input-"]').forEach(function(inp){
      _attachMentionPicker(inp);
      inp.addEventListener('keydown', function(e){
        if (e.key === 'Enter'){
          e.preventDefault();
          var jid = Number(inp.id.replace('jc-input-', ''));
          var text = (inp.value || '').trim();
          if (!text) return;
          var parent = _mState['jReplyTo-'+jid] || null;
          inp.value = '';
          _mState['jReplyTo-'+jid] = null;
          _mPostComment(jid, parent, text);
        }
      });
    });
    // Journal: RTE toolbar buttons
    shell.querySelectorAll('[data-mrte]').forEach(function(btn){
      _addTapListener(btn, function(e){
        e.preventDefault();
        var cmd = btn.getAttribute('data-mrte');
        var rte = document.getElementById('m-jn-desc');
        if (!rte) return;
        rte.focus();
        if (cmd === 'bold') document.execCommand('bold', false, null);
        else if (cmd === 'italic') document.execCommand('italic', false, null);
        else if (cmd === 'underline') document.execCommand('underline', false, null);
        else if (cmd === 'bullet') document.execCommand('insertUnorderedList', false, null);
      });
    });
    var composeDesc = shell.querySelector('#m-jn-desc');
    if (composeDesc) _attachMentionPicker(composeDesc);

    shell.querySelectorAll('[data-jfilter]').forEach(function(btn){
      _addTapListener(btn, function(){
        var f = btn.getAttribute('data-jfilter');
        _mState.journalFilter = f;
        renderMobileShell();
      });
    });

    shell.querySelectorAll('[data-jtab]').forEach(function(btn){
      _addTapListener(btn, function(){
        var t = btn.getAttribute('data-jtab');
        _mState.journalTab = t;
        renderMobileShell();
      });
    });

    var composeTrigger = shell.querySelector('#m-journal-compose-trigger');
    var fabBtn = shell.querySelector('#m-journal-fab');
    if (composeTrigger) _addTapListener(composeTrigger, _openComposeSheet);
    if (fabBtn) _addTapListener(fabBtn, _openComposeSheet);

    shell.querySelectorAll('[data-jexpand]').forEach(function(btn){
      _addTapListener(btn, function(){
        var jid = Number(btn.getAttribute('data-jexpand'));
        _mState['jExpand-'+jid] = true;
        var scrollY = window.scrollY;
        renderMobileShell();
        window.scrollTo(0, scrollY);
      });
    });

    shell.querySelectorAll('[data-jreact]').forEach(function(btn){
      _addTapListener(btn, function(){
        var jid = Number(btn.getAttribute('data-jreact'));
        var emoji = btn.getAttribute('data-jemoji');
        _mToggleReaction(jid, emoji);
      });
    });

    shell.querySelectorAll('[data-jmenu]').forEach(function(btn){
      _addTapListener(btn, function(e){
        e.stopPropagation();
        var jid = Number(btn.getAttribute('data-jmenu'));
        _mToggleJournalMenu(jid, btn);
      });
    });
  }

  var _mJournalImage = null;

  function _handleJournalImage(input){
    var file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024){ alert('Image exceeds 5MB limit.'); input.value=''; return; }
    var reader = new FileReader();
    reader.onload = function(e){
      _mJournalImage = e.target.result;
      var img = document.getElementById('m-jn-preview-img');
      var wrap = document.getElementById('m-jn-preview-wrap');
      if (img) img.src = _mJournalImage;
      if (wrap) wrap.style.display = 'block';
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  function _postJournal(){
    if (!DB) return;
    var descEl = document.getElementById('m-jn-desc');
    var labelEl = document.getElementById('m-jn-label');
    var desc = (descEl && descEl.innerHTML || '').trim();
    var label = (labelEl && labelEl.value) || 'Studio';
    if (!desc && !_mJournalImage) return;
    DB.journals = DB.journals || [];
    DB.nextId = DB.nextId || {};
    var nextId = DB.nextId.jn || 1;
    var plainText = descEl ? (descEl.textContent || descEl.innerText || '').trim() : '';
    var mentions = _extractMentions(plainText);
    DB.journals.push({
      id: nextId,
      title: '',
      description: desc,
      image: _mJournalImage || null,
      label: label,
      mentions: mentions,
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
    });
    DB.nextId.jn = nextId + 1;
    if (typeof saveDBFn === 'function') saveDBFn();
    mentions.forEach(function(uid){
      if (uid !== currentUser && typeof addNotification === 'function'){
        addNotification(uid, getUserName(currentUser) + ' mentioned you in a post', 'journal', nextId);
      }
    });
    if (descEl) descEl.innerHTML = '';
    _mJournalImage = null;
    var img = document.getElementById('m-jn-preview-img');
    var wrap = document.getElementById('m-jn-preview-wrap');
    if (img) img.src = '';
    if (wrap) wrap.style.display = 'none';
    renderMobileShell();
  }

  function _openComposeSheet(){
    var u = (USERS||[]).find(function(x){ return x.id === currentUser; }) || { name:'User', color:'#888' };
    var initial = _esc((u.name||'?')[0].toUpperCase());

    var bg = document.createElement('div');
    bg.className = 'm-journal-compose-sheet';
    bg.id = 'm-compose-sheet-bg';

    var inner = '<div class="m-journal-compose-inner">';
    inner += '<div class="m-journal-compose-header">';
    inner += '<span class="m-journal-compose-header-title">Journal Baru</span>';
    inner += '<button class="m-journal-compose-close" id="m-compose-close">✕</button>';
    inner += '</div>';

    inner += '<div class="m-journal-compose-user">';
    inner += '<div class="m-avatar m-journal-avatar" style="background:'+u.color+'22;color:'+u.color+'">'+ initial +'</div>';
    inner += '<div><div class="m-journal-compose-user-name">'+ _esc(u.name) +'</div>';
    inner += '<div class="m-journal-compose-user-handle">@'+ _esc((u.name||'').split(' ')[0].toLowerCase()) +'</div></div>';
    inner += '</div>';

    inner += '<div class="m-journal-compose-area">';
    inner += '<textarea class="m-journal-compose-textarea" id="m-compose-text" placeholder="Apa yang baru?"></textarea>';
    inner += '<div class="m-journal-compose-media-preview" id="m-compose-preview-wrap" style="display:none">';
    inner += '<img id="m-compose-preview-img" src=""/>';
    inner += '<button class="m-journal-compose-media-remove" id="m-compose-preview-remove">✕</button>';
    inner += '</div>';
    inner += '</div>';

    inner += '<div class="m-journal-compose-footer">';
    inner += '<div class="m-journal-compose-tools">';
    inner += '<button class="m-journal-compose-tool-btn" id="m-compose-attach">📷</button>';
    inner += '<input type="file" accept="image/*" id="m-compose-image" style="display:none"/>';
    inner += '</div>';
    inner += '<select class="m-journal-compose-label-select" id="m-compose-label">';
    ['Studio','Rental','Academy','Domestic'].forEach(function(l){
      inner += '<option value="'+l+'">'+l+'</option>';
    });
    inner += '</select>';
    inner += '<button class="m-journal-compose-submit" id="m-compose-submit">Post</button>';
    inner += '</div>';
    inner += '</div>';

    bg.innerHTML = inner;
    document.body.appendChild(bg);

    var textarea = document.getElementById('m-compose-text');
    if (textarea) textarea.focus();

    _addTapListener(bg, function(e){ if (e.target === bg) _closeComposeSheet(); });
    var closeBtn = document.getElementById('m-compose-close');
    if (closeBtn) _addTapListener(closeBtn, _closeComposeSheet);

    var attachBtn = document.getElementById('m-compose-attach');
    var imageInput = document.getElementById('m-compose-image');
    if (attachBtn && imageInput){
      _addTapListener(attachBtn, function(){ imageInput.click(); });
      imageInput.addEventListener('change', function(){ _handleComposeImage(imageInput); });
    }

    var previewRemove = document.getElementById('m-compose-preview-remove');
    if (previewRemove){
      _addTapListener(previewRemove, function(){
        _mJournalImage = null;
        var img = document.getElementById('m-compose-preview-img');
        var wrap = document.getElementById('m-compose-preview-wrap');
        if (img) img.src = '';
        if (wrap) wrap.style.display = 'none';
      });
    }

    var submitBtn = document.getElementById('m-compose-submit');
    if (submitBtn) _addTapListener(submitBtn, _submitComposeSheet);
  }

  function _closeComposeSheet(){
    var bg = document.getElementById('m-compose-sheet-bg');
    if (bg && bg.parentNode) bg.parentNode.removeChild(bg);
    _mJournalImage = null;
  }

  function _handleComposeImage(input){
    var file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024){ alert('Image exceeds 5MB limit.'); input.value=''; return; }
    var reader = new FileReader();
    reader.onload = function(e){
      _mJournalImage = e.target.result;
      var img = document.getElementById('m-compose-preview-img');
      var wrap = document.getElementById('m-compose-preview-wrap');
      if (img) img.src = _mJournalImage;
      if (wrap) wrap.style.display = 'block';
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  function _submitComposeSheet(){
    if (!DB) return;
    var textEl = document.getElementById('m-compose-text');
    var labelEl = document.getElementById('m-compose-label');
    var text = (textEl && textEl.value || '').trim();
    var label = (labelEl && labelEl.value) || 'Studio';
    if (!text && !_mJournalImage) return;
    DB.journals = DB.journals || [];
    DB.nextId = DB.nextId || {};
    var nextId = DB.nextId.jn || 1;
    var mentions = _extractMentions(text);
    DB.journals.push({
      id: nextId,
      title: '',
      description: text.replace(/\n/g, '<br>'),
      image: _mJournalImage || null,
      label: label,
      mentions: mentions,
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
    });
    DB.nextId.jn = nextId + 1;
    if (typeof saveDBFn === 'function') saveDBFn();
    mentions.forEach(function(uid){
      if (uid !== currentUser && typeof addNotification === 'function'){
        addNotification(uid, getUserName(currentUser) + ' mentioned you in a post', 'journal', nextId);
      }
    });
    _closeComposeSheet();
    renderMobileShell();
  }

  function _mToggleReaction(jid, emoji){
    if (typeof toggleReaction === 'function'){
      toggleReaction(jid, emoji).then(function(){
        renderMobileShell();
      });
    }
  }

  function _mToggleJournalMenu(jid, btn){
    var existing = document.querySelector('.m-journal-menu-dropdown');
    if (existing){
      existing.parentNode.removeChild(existing);
      return;
    }
    var j = (DB.journals || []).find(function(x){ return x.id === jid; });
    if (!j) return;

    var menu = document.createElement('div');
    menu.className = 'm-journal-menu-dropdown';
    var html = '';
    if (j.createdBy === currentUser){
      html += '<button class="m-journal-menu-item" data-jedit="'+jid+'">✎ Edit</button>';
      html += '<button class="m-journal-menu-item danger" data-jdelete="'+jid+'">🗑 Delete</button>';
    }
    html += '<button class="m-journal-menu-item" data-jcopy="'+jid+'">📋 Copy Link</button>';
    menu.innerHTML = html;

    var rect = btn.getBoundingClientRect();
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    document.body.appendChild(menu);

    menu.querySelectorAll('[data-jedit]').forEach(function(el){
      _addTapListener(el, function(){
        menu.parentNode.removeChild(menu);
        _mOpenEditSheet(jid);
      });
    });
    menu.querySelectorAll('[data-jdelete]').forEach(function(el){
      _addTapListener(el, function(){
        menu.parentNode.removeChild(menu);
        if (confirm('Delete this journal entry?')){
          DB.journals = DB.journals.filter(function(x){ return x.id !== jid; });
          if (typeof saveDBFn === 'function') saveDBFn();
          renderMobileShell();
        }
      });
    });
    menu.querySelectorAll('[data-jcopy]').forEach(function(el){
      _addTapListener(el, function(){
        menu.parentNode.removeChild(menu);
        var j2 = (DB.journals || []).find(function(x){ return x.id === jid; });
        if (j2){
          var text = (j2.description || '').replace(/<[^>]*>/g, '');
          navigator.clipboard.writeText(text).then(function(){
            alert('Copied to clipboard');
          }).catch(function(){});
        }
      });
    });

    setTimeout(function(){
      function closeMenu(e){
        if (!menu.contains(e.target)){
          if (menu.parentNode) menu.parentNode.removeChild(menu);
          document.removeEventListener('click', closeMenu);
          document.removeEventListener('touchstart', closeMenu);
        }
      }
      document.addEventListener('click', closeMenu);
      document.addEventListener('touchstart', closeMenu);
    }, 10);
  }

  function _mOpenEditSheet(jid){
    var j = (DB.journals || []).find(function(x){ return x.id === jid; });
    if (!j) return;
    _openComposeSheet();
    var titleEl = document.querySelector('.m-journal-compose-header-title');
    if (titleEl) titleEl.textContent = 'Edit Journal';
    var textEl = document.getElementById('m-compose-text');
    if (textEl) textEl.value = (j.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
    var labelEl = document.getElementById('m-compose-label');
    if (labelEl) labelEl.value = j.label || 'Studio';
    if (j.image){
      _mJournalImage = j.image;
      var img = document.getElementById('m-compose-preview-img');
      var wrap = document.getElementById('m-compose-preview-wrap');
      if (img) img.src = j.image;
      if (wrap) wrap.style.display = 'block';
    }
    var submitBtn = document.getElementById('m-compose-submit');
    if (submitBtn){
      submitBtn.textContent = 'Update';
      var newSubmit = submitBtn.cloneNode(true);
      submitBtn.parentNode.replaceChild(newSubmit, submitBtn);
      _addTapListener(newSubmit, function(){
        var t = document.getElementById('m-compose-text');
        var l = document.getElementById('m-compose-label');
        j.description = (t && t.value || '').replace(/\n/g, '<br>');
        j.label = (l && l.value) || j.label;
        j.image = _mJournalImage || j.image;
        if (typeof saveDBFn === 'function') saveDBFn();
        _closeComposeSheet();
        renderMobileShell();
      });
    }
  }

  function _completeTask(kind, id){
    if (!DB) return;
    var arr = kind === 'domestic' ? DB.domestics : DB.tasks;
    var hit = arr ? arr.find(function(t){ return String(t.id) === String(id); }) : null;
    var newDone;

    if (!hit && _mTodayCache && _mTodayCache.tasks){
      var ctApi = _mTodayCache.tasks.find(function(t){ return String(t.id) === String(id); });
      if (ctApi){
        newDone = ctApi.status !== 'Done';
        ctApi.done = newDone;
        ctApi.status = newDone ? 'Done' : 'To Do';
        ctApi.overdue = !newDone && ctApi.deadline < new Date().toISOString().split('T')[0];
        setTimeout(renderMobileShell, 250);
        return;
      }
    }

    if (!hit) return;
    newDone = hit.status !== 'Done';
    hit.status = newDone ? 'Done' : 'To Do';
    hit.done = newDone;
    if (typeof saveDBFn === 'function') saveDBFn();
    // Also update API cache if present
    if (_mTodayCache && _mTodayCache.tasks){
      var ct = _mTodayCache.tasks.find(function(t){ return String(t.id) === String(id); });
      if (ct){
        ct.done = newDone;
        ct.status = newDone ? 'Done' : 'To Do';
        ct.overdue = !newDone && ct.deadline < new Date().toISOString().split('T')[0];
      }
    }
    setTimeout(renderMobileShell, 250);
  }

  // ── sheets ──────────────────────────────────────────────────────────────
  var SHEET_CONFIG = {
    'txn-in':  { title:'Log income',  tint:'var(--forest)', amtPrefix:'+', kind:'txn' },
    'txn-out': { title:'Log expense', tint:'var(--brick)',  amtPrefix:'−', kind:'txn' },
    'task':    { title:'Quick task',  tint:'var(--ocean)',  kind:'task' },
    'note':    { title:'Journal note',tint:'var(--olive)',  kind:'note' },
  };

  function _openSheet(kind){
    var cfg = SHEET_CONFIG[kind];
    if (!cfg) return;
    _closeSheet();

    var bg = document.createElement('div');
    bg.className = 'm-sheet-bg';
    bg.id = 'm-sheet-root';

    var inner = '<div class="m-sheet" id="m-sheet">';
    inner += '<div class="m-sheet-grip"></div>';
    inner += '<div class="m-sheet-title" style="color:'+cfg.tint+'">'+ _esc(cfg.title) +'</div>';

    if (cfg.kind === 'txn'){
      inner += '<div class="m-amount-entry"><span style="color:'+cfg.tint+'">'+cfg.amtPrefix+'Rp</span>';
      inner += '<input class="m-amt-input" id="m-sh-amt" inputmode="numeric" placeholder="0"/></div>';
      inner += '<input class="m-input" id="m-sh-label" placeholder="What was this for?"/>';
    } else if (cfg.kind === 'task'){
      inner += '<input class="m-input" id="m-sh-label" autofocus placeholder="What needs doing?"/>';
    } else if (cfg.kind === 'note'){
      inner += '<input class="m-input" id="m-sh-label" autofocus placeholder="Title"/>';
      inner += '<textarea class="m-input" id="m-sh-body" rows="4" placeholder="Body…"></textarea>';
    }

    inner += '<button class="m-sheet-save" id="m-sh-save" style="background:'+cfg.tint+'">Save</button>';
    inner += '</div>';
    bg.innerHTML = inner;

    document.body.appendChild(bg);
    _addTapListener(bg, function(e){ if (e.target === bg) _closeSheet(); });

    var amtEl = document.getElementById('m-sh-amt');
    if (amtEl){
      amtEl.addEventListener('input', function(){ amtEl.value = amtEl.value.replace(/[^0-9]/g,''); });
    }
    var saveBtn = document.getElementById('m-sh-save');
    if (saveBtn) _addTapListener(saveBtn, function(){ _submitSheet(kind); });
  }

  function _closeSheet(){
    var bg = document.getElementById('m-sheet-root');
    if (bg && bg.parentNode) bg.parentNode.removeChild(bg);
  }

  function _submitSheet(kind){
    if (!DB) return;
    var label = (document.getElementById('m-sh-label')||{}).value || '';
    if (!label.trim()) return;

    if (kind === 'txn-in' || kind === 'txn-out'){
      var amt = Number((document.getElementById('m-sh-amt')||{}).value || 0);
      if (!amt) return;
      var nextId = (DB.nextId && DB.nextId.tx) || 1;
      DB.transactions = DB.transactions || [];
      DB.transactions.push({
        id: nextId,
        type: kind === 'txn-in' ? 'income' : 'expense',
        amount: amt,
        category: 'Mobile',
        account: 'bca',
        description: label.trim(),
        date: _today(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser,
      });
      if (DB.nextId) DB.nextId.tx = nextId + 1;
    } else if (kind === 'task'){
      var nextId2 = (DB.nextId && DB.nextId.t) || 1;
      DB.tasks = DB.tasks || [];
      DB.tasks.push({
        id: nextId2,
        name: label.trim(),
        assignee: currentUser,
        priority: 'normal',
        dueDate: _today(),
        status: 'To Do',
        createdAt: new Date().toISOString(),
        createdBy: currentUser,
      });
      if (DB.nextId) DB.nextId.t = nextId2 + 1;
    } else if (kind === 'note'){
      var body = (document.getElementById('m-sh-body')||{}).value || '';
      var nextId3 = (DB.nextId && DB.nextId.jn) || 1;
      DB.journals = DB.journals || [];
      DB.journals.push({
        id: nextId3,
        title: label.trim(),
        body: body.trim(),
        tag: 'Mobile',
        tagColor: 'olive',
        createdBy: currentUser,
        createdAt: new Date().toISOString(),
      });
      if (DB.nextId) DB.nextId.jn = nextId3 + 1;
    }

    if (typeof saveDBFn === 'function') saveDBFn();
    _closeSheet();
    renderMobileShell();
  }

  // ── mount / teardown ────────────────────────────────────────────────────
  // Persistent overrides (login-screen button writes to localStorage).
  function _forceMliteOn(){
    try {
      if (window.location.search.indexOf('mlite=1') >= 0) return true;
      if (window.location.search.indexOf('mlite=0') >= 0) return false;
      return localStorage.getItem('mlite-force') === '1';
    } catch(_) { return false; }
  }
  function _forceMliteOff(){
    try {
      if (window.location.search.indexOf('desktop=1') >= 0) return true;
      if (window.location.search.indexOf('mlite=0') >= 0) return true;
      return localStorage.getItem('mlite-force') === '0';
    } catch(_) { return false; }
  }
  function _haveAuth(){
    return typeof currentUser !== 'undefined' && !!currentUser;
  }
  function _haveDB(){
    return typeof DB !== 'undefined' && !!DB && !!DB.tasks;
  }
  function _shouldMount(){
    if (_forceMliteOff()) return false;
    if (!_haveAuth() || !_haveDB()) return false;
    if (_forceMliteOn()) return true;
    return window.innerWidth <= MBP;
  }

  function mountMobileShell(){
    if (_mState.mounted) return;
    _mState.mounted = true;
    document.body.classList.add('mlite-on');
    renderMobileShell();
  }
  function unmountMobileShell(){
    if (!_mState.mounted) return;
    _mState.mounted = false;
    document.body.classList.remove('mlite-on');
    var s = document.getElementById('m-shell');
    if (s && s.parentNode) s.parentNode.removeChild(s);
    _closeSheet();
  }
  function _refresh(){
    if (_shouldMount()) mountMobileShell();
    else unmountMobileShell();
  }

  // ── detect mobile device ──────────────────────────────────
  function _isMobile(){
    return window.innerWidth <= MBP || /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|WPDesktop/i.test(navigator.userAgent);
  }

  // ── inject mobile/desktop toggle pill next to version label ──
  var _togglePillInjected = false;
  function _injectVersionToggle(){
    if (_togglePillInjected) return;
    if (!_isMobile()) return;
    var verEl = document.getElementById('app-version-label');
    if (!verEl) return;
    var on = localStorage.getItem('mlite-force') === '1' || (localStorage.getItem('mlite-force') !== '0' && window.innerWidth <= MBP);
    var pill = document.createElement('span');
    pill.id = 'mview-toggle-pill';
    pill.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;cursor:pointer;background:'+(on?'rgba(45,93,123,.12)':'var(--paper-3)')+';color:'+(on?'var(--ocean)':'var(--ink-3)')+';border:1px solid '+(on?'var(--ocean)':'var(--line-2)')+';border-radius:100px;width:28px;height:22px;font-size:14px;line-height:1;margin-left:6px;user-select:none;-webkit-user-select:none;transition:background .15s,color .15s';
    pill.textContent = '📱';
    pill.title = on ? 'Switch to desktop view' : 'Switch to mobile view';
    _addTapListener(pill, function(){
      try {
        var cur = localStorage.getItem('mlite-force');
        var nextOn = !(cur === '1' || (cur === null && window.innerWidth <= MBP));
        localStorage.setItem('mlite-force', nextOn ? '1' : '0');
      } catch(_){}
      window.location.replace(window.location.pathname);
    });
    verEl.parentNode.insertBefore(pill, verEl.nextSibling);
    _togglePillInjected = true;
  }

  function initMobileLite(){
    _injectVersionToggle();
    if (!_resizeBound){
      window.addEventListener('resize', _refresh);
      _resizeBound = true;
    }
    _refresh();
  }

  // Re-render shell when the underlying DB updates from a save or remote sync.
  // saveDBFn doesn't dispatch a custom event, so wrap it once.
  function _wrapSave(){
    if (typeof window.saveDBFn !== 'function' || window._mlite_save_wrapped) return;
    var orig = window.saveDBFn;
    window.saveDBFn = function(){
      var r = orig.apply(this, arguments);
      if (_mState.mounted) setTimeout(renderMobileShell, 0);
      return r;
    };
    window._mlite_save_wrapped = true;
  }

  // Public hooks
  window.initMobileLite = initMobileLite;
  window.renderMobileShell = renderMobileShell;
  window.mountMobileShell = mountMobileShell;
  window.unmountMobileShell = unmountMobileShell;

  // Auto-init when DB and currentUser are ready. showApp() triggers loadDB
  // which populates DB; we poll briefly for it.
  // NOTE: core.js uses `let currentUser` and `let DB`, which do NOT bind to
  // window. References must be bare identifiers so they resolve via the
  // shared global lexical scope.
  document.addEventListener('DOMContentLoaded', function(){
    _injectLoginButton();
    var attempts = 0;
    var tick = setInterval(function(){
      attempts++;
      _wrapSave();
      if (_haveAuth() && _haveDB()){
        clearInterval(tick);
        initMobileLite();
      } else if (attempts > 240){
        // 60 s of polling. Bail out so we don't tick forever on the login
        // screen, but keep the login-screen mobile-view button alive.
        clearInterval(tick);
      }
    }, 250);
  });

  // ── login-screen "Mobile view" toggle ───────────────────────────────────
  // Renders a small button under the login form on small viewports so users
  // can force the lite shell on first paint, before auth completes.
  function _injectLoginButton(){
    if (window.innerWidth > MBP && !_forceMliteOn()) return;
    var loginCard = document.querySelector('#login-wrap .login-card')
      || document.getElementById('login-wrap');
    if (!loginCard) return;
    if (document.getElementById('mlite-login-btn')) return;
    var pref = (function(){
      try { return localStorage.getItem('mlite-force'); } catch(_) { return null; }
    })();
    var on = pref === '1' || (pref === null && window.innerWidth <= MBP);
    var btn = document.createElement('button');
    btn.id = 'mlite-login-btn';
    btn.type = 'button';
    btn.style.cssText = 'display:block;width:100%;margin-top:14px;padding:11px;border:1px solid var(--line-2);border-radius:10px;background:transparent;color:var(--ink-3);font-size:12px;font-family:var(--sans);cursor:pointer;letter-spacing:.04em';
    btn.textContent = on ? '📱 Use desktop view instead' : '📱 Use mobile view';
    _addTapListener(btn, function(){
      try {
        var cur = localStorage.getItem('mlite-force');
        var nextOn = !(cur === '1' || (cur === null && window.innerWidth <= MBP));
        localStorage.setItem('mlite-force', nextOn ? '1' : '0');
      } catch(_){}
      window.location.replace(window.location.pathname);
    });
    loginCard.appendChild(btn);
  }
})();
