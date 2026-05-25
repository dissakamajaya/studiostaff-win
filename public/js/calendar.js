// ════════ RENDER: CALENDAR ════════
let calYear=new Date().getFullYear(), calMonth=new Date().getMonth();
function renderCalendar(){
  const wrap=document.getElementById('calendar-view');
  const today=new Date();
  const entryMap={};
  function addEntry(ds,e){if(!entryMap[ds])entryMap[ds]=[];entryMap[ds].push(e);}
  DB.events.forEach(e=>{if(e.date)addEntry(e.date,{label:e.title,color:e.color||'var(--accent)',icon:'◆',eventId:e.id,type:'event'});});
  DB.projects.forEach(p=>{if(p.deadline)addEntry(p.deadline,{label:p.name,color:'var(--blue)',icon:'▣',projectId:p.id,type:'project'});});
  DB.tasks.forEach(t=>{if(t.dueDate)addEntry(t.dueDate,{label:t.title,color:t.priority==='high'?'var(--red)':'var(--amber)',icon:'●',taskId:t.id,type:'task'});});
  DB.rentals.forEach(r=>{if(r.start){const c=DB.clients.find(cl=>cl.id===r.clientId);addEntry(r.start,{label:r.equipment+(c?' · '+c.name:''),color:'var(--amber)',icon:'📦',rentalId:r.id,type:'rental'});}});
  const monthStart=new Date(calYear,calMonth,1);
  const gridStart=new Date(monthStart);
  gridStart.setDate(gridStart.getDate()-((gridStart.getDay()+6)%7));
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const colorMap={accent:[108,99,245],blue:[74,158,255],amber:[245,166,35],red:[240,68,68],green:[34,197,94]};
  function bgColor(c){const m=c.match(/var\(--(\w+)\)/);if(m&&colorMap[m[1]]){const[r,g,b]=colorMap[m[1]];return`rgba(${r},${g},${b},0.12)`;}return 'rgba(108,99,245,0.12)';}
  let html=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
    <button class="btn-o btn-sm" onclick="calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCalendar()">‹</button>
    <div style="font-family:var(--ui);font-size:16px;font-weight:700;min-width:160px;text-align:center">${MONTHS[calMonth]} ${calYear}</div>
    <button class="btn-o btn-sm" onclick="calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCalendar()">›</button>
    <button class="btn-o btn-sm" onclick="calYear=new Date().getFullYear();calMonth=new Date().getMonth();renderCalendar()">Today</button>
    <button class="btn btn-sm" onclick="newEventForDate('')" style="font-size:10px;padding:3px 10px">+ New Event</button>
    ${renderIcalSyncBtn()}
    <div style="display:flex;gap:8px;font-size:10px;color:var(--text3);margin-left:auto">
      <span>▣ Project</span><span>● Task</span><span>◆ Event</span><span>📦 Rental</span>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">
    ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<div style="font-size:9px;color:var(--text3);text-align:center;padding:4px;text-transform:uppercase;letter-spacing:.06em">${d}</div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">`;
  const fmtLocal=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
for(let i=0;i<35;i++){
    const day=new Date(gridStart);day.setDate(gridStart.getDate()+i);
    const ds=fmtLocal(day);
    const isToday=ds===fmtLocal(today);
    const isCurMonth=day.getMonth()===calMonth;
    const entries=entryMap[ds]||[];
    html+=`<div style="background:${isToday?'var(--abg)':isCurMonth?'var(--bg2)':'var(--bg)'};border:1px solid ${isToday?'var(--accent)':'var(--border)'};border-radius:6px;padding:5px;height:88px;display:flex;flex-direction:column;overflow:hidden">
      <div onclick="newEventForDate('${ds}')" title="Click to add event" style="font-size:10px;font-weight:${isToday?700:400};color:${isToday?'var(--accent)':isCurMonth?'var(--text2)':'var(--text3)'};text-align:center;flex-shrink:0;margin-bottom:3px;line-height:1.4;cursor:pointer;padding:1px 4px;border-radius:3px" onmouseover="this.style.background='var(--abg)'" onmouseout="this.style.background='transparent'">${day.getDate()}</div>
      <div style="flex:1;overflow:hidden;display:flex;flex-direction:column;gap:2px">
      ${entries.slice(0,3).map(function(e){
        var click='',title='';
        if(e.eventId!=null){click='onclick="viewEventDetail('+e.eventId+')"';title=' title="View Event"';}
        else if(e.projectId!=null){click='onclick="viewProject('+e.projectId+')"';title=' title="View Project"';}
        else if(e.taskId!=null){click='onclick="viewTask('+e.taskId+')"';title=' title="View Task"';}
        else if(e.rentalId!=null){click='onclick="viewBookingDetail('+e.rentalId+')"';title=' title="View Rental"';}
        const cursor=(click?'cursor:pointer;':'');
        const label=e.label.replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return '<div '+click+title+' style="background:'+bgColor(e.color)+';border-left:2px solid '+e.color+';border-radius:3px;padding:1px 3px;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4;flex-shrink:0;'+cursor+'">'+e.icon+' '+label+'</div>';
      }).join('')}
      ${entries.length>3?`<div style="font-size:8px;color:var(--text3);flex-shrink:0">+${entries.length-3}</div>`:''}
      </div>
    </div>`;
  }
  html+=`</div>`;

  // ── Tabbed bottom section (content rendered on demand) ──
  const evCount=DB.events.length;
  html+=`<div style="margin-top:20px">
    <div style="display:flex;align-items:center;gap:0;border-bottom:1px solid var(--border);margin-bottom:12px">
      <button id="cal-tab-upcoming" onclick="switchCalTab(0)" style="padding:6px 16px;font-size:11px;font-weight:600;border:none;background:none;border-bottom:2px solid ${_calTab===0?'var(--accent)':'transparent'};color:${_calTab===0?'var(--accent)':'var(--text3)'};cursor:pointer">Upcoming</button>
      <button id="cal-tab-events" onclick="switchCalTab(1)" style="padding:6px 16px;font-size:11px;font-weight:600;border:none;background:none;border-bottom:2px solid ${_calTab===1?'var(--accent)':'transparent'};color:${_calTab===1?'var(--accent)':'var(--text3)'};cursor:pointer">Events (${evCount})</button>
    </div>
    <div id="cal-tab-panel"></div>
  </div>`;

  wrap.innerHTML=html;
  renderCalTabPanel();
}

let _calTab=0;
let _calEvSort='newest';
let _calEvGroup=false;
const _calLabelName=(c)=>{const m={accent:'Default',blue:'Blue',amber:'Amber',red:'Red',green:'Green'};const k=c&&c.match(/var\(--([\w]+)\)/);return k&&m[k[1]]?m[k[1]]:'Other';};
const _calLabelDisplay=(l)=>l?l.charAt(0).toUpperCase()+l.slice(1):'No Label';
function setCalEvSort(v){_calEvSort=v;renderCalTabPanel();}
function setCalEvGroup(v){_calEvGroup=v;renderCalTabPanel();}
const _calBgColor=(c)=>{const cm={accent:[108,99,245],blue:[74,158,255],amber:[245,166,35],red:[240,68,68],green:[34,197,94]};const m=c&&c.match(/var\(--([\w]+)\)/);if(m&&cm[m[1]]){const[r,g,b]=cm[m[1]];return`rgba(${r},${g},${b},0.12)`;}return'rgba(108,99,245,0.12)';};
function switchCalTab(idx){
  _calTab=idx;
  ['upcoming','events'].forEach((name,i)=>{
    const btn=document.getElementById('cal-tab-'+name);
    if(btn){btn.style.borderBottomColor=i===idx?'var(--accent)':'transparent';btn.style.color=i===idx?'var(--accent)':'var(--text3)';}
  });
  renderCalTabPanel();
}

function renderCalTabPanel(){
  const panel=document.getElementById('cal-tab-panel');
  if(!panel)return;
  const today2=new Date().toISOString().slice(0,10);
  if(_calTab===0){
    const allEntries=[];
    DB.events.forEach(e=>{if(e.date)allEntries.push({date:e.date,label:e.title,icon:'◆',color:e.color||'var(--accent)',type:'Event'});});
    DB.projects.forEach(p=>{if(p.deadline)allEntries.push({date:p.deadline,label:p.name,icon:'▣',color:'var(--blue)',type:'Deadline'});});
    DB.tasks.forEach(t=>{if(t.dueDate)allEntries.push({date:t.dueDate,label:t.title,icon:'●',color:t.priority==='high'?'var(--red)':'var(--amber)',type:'Task'});});
    DB.rentals.forEach(r=>{if(r.start){const c=DB.clients.find(cl=>cl.id===r.clientId);allEntries.push({date:r.start,label:r.equipment+(c?' · '+c.name:''),icon:'📦',color:'var(--amber)',type:'Rental'});}});
    allEntries.sort((a,b)=>new Date(a.date)-new Date(b.date));
    const upcoming=allEntries.filter(e=>e.date>=today2).slice(0,30);
    if(!upcoming.length){panel.innerHTML=`<div class="empty" style="padding:10px">No upcoming events.</div>`;return;}
    let h='';let lastDate='';
    upcoming.forEach(e=>{
      if(e.date!==lastDate){lastDate=e.date;h+=`<div style="font-size:10px;color:var(--text3);margin:8px 0 4px;font-weight:600">${fmtDate(e.date)}${e.date===today2?' · Today':''}</div>`;}
      h+=`<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:${_calBgColor(e.color)};border-left:2px solid ${e.color};border-radius:4px;margin-bottom:4px"><span style="color:${e.color};font-size:12px">${e.icon}</span><div style="flex:1"><div style="font-size:11px;font-weight:500">${e.label}</div></div><span style="font-size:9px;color:var(--text3);text-transform:uppercase">${e.type}</span></div>`;
    });
    panel.innerHTML=h;
  } else {
    const evSorted=DB.events.slice().sort((a,b)=>{
      if(_calEvSort==='newest'||_calEvSort==='oldest'){
        const ca=a.createdAt?new Date(a.createdAt):0;
        const cb=b.createdAt?new Date(b.createdAt):0;
        return _calEvSort==='newest'?cb-ca:ca-cb;
      }
      if(!a.date)return 1;if(!b.date)return -1;
      const d=new Date(a.date)-new Date(b.date);
      return _calEvSort==='date-desc'?-d:d;
    });
    if(!evSorted.length){panel.innerHTML='<div class="empty" style="padding:16px;text-align:center">No events yet. Click <b>+ Add Event</b> to create one.</div>';return;}
    const _evRow=(e)=>{const isPast=e.date&&e.date<today2;return`<tr style="opacity:${isPast?0.5:1}"><td style="white-space:nowrap;font-size:10px">${fmtDate(e.date)}${e.date===today2?' <span style="color:var(--accent);font-weight:700">· Today</span>':''}</td><td><div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${e.color||'var(--accent)'}"></span><span style="font-size:11px;font-weight:500">${e.title}</span></div></td><td style="font-size:10px;color:var(--text3)">${e.allDay?'All day':e.time?e.time+(e.duration?' ('+e.duration+'h)':''):'—'}</td>${_calEvGroup?'':` <td style="font-size:10px;color:var(--text2)">${e.label?`<span style="background:var(--bg3);border-radius:4px;padding:2px 7px;font-size:9px;text-transform:capitalize">${e.label}</span>`:'—'}</td>`}<td style="font-size:10px;color:var(--text3);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.notes||'—'}</td><td><div style="display:flex;gap:4px"><button class="btn-o btn-xs" onclick="viewEventDetail(${e.id})">View</button><button class="btn-o btn-xs" onclick="openEditEvent(${e.id})">✎</button><button class="btn-danger btn-xs" onclick="deleteEvent(${e.id})">✕</button></div></td></tr>`;};
    const thead=`<thead><tr><th>Date</th><th>Title</th><th>Time</th>${_calEvGroup?'':`<th>Label</th>`}<th>Notes</th><th>Action</th></tr></thead>`;
    const _sortBtn=(v,label)=>`<button class="btn-xs btn-o" onclick="setCalEvSort('${v}')" style="border-color:${_calEvSort===v?'var(--accent)':'var(--border2)'};color:${_calEvSort===v?'var(--accent)':'var(--text2)'}">${label}</button>`;
    const _grpBtn=`<button class="btn-xs btn-o" onclick="setCalEvGroup(${!_calEvGroup})" style="border-color:${_calEvGroup?'var(--accent)':'var(--border2)'};color:${_calEvGroup?'var(--accent)':'var(--text2)'}">By Label</button>`;
    let h=`<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap"><span style="font-size:10px;color:var(--text3)">Sort:</span>${_sortBtn('newest','Newest')}${_sortBtn('oldest','Oldest')}${_sortBtn('date-asc','Date ↑')}${_sortBtn('date-desc','Date ↓')}<span style="margin-left:6px;font-size:10px;color:var(--text3)">Group:</span>${_grpBtn}</div>`;
    if(_calEvGroup){
      const labelOrder=['studio','academy','rental','domestic',''];
      const groups={};
      evSorted.forEach(e=>{const k=e.label||'';if(!groups[k])groups[k]=[];groups[k].push(e);});
      labelOrder.filter(k=>groups[k]?.length).forEach(k=>{
        const items=groups[k];
        h+=`<div style="display:flex;align-items:center;gap:6px;margin:12px 0 6px"><span style="font-size:10px;font-weight:600;color:var(--text2);text-transform:capitalize">${_calLabelDisplay(k)}</span><span style="font-size:9px;color:var(--text3)">${items.length} event${items.length!==1?'s':''}</span></div>`;
        h+=`<div class="tw"><table class="tbl">${thead}<tbody>${items.map(_evRow).join('')}</tbody></table></div>`;
      });
    } else {
      h+=`<div class="tw"><table class="tbl">${thead}<tbody>${evSorted.map(_evRow).join('')}</tbody></table></div>`;
    }
    panel.innerHTML=h;
  }
}

function viewEventDetail(id){
  const e=DB.events.find(x=>x.id===id);if(!e)return;
  document.getElementById('detail-title').textContent=e.title;
  document.getElementById('detail-body').innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <span style="background:${e.color||'var(--accent)'}22;color:${e.color||'var(--accent)'};border-radius:4px;padding:3px 10px;font-size:10px;font-weight:600">◆ Event</span>
      <span style="font-size:10px;color:var(--text3)">${fmtDate(e.date)}</span>
      ${!e.allDay&&e.time?`<span style="font-size:10px;color:var(--text3)">⏰ ${e.time}${e.duration?' · '+e.duration+'h':''}</span>`:'<span style="font-size:10px;color:var(--text3)">All Day</span>'}
    </div>
    <div style="background:var(--bg3);border-radius:6px;padding:14px;font-size:11px;color:var(--text2);line-height:1.8;min-height:40px">${e.notes||'<span style="color:var(--text3);font-style:italic">(no notes)</span>'}</div>
    <div style="font-size:10px;color:var(--text3);margin-top:10px">✍ ${getUserName(e.createdBy)} · ${fmtDate(e.createdAt)}</div>`;
  document.getElementById('detail-actions').innerHTML=`
    <button class="btn-o" onclick="closeModal('modal-detail')">Close</button>
    <button class="btn-o" style="border-color:var(--amber);color:var(--amber)" onclick="closeModal('modal-detail');openEditEvent(${e.id})">✎ Edit</button>
    <button class="btn-danger" onclick="deleteEvent(${e.id});closeModal('modal-detail')">✕ Delete</button>`;
  openModal('modal-detail');
}

function openEditEvent(id){
  const e=DB.events.find(x=>x.id===id);if(!e)return;
  document.getElementById('ev-title').value=e.title||'';
  document.getElementById('ev-date').value=e.date||'';
  document.getElementById('ev-time').value=e.time||'';
  document.getElementById('ev-notes').value=e.notes||'';
  document.getElementById('ev-color').value=e.color||'var(--accent)';
  const lblSel=document.getElementById('ev-label');if(lblSel)lblSel.value=e.label||'';
  const evTypeSel=document.getElementById('ev-type');if(evTypeSel)evTypeSel.value=e.type||'';
  const durSel=document.getElementById('ev-dur');
  const customWrap=document.getElementById('ev-custom-dur-wrap');
  const opts=['0.5','1','1.5','2','3','4','6','8'];
  if(opts.includes(String(e.duration))){durSel.value=String(e.duration);if(customWrap)customWrap.style.display='none';}
  else{durSel.value='custom';document.getElementById('ev-custom-dur').value=e.duration||1;if(customWrap)customWrap.style.display='';}
  setEventAllDay(!!e.allDay);
  document.querySelector('#modal-event .mt').textContent='Edit Event';
  openModal('modal-event'); // openModal resets ev-edit-id to '' — set it AFTER
  document.getElementById('ev-edit-id').value=id;
}

function newEventForDate(dateStr){
  document.querySelector('#modal-event .mt').textContent='Add Event';
  document.getElementById('ev-title').value='';
  document.getElementById('ev-date').value=dateStr||'';
  document.getElementById('ev-time').value='';
  document.getElementById('ev-notes').value='';
  document.getElementById('ev-color').value='var(--accent)';
  const lblSel=document.getElementById('ev-label');if(lblSel)lblSel.value='';
  const evTypeSel=document.getElementById('ev-type');if(evTypeSel)evTypeSel.value='';
  const durSel=document.getElementById('ev-dur');if(durSel)durSel.value='1';
  const customWrap=document.getElementById('ev-custom-dur-wrap');if(customWrap)customWrap.style.display='none';
  setEventAllDay(false);
  document.getElementById('ev-edit-id').value='';
  openModal('modal-event');
}

function deleteEvent(id){
  if(!confirm('Delete this event?'))return;
  const ev=DB.events.find(e=>e.id===id);
  DB.events=DB.events.filter(e=>e.id!==id);
  // If this was the last event, saveDBFn's NOT-IN guard skips the delete.
  // Do a targeted direct delete via the API using the uuid.
  if(ev&&ev._uuid&&DB.events.length===0){
    const token=localStorage.getItem('ss-token');
    if(token)fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({data:DB,_deleteEvents:[ev._uuid]})}).catch(()=>{});
  }
  saveDBFn();renderPage(_currentPage);
}

// ════════ iCAL SYNC ════════

function parseICS(icsText) {
  const events = [];
  const lines = icsText.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  let cur = null;
  let inEvent = false;
  for (const line of lines) {
    const s = line.trim();
    if (s === 'BEGIN:VEVENT') { cur = {}; inEvent = true; continue; }
    if (s === 'END:VEVENT') { if (cur && cur.uid && cur.dtstart) events.push(cur); cur = null; inEvent = false; continue; }
    if (!inEvent || !cur) continue;
    const colonIdx = s.indexOf(':');
    if (colonIdx === -1) continue;
    const key = s.slice(0, colonIdx);
    let val = s.slice(colonIdx + 1);
    const semi = key.indexOf(';');
    const field = semi !== -1 ? key.slice(0, semi) : key;
    if (field === 'UID') cur.uid = val;
    else if (field === 'SUMMARY' || field === 'TITLE') cur.summary = cur.summary || val;
    else if (field === 'DESCRIPTION') cur.description = val;
    else if (field === 'LOCATION') cur.location = val;
    else if (field === 'DTSTART') {
      const isDate = key.includes('VALUE=DATE');
      if (isDate && val.length >= 8) {
        cur.dtstart = val.slice(0, 4) + '-' + val.slice(4, 6) + '-' + val.slice(6, 8);
        cur.allDay = true;
      } else {
        val = val.replace(/Z$/,'');
        if (val.length >= 15) {
          cur.dtstart = val.slice(0, 4) + '-' + val.slice(4, 6) + '-' + val.slice(6, 8);
          cur.dttime = val.slice(9, 11) + ':' + val.slice(11, 13);
        } else if (val.length >= 8) {
          cur.dtstart = val.slice(0, 4) + '-' + val.slice(4, 6) + '-' + val.slice(6, 8);
        }
      }
    } else if (field === 'DTEND') {
      const isDate = key.includes('VALUE=DATE');
      val = val.replace(/Z$/, '');
      if (val.length >= 15) {
        cur.dtend = val.slice(0, 4) + '-' + val.slice(4, 6) + '-' + val.slice(6, 8);
        cur.endtime = val.slice(9, 11) + ':' + val.slice(11, 13);
      } else if (val.length >= 8) {
        cur.dtend = val.slice(0, 4) + '-' + val.slice(4, 6) + '-' + val.slice(6, 8);
      }
    }
  }
  return events;
}

function renderIcalSyncBtn() {
  // Check for Google Calendar auto-sync events
  const googleCount = DB.events.filter(e => e.source === 'google_calendar' || e.source === 'gmail_ical').length;
  const hasGoogleCalendar = googleCount > 0;
  
  return '<div style="display:flex;align-items:center;gap:6px;margin-left:12px;white-space:nowrap">'
    + `<span style="font-size:10px;color:var(--text3);display:flex;align-items:center;gap:4px" title="Auto-syncs every 15 minutes from studio@houseofexp.com">`
    + `<span style="display:inline-block;width:6px;height:6px;background:var(--green);border-radius:50%;"></span>`
    + `Google Calendar${hasGoogleCalendar ? ' (' + googleCount + ')' : ''}</span>`
    + `<button class="btn btn-sm" onclick="syncGoogleCalendar()" style="font-size:10px;padding:3px 10px" title="Manual sync from Google Calendar">↻ Sync Now</button>`
    + '</div>';
}

function promptIcalUrl() {
  const cur = (DB.settings && DB.settings.icalUrl) || '';
  const example = 'https://calendar.google.com/calendar/ical/YOUR_EMAIL/private-TOKEN/basic.ics';
  const msg = cur ? `Current: ${cur.slice(0, 70)}…\n\nEnter new iCal URL (or leave empty to clear):` : `Paste your Google Calendar secret iCal address.\n\nExample:\n${example}\n\nGet it from:\nGoogle Calendar → Settings → Your calendar → Integrate calendar → Secret address in iCal format`;
  const input = prompt(msg, cur);
  if (input === null) return;
  const trimmed = input.trim();
  if (trimmed) {
    if (!trimmed.startsWith('https://')) { alert('Invalid URL — must start with https://'); return; }
    DB.settings.icalUrl = trimmed;
    saveDBFn();
  } else {
    DB.settings.icalUrl = '';
    saveDBFn();
  }
  renderPage(_currentPage);
}

async function syncGoogleCalendar() {
  const btn = document.querySelector('.btn-sm[onclick*="syncGoogleCalendar"]');
  if (btn) { btn.textContent = '⏳ Syncing…'; btn.disabled = true; }
  
  try {
    const token = localStorage.getItem('ss-token');
    if (!token) { alert('Not logged in'); return; }
    
    const res = await fetch('/api/data?calendar-sync=1', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      throw new Error(result.error || `HTTP ${res.status}`);
    }
    
    if (result.inserted > 0 || result.updated > 0 || result.deleted > 0) {
      // Refresh the page to get updated events
      alert(`Sync complete:\n• ${result.inserted} new events\n• ${result.updated} updated\n• ${result.deleted} removed`);
      refreshDashboard();
    } else {
      alert('Already up to date — no changes needed.');
    }
  } catch (e) {
    alert('Sync failed: ' + e.message);
    console.error('Calendar sync error:', e);
  } finally {
    if (btn) { btn.textContent = '↻ Sync Now'; btn.disabled = false; }
  }
}

// Legacy function - now redirects to new sync
async function syncIcalFeed() {
  // Redirect to new Google Calendar sync
  await syncGoogleCalendar();
}

// Legacy function - no longer needed with hardcoded URL
function promptIcalUrl() {
  alert('Google Calendar is now auto-configured for studio@houseofexp.com\n\nEvents sync automatically every 15 minutes.\nUse "Sync Now" for immediate updates.');
}

function timeDiffHours(start, end) {
  const a = start.split(':').map(Number);
  const b = end.split(':').map(Number);
  const diff = (b[0] * 60 + b[1]) - (a[0] * 60 + a[1]);
  return Math.max(0.5, Math.round(diff / 6) / 10);
}
