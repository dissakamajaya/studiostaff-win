// ════════════════════════════════════════════════════════════
// SMART DROPDOWN — searchable, editable, custom-entry
// Place in /js/ and add to index.html before </body>:
//   <script defer src="/js/creatable-select.js"></script>
//
// Requires: DB.categories initialized in migrateDB()
//   → add this line to migrateDB() in core.js:
//   if(!DB.categories)DB.categories={};
// ════════════════════════════════════════════════════════════

// ── Default seed lists (keyed by field id) ───────────────────
var CS_DEFAULTS = {
  // Finance (tx-cat/tx-div = add modal, etx-cat/etx-div = edit modal — same list)
  'tx-cat':  'etx-cat',
  'tx-div':  'etx-div',
  // Finance
  'etx-cat': [
    'Studio Booking','Rental','Gig','Merchandise','Equipment',
    'Software','Salary','Transport','Food','Utilities','Reimbursement','Other'
  ],
  'etx-div': ['Studio','Rental','Academy','Merchandise','Domestic','Other'],
  // Project
  'pj-type':  ['Recording','Mixing','Mastering','Sound Design','Composition',
               'Commercial Score','Podcast','Film Score','Video Games',
               'Studio Rental','Company Profile','Voice Over','Runaway','Produce','Other'],
  'ep-type':  'pj-type', // alias → same list
  // Client
  'cl-type':         ['Producer','Brand','Agency','Record Label','Individual',
                      'Production House','Session Player'],
  'ecl-type':        'cl-type',
  'cl-relationship': ['patron','prospect','partner','close friend',
                      'priority customer','customer'],
  'ecl-relationship':'cl-relationship',
  // Docs
  'doc-type':  ['Contract','Agreement','Brief','Material','Lyric','Notes','Other'],
  'edc-type':  'doc-type',
  // Inventory
  'invi-cat':  ['Microphone','Guitar','Keyboard','Drum','Amplifier',
               'Mixer','Interface','Cable','Lighting','Other'],
};

// ── Resolve alias keys ────────────────────────────────────────
function _csKey(fieldId) {
  var v = CS_DEFAULTS[fieldId];
  return (typeof v === 'string') ? v : fieldId; // alias → parent key
}

// ── Get/seed options from DB ──────────────────────────────────
function csGetOptions(fieldId) {
  var key = _csKey(fieldId);
  if (!DB.categories) DB.categories = {};
  if (!DB.categories[key]) {
    var defaults = CS_DEFAULTS[key];
    DB.categories[key] = Array.isArray(defaults) ? defaults.slice() : [];
  }
  return DB.categories[key];
}

// ── Save new option to DB ─────────────────────────────────────
function csSaveOption(fieldId, val) {
  val = (val || '').trim();
  if (!val) return false;
  var opts = csGetOptions(fieldId);
  if (opts.some(function(o){ return o.toLowerCase() === val.toLowerCase(); })) return false;
  opts.push(val);
  saveDBFn();
  return true;
}

// ── Remove option from DB ─────────────────────────────────────
function csRemoveOption(fieldId, val) {
  var key = _csKey(fieldId);
  if (!DB.categories || !DB.categories[key]) return;
  DB.categories[key] = DB.categories[key].filter(function(o){
    return o.toLowerCase() !== val.toLowerCase();
  });
  saveDBFn();
}

// ── Rename option in DB ───────────────────────────────────────
function csRenameOption(fieldId, oldVal, newVal) {
  var key = _csKey(fieldId);
  newVal = (newVal || '').trim();
  if (!newVal || !DB.categories || !DB.categories[key]) return false;
  var idx = DB.categories[key].findIndex(function(o){
    return o.toLowerCase() === oldVal.toLowerCase();
  });
  if (idx === -1) return false;
  DB.categories[key][idx] = newVal;
  saveDBFn();
  return true;
}

// ════════════════════════════════════════════════════════════
// INJECT CSS (once)
// ════════════════════════════════════════════════════════════
(function() {
  if (document.getElementById('cs-styles')) return;
  var s = document.createElement('style');
  s.id = 'cs-styles';
  s.textContent = [
    '.cs-wrap{position:relative;width:100%}',
    '.cs-box{display:flex;align-items:center;background:var(--bg2,#1a1725);border:1px solid var(--border,#2a2540);border-radius:6px;padding:0 8px;height:34px;gap:6px;cursor:pointer;transition:border-color .15s;box-sizing:border-box}',
    '.cs-box:focus-within{border-color:var(--accent,#a78bfa)}',
    '.cs-val{flex:1;font-size:11px;color:var(--text,#e2e8f0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cs-val.placeholder{color:var(--text3,#64748b)}',
    '.cs-arrow{font-size:9px;color:var(--text3,#64748b);flex-shrink:0;transition:transform .15s}',
    '.cs-arrow.open{transform:rotate(180deg)}',
    '.cs-panel{position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--bg2,#1a1725);border:1px solid var(--border,#2a2540);border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.45);z-index:9999;overflow:hidden}',
    '.cs-search-row{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--border,#2a2540)}',
    '.cs-search{flex:1;background:none;border:none;outline:none;font-size:11px;color:var(--text,#e2e8f0);caret-color:var(--accent,#a78bfa)}',
    '.cs-search::placeholder{color:var(--text3,#64748b)}',
    '.cs-manage-btn{font-size:10px;color:var(--accent,#a78bfa);background:none;border:none;cursor:pointer;white-space:nowrap;padding:0;opacity:.8}',
    '.cs-manage-btn:hover{opacity:1}',
    '.cs-list{max-height:200px;overflow-y:auto}',
    '.cs-opt{display:flex;align-items:center;padding:7px 10px;font-size:11px;color:var(--text,#e2e8f0);cursor:pointer;gap:6px}',
    '.cs-opt:hover,.cs-opt.hl{background:var(--bg3,#241e3a)}',
    '.cs-opt.selected{color:var(--accent,#a78bfa)}',
    '.cs-opt-label{flex:1}',
    '.cs-opt-actions{display:none;gap:4px}',
    '.cs-opt:hover .cs-opt-actions{display:flex}',
    '.cs-opt-btn{font-size:9px;background:none;border:1px solid var(--border,#2a2540);border-radius:3px;padding:1px 5px;cursor:pointer;color:var(--text3,#64748b)}',
    '.cs-opt-btn:hover{color:var(--text,#e2e8f0);border-color:var(--text3)}',
    '.cs-opt-btn.del:hover{color:var(--red,#f04444);border-color:var(--red,#f04444)}',
    '.cs-add-row{padding:7px 10px;font-size:11px;color:var(--accent,#a78bfa);cursor:pointer;border-top:1px solid var(--border,#2a2540);font-style:italic}',
    '.cs-add-row:hover{background:var(--bg3,#241e3a)}',
    '.cs-empty{padding:10px;font-size:11px;color:var(--text3,#64748b);text-align:center}',
    '.cs-edit-input{width:100%;background:var(--bg3);border:1px solid var(--accent,#a78bfa);border-radius:4px;padding:2px 6px;font-size:11px;color:var(--text);outline:none}',
  ].join('');
  document.head.appendChild(s);
})();

// ════════════════════════════════════════════════════════════
// CORE: csInit(fieldId, currentValue?)
// Enhances the <select id="fieldId"> in-place.
// ════════════════════════════════════════════════════════════
function csInit(fieldId, currentValue) {
  var sel = document.getElementById(fieldId);
  if (!sel) return;

  // Already initialized — just update value
  if (sel._csWrap) {
    csSetValue(fieldId, currentValue !== undefined ? currentValue : sel.value);
    return;
  }

  var value = currentValue !== undefined ? currentValue : sel.value;
  var isOpen = false;
  var hlIdx = -1;
  var editingIdx = -1;

  // Hide native select, insert wrapper before it
  sel.style.display = 'none';
  var wrap = document.createElement('div');
  wrap.className = 'cs-wrap';
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel); // move select inside wrapper
  sel._csWrap = wrap;

  // Build DOM
  wrap.innerHTML = [
    '<div class="cs-box" id="cs-box-' + fieldId + '">',
      '<span class="cs-val placeholder" id="cs-val-' + fieldId + '">Select or type…</span>',
      '<span class="cs-arrow" id="cs-arr-' + fieldId + '">▾</span>',
    '</div>',
    '<div class="cs-panel" id="cs-panel-' + fieldId + '" style="display:none">',
      '<div class="cs-search-row">',
        '<input class="cs-search" id="cs-search-' + fieldId + '" placeholder="Search or type new…" autocomplete="off" spellcheck="false"/>',
        '<button class="cs-manage-btn" onclick="csOpenManage(\'' + fieldId + '\')">⚙ Manage</button>',
      '</div>',
      '<div class="cs-list" id="cs-list-' + fieldId + '"></div>',
    '</div>',
  ].join('');
  wrap.appendChild(sel); // keep select at end (hidden)

  var box    = document.getElementById('cs-box-' + fieldId);
  var panel  = document.getElementById('cs-panel-' + fieldId);
  var valEl  = document.getElementById('cs-val-' + fieldId);
  var arr    = document.getElementById('cs-arr-' + fieldId);
  var search = document.getElementById('cs-search-' + fieldId);
  var list   = document.getElementById('cs-list-' + fieldId);

  // ── Render dropdown list ──────────────────────────────
  function renderList() {
    var q = search.value.trim().toLowerCase();
    var opts = csGetOptions(fieldId);
    var filtered = q ? opts.filter(function(o){ return o.toLowerCase().includes(q); }) : opts;
    var canAdd = q && !opts.some(function(o){ return o.toLowerCase() === q; });

    list.innerHTML = '';

    if (!filtered.length && !canAdd) {
      list.innerHTML = '<div class="cs-empty">No options found</div>';
    } else {
      filtered.forEach(function(opt, i) {
        var isSelected = opt === value;
        var isHL = i === hlIdx;
        var div = document.createElement('div');
        div.className = 'cs-opt' + (isSelected ? ' selected' : '') + (isHL ? ' hl' : '');
        div.dataset.val = opt;
        div.dataset.idx = i;

        if (editingIdx === i) {
          // Inline edit mode
          div.innerHTML = '<input class="cs-edit-input" id="cs-edit-inp-' + fieldId + '" value="' + _esc(opt) + '"/>' +
            '<button class="cs-opt-btn" onclick="csSaveEdit(\'' + fieldId + '\',' + i + ')">✓</button>' +
            '<button class="cs-opt-btn" onclick="csCancelEdit(\'' + fieldId + '\')">✕</button>';
          setTimeout(function() {
            var inp = document.getElementById('cs-edit-inp-' + fieldId);
            if (inp) { inp.focus(); inp.select(); }
          }, 0);
        } else {
          div.innerHTML = '<span class="cs-opt-label">' + _esc(opt) + '</span>' +
            '<span class="cs-opt-actions">' +
              '<button class="cs-opt-btn" title="Rename" onclick="csStartEdit(\'' + fieldId + '\',' + i + ')">✎</button>' +
              '<button class="cs-opt-btn del" title="Remove" onclick="csDeleteOpt(\'' + fieldId + '\',\'' + _esc(opt) + '\')">✕</button>' +
            '</span>';
          div.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'BUTTON') return; // let buttons handle themselves
            e.preventDefault();
            pick(opt);
          });
        }
        list.appendChild(div);
      });
    }

    if (canAdd) {
      var addDiv = document.createElement('div');
      addDiv.className = 'cs-add-row';
      addDiv.textContent = '+ Add "' + search.value.trim() + '"';
      addDiv.addEventListener('mousedown', function(e) {
        e.preventDefault();
        var newVal = search.value.trim();
        csSaveOption(fieldId, newVal);
        pick(newVal);
        showToast && showToast('"' + newVal + '" added', 'success');
      });
      list.appendChild(addDiv);
    }
  }

  // ── Pick a value ──────────────────────────────────────
  function pick(v) {
    value = v;
    // Sync hidden select
    var found = Array.from(sel.options).find(function(o){ return o.value === v; });
    if (!found) { sel.appendChild(new Option(v, v)); }
    sel.value = v;
    // Update display
    valEl.textContent = v || 'Select or type…';
    valEl.classList.toggle('placeholder', !v);
    close();
  }

  // ── Open/close ────────────────────────────────────────
  function open() {
    isOpen = true;
    panel.style.display = '';
    arr.classList.add('open');
    search.value = '';
    hlIdx = -1;
    editingIdx = -1;
    renderList();
    search.focus();
  }
  function close() {
    isOpen = false;
    panel.style.display = 'none';
    arr.classList.remove('open');
    search.value = '';
    editingIdx = -1;
  }

  // ── Events ────────────────────────────────────────────
  box.addEventListener('click', function() { isOpen ? close() : open(); });

  search.addEventListener('input', function() {
    hlIdx = -1;
    renderList();
  });

  search.addEventListener('keydown', function(e) {
    var items = list.querySelectorAll('.cs-opt');
    if (e.key === 'ArrowDown') {
      e.preventDefault(); hlIdx = Math.min(hlIdx + 1, items.length - 1); renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); hlIdx = Math.max(hlIdx - 1, 0); renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var hl = list.querySelector('.cs-opt.hl');
      if (hl && hl.dataset.val) { pick(hl.dataset.val); }
      else if (search.value.trim()) {
        var v = search.value.trim();
        csSaveOption(fieldId, v);
        pick(v);
      }
    } else if (e.key === 'Escape') {
      close();
    }
  });

  document.addEventListener('mousedown', function(e) {
    if (isOpen && !wrap.contains(e.target)) close();
  });

  // ── Expose internal methods on wrap for csSetValue/csStartEdit etc ──
  wrap._pick = pick;
  wrap._open = open;
  wrap._close = close;
  wrap._renderList = renderList;
  wrap._getEditingIdx = function() { return editingIdx; };
  wrap._setEditingIdx = function(i) { editingIdx = i; };
  wrap._getValue = function() { return value; };

  // ── Set initial value ─────────────────────────────────
  if (value) { pick(value); } else { close(); }
}

// ── Public API ────────────────────────────────────────────────
function csSetValue(fieldId, val) {
  var sel = document.getElementById(fieldId);
  if (sel && sel._csWrap && sel._csWrap._pick) {
    sel._csWrap._pick(val || '');
  }
}

function csStartEdit(fieldId, idx) {
  var sel = document.getElementById(fieldId);
  if (sel && sel._csWrap) {
    sel._csWrap._setEditingIdx(idx);
    sel._csWrap._renderList();
  }
}

function csCancelEdit(fieldId) {
  var sel = document.getElementById(fieldId);
  if (sel && sel._csWrap) {
    sel._csWrap._setEditingIdx(-1);
    sel._csWrap._renderList();
  }
}

function csSaveEdit(fieldId, idx) {
  var inp = document.getElementById('cs-edit-inp-' + fieldId);
  if (!inp) return;
  var newVal = inp.value.trim();
  if (!newVal) { csCancelEdit(fieldId); return; }
  var opts = csGetOptions(fieldId);
  var oldVal = opts[idx];
  if (newVal === oldVal) { csCancelEdit(fieldId); return; }
  csRenameOption(fieldId, oldVal, newVal);
  // If was selected, update display
  var sel = document.getElementById(fieldId);
  if (sel && sel._csWrap && sel._csWrap._getValue() === oldVal) {
    sel._csWrap._setEditingIdx(-1);
    sel._csWrap._pick(newVal);
  } else {
    csCancelEdit(fieldId);
  }
  showToast && showToast('Renamed to "' + newVal + '"', 'success');
}

function csDeleteOpt(fieldId, val) {
  if (!confirm('Remove "' + val + '" from options?')) return;
  csRemoveOption(fieldId, val);
  // If was selected, clear
  var sel = document.getElementById(fieldId);
  if (sel && sel._csWrap && sel._csWrap._getValue() === val) {
    sel._csWrap._pick('');
  }
  var wrap = sel && sel._csWrap;
  if (wrap && wrap._renderList) wrap._renderList();
  showToast && showToast('"' + val + '" removed', 'success');
}

// ── Manage modal: full list view with edit/delete ─────────────
function csOpenManage(fieldId) {
  var existing = document.getElementById('cs-manage-modal');
  if (existing) existing.remove();

  function rebuild() {
    var opts = csGetOptions(fieldId);
    var body = document.getElementById('cs-manage-body');
    if (!body) return;
    body.innerHTML = opts.length ? opts.map(function(o, i) {
      return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">' +
        '<span style="flex:1;font-size:11px">' + _esc(o) + '</span>' +
        '<button class="btn-o btn-xs" onclick="csManageEdit(\'' + fieldId + '\',' + i + ')">✎</button>' +
        '<button class="btn-danger btn-xs" onclick="csManageDelete(\'' + fieldId + '\',\'' + _esc(o) + '\',csManageRebuild)">✕</button>' +
      '</div>';
    }).join('') : '<div class="empty" style="padding:12px">No custom options yet.</div>';
    window._csManageRebuild = rebuild;
  }

  var m = document.createElement('div');
  m.id = 'cs-manage-modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:10000';
  m.innerHTML = '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px;width:340px;max-height:80vh;overflow-y:auto">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
      '<span style="font-size:13px;font-weight:600">Manage Options</span>' +
      '<button onclick="document.getElementById(\'cs-manage-modal\').remove()" style="background:none;border:none;color:var(--text3);font-size:16px;cursor:pointer">✕</button>' +
    '</div>' +
    '<div id="cs-manage-body" style="margin-bottom:14px"></div>' +
    '<div style="display:flex;gap:6px">' +
      '<input id="cs-manage-new" class="fi" style="flex:1;font-size:11px" placeholder="New option…"/>' +
      '<button class="btn btn-sm" onclick="csManageAdd(\'' + fieldId + '\')">+ Add</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(m);
  m.addEventListener('click', function(e) { if (e.target === m) m.remove(); });
  rebuild();
}

function csManageAdd(fieldId) {
  var inp = document.getElementById('cs-manage-new');
  if (!inp || !inp.value.trim()) return;
  var added = csSaveOption(fieldId, inp.value.trim());
  if (added) {
    inp.value = '';
    if (window._csManageRebuild) window._csManageRebuild();
    showToast && showToast('Option added', 'success');
  }
}

function csManageEdit(fieldId, idx) {
  var opts = csGetOptions(fieldId);
  var old = opts[idx];
  var newVal = prompt('Rename "' + old + '" to:', old);
  if (!newVal || newVal.trim() === old) return;
  csRenameOption(fieldId, old, newVal.trim());
  // Update selected value if needed
  var sel = document.getElementById(fieldId);
  if (sel && sel._csWrap && sel._csWrap._getValue() === old) {
    sel._csWrap._pick(newVal.trim());
  }
  if (window._csManageRebuild) window._csManageRebuild();
}

function csManageDelete(fieldId, val, cb) {
  if (!confirm('Remove "' + val + '"?')) return;
  csRemoveOption(fieldId, val);
  var sel = document.getElementById(fieldId);
  if (sel && sel._csWrap && sel._csWrap._getValue() === val) {
    sel._csWrap._pick('');
  }
  if (cb) cb();
  showToast && showToast('"' + val + '" removed', 'success');
}

// ── HTML escape helper ────────────────────────────────────────
function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ════════════════════════════════════════════════════════════
// HOOKS — patch open functions to auto-init fields
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {

  // ── Helper: init after a short tick (modal needs to be visible) ──
  function later(fn) { setTimeout(fn, 60); }

  // ── Finance: Add Transaction ──────────────────────────────
  // modal-transaction is static HTML — init once at load, fields persist
  csInit('tx-cat');
  csInit('tx-div');
  // Patch openTransactionModal to reset values on each open
  window._csTxModalPatch = function() {
    if (window.openTransactionModal && !window.openTransactionModal._csPatched) {
      var _orig = window.openTransactionModal;
      window.openTransactionModal = function(type) {
        _orig(type);
        later(function() { csSetValue('tx-cat', ''); csSetValue('tx-div', ''); });
      };
      window.openTransactionModal._csPatched = true;
    }
  };

  // ── Finance: Edit Transaction ─────────────────────────────
  var _origEditTx = window.openEditTransaction;
  window.openEditTransaction = function(id) {
    _origEditTx(id);
    later(function() {
      var t = DB.transactions.find(function(x){ return x.id === id; });
      if (!t) return;
      csInit('etx-cat', t.category || '');
      csInit('etx-div', t.division || '');
    });
  };

  // ── Project: Add ─────────────────────────────────────────
  // pj-type is in a static modal — init once on DOMContentLoaded
  csInit('pj-type');

  // ── Project: Edit ─────────────────────────────────────────
  var _origEditProj = window.editProject || window.openEditProject;
  if (_origEditProj) {
    var _epName = window.editProject ? 'editProject' : 'openEditProject';
    window[_epName] = function(id) {
      _origEditProj(id);
      later(function() {
        var p = DB.projects.find(function(x){ return x.id === id; });
        csInit('ep-type', p ? p.type : '');
      });
    };
  }

  // ── Client: Add ───────────────────────────────────────────
  csInit('cl-type');
  csInit('cl-relationship');

  // ── Client: Edit ──────────────────────────────────────────
  var _origEditClient = window.openEditClient;
  if (_origEditClient) {
    window.openEditClient = function(id) {
      _origEditClient(id);
      later(function() {
        var c = DB.clients.find(function(x){ return x.id === id; });
        csInit('ecl-type', c ? c.type : '');
        csInit('ecl-relationship', c ? c.relationship : '');
      });
    };
  }

  // ── Docs: Add ─────────────────────────────────────────────
  // doc-type already has a custom type hack — we replace it
  // Remove the onchange that shows the custom input wrap
  var docTypeSel = document.getElementById('doc-type');
  if (docTypeSel) {
    docTypeSel.removeAttribute('onchange');
    var wrap = document.getElementById('doc-custom-type-wrap');
    if (wrap) wrap.style.display = 'none'; // hide old custom input
    csInit('doc-type');
  }

  // ── Docs: Edit ────────────────────────────────────────────
  var edcTypeSel = document.getElementById('edc-type');
  if (edcTypeSel) {
    edcTypeSel.removeAttribute('onchange');
    var edcWrap = document.getElementById('edc-custom-type-wrap');
    if (edcWrap) edcWrap.style.display = 'none';
  }
  var _origEditDoc = window.openEditDoc || window.editDoc;
  if (_origEditDoc) {
    var _edName = window.openEditDoc ? 'openEditDoc' : 'editDoc';
    window[_edName] = function(id) {
      _origEditDoc(id);
      later(function() {
        var d = DB.docs.find(function(x){ return x.id === id; });
        csInit('edc-type', d ? d.type : '');
      });
    };
  }

  // ── Inventory: Add ────────────────────────────────────────
  csInit('invi-cat');

  // Late-patch openTransactionModal — finance.js loads after this file
  // so the function may not exist yet at DOMContentLoaded
  window._csTxModalPatch();
  setTimeout(window._csTxModalPatch, 500);

});
