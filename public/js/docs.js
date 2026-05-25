// ════════ RENDER: DOCS (with filter/sort) ════════
let docsFilter={type:'',search:'',sortDir:'desc'};
function setDocsFilter(key,val){docsFilter[key]=val;renderDocs();}
function renderDocs(){
  let docs=DB.docs;
  if(docsFilter.type)docs=docs.filter(d=>d.type===docsFilter.type);
  if(docsFilter.search){const q=docsFilter.search.toLowerCase();docs=docs.filter(d=>d.title.toLowerCase().includes(q)||(d.related||'').toLowerCase().includes(q));}
  docs=docs.slice().sort((a,b)=>docsFilter.sortDir==='asc'?new Date(a.createdAt)-new Date(b.createdAt):new Date(b.createdAt)-new Date(a.createdAt));
  const wrap=document.getElementById('docs-page-wrap');
  if(!wrap){renderPage(_currentPage);return;}
  const filterBar=`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
    <input class="fi" id="docs-search" placeholder="🔍 Search docs..." style="width:160px;padding:4px 8px;font-size:11px" value="${docsFilter.search}" oninput="docsFilter.search=this.value;renderDocs()"/>
    <span style="font-size:10px;color:var(--text3)">Type:</span>
    ${['','Contract','Agreement','Brief','Material','Lyric','Notes','Other'].map(t=>`<button class="btn-o btn-xs" onclick="setDocsFilter('type','${t}')" style="${docsFilter.type===t?'border-color:var(--accent);color:var(--accent)':''}">${t||'All'}</button>`).join('')}
    <span style="font-size:10px;color:var(--text3);margin-left:4px">Sort:</span>
    <button class="btn-o btn-xs" onclick="setDocsFilter('sortDir','desc')" style="${docsFilter.sortDir==='desc'?'border-color:var(--accent);color:var(--accent)':''}">Newest</button>
    <button class="btn-o btn-xs" onclick="setDocsFilter('sortDir','asc')" style="${docsFilter.sortDir==='asc'?'border-color:var(--accent);color:var(--accent)':''}">Oldest</button>
  </div>`;
  const typeColors={Contract:'var(--accent)',Agreement:'var(--blue)',Brief:'var(--amber)',Material:'var(--green)',Lyric:'var(--red)',Notes:'var(--text3)',Other:'var(--text3)'};
  const tbl=docs.length?docs.map(d=>{const proj=d.projectId?DB.projects.find(p=>p.id===d.projectId):null;const client=d.clientId?DB.clients.find(c=>c.id===d.clientId):null;const tc=typeColors[d.type]||'var(--text3)';return`<tr><td style="font-weight:500">${d.title}</td><td><span style="background:${tc}22;color:${tc};border-radius:3px;padding:1px 6px;font-size:9px">${d.type}</span></td><td class="tc">${proj?proj.name:client?client.name:d.related||'—'}</td><td class="tc">${fmtDate(d.createdAt)}</td><td class="tc">${getUserName(d.createdBy)}</td><td><div style="display:flex;gap:4px"><button class="btn-o btn-xs" onclick="viewDoc(${d.id})">View</button><button class="btn-o btn-xs" onclick="openEditDoc(${d.id})">✎</button><button class="btn-danger btn-xs" onclick="deleteDoc(${d.id})">✕</button></div></td></tr>`;}).join(''):`<tr><td colspan="6" class="empty">No documents match the filter.</td></tr>`;
  wrap.innerHTML=filterBar+`<div class="tw"><table class="tbl"><thead><tr><th>Title</th><th>Type</th><th>Related</th><th>Created</th><th>Author</th><th>Action</th></tr></thead><tbody>${tbl}</tbody></table></div>
  <div class="card-list">${docs.map(d=>{const tc=typeColors[d.type]||'var(--text3)';return`<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${d.title}</div><div class="card-item-sub">${d.related||getUserName(d.createdBy)}</div></div><span style="background:${tc}22;color:${tc};border-radius:3px;padding:1px 6px;font-size:9px">${d.type}</span></div><div class="card-item-row"><span class="card-item-label">Created</span><span class="card-item-val">${fmtDate(d.createdAt)}</span></div><div class="card-item-actions"><button class="btn-o btn-xs" onclick="viewDoc(${d.id})">View</button><button class="btn-o btn-xs" onclick="openEditDoc(${d.id})">✎</button><button class="btn-danger btn-xs" onclick="deleteDoc(${d.id})">✕</button></div></div>`;}).join('')}</div>`;
}
function viewDoc(id){
  const d=DB.docs.find(x=>x.id===id);if(!d)return;
  const proj=d.projectId?DB.projects.find(p=>p.id===d.projectId):null;
  const client=d.clientId?DB.clients.find(c=>c.id===d.clientId):null;
  const typeColors={Contract:'var(--accent)',Agreement:'var(--blue)',Brief:'var(--amber)',Material:'var(--green)',Lyric:'var(--red)',Notes:'var(--text3)'};
  const tc=typeColors[d.type]||'var(--text3)';
  const isHtml=d.content&&d.content.includes('<');
  const defaultMode=isHtml?'preview':'rich';
  const renderContent=(mode)=>{
    if(!d.content)return'<span style="color:var(--text3);font-style:italic">(empty)</span>';
    if(mode==='preview') return _docPreviewIframe(d.content);
    return isHtml?d.content:d.content.replace(/\n/g,'<br>');
  };
  const _btn=(mode,label)=>`<button class="btn-xs btn-o" id="doc-view-${mode}" onclick="docToggleView(${d.id},'${mode}')" style="${defaultMode===mode?'border-color:var(--accent);color:var(--accent)':''}">${label}</button>`;
  document.getElementById('detail-title').textContent=d.title;
  document.getElementById('detail-body').innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <span style="background:${tc}22;color:${tc};border-radius:4px;padding:3px 10px;font-size:10px;font-weight:600">${d.type}</span>
      <span class="pill pa_">${d.status}</span>
      ${proj?`<span style="font-size:10px;color:var(--text3)">📁 ${proj.name}</span>`:''}
      ${client?`<span style="font-size:10px;color:var(--text3)">👤 ${client.name}</span>`:''}
    </div>
    ${d.mentions&&d.mentions.length?`<div style="margin-bottom:10px;font-size:10px;color:var(--text3)">Mentions: ${d.mentions.map(uid=>`<span style="background:${getUserColor(uid)}22;color:${getUserColor(uid)};border-radius:10px;padding:2px 8px;margin:0 2px">${getUserName(uid)}</span>`).join('')}</div>`:''}
    ${d.attachments&&d.attachments.length?`<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--text3);margin-bottom:4px">📎 Attachments</div><div style="display:flex;flex-wrap:wrap;gap:6px">${d.attachments.map(a=>`<a href="${a.data}" download="${a.name}" style="display:flex;align-items:center;gap:4px;background:var(--bg3);border:1px solid var(--bdr);border-radius:6px;padding:4px 8px;font-size:10px;color:var(--text2);text-decoration:none">📄 ${a.name} <span style="color:var(--text3)">(${(a.size/1024).toFixed(1)}KB)</span></a>`).join('')}</div></div>`:''}
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">
      <span style="font-size:10px;color:var(--text3)">View:</span>
      ${_btn('rich','Formatted')}
      ${isHtml?_btn('preview','HTML Preview'):''}
      ${isHtml?`<button class="btn-xs btn-o" onclick="docOpenInNewTab(${d.id})" style="border-color:var(--blue,#60a5fa);color:var(--blue,#60a5fa)">↗ New Tab</button>`:''}
    </div>
    <div id="doc-content-pane" class="doc-content-view" style="background:var(--bg3);border-radius:6px;padding:14px;font-size:11px;color:var(--text2);line-height:1.8;min-height:80px">${renderContent(defaultMode)}</div>
    <div style="font-size:10px;color:var(--text3);margin-top:10px">✍ ${getUserName(d.createdBy)} · ${fmtDate(d.createdAt)}</div>`;
  document.getElementById('detail-actions').innerHTML=`
    <button class="btn-o" onclick="closeModal('modal-detail')">Close</button>
    <button class="btn-o" style="border-color:var(--amber);color:var(--amber)" onclick="openEditDoc(${d.id})">✎ Edit</button>
    <button class="btn-danger" onclick="deleteDoc(${d.id});closeModal('modal-detail')">✕ Delete</button>`;
  openModal('modal-detail');
}
function _docPreviewIframe(content){
  const head=[
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<script src="https://cdn.tailwindcss.com"><\/script>',
    '<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"><\/script>',
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"><\/script>',
    '<script>document.addEventListener("DOMContentLoaded",function(){hljs.highlightAll();})<\/script>',
    `<script>
      (function(){
        function _sync(){
          try{
            var h=document.documentElement.scrollHeight;
            var fe=window.frameElement;
            if(fe)fe.style.height=Math.max(80,h+12)+'px';
          }catch(e){}
        }
        document.addEventListener('DOMContentLoaded',function(){
          _sync();
          if(window.ResizeObserver){
            new ResizeObserver(_sync).observe(document.documentElement);
          } else {
            setInterval(_sync,400);
          }
        });
        window.addEventListener('load',_sync);
        setTimeout(_sync,300);setTimeout(_sync,800);setTimeout(_sync,1600);
      })();
    <\/script>`,
    '<style>*{box-sizing:border-box;-webkit-text-size-adjust:100%}html,body{width:100%;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.55;color:#cdd6f4;background:#1e1e2e;padding:8px 10px;overflow-x:hidden;word-break:break-word;overflow-wrap:break-word}h1{font-size:1.25em;margin:0 0 6px}h2{font-size:1.1em;margin:0 0 5px}h3,h4,h5,h6{font-size:1em;margin:0 0 4px}p{margin:0 0 6px}a{color:#89b4fa;word-break:break-all}ul,ol{padding-left:16px;margin:0 0 6px}li{margin-bottom:2px}b,strong{font-weight:600}i,em{font-style:italic}blockquote{border-left:3px solid #45475a;margin:0 0 6px;padding:4px 10px;color:#a6adc8;font-style:italic}pre{margin:4px 0 6px;border-radius:5px;overflow-x:auto;max-width:100%}code:not(pre code){background:#313244;padding:1px 4px;border-radius:3px;font-size:.88em;word-break:break-all}img{max-width:100%;height:auto;display:block;margin:4px 0}figure{margin:0 0 6px}table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:6px}td,th{border:1px solid #45475a;padding:4px 8px;text-align:left;word-break:break-word}th{background:#181825;font-weight:600}hr{border:none;border-top:1px solid #313244;margin:8px 0}*+*{margin-top:0}</style>',
  ].join('');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8">${head}</head><body>${content}</body></html>`;
  return`<iframe sandbox="allow-scripts allow-same-origin allow-popups" srcdoc="${html.replace(/"/g,'&quot;')}" style="width:100%;min-height:80px;border:none;border-radius:4px;display:block;transition:height .15s"></iframe>`;
}
function _buildDocFullHtml(content){
  const head=[
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<script src="https://cdn.tailwindcss.com"><\/script>',
    '<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"><\/script>',
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"><\/script>',
    '<script>document.addEventListener("DOMContentLoaded",function(){hljs.highlightAll();})<\/script>',
    '<style>*{box-sizing:border-box}html,body{width:100%;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;color:#cdd6f4;background:#1e1e2e;padding:24px;overflow-x:hidden;word-break:break-word}h1{font-size:1.5em;margin:0 0 8px}h2{font-size:1.2em;margin:0 0 6px}h3,h4,h5,h6{font-size:1em;margin:0 0 4px}p{margin:0 0 8px}a{color:#89b4fa}ul,ol{padding-left:20px;margin:0 0 8px}li{margin-bottom:3px}b,strong{font-weight:600}i,em{font-style:italic}blockquote{border-left:3px solid #45475a;margin:0 0 8px;padding:4px 12px;color:#a6adc8;font-style:italic}pre{margin:6px 0 8px;border-radius:6px;overflow-x:auto}code:not(pre code){background:#313244;padding:1px 5px;border-radius:3px;font-size:.88em}img{max-width:100%;height:auto;display:block;margin:6px 0}table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}td,th{border:1px solid #45475a;padding:6px 10px;text-align:left}th{background:#181825;font-weight:600}hr{border:none;border-top:1px solid #313244;margin:12px 0}</style>',
  ].join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${head}</head><body>${content}</body></html>`;
}
function docOpenInNewTab(id){
  const d=DB.docs.find(x=>x.id===id);if(!d||!d.content)return;
  const html=_buildDocFullHtml(d.content);
  const blob=new Blob([html],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const w=window.open(url,'_blank');
  if(w)setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function docToggleView(id,mode){
  const d=DB.docs.find(x=>x.id===id);if(!d)return;
  const pane=document.getElementById('doc-content-pane');if(!pane)return;
  if(mode==='preview'){
    pane.innerHTML=_docPreviewIframe(d.content);
  } else {
    const isHtml=d.content&&d.content.includes('<');
    pane.innerHTML=d.content?(isHtml?d.content:d.content.replace(/\n/g,'<br>')):'<span style="color:var(--text3);font-style:italic">(empty)</span>';
  }
  document.querySelectorAll('#doc-view-rich,#doc-view-preview').forEach(b=>{
    const active=b.id==='doc-view-'+mode;
    b.style.borderColor=active?'var(--accent)':'';
    b.style.color=active?'var(--accent)':'';
  });
}

// ════════ FILE ATTACHMENT (New Doc) ════════
let _docPendingAttachments=[];

function docInitAttachments(){
  _docPendingAttachments=[];
  docRenderAttachList();
}
function docHandleFileInput(input){
  const files=Array.from(input.files);
  const MAX_SIZE=5*1024*1024; // 5MB per file
  files.forEach(file=>{
    if(file.size>MAX_SIZE){showToast(`${file.name} exceeds 5MB limit.`,'error');return;}
    const reader=new FileReader();
    reader.onload=e=>{
      _docPendingAttachments.push({name:file.name,size:file.size,type:file.type,data:e.target.result});
      docRenderAttachList();
    };
    reader.readAsDataURL(file);
  });
  input.value=''; // reset so same file can be re-added
}
function docRemoveAttachment(idx){
  _docPendingAttachments.splice(idx,1);
  docRenderAttachList();
}
function docRenderAttachList(){
  const wrap=document.getElementById('doc-attach-list');if(!wrap)return;
  if(!_docPendingAttachments.length){wrap.innerHTML='<span style="font-size:10px;color:var(--text3)">No files attached.</span>';return;}
  wrap.innerHTML=_docPendingAttachments.map((a,i)=>`
    <div style="display:flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--bdr);border-radius:6px;padding:4px 8px;font-size:10px;color:var(--text2)">
      <span>📄 ${a.name}</span>
      <span style="color:var(--text3)">(${(a.size/1024).toFixed(1)}KB)</span>
      <button class="btn-danger btn-xs" onclick="docRemoveAttachment(${i})" style="margin-left:auto;padding:1px 5px">✕</button>
    </div>`).join('');
}


// ════════ CUSTOM TYPE HELPER ════════
function docCheckCustomType(selectId, wrapId){
  const sel=document.getElementById(selectId);
  const wrap=document.getElementById(wrapId);
  if(!sel||!wrap)return;
  wrap.style.display=sel.value==='__custom__'?'':'none';
}
function docResolveType(selectId, customInputId){
  const sel=document.getElementById(selectId);
  if(!sel)return'Other';
  if(sel.value==='__custom__'){
    const custom=(document.getElementById(customInputId)||{}).value||'';
    return custom.trim()||'Other';
  }
  return sel.value||'Other';
}
// ════════ PATCH saveDoc to include attachments ════════
// Wraps the original saveDoc (defined elsewhere) to inject _docPendingAttachments
(function(){
  function _patch(){
    if(typeof saveDoc !== 'function'){return setTimeout(_patch,200);}
    const _orig=saveDoc;
    window.saveDoc=function(){
      // Call original which pushes to DB.docs
      _orig.apply(this,arguments);
      // Find the doc just created (highest id) and attach files
      if(_docPendingAttachments.length){
        const docs=DB.docs||[];
        const latest=docs[docs.length-1];
        if(latest){
          const resolvedType=docResolveType('doc-type','doc-custom-type');if(resolvedType)latest.type=resolvedType;
          latest.attachments=(_docPendingAttachments||[]).map(a=>({name:a.name,size:a.size,type:a.type,data:a.data}));
          _docPendingAttachments=[];
          if(typeof saveDBFn==='function')saveDBFn();
        }
      }
    };
  }
  document.addEventListener('DOMContentLoaded',_patch);
})();

// ════════ PATCH updateDoc to resolve custom type ════════
(function(){
  function _patch(){
    if(typeof updateDoc !== 'function'){return setTimeout(_patch,200);}
    const _orig=updateDoc;
    window.updateDoc=function(){
      // Resolve custom type before original runs (it reads edc-type directly)
      const sel=document.getElementById('edc-type');
      if(sel&&sel.value==='__custom__'){
        const custom=(document.getElementById('edc-custom-type')||{}).value||'';
        const resolved=custom.trim()||'Other';
        // Temporarily set value so original picks it up
        const opt=document.createElement('option');
        opt.value=resolved;opt.textContent=resolved;
        sel.appendChild(opt);sel.value=resolved;
      }
      _orig.apply(this,arguments);
    };
  }
  document.addEventListener('DOMContentLoaded',_patch);
})();

// ════════ PATCH openEditDoc to handle custom/existing types ════════
(function(){
  function _patch(){
    if(typeof openEditDoc !== 'function'){return setTimeout(_patch,200);}
    const _orig=openEditDoc;
    window.openEditDoc=function(id){
      _orig.apply(this,arguments);
      // After modal populated, check if type matches known options
      setTimeout(()=>{
        const sel=document.getElementById('edc-type');
        const wrap=document.getElementById('edc-custom-type-wrap');
        const inp=document.getElementById('edc-custom-type');
        if(!sel||!wrap)return;
        const known=['Contract','Agreement','Brief','Material','Lyric','Notes','Other','__custom__'];
        if(!known.includes(sel.value)){
          // Custom type — show input pre-filled
          const customVal=sel.value;
          const opt=document.createElement('option');
          opt.value='__custom__';opt.textContent='+ Custom type...';
          if(!sel.querySelector('option[value="__custom__"]'))sel.appendChild(opt);
          inp&&(inp.value=customVal);
          sel.value='__custom__';
          wrap.style.display='';
        } else {
          wrap.style.display='none';
        }
      },50);
    };
  }
  document.addEventListener('DOMContentLoaded',_patch);
})();