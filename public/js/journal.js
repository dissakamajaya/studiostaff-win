// ════════ SUPABASE DIRECT REST API ════════
// Connects directly to Supabase — no backend proxy needed.
// Config is fetched once from /api/config (same as notification-handler).
let _journalSupaUrl = null;
let _journalSupaKey = null;

async function _ensureSupaConfig() {
  if (_journalSupaUrl && _journalSupaKey) return true;
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return false;
    const cfg = await res.json();
    _journalSupaUrl = cfg.supabaseUrl;
    _journalSupaKey = cfg.supabaseAnonKey;
    return !!(_journalSupaUrl && _journalSupaKey);
  } catch (e) {
    console.error('[Journal] Config fetch failed:', e);
    return false;
  }
}

function _supaHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': _journalSupaKey,
    'Authorization': 'Bearer ' + _journalSupaKey,
    'Prefer': 'return=representation'
  };
}

async function insertToSupabase(table, data) {
  if (!(await _ensureSupaConfig())) return null;
  try {
    const res = await fetch(_journalSupaUrl + '/rest/v1/' + table, {
      method: 'POST',
      headers: _supaHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    return await res.json();
  } catch (e) {
    console.error('[Supabase] Insert ' + table + ':', e);
    return null;
  }
}

async function deleteFromSupabase(table, col, val) {
  if (!(await _ensureSupaConfig())) return false;
  try {
    const res = await fetch(_journalSupaUrl + '/rest/v1/' + table + '?' + col + '=eq.' + encodeURIComponent(val), {
      method: 'DELETE',
      headers: _supaHeaders()
    });
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    return true;
  } catch (e) {
    console.error('[Supabase] Delete ' + table + ':', e);
    return false;
  }
}

async function deleteReactionFromSupabase(journalId, userId, emoji) {
  if (!(await _ensureSupaConfig())) return false;
  try {
    const res = await fetch(
      _journalSupaUrl + '/rest/v1/journal_reactions?journal_id=eq.' + journalId +
      '&user_id=eq.' + encodeURIComponent(userId) +
      '&emoji=eq.' + encodeURIComponent(emoji), {
        method: 'DELETE',
        headers: _supaHeaders()
      }
    );
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    return true;
  } catch (e) {
    console.error('[Supabase] Delete reaction:', e);
    return false;
  }
}

async function loadRealtimeJournalData() {
  if (!(await _ensureSupaConfig())) return;
  try {
    const h = _supaHeaders();
    const [resC, resR] = await Promise.all([
      fetch(_journalSupaUrl + '/rest/v1/journal_comments?select=*&order=created_at.desc', { headers: h }),
      fetch(_journalSupaUrl + '/rest/v1/journal_reactions?select=*', { headers: h })
    ]);

    if (resC.ok && resR.ok) {
      const comments = await resC.json();
      const reactions = await resR.json();

      DB.journalComments = comments.map(c => ({
        id: c.id,
        journalId: c.journal_id,
        userId: c.user_id,
        text: c.text,
        createdAt: c.created_at
      }));

      DB.journalReactions = reactions.map(r => ({
        journalId: r.journal_id,
        userId: r.user_id,
        emoji: r.emoji,
        createdAt: r.created_at
      }));

      if (typeof _currentPage !== 'undefined' && _currentPage === 'journal') renderJournal();
    }
  } catch (e) {
    console.error('[Journal] Realtime load failed:', e);
  }
}

// ════════ JOURNAL: Reactions & Comments ════════
const JOURNAL_REACTIONS=['👍','😢','🔥','😂'];

async function toggleReaction(journalId, emoji) {
  if (!DB.journalReactions) DB.journalReactions = [];
  
  // Find existing reaction
  const existingIdx = DB.journalReactions.findIndex(r => 
    r.journalId === journalId && r.userId === currentUser && r.emoji === emoji
  );
  
  if (existingIdx >= 0) {
    // Remove locally for instant feedback
    DB.journalReactions.splice(existingIdx, 1);
    renderJournal();
    
    // Delete from Supabase using composite key (journal_id + user_id + emoji)
    await deleteReactionFromSupabase(journalId, currentUser, emoji);
  } else {
    // Add locally for instant feedback
    DB.journalReactions.push({
      journalId: journalId,
      userId: currentUser,
      emoji: emoji,
      createdAt: new Date().toISOString()
    });
    renderJournal();
    
    // Insert to Supabase
    await insertToSupabase('journal_reactions', {
      journal_id: journalId,
      user_id: currentUser,
      emoji: emoji
    });
  }
  
  // Sync from Supabase to get the source of truth
  setTimeout(() => loadRealtimeJournalData(), 500);
}

async function addJournalComment(journalId) {
  const j = DB.journals.find(x => x.id === journalId);
  if (!j) return;
  
  const inp = document.getElementById(`jc-input-${journalId}`);
  const text = inp?.value.trim();
  if (!text) return;
  
  if (!DB.journalComments) DB.journalComments = [];
  
  // Add locally for instant feedback
  DB.journalComments.push({
    id: Date.now(),
    journalId: journalId,
    userId: currentUser,
    text: text,
    createdAt: new Date().toISOString()
  });
  inp.value = '';
  renderJournal();

  // Insert to Supabase
  await insertToSupabase('journal_comments', {
    journal_id: journalId,
    user_id: currentUser,
    text: text
  });

  var journalPreview = (j.title || j.text || '').trim();
  journalPreview = journalPreview ? (journalPreview.length > 60 ? journalPreview.slice(0, 60) + '…' : journalPreview) : '(no text)';
  // Notify journal owner
  if (j.createdBy !== currentUser) {
    addNotification(j.createdBy, `${getUserName(currentUser)} commented on your journal: "${journalPreview}"`, 'journal', j.id);
  }
  // Notify mentioned users
  (j.mentions || []).forEach(uid => {
    if (uid !== currentUser && uid !== j.createdBy) {
      addNotification(uid, `${getUserName(currentUser)} commented on a journal you were mentioned in: "${journalPreview}"`, 'journal', j.id);
    }
  });

  saveDBFn();
  
  // Sync from Supabase to get real IDs
  setTimeout(() => loadRealtimeJournalData(), 500);
}

async function deleteJournalComment(journalId, commentId) {
  if (!DB.journalComments) DB.journalComments = [];
  
  // Remove locally for instant feedback
  DB.journalComments = DB.journalComments.filter(c => c.id !== commentId);
  renderJournal();
  
  // Delete from Supabase
  await deleteFromSupabase('journal_comments', 'id', commentId);
  
  // Sync from Supabase
  setTimeout(() => loadRealtimeJournalData(), 500);
}

function getJournalReactions(journalId){
  if(!DB.journalReactions)DB.journalReactions=[];
  return DB.journalReactions.filter(r=>r.journalId===journalId);
}

function getJournalComments(journalId){
  if(!DB.journalComments)DB.journalComments=[];
  return DB.journalComments.filter(c=>c.journalId===journalId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}

function renderReactions(j){
  const reactions=getJournalReactions(j.id);
  if(!reactions.length)return '';
  // Group reactions by emoji
  const grouped={};
  reactions.forEach(r=>{
    if(!grouped[r.emoji])grouped[r.emoji]=[];
    grouped[r.emoji].push(r.userId);
  });
  return JOURNAL_REACTIONS.map(e=>{
    const users=grouped[e]||[];
    const hasMe=users.includes(currentUser);
    if(users.length>0)return `<button onclick="event.stopPropagation();toggleReaction(${j.id},'${e}')" style="background:${hasMe?'var(--abg)':'var(--bg3)'};border:1px solid ${hasMe?'var(--accent)':'var(--border)'};border-radius:12px;padding:2px 8px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:4px">${e}<span style="font-size:10px;color:var(--text3)">${users.length}</span></button>`;
    return '';
  }).join('');
}

function renderComments(j){
  const comments=getJournalComments(j.id);
  if(!comments.length)return '';
  return `<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">${comments.map(c=>`
    <div style="display:flex;gap:8px;margin-bottom:6px;align-items:flex-start">
      <div class="av" style="background:${getUserColor(c.userId)}22;color:${getUserColor(c.userId)};width:20px;height:20px;font-size:8px;flex-shrink:0">${getUserName(c.userId)[0]}</div>
      <div style="flex:1;background:var(--bg3);border-radius:6px;padding:6px 8px">
        <div style="font-size:10px;font-weight:600;color:var(--text2)">${getUserName(c.userId)} <span style="font-weight:400;color:var(--text3)">${fmtDate(c.createdAt)}</span></div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">${c.text}</div>
      </div>
      ${c.userId===currentUser?`<button onclick="event.stopPropagation();deleteJournalComment(${j.id},${c.id})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;padding:2px">✕</button>`:''}
    </div>`).join('')}
  </div>`;
}
function switchJournalView(view){
  sessionStorage.setItem('journal-active-tab',view==='meetings'?'meetings':'journals');
  var jList=document.getElementById('journal-list');
  var mList=document.getElementById('journal-meetings');
  var btnJ=document.getElementById('jview-btn-journal');
  var btnM=document.getElementById('jview-btn-meetings');
  if(view==='meetings'){
    if(jList)jList.style.display='none';
    if(mList)mList.style.display='';
    if(btnM)btnM.classList.add('active');
    if(btnJ)btnJ.classList.remove('active');
  }else{
    if(jList)jList.style.display='';
    if(mList)mList.style.display='none';
    if(btnJ)btnJ.classList.add('active');
    if(btnM)btnM.classList.remove('active');
  }
}

let _journalDesktopFilter = '';

function setJournalFilter(label){
  _journalDesktopFilter = label === 'all' ? '' : label;
  document.querySelectorAll('.journal-pill').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-filter') === label);
  });
  renderJournal();
}

function renderJournal(){
 try{
  const filter=_journalDesktopFilter;
  const sortMode=document.getElementById('journal-sort')?.value||'newest';
  const groupMode=document.getElementById('journal-group')?.value||'none';
  const journalLabelColorsLocal=(typeof journalLabelColors!=='undefined'&&journalLabelColors)||{};
  if(!DB.journals)DB.journals=[];
  let allList=DB.journals.filter(j=>!filter||j.label===filter);

  allList=allList.sort((a,b)=>{
    const da=new Date(a.createdAt),db=new Date(b.createdAt);
    return sortMode==='oldest'?da-db:db-da;
  });
  document.getElementById('journal-sub').textContent=`${DB.journals.length} entries`;

  // Split: meetings vs non-meetings
  const meetings=allList.filter(j=>j.label==='Meeting');
  const journals=allList.filter(j=>j.label!=='Meeting');

  function renderCard(j){
    const lc=journalLabelColorsLocal[j.label]||'var(--text3)';
    let linkedName='';
    if(j.linkedType==='project'&&j.linkedId){const p=DB.projects.find(x=>x.id===j.linkedId);linkedName=p?`📁 ${p.name}`:'';}
    else if(j.linkedType==='rental'&&j.linkedId){const r=DB.rentals.find(x=>x.id===j.linkedId);linkedName=r?`📅 ${r.equipment}`:'';}
    else if(j.linkedType==='domestic'&&j.linkedId){const d=DB.domestics.find(x=>x.id===j.linkedId);linkedName=d?`🏠 ${d.name}`:'';}
    else if(j.linkedType==='class'&&j.linkedId){const c=DB.classes.find(x=>x.id===j.linkedId);linkedName=c?`🎓 ${c.name}`:'';}
    const commentCount=getJournalComments(j.id).length;
    const mentions=(j.mentions||[]).map(uid=>`<span style="background:${getUserColor(uid)}22;color:${getUserColor(uid)};border-radius:10px;padding:1px 7px;font-size:9px">@${getUserName(uid)}</span>`).join('');
    return `<div class="panel" style="margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
        <div style="flex:1;cursor:pointer" onclick="viewJournal(${j.id})">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
            <span style="background:${lc}22;color:${lc};border:1px solid ${lc}33;border-radius:4px;padding:2px 8px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">${j.label}</span>
            ${linkedName?`<span style="font-size:10px;color:var(--text3)">${linkedName}</span>`:''}
            ${mentions}
          </div>
          ${j.image?`<div style="margin-top:8px"><img src="${j.image}" style="max-width:600px;width:100%;border-radius:8px;display:block" loading="lazy"/></div>`:''}
          <div style="font-size:11px;color:var(--text2);line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;cursor:pointer;margin-top:${j.image?'8':'6'}px" onclick="viewJournal(${j.id})">${j.description||''}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;margin-left:8px">
          <button class="btn-o btn-xs" onclick="openEditJournal(${j.id})">✎</button>
          <button class="btn-danger btn-xs" onclick="deleteJournal(${j.id})">✕</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
        <div style="font-size:9px;color:var(--text3)">${fmtDate(j.createdAt)} · by ${getUserName(j.createdBy)}</div>
        <div style="font-size:10px;color:var(--text3)">${commentCount?`💬 ${commentCount} comment${commentCount>1?'s':''}`:''}</div>
      </div>
      <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;align-items:center">
        ${renderReactions(j)}
        ${JOURNAL_REACTIONS.filter(e=>{const rs=getJournalReactions(j.id);return !rs.some(r=>r.emoji===e);}).map(e=>`<button onclick="toggleReaction(${j.id},'${e}')" style="background:none;border:1px solid var(--border);border-radius:12px;padding:2px 8px;font-size:11px;cursor:pointer;opacity:.4">${e}</button>`).join('')}
      </div>
      ${renderComments(j)}
      <div style="display:flex;gap:6px;margin-top:8px" onclick="event.stopPropagation()">
        <div class="av" style="background:${getUserColor(currentUser)}22;color:${getUserColor(currentUser)};width:22px;height:22px;font-size:9px;flex-shrink:0">${getUserName(currentUser)[0]}</div>
        <input id="jc-input-${j.id}" class="fi" placeholder="Add a comment..." style="flex:1;padding:4px 8px;font-size:11px" onkeydown="if(event.key==='Enter')addJournalComment(${j.id})"/>
        <button class="btn btn-xs" onclick="addJournalComment(${j.id})">Send</button>
      </div>
    </div>`;
  }

  function renderGroup(list){
    if(!list.length)return'<div class="empty">No entries yet.</div>';
    if(groupMode==='none')return list.map(renderCard).join('');
    const groups={};list.forEach(j=>{const k=j.label||'Other';if(!groups[k])groups[k]=[];groups[k].push(j)});
    return Object.keys(groups).sort().map(k=>`<div style="margin-bottom:20px"><div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:8px 0;border-bottom:1px solid var(--border)">${k}</div>${groups[k].map(renderCard).join('')}</div>`).join('');
  }

  const jList=document.getElementById('journal-list');
  const mList=document.getElementById('journal-meetings');
  if(jList)jList.innerHTML=renderGroup(journals);
  if(mList)mList.innerHTML=renderGroup(meetings);

  var btnJ=document.getElementById('jview-btn-journal');
  var btnM=document.getElementById('jview-btn-meetings');
  var activeTab=sessionStorage.getItem('journal-active-tab')||'journals';
  if(activeTab==='journals'){
    if(jList)jList.style.display='';
    if(mList)mList.style.display='none';
    if(btnJ)btnJ.classList.add('active');
    if(btnM)btnM.classList.remove('active');
  }else{
    if(jList)jList.style.display='none';
    if(mList)mList.style.display='';
    if(btnM)btnM.classList.add('active');
    if(btnJ)btnJ.classList.remove('active');
  }
  
  // Load realtime comments and reactions from Supabase on first render
  // This ensures we have the latest data from all users
  if (!window._journalRealtimeLoaded) {
    window._journalRealtimeLoaded = true;
    loadRealtimeJournalData();
  }
 }catch(e){console.error('[Journal] renderJournal failed:',e);}
}

let _jnPendingImage = null;

function jnHandleFileInput(input){
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024){ showToast('Image exceeds 5MB limit.', 'error'); input.value=''; return; }
  const reader = new FileReader();
  reader.onload = function(e){
    _jnPendingImage = e.target.result;
    var wrap = document.getElementById('jn-image-preview-wrap');
    var img = document.getElementById('jn-image-preview');
    if (wrap) wrap.style.display = 'block';
    if (img) img.src = _jnPendingImage;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function jnRemoveImage(){
  _jnPendingImage = null;
  var wrap = document.getElementById('jn-image-preview-wrap');
  var img = document.getElementById('jn-image-preview');
  if (wrap) wrap.style.display = 'none';
  if (img) img.src = '';
}

function saveJournal(){
  const desc = document.getElementById('jn-desc').value.trim();
  const label = document.getElementById('jn-label').value;
  const linkedType = document.getElementById('jn-linked-type').value;
  const linkedId = document.getElementById('jn-linked-id').value?parseInt(document.getElementById('jn-linked-id').value):null;
  const mentions = [...document.querySelectorAll('#jn-mention-pick .assign-opt.sel')].map(el=>el.dataset.uid).filter(Boolean);
  if (!desc && !_jnPendingImage){ showToast('Add a note or image to post.'); return; }
  const id = DB.nextId.jn++;
  DB.journals.push({ id, title: '', description: desc, image: _jnPendingImage || null, label, linkedType, linkedId, mentions, createdBy: currentUser, createdAt: new Date().toISOString() });
  if (mentions.length) mentions.forEach(uid => addNotification(uid, `${getUserName(currentUser)} mentioned you in a journal post`, 'journal', id));
  _jnPendingImage = null;
  var wrap = document.getElementById('jn-image-preview-wrap');
  var img = document.getElementById('jn-image-preview');
  if (wrap) wrap.style.display = 'none';
  if (img) img.src = '';
  closeModal('modal-journal');
  triggerSaveWithFeedback('Saving journal…');
  renderPage(_currentPage);
}
function openEditJournal(id){
  const j=DB.journals.find(x=>x.id===id);if(!j)return;
  const m=document.getElementById('modal-edit-journal');
  if(m)m.classList.add('open');
  document.getElementById('main-area').style.position='relative';
  setTimeout(()=>{
    document.getElementById('ejn-id').value=id;
    document.getElementById('ejn-title').value=j.title;
    setRTEValue('ejn-desc',j.description||'');
    document.getElementById('ejn-label').value=j.label||'Studio';
    _jnPendingImage = j.image || null;
    var iw = document.getElementById('ejn-image-preview-wrap');
    var ip = document.getElementById('ejn-image-preview');
    if (iw && _jnPendingImage){ iw.style.display = 'block'; if(ip) ip.src = _jnPendingImage; }
    else if (iw){ iw.style.display = 'none'; if(ip) ip.src = ''; }
  },10);
}
function viewJournal(id){
  const j=DB.journals.find(x=>x.id===id);if(!j)return;

  const lc=((typeof journalLabelColors!=='undefined'&&journalLabelColors)||{})[j.label]||'var(--text3)';
  let linkedName='';
  if(j.linkedType==='project'&&j.linkedId){const p=DB.projects.find(x=>x.id===j.linkedId);linkedName=p?`📁 ${p.name}`:'';}
  else if(j.linkedType==='rental'&&j.linkedId){const r=DB.rentals.find(x=>x.id===j.linkedId);linkedName=r?`📅 ${r.equipment}`:'';}
  else if(j.linkedType==='domestic'&&j.linkedId){const d=DB.domestics.find(x=>x.id===j.linkedId);linkedName=d?`🏠 ${d.name}`:'';}
  else if(j.linkedType==='class'&&j.linkedId){const c=DB.classes.find(x=>x.id===j.linkedId);linkedName=c?`🎓 ${c.name}`:'';}
  document.getElementById('detail-title').textContent=j.label;
  document.getElementById('detail-body').innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="background:${lc}22;color:${lc};border:1px solid ${lc}33;border-radius:4px;padding:3px 10px;font-size:10px;font-weight:600;text-transform:uppercase">${j.label}</span>
      ${linkedName?`<span style="font-size:11px;color:var(--text3)">${linkedName}</span>`:''}
    </div>
    ${j.image?`<div style="margin-bottom:12px"><img src="${j.image}" style="max-width:600px;width:100%;border-radius:8px;display:block" loading="lazy"/></div>`:''}
    <div style="font-size:11px;color:var(--text2);line-height:1.8;white-space:pre-wrap;background:var(--bg3);border-radius:6px;padding:14px;min-height:80px;max-height:55vh;overflow-y:auto">${j.description||'<span style="color:var(--text3);font-style:italic">No description</span>'}</div>
    <div style="font-size:10px;color:var(--text3);margin-top:10px">📅 ${fmtDate(j.createdAt)} · ✍ ${getUserName(j.createdBy)}</div>
    <div style="display:flex;gap:4px;margin-top:10px;flex-wrap:wrap;align-items:center">
      ${renderReactions(j)}
      ${JOURNAL_REACTIONS.filter(e=>{const rs=getJournalReactions(j.id);return !rs.some(r=>r.emoji===e);}).map(e=>`<button onclick="toggleReaction(${j.id},'${e}')" style="background:none;border:1px solid var(--border);border-radius:12px;padding:2px 8px;font-size:11px;cursor:pointer;opacity:.4">${e}</button>`).join('')}
    </div>
    ${renderComments(j)}
    <div style="display:flex;gap:6px;margin-top:12px" onclick="event.stopPropagation()">
      <div class="av" style="background:${getUserColor(currentUser)}22;color:${getUserColor(currentUser)};width:22px;height:22px;font-size:9px;flex-shrink:0">${getUserName(currentUser)[0]}</div>
      <input id="jc-input-${j.id}" class="fi" placeholder="Add a comment..." style="flex:1;padding:4px 8px;font-size:11px" onkeydown="if(event.key==='Enter')addJournalComment(${j.id})"/>
      <button class="btn btn-xs" onclick="addJournalComment(${j.id})">Send</button>
    </div>`;
  document.getElementById('detail-actions').innerHTML=`
    <button class="btn-o" onclick="closeModal('modal-detail')">Close</button>
    <button class="btn-o" style="border-color:var(--amber);color:var(--amber)" onclick="closeModal('modal-detail');openEditJournal(${j.id})">✎ Edit</button>
    <button class="btn-danger" onclick="deleteJournal(${j.id});closeModal('modal-detail')">✕ Delete</button>`;
  openModal('modal-detail');
}
function updateJournal(){
  const id=parseInt(document.getElementById('ejn-id').value);
  const j=DB.journals.find(x=>x.id===id);if(!j)return;
  j.title=document.getElementById('ejn-title').value.trim()||j.title;
  j.description=document.getElementById('ejn-desc').value;
  j.label=document.getElementById('ejn-label').value;
  j.image = _jnPendingImage !== undefined ? (_jnPendingImage || null) : j.image;
  _jnPendingImage = null;
  closeModal('modal-edit-journal');triggerSaveWithFeedback('Updating journal…');renderPage(_currentPage);
}
function deleteJournal(id){
  if(!confirm('Delete this journal entry?'))return;
  DB.journals=DB.journals.filter(x=>x.id!==id);
  saveDBFn();renderPage(_currentPage);
}
// Populate journal linked dropdown based on type selection
function onJournalTypeChange(){
  const type=document.getElementById('jn-linked-type').value;
  const sel=document.getElementById('jn-linked-id');
  sel.innerHTML='<option value="">— None —</option>';
  if(type==='project')sel.innerHTML+= DB.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  else if(type==='rental')sel.innerHTML+=DB.rentals.map(r=>`<option value="${r.id}">${r.equipment}</option>`).join('');
  else if(type==='domestic')sel.innerHTML+=DB.domestics.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  else if(type==='class')sel.innerHTML+=DB.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
}

// ════════ INVENTORY ITEMS ════════
function saveInventoryItem(){
  const name=document.getElementById('invi-name').value.trim();
  if(!name){alert('Name required');return}
  DB.inventoryItems.push({id:DB.nextId.inv++,name,category:document.getElementById('invi-cat').value,qty:parseInt(document.getElementById('invi-qty').value)||1,condition:document.getElementById('invi-cond').value,notes:document.getElementById('invi-notes').value,createdAt:new Date().toISOString()});
  closeModal('modal-inventory-new');triggerSaveWithFeedback('Saving inventory item…');renderInventory();
}
function renderInventory(){
  // Render rental-based equipment summary + custom inventory items
  const eqs={};DB.rentals.forEach(r=>{if(!eqs[r.equipment])eqs[r.equipment]={name:r.equipment,count:0,active:0,revenue:0};eqs[r.equipment].count++;if(r.status==='Active')eqs[r.equipment].active++;eqs[r.equipment].revenue+=r.total});
  const rentalList=Object.values(eqs);
  const invItems=DB.inventoryItems||[];
  document.getElementById('inventory-body').innerHTML=`
    ${rentalList.length?`<div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:8px 14px;border-bottom:1px solid var(--border)">From Rentals</div>${rentalList.map(e=>`<div class="lr" style="padding:10px 14px"><div><div style="font-size:11px;font-weight:500">${e.name}</div><div class="td-s">${e.count} bookings · ${e.active} active</div></div><div style="text-align:right;color:var(--green);font-size:11px">${rp(e.revenue)}</div></div>`).join('')}`:''}
    <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:8px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">Equipment Registry<button class="btn-xs btn" onclick="openModal('modal-inventory-new')">+ Add</button></div>
    ${invItems.length?invItems.map(i=>`<div class="lr" style="padding:10px 14px"><div><div style="font-size:11px;font-weight:500">${i.name}</div><div class="td-s">${i.category} · Condition: ${i.condition}</div></div><div style="text-align:right"><div style="font-size:11px;color:var(--blue)">Qty: ${i.qty}</div><button class="btn-danger btn-xs" style="margin-top:4px" onclick="DB.inventoryItems=DB.inventoryItems.filter(x=>x.id!==${i.id});saveDBFn();renderInventory()">✕</button></div></div>`).join(''):'<div class="empty" style="padding:16px">No inventory items added yet.</div>'}
  `;
}

// ════════ CLOSE NOTIF PANEL ON OUTSIDE CLICK ════════
document.addEventListener('click',e=>{
  const panel=document.getElementById('notif-panel');
  if(panel&&panel.classList.contains('open')&&!e.target.closest('.notif-panel')&&!e.target.closest('.notif-btn')){panel.classList.remove('open')}
});