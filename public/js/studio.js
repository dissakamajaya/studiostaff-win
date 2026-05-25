// ════════ RENDER: STUDIO (Projects + Tasks) ════════
let studioTab=0;
let studioSort='name';
let studioGroup='none';
let taskSort='default';
let taskGroup='none';
let fbGroup='none';
let fbListSort='newest';
let fbListGroup='none';
function setFbListSort(s){fbListSort=s;renderStudioContent();}
function setFbListGroup(g){fbListGroup=g;renderStudioContent();}
function setFbGroup(g){fbGroup=g;renderStudioContent();
  ['none','project'].forEach(k=>{const el=document.getElementById('fbgrp-'+k);if(el){el.style.borderColor=k===g?'var(--accent)':'';el.style.color=k===g?'var(--accent)':''}});}
function setStudioSort(s){studioSort=s;renderStudioContent();
  ['name','deadline','value'].forEach(k=>{const el=document.getElementById('sort-'+k);if(el){el.style.borderColor=k===s?'var(--accent)':'';el.style.color=k===s?'var(--accent)':''}});
}
function setStudioGroup(g){studioGroup=g;renderStudioContent();
  ['none','type','status'].forEach(k=>{const el=document.getElementById('grp-'+k);if(el){el.style.borderColor=k===g?'var(--accent)':'';el.style.color=k===g?'var(--accent)':''}});
}
function setTaskSort(s){taskSort=s;renderStudioContent();
  ['default','deadline','priority','newest'].forEach(k=>{const el=document.getElementById('tsort-'+k);if(el){el.style.borderColor=k===s?'var(--accent)':'';el.style.color=k===s?'var(--accent)':''}});
}
function setTaskGroup(g){taskGroup=g;renderStudioContent();
  ['none','type'].forEach(k=>{const el=document.getElementById('tgrp-'+k);if(el){el.style.borderColor=k===g?'var(--accent)':'';el.style.color=k===g?'var(--accent)':''}});
}
function switchStudioTab(el,idx){studioTab=idx;document.querySelectorAll('#studio-tabs .tab').forEach((t,i)=>t.classList.toggle('on',i===idx));
  // show/hide sort controls
  document.getElementById('studio-controls').style.display=idx===0?'flex':'none';
  document.getElementById('task-controls').style.display=(idx===1||idx===2)?'flex':'none';
  // show/hide header buttons
  const taskBtn=document.getElementById('studio-new-task-btn');
  const fbBtn=document.getElementById('studio-new-feedback-btn');
  if(taskBtn)taskBtn.style.display=(idx===3||idx===4)?'none':'';
  if(fbBtn)fbBtn.style.display=(idx===3||idx===4)?'':'none';
  const fbCtrl=document.getElementById('fb-controls');
  if(fbCtrl)fbCtrl.style.display=idx===3?'flex':'none';
  if(idx===3){['none','project'].forEach(k=>{const el=document.getElementById('fbgrp-'+k);if(el){el.style.borderColor=k===fbGroup?'var(--accent)':'';el.style.color=k===fbGroup?'var(--accent)':''}});}
  if(idx===1||idx===2){['default','deadline','priority','newest'].forEach(k=>{const el=document.getElementById('tsort-'+k);if(el){el.style.borderColor=k===taskSort?'var(--accent)':'';el.style.color=k===taskSort?'var(--accent)':''}});['none','type'].forEach(k=>{const el=document.getElementById('tgrp-'+k);if(el){el.style.borderColor=k===taskGroup?'var(--accent)':'';el.style.color=k===taskGroup?'var(--accent)':''}});}
  renderStudioContent();
}
function renderStudio(){
  const tot=DB.projects.reduce((s,p)=>s+p.value,0);
  const avg=DB.projects.length?(DB.projects.reduce((s,p)=>s+p.progress,0)/DB.projects.length).toFixed(0):0;
  const active=DB.projects.filter(p=>p.status==='Active').length;
  document.getElementById('studio-sub').textContent=`${DB.projects.length} projects · ${DB.tasks.length} tasks`;
  document.getElementById('studio-kpis').innerHTML=[
    {key:'active',label:'Active Projects',value:active,sub:`${DB.projects.length} total projects`,icon:'●'},
    {key:'tasks',label:'Total Tasks',value:DB.tasks.length,sub:`${DB.tasks.filter(t=>t.status!=='Done').length} open tasks`,icon:'☷'},
    {key:'value',label:'Total Value',value:rp(tot),sub:'Projected studio value',icon:'Rp'},
    {key:'progress',label:'Avg Progress',value:`${avg}%`,sub:'Across active work',icon:'%'}
  ].map(k=>`<div class="kc studio-kpi-card ${k.key}">
    <div><div class="kl">${k.label}</div><div class="kv">${k.value}</div><div class="studio-kpi-sub">${k.sub}</div></div>
    <div class="studio-kpi-icon">${k.icon}</div>
  </div>`).join('');
  document.getElementById('studio-controls').style.display=studioTab===0?'flex':'none';
  document.getElementById('task-controls').style.display=(studioTab===1||studioTab===2)?'flex':'none';
  const fbcEl=document.getElementById('fb-controls');if(fbcEl)fbcEl.style.display=studioTab===3?'flex':'none';
  ['name','deadline','value'].forEach(k=>{const el=document.getElementById('sort-'+k);if(el){el.style.borderColor=k===studioSort?'var(--accent)':'';el.style.color=k===studioSort?'var(--accent)':''}});
  ['none','type','status'].forEach(k=>{const el=document.getElementById('grp-'+k);if(el){el.style.borderColor=k===studioGroup?'var(--accent)':'';el.style.color=k===studioGroup?'var(--accent)':''}});
  ['default','deadline','priority','newest'].forEach(k=>{const el=document.getElementById('tsort-'+k);if(el){el.style.borderColor=k===taskSort?'var(--accent)':'';el.style.color=k===taskSort?'var(--accent)':''}});
  ['none','type'].forEach(k=>{const el=document.getElementById('tgrp-'+k);if(el){el.style.borderColor=k===taskGroup?'var(--accent)':'';el.style.color=k===taskGroup?'var(--accent)':''}});
  renderStudioContent();
}

function renderActivityStrip(){
  const tasks=DB.tasks||[];
  const fbs=DB.feedbacks||[];
  const all=[];
  tasks.forEach(t=>all.push({type:'task',id:t.id,title:t.title,projectId:t.projectId,assignee:t.assignee,status:t.status,createdAt:t.createdAt,icon:'✅',color:prioColor[t.priority]||'var(--blue)'}));
  fbs.forEach(f=>all.push({type:'feedback',id:f.id,title:f.title||'(Untitled)',projectId:f.projectId,assignee:f.assignee,status:f.status,createdAt:f.createdAt,icon:'💬',color:'#ef4444'}));
  all.sort((a,b)=>{const da=a.createdAt?new Date(a.createdAt):0;const db=b.createdAt?new Date(b.createdAt):0;return db-da;});
  const recent=all.slice(0,5);
  if(!recent.length)return'';
  return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg3);border-radius:8px;margin-bottom:12px;overflow-x:auto;white-space:nowrap;border:1px solid var(--border)">
    <span style="font-size:10px;font-weight:600;color:var(--text3);flex-shrink:0">🕐 Latest:</span>
    ${recent.map(function(it){
      const proj=it.projectId?DB.projects.find(p=>p.id===it.projectId):null;
      const onclick=it.type==='task'?'onclick="viewTask('+it.id+')"':'onclick="viewFeedback('+it.id+')"';
      return '<span '+onclick+' style="display:inline-flex;align-items:center;gap:4px;background:var(--bg2);padding:2px 8px;border-radius:12px;font-size:10px;cursor:pointer;flex-shrink:0;border:1px solid var(--border)" title="'+it.type+' · '+(proj?proj.name:'')+' · '+it.status+'">'+it.icon+' '+it.title.replace(/</g,'&lt;').replace(/>/g,'&gt;').slice(0,30)+(it.title.length>30?'…':'')+'</span>';
    }).join('')}
  </div>`;
}

function sortedProjects(){
  let list=[...DB.projects];
  if(studioSort==='deadline')list.sort((a,b)=>{if(!a.deadline)return 1;if(!b.deadline)return -1;return new Date(a.deadline)-new Date(b.deadline)});
  else if(studioSort==='value')list.sort((a,b)=>b.value-a.value);
  else list.sort((a,b)=>((calcProjectProgress?.(a.id)||a.progress||0)-(calcProjectProgress?.(b.id)||b.progress||0)));
  return list;
}

function sortedTasks(){
  let list=[...DB.tasks];
  if(taskSort==='deadline')list.sort((a,b)=>{if(!a.dueDate)return 1;if(!b.dueDate)return -1;return new Date(a.dueDate)-new Date(b.dueDate)});
  else if(taskSort==='priority')list.sort((a,b)=>{const p={high:0,normal:1};return(p[a.priority]||1)-(p[b.priority]||1)});
  else if(taskSort==='newest')list.sort((a,b)=>{const da=a.createdAt?new Date(a.createdAt):0;const db=b.createdAt?new Date(b.createdAt):0;return db-da;});
  else list.sort((a,b)=>{
    const so={'To Do':0,'In Progress':1,'Done':2};
    return (so[a.status]||0)-(so[b.status]||0);
  });
  return list;
}

function _projectData(p){
  const c=DB.clients.find(cl=>cl.id===p.clientId);
  const tasks=DB.tasks.filter(t=>t.projectId===p.id);
  const fbs=(DB.feedbacks||[]).filter(f=>f.projectId===p.id);
  const activeFbs=fbs.filter(f=>f.status!=='Done');
  const totalItems=tasks.length+fbs.length;
  const doneItems=tasks.filter(t=>t.status==='Done').length+fbs.filter(f=>f.status==='Done').length;
  const liveProg=calcProjectProgress(p.id);
  if(p.progress!==liveProg){p.progress=liveProg;}
  // Auto-sync value from linked quotes
  const liveVal=typeof calcProjectValue==='function'?calcProjectValue(p.id):p.value;
  if(liveVal>0 && p.value!==liveVal){p.value=liveVal;}
  const statusClass={Active:'pg_',Pending:'pa_','Awaiting Approval':'pa_','Awaiting Feedback':'pb_',Done:'pp_','On Hold':'pr_',Cancelled:'pr_'}[p.status]||'pa_';
  // Feedback badge HTML
  const fbBadge=activeFbs.length?`<span style="display:inline-flex;align-items:center;gap:3px;background:#ef444422;color:#ef4444;border:1px solid #ef444460;border-radius:10px;padding:1px 7px;font-size:9px;font-weight:700;margin-left:6px;animation:fbPulse 1.5s ease-in-out infinite;white-space:nowrap" title="${activeFbs.length} active feedback(s)">💬 ${activeFbs.length}</span>`:'';
  return {c,totalItems,doneItems,liveProg,statusClass,activeFbs,fbBadge};
}
function renderProjectRow(p){
  const {c,totalItems,doneItems,liveProg,statusClass,fbBadge}=_projectData(p);
  const itemsMeta=totalItems?`${doneItems}/${totalItems} items`:'';
  return `<tr><td data-label="Project"><div style="font-size:11px;font-weight:500;cursor:pointer;color:var(--accent)" onclick="event.stopPropagation();viewProject(${p.id})">${p.name}${fbBadge}</div><div class="td-s" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${itemsMeta?`<span>${itemsMeta}</span>`:''}</div></td><td data-label="Client"><div style="display:flex;align-items:center;gap:6px"><div class="av" style="background:${c?avColor(c.name)+'22':'var(--bg4)'};color:${c?avColor(c.name):'var(--text3)'};width:20px;height:20px;font-size:8px">${c?initials(c.name):'?'}</div><div><div>${c?c.name:'—'}</div><div class="td-s">${p.type||'—'}</div></div></div></td><td style="min-width:100px" data-label="Progress"><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:4px;background:var(--bg4);border-radius:2px"><div style="width:${liveProg}%;height:100%;background:${liveProg===100?'var(--green)':'var(--accent)'};border-radius:2px;transition:width .3s"></div></div><span style="font-size:10px;color:var(--text3)">${liveProg}%</span></div></td><td style="color:var(--green)" data-label="Value">${rp(p.value)}</td><td data-label="Status"><span class="pill ${statusClass}">${p.status}</span><div class="td-s">${fmtDate(p.deadline)}</div></td><td data-label="Action"><div style="display:flex;gap:4px"><button class="btn btn-xs" onclick="event.stopPropagation();quickQuote(${p.clientId},${p.id})">+ Quote</button></div></td></tr>`;
}
function renderProjectCard(p){
  const {c,totalItems,doneItems,liveProg,statusClass,fbBadge}=_projectData(p);
  const itemsMeta=totalItems?`${doneItems}/${totalItems} items`:'';
  return `<div class="card-item" style="position:relative"><div class="card-item-header"><div><div class="card-item-title" style="cursor:pointer;color:var(--accent)" onclick="event.stopPropagation();viewProject(${p.id})">${p.name}${fbBadge}</div><div class="card-item-sub" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px">${itemsMeta?`<span>${itemsMeta}</span>`:''}</div></div><div style="text-align:right"><span class="pill ${statusClass}">${p.status}</span><div class="td-s" style="margin-top:4px">${fmtDate(p.deadline)}</div></div></div><div class="card-item-row"><span class="card-item-label">Client</span><span class="card-item-val" style="display:flex;align-items:center;gap:6px"><div class="av" style="background:${c?avColor(c.name)+'22':'var(--bg4)'};color:${c?avColor(c.name):'var(--text3)'};width:18px;height:18px;font-size:7px">${c?initials(c.name):'?'}</div><span>${c?c.name:'—'} · ${p.type||'—'}</span></span></div><div class="card-item-row"><span class="card-item-label">Progress</span><span class="card-item-val"><div style="display:flex;align-items:center;gap:6px;width:100px"><div style="flex:1;height:4px;background:var(--bg4);border-radius:2px"><div style="width:${liveProg}%;height:100%;background:${liveProg===100?'var(--green)':'var(--accent)'};border-radius:2px"></div></div><span style="font-size:10px;color:var(--text3)">${liveProg}%</span></div></span></div><div class="card-item-actions"><button class="btn btn-xs" onclick="event.stopPropagation();quickQuote(${p.clientId},${p.id})">+ Quote</button></div></div>`;
}

function _taskCard(t){
  const proj=DB.projects.find(p=>p.id===t.projectId);
  const sc={'To Do':'pa_','In Progress':'pb_','Done':'pg_'}[t.status]||'pa_';
  return `<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${t.title}</div><div class="card-item-sub" style="display:flex;align-items:center;gap:6px;margin-top:4px"><div class="av" style="background:${getUserColor(t.assignee)}22;color:${getUserColor(t.assignee)};width:18px;height:18px;font-size:7px">${getUserName(t.assignee)[0]}</div>${getUserName(t.assignee)}</div></div><span class="pill ${sc}" style="cursor:pointer" onclick="cycleTaskStatus(${t.id})">${t.status}</span></div>${proj?`<div class="card-item-row"><span class="card-item-label">Project</span><span class="card-item-val">${proj.name}</span></div>`:''}<div class="card-item-row"><span class="card-item-label">Due</span><span class="card-item-val">${fmtDate(t.dueDate)}</span></div><div class="card-item-row"><span class="card-item-label">Priority</span><span class="card-item-val" style="color:${prioColor[t.priority]||'var(--blue)'}">${t.priority}</span></div><div class="card-item-actions"><button class="btn-o btn-xs" onclick="viewTask(${t.id})">Detail</button><button class="btn-o btn-xs" onclick="openEditTask(${t.id})">✎</button><button class="btn-danger btn-xs" onclick="deleteTask(${t.id})">✕</button></div></div>`;
}
function _fbCard(f){
  const proj=f.projectId?DB.projects.find(p=>p.id===f.projectId):null;
  const sc={'To Do':'pa_','Ongoing':'pb_','Done':'pg_'}[f.status]||'pa_';
  return `<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${f.title||'(Untitled)'}</div><div class="card-item-sub" style="display:flex;align-items:center;gap:6px;margin-top:4px">${f.assignee?`<div class="av" style="background:${getUserColor(f.assignee)}22;color:${getUserColor(f.assignee)};width:18px;height:18px;font-size:7px">${(getUserName(f.assignee)||'?')[0]}</div>${getUserName(f.assignee)}`:'—'}</div></div><span class="pill ${sc}" style="cursor:pointer" onclick="moveFeedback(${f.id},'forward')">${f.status}</span></div>${proj?`<div class="card-item-row"><span class="card-item-label">Project</span><span class="card-item-val">${proj.name}</span></div>`:''}<div class="card-item-row"><span class="card-item-label">Due</span><span class="card-item-val">${fmtDate(f.dueDate)}</span></div>${f.revisionPhase?`<div class="card-item-row"><span class="card-item-label">Phase</span><span class="card-item-val" style="color:var(--accent)">${f.revisionPhase}</span></div>`:''}<div class="card-item-actions"><button class="btn-o btn-xs" onclick="viewFeedback(${f.id})">Detail</button><button class="btn-o btn-xs" onclick="openFeedbackModal(${f.id})">✎</button></div></div>`;
}

// ─── Status Dropdown Helper ───
function _statusDropdown(id, current, type){
  const statuses=type==='feedback'?['To Do','Ongoing','Done']:['To Do','In Progress','Done'];
  const colors={'To Do':'var(--text3)','In Progress':'var(--amber)','Ongoing':'var(--amber)','Done':'var(--green)'};
  return statuses.map(s=>{
    const isActive=s===current;
    return `<span style="display:inline-block;padding:2px 8px;border-radius:8px;font-size:9px;font-weight:600;cursor:pointer;${isActive?`background:${colors[s]}22;color:${colors[s]};border:1px solid ${colors[s]}`:'color:var(--text3);border:1px solid var(--border2)'}" onclick="event.stopPropagation();${type==='feedback'?(s==='Done'?`moveFeedback(${id},'forward')`:(s==='To Do'?`moveFeedback(${id},'back')`:'')):`cycleTaskStatus(${id})`}">${s}</span>`;
  }).join('');
}

function renderStudioContent(){
  const wrap=document.getElementById('studio-tab-content');
  const activityStrip=(studioTab>=1&&studioTab<=4)?renderActivityStrip():'';
  if(studioTab===0){
    // ─── PROJECTS TAB (with sort/group) ───
    const projects=sortedProjects();
    if(!projects.length){wrap.innerHTML='<div class="empty"><div class="empty-icon">●</div>No projects yet. Click <b style="color:var(--accent)">+ New Project</b></div>';return}

    if(studioGroup==='none'){
      wrap.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>Project</th><th>Client & Type</th><th>Progress</th><th>Value</th><th>Status & Deadline</th><th>Action</th></tr></thead><tbody>${projects.map(p=>renderProjectRow(p)).join('')}</tbody></table></div><div class="card-list">${projects.map(p=>renderProjectCard(p)).join('')}</div>`;
    } else {
      // group by type or status
      const key=studioGroup==='type'?'type':'status';
      const groups={};projects.forEach(p=>{const g=p[key]||'Other';if(!groups[g])groups[g]=[];groups[g].push(p)});
      let html='';
      const statusOrder=['Active','Awaiting Feedback','On Hold','Cancelled','Done'];
      const sortedGroupKeys=Object.keys(groups).sort((a,b)=>{
        if(studioGroup==='status'){const ia=statusOrder.indexOf(a),ib=statusOrder.indexOf(b);return(ia===-1?99:ia)-(ib===-1?99:ib);}
        return a.localeCompare(b);
      });
      sortedGroupKeys.forEach(g=>{
        html+=`<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">${g} <span style="color:var(--text3);font-weight:400">(${groups[g].length})</span></div><div class="tw"><table class="tbl"><thead><tr><th>Project</th><th>Client & Type</th><th>Progress</th><th>Value</th><th>Status & Deadline</th><th>Action</th></tr></thead><tbody>${groups[g].map(p=>renderProjectRow(p)).join('')}</tbody></table></div><div class="card-list">${groups[g].map(p=>renderProjectCard(p)).join('')}</div></div>`;
      });
      wrap.innerHTML=html;
    }
  } else if(studioTab===1){
    // ─── TASK BOARD (Kanban) with sort & group-by-type ───
    const statuses=['To Do','In Progress','Done'];
    const colors=['var(--text3)','var(--amber)','var(--green)'];
    const allTasks=sortedTasks();
    if(taskGroup==='type'){
      // group columns by project type
      const typeMap={};allTasks.forEach(t=>{const proj=DB.projects.find(p=>p.id===t.projectId);const grp=proj?proj.type:'No Project';if(!typeMap[grp])typeMap[grp]=[];typeMap[grp].push(t)});
      let html='';
      Object.keys(typeMap).sort().forEach(grp=>{
        const cardBg=['var(--bg3)','rgba(245,158,11,.06)','rgba(34,197,94,.06)'];
      html+=`<div style="margin-bottom:20px"><div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">${grp} <span style="color:var(--text3);font-weight:400">(${typeMap[grp].length})</span></div><div class="task-board">${statuses.map((s,si)=>{const tasks=typeMap[grp].filter(t=>t.status===s);return`<div class="task-col" style="border-top:3px solid ${colors[si]}"><div class="task-col-hdr"><span class="task-col-title" style="color:${colors[si]}">${s}</span><span class="task-col-count">${tasks.length}</span></div><div class="task-col-body">${tasks.length?tasks.map(t=>{const proj=DB.projects.find(p=>p.id===t.projectId);return`<div class="task-card" style="background:${cardBg[si]}" onclick="viewTask(${t.id})"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div class="task-title" style="flex:1">${t.title}</div><button onclick="event.stopPropagation();openEditTask(${t.id})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;padding:0 0 0 6px;flex-shrink:0">✎</button></div><div class="task-meta"><div class="task-prio" style="background:${prioColor[t.priority]||'var(--blue)'}"></div>${t.priority}${proj?' · '+proj.name:''}<span style="margin-left:auto"><div class="av" style="background:${getUserColor(t.assignee)}22;color:${getUserColor(t.assignee)};width:18px;height:18px;font-size:7px" title="${getUserName(t.assignee)}">${getUserName(t.assignee)[0]}</div></span></div>${t.dueDate?`<div style="font-size:9px;color:var(--text3);margin-top:4px">Due: ${fmtDate(t.dueDate)}</div>`:''}</div>`}).join(''):'<div class="empty" style="padding:16px;font-size:10px">No tasks</div>'}</div></div>`}).join('')}</div></div>`;
      });
      wrap.innerHTML=activityStrip+(html||'<div class="empty">No tasks yet.</div>');
    } else {
      const cardBg2=['var(--bg3)','rgba(245,158,11,.06)','rgba(34,197,94,.06)'];
      wrap.innerHTML=activityStrip+`<div class="task-board">${statuses.map((s,si)=>{
        const tasks=allTasks.filter(t=>t.status===s);
        return `<div class="task-col" style="border-top:3px solid ${colors[si]}"><div class="task-col-hdr"><span class="task-col-title" style="color:${colors[si]}">${s}</span><span class="task-col-count">${tasks.length}</span></div><div class="task-col-body">${tasks.length?tasks.map(t=>{
          const proj=DB.projects.find(p=>p.id===t.projectId);
          return `<div class="task-card" style="background:${cardBg2[si]}" onclick="viewTask(${t.id})"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div class="task-title" style="flex:1">${t.title}</div><button onclick="event.stopPropagation();openEditTask(${t.id})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;padding:0 0 0 6px;flex-shrink:0">✎</button></div><div class="task-meta"><div class="task-prio" style="background:${prioColor[t.priority]||'var(--blue)'}"></div>${t.priority}${proj?' · '+proj.name:''}<span style="margin-left:auto"><div class="av" style="background:${getUserColor(t.assignee)}22;color:${getUserColor(t.assignee)};width:18px;height:18px;font-size:7px" title="${getUserName(t.assignee)}">${getUserName(t.assignee)[0]}</div></span></div>${t.dueDate?`<div style="font-size:9px;color:var(--text3);margin-top:4px">Due: ${fmtDate(t.dueDate)}</div>`:''}</div>`;
        }).join(''):'<div class="empty" style="padding:16px;font-size:10px">No tasks</div>'}</div></div>`;
      }).join('')}</div>`;
    }
  } else if(studioTab===2){
    // ─── TASK LIST (dash-task-grid style) ───
    const tasks=sortedTasks();
function _studioTaskCard(t){
  const proj=DB.projects.find(p=>p.id===t.projectId);
  const status=_dashStatusLabel?.(t.status)||t.status;
  const isDone=status==='Done';
  const statusClass=status==='Done'?'pg_':status==='In Progress'||status==='Ongoing'?'pb_':'pa_';
  const nextLabel=status==='To Do'?'Start':status==='In Progress'||status==='Ongoing'?'Done':'Done';
  const click=`cycleTaskStatus(${t.id})`;
  return `<article class="dash-task-card ${isDone?'done':''}">
    <div class="dash-task-top">
      <span class="dash-module" style="--module:var(--blue)">${proj?proj.name:'Studio'}</span>
      <span class="pill ${statusClass}">${status}</span>
    </div>
    <div style="display:flex;align-items:flex-start;gap:6px">
      <h3 style="flex:1;cursor:pointer;color:var(--accent);font-size:12px;margin:8px 0 4px" onclick="viewTask(${t.id})">${t.title||'Untitled task'}
        <span style="display:inline-flex;gap:2px;margin-left:4px;vertical-align:middle">
          <button class="btn-o btn-xs" onclick="event.stopPropagation();openEditTask(${t.id})" style="padding:1px 4px;font-size:8px;line-height:12px">✎</button>
          <button class="btn-danger btn-xs" onclick="event.stopPropagation();deleteTask(${t.id})" style="padding:1px 4px;font-size:8px;line-height:12px">✕</button>
        </span>
      </h3>
    </div>
    <div class="dash-task-meta">
      <span><i style="background:${prioColor[t.priority]||'var(--blue)'}"></i>${t.priority||'normal'}</span>
      <span>${getUserName(t.assignee)}</span>
    </div>
    <div class="dash-task-foot">
      <span>${proj?proj.name:'No project'}</span>
      <span>${t.dueDate?fmtDate(t.dueDate):'No due date'}</span>
    </div>
    ${!isDone?`<button class="btn-o btn-xs" onclick="${click}">${nextLabel}</button>`:''}
  </article>`;
}
    if(taskGroup==='type'){
      const typeMap={};tasks.forEach(t=>{const proj=DB.projects.find(p=>p.id===t.projectId);const grp=proj?proj.type:'No Project';if(!typeMap[grp])typeMap[grp]=[];typeMap[grp].push(t)});
      let html='';
      Object.keys(typeMap).sort().forEach(grp=>{
        html+=`<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">${grp} <span style="color:var(--text3);font-weight:400">(${typeMap[grp].length})</span></div><div class="dash-task-grid">${typeMap[grp].map(t=>_studioTaskCard(t)).join('')}</div></div>`;
      });
      wrap.innerHTML=activityStrip+(html||'<div class="empty">No tasks yet.</div>');
    } else {
      wrap.innerHTML=activityStrip+`<div class="dash-task-grid">${tasks.length?tasks.map(t=>_studioTaskCard(t)).join(''):'<div class="empty">No tasks yet. Click + New Task</div>'}</div>`;
    }
  } else if(studioTab===3){
    // ─── FEEDBACK BOARD (Kanban) ───
    const statuses=['To Do','Ongoing','Done'];
    const statusColor={'To Do':'var(--text3)','Ongoing':'var(--yellow,#f59e0b)','Done':'var(--green)'};
    const statusBg={'To Do':'var(--bg3)','Ongoing':'rgba(245,158,11,.08)','Done':'rgba(34,197,94,.08)'};
    const feedbacks=DB.feedbacks||[];
    function renderFbKanban(items){
      const fbColors=['var(--text3)','var(--amber)','var(--green)'];
      const fbCardBg=['var(--bg3)','rgba(245,158,11,.06)','rgba(34,197,94,.06)'];
      let h=`<div class="task-board">`;
      statuses.forEach((st,si)=>{
        const cards=items.filter(f=>f.status===st);
        const ac=fbColors[si];
        h+=`<div class="task-col" style="border-top:3px solid ${ac}"><div class="task-col-hdr"><span class="task-col-title" style="color:${ac}">${st}</span><span class="task-col-count">${cards.length}</span></div><div class="task-col-body">`;
        if(!cards.length){h+=`<div class="empty" style="padding:16px;font-size:10px">No items</div>`;}
        cards.forEach(f=>{
          const proj=f.projectId?DB.projects.find(p=>p.id===f.projectId):null;
          h+=`<div class="task-card" style="background:${fbCardBg[si]}" onclick="viewFeedback(${f.id})"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div class="task-title" style="flex:1">${f.title||'(Untitled)'}</div><button onclick="event.stopPropagation();openFeedbackModal(${f.id})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;padding:0 0 0 6px;flex-shrink:0">✎</button></div><div class="task-meta">${f.assignee?`<div class="av" style="background:${getUserColor(f.assignee)}22;color:${getUserColor(f.assignee)};width:18px;height:18px;font-size:7px" title="${getUserName(f.assignee)}">${getUserName(f.assignee)[0]}</div>${getUserName(f.assignee)}`:''}${proj?`<span style="margin-left:auto;font-size:9px;color:var(--text3)">📁 ${proj.name}</span>`:''}</div>${f.revisionPhase?`<div style="font-size:9px;color:var(--accent);margin-top:4px">🔁 ${f.revisionPhase}</div>`:''}${f.dueDate?`<div style="font-size:9px;color:var(--text3);margin-top:2px">📅 ${fmtDate(f.dueDate)}</div>`:''}<div style="display:flex;justify-content:flex-end;gap:4px;margin-top:6px">${st!=='Done'?`<button onclick="event.stopPropagation();moveFeedback(${f.id},'forward')" style="font-size:9px;padding:2px 8px;border-radius:4px;border:1px solid ${ac};color:${ac};background:transparent;cursor:pointer">→ ${st==='To Do'?'Ongoing':'Done'}</button>`:''}${st!=='To Do'?`<button onclick="event.stopPropagation();moveFeedback(${f.id},'back')" style="font-size:9px;padding:2px 8px;border-radius:4px;border:1px solid var(--text3);color:var(--text3);background:transparent;cursor:pointer">← Back</button>`:''}</div></div>`;
        });
        h+=`</div></div>`;
      });
      h+=`</div>`;
      return h;
    }
    if(fbGroup==='project'){
      const projMap={};
      feedbacks.forEach(f=>{const key=f.projectId||'__none__';if(!projMap[key])projMap[key]=[];projMap[key].push(f);});
      let html='';
      Object.keys(projMap).sort((a,b)=>{if(a==='__none__')return 1;if(b==='__none__')return -1;const pa=DB.projects.find(p=>p.id===parseInt(a)),pb=DB.projects.find(p=>p.id===parseInt(b));return(pa?pa.name:'').localeCompare(pb?pb.name:'');}).forEach(key=>{
        const proj=key!=='__none__'?DB.projects.find(p=>p.id===parseInt(key)):null;
        const label=proj?proj.name:'No Project';
        html+=`<div style="margin-bottom:24px"><div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">📁 ${label} <span style="color:var(--text3);font-weight:400">(${projMap[key].length})</span></div>${renderFbKanban(projMap[key])}</div>`;
      });
      wrap.innerHTML=activityStrip+(html||'<div class="empty">No feedback yet.</div>');
    } else {
      wrap.innerHTML=activityStrip+renderFbKanban(feedbacks);
    }
  } else if(studioTab===4){
    // ─── FEEDBACK LIST (dash-task-grid style) ───
    const feedbacks=(DB.feedbacks||[]).slice();
    if(fbListSort==='due')feedbacks.sort((a,b)=>{if(!a.dueDate)return 1;if(!b.dueDate)return -1;return new Date(a.dueDate)-new Date(b.dueDate);});
    else if(fbListSort==='status'){const so={'To Do':0,'Ongoing':1,'Done':2};feedbacks.sort((a,b)=>(so[a.status]||0)-(so[b.status]||0));}
    else if(fbListSort==='newest')feedbacks.sort((a,b)=>{const da=a.createdAt?new Date(a.createdAt):0;const db=b.createdAt?new Date(b.createdAt):0;return db-da;});
    else feedbacks.sort((a,b)=>(a.title||'').localeCompare(b.title||''));
    const _sb=(v,l)=>`<button class="btn-xs btn-o" onclick="setFbListSort('${v}')" style="border-color:${fbListSort===v?'var(--accent)':'var(--border2)'};color:${fbListSort===v?'var(--accent)':'var(--text2)'}">${l}</button>`;
    const _gb=(v,l)=>`<button class="btn-xs btn-o" onclick="setFbListGroup('${v}')" style="border-color:${fbListGroup===v?'var(--accent)':'var(--border2)'};color:${fbListGroup===v?'var(--accent)':'var(--text2)'}">${l}</button>`;
    const ctrl=`<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap"><span style="font-size:10px;color:var(--text3)">Sort:</span>${_sb('title','Title')}${_sb('due','Due')}${_sb('status','Status')}${_sb('newest','Newest')}<span style="margin-left:6px;font-size:10px;color:var(--text3)">Group:</span>${_gb('none','None')}${_gb('project','By Project')}${_gb('assignee','By Assignee')}</div>`;
function _studioFbCard(f){
  const proj=f.projectId?DB.projects.find(p=>p.id===f.projectId):null;
  const status=_dashStatusLabel?.(f.status)||f.status;
  const isDone=status==='Done';
  const statusClass=status==='Done'?'pg_':status==='Ongoing'?'pb_':'pa_';
  const nextLabel=status==='To Do'?'Start':status==='Ongoing'?'Done':'Done';
  const click=`moveFeedback(${f.id},'forward')`;
  return `<article class="dash-task-card ${isDone?'done':''}">
    <div class="dash-task-top">
      <span class="dash-module" style="--module:var(--blue)">Feedback</span>
      <span class="pill ${statusClass}">${status}</span>
    </div>
    <div style="display:flex;align-items:flex-start;gap:6px">
      <h3 style="flex:1;cursor:pointer;color:var(--accent);font-size:12px;margin:8px 0 4px" onclick="viewFeedback(${f.id})">${f.title||'(Untitled)'}
        <span style="display:inline-flex;gap:2px;margin-left:4px;vertical-align:middle">
          <button class="btn-o btn-xs" onclick="event.stopPropagation();openFeedbackModal(${f.id})" style="padding:1px 4px;font-size:8px;line-height:12px">✎</button>
        </span>
      </h3>
    </div>
    <div class="dash-task-meta">
      <span>${f.assignee?getUserName(f.assignee):'—'}</span>
      <span>${f.revisionPhase?'🔁 '+f.revisionPhase:''}</span>
    </div>
    <div class="dash-task-foot">
      <span>${proj?proj.name:'No project'}</span>
      <span>${f.dueDate?fmtDate(f.dueDate):'No due date'}</span>
    </div>
    ${!isDone?`<button class="btn-o btn-xs" onclick="${click}">${nextLabel}</button>`:''}
  </article>`;
}
    if(fbListGroup!=='none'){
      const gMap={};
      feedbacks.forEach(f=>{const k=fbListGroup==='project'?(f.projectId||'__none__'):(f.assignee||'__none__');if(!gMap[k])gMap[k]=[];gMap[k].push(f);});
      let html=activityStrip+ctrl;
      Object.keys(gMap).sort((a,b)=>{if(a==='__none__')return 1;if(b==='__none__')return -1;if(fbListGroup==='project'){const pa=DB.projects.find(p=>p.id===parseInt(a)),pb=DB.projects.find(p=>p.id===parseInt(b));return(pa?pa.name:'').localeCompare(pb?pb.name:'');}return getUserName(a).localeCompare(getUserName(b));}).forEach(k=>{const label=fbListGroup==='project'?(k==='__none__'?'No Project':(DB.projects.find(p=>p.id===parseInt(k))?.name||'—')):(k==='__none__'?'Unassigned':getUserName(k));html+=`<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">${label} <span style="color:var(--text3);font-weight:400">(${gMap[k].length})</span></div><div class="dash-task-grid">${gMap[k].map(f=>_studioFbCard(f)).join('')}</div></div>`;});
      wrap.innerHTML=html;
    } else {
      wrap.innerHTML=activityStrip+ctrl+`<div class="dash-task-grid">${feedbacks.length?feedbacks.map(f=>_studioFbCard(f)).join(''):'<div class="empty">No feedback yet.</div>'}</div>`;
    }
  }
}
