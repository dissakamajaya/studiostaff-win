// ════════ NOTIFICATIONS ════════
function _isImportantNotification(n){
  const type=(n&&n.type||'').toLowerCase();
  const wideTypes=new Set([
    'quote','invoice','task','project','domestic','journal','leave','payroll',
    'food','reimburse','reminder','doc','alert','announcement','approval',
    'expense','income','payment','event','calendar','update','assignment',
    'deadline','overdue'
  ]);
  if(wideTypes.has(type)) return true;
  const msg=String(n&&n.message||'').toLowerCase();
  const phrases=[
    'mentioned you in journal',
    'commented on your journal',
    'commented on a journal you were mentioned in',
    'mentioned you in doc',
    'commented on your doc',
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
  ];
  return phrases.some(p=>msg.includes(p));
}
function addNotification(userId,message,type,refId){
  if(userId===currentUser)return; // don't notify self
  DB.notifications.push({id:DB.nextId.n++,userId,message,read:false,createdAt:new Date().toISOString(),type:type||'info',refId:refId||null});
  saveDBFn();updateNotifCount();renderSidebar();
  var token=localStorage.getItem('ss-token');
  if(token){
    // Web Push
    fetch('/api/push-send',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({userId:userId,title:'STUDIOSTAFF',body:message,url:'/'})
    }).catch(function(){});
    // WhatsApp is sent server-side in api/data.js when notifications diff is detected
  }
}

async function refreshNotifications(btn){
  if(btn){btn.style.opacity='0.4';btn.style.pointerEvents='none';btn.textContent='⏳';}
  var token=localStorage.getItem('ss-token');
  if(!token){
    alert('Not logged in — no token found. Please log out and log back in.');
    if(btn){btn.style.opacity='';btn.style.pointerEvents='';btn.textContent='🔄';}
    return;
  }
  try{
    // Pull from Supabase
    var r=await fetch('/api/data',{headers:{'Authorization':'Bearer '+token}});
    console.log('[sync] GET /api/data status:', r.status);
    if(r.status===401){
      localStorage.removeItem('ss-token');
      alert('Session expired. Please log in again.');
      logout();
      return;
    }
    if(r.ok){
      var j=await r.json();
      if(j.data&&Object.keys(j.data).length>0){
        // Supabase has data — load it
        DB=j.data;migrateDB();
        if(j.updated_at)window._workspaceMetaTs=j.updated_at;
        if(typeof _snapshotDB==='function')_snapshotDB();
        if(typeof _saveCacheDB==='function')_saveCacheDB();
        console.log('[sync] Pulled from Supabase ✓');
      } else {
        // Supabase is empty — push local data up
        console.log('[sync] Supabase empty, pushing local data...');
        if(j.updated_at)window._workspaceMetaTs=j.updated_at;
        var pw=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({data:DB,client_updated_at:window._workspaceMetaTs||null})});
        console.log('[sync] POST /api/data status:', pw.status);
        if(pw.ok) console.log('[sync] Pushed to Supabase ✓');
        else{var pe=await pw.json();console.error('[sync] Push failed:',pe);}
      }
    } else {
      var err=await r.json();
      console.error('[sync] Error:', err);
      alert('Sync failed: '+(err.error||r.status));
    }
  }catch(e){console.error('[sync] Exception:',e);alert('Sync error: '+e.message);}
  updateNotifCount();
  renderSidebar();
  const p=document.getElementById('notif-panel');
  if(p&&p.classList.contains('open'))renderNotifs();
  if(btn){btn.style.opacity='';btn.style.pointerEvents='';btn.textContent='🔄';}
}

function updateNotifCount(){
  const count=DB.notifications.filter(n=>n.userId===currentUser&&!n.read&&_isImportantNotification(n)).length;
  const el=document.getElementById('notif-count');
  if(count>0){el.style.display='flex';el.textContent=count}else{el.style.display='none'}
  if(typeof updateAppBadge==='function')updateAppBadge(count);
}

function toggleNotifPanel(){
  const p=document.getElementById('notif-panel');
  p.classList.toggle('open');
  if(p.classList.contains('open')){
    renderNotifs();
    // Prompt for push permission since this is a user gesture
    if(typeof requestPushPermission==='function')requestPushPermission();
  }
}
function renderNotifs(){
  const notifs=DB.notifications.filter(n=>n.userId===currentUser).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const list=document.getElementById('notif-list');
  if(!notifs.length){list.innerHTML='<div class="empty" style="padding:20px">No notifications</div>';return}
  list.innerHTML=notifs.map(n=>`<div class="notif-item ${n.read?'':'unread'}" onclick="handleNotifClick(${n.id})"><div style="display:flex;gap:8px"><div class="notif-dot" style="${n.read?'opacity:0':''}"></div><div style="flex:1"><div style="font-size:11px;color:var(--text)">${n.message}</div><div style="font-size:9px;color:var(--text3);margin-top:3px;display:flex;align-items:center;gap:6px">${fmtDate(n.createdAt)}${n.type&&n.type!=='info'?`<span style="background:var(--bg4);border-radius:3px;padding:1px 5px;font-size:8px;color:var(--text3)">${n.type}</span>`:''}</div></div><span style="font-size:9px;color:var(--accent);opacity:.7;flex-shrink:0;margin-top:2px">→</span></div></div>`).join('');
}
function handleNotifClick(id){
  const n=DB.notifications.find(x=>x.id===id);
  if(!n)return;
  n.read=true;saveDBFn();updateNotifCount();renderNotifs();renderSidebar();
  const panel=document.getElementById('notif-panel');
  if(panel)panel.classList.remove('open');
  if(n.type==='quote'||n.type==='invoice'){nav('invoices');setTimeout(()=>n.refId&&viewInvoice(n.refId),200)}
  else if(n.type==='task'){nav('studio');setTimeout(()=>n.refId&&openEditTask(n.refId),200)}
  else if(n.type==='domestic'){nav('domestic');setTimeout(()=>n.refId&&openEditDomestic(n.refId),200)}
  else if(n.type==='project'){nav('studio');setTimeout(()=>n.refId&&viewProject(n.refId),200)}
  else if(n.type==='feedback'){nav('studio');setTimeout(()=>n.refId&&typeof viewFeedback==='function'&&viewFeedback(n.refId),200)}
  else if(n.type==='journal'){nav('journal');setTimeout(()=>n.refId&&viewJournal(n.refId),200)}
  else if(n.type==='doc'){nav('docs');setTimeout(()=>n.refId&&typeof viewDoc==='function'&&viewDoc(n.refId),200)}
  else if(n.type==='leave'){nav('domestic')}
  else if(n.type==='payroll'){nav('finance')}
  else if(n.type==='food'){nav('domestic')}
  else if(n.type==='reimburse'){nav('domestic')}
  else if(n.type==='reminder'){nav('invoices');setTimeout(()=>n.refId&&viewInvoice(n.refId),200)}
  else{nav('dashboard')}
}
function readNotif(id){
  const n=DB.notifications.find(x=>x.id===id);
  if(n){n.read=true;saveDBFn();updateNotifCount();renderNotifs();renderSidebar()}
}
function markAllRead(){
  DB.notifications.filter(n=>n.userId===currentUser).forEach(n=>n.read=true);
  saveDBFn();updateNotifCount();renderNotifs();renderSidebar();
}

// ════════ CLIENT LABEL PICKER ════════
let clientLabelVal='Studio';
function pickClientLabel(el,val){
  document.querySelectorAll('#cl-label-pick .assign-opt').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');clientLabelVal=val;
  document.getElementById('cl-label').value=val;
}

// ── Amount formatting helpers ──
function fmtAmtInput(el){
  // Strip everything except digits and one decimal point
  let raw=el.value.replace(/,/g,'');
  // Allow digits and optional single decimal
  raw=raw.replace(/[^0-9.]/g,'');
  // Only one decimal point allowed
  const parts=raw.split('.');
  if(parts.length>2)raw=parts[0]+'.'+parts.slice(1).join('');
  // Limit decimal to 2 digits
  if(parts.length===2&&parts[1].length>2)raw=parts[0]+'.'+parts[1].slice(0,2);
  el.dataset.raw=raw;
  if(!raw){el.value='';return;}
  // Format integer part with commas
  const intPart=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');
  el.value=parts.length===2?intPart+'.'+parts[1]:intPart;
}
function fmtAmtBlur(el){
  // On blur, show full 2-decimal format
  const raw=parseFloat((el.dataset.raw||el.value.replace(/,/g,'')).replace(/[^0-9.]/g,''));
  if(isNaN(raw)||!el.value){el.value='';return;}
  el.dataset.raw=String(raw);
  el.value=raw.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function getAmtVal(id){
  const el=document.getElementById(id);if(!el)return 0;
  return parseFloat((el.dataset.raw||el.value.replace(/,/g,'')).replace(/[^0-9.]/g,''))||0;
}
// ── Client city/relationship helpers ──
function onClientCityChange(){
  const sel=document.getElementById('cl-city');
  const wrap=document.getElementById('cl-city-custom-wrap');
  if(wrap)wrap.style.display=sel&&sel.value==='custom'?'':'none';
}
function onEditClientCityChange(){
  const sel=document.getElementById('ecl-city');
  const wrap=document.getElementById('ecl-city-custom-wrap');
  if(wrap)wrap.style.display=sel&&sel.value==='custom'?'':'none';
}
// ── Leave date quick-pick ──
function setLeaveDate(val,el){
  document.querySelectorAll('#lv-date-pick .assign-opt').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  const inp=document.getElementById('lv-start');
  if(val==='custom'){inp.style.display='';inp.focus();return;}
  inp.style.display='none';
  const d=new Date();if(val==='tomorrow')d.setDate(d.getDate()+1);
  inp.value=d.toISOString().slice(0,10);
  applyLeaveDuration();
}
let leaveDurVal='1';
function setLeaveDuration(val,el){
  leaveDurVal=val;
  document.querySelectorAll('#lv-dur-pick .assign-opt').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  const wrap=document.getElementById('lv-end-wrap');
  if(val==='custom'){if(wrap)wrap.style.display='';return;}
  if(wrap)wrap.style.display='none';
  applyLeaveDuration();
}
function applyLeaveDuration(){
  if(leaveDurVal==='custom')return;
  const start=document.getElementById('lv-start').value;
  if(!start)return;
  const d=new Date(start);
  d.setDate(d.getDate()+parseInt(leaveDurVal)-1);
  document.getElementById('lv-end').value=d.toISOString().slice(0,10);
}
// ── Reimburse date quick-pick ──
function setReimburseDate(val,el){
  document.querySelectorAll('#rb-date-pick .assign-opt').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  const inp=document.getElementById('rb-date');
  if(val==='custom'){inp.style.display='';inp.focus();return;}
  inp.style.display='none';
  const d=new Date();if(val==='yesterday')d.setDate(d.getDate()-1);
  inp.value=d.toISOString().slice(0,10);
}

// ════════ SAVE FUNCTIONS ════════
function saveClient(){
  const name=document.getElementById('cl-name').value.trim();
  if(!name){alert('Name required');return}
  const citySel=document.getElementById('cl-city')?.value||'Bandung';
  const city=citySel==='custom'?(document.getElementById('cl-city-custom')?.value.trim()||''):citySel;
  DB.clients.push({id:DB.nextId.c++,name,type:document.getElementById('cl-type').value,label:clientLabelVal||'Studio',relationship:document.getElementById('cl-relationship')?.value||'',city,phone:document.getElementById('cl-phone').value,notes:document.getElementById('cl-notes').value,status:'Active',createdAt:new Date().toISOString()});
  ['cl-name','cl-phone','cl-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  const ccw=document.getElementById('cl-city-custom');if(ccw)ccw.value='';
  clientLabelVal='Studio';
  document.querySelectorAll('#cl-label-pick .assign-opt').forEach((e,i)=>e.classList.toggle('sel',i===0));
  addActivityLog('Client','Added',name,'client');closeModal('modal-client');triggerSaveWithFeedback('Saving client…');renderPage(_currentPage);renderDash();
}

function saveProject(){
  const name=document.getElementById('pj-name').value.trim();
  const cid=document.getElementById('pj-client').value;
  if(!name){alert('Project name required');return}
  if(!cid&&DB.clients.length>0){alert('Select a client');return}
  const p={id:DB.nextId.p++,name,clientId:cid?parseInt(cid):null,type:document.getElementById('pj-type').value,value:0,deadline:document.getElementById('pj-deadline').value,progress:0,status:document.getElementById('pj-status').value,desc:document.getElementById('pj-desc').value,createdAt:new Date().toISOString(),createdBy:currentUser};
  DB.projects.push(p);
  ['pj-name','pj-deadline','pj-desc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  if(typeof clearRTE==='function')clearRTE('pj-desc');
  addActivityLog('Project','Added',name,'project');
  closeModal('modal-project');
  triggerSaveWithFeedback('Saving project…');
  renderPage(_currentPage);
  renderDash();
}

function saveTask(){
  const title=document.getElementById('tk-title').value.trim();
  if(!title){alert('Task title required');return}
  const assignees=taskAssignees.length?taskAssignees:[currentUser];
  const dueDate=document.getElementById('tk-due').value||'';
  assignees.forEach(uid=>{
    const t={id:DB.nextId.t++,title,projectId:document.getElementById('tk-project').value?parseInt(document.getElementById('tk-project').value):null,priority:taskPriority,assignee:uid,createdBy:currentUser,dueDate:dueDate,status:'To Do',desc:document.getElementById('tk-desc').value||'',createdAt:new Date().toISOString()};
    DB.tasks.push(t);
    syncProjectProgress(t.projectId);
    addNotification(uid,`${getUserName(currentUser)} assigned you a task: "${title}"`,'task',t.id);
  });
  ['tk-title','tk-due','tk-desc'].forEach(id=>document.getElementById(id).value='');clearRTE('tk-desc');
  taskAssignees=[];taskPriority='normal';taskDueMode=null;
  addActivityLog('Task','Added',title,'task');closeModal('modal-task');triggerSaveWithFeedback('Saving task…');renderPage(_currentPage);
}

// ── Rental booking helpers (pickRentalOpt, calcRentalTotal, applyRentalDuration moved to bottom with new booking flow) ──
function setRentalStartDate(val,el){
  document.querySelectorAll('#rn-date-pick .assign-opt').forEach(function(b){b.classList.remove('sel');});
  el.classList.add('sel');
  var inp=document.getElementById('rn-start');
  var today=new Date().toISOString().slice(0,10);
  var tomorrow=new Date(Date.now()+864e5).toISOString().slice(0,10);
  if(val==='today'){inp.value=today;inp.style.display='none';}
  else if(val==='tomorrow'){inp.value=tomorrow;inp.style.display='none';}
  else{inp.style.display='';inp.focus();}
  applyRentalDuration();
}
function openModal_rental(){
  // Reset client search
  var cn=document.getElementById('rn-client-name');if(cn)cn.value='';
  var ci=document.getElementById('rn-client-id');if(ci)ci.value='';
  var dd=document.getElementById('rn-client-dd');if(dd)dd.style.display='none';
  // Reset items
  rentalItems=[];
  var itemsEl=document.getElementById('rn-items');if(itemsEl)itemsEl.innerHTML='';
  addRentalItem();
  // Reset pickers
  rentalCrewVal='no';rentalDeliveryVal='no';
  ['rn-crew-no','rn-del-no'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.add('sel');});
  ['rn-crew-yes','rn-del-yes'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.remove('sel');});
  var crewWrap=document.getElementById('rn-crew-assign-wrap');if(crewWrap)crewWrap.style.display='none';
  document.getElementById('rn-return-wrap').style.display='none';
  document.getElementById('rn-total-preview').textContent='Rp 0';
  // Reset date picker to today
  var rndp=document.querySelector('#rn-date-pick [data-val="today"]');
  if(rndp){document.querySelectorAll('#rn-date-pick .assign-opt').forEach(function(b){b.classList.remove('sel');});rndp.classList.add('sel');}
  var rnStart=document.getElementById('rn-start');
  if(rnStart){rnStart.value=new Date().toISOString().slice(0,10);rnStart.style.display='none';}
  document.getElementById('rn-duration').value='24';
  applyRentalDuration();
  // Reset address & contact
  ['rn-address','rn-contact-name','rn-contact-phone','rn-notes'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  // Populate crew picker
  _populateCrewPicker('rn-crew-pick',[]);
}
// ── Rental item management ─────────────────────────────────────
var rentalItems=[];
function addRentalItem(){
  var idx=rentalItems.length;
  rentalItems.push({name:'',qty:1,price:0});
  var d=document.getElementById('rn-items');
  var row=document.createElement('div');row.style.cssText='display:flex;gap:6px;margin-bottom:6px;align-items:center';
  var invOpts=(DB.inventoryItems||[]).map(function(i){return '<option value="'+i.name+'">'+i.name+' ('+i.category+', qty:'+( i.qty||1)+')</option>';}).join('');
  row.innerHTML='<select class="fi rn-item-sel" style="flex:2" onchange="onRnItemChange('+idx+',this)"><option value="">— Select item —</option>'+invOpts+'</select>'+
    '<input class="fi" style="width:50px" type="number" value="1" min="1" placeholder="Qty" oninput="rentalItems['+idx+'].qty=+this.value;calcRentalTotal()"/>'+
    '<input class="fi" style="width:100px" type="text" inputmode="numeric" placeholder="Price (opt)" oninput="var r=this.value.replace(/,/g,\'\').replace(/[^0-9]/g,\'\');rentalItems['+idx+'].price=parseInt(r)||0;this.dataset.raw=r;this.value=r?parseInt(r).toLocaleString(\'en-US\'):\'\';calcRentalTotal()"/>'+
    '<button onclick="this.parentElement.remove();rentalItems['+idx+']=null;calcRentalTotal()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0 4px">✕</button>';
  d.appendChild(row);
}
function onRnItemChange(idx,sel){
  rentalItems[idx].name=sel.value;
  // Check availability
  var start=document.getElementById('rn-start').value;
  var ret=document.getElementById('rn-return').value||start;
  if(sel.value&&start){
    var avail=getItemAvailability(sel.value,start,ret||start);
    var qty=rentalItems[idx].qty||1;
    if(qty>avail.available){
      var warn=document.getElementById('rn-avail-warn');
      if(warn){warn.style.display='block';warn.textContent='⚠ '+sel.value+' only has '+avail.available+' available on these dates ('+avail.booked+' booked of '+avail.total+')';}
    } else {
      var warn=document.getElementById('rn-avail-warn');if(warn)warn.style.display='none';
    }
  }
  calcRentalTotal();
}

function calcRentalTotal(){
  var valid=rentalItems.filter(Boolean);
  var total=valid.reduce(function(s,it){return s+(it.qty||1)*(it.price||0);},0);
  document.getElementById('rn-total-preview').textContent=rp(total);
}

// ── Client search for booking ─────────────────────────────────
function rnClientSearch(){
  var inp=document.getElementById('rn-client-name');
  var dd=document.getElementById('rn-client-dd');
  var q=(inp.value||'').toLowerCase();
  // Filter Booking-label clients
  var pool=DB.clients.filter(function(c){return (c.label||'Studio')==='Booking';});
  var filtered=q?pool.filter(function(c){return c.name.toLowerCase().indexOf(q)>=0||(c.phone||'').toLowerCase().indexOf(q)>=0;}):pool;
  if(!filtered.length&&!q){dd.style.display='none';return;}
  dd.style.display='block';
  dd.innerHTML=filtered.map(function(c){
    return '<div style="padding:6px 10px;cursor:pointer;font-size:11px;border-bottom:1px solid var(--border)" onmousedown="event.preventDefault();rnSelectClient('+c.id+',\''+c.name.replace(/'/g,"\\'")+'\')">' +
      '<div style="font-weight:500">'+c.name+'</div><div style="color:var(--text3);font-size:9px">'+( c.phone||'—')+'</div></div>';
  }).join('');
}
function rnSelectClient(id,name){
  document.getElementById('rn-client-id').value=id;
  document.getElementById('rn-client-name').value=name;
  document.getElementById('rn-client-dd').style.display='none';
}

// ── Duration & return date calc ───────────────────────────────
function applyRentalDuration(){
  var dur=document.getElementById('rn-duration').value;
  var wrap=document.getElementById('rn-return-wrap');
  var preview=document.getElementById('rn-return-preview');
  if(dur==='custom'){wrap.style.display='block';if(preview)preview.textContent='Custom';calcRentalTotal();return;}
  wrap.style.display='none';
  var start=document.getElementById('rn-start').value;
  if(start){
    var d=new Date(start);
    d.setHours(d.getHours()+parseInt(dur));
    var ret=d.toISOString().slice(0,10);
    document.getElementById('rn-return').value=ret;
    if(preview)preview.textContent=fmtDate(ret);
  }
  calcRentalTotal();
}

// ── Crew picker helper ────────────────────────────────────────
function _populateCrewPicker(containerId,selectedIds){
  if(!DB.crewMembers)DB.crewMembers=[];
  var el=document.getElementById(containerId);if(!el)return;
  el.innerHTML=DB.crewMembers.map(function(cr){
    var sel=(selectedIds||[]).indexOf(cr.id)>=0;
    return '<div class="assign-opt'+(sel?' sel':'')+'" data-cid="'+cr.id+'" onclick="this.classList.toggle(\'sel\')"><div class="av" style="background:'+avColor(cr.name)+'22;color:'+avColor(cr.name)+';width:20px;height:20px;font-size:8px">'+initials(cr.name)+'</div><span style="font-size:10px">'+cr.name+'</span></div>';
  }).join('')||(DB.crewMembers.length?'':'<div class="td-s">No crew yet</div>');
}
function _getSelectedCrewIds(containerId){
  var ids=[];
  document.querySelectorAll('#'+containerId+' .assign-opt.sel').forEach(function(el){ids.push(parseInt(el.dataset.cid));});
  return ids;
}

function saveRental(){
  var clientName=document.getElementById('rn-client-name').value.trim();
  var clientId=parseInt(document.getElementById('rn-client-id').value)||0;
  if(!clientName){alert('Enter a client name');return;}

  // Auto-create client if typed new name
  if(!clientId){
    var existing=DB.clients.find(function(c){return c.name.toLowerCase()===clientName.toLowerCase()&&(c.label||'Studio')==='Booking';});
    if(existing){
      clientId=existing.id;
    } else {
      clientId=DB.nextId.c++;
      DB.clients.push({id:clientId,name:clientName,label:'Booking',type:'Individual',status:'Active',phone:'',city:'',notes:'',createdAt:new Date().toISOString()});
    }
  }

  var start=document.getElementById('rn-start').value;
  var dur=document.getElementById('rn-duration').value;
  var ret=document.getElementById('rn-return').value||start;
  var crew=document.getElementById('rn-crew').value==='yes';
  var delivery=document.getElementById('rn-delivery').value==='yes';
  var address=document.getElementById('rn-address').value.trim();
  var contactName=document.getElementById('rn-contact-name').value.trim();
  var contactPhone=document.getElementById('rn-contact-phone').value.trim();
  var notes=document.getElementById('rn-notes').value.trim();
  var crewIds=crew?_getSelectedCrewIds('rn-crew-pick'):[];

  var validItems=rentalItems.filter(function(it){return it&&it.name;});
  if(!validItems.length){alert('Add at least one item');return;}
  if(!start){alert('Select a booking date');return;}

  // Check availability
  for(var i=0;i<validItems.length;i++){
    var it=validItems[i];
    var avail=getItemAvailability(it.name,start,ret);
    if((it.qty||1)>avail.available){
      alert('⚠ '+it.name+' only has '+avail.available+' available on these dates. Please reduce quantity or change dates.');
      return;
    }
  }

  var days,hours;
  if(dur!=='custom'){
    hours=parseInt(dur);days=Math.max(1,Math.round(hours/24));
  } else {
    days=Math.max(1,Math.round((new Date(ret)-new Date(start))/(864e5)));hours=days*24;
  }
  var total=validItems.reduce(function(s,it){return s+(it.qty||1)*(it.price||0);},0);

  var today=new Date().toISOString().slice(0,10);
  // Status is derived from dates; use a temp object so _bookingStatus can read it
  var _tmpR={start:start,returnDate:ret,status:''};
  var status=(typeof _bookingStatus==='function')?_bookingStatus(_tmpR):(start>today?'Upcoming':'Active');

  var r={
    id:DB.nextId.r++,
    clientId:clientId,
    items:validItems.map(function(it){return{name:it.name,qty:it.qty||1,price:it.price||0};}),
    start:start,
    returnDate:ret,
    days:days,
    hours:dur!=='custom'?parseInt(dur):null,
    durationType:dur,
    total:total,
    crew:crew,
    delivery:delivery,
    crewIds:crewIds,
    address:address,
    contactName:contactName,
    contactPhone:contactPhone,
    notes:notes,
    status:status,
    createdAt:new Date().toISOString(),
    createdBy:currentUser
  };
  // Backward compat: set equipment field to first item
  if(validItems.length)r.equipment=validItems[0].name;
  r.rate=total>0&&days>0?Math.round(total/days):0;

  DB.rentals.push(r);

  // Auto-add to calendar
  var itemNames=validItems.map(function(it){return it.name;}).join(', ');
  var clientObj=DB.clients.find(function(cl){return cl.id===clientId;});
  DB.events.push({id:DB.nextId.ev++,title:'📦 '+itemNames+' — '+(clientObj?clientObj.name:'Client'),date:r.start,time:'08:00',duration:r.hours?r.hours:r.days*24,color:'var(--amber)',createdBy:currentUser,createdAt:new Date().toISOString()});

  addActivityLog('Rental','Added',_bookingNum?_bookingNum(r):'BK-'+String(r.id).padStart(4,'0'),'rental');
  closeModal('modal-rental');
  triggerSaveWithFeedback('Saving booking…',function(){
    if(confirm('Booking saved!\n\nCreate a quote for this booking?')){
      setTimeout(function(){createBookingQuote(r.id);},300);
    }
  });
  renderPage(_currentPage);renderDash();
}

let qtItems=[];
function addQtItemInit(){qtItems=[];document.getElementById('qt-items').innerHTML='';addQtItem()}
function addQtItem(){
  const idx=qtItems.length;qtItems.push({desc:'',qty:1,price:0});
  const d=document.getElementById('qt-items');
  const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;margin-bottom:6px;align-items:center';
  row.innerHTML=`<input class="fi" style="flex:2" placeholder="Description" oninput="qtItems[${idx}].desc=this.value"/><input class="fi" style="width:50px" type="number" value="1" min="1" oninput="qtItems[${idx}].qty=+this.value;calcQtTotal()"/><input class="fi" style="width:100px" type="text" inputmode="numeric" placeholder="Price" oninput="const r=this.value.replace(/,/g,'').replace(/[^0-9]/g,'');qtItems[${idx}].price=parseInt(r)||0;this.dataset.raw=r;this.value=r?parseInt(r).toLocaleString('en-US'):'';calcQtTotal()"/><button onclick="this.parentElement.remove();qtItems[${idx}]=null;calcQtTotal()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0 4px">✕</button>`;
  d.appendChild(row);
}
function setQtItems(items){
  const wrap=document.getElementById('qt-items');
  if(!wrap)return;
  qtItems=[];
  wrap.innerHTML='';
  const list=Array.isArray(items)?items:[];
  if(!list.length){
    addQtItem();
    calcQtTotal();
    return;
  }
  list.forEach(function(it){
    addQtItem();
    const row=wrap.lastElementChild;
    if(!row)return;
    const desc=row.querySelector('input[placeholder="Description"]');
    const qty=row.querySelector('input[type="number"]');
    const price=row.querySelector('input[inputmode="numeric"]');
    const item=qtItems[qtItems.length-1];
    if(desc){desc.value=it.desc||'';item.desc=desc.value;}
    if(qty){qty.value=it.qty||1;item.qty=it.qty||1;}
    if(price){
      const raw=String(it.price||0).replace(/[^0-9]/g,'');
      price.dataset.raw=raw;
      price.value=raw?parseInt(raw,10).toLocaleString('en-US'):'';
      item.price=parseInt(raw,10)||0;
    }
  });
  calcQtTotal();
}
function calcQtTotal(){
  const valid=qtItems.filter(Boolean);
  const sub=valid.reduce((s,it)=>s+(it.qty*it.price),0);
  const discPct=parseFloat(document.getElementById('qt-tax').value)||0;
  const disc=sub*discPct/100;
  document.getElementById('qt-sub').textContent=rp(sub);
  document.getElementById('qt-tax-amt').textContent=rp(disc);
  document.getElementById('qt-total').textContent=rp(sub-disc);
}
function saveQuote(){
  const cid=document.getElementById('qt-client').value;
  if(!cid){alert('Select a client');return}
  const validItems=qtItems.filter(it=>it&&it.desc&&it.price>0);
  if(!validItems.length){alert('Add at least one line item');return}
  const sub=validItems.reduce((s,it)=>s+(it.qty*it.price),0);
  const discPct=parseFloat(document.getElementById('qt-tax').value)||0;
  const disc=sub*discPct/100;
  const total=sub-disc;
  const category=document.getElementById('qt-category').value;
  const secondVal=document.getElementById('qt-project').value;
  const studentId=document.getElementById('qt-student-id')?.value||null;

  const newQ={
    id:DB.nextId.i++,
    clientId:parseInt(cid),
    category,
    type:'quote',
    status:'Awaiting Approval',
    items:[...validItems],
    subtotal:sub,
    taxPct:discPct,
    tax:disc,
    total,
    due:document.getElementById('qt-due').value,
    notes:document.getElementById('qt-notes').value,
    createdBy:currentUser,
    createdAt:new Date().toISOString()
  };

  // Link second dropdown value to the correct field based on category
  if(secondVal){
    const sid=parseInt(secondVal);
    if(category==='Rental')       newQ.bookingId=sid;
    else if(category==='Academy') newQ.classId=sid;
    else                          newQ.projectId=sid;
  }
  // Link student if Academy
  if(category==='Academy'&&studentId) newQ.studentId=parseInt(studentId);

  // Link to booking if opened via createBookingQuote (dataset.bookingId takes priority)
  var mqEl=document.getElementById('modal-quote');
  if(mqEl&&mqEl.dataset.bookingId){newQ.bookingId=parseInt(mqEl.dataset.bookingId);delete mqEl.dataset.bookingId;}

  DB.invoices.push(newQ);

  // Auto-update linked project value
  if(newQ.projectId){
    const proj=DB.projects.find(p=>p.id===newQ.projectId);
    if(proj){proj.value=DB.invoices.filter(i=>i.projectId===newQ.projectId&&i.type==='quote').reduce((s,i)=>s+i.total,0);}
  }
  // Notify all other users to approve
  const qNum=`QT-${String(newQ.id).padStart(4,'0')}`;
  USERS.forEach(u=>{
    if(u.id!==currentUser){
      addNotification(u.id,`${getUserName(currentUser)} created ${qNum} (${rp(total)}) — waiting for your approval`,'quote',newQ.id);
    }
  });
  closeModal('modal-quote');triggerSaveWithFeedback('Saving quote…');renderPage(_currentPage);renderDash();
}

function onTxCatChange(){
  const sel=document.getElementById('tx-cat');
  const wrap=document.getElementById('tx-custom-cat-wrap');
  if(wrap)wrap.style.display=sel&&sel.value==='Custom...'?'':'none';
  // Show booking picker when category = Rental
  const bwrap=document.getElementById('tx-booking-wrap');
  if(bwrap){
    if(sel&&sel.value==='Rental'){
      bwrap.style.display='';
      var bsel=document.getElementById('tx-booking');
      if(bsel)bsel.innerHTML='<option value="">— None —</option>'+DB.rentals.map(function(r){var c=DB.clients.find(function(cl){return cl.id===r.clientId;});return '<option value="'+r.id+'">BK-'+String(r.id).padStart(4,'0')+' — '+(c?c.name:'?')+'</option>';}).join('');
    } else {
      bwrap.style.display='none';
    }
  }
}
function openTransactionModal(type){
  openModal('modal-transaction');
  const sel=document.getElementById('tx-type');
  if(sel&&type)sel.value=type;
}
function saveTransaction(){
  const desc=document.getElementById('tx-desc').value.trim();
  const amt=getAmtVal('tx-amount');
  const bank=document.getElementById('tx-bank').value;
  if(!desc||!amt){alert('Fill description and amount');return}
  if(!bank){alert('Please select a bank account');return}
  const type=document.getElementById('tx-type').value;
  const catSel=document.getElementById('tx-cat').value;
  const cat=catSel==='Custom...'?(document.getElementById('tx-custom-cat')?.value.trim()||'Other'):catSel;
  const tx={id:DB.nextId.tx++,description:desc,amount:amt,type,category:cat,division:document.getElementById('tx-div').value,bank,date:document.getElementById('tx-date').value,clientId:document.getElementById('tx-client')?.value?parseInt(document.getElementById('tx-client').value):null,projectId:document.getElementById('tx-project')?.value?parseInt(document.getElementById('tx-project').value):null,bookingId:(document.getElementById('tx-booking')?.value?parseInt(document.getElementById('tx-booking').value):null),createdAt:new Date().toISOString()};
  DB.transactions.push(tx);
  addFinanceLog('Added','Transaction',`${desc} (${type})`,amt);addActivityLog('Transaction','Added',`${desc} (${type})`,'finance');
  ['tx-desc','tx-amount'].forEach(id=>{const el=document.getElementById(id);if(el){el.value='';el.dataset.raw='';}});
  document.getElementById('tx-bank').value='';
  closeModal('modal-transaction');triggerSaveWithFeedback('Saving transaction…');renderPage(_currentPage);
}

function calcPayrollTotal(){
  const fees=['py-op-fee','py-bpjs','py-proj-fee','py-food'].reduce((s,id)=>s+getAmtVal(id),0);
  const el=document.getElementById('py-amount');
  if(!el)return;
  el.dataset.raw=String(fees);
  el.value=fees?fees.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
}

function savePayroll(){
  const user=document.getElementById('py-user').value;
  const bank=document.getElementById('py-bank').value;
  const month=document.getElementById('py-period').value;
  const year=document.getElementById('py-year').value||new Date().getFullYear();
  const period=`${month} ${year}`;
  const fees={
    operational:getAmtVal('py-op-fee')||0,
    bpjs:getAmtVal('py-bpjs')||0,
    project:getAmtVal('py-proj-fee')||0,
    food:getAmtVal('py-food')||0
  };
  const amt=Object.values(fees).reduce((s,v)=>s+v,0);
  if(!amt||!bank||!month){alert('Fill at least one fee amount, month, and bank account');return}
  const now=new Date().toISOString().slice(0,10);
  const py={id:DB.nextId.py++,userId:user,amount:amt,period,bank,date:now,fees,notes:document.getElementById('py-notes').value,status:'Awaiting Approval',createdAt:new Date().toISOString()};
  DB.payrolls.push(py);
  // Notify Bil (approver) if not Bil
  if(currentUser!=='bil'){addNotification('bil',`${getUserName(currentUser)} submitted payroll for ${getUserName(user)}: ${rp(amt)} (${period})`,'payroll',py.id);}
  addFinanceLog('Added','Payroll',`${getUserName(user)} — ${period}`,amt);
  ['py-op-fee','py-bpjs','py-proj-fee','py-food'].forEach(id=>{const el=document.getElementById(id);if(el){el.value='';el.dataset.raw='';}});
  calcPayrollTotal();
  closeModal('modal-payroll');triggerSaveWithFeedback('Saving payroll…');renderPage(_currentPage);
}
function markPayrollPaid(id){
  const py=DB.payrolls.find(x=>x.id===id);if(!py)return;
  py.status='Paid';
  py.paidAt=new Date().toISOString();
  // Now deduct from bank
  const acc=DB.bankAccounts.find(a=>a.id===py.bank);if(acc)acc.balance-=py.amount;
  // Also log transaction
  DB.transactions.push({id:DB.nextId.tx++,description:`Payroll — ${getUserName(py.userId)} (${py.period})`,amount:py.amount,type:'Expense',category:'Salary',division:'Domestic',bank:py.bank,date:new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()});
  addNotification(py.userId,`Your payroll for ${py.period} (${rp(py.amount)}) has been paid`,'payroll',py.id);
  addFinanceLog('Paid','Payroll',`${getUserName(py.userId)} — ${py.period}`,py.amount);
  saveDBFn();renderPage(_currentPage);
}
function saveDebt(){
  const desc=document.getElementById('dt-desc').value.trim();
  const amt=getAmtVal('dt-amount');
  if(!desc||!amt){alert('Fill description and amount');return}
  DB.debts.push({id:DB.nextId.dt++,description:desc,amount:amt,type:document.getElementById('dt-type').value,party:document.getElementById('dt-party').value,label:document.getElementById('dt-label')?.value||'Studio',due:document.getElementById('dt-due').value,notes:document.getElementById('dt-notes').value,status:'Outstanding',createdAt:new Date().toISOString()});
  addFinanceLog('Added','Debt',`${desc} (${document.getElementById('dt-type').value})`,amt);
  ['dt-desc','dt-amount','dt-party','dt-due','dt-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  closeModal('modal-debt');triggerSaveWithFeedback('Saving debt…');renderPage(_currentPage);
}
function markDebtPaid(id){
  const dt=DB.debts.find(x=>x.id===id);if(!dt)return;
  const remaining=dt.remainingAmount!==undefined?dt.remainingAmount:dt.amount;
  document.getElementById('settle-debt-id').value=id;
  document.getElementById('settle-amount').value='';
  document.getElementById('settle-bank').value='bca';
  document.getElementById('settle-debt-info').innerHTML=
    `<div style="font-weight:600;margin-bottom:4px">${dt.description}</div>`+
    `<div style="color:var(--text3)">Party: ${dt.party||'—'} &nbsp;·&nbsp; Original: ${rp(dt.amount)}</div>`+
    `<div style="color:var(--red);font-weight:600;margin-top:4px">Remaining: ${rp(remaining)}</div>`;
  openModal('modal-settle-debt');
}
function confirmSettleDebt(){
  const id=parseInt(document.getElementById('settle-debt-id').value);
  const dt=DB.debts.find(x=>x.id===id);if(!dt)return;
  const settle=getAmtVal('settle-amount');
  const bank=document.getElementById('settle-bank').value;
  if(!settle||settle<=0){alert('Enter a valid amount');return}
  const remaining=dt.remainingAmount!==undefined?dt.remainingAmount:dt.amount;
  const today=new Date().toISOString().slice(0,10);
  if(!dt.settlements)dt.settlements=[];
  dt.settlements.push({amount:settle,date:today,by:currentUser,bank});
  if(settle>=remaining){
    dt.status='Settled';
    dt.remainingAmount=0;
    dt.settledAt=new Date().toISOString();
  } else {
    dt.remainingAmount=remaining-settle;
    dt.status='Partially Settled';
  }
  // Auto-log as expense
  const acc=DB.bankAccounts.find(a=>a.id===bank);
  if(acc)acc.balance-=settle;
  DB.transactions.push({id:DB.nextId.tx++,description:`Debt Settlement — ${dt.description} (${dt.party||''})`,amount:settle,type:'Expense',category:'Debt Payment',division:dt.label||'Studio',bank,date:today,createdAt:new Date().toISOString()});
  addFinanceLog('Settled','Debt',`${dt.description} — ${dt.party||'—'} (${dt.status})`,settle);
  closeModal('modal-settle-debt');triggerSaveWithFeedback('Saving settlement…');renderPage(_currentPage);
}
function saveDomestic(){
  const name=document.getElementById('dom-name').value.trim();
  if(!name){alert('Task name required');return}
  const assignee=document.getElementById('dom-assign').value;
  const dueDate=document.getElementById('dom-due').value||'';
  const status=document.getElementById('dom-status').value||'To Do';
  const description=document.getElementById('dom-desc')?.value.trim()||'';
  DB.domestics.push({id:DB.nextId.dm++,name,assignee,priority:domPriority,dueDate,status,description,createdAt:new Date().toISOString()});
  addNotification(assignee,`${getUserName(currentUser)} assigned you a domestic task: "${name}"`,'domestic',DB.nextId.dm-1);
  document.getElementById('dom-name').value='';document.getElementById('dom-due').value='';
  domPriority='normal';domDueMode=null;
  closeModal('modal-domestic');triggerSaveWithFeedback('Saving task…');renderPage(_currentPage);
}

function saveClass(){
  const name=document.getElementById('ac-name').value.trim();
  if(!name){alert('Class name required');return}
  const instructor=document.getElementById('ac-instructor').value;
  if(!instructor){alert('Select an instructor');return}
  const fee=parseFloat(document.getElementById('ac-fee')?.value)||0;
  const batchNo=parseInt(document.getElementById('ac-batch-no')?.value)||1;
  const totalMeet=parseInt(document.getElementById('ac-total-meet')?.value)||0;
  if(!totalMeet){alert('Enter total meet for this class');return}
  const sched=document.getElementById('ac-sched').value;
  const time=document.getElementById('ac-time')?.value||'';
  const notes=document.getElementById('ac-notes')?.value||'';
  const durVal=document.getElementById('ac-dur')?.value||'1';
  const duration=durVal==='custom'?(parseFloat(document.getElementById('ac-dur-custom')?.value)||1):parseFloat(durVal);
  const relatedStudents=[...document.querySelectorAll('#ac-students-pick .assign-opt.sel')].map(e=>parseInt(e.dataset.sid)).filter(Boolean);
  const schedDisplay=sched?(sched+(time?' '+time:'')):'TBD';
  const cls={id:DB.nextId.ac++,name,instructor,fee,schedule:schedDisplay,schedDate:sched,schedTime:time,duration,relatedStudents,notes,students:relatedStudents.length,status:'Active',code:'',batchNo,totalMeet,completedMeet:0,createdAt:new Date().toISOString()};
  cls.code=typeof getClassCode==='function'?getClassCode(cls):`AC-${String(cls.id||0).padStart(4,'0')}`;
  DB.classes.push(cls);
  syncClassMeetProgress(cls.id);
  relatedStudents.forEach(sid=>{
    const s=(DB.students||[]).find(x=>x.id===sid);
    if(s)syncStudentFromClass(s.id);
  });
  // Auto-add to calendar
  if(sched){
    const instructorName=getInstructorName(instructor);
    DB.events.push({id:DB.nextId.ev++,title:`🎓 ${name} — ${instructorName}`,date:sched,time:time||'',duration,color:'var(--blue)',notes,createdBy:currentUser,createdAt:new Date().toISOString()});
  }
  ['ac-name','ac-fee','ac-total-meet','ac-sched','ac-time','ac-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  const batch=document.getElementById('ac-batch-no');if(batch)batch.value='1';
  const code=document.getElementById('ac-code');if(code)code.value='';
  const durPick=document.getElementById('ac-dur-pick');if(durPick){durPick.querySelectorAll('.assign-opt').forEach((o,i)=>o.classList.toggle('sel',i===0));}
  const durH=document.getElementById('ac-dur');if(durH)durH.value='1';
  const durCust=document.getElementById('ac-dur-custom');if(durCust){durCust.value='';durCust.style.display='none';}
  closeModal('modal-class');triggerSaveWithFeedback('Saving class…');renderPage(_currentPage);
}

function setClassStatus(id,status){
  const c=DB.classes.find(x=>x.id===id);if(!c)return;
  if(status==='Rescheduled'){
    const newDate=prompt('Enter new schedule date (YYYY-MM-DD or date/time):',c.schedule||'');
    if(newDate===null)return;
    c.schedule=newDate;
  }
  c.status=status;
  if(status==='Completed'){
    c.completedMeet=typeof getClassTotalMeet==='function'?getClassTotalMeet(c):Math.max(parseInt(c.totalMeet||c.duration||1,10)||1,1);
    if(typeof syncClassMeetProgress==='function')syncClassMeetProgress(c.id);
  } else if(typeof syncClassMeetProgress==='function'){
    syncClassMeetProgress(c.id);
  }
  saveDBFn();renderAcademy();
}
function viewClass(id){
  const c=DB.classes.find(x=>x.id===id);if(!c)return;
  const enrolled=(DB.students||[]).filter(s=>s.classId===id);
  const statusColor={Active:'pg_',Full:'pb_',Completed:'pp_',Cancelled:'pr_',Rescheduled:'pa_'};
  const meta=typeof getClassMeetProgress==='function'?getClassMeetProgress(c):{total:Math.max(parseInt(c.totalMeet||c.duration||1,10)||1,1),completed:parseInt(c.completedMeet||0,10)||0,pct:0};
  document.getElementById('detail-title').textContent=c.name;
  document.getElementById('detail-body').innerHTML=`
    <div class="two" style="margin-bottom:12px">
      <div><div class="fl">Instructor</div><div style="font-size:12px">${getInstructorName(c.instructor)}</div></div>
      <div><div class="fl">Status</div><div style="margin-top:4px"><span class="pill ${statusColor[c.status]||'pg_'}">${c.status}</span></div></div>
    </div>
    <div class="two" style="margin-bottom:12px">
      <div><div class="fl">Schedule</div><div style="font-size:12px">${c.schedule||'—'}</div></div>
      <div><div class="fl">Class Code</div><div style="font-size:12px;font-family:monospace">${typeof getClassCode==='function'?getClassCode(c):(c.code||'—')}</div></div>
    </div>
    <div class="two" style="margin-bottom:12px">
      <div><div class="fl">Batch</div><div style="font-size:12px">${typeof getClassMeetLabel==='function'?getClassMeetLabel(c):`Batch ${c.batchNo||1} of ${meta.total}`}</div></div>
      <div><div class="fl">Students</div><div style="font-size:12px">${c.students||0}/${c.maxStudents}</div></div>
    </div>
    <div style="margin-bottom:12px">
      <div class="fl">Meet Progress</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
        <div style="flex:1;height:4px;background:var(--bg4);border-radius:2px"><div style="width:${meta.pct||0}%;height:100%;background:${(meta.pct||0)===100?'var(--green)':'var(--accent)'};border-radius:2px"></div></div>
        <span style="font-size:11px">${meta.completed}/${meta.total}</span>
      </div>
    </div>
    ${c.notes?`<div style="margin-bottom:12px"><div class="fl">Notes</div><div style="font-size:11px;color:var(--text2);margin-top:4px">${c.notes}</div></div>`:''}
    <div style="border-top:1px solid var(--border);padding-top:10px"><div class="fl" style="margin-bottom:8px">Enrolled Students (${enrolled.length})</div>
    ${enrolled.length?enrolled.map(s=>`<div class="lr"><div><div style="font-size:11px">${s.name}</div><div style="font-size:9px;color:var(--text3)">${(s.completedMeet||0)}/${s.totalMeetEnrolled||meta.total} meet${(s.totalMeetEnrolled||meta.total)!==1?'s':''} · ${s.progress||0}%</div></div><span class="pill ${s.status==='Graduate'?'pp_':s.status==='Active'?'pg_':'pa_'}">${s.status}</span></div>`).join(''):'<div style="font-size:11px;color:var(--text3)">No students enrolled.</div>'}
    </div>`;
  document.getElementById('detail-actions').innerHTML=`
    <button class="btn-o" onclick="closeModal('modal-detail')">Close</button>
    <button class="btn-o" style="border-color:var(--amber);color:var(--amber)" onclick="openEditClass(${c.id})">✎ Edit</button>
    <button class="btn" style="background:var(--accent)" onclick="createClassBatchInvoices(${c.id})">📄 Batch Invoice</button>
    ${meta.completed<meta.total?`<button class="btn" style="background:var(--green)" onclick="completeClassMeet(${c.id});closeModal('modal-detail')">✓ Meet</button>`:''}
    ${c.status==='Active'&&meta.completed>=meta.total?`<button class="btn" style="background:var(--green)" onclick="setClassStatus(${c.id},'Completed');closeModal('modal-detail')">✓ Complete</button>`:''}
    ${c.status==='Active'?`<button class="btn-danger" onclick="setClassStatus(${c.id},'Cancelled');closeModal('modal-detail')">✕ Cancel</button>`:''}`;
  openModal('modal-detail');
}
function buildSKU(){
  const brand=document.getElementById('pr-brand')?.value||'EXP';
  const cat=document.getElementById('pr-cat-code')?.value||'AP';
  const num=document.getElementById('pr-sku-num')?.value||'1';
  const skuEl=document.getElementById('pr-sku');
  if(skuEl)skuEl.value=`${brand}-${cat}-${String(num).padStart(3,'0')}`;
}
function saveProduct(){
  const name=document.getElementById('pr-name').value.trim();
  if(!name){alert('Product name required');return}
  const brand=document.getElementById('pr-brand')?.value||'EXP';
  const catCode=document.getElementById('pr-cat-code')?.value||'AP';
  const skuNum=parseInt(document.getElementById('pr-sku-num')?.value)||DB.products.length+1;
  const sku=`${brand}-${catCode}-${String(skuNum).padStart(3,'0')}`;
  DB.products.push({id:DB.nextId.pr++,name,unicode:document.getElementById('pr-unicode')?.value||'',brand,category:catCode,sku,year:parseInt(document.getElementById('pr-year')?.value)||new Date().getFullYear(),edition:document.getElementById('pr-edition')?.value||'',initialStock:parseInt(document.getElementById('pr-stock')?.value)||0,stock:parseInt(document.getElementById('pr-stock')?.value)||0,price:parseFloat(document.getElementById('pr-price')?.value)||0,memberPrice:parseFloat(document.getElementById('pr-member-price')?.value)||0,sold:0,status:'Active',createdAt:new Date().toISOString()});
  closeModal('modal-product');triggerSaveWithFeedback('Saving product…');renderMerch();
}

function saveDoc(){
  const title=document.getElementById('doc-title').value.trim();
  if(!title){alert('Title required');return}
  const projId=document.getElementById('doc-project')?.value?parseInt(document.getElementById('doc-project').value):null;
  const clientId=document.getElementById('doc-client-link')?.value?parseInt(document.getElementById('doc-client-link').value):null;
  const mentions=[...document.querySelectorAll('#doc-mention-pick .assign-opt.sel')].map(e=>e.dataset.uid);
  const proj=projId?DB.projects.find(p=>p.id===projId):null;
  const client=clientId?DB.clients.find(c=>c.id===clientId):null;
  const related=[proj?.name,client?.name].filter(Boolean).join(', ')||'';
  const doc={id:DB.nextId.dc++,title,type:document.getElementById('doc-type').value,related,projectId:projId,clientId,mentions,content:document.getElementById('doc-content').value,status:document.getElementById('doc-status-new')?.value||'Draft',createdBy:currentUser,createdAt:new Date().toISOString()};
  DB.docs.push(doc);
  // Notify mentioned users
  mentions.forEach(uid=>{addNotification(uid,`${getUserName(currentUser)} mentioned you in doc: "${title}"`, 'doc',doc.id);});
  ['doc-title','doc-content'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  closeModal('modal-doc');triggerSaveWithFeedback('Saving document…');renderPage(_currentPage);
}

let _evAllDay=false;
function setEventAllDay(allDay){
  _evAllDay=allDay;
  document.getElementById('ev-allday-no').classList.toggle('sel',!allDay);
  document.getElementById('ev-allday-yes').classList.toggle('sel',allDay);
  const tw=document.getElementById('ev-time-wrap');
  if(tw)tw.style.display=allDay?'none':'';
}
function saveEvent(){
  const title=document.getElementById('ev-title').value.trim();
  if(!title){alert('Title required');return}
  const durSel=document.getElementById('ev-dur')?.value||'1';
  const dur=durSel==='custom'?(parseFloat(document.getElementById('ev-custom-dur')?.value)||1):parseFloat(durSel);
  const editId=document.getElementById('ev-edit-id')?.value;
  const payload={title,date:document.getElementById('ev-date').value,time:_evAllDay?'':document.getElementById('ev-time').value,allDay:_evAllDay,duration:dur,color:document.getElementById('ev-color').value,type:document.getElementById('ev-type')?.value||'',label:document.getElementById('ev-label')?.value||'',notes:document.getElementById('ev-notes')?.value||''};
  if(editId){
    const idx=DB.events.findIndex(e=>e.id===parseInt(editId));
    if(idx>-1){DB.events[idx]={...DB.events[idx],...payload};}
  } else {
    DB.events.push({id:DB.nextId.ev++,...payload,createdBy:currentUser,createdAt:new Date().toISOString()});
  }
  ['ev-title','ev-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  if(document.getElementById('ev-edit-id'))document.getElementById('ev-edit-id').value='';
  _evAllDay=false;
  closeModal('modal-event');triggerSaveWithFeedback('Saving event…');renderPage(_currentPage);
}

function saveSettings(){
  DB.settings.name=document.getElementById('set-name').value;
  DB.settings.email=document.getElementById('set-email').value;
  DB.settings.phone=document.getElementById('set-phone').value;
  DB.settings.npwp=document.getElementById('set-npwp').value;
  saveDBFn();alert('Settings saved!');
}

// ════════ PROJECT PROGRESS (auto from tasks) ════════
function calcProjectProgress(projId){
  const tasks=DB.tasks.filter(t=>t.projectId===projId);
  const feedbacks=(DB.feedbacks||[]).filter(f=>f.projectId===projId);
  const total=tasks.length+feedbacks.length;
  if(!total)return 0;
  const done=tasks.filter(t=>t.status==='Done').length+feedbacks.filter(f=>f.status==='Done').length;
  return Math.round(done/total*100);
}
function syncProjectProgress(projId){
  if(!projId)return;
  const proj=DB.projects.find(p=>p.id===projId);
  if(proj){proj.progress=calcProjectProgress(projId);saveDBFn();}
}
// ════════ PROJECT VALUE (auto from linked quotes) ════════
function calcProjectValue(projId){
  return DB.invoices.filter(i=>i.projectId===projId&&i.type==='quote').reduce((s,i)=>s+(i.total||0),0);
}
function recalcAllProjectValues(){
  DB.projects.forEach(p=>{
    const qs=DB.invoices.filter(i=>i.projectId===p.id&&i.type==='quote');
    if(qs.length>0) p.value=qs.reduce((s,i)=>s+(i.total||0),0);
  });
}
function approveQuote(id){
  const q=DB.invoices.find(i=>i.id===id);if(!q)return;
  q.status='Approved';
  // notify creator and all team
  const qNum=`${typeof getInvNum!=='undefined'?getInvNum(q):'QT-'+String(q.id).padStart(4,'0')}`;
  USERS.forEach(u=>{
    if(u.id!==currentUser){
      addNotification(u.id,`${getUserName(currentUser)} approved ${qNum} — invoice can now be created`,'quote',q.id);
    }
  });
  addActivityLog('Quote','Approved',qNum,'invoice');triggerSaveWithFeedback('Approving quote…');renderPage(_currentPage);renderDash();closeModal('modal-detail');
}
function rejectQuote(id){
  const q=DB.invoices.find(i=>i.id===id);if(!q)return;
  q.status='Rejected';
  const qNum=`${typeof getInvNum!=='undefined'?getInvNum(q):'QT-'+String(q.id).padStart(4,'0')}`;
  USERS.forEach(u=>{
    if(u.id!==currentUser){
      addNotification(u.id,`${getUserName(currentUser)} rejected ${qNum}`,'quote',q.id);
    }
  });
  addActivityLog('Quote','Rejected',qNum,'invoice');triggerSaveWithFeedback('Rejecting quote…');renderPage(_currentPage);renderDash();closeModal('modal-detail');
}
function convertToInvoice(id){
  const q=DB.invoices.find(i=>i.id===id);if(!q)return;
  if(q.status==='Awaiting Approval'){alert('⚠ This quote is still Awaiting Approval. Dissa or Aldi must approve it before converting to invoice.');return}
  if(q.status==='Rejected'){alert('This quote was rejected and cannot be converted.');return}
  openTerminModal(id);
}
// ── Date shortcuts for transaction modal ──
function setTxDate(mode,el){
  document.querySelectorAll('#tx-date-pick .assign-opt').forEach(b=>b.classList.remove('sel'));
  if(el)el.classList.add('sel');
  const inp=document.getElementById('tx-date');
  const d=new Date();
  if(mode==='yesterday'){d.setDate(d.getDate()-1);inp.value=d.toISOString().slice(0,10);inp.style.display='none';}
  else if(mode==='today'){inp.value=new Date().toISOString().slice(0,10);inp.style.display='none';}
  else if(mode==='tomorrow'){d.setDate(d.getDate()+1);inp.value=d.toISOString().slice(0,10);inp.style.display='none';}
  else{inp.style.display='';inp.focus();}
}
// ── Make Invoice from Edit Quote modal ──
function makeInvoiceFromEditQuote(){
  const id=parseInt(document.getElementById('ei-id').value);
  closeModal('modal-edit-invoice');
  convertToInvoice(id);
}
// ── Notification Center click handler ──
function ncHandleNotif(id){
  const n=DB.notifications.find(x=>x.id===id);if(!n)return;
  n.read=true;saveDBFn();updateNotifCount();
  closeModal('modal-notif-panel');
  if(n.type==='quote'||n.type==='invoice'){nav('invoices');setTimeout(()=>n.refId&&viewInvoice(n.refId),200)}
  else if(n.type==='task'){nav('studio');setTimeout(()=>n.refId&&openEditTask(n.refId),200)}
  else if(n.type==='domestic'){nav('domestic');setTimeout(()=>n.refId&&openEditDomestic(n.refId),200)}
  else if(n.type==='project'){nav('studio');setTimeout(()=>n.refId&&viewProject(n.refId),200)}
  else if(n.type==='feedback'){nav('studio');setTimeout(()=>n.refId&&typeof viewFeedback==='function'&&viewFeedback(n.refId),200)}
  else if(n.type==='journal'){nav('journal');setTimeout(()=>n.refId&&viewJournal(n.refId),200)}
  else if(n.type==='doc'){nav('docs');setTimeout(()=>n.refId&&typeof viewDoc==='function'&&viewDoc(n.refId),200)}
  else if(n.type==='leave'){nav('domestic')}
  else if(n.type==='payroll'){nav('finance')}
  else if(n.type==='food'){nav('domestic')}
  else if(n.type==='reimburse'){nav('domestic')}
  else if(n.type==='reminder'){nav('invoices');setTimeout(()=>n.refId&&viewInvoice(n.refId),200)}
  else{nav('dashboard')}
  setTimeout(()=>renderDashContent(),300);
}
let _terminQuoteId=null;
function openTerminModal(id){
  const q=DB.invoices.find(i=>i.id===id);if(!q)return;
  _terminQuoteId=id;
  document.getElementById('termin-quote-id').value=id;
  const c=DB.clients.find(cl=>cl.id===q.clientId);
  const num=getInvNum(q);
  document.getElementById('termin-quote-info').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:12px;font-weight:600;color:var(--accent)">${num}</div><div style="color:var(--text2);margin-top:2px">${c?c.name:'—'} · ${q.category||'Studio'}</div></div><div style="font-size:16px;font-weight:700;color:var(--green)">${rp(q.total)}</div></div>`;
  document.querySelectorAll('[name=termin-type]').forEach(r=>r.checked=r.value==='1');
  const el=document.getElementById('t2-dp-pct');if(el)el.value=50;
  const el3a=document.getElementById('t3-dp-pct');if(el3a)el3a.value=30;
  const el3b=document.getElementById('t3-p2-pct');if(el3b)el3b.value=40;
  termUpdate();
  openModal('modal-invoice-termin');
}
function termUpdate(){
  const q=DB.invoices.find(i=>i.id===_terminQuoteId);if(!q)return;
  const rads=document.querySelectorAll('[name=termin-type]');
  let type=1;
  rads.forEach(r=>{if(r.checked)type=parseInt(r.value);});
  const total=q.total;
  ['full','2','3'].forEach(v=>{
    const el=document.getElementById('termin-opt-'+(v==='full'?'full':v));
    if(!el)return;
    const isActive=(v==='full'?type===1:parseInt(v)===type);
    el.classList.toggle('sel',isActive);
  });
  const p2=document.getElementById('termin-2-pct');if(p2)p2.style.display=type===2?'flex':'none';
  const p3=document.getElementById('termin-3-pct');if(p3)p3.style.display=type===3?'flex':'none';
  let breakdown='';
  if(type===1){
    breakdown=`<div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">Full Payment Invoice</span><span style="font-weight:600;color:var(--green)">${rp(total)}</span></div>`;
  }else if(type===2){
    const dp=Math.min(99,Math.max(1,parseInt(document.getElementById('t2-dp-pct').value)||50));
    const fin=100-dp;
    document.getElementById('t2-fin-pct').value=fin;
    const dpAmt=Math.round(total*dp/100);
    const finAmt=total-dpAmt;
    breakdown=`<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--text2)">Invoice 1 — DP (${dp}%)</span><span style="font-weight:600;color:var(--amber)">${rp(dpAmt)}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">Invoice 2 — Pelunasan (${fin}%)</span><span style="font-weight:600;color:var(--green)">${rp(finAmt)}</span></div>`;
  }else if(type===3){
    const dp=Math.min(98,Math.max(1,parseInt(document.getElementById('t3-dp-pct').value)||30));
    const p2v=Math.min(98,Math.max(1,parseInt(document.getElementById('t3-p2-pct').value)||40));
    const fin=100-dp-p2v;
    document.getElementById('t3-fin-pct').value=Math.max(1,fin);
    const dpAmt=Math.round(total*dp/100);
    const p2Amt=Math.round(total*p2v/100);
    const finAmt=total-dpAmt-p2Amt;
    breakdown=`<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--text2)">Invoice 1 — DP (${dp}%)</span><span style="font-weight:600;color:var(--amber)">${rp(dpAmt)}</span></div><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--text2)">Invoice 2 — Pembayaran 2 (${p2v}%)</span><span style="font-weight:600;color:var(--blue)">${rp(p2Amt)}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">Invoice 3 — Pelunasan (${fin}%)</span><span style="font-weight:600;color:var(--green)">${rp(finAmt)}</span></div>${dp+p2v>=100?'<div style="color:var(--red);font-size:10px;margin-top:6px">⚠ DP + Pembayaran 2 must total less than 100%</div>':''}`;
  }
  const bd=document.getElementById('termin-breakdown');if(bd)bd.innerHTML=breakdown;
}
function confirmTerminInvoice(){
  const id=_terminQuoteId;
  const q=DB.invoices.find(i=>i.id===id);if(!q)return;
  const rads=document.querySelectorAll('[name=termin-type]');
  let type=1;
  rads.forEach(r=>{if(r.checked)type=parseInt(r.value);});
  const total=q.total;
  const now=new Date().toISOString();
  q.status='Accepted';
  // Strip _uuid so each new termin invoice gets a fresh UUID assigned server-side.
  // Without this, all spread copies inherit the same _uuid from the source quote,
  // causing Supabase to throw "ON CONFLICT DO UPDATE command cannot affect row a second time".
  const {_uuid:_dropUuid,...qBase}=q;
  if(type===1){
    const due1=document.getElementById('termin-date-1')?.value||'';
    DB.invoices.push({...qBase,id:DB.nextId.i++,type:'invoice',status:'Awaiting Approval',terminNote:'',due:due1||q.due,createdAt:now});
  }else if(type===2){
    const dp=Math.min(99,Math.max(1,parseInt(document.getElementById('t2-dp-pct').value)||50));
    const fin=100-dp;
    const dpAmt=Math.round(total*dp/100);
    const finAmt=total-dpAmt;
    const dueDp=document.getElementById('termin-date-dp')?.value||'';
    const due2=document.getElementById('termin-date-2')?.value||'';
    DB.invoices.push({...qBase,id:DB.nextId.i++,type:'invoice',status:'Awaiting Approval',total:dpAmt,terminNote:`DP — ${dp}%`,due:dueDp||q.due,quoteId:id,createdAt:now});
    DB.invoices.push({...qBase,id:DB.nextId.i++,type:'invoice',status:'Awaiting Approval',total:finAmt,terminNote:`Pelunasan — ${fin}%`,due:due2||q.due,quoteId:id,createdAt:now});
  }else if(type===3){
    const dp=Math.min(98,Math.max(1,parseInt(document.getElementById('t3-dp-pct').value)||30));
    const p2v=Math.min(98,Math.max(1,parseInt(document.getElementById('t3-p2-pct').value)||40));
    const fin=100-dp-p2v;
    if(fin<=0){alert('⚠ DP + Pembayaran 2 cannot exceed 100%');return;}
    const dpAmt=Math.round(total*dp/100);
    const p2Amt=Math.round(total*p2v/100);
    const finAmt=total-dpAmt-p2Amt;
    const dueDpT3=document.getElementById('termin-date-t3-dp')?.value||'';
    const dueP2T3=document.getElementById('termin-date-t3-p2')?.value||'';
    const dueFinT3=document.getElementById('termin-date-t3-fin')?.value||'';
    DB.invoices.push({...qBase,id:DB.nextId.i++,type:'invoice',status:'Awaiting Approval',total:dpAmt,terminNote:`DP — ${dp}%`,due:dueDpT3||q.due,quoteId:id,createdAt:now});
    DB.invoices.push({...qBase,id:DB.nextId.i++,type:'invoice',status:'Awaiting Approval',total:p2Amt,terminNote:`Pembayaran 2 — ${p2v}%`,due:dueP2T3||q.due,quoteId:id,createdAt:now});
    DB.invoices.push({...qBase,id:DB.nextId.i++,type:'invoice',status:'Awaiting Approval',total:finAmt,terminNote:`Pelunasan — ${fin}%`,due:dueFinT3||q.due,quoteId:id,createdAt:now});
  }
  closeModal('modal-invoice-termin');triggerSaveWithFeedback('Saving invoice…');renderInvoices();renderDash();
}
function markPaid(id){
  const inv=DB.invoices.find(i=>i.id===id);if(inv){
    inv.status='Paid';
    // Auto-log income transaction
    const c=DB.clients.find(cl=>cl.id===inv.clientId);
    const num=`INV-${String(inv.id).padStart(4,'0')}`;
    DB.transactions.push({
      id:DB.nextId.tx++,
      description:`${num} — ${c?c.name:'Client'} (Auto from Invoice)`,
      amount:inv.total,
      type:'Income',
      category:inv.category||'Studio Booking',
      division:inv.category||'Studio',
      bank:'bca', // default; user can edit
      date:new Date().toISOString().slice(0,10),
      createdAt:new Date().toISOString()
    });
    const acc=DB.bankAccounts.find(a=>a.id==='bca');if(acc)acc.balance+=inv.total;
    addActivityLog('Invoice','Paid',num,'invoice');saveDBFn();renderInvoices();renderDash();
  }
}
function markReturned(id){const r=DB.rentals.find(r=>r.id===id);if(r){r.status='Returned';saveDBFn();renderRentals();renderDash()}}

// ═══ EDIT BOOKING ═══
var editBookingItems=[];
function openEditBooking(id){
  var r=DB.rentals.find(function(x){return x.id===id;});if(!r)return;
  document.getElementById('eb-id').value=id;
  // Populate client dropdown
  var sel=document.getElementById('eb-client');
  sel.innerHTML=DB.clients.map(function(c){return '<option value="'+c.id+'">'+c.name+'</option>';}).join('');
  sel.value=r.clientId;
  document.getElementById('eb-status').value=r.status;
  document.getElementById('eb-start').value=r.start||'';
  document.getElementById('eb-duration').value=r.durationType||'custom';
  document.getElementById('eb-return').value=r.returnDate||'';
  document.getElementById('eb-return-wrap').style.display=(r.durationType==='custom')?'block':'none';
  document.getElementById('eb-address').value=r.address||'';
  document.getElementById('eb-contact-name').value=r.contactName||'';
  document.getElementById('eb-contact-phone').value=r.contactPhone||'';
  document.getElementById('eb-notes').value=r.notes||'';

  // Crew / Delivery
  pickEditBookingOpt('crew',r.crew?'yes':'no');
  pickEditBookingOpt('delivery',r.delivery?'yes':'no');

  // Crew assignment
  _populateCrewPicker('eb-crew-pick',r.crewIds||[]);
  document.getElementById('eb-crew-assign-wrap').style.display=r.crew?'':'none';

  // Items
  editBookingItems=[];
  var itemsEl=document.getElementById('eb-items');itemsEl.innerHTML='';
  (r.items||[]).forEach(function(it){
    var idx=editBookingItems.length;
    editBookingItems.push({name:it.name,qty:it.qty||1,price:it.price||0});
    _addEditBookingItemRow(idx,it);
  });
  if(!editBookingItems.length) addEditBookingItem();

  openModal('modal-edit-booking');
}
function _addEditBookingItemRow(idx,it){
  var d=document.getElementById('eb-items');
  var row=document.createElement('div');row.style.cssText='display:flex;gap:6px;margin-bottom:6px;align-items:center';
  var invOpts=(DB.inventoryItems||[]).map(function(i){return '<option value="'+i.name+'"'+(it&&it.name===i.name?' selected':'')+'>'+i.name+' ('+i.category+')</option>';}).join('');
  row.innerHTML='<select class="fi" style="flex:2" onchange="editBookingItems['+idx+'].name=this.value"><option value="">— Select —</option>'+invOpts+'</select>'+
    '<input class="fi" style="width:50px" type="number" value="'+(it?it.qty:1)+'" min="1" oninput="editBookingItems['+idx+'].qty=+this.value"/>'+
    '<input class="fi" style="width:100px" type="text" inputmode="numeric" placeholder="Price" value="'+(it&&it.price?it.price.toLocaleString('en-US'):'')+'" oninput="var r=this.value.replace(/,/g,\'\').replace(/[^0-9]/g,\'\');editBookingItems['+idx+'].price=parseInt(r)||0;this.value=r?parseInt(r).toLocaleString(\'en-US\'):\'\';"/>'+
    '<button onclick="this.parentElement.remove();editBookingItems['+idx+']=null;" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0 4px">✕</button>';
  d.appendChild(row);
}
function addEditBookingItem(){
  var idx=editBookingItems.length;
  editBookingItems.push({name:'',qty:1,price:0});
  _addEditBookingItemRow(idx,null);
}
function pickEditBookingOpt(type,val){
  if(type==='crew'){
    document.getElementById('eb-crew').value=val;
    document.getElementById('eb-crew-no').classList.toggle('sel',val==='no');
    document.getElementById('eb-crew-yes').classList.toggle('sel',val==='yes');
    var cw=document.getElementById('eb-crew-assign-wrap');if(cw)cw.style.display=val==='yes'?'':'none';
  } else {
    document.getElementById('eb-delivery').value=val;
    document.getElementById('eb-del-no').classList.toggle('sel',val==='no');
    document.getElementById('eb-del-yes').classList.toggle('sel',val==='yes');
  }
}
function applyEditBookingDuration(){
  var dur=document.getElementById('eb-duration').value;
  var wrap=document.getElementById('eb-return-wrap');
  if(dur==='custom'){wrap.style.display='block';return;}
  wrap.style.display='none';
  var start=document.getElementById('eb-start').value;
  if(start){
    var d=new Date(start);
    d.setHours(d.getHours()+parseInt(dur));
    document.getElementById('eb-return').value=d.toISOString().slice(0,10);
  }
}
function updateBooking(){
  var id=parseInt(document.getElementById('eb-id').value);
  var r=DB.rentals.find(function(x){return x.id===id;});if(!r)return;
  r.clientId=parseInt(document.getElementById('eb-client').value)||r.clientId;
  r.start=document.getElementById('eb-start').value;
  r.durationType=document.getElementById('eb-duration').value;
  r.returnDate=document.getElementById('eb-return').value;
  r.crew=document.getElementById('eb-crew').value==='yes';
  r.delivery=document.getElementById('eb-delivery').value==='yes';
  r.address=document.getElementById('eb-address').value.trim();
  r.contactName=document.getElementById('eb-contact-name').value.trim();
  r.contactPhone=document.getElementById('eb-contact-phone').value.trim();
  r.notes=document.getElementById('eb-notes').value.trim();
  r.crewIds=r.crew?_getSelectedCrewIds('eb-crew-pick'):[];

  // Status: manual Cancelled/Returned are honoured; otherwise derive from dates
  var manualStatus=document.getElementById('eb-status').value;
  r.status=(manualStatus==='Cancelled'||manualStatus==='Returned')
    ? manualStatus
    : (typeof _bookingStatus==='function' ? _bookingStatus(r) : manualStatus);

  // Items
  var validItems=editBookingItems.filter(function(it){return it&&it.name;});
  r.items=validItems.map(function(it){return{name:it.name,qty:it.qty||1,price:it.price||0};});
  if(validItems.length)r.equipment=validItems[0].name;

  // Recalc
  if(r.durationType!=='custom'){
    r.hours=parseInt(r.durationType)||null;
    r.days=Math.max(1,Math.round(r.hours/24));
  } else {
    r.days=Math.max(1,Math.round((new Date(r.returnDate)-new Date(r.start))/(864e5)));
    r.hours=null;
  }
  r.total=validItems.reduce(function(s,it){return s+(it.qty||1)*(it.price||0);},0);
  r.rate=r.total>0&&r.days>0?Math.round(r.total/r.days):0;

  closeModal('modal-edit-booking');triggerSaveWithFeedback('Updating booking…');renderPage(_currentPage);renderDash();
}

// ─── pickRentalOpt: show/hide crew picker ─────────────────────
var rentalCrewVal='no',rentalDeliveryVal='no';
function pickRentalOpt(el,type,val){
  if(type==='crew'){
    rentalCrewVal=val;
    document.getElementById('rn-crew').value=val;
    document.getElementById('rn-crew-no').classList.toggle('sel',val==='no');
    document.getElementById('rn-crew-yes').classList.toggle('sel',val==='yes');
    var cw=document.getElementById('rn-crew-assign-wrap');if(cw)cw.style.display=val==='yes'?'':'none';
  } else {
    rentalDeliveryVal=val;
    document.getElementById('rn-delivery').value=val;
    document.getElementById('rn-del-no').classList.toggle('sel',val==='no');
    document.getElementById('rn-del-yes').classList.toggle('sel',val==='yes');
  }
}
function quickProject(cid){openModal('modal-project');setTimeout(()=>{populateClientDropdowns();document.getElementById('pj-client').value=cid;const pjSearch=document.getElementById('pj-client-search');const cl=DB.clients.find(c=>c.id==cid);if(pjSearch&&cl)pjSearch.value=cl.name;},50)}
function quickQuote(cid,pid,opts){
  openModal('modal-quote');
  setTimeout(()=>{
    const options=opts&&typeof opts==='object'?opts:{};
    if(options.category){
      const catEl=document.getElementById('qt-category');
      if(catEl)catEl.value=options.category;
      if(typeof onQtCategoryChange==='function')onQtCategoryChange();
    }
    // Set client via search bar
    const cl=DB.clients.find(c=>c.id==cid);
    if(cl){
      const sel=document.getElementById('qt-client');
      if(sel){
        if(!Array.from(sel.options).find(o=>o.value==cl.id)){const opt=document.createElement('option');opt.value=cl.id;opt.text=cl.name;sel.appendChild(opt);}
        sel.value=cl.id;
      }
      const inp=document.getElementById('qt-client-search');if(inp)inp.value=cl.name;
    }
    if(options.category==='Academy'&&options.studentId){
      const sid=document.getElementById('qt-student-id');
      const sinp=document.getElementById('qt-student-search');
      const student=DB.students.find(s=>s.id===options.studentId);
      if(sid)sid.value=options.studentId;
      if(sinp&&student)sinp.value=student.name||'';
    }
    if(options.discountPct!==undefined){
      const disc=document.getElementById('qt-tax');
      if(disc)disc.value=options.discountPct;
    }
    if(options.notes){
      const notes=document.getElementById('qt-notes');
      if(notes)notes.value=options.notes;
    }
    setTimeout(()=>{
      if(pid){
        const second=document.getElementById('qt-project');
        if(second)second.value=pid;
      }
      if(options.items) setQtItems(options.items);
      calcQtTotal();
    },60);
    if(!options.category||options.category==='Studio'){
      filterProjectsByClient();
    }
  },60);
}

function cycleTaskStatus(id){
  const t=DB.tasks.find(x=>x.id===id);if(!t)return;
  const order=['To Do','In Progress','Done'];
  t.status=order[(order.indexOf(t.status)+1)%order.length];
  addActivityLog('Task',t.status,t.title,'task');syncProjectProgress(t.projectId);
  saveDBFn();
  if(_currentPage==='dashboard')renderDashContent();
  else renderPage(_currentPage);
}
function showTaskDetailAndStart(id){viewTask(id);}
function viewTask(id){
  const t=DB.tasks.find(x=>x.id===id);if(!t)return;
  const proj=DB.projects.find(p=>p.id===t.projectId);
  const statusColor={'To Do':'var(--text3)','In Progress':'var(--amber)','Done':'var(--green)'};
  const order=['To Do','In Progress','Done'];
  const idx=order.indexOf(t.status);
  const sc=statusColor[t.status]||'var(--text3)';
  document.getElementById('detail-title').textContent=t.title;
  document.getElementById('detail-body').innerHTML=`<div style="padding:14px 0 0"><div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap"><span style="background:${sc}22;color:${sc};border:1px solid ${sc}33;border-radius:4px;padding:2px 8px;font-size:9px;font-weight:600">${t.status}</span><span style="font-size:9px;color:${prioColor[t.priority]||'var(--blue)'};background:${prioColor[t.priority]||'var(--blue)'}22;border-radius:4px;padding:2px 8px">${t.priority}</span></div>${t.desc?`<div style="background:var(--bg3);border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:11px;color:var(--text2);line-height:1.6">${t.desc}</div>`:''}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">${proj?`<div style="background:var(--bg3);border-radius:6px;padding:8px"><div style="font-size:9px;color:var(--text3);margin-bottom:2px">PROJECT</div><div style="font-size:11px;color:var(--text2)">📁 ${proj.name}</div></div>`:''}${t.assignee?`<div style="background:var(--bg3);border-radius:6px;padding:8px"><div style="font-size:9px;color:var(--text3);margin-bottom:2px">ASSIGNEE</div><div style="font-size:11px;color:var(--text2)">👤 ${getUserName(t.assignee)}</div></div>`:''}${t.dueDate?`<div style="background:var(--bg3);border-radius:6px;padding:8px"><div style="font-size:9px;color:var(--text3);margin-bottom:2px">DUE DATE</div><div style="font-size:11px;color:var(--text2)">📅 ${fmtDate(t.dueDate)}</div></div>`:''}${t.createdBy?`<div style="background:var(--bg3);border-radius:6px;padding:8px"><div style="font-size:9px;color:var(--text3);margin-bottom:2px">CREATED BY</div><div style="font-size:11px;color:var(--text2)">${getUserName(t.createdBy)}</div></div>`:''}</div></div>`;
  document.getElementById('detail-actions').innerHTML=`<button class="btn-o" onclick="closeModal('modal-detail')">Close</button>${idx>0?`<button class="btn-o" style="color:${statusColor[order[idx-1]]}" onclick="moveTaskStatus(${t.id},'back');closeModal('modal-detail')">← ${order[idx-1]}</button>`:''} ${idx<2?`<button class="btn-o" style="color:${statusColor[order[idx+1]]}" onclick="moveTaskStatus(${t.id},'forward');closeModal('modal-detail')">→ ${order[idx+1]}</button>`:''} <button class="btn" onclick="closeModal('modal-detail');openEditTask(${t.id})">✎ Edit</button>`;
  openModal('modal-detail');
}
function moveTaskStatus(id,dir){
  const t=DB.tasks.find(x=>x.id===id);if(!t)return;
  const order=['To Do','In Progress','Done'];
  const idx=order.indexOf(t.status);
  t.status=dir==='forward'?order[Math.min(idx+1,2)]:order[Math.max(idx-1,0)];
  syncProjectProgress(t.projectId);saveDBFn();
  if(_currentPage==='dashboard')renderDashContent();else renderPage(_currentPage);
}
function setTaskInProgress(id){
  const t=DB.tasks.find(x=>x.id===id);if(!t)return;
  t.status='In Progress';syncProjectProgress(t.projectId);saveDBFn();closeModal('modal-detail');renderDash();renderPage(_currentPage);
}
function setTaskDone(id){
  const t=DB.tasks.find(x=>x.id===id);if(!t)return;
  t.status='Done';syncProjectProgress(t.projectId);saveDBFn();closeModal('modal-detail');renderDash();renderPage(_currentPage);
}
function deleteTask(id){
  const t=DB.tasks.find(x=>x.id===id);
  const taskTitle=t?.title||'Unknown task';
  const projId=t?t.projectId:null;
  DB.tasks=DB.tasks.filter(t=>t.id!==id);
  syncProjectProgress(projId);
  addActivityLog('Task','Deleted',taskTitle,'task');saveDBFn();renderPage(_currentPage);
}
function deleteTaskFromEdit(){
  const id=parseInt(document.getElementById('etk-id').value);
  if(!confirm('Delete this task?'))return;
  const t=DB.tasks.find(x=>x.id===id);
  const taskTitle=t?.title||'Unknown task';
  const projId=t?t.projectId:null;
  DB.tasks=DB.tasks.filter(t=>t.id!==id);
  syncProjectProgress(projId);
  addActivityLog('Task','Deleted',taskTitle,'task');closeModal('modal-edit-task');saveDBFn();renderPage(_currentPage);
}
function openEditTask(id){
  const t=DB.tasks.find(x=>x.id===id);if(!t)return;
  document.getElementById('etk-id').value=id;
  document.getElementById('etk-title').value=t.title;
  document.getElementById('etk-prio').value=t.priority;
  document.getElementById('etk-status').value=t.status;
  document.getElementById('etk-due').value=t.dueDate||'';
  setRTEValue('etk-desc',t.desc||'');
  const projSel=document.getElementById('etk-project');
  projSel.innerHTML='<option value="">— No Project —</option>'+DB.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  projSel.value=t.projectId||'';
  const assignSel=document.getElementById('etk-assign');
  assignSel.innerHTML=USERS.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  assignSel.value=t.assignee;
  openModal('modal-edit-task');
}
function updateTask(){
  const id=parseInt(document.getElementById('etk-id').value);
  const t=DB.tasks.find(x=>x.id===id);if(!t)return;
  const oldProjId=t.projectId;
  t.title=document.getElementById('etk-title').value.trim()||t.title;
  t.priority=document.getElementById('etk-prio').value;
  t.status=document.getElementById('etk-status').value;
  t.dueDate=document.getElementById('etk-due').value;
  t.desc=document.getElementById('etk-desc').value;
  t.projectId=document.getElementById('etk-project').value?parseInt(document.getElementById('etk-project').value):null;
  t.assignee=document.getElementById('etk-assign').value;
  // sync progress for old and new project
  syncProjectProgress(oldProjId);
  syncProjectProgress(t.projectId);
  addActivityLog('Task','Edited',t.title,'task');closeModal('modal-edit-task');triggerSaveWithFeedback('Updating task…');renderPage(_currentPage);
}
function cycleDomesticStatus(id){
  const t=DB.domestics.find(x=>x.id===id);if(!t)return;
  const order=['To Do','In Progress','Done'];
  t.status=order[(order.indexOf(t.status)+1)%order.length];
  saveDBFn();
  if(_currentPage==='dashboard')renderDashContent();
  else renderDomestics();
}
function deleteClient(id){
  if(!confirm('Delete this client and all related data?'))return;
  const client=DB.clients.find(c=>c.id===id);
  const clientName=client?.name||'Unknown client';
  const projectCount=DB.projects.filter(p=>p.clientId===id).length;
  const rentalCount=DB.rentals.filter(r=>r.clientId===id).length;
  const invoiceCount=DB.invoices.filter(i=>i.clientId===id).length;
  
  DB.clients=DB.clients.filter(c=>c.id!==id);
  DB.projects=DB.projects.filter(p=>p.clientId!==id);
  DB.rentals=DB.rentals.filter(r=>r.clientId!==id);
  DB.invoices=DB.invoices.filter(i=>i.clientId!==id);
  
  addActivityLog('Client','Deleted',`${clientName} (+ ${projectCount} projects, ${rentalCount} rentals, ${invoiceCount} invoices)`,'client');saveDBFn();renderPage(_currentPage);renderDash();
}
function exportCSV(){
  if(!DB.clients.length){alert('No clients to export');return}
  let csv='Name,Type,Email,Phone,Address,Status\n';
  DB.clients.forEach(c=>{csv+=`"${c.name}","${c.type}","${c.email}","${c.phone}","${c.address}","${c.status}"\n`});
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='clients.csv';a.click();
}
