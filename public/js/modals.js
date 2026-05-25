function toggleModalFullscreen(id){
  const bg=document.getElementById(id);
  if(bg)bg.classList.toggle('fullscreen');
  const isFs=bg&&bg.classList.contains('fullscreen');
  // expand/collapse textareas in the modal
  const rows=isFs?16:8;
  if(bg)bg.querySelectorAll('textarea[data-expandable]').forEach(ta=>ta.rows=rows);
}
function openModal(id){
  const m=document.getElementById(id);if(!m)return;
  m.classList.add('open');
  if(['modal-project','modal-rental','modal-quote'].includes(id))populateClientDropdowns();
  if(id==='modal-rental')openModal_rental();
  if(id==='modal-quote'){_resetQuoteModalUI();addQtItemInit();calcQtTotal()}
  if(id==='modal-crew'){['cr-name','cr-phone'].forEach(function(eid){var el=document.getElementById(eid);if(el)el.value='';});document.getElementById('cr-role').value='Crew';}
  if(id==='modal-product'){setTimeout(buildSKU,10);}
  if(id==='modal-transaction'){
    // populate client + project dropdowns
    setTimeout(()=>{
      const tc=document.getElementById('tx-client');
      if(tc){tc.innerHTML='<option value="">— None —</option>'+DB.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');initSS('tx-client-wrap','tx-client');}
      const tcSearch=document.getElementById('tx-client-search');if(tcSearch)tcSearch.value='';
      const tp=document.getElementById('tx-project');
      if(tp)tp.innerHTML='<option value="">— None —</option>'+DB.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
      // default date picker to "today"
      const todayBtn=document.querySelector('#tx-date-pick [data-val="today"]');
      if(todayBtn){document.querySelectorAll('#tx-date-pick .assign-opt').forEach(b=>b.classList.remove('sel'));todayBtn.classList.add('sel');}
      const inp=document.getElementById('tx-date');if(inp){inp.value=new Date().toISOString().slice(0,10);inp.style.display='none';}
    },10);
  }
  if(id==='modal-purchase'||id==='modal-sale'){
    const pSel=document.getElementById(id==='modal-purchase'?'pu-product':'sl-product');
    if(pSel)pSel.innerHTML='<option value="">— Select product —</option>'+(DB.products||[]).map(p=>`<option value="${p.id}">${p.unicode?p.unicode+' ':''}${p.name} (${p.sku})</option>`).join('');
    if(id==='modal-sale'){
      const cSel=document.getElementById('sl-client');
      if(cSel)cSel.innerHTML='<option value="">— Walk-in —</option>'+DB.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
      const dateEl=document.getElementById('sl-date');if(dateEl)dateEl.value=new Date().toISOString().slice(0,10);
    }
  }
  if(id==='modal-student'){
    document.getElementById('st-class').innerHTML='<option value="">— Select class —</option>'+DB.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('st-date').value=new Date().toISOString().slice(0,10);
  }
  if(id==='modal-task')populateTaskModal();
  if(id==='modal-edit-task'){}
  if(id==='modal-domestic')populateDomesticModal();
  if(id==='modal-project'){
    const pjNoDeadline=document.getElementById('pj-no-deadline');
    if(pjNoDeadline)pjNoDeadline.checked=false;
    setProjectNoDeadline('pj');
  }
  if(id==='modal-client'){
    // populate type dropdown from distinct types in DB
    const sel=document.getElementById('cl-type');
    if(sel){
      const existing=[...new Set(DB.clients.map(c=>c.type).filter(Boolean))].sort();
      const defaults=['Producer','Brand','Agency','Record Label','Individual','Production House','Session Player'];
      const merged=[...new Set([...defaults,...existing])].sort();
      sel.innerHTML=merged.map(t=>`<option value="${t}">${t}</option>`).join('');
    }
  }
  if(id==='modal-doc'){
    // populate project and client dropdowns
    const dp=document.getElementById('doc-project');
    if(dp)dp.innerHTML='<option value="">— None —</option>'+DB.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    const dc=document.getElementById('doc-client-link');
    if(dc)dc.innerHTML='<option value="">— None —</option>'+DB.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    const dm=document.getElementById('doc-mention-pick');
    if(dm)dm.innerHTML=USERS.map(u=>`<div class="assign-opt" data-uid="${u.id}" onclick="this.classList.toggle('sel')"><div class="av" style="background:${u.color}22;color:${u.color};width:20px;height:20px;font-size:8px">${u.name[0]}</div><span style="font-size:10px">${u.name}</span></div>`).join('');
  }
  if(id==='modal-event'){_evAllDay=false;const editId=document.getElementById('ev-edit-id');if(editId)editId.value='';document.querySelector('#modal-event .mt').textContent='Add Event';setTimeout(()=>{const n=document.getElementById('ev-allday-no');const y=document.getElementById('ev-allday-yes');if(n)n.classList.add('sel');if(y)y.classList.remove('sel');const tw=document.getElementById('ev-time-wrap');if(tw)tw.style.display='';const cdw=document.getElementById('ev-custom-dur-wrap');if(cdw)cdw.style.display='none';const ds=document.getElementById('ev-dur');if(ds)ds.onchange=()=>{if(cdw)cdw.style.display=ds.value==='custom'?'':'none';};},10);}
  if(id==='modal-class'){populateClassModal();}
  if(id==='modal-edit-class'){populateClassModal();}
  if(id==='modal-transaction'||id==='modal-reimburse'||id==='modal-leave'){
    if(id==='modal-reimburse'){
      // default rb-date to today via quick-pick
      setTimeout(()=>{
        const todayBtn=document.querySelector('#rb-date-pick [data-val="today"]');
        if(todayBtn){document.querySelectorAll('#rb-date-pick .assign-opt').forEach(b=>b.classList.remove('sel'));todayBtn.classList.add('sel');}
        const inp=document.getElementById('rb-date');if(inp){inp.value=new Date().toISOString().slice(0,10);inp.style.display='none';}
      },10);
    }
    if(id==='modal-leave'){
      // default lv-start to today via quick-pick
      setTimeout(()=>{
        const todayBtn=document.querySelector('#lv-date-pick [data-val="today"]');
        if(todayBtn){document.querySelectorAll('#lv-date-pick .assign-opt').forEach(b=>b.classList.remove('sel'));todayBtn.classList.add('sel');}
        const inp=document.getElementById('lv-start');if(inp){inp.value=new Date().toISOString().slice(0,10);inp.style.display='none';}
        // reset duration to 1 day
        if(typeof leaveDurVal!=='undefined')leaveDurVal='1';
        document.querySelectorAll('#lv-dur-pick .assign-opt').forEach((b,i)=>b.classList.toggle('sel',i===0));
        const ew=document.getElementById('lv-end-wrap');if(ew)ew.style.display='none';
      },10);
    }
  }
  if(id==='modal-journal'){
    // reset journal modal
    ['jn-desc'].forEach(eid=>{const el=document.getElementById(eid);if(el)el.value='';});
    const lt=document.getElementById('jn-linked-type');if(lt)lt.value='';
    const li=document.getElementById('jn-linked-id');if(li)li.innerHTML='<option value="">— None —</option>';
    const jl=document.getElementById('jn-label');if(jl)jl.value='Studio';
    clearRTE('jn-desc');
    _jnPendingImage = null;
    var iw = document.getElementById('jn-image-preview-wrap');
    var ip = document.getElementById('jn-image-preview');
    if (iw) iw.style.display = 'none';
    if (ip) ip.src = '';
    // populate mention picker
    const mp=document.getElementById('jn-mention-pick');
    if(mp)mp.innerHTML=USERS.filter(u=>u.id!==currentUser).map(u=>`<div class="assign-opt" data-uid="${u.id}" onclick="this.classList.toggle('sel')"><div class="av" style="background:${u.color}22;color:${u.color};width:20px;height:20px;font-size:8px">${u.name[0]}</div><span style="font-size:10px">${u.name}</span></div>`).join('');
  }
  document.getElementById('main-area').style.position='relative';
}
function closeModal(id){document.getElementById(id).classList.remove('open')}

function initSS(wrapId,selectId){
  const wrap=document.getElementById(wrapId);
  const sel=document.getElementById(selectId);
  const inputId=wrapId.replace('-wrap','-search');
  const ddId=wrapId.replace('-wrap','-dd');
  const input=document.getElementById(inputId);
  const dd=document.getElementById(ddId);
  if(!wrap||!sel||!input||!dd)return;
  function build(q){
    const opts=Array.from(sel.options);
    const filtered=q?opts.filter(o=>o.text.toLowerCase().includes(q.toLowerCase())):opts;
    dd.innerHTML=filtered.map(o=>`<div class="ss-opt${sel.value==o.value&&o.value?' active':''}" data-val="${o.value}">${o.value?o.text:`<span style="color:var(--text3)">${o.text}</span>`}</div>`).join('');
    dd.classList.toggle('open',filtered.length>0);
    dd.querySelectorAll('.ss-opt').forEach(div=>{
      div.onmousedown=e=>{
        e.preventDefault();
        sel.value=div.dataset.val;
        input.value=div.dataset.val?(Array.from(sel.options).find(o=>o.value==div.dataset.val)||{}).text||'':'';
        dd.classList.remove('open');
      };
    });
  }
  const cur=Array.from(sel.options).find(o=>o.value==sel.value);
  input.value=cur&&cur.value?cur.text:'';
  input.oninput=()=>build(input.value);
  input.onfocus=()=>build(input.value);
  input.onblur=()=>setTimeout(()=>dd.classList.remove('open'),150);
}

function populateClientDropdowns(){
  // Project modal client dropdown (legacy select)
  ['pj-client'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    el.innerHTML=DB.clients.length?`<option value="">— No client —</option>`+DB.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join(''):'<option value="">No clients yet</option>';
  });
  initSS('pj-client-wrap','pj-client');
  // Quote modal: populate hidden select for saveQuote() compatibility, reset search bar
  const qtSel=document.getElementById('qt-client');
  if(qtSel){
    qtSel.innerHTML='<option value="">— select —</option>'+DB.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  }
  const qtSearch=document.getElementById('qt-client-search');
  if(qtSearch){qtSearch.value='';qtSearch.placeholder='Search client…';}
  populateProjectDropdowns();
  filterProjectsByClient();
}

// ── Quote modal: searchable client input ──────────────────────────────────
function qtClientSearch(){
  const inp=document.getElementById('qt-client-search');
  const dd=document.getElementById('qt-client-dd');
  const qtSel=document.getElementById('qt-client');
  const cat=document.getElementById('qt-category')?.value||'Studio';
  const q=(inp.value||'').toLowerCase();
  // Filter by category label
  let pool=DB.clients;
  if(cat==='Rental')  pool=DB.clients.filter(c=>(c.label||'Studio')==='Booking'||c.type==='rental'||c.isRental);
  if(cat==='Academy') pool=DB.clients.filter(c=>(c.label||'Studio')==='Academy'||c.type==='student'||c.isStudent);
  const filtered=q?pool.filter(c=>c.name.toLowerCase().includes(q)||(c.phone||'').toLowerCase().includes(q)):pool;
  if(!filtered.length){
    dd.innerHTML='<div style="padding:8px 10px;font-size:11px;color:var(--text3)">No clients found</div>';
    dd.style.display='block';return;
  }
  dd.innerHTML=filtered.map(c=>`<div style="padding:6px 10px;cursor:pointer;font-size:11px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center" onmousedown="event.preventDefault();qtSelectClient(${c.id},'${c.name.replace(/'/g,"\\'")}')"><div><div style="font-weight:500">${c.name}</div><div style="color:var(--text3);font-size:9px">${c.city||c.phone||c.label||'—'}</div></div><span style="font-size:9px;color:var(--accent);opacity:.6">${c.label||'Studio'}</span></div>`).join('');
  dd.style.display='block';
}
function qtSelectClient(id,name){
  const sel=document.getElementById('qt-client');
  const inp=document.getElementById('qt-client-search');
  const dd=document.getElementById('qt-client-dd');
  if(sel){
    // ensure option exists
    if(!Array.from(sel.options).find(o=>o.value==id)){
      const opt=document.createElement('option');opt.value=id;opt.text=name;sel.appendChild(opt);
    }
    sel.value=id;
  }
  if(inp)inp.value=name;
  if(dd)dd.style.display='none';
  // Update second dropdown to filter projects by client
  const cat=document.getElementById('qt-category')?.value||'Studio';
  if(cat==='Studio')filterProjectsByClient();
}

// ── Quote modal: student search ────────────────────────────────────────────
function qtStudentSearch(){
  const inp=document.getElementById('qt-student-search');
  const dd=document.getElementById('qt-student-dd');
  const q=(inp.value||'').toLowerCase();
  const pool=DB.students||[];
  const filtered=q?pool.filter(s=>(s.name||'').toLowerCase().includes(q)||(s.phone||'').toLowerCase().includes(q)):pool;
  if(!filtered.length){
    dd.innerHTML='<div style="padding:8px 10px;font-size:11px;color:var(--text3)">No students found</div>';
    dd.style.display='block';return;
  }
  dd.innerHTML=filtered.map(s=>`<div style="padding:6px 10px;cursor:pointer;font-size:11px;border-bottom:1px solid var(--border)" onmousedown="event.preventDefault();qtSelectStudent(${s.id},'${(s.name||'').replace(/'/g,"\\'")}')"><div style="font-weight:500">${s.name||'—'}</div><div style="color:var(--text3);font-size:9px">${s.phone||s.classId?('Class: '+(DB.classes.find(c=>c.id===s.classId)||{name:'?'}).name):'—'}</div></div>`).join('');
  dd.style.display='block';
}
function qtSelectStudent(id,name){
  const hidEl=document.getElementById('qt-student-id');
  const inp=document.getElementById('qt-student-search');
  const dd=document.getElementById('qt-student-dd');
  if(hidEl)hidEl.value=id;
  if(inp)inp.value=name;
  if(dd)dd.style.display='none';
}
function populateClassModal(){
  const instructors=typeof ACADEMY_INSTRUCTORS!=='undefined'?ACADEMY_INSTRUCTORS:USERS;
  const opts=instructors.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  ['ac-instructor','eac-instructor'].forEach(id=>{const el=document.getElementById(id);if(el){el.innerHTML=opts;}});
  const batch=document.getElementById('ac-batch-no');if(batch&&(!batch.value||batch.value==='0'))batch.value='1';
  const code=document.getElementById('ac-code');if(code&&!code.value)code.value='';
}
function populateProjectDropdowns(){
  const sel=document.getElementById('tk-project');
  if(sel)sel.innerHTML='<option value="">— No Project —</option>'+DB.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
}
function filterProjectsByClient(){
  const cid=document.getElementById('qt-client')?.value;
  const sel=document.getElementById('qt-project');if(!sel)return;
  const projs=cid?DB.projects.filter(p=>p.clientId==cid):DB.projects;
  sel.innerHTML='<option value="">— None —</option>'+projs.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
}
function _resetQuoteModalUI(){
  const inp=document.getElementById('qt-client-search');if(inp){inp.value='';inp.placeholder='Search client...';}
  const sel=document.getElementById('qt-client');if(sel)sel.value='';
  const dd=document.getElementById('qt-client-dd');if(dd)dd.style.display='none';
  const sw=document.getElementById('qt-student-wrap');if(sw)sw.style.display='none';
  const ss=document.getElementById('qt-student-search');if(ss)ss.value='';
  const si=document.getElementById('qt-student-id');if(si)si.value='';
  const lbl=document.getElementById('qt-project-label');if(lbl)lbl.textContent='Project (optional)';
  const clbl=document.getElementById('qt-client-label');if(clbl)clbl.textContent='Client';
  const cat=document.getElementById('qt-category');if(cat)cat.value='Studio';
  filterProjectsByClient();
}

// ── New Quote modal: rewire client + second dropdown on category change ──
function onQtCategoryChange(){
  const cat=document.getElementById('qt-category')?.value||'Studio';

  // Update client search label & placeholder
  const lbl=document.getElementById('qt-client-label');
  const inp=document.getElementById('qt-client-search');
  if(lbl)lbl.textContent=cat==='Rental'?'Client (Rental)':cat==='Academy'?'Client (Academy)':'Client';
  if(inp){
    inp.placeholder=cat==='Rental'?'Search booking client…':cat==='Academy'?'Search academy client…':'Search client…';
    // Clear selection when switching category
    inp.value='';
    const sel=document.getElementById('qt-client');if(sel)sel.value='';
  }
  const dd=document.getElementById('qt-client-dd');if(dd)dd.style.display='none';

  // Show/hide student picker
  const studentWrap=document.getElementById('qt-student-wrap');
  if(studentWrap)studentWrap.style.display=cat==='Academy'?'':'none';
  if(cat!=='Academy'){
    const si=document.getElementById('qt-student-id');if(si)si.value='';
    const ss=document.getElementById('qt-student-search');if(ss)ss.value='';
  }

  // Second dropdown: Project / Booking (from DB.rentals) / Class
  const secondSel=document.getElementById('qt-project');
  const secondLbl=document.getElementById('qt-project-label');
  if(!secondSel)return;
  if(cat==='Rental'){
    if(secondLbl)secondLbl.textContent='Booking (optional)';
    const activeBookings=(DB.rentals||[]).filter(r=>r.status!=='Returned'&&r.status!=='Cancelled');
    secondSel.innerHTML='<option value="">— None —</option>'+
      activeBookings.map(r=>{
        const c=DB.clients.find(cl=>cl.id===r.clientId);
        const bkNum='BK-'+String(r.id).padStart(4,'0');
        return `<option value="${r.id}">${bkNum}${c?' — '+c.name:''} (${r.status})</option>`;
      }).join('');
  } else if(cat==='Academy'){
    if(secondLbl)secondLbl.textContent='Class (optional)';
    secondSel.innerHTML='<option value="">— None —</option>'+
      (DB.classes||[]).map(cl=>`<option value="${cl.id}">${cl.name}</option>`).join('');
  } else {
    if(secondLbl)secondLbl.textContent='Project (optional)';
    filterProjectsByClient();
  }
}

function populateTaskModal(){
  populateProjectDropdowns();
  const wrap=document.getElementById('tk-assign');
  wrap.innerHTML=USERS.map(u=>`<div class="assign-opt ${u.id===currentUser?'sel':''}" data-uid="${u.id}" onclick="toggleAssign(this,'${u.id}')"><div class="av" style="background:${u.color}22;color:${u.color};width:20px;height:20px;font-size:8px">${u.name[0]}</div><span style="font-size:10px">${u.name}</span></div>`).join('');
  // reset prio/due pickers
  document.querySelectorAll('#tk-prio-pick .assign-opt').forEach(e=>e.classList.toggle('sel',e.dataset.val==='normal'));
  document.querySelectorAll('#tk-due-pick .assign-opt').forEach(e=>e.classList.remove('sel'));
  document.getElementById('tk-due').style.display='none';
  document.getElementById('tk-due').value='';
  taskPriority='normal';taskDueMode=null;
}
let taskAssignees=[];
let taskPriority='normal';
let taskDueMode=null;
function toggleAssign(el,uid){
  el.classList.toggle('sel');
  taskAssignees=[...document.querySelectorAll('#tk-assign .assign-opt.sel')].map(e=>e.dataset.uid);
}
function pickPrio(el,val){
  document.querySelectorAll('#tk-prio-pick .assign-opt').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');taskPriority=val;
}
function pickDue(el,val){
  document.querySelectorAll('#tk-due-pick .assign-opt').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');taskDueMode=val;
  const input=document.getElementById('tk-due');
  if(val==='today'){const d=new Date();input.value=d.toISOString().slice(0,10);input.style.display='none'}
  else if(val==='tomorrow'){const d=new Date();d.setDate(d.getDate()+1);input.value=d.toISOString().slice(0,10);input.style.display='none'}
  else{input.style.display='block';input.value='';input.focus()}
}

function setProjectNoDeadline(prefix){
  const dateInput=document.getElementById(`${prefix}-deadline`);
  const noDeadlineInput=document.getElementById(`${prefix}-no-deadline`);
  if(!dateInput||!noDeadlineInput)return;
  if(noDeadlineInput.checked){
    dateInput.value='';
    dateInput.disabled=true;
  }else{
    dateInput.disabled=false;
  }
}

// ── Edit Project ──
function editProject(id){
  const p=DB.projects.find(pr=>pr.id===id);if(!p)return;
  closeModal('modal-detail');
  document.getElementById('ep-id').value=id;
  document.getElementById('ep-name').value=p.name;
  document.getElementById('ep-type').value=p.type;
  document.getElementById('ep-deadline').value=p.deadline||'';
  const epNoDeadline=document.getElementById('ep-no-deadline');
  if(epNoDeadline){
    epNoDeadline.checked=!p.deadline;
    setProjectNoDeadline('ep');
  }
  // progress is auto from tasks, show read-only
  const prog=calcProjectProgress(id);
  const epProg=document.getElementById('ep-progress');
  if(epProg){epProg.value=prog;epProg.readOnly=true;epProg.style.opacity='.5';epProg.title='Auto-calculated from tasks';}
  document.getElementById('ep-status').value=p.status;
  setRTEValue('ep-desc',p.desc||'');
  // populate client dropdown
  const sel=document.getElementById('ep-client');
  sel.innerHTML=DB.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  sel.value=p.clientId;
  openModal('modal-edit-project');
}
function updateProject(){
  const id=parseInt(document.getElementById('ep-id').value);
  const p=DB.projects.find(pr=>pr.id===id);if(!p)return;
  p.name=document.getElementById('ep-name').value.trim()||p.name;
  p.clientId=parseInt(document.getElementById('ep-client').value)||p.clientId;
  p.type=document.getElementById('ep-type').value;
  // Recalculate value from linked quotes
  p.value=DB.invoices.filter(i=>i.projectId===id&&i.type==='quote').reduce((s,i)=>s+i.total,0);
  p.deadline=document.getElementById('ep-deadline').value;
  p.progress=calcProjectProgress(id); // auto from tasks
  p.status=document.getElementById('ep-status').value;
  p.desc=document.getElementById('ep-desc').value;
  closeModal('modal-edit-project');triggerSaveWithFeedback('Updating project…');renderPage(_currentPage);renderDash();
}
function deleteProject(){
  const id=parseInt(document.getElementById('ep-id').value);
  if(!confirm('Delete this project and its tasks?'))return;
  DB.projects=DB.projects.filter(p=>p.id!==id);
  DB.tasks=DB.tasks.filter(t=>t.projectId!==id);
  DB.invoices=DB.invoices.filter(i=>i.projectId!==id);
  closeModal('modal-edit-project');saveDBFn();renderPage(_currentPage);renderDash();
}

// ════════ EDIT/DELETE: CLIENT ════════
function openEditClient(id){
  const c=DB.clients.find(x=>x.id===id);if(!c)return;
  document.getElementById('ecl-id').value=id;
  document.getElementById('ecl-name').value=c.name;
  const typeEl=document.getElementById('ecl-type');
  if(typeEl){typeEl.value=c.type;if(!typeEl.value&&typeEl.options.length)typeEl.options[0].selected=true;}
  const relEl=document.getElementById('ecl-relationship');if(relEl)relEl.value=c.relationship||'';
  document.getElementById('ecl-phone').value=c.phone||'';
  // Set city picker
  const cityEl=document.getElementById('ecl-city');
  const cityWrap=document.getElementById('ecl-city-custom-wrap');
  const cityCustom=document.getElementById('ecl-city-custom');
  if(cityEl){
    if(c.city==='Bandung'||c.city==='Jakarta'){cityEl.value=c.city;if(cityWrap)cityWrap.style.display='none';}
    else if(c.city){cityEl.value='custom';if(cityWrap)cityWrap.style.display='';if(cityCustom)cityCustom.value=c.city;}
    else{cityEl.value='Bandung';if(cityWrap)cityWrap.style.display='none';}
  }
  setRTEValue('ecl-notes',c.notes||'');
  closeModal('modal-detail');openModal('modal-edit-client');
}
function updateClient(){
  const id=parseInt(document.getElementById('ecl-id').value);
  const c=DB.clients.find(x=>x.id===id);if(!c)return;
  c.name=document.getElementById('ecl-name').value.trim()||c.name;
  c.type=document.getElementById('ecl-type').value;
  c.relationship=document.getElementById('ecl-relationship')?.value||c.relationship||'';
  c.phone=document.getElementById('ecl-phone').value;
  const citySel=document.getElementById('ecl-city')?.value||'Bandung';
  c.city=citySel==='custom'?(document.getElementById('ecl-city-custom')?.value.trim()||c.city):citySel;
  c.notes=document.getElementById('ecl-notes').value;
  closeModal('modal-edit-client');triggerSaveWithFeedback('Updating client…');renderPage(_currentPage);
}

// ════════ EDIT/DELETE: RENTAL — now handled by saves.js openEditBooking() ════════
// Legacy aliases for backward compatibility
function openEditRental(id){ if(typeof openEditBooking==='function') openEditBooking(id); }
function deleteRental(id){ if(typeof deleteBooking==='function') deleteBooking(id); }

// ════════ EDIT/DELETE: INVOICE/QUOTE ════════
// ── Edit Invoice: line-item helpers ──────────────────────────────────────────
var eiItems=[];
function addEiItem(){
  var idx=eiItems.length;eiItems.push({desc:'',qty:1,price:0});
  _addEiItemRow(idx,null);calcEiTotal();
}
function _addEiItemRow(idx,it){
  var d=document.getElementById('ei-items');if(!d)return;
  var row=document.createElement('div');row.style.cssText='display:flex;gap:6px;margin-bottom:6px;align-items:center';
  var safeDesc=(it&&it.desc)?it.desc.replace(/"/g,'&quot;'):'';
  var safeQty=(it&&it.qty)?it.qty:1;
  var safePrice=(it&&it.price&&it.price>0)?it.price.toLocaleString('en-US'):'';
  var safePriceRaw=(it&&it.price)?it.price:'';
  row.innerHTML='<input class="fi" style="flex:2" placeholder="Description" value="'+safeDesc+'" oninput="eiItems['+idx+'].desc=this.value"/>'
    +'<input class="fi" style="width:50px" type="number" value="'+safeQty+'" min="1" oninput="eiItems['+idx+'].qty=+this.value;calcEiTotal()"/>'
    +'<input class="fi" style="width:110px" type="text" inputmode="numeric" placeholder="Price" value="'+safePrice+'" data-raw="'+safePriceRaw+'" oninput="var r=this.value.replace(/,/g,\'\').replace(/[^0-9]/g,\'\');eiItems['+idx+'].price=parseInt(r)||0;this.dataset.raw=r;this.value=r?parseInt(r).toLocaleString(\'en-US\'):\'\';calcEiTotal()"/>'
    +'<button onclick="this.parentElement.remove();eiItems['+idx+']=null;calcEiTotal()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0 4px">✕</button>';
  d.appendChild(row);
}
function calcEiTotal(){
  var valid=eiItems.filter(Boolean);
  var sub=valid.reduce(function(s,it){return s+(it.qty||1)*(it.price||0);},0);
  var discPct=parseFloat(document.getElementById('ei-tax').value)||0;
  var disc=sub*discPct/100;
  var subEl=document.getElementById('ei-sub');if(subEl)subEl.textContent=rp(sub);
  var taxEl=document.getElementById('ei-tax-amt');if(taxEl)taxEl.textContent=rp(disc);
  var totEl=document.getElementById('ei-total');if(totEl)totEl.textContent=rp(sub-disc);
}

function openEditInvoice(id){
  const inv=DB.invoices.find(x=>x.id===id);if(!inv)return;
  document.getElementById('ei-id').value=id;

  // ── category & type label ──
  const cat=inv.category||'Studio';
  const catSel=document.getElementById('ei-category');
  if(catSel)catSel.value=cat;
  document.getElementById('ei-type-label').textContent=inv.type==='quote'?'Edit Quote':'Edit Invoice';

  // ── status options depend on type ──
  const statusSel=document.getElementById('ei-status');
  if(statusSel){
    const quoteStatuses=['Awaiting Approval','Approved','Rejected','Accepted'];
    const invoiceStatuses=['Draft','Sent','Awaiting Approval','Paid','Overdue','Pending'];
    const opts=inv.type==='quote'?quoteStatuses:invoiceStatuses;
    statusSel.innerHTML=opts.map(s=>`<option${inv.status===s?' selected':''}>${s}</option>`).join('');
  }

  // ── client dropdown (filtered by category) ──
  _populateEiClients(cat, inv.clientId);

  // ── second dropdown (Project / Booking / Class) ──
  _populateEiSecond(cat, inv);

  // ── rest of fields ──
  document.getElementById('ei-due').value=inv.due||'';
  setRTEValue('ei-notes',inv.notes||'');
  document.getElementById('ei-tax').value=inv.discount||inv.taxPct||0;

  // ── populate editable line items ──
  const eiItemsWrap=document.getElementById('ei-items');
  if(eiItemsWrap){
    eiItemsWrap.innerHTML='';
    eiItems=[];
    const srcItems=inv.items&&inv.items.length?inv.items:[];
    srcItems.forEach(function(it,i){
      eiItems.push({desc:it.desc||it.description||it.name||'',qty:it.qty||1,price:it.rate||it.price||0});
      _addEiItemRow(i,eiItems[i]);
    });
    if(!eiItems.length){eiItems.push({desc:'',qty:1,price:0});_addEiItemRow(0,eiItems[0]);}
    calcEiTotal();
  }

  const makeBtn=document.getElementById('ei-make-invoice-btn');
  if(makeBtn)makeBtn.style.display=(inv.type==='quote'&&inv.status==='Approved')?'':'none';

  const tryClose=document.getElementById('modal-detail');
  if(tryClose&&tryClose.classList.contains('open'))closeModal('modal-detail');
  openModal('modal-edit-invoice');
}

// populate client select in edit modal, filtered by category
// handle category change in edit invoice modal → re-filter client + second dropdown
function onEiCategoryChange(){
  const cat=document.getElementById('ei-category')?.value||'Studio';
  const invId=parseInt(document.getElementById('ei-id')?.value);
  const inv=DB.invoices.find(x=>x.id===invId);
  _populateEiClients(cat, inv?.clientId||'');
  _populateEiSecond(cat, inv||{});
}

function _populateEiClients(cat, selectedId){
  const sel=document.getElementById('ei-client');if(!sel)return;
  let pool=DB.clients;
  if(cat==='Rental')  pool=DB.clients.filter(c=>c.type==='rental'||c.isRental);
  if(cat==='Academy') pool=DB.clients.filter(c=>c.type==='student'||c.isStudent);
  const label=cat==='Rental'?'Client (Rental)':cat==='Academy'?'Client (Student)':'Client';
  const lbl=document.getElementById('ei-client-label');
  if(lbl)lbl.textContent=label;
  sel.innerHTML='<option value="">— select —</option>'+
    pool.map(c=>`<option value="${c.id}"${c.id===selectedId?' selected':''}>${c.name}</option>`).join('');
}

// populate second dropdown (Project / Booking / Class) in edit modal
function _populateEiSecond(cat, inv){
  const sel=document.getElementById('ei-second');if(!sel)return;
  const lbl=document.getElementById('ei-second-label');
  if(cat==='Rental'){
    if(lbl)lbl.textContent='Booking';
    sel.innerHTML='<option value="">— select —</option>'+
      (DB.bookings||[]).map(b=>`<option value="${b.id}"${b.id===inv?.bookingId?' selected':''}>${b.name||fmtDate(b.date)}</option>`).join('');
  } else if(cat==='Academy'){
    if(lbl)lbl.textContent='Class';
    sel.innerHTML='<option value="">— select —</option>'+
      (DB.classes||[]).map(cl=>`<option value="${cl.id}"${cl.id===inv?.classId?' selected':''}>${cl.name}</option>`).join('');
  } else {
    if(lbl)lbl.textContent='Project';
    sel.innerHTML='<option value="">— select —</option>'+
      (DB.projects||[]).map(p=>`<option value="${p.id}"${p.id===inv?.projectId?' selected':''}>${p.name}</option>`).join('');
  }
}

function updateInvoice(){
  const id=parseInt(document.getElementById('ei-id').value);
  const inv=DB.invoices.find(x=>x.id===id);if(!inv)return;

  inv.status   = document.getElementById('ei-status').value;
  inv.due      = document.getElementById('ei-due').value||null;
  inv.notes    = document.getElementById('ei-notes').value;
  inv.discount = parseFloat(document.getElementById('ei-tax').value)||0;

  const eiCategory=document.getElementById('ei-category');
  if(eiCategory)inv.category=eiCategory.value;

  // client
  const eiClient=document.getElementById('ei-client');
  if(eiClient)inv.clientId=parseInt(eiClient.value)||inv.clientId;

  // second dropdown → correct field (use current category in case it changed)
  const eiSecond=document.getElementById('ei-second');
  if(eiSecond&&eiSecond.value){
    const cat=inv.category||'Studio';
    const sid=parseInt(eiSecond.value)||null;
    if(cat==='Rental')       inv.bookingId=sid;
    else if(cat==='Academy') inv.classId=sid;
    else                     inv.projectId=sid;
  }

  // save edited line items and recalc totals
  const validItems=(typeof eiItems!=='undefined'?eiItems.filter(Boolean):[]);
  if(validItems.length){
    inv.items=validItems.map(it=>({desc:it.desc||'',qty:it.qty||1,rate:it.price||0}));
    inv.subtotal=validItems.reduce((s,it)=>s+(it.qty||1)*(it.price||0),0);
  } else {
    inv.subtotal=inv.subtotal||(inv.items||[]).reduce((s,it)=>s+(it.qty||1)*(it.rate||0),0)||inv.total||0;
  }
  inv.total=Math.round(inv.subtotal*(1-inv.discount/100));

  // update linked project value if applicable
  if(inv.projectId){
    const proj=DB.projects.find(p=>p.id===inv.projectId);
    if(proj){proj.value=DB.invoices.filter(i=>i.projectId===inv.projectId&&i.type==='quote').reduce((s,i)=>s+i.total,0);}
  }

  addActivityLog(inv.type==='quote'?'Quote':'Invoice','Edited',
    (inv.type==='quote'?'QT-':'INV-')+String(id).padStart(4,'0'),'invoice');
  closeModal('modal-edit-invoice');triggerSaveWithFeedback('Updating invoice…');renderPage(_currentPage);renderDash();
}
function deleteInvoiceConfirm(id){
  const inv=DB.invoices.find(x=>x.id===id);if(!inv)return;
  const label=inv.type==='quote'?`QT-${String(id).padStart(4,'0')}`:`INV-${String(id).padStart(4,'0')}`;
  if(!confirm(`Delete ${label}? This cannot be undone.`))return;
  DB.invoices=DB.invoices.filter(x=>x.id!==id);
  closeModal('modal-detail');saveDBFn();renderPage(_currentPage);renderDash();
}

// ════════ EDIT/DELETE: DOMESTIC ════════
function openEditDomestic(id){
  const t=DB.domestics.find(x=>x.id===id);if(!t)return;
  document.getElementById('edm-id').value=id;
  document.getElementById('edm-name').value=t.name;
  document.getElementById('edm-status').value=t.status;
  document.getElementById('edm-priority').value=t.priority;
  document.getElementById('edm-due').value=t.dueDate||'';
  const sel=document.getElementById('edm-assign');
  sel.innerHTML=USERS.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  sel.value=t.assignee;
  openModal('modal-edit-domestic');
}
function updateDomestic(){
  const id=parseInt(document.getElementById('edm-id').value);
  const t=DB.domestics.find(x=>x.id===id);if(!t)return;
  t.name=document.getElementById('edm-name').value.trim()||t.name;
  t.assignee=document.getElementById('edm-assign').value;
  t.status=document.getElementById('edm-status').value;
  t.priority=document.getElementById('edm-priority').value;
  t.dueDate=document.getElementById('edm-due').value;
  closeModal('modal-edit-domestic');triggerSaveWithFeedback('Updating task…');renderPage(_currentPage);
}
function deleteDomestic(id){
  if(!confirm('Delete this task?'))return;
  DB.domestics=DB.domestics.filter(x=>x.id!==id);
  saveDBFn();renderPage(_currentPage);
}

// ════════ EDIT/DELETE: CLASS/STUDENT ════════
function openEditClass(id){
  const c=DB.classes.find(x=>x.id===id);if(!c)return;
  document.getElementById('eac-id').value=id;
  document.getElementById('eac-name').value=c.name;
  document.getElementById('eac-fee').value=c.fee||0;
  document.getElementById('eac-sched').value=c.schedDate||c.schedule||'';
  const timeEl=document.getElementById('eac-time-edit');if(timeEl)timeEl.value=c.schedTime||'';
  const durEl=document.getElementById('eac-duration');if(durEl)durEl.value=c.duration||1;
  document.getElementById('eac-students').value=c.students||0;
  document.getElementById('eac-status').value=c.status;
  populateClassModal(); // uses ACADEMY_INSTRUCTORS
  setTimeout(()=>{
    const sel=document.getElementById('eac-instructor');
    if(sel)sel.value=c.instructor;
  },20);
  openModal('modal-edit-class');
}
function updateClass(){
  const id=parseInt(document.getElementById('eac-id').value);
  const c=DB.classes.find(x=>x.id===id);if(!c)return;
  c.name=document.getElementById('eac-name').value.trim()||c.name;
  c.instructor=document.getElementById('eac-instructor').value;
  c.fee=parseFloat(document.getElementById('eac-fee').value)||0;
  const schedDate=document.getElementById('eac-sched').value;
  const schedTime=document.getElementById('eac-time-edit')?.value||'';
  c.schedDate=schedDate;
  c.schedTime=schedTime;
  c.schedule=schedDate?(schedDate+(schedTime?' '+schedTime:'')):(c.schedule);
  c.duration=parseFloat(document.getElementById('eac-duration')?.value)||c.duration||1;
  c.students=parseInt(document.getElementById('eac-students').value)||0;
  c.status=document.getElementById('eac-status').value;
  closeModal('modal-edit-class');triggerSaveWithFeedback('Updating class…');renderAcademy();
}
function deleteClass(id){
  if(!confirm('Delete this class?'))return;
  DB.classes=DB.classes.filter(x=>x.id!==id);
  saveDBFn();renderAcademy();
}

// ════════ EDIT/DELETE: PRODUCT/MERCH ════════
function openEditProduct(id){
  const p=DB.products.find(x=>x.id===id);if(!p)return;
  document.getElementById('epr-id').value=id;
  document.getElementById('epr-name').value=p.name;
  document.getElementById('epr-sku').value=p.sku||'';
  document.getElementById('epr-price').value=p.price;
  document.getElementById('epr-stock').value=p.initialStock||p.stock||0;
  document.getElementById('epr-sold').value=p.sold||0;
  document.getElementById('epr-status').value=p.status||'Active';
  openModal('modal-edit-product');
}
function updateProduct(){
  const id=parseInt(document.getElementById('epr-id').value);
  const p=DB.products.find(x=>x.id===id);if(!p)return;
  p.name=document.getElementById('epr-name').value.trim()||p.name;
  p.sku=document.getElementById('epr-sku').value;
  p.price=parseFloat(document.getElementById('epr-price').value)||0;
  p.initialStock=parseInt(document.getElementById('epr-stock').value)||0;
  p.stock=p.initialStock;
  p.sold=parseInt(document.getElementById('epr-sold').value)||0;
  p.status=document.getElementById('epr-status').value;
  closeModal('modal-edit-product');triggerSaveWithFeedback('Updating product…');renderMerch();
}
function deleteProduct(id){
  if(!confirm('Delete this product?'))return;
  DB.products=DB.products.filter(x=>x.id!==id);
  saveDBFn();renderMerch();
}

// ════════ EDIT/DELETE: DOC ════════
function openEditDoc(id){
  const d=DB.docs.find(x=>x.id===id);if(!d)return;
  document.getElementById('edc-id').value=id;
  document.getElementById('edc-title').value=d.title;
  document.getElementById('edc-type').value=d.type;
  document.getElementById('edc-related').value=d.related||'';
  setRTEValue('edc-content',d.content||'');
  document.getElementById('edc-status').value=d.status;
  closeModal('modal-detail');openModal('modal-edit-doc');
}
function updateDoc(){
  const id=parseInt(document.getElementById('edc-id').value);
  const d=DB.docs.find(x=>x.id===id);if(!d)return;
  const oldTitle=d.title;
  d.title=document.getElementById('edc-title').value.trim()||d.title;
  d.type=document.getElementById('edc-type').value;
  d.related=document.getElementById('edc-related').value;
  d.content=document.getElementById('edc-content').value;
  d.status=document.getElementById('edc-status').value;
  if(typeof logUpdate==='function')logUpdate('document',oldTitle);
  closeModal('modal-edit-doc');triggerSaveWithFeedback('Updating document…');renderPage(_currentPage);
}
function deleteDoc(id){
  if(!confirm('Delete this document?'))return;
  const doc=DB.docs.find(x=>x.id===id);
  const docTitle=doc?.title||'Unknown document';
  DB.docs=DB.docs.filter(x=>x.id!==id);
  if(typeof logDelete==='function')logDelete('document',docTitle);
  closeModal('modal-detail');saveDBFn();renderPage(_currentPage);
}
let domDueMode=null;
function pickDomPrio(el,val){
  document.querySelectorAll('#dom-prio-pick .assign-opt').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');domPriority=val;
}
function pickDomDue(el,val){
  document.querySelectorAll('#dom-due-pick .assign-opt').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');domDueMode=val;
  const input=document.getElementById('dom-due');
  if(val==='today'){const d=new Date();input.value=d.toISOString().slice(0,10);input.style.display='none'}
  else if(val==='tomorrow'){const d=new Date();d.setDate(d.getDate()+1);input.value=d.toISOString().slice(0,10);input.style.display='none'}
  else{input.style.display='block';input.value='';input.focus()}
}
function populateDomesticModal(){
  document.getElementById('dom-assign').innerHTML=USERS.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  // reset pickers
  document.querySelectorAll('#dom-prio-pick .assign-opt').forEach(e=>e.classList.toggle('sel',e.dataset.val==='normal'));
  document.querySelectorAll('#dom-due-pick .assign-opt').forEach(e=>e.classList.remove('sel'));
  document.getElementById('dom-due').style.display='none';
  document.getElementById('dom-due').value='';
  document.getElementById('dom-status').value='To Do';
  const dd=document.getElementById('dom-desc');if(dd)dd.value='';
  domPriority='normal';domDueMode=null;
}
const ACADEMY_INSTRUCTORS=[
  {id:'aldi',name:'Aldi'},
  {id:'dissa',name:'Dissa'},
  {id:'ekky',name:'Ekky'}
];
function getInstructorName(id){return(ACADEMY_INSTRUCTORS.find(u=>u.id===id)||{name:id}).name;}
