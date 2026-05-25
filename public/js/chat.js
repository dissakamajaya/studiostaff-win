// ── CHAT.WS — AI Assistant Chat Widget ──
(function () {
  'use strict';

  var CHAT_HISTORY_KEY = 'ss-chat-history';
  var _chatOpen = false;
  var _chatHistory = [];
  var _chatLoading = false;
  var _lastSendTime = 0;
  var _MIN_SEND_INTERVAL = 800;

  // ── Load history ───────────────────────────────────────────────
  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(CHAT_HISTORY_KEY);
      if (raw) {
        var h = JSON.parse(raw);
        if (Array.isArray(h)) _chatHistory = h;
      }
    } catch (e) { _chatHistory = []; }
  }

  function saveHistory() {
    try {
      // Keep last 50 messages
      if (_chatHistory.length > 50) _chatHistory = _chatHistory.slice(-50);
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(_chatHistory));
    } catch (e) {}
  }

  function clearHistory() {
    _chatHistory = [];
    try { sessionStorage.removeItem(CHAT_HISTORY_KEY); } catch (e) {}
    var msgs = document.getElementById('chat-messages');
    if (msgs) msgs.innerHTML = '';
    addSystemMsg('Chat dihapus. Siap ngobrol lagi~');
  }

  // ── Render a message ───────────────────────────────────────────
  function addMsg(role, text) {
    var msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    var div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    div.innerHTML = formatMsg(text);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function addLoadingMsg() {
    var msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    var div = document.createElement('div');
    div.className = 'chat-msg loading';
    div.innerHTML = '<span></span><span></span><span></span>';
    div.id = 'chat-loading-msg';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function removeLoadingMsg() {
    var el = document.getElementById('chat-loading-msg');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function addSystemMsg(text) {
    var msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    var div = document.createElement('div');
    div.className = 'chat-msg system';
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ── Simple markdown-like formatting ─────────────────────────────
  function formatMsg(text) {
    if (!text) return '';
    var t = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Bold
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Code
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Newlines
    t = t.replace(/\n/g, '<br>');
    // Em dash
    t = t.replace(/---/g, '—');
    return t;
  }

  // ── API call ────────────────────────────────────────────────────
  async function sendMessage(text) {
    if (_chatLoading || !text.trim()) return;

    var now = Date.now();
    if (now - _lastSendTime < _MIN_SEND_INTERVAL) return;
    _lastSendTime = now;

    _chatLoading = true;

    var sendBtn = document.getElementById('chat-send');
    var input = document.getElementById('chat-input');
    if (sendBtn) sendBtn.disabled = true;
    if (input) input.disabled = true;

    _chatHistory.push({ role: 'user', content: text });
    saveHistory();
    addMsg('user', text);
    if (input) input.value = '';

    addLoadingMsg();

    try {
      var token = localStorage.getItem('ss-token');
      if (!token) {
        removeLoadingMsg();
        addMsg('assistant', 'Waduh, kayaknya belum login nih Pak/Bu. Silakan login dulu ya biar Bu Fitri bisa bantu.');
        _chatLoading = false;
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.disabled = false;
        return;
      }

      // Build message history for API (last 20 messages)
      var apiHistory = _chatHistory.slice(-21, -1); // exclude latest user msg (already sent as 'message')

      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          message: text,
          history: apiHistory,
        }),
      });

      removeLoadingMsg();

      if (!res.ok) {
        var errData = {};
        try { errData = await res.json(); } catch (e) {}
        var errMsg = errData.error || ('HTTP ' + res.status);
        var step = errData.step || '';
        var hint = errData.hint || '';
        _chatHistory.push({ role: 'assistant', content: 'Error: ' + errMsg + (step ? ' [' + step + ']' : '') });
        addMsg('assistant', 'Astaghfirullah, ada kendala nih' + (step ? ' (langkah ' + step + ')' : '') + ': ' + errMsg + (hint ? '. ' + hint : '') + '.');
        saveHistory();
      } else {
        var data = await res.json();
        var reply = data.reply || 'Waduh, Bu Fitri bingung nih. Coba diulangi ya...';
        _chatHistory.push({ role: 'assistant', content: reply });
        addMsg('assistant', reply);
        saveHistory();

        // If a write action occurred, refresh the dashboard
        if (data.action) {
          setTimeout(function () {
            refreshDashboard();
          }, 600);
        }
      }
    } catch (e) {
      removeLoadingMsg();
      _chatHistory.push({ role: 'assistant', content: 'Network error: ' + e.message });
      addMsg('assistant', 'Aduh, koneksinya putus nih Pak/Bu. Coba lagi ya...');
      saveHistory();
    }

    _chatLoading = false;
    if (sendBtn) sendBtn.disabled = false;
    if (input) {
      input.disabled = false;
      input.focus();
    }
  }

  // ── Refresh dashboard data after AI writes ─────────────────────
  function refreshDashboard() {
    // Trigger a full data re-fetch from the server and re-render
    var token = localStorage.getItem('ss-token');
    if (!token) return;

    fetch('/api/data', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.data && Object.keys(j.data).length > 0) {
          // Merge returned data into the global DB
          if (typeof window.DB !== 'undefined' && window.DB) {
            Object.keys(j.data).forEach(function (k) {
              if (window.DB[k] !== undefined) window.DB[k] = j.data[k];
            });
            if (window._workspaceMetaTs !== undefined) window._workspaceMetaTs = j.updated_at || null;
          }
          // Migrate numbers if needed
          if (typeof window.migrateDB === 'function') window.migrateDB();
          // Snapshot for diff
          if (typeof window._snapshotDB === 'function') window._snapshotDB();
          // Re-render current page
          if (typeof window._currentPage === 'string' && typeof window.renderPage === 'function') {
            window.renderPage(window._currentPage);
          }
          if (typeof window.renderDash === 'function') window.renderDash();
          if (typeof window.renderSidebar === 'function') window.renderSidebar();
          addSystemMsg('Data refreshed.');
        }
      })
      .catch(function (err) {
        console.warn('[chat] Dashboard refresh failed:', err);
      });
  }

  // ── Toggle panel ────────────────────────────────────────────────
  function toggleChat() {
    var panel = document.getElementById('chat-panel');
    var bubble = document.getElementById('chat-bubble');
    var input = document.getElementById('chat-input');

    if (!_chatOpen) {
      _chatOpen = true;
      if (panel) panel.classList.add('open');
      if (bubble) bubble.classList.add('open');
      if (bubble) bubble.textContent = '✕';
      if (input) setTimeout(function () { input.focus(); }, 200);
      renderHistory();
    } else {
      _chatOpen = false;
      if (panel) panel.classList.remove('open');
      if (bubble) bubble.classList.remove('open');
      if (bubble) bubble.innerHTML = '✦';
    }
  }

  // ── Render history from memory ──────────────────────────────────
  function renderHistory() {
    var msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    msgs.innerHTML = '';
    _chatHistory.forEach(function (msg) {
      addMsg(msg.role, msg.content);
    });
  }

  // ── Keyboard handler ────────────────────────────────────────────
  function onInputKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      var input = document.getElementById('chat-input');
      if (input) sendMessage(input.value);
    }
  }

  // ── Auto-resize input ───────────────────────────────────────────
  function onInputResize() {
    var el = document.getElementById('chat-input');
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 80) + 'px';
  }

  // ── Initialize ──────────────────────────────────────────────────
  function init() {
    loadHistory();

    var bubble = document.getElementById('chat-bubble');
    var closeBtn = document.getElementById('chat-close');
    var sendBtn = document.getElementById('chat-send');
    var input = document.getElementById('chat-input');
    var clearBtn = document.getElementById('chat-clear-history');

    if (bubble) bubble.addEventListener('click', toggleChat);
    if (closeBtn) closeBtn.addEventListener('click', toggleChat);
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        if (input && !_chatLoading) sendMessage(input.value);
      });
    }
    if (input) {
      input.addEventListener('keydown', onInputKey);
      input.addEventListener('input', onInputResize);
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (confirm('Hapus semua isi chat?')) clearHistory();
      });
    }

    // Listen for Esc to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _chatOpen) {
        toggleChat();
      }
    });
  }

  // Expose helpers for the mobile shell (mobile.js renders its own chat tab
  // but reuses the same /api/chat endpoint, sessionStorage history key, and
  // markdown formatter). refreshDashboard is exposed so write actions can
  // trigger the same data refresh.
  window.ssChatFormatMsg = formatMsg;
  window.ssChatSendMessage = sendMessage;
  window.refreshDashboard = refreshDashboard;

  // ── Start when DOM is ready ─────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
