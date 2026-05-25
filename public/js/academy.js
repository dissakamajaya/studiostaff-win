// ════════════════════════════════════════
// ACADEMY MODULE — fixed version
// Changes vs original:
//   Bug 1: saveClass() overrides saves.js version — same logic + bulk assign after save
//   Bug 2: openAddStudent() added to pre-populate st-class dropdown
//          saveStudent/updateStudent/deleteStudent all sync class counts
//   Bug 3: academyTab===3 → Student Progress Dashboard with notes
//   EDIT:  openEditClass() + updateClass() — mirrors new-class fields incl. students picker
// ════════════════════════════════════════

function getClassTotalMeet(cls){
  const total=parseInt(cls?.totalMeet||cls?.duration||1,10);
  return Math.max(total||1,1);
}
function getClassBatchNo(cls){
  const batch=parseInt(cls?.batchNo||1,10);
  return Math.max(batch||1,1);
}
function getClassCode(cls){
  if(!cls)return'AC-0000';
  if(!cls.code)cls.code=`AC-${String(cls.id||0).padStart(4,'0')}`;
  return cls.code;
}
function getClassMeetLabel(cls){
  return `Batch ${getClassBatchNo(cls)} of ${getClassTotalMeet(cls)}`;
}
function getClassMeetProgress(cls){
  const total=getClassTotalMeet(cls);
  const completed=Math.min(Math.max(parseInt(cls?.completedMeet||0,10)||0,0),total);
  return {total, completed, pct: total ? Math.round((completed/total)*100) : 0};
}
function syncClassMeetProgress(classId){
  const cls=(DB.classes||[]).find(c=>c.id===classId);
  if(!cls)return null;
  cls.totalMeet=getClassTotalMeet(cls);
  cls.batchNo=getClassBatchNo(cls);
  cls.code=getClassCode(cls);
  cls.completedMeet=Math.min(Math.max(parseInt(cls.completedMeet||0,10)||0,0),cls.totalMeet);
  const enrolled=(DB.students||[]).filter(s=>s.classId===classId);
  enrolled.forEach(s=>{
    s.totalMeetEnrolled=cls.totalMeet;
    s.completedMeet=cls.completedMeet;
    s.progress=cls.totalMeet?Math.min(100,Math.round((cls.completedMeet/cls.totalMeet)*100)):0;
    if(cls.completedMeet>=cls.totalMeet){
      s.status='Graduate';
      if(!s.graduatedAt)s.graduatedAt=new Date().toISOString();
    } else if(s.status==='Graduate'){
      s.status='Active';
      s.graduatedAt=null;
    }
  });
  if(cls.completedMeet>=cls.totalMeet){
    cls.status='Completed';
  }
  return cls;
}
function syncStudentFromClass(studentId){
  const s=(DB.students||[]).find(x=>x.id===studentId);
  if(!s)return null;
  const cls=s.classId?(DB.classes||[]).find(c=>c.id===s.classId):null;
  if(cls){
    const meta=getClassMeetProgress(cls);
    s.totalMeetEnrolled=meta.total;
    s.completedMeet=meta.completed;
    s.progress=meta.pct;
    if(meta.completed>=meta.total){
      s.status='Graduate';
      if(!s.graduatedAt)s.graduatedAt=new Date().toISOString();
    }
  } else {
    s.totalMeetEnrolled=0;
    s.completedMeet=0;
    s.progress=0;
  }
  return s;
}
function createAcademyQuoteItems(student, cls){
  const totalMeet=getClassTotalMeet(cls);
  const fee=parseFloat(cls?.fee||0)||0;
  return [{
    desc:`${cls?cls.name:'Academy Class'} — ${student.name} (${getClassMeetLabel(cls)})`,
    qty: totalMeet,
    price: fee,
  }];
}

function renderAcademy(){
  const students=DB.students||[];
  const totalFee=DB.classes.reduce((s,c)=>s+(c.fee||0)*getClassTotalMeet(c)*(c.students||0),0);
  document.getElementById('academy-sub').textContent=`${DB.classes.length} classes · ${students.length} students`;
  const wrap=document.getElementById('academy-tab-content');
  if(!wrap)return;

  if(academyTab===0){
    const activeClasses=DB.classes.filter(c=>c.status==='Active');
    wrap.innerHTML=`
      <div class="kgrid">
        <div class="kc"><div class="kl">Active Classes</div><div class="kv" style="color:var(--green)">${activeClasses.length}</div></div>
        <div class="kc"><div class="kl">Total Students</div><div class="kv" style="color:var(--blue)">${students.length}</div></div>
        <div class="kc"><div class="kl">Est. Revenue</div><div class="kv" style="color:var(--accent);font-size:16px">${rp(totalFee)}</div></div>
        <div class="kc"><div class="kl">Instructors</div><div class="kv">${ACADEMY_INSTRUCTORS.length}</div></div>
      </div>
      <div style="background:var(--abg);border:1px solid var(--accent);border-radius:8px;padding:14px;margin-bottom:14px">
        <div style="font-size:10px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">🟢 Active Class Schedule</div>
        ${activeClasses.length?activeClasses.map(c=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
            <div><div style="font-size:12px;font-weight:600;color:var(--text)">${c.name}</div><div style="font-size:10px;color:var(--text3);margin-top:2px">${getInstructorName(c.instructor)} · ${c.schedule||'No schedule set'} · ${getClassCode(c)} · <b>Batch ${getClassBatchNo(c)}</b></div></div>
            <div style="text-align:right"><div style="font-size:11px;color:var(--green)">${rp(c.fee)}/meet</div><div style="font-size:10px;color:var(--text3)">${getClassMeetLabel(c)} · ${c.students||0}/${c.maxStudents||'∞'} students</div></div>
          </div>`).join(''):'<div style="font-size:11px;color:var(--text3);padding:8px 0">No active classes. Add a class to get started.</div>'}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="panel"><div class="pnh"><span class="pnt">All Classes</span></div>
          ${DB.classes.length?DB.classes.map(c=>`<div class="lr"><div><div style="font-size:11px;font-weight:500">${c.name}</div><div style="font-size:10px;color:var(--text3)">${getClassCode(c)} · ${getClassMeetLabel(c)} · ${c.schedule||'—'}</div></div><div style="text-align:right"><span class="pill ${c.status==='Completed'?'pp_':c.status==='Active'?'pg_':'pa_'}">${c.status}</span></div></div>`).join(''):'<div class="empty" style="padding:12px">No classes yet.</div>'}
        </div>
        <div class="panel"><div class="pnh"><span class="pnt">Recent Students</span></div>
          ${students.slice(-5).reverse().map(s=>{const cls=DB.classes.find(c=>c.id===s.classId);const progress=s.progress||0;return`<div class="lr"><div><div style="font-size:11px;font-weight:500">${s.name}</div><div style="font-size:10px;color:var(--text3)">${cls?`${cls.name} · ${getClassMeetLabel(cls)}`:'No class'}</div><div class="prog-bar" style="margin-top:4px;width:180px"><div class="prog-fill" style="width:${progress}%;background:${progress===100?'var(--green)':'var(--accent)'}"></div></div></div><span class="pill ${s.status==='Graduate'?'pp_':s.status==='Active'?'pg_':'pa_'}">${s.status}</span></div>`;}).join('')||'<div class="empty" style="padding:12px">No students yet.</div>'}
        </div>
      </div>`;

  } else if(academyTab===1){
    if(!DB.classes.length){wrap.innerHTML='<div class="empty">No classes yet.</div>';return}
    const statusColor={Active:'pg_',Full:'pb_',Completed:'pp_',Cancelled:'pr_',Rescheduled:'pa_'};
    const tbl=DB.classes.map(c=>`<tr><td style="font-weight:500">${c.name}<div style="font-size:9px;color:var(--text3);margin-top:2px">${getClassCode(c)} · <b>Batch ${getClassBatchNo(c)}</b></div></td><td>${getInstructorName(c.instructor)}</td><td class="tc">${getClassBatchNo(c)}</td><td class="tc">${getClassMeetLabel(c)}</td><td class="tc">${c.students||0}/${c.maxStudents||'∞'}</td><td class="tc">${c.schedule||'—'}</td><td><span class="pill ${statusColor[c.status]||'pg_'}">${c.status}</span></td><td><div style="display:flex;gap:4px;flex-wrap:wrap"><button class="btn-o btn-xs" onclick="viewClass(${c.id})">View</button><button class="btn-o btn-xs" onclick="openEditClass(${c.id})">✎</button>${c.status==='Active'&&((getClassMeetProgress(c).completed)<getClassMeetProgress(c).total)?`<button class="btn-xs" style="background:var(--green)" onclick="completeClassMeet(${c.id})">✓ Meet</button><button class="btn-xs" style="background:var(--amber)" onclick="setClassStatus(${c.id},'Rescheduled')">↺</button><button class="btn-danger btn-xs" onclick="setClassStatus(${c.id},'Cancelled')">✕</button>`:''}${c.status!=='Active'?`<button class="btn-xs" style="background:var(--blue)" onclick="setClassStatus(${c.id},'Active')">↩ Active</button>`:''}</div></td></tr>`).join('');
    const cards=DB.classes.map(c=>{const sc=statusColor[c.status]||'pg_';const meta=getClassMeetProgress(c);return`<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${c.name}</div><div class="card-item-sub">${getInstructorName(c.instructor)} · ${getClassCode(c)} · Batch ${getClassBatchNo(c)}</div></div><span class="pill ${sc}">${c.status}</span></div><div class="card-item-row"><span class="card-item-label">Meet</span><span class="card-item-val">${getClassMeetLabel(c)}</span></div><div class="card-item-row"><span class="card-item-label">Students</span><span class="card-item-val">${c.students||0}/${c.maxStudents||'∞'}</span></div><div class="card-item-row"><span class="card-item-label">Schedule</span><span class="card-item-val">${c.schedule||'—'}</span></div><div class="card-item-row"><span class="card-item-label">Progress</span><span class="card-item-val">${meta.completed}/${meta.total} meet${meta.total!==1?'s':''}</span></div><div class="card-item-actions"><button class="btn-o btn-xs" onclick="viewClass(${c.id})">View</button><button class="btn-o btn-xs" onclick="openEditClass(${c.id})">✎ Edit</button>${c.status==='Active'&&meta.completed<meta.total?`<button class="btn-xs" style="background:var(--green)" onclick="completeClassMeet(${c.id})">✓ Meet</button>`:''}</div></div>`;}).join('');
    wrap.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>Class</th><th>Instructor</th><th>Batch</th><th>Meet</th><th>Students</th><th>Schedule</th><th>Status</th><th>Action</th></tr></thead><tbody>${tbl}</tbody></table></div><div class="card-list">${cards}</div>`;

  } else if(academyTab===2){
    if(!students.length){wrap.innerHTML='<div class="empty">No students yet. Click <b style="color:var(--accent)">+ Add Student</b></div>';return}
    const tbl=students.map(s=>{const cls=DB.classes.find(c=>c.id===s.classId);const progress=s.progress||0;return`<tr><td style="font-weight:500">${s.name}</td><td>${cls?`${cls.name}<div style="font-size:9px;color:var(--text3)">${getClassCode(cls)}</div>`:'—'}</td><td class="tc">${s.phone||'—'}</td><td class="tc">${s.email||'—'}</td><td class="tc">${fmtDate(s.enrollDate)}</td><td class="tc"><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;min-width:90px;height:4px;background:var(--bg4);border-radius:2px"><div style="width:${progress}%;height:100%;background:${progress===100?'var(--green)':'var(--accent)'};border-radius:2px"></div></div><span style="font-size:10px;color:var(--text3)">${progress}%</span></div></td><td><span class="pill ${s.status==='Graduate'?'pp_':s.status==='Active'?'pg_':'pa_'}">${s.status}</span></td><td><div style="display:flex;gap:4px;flex-wrap:wrap"><button class="btn-o btn-xs" onclick="openEditStudent(${s.id})">✎</button><button class="btn btn-xs" style="background:var(--accent)" onclick="createStudentQuote(${s.id})" title="Create quote for this student">+ Quote</button><button class="btn-danger btn-xs" onclick="deleteStudent(${s.id})">✕</button></div></td></tr>`;}).join('');
    const cards=students.map(s=>{const cls=DB.classes.find(c=>c.id===s.classId);const progress=s.progress||0;return`<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${s.name}</div><div class="card-item-sub">${cls?`${cls.name} · ${getClassMeetLabel(cls)}`:'No class'}</div></div><span class="pill ${s.status==='Graduate'?'pp_':s.status==='Active'?'pg_':'pa_'}">${s.status}</span></div><div class="card-item-row"><span class="card-item-label">Phone</span><span class="card-item-val">${s.phone||'—'}</span></div><div class="card-item-row"><span class="card-item-label">Meet</span><span class="card-item-val">${s.completedMeet||0}/${s.totalMeetEnrolled||getClassTotalMeet(cls||{})}</span></div><div class="card-item-row"><span class="card-item-label">Progress</span><span class="card-item-val">${progress}%</span></div><div class="card-item-actions"><button class="btn-o btn-xs" onclick="openEditStudent(${s.id})">✎ Edit</button><button class="btn btn-xs" style="background:var(--accent)" onclick="createStudentQuote(${s.id})">+ Quote</button></div></div>`;}).join('');
    wrap.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>Name</th><th>Class</th><th>Phone</th><th>Email</th><th>Enrolled</th><th>Progress</th><th>Status</th><th>Action</th></tr></thead><tbody>${tbl}</tbody></table></div><div class="card-list">${cards}</div>`;

  } else if(academyTab===3){
    // Progress dashboard based on class meets
    if(!students.length){wrap.innerHTML='<div class="empty">No students yet. Add students to see progress reports.</div>';return}
    const cards=students.map(s=>{
      const cls=DB.classes.find(c=>c.id===s.classId);
      const meta=cls?getClassMeetProgress(cls):{total:s.totalMeetEnrolled||0,completed:s.completedMeet||0,pct:s.progress||0};
      const upcomingClass=s.classId?DB.classes.find(c=>c.id===s.classId&&c.status==='Active'):null;
      return`<div class="progress-card">
        <div class="pc-header">
          <div><div class="pc-name">${s.name}</div><div class="pc-class">${cls?`${cls.name} · ${getClassCode(cls)}`:'No class assigned'}</div></div>
          <span class="pill ${s.status==='Graduate'?'pp_':s.status==='Active'?'pg_':'pa_'}">${s.status}</span>
        </div>
        <div class="pc-section">
          <div class="pc-label">Progress</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${meta.pct}%"></div></div>
          <div style="font-size:10px;color:var(--text3);margin-top:4px">${meta.completed}/${meta.total} meet${meta.total!==1?'s':''} completed</div>
        </div>
        <div class="pc-section">
          <div class="pc-label">Class Batch</div>
          ${upcomingClass
            ?`<div style="font-size:10px;padding:8px;background:var(--bg3);border-radius:6px"><div style="font-weight:500;color:var(--accent)">${upcomingClass.name}</div><div style="color:var(--text3);margin-top:2px">${getClassMeetLabel(upcomingClass)} · ${upcomingClass.schedule||'Schedule TBA'}</div></div>`
            :'<div style="font-size:10px;color:var(--text3);padding:6px 0">No active class</div>'}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          ${cls&&meta.pct<100?`<button class="btn-o btn-xs" onclick="completeClassMeet(${cls.id})">✓ Meet</button>`:''}
          <button class="btn-o btn-xs" onclick="createStudentQuote(${s.id})">+ Quote</button>
          <button class="btn-o btn-xs" onclick="openEditStudent(${s.id})">✎ Edit</button>
        </div>
      </div>`;
    }).join('');
    wrap.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">${cards}</div>`;

  } else {
    const data=DB.invoices.filter(i=>i.category==='Academy');
    if(!data.length){wrap.innerHTML='<div class="empty">No academy quotes or invoices yet.</div>';return}
    const tbl=data.map(inv=>{const c=DB.clients.find(cl=>cl.id===inv.clientId);const num=getInvNum(inv);const sc={'Awaiting Approval':'pa_',Approved:'pg_',Rejected:'pr_',Accepted:'pg_',Paid:'pg_',Overdue:'pr_'}[inv.status]||'pa_';return`<tr><td style="color:var(--accent)">${num}</td><td>${c?c.name:'—'}</td><td style="color:var(--green)">${rp(inv.total)}</td><td class="tc">${inv.due?fmtDate(inv.due):'—'}</td><td><span class="pill ${inv.type==='quote'?'pb_':'pa_'}">${inv.type==='quote'?'Quote':'Invoice'}</span></td><td><span class="pill ${sc}">${inv.status}</span></td><td><button class="btn-o btn-xs" onclick="viewInvoice(${inv.id})">View</button></td></tr>`;}).join('');
    wrap.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>#</th><th>Client</th><th>Total</th><th>Due</th><th>Type</th><th>Status</th><th>Action</th></tr></thead><tbody>${tbl}</tbody></table></div>`;
  }
}

// ════════════════════════════════════════
// BUG 1: saveClass override — identical logic to saves.js + bulk assign after
// (place this file AFTER saves.js in your HTML so it takes precedence)
// ════════════════════════════════════════
function openNewClassModal(){
  const existingBatches=DB.classes.filter(c=>c.name).map(c=>c.batchNo||1);
  const nextBatch=existingBatches.length?Math.max(...existingBatches,0)+1:1;
  const batchEl=document.getElementById('ac-batch-no');
  if(batchEl)batchEl.value=nextBatch;
  const codeEl=document.getElementById('ac-code');
  if(codeEl)codeEl.value='';
  // Reset form fields for new class
  ['ac-name','ac-fee','ac-total-meet','ac-sched','ac-time','ac-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const durSel=document.getElementById('ac-dur');if(durSel)durSel.value='1';
  const durCust=document.getElementById('ac-dur-custom');if(durCust){durCust.value='';durCust.style.display='none';}
  const pick=document.getElementById('ac-students-pick');if(pick)pick.innerHTML='';
  document.querySelector('#modal-class .mt').textContent='Add Class';
  const saveBtn=document.querySelector('#modal-class .ma .btn');
  if(saveBtn){saveBtn.textContent='Save';saveBtn.onclick=saveClass;}
  openModal('modal-class');
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
  cls.code=getClassCode(cls);
  DB.classes.push(cls);
  // Assign classId on any pre-selected students
  relatedStudents.forEach(sid=>{
    const s=(DB.students||[]).find(x=>x.id===sid);
    if(s){
      s.classId=cls.id;
      syncStudentFromClass(s.id);
    }
  });
  syncClassMeetProgress(cls.id);
  // Auto-add to calendar
  if(sched){
    const instructorName=getInstructorName(instructor);
    DB.events.push({id:DB.nextId.ev++,title:`🎓 ${name} — ${instructorName}`,date:sched,time:time||'',duration,color:'var(--blue)',notes,createdBy:currentUser,createdAt:new Date().toISOString()});
  }
  // Reset fields
  ['ac-name','ac-fee','ac-total-meet','ac-sched','ac-time','ac-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const batch=document.getElementById('ac-batch-no');if(batch)batch.value='1';
  const code=document.getElementById('ac-code');if(code)code.value='';
  const durPick=document.getElementById('ac-dur-pick');if(durPick){durPick.querySelectorAll('.assign-opt').forEach((o,i)=>o.classList.toggle('sel',i===0));}
  const durH=document.getElementById('ac-dur');if(durH)durH.value='1';
  const durCust=document.getElementById('ac-dur-custom');if(durCust){durCust.value='';durCust.style.display='none';}
  closeModal('modal-class');
  // Save first, then offer bulk assign once done
  triggerSaveWithFeedback('Class created!',()=>openBulkAssignStudents(cls.id));
  renderPage(_currentPage);
}

// ════════════════════════════════════════
// openEditClass — reuses same modal-class, mirrors all new-class fields
// ════════════════════════════════════════
function openEditClass(id){
  const c=DB.classes.find(x=>x.id===id);if(!c)return;
  const set=(eid,v)=>{const el=document.getElementById(eid);if(el)el.value=v;};
  set('ac-name',c.name);
  set('ac-instructor',c.instructor||'');
  set('ac-fee',c.fee||0);
  set('ac-batch-no',c.batchNo||1);
  set('ac-total-meet',c.totalMeet||1);
  set('ac-code',getClassCode(c));
  set('ac-sched',c.schedDate||'');
  set('ac-time',c.schedTime||'');
  set('ac-notes',c.notes||'');
  set('ac-dur',String(c.duration||'1'));
  // Populate students picker, mark those assigned to this class
  _populateClassStudentPicker(id);
  // Switch button to update mode
  const saveBtn=document.querySelector('#modal-class .ma .btn');
  if(saveBtn){saveBtn.textContent='Save Changes';saveBtn.onclick=()=>updateClass(id);}
  openModal('modal-class');
}

function _populateClassStudentPicker(classId){
  const pick=document.getElementById('ac-students-pick');
  if(!pick)return;
  const students=DB.students||[];
  if(!students.length){pick.innerHTML='<div style="font-size:10px;color:var(--text3);padding:6px">No students yet</div>';return;}
  pick.innerHTML=students.map(s=>{
    const isSel=s.classId===classId;
    return`<div class="assign-opt${isSel?' sel':''}" data-sid="${s.id}" onclick="this.classList.toggle('sel')" style="display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:6px;cursor:pointer;border:1px solid var(--border);margin:3px">
      <div class="av" style="background:${avColor(s.name)}22;color:${avColor(s.name)};width:20px;height:20px;font-size:8px">${initials(s.name)}</div>
      <span style="font-size:10px">${s.name}</span>
    </div>`;
  }).join('');
}

function updateClass(id){
  const c=DB.classes.find(x=>x.id===id);if(!c)return;
  c.name=document.getElementById('ac-name')?.value.trim()||c.name;
  c.instructor=document.getElementById('ac-instructor')?.value||c.instructor;
  c.fee=parseFloat(document.getElementById('ac-fee')?.value)||0;
  c.batchNo=parseInt(document.getElementById('ac-batch-no')?.value)||1;
  c.totalMeet=parseInt(document.getElementById('ac-total-meet')?.value)||c.totalMeet||1;
  const sched=document.getElementById('ac-sched')?.value||'';
  const time=document.getElementById('ac-time')?.value||'';
  c.schedDate=sched;c.schedTime=time;
  c.schedule=sched?(sched+(time?' '+time:'')):'TBD';
  c.notes=document.getElementById('ac-notes')?.value||'';
  const durVal=document.getElementById('ac-dur')?.value||'1';
  c.duration=durVal==='custom'?(parseFloat(document.getElementById('ac-dur-custom')?.value)||1):parseFloat(durVal);
  // Sync student assignments
  const newSids=[...document.querySelectorAll('#ac-students-pick .assign-opt.sel')].map(e=>parseInt(e.dataset.sid)).filter(Boolean);
  const oldSids=c.relatedStudents||[];
  oldSids.filter(sid=>!newSids.includes(sid)).forEach(sid=>{
    const s=(DB.students||[]).find(x=>x.id===sid);
    if(s&&s.classId===id)s.classId=null;
  });
  newSids.filter(sid=>!oldSids.includes(sid)).forEach(sid=>{
    const s=(DB.students||[]).find(x=>x.id===sid);
    if(s)s.classId=id;
  });
  c.relatedStudents=newSids;
  c.students=newSids.length;
  c.code=getClassCode(c);
  syncClassMeetProgress(c.id);
  // Reset button back to Add mode
  const saveBtn=document.querySelector('#modal-class .ma .btn');
  if(saveBtn){saveBtn.textContent='Save Class';saveBtn.onclick=saveClass;}
  closeModal('modal-class');
  triggerSaveWithFeedback('Class updated');
  renderPage(_currentPage);
}

function completeClassMeet(classId){
  const cls=DB.classes.find(c=>c.id===classId);if(!cls)return;
  const meta=getClassMeetProgress(cls);
  if(meta.completed>=meta.total){
    alert('This class already reached the total meet count.');
    return;
  }
  cls.completedMeet=meta.completed+1;
  syncClassMeetProgress(classId);
  if(cls.completedMeet>=cls.totalMeet){
    cls.status='Completed';
  }
  saveDBFn();
  renderAcademy();
}

// ════════════════════════════════════════
// BUG 1: Bulk-assign students after new class is created
// ════════════════════════════════════════
function openBulkAssignStudents(classId){
  const cls=DB.classes.find(c=>c.id===classId);if(!cls)return;
  const unassigned=(DB.students||[]).filter(s=>!s.classId);
  if(!unassigned.length)return; // nothing to assign, skip silently
  const existing=document.getElementById('modal-bulk-assign');
  if(existing)existing.remove();
  const modal=document.createElement('div');
  modal.id='modal-bulk-assign';
  modal.className='modal-bg';
  modal.style.cssText='display:flex;z-index:9999';
  modal.innerHTML=`
    <div class="modal" style="max-width:420px">
      <div class="mh"><span class="mt">Assign Students to "${cls.name}"</span></div>
      <div style="max-height:360px;overflow-y:auto;padding:14px">
        ${unassigned.map(s=>`
          <label style="display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid var(--border);cursor:pointer">
            <input type="checkbox" class="assign-chk" value="${s.id}" style="width:14px;height:14px;cursor:pointer">
            <div class="av" style="background:${avColor(s.name)}22;color:${avColor(s.name)};width:24px;height:24px;font-size:9px;flex-shrink:0">${initials(s.name)}</div>
            <div><div style="font-size:11px;font-weight:500">${s.name}</div><div style="font-size:10px;color:var(--text3)">${s.phone||'—'}</div></div>
          </label>`).join('')}
      </div>
      <div class="ma">
        <button class="btn-o" onclick="document.getElementById('modal-bulk-assign').remove()">Skip</button>
        <button class="btn" onclick="confirmBulkAssign(${classId})">Assign Selected</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
}

function confirmBulkAssign(classId){
  const cls=DB.classes.find(c=>c.id===classId);if(!cls)return;
  const chks=document.querySelectorAll('#modal-bulk-assign .assign-chk:checked');
  let count=0;
  chks.forEach(chk=>{
    const sid=parseInt(chk.value);
    const s=(DB.students||[]).find(x=>x.id===sid);
    if(s&&!s.classId){
      s.classId=classId;
      if(!cls.relatedStudents)cls.relatedStudents=[];
      if(!cls.relatedStudents.includes(sid))cls.relatedStudents.push(sid);
      cls.students=(cls.students||0)+1;
      syncStudentFromClass(sid);
      count++;
    }
  });
  syncClassMeetProgress(classId);
  document.getElementById('modal-bulk-assign')?.remove();
  triggerSaveWithFeedback(count?`${count} student${count!==1?'s':''} assigned`:'No students selected');
  renderAcademy();
}

// ════════════════════════════════════════
// BUG 2: Student CRUD
// ════════════════════════════════════════

// Call this from your "+ Add Student" button instead of openModal('modal-student')
function openAddStudent(){
  ['st-name','st-phone','st-email','st-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const stStatus=document.getElementById('st-status');if(stStatus)stStatus.value='Active';
  const stDate=document.getElementById('st-date');if(stDate)stDate.value=new Date().toISOString().split('T')[0];
  // Populate class dropdown BEFORE opening
  const sel=document.getElementById('st-class');
  if(sel){
    sel.innerHTML='<option value="">— Select class —</option>'+
      DB.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    sel.value='';
  }
  // Ensure button is in Add mode
  const saveBtn=document.querySelector('#modal-student .ma .btn');
  if(saveBtn){saveBtn.textContent='Add Student';saveBtn.onclick=saveStudent;}
  const m=document.getElementById('modal-student');
  if(m)m.classList.add('open');
  const ma=document.getElementById('main-area');if(ma)ma.style.position='relative';
}

function saveStudent(){
  const name=document.getElementById('st-name').value.trim();
  if(!name){alert('Student name required');return}
  const classIdVal=document.getElementById('st-class').value;
  const classId=classIdVal?parseInt(classIdVal):null;
  if(!DB.students)DB.students=[];
  const cls=classId?DB.classes.find(c=>c.id===classId):null;
  const s={
    id:DB.nextId.st++,name,
    phone:document.getElementById('st-phone').value,
    email:document.getElementById('st-email').value,
    classId,
    status:document.getElementById('st-status').value,
    enrollDate:document.getElementById('st-date').value||new Date().toISOString().split('T')[0],
    notes:document.getElementById('st-notes').value,
    totalMeetEnrolled:cls?getClassTotalMeet(cls):0,
    completedMeet:cls&&cls.completedMeet?cls.completedMeet:0,
    progress:cls?getClassMeetProgress(cls).pct:0,
    graduatedAt:cls&&cls.completedMeet>=getClassTotalMeet(cls)?new Date().toISOString():null,
    createdAt:new Date().toISOString()
  };
  DB.students.push(s);
  if(classId){
    if(cls){
      cls.students=(cls.students||0)+1;
      if(!cls.relatedStudents)cls.relatedStudents=[];
      if(!cls.relatedStudents.includes(s.id))cls.relatedStudents.push(s.id);
      syncClassMeetProgress(cls.id);
    }
  }
  ['st-name','st-phone','st-email','st-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const sel=document.getElementById('st-class');if(sel)sel.value='';
  closeModal('modal-student');
  triggerSaveWithFeedback('Student enrolled');
  renderAcademy();
}

function openEditStudent(id){
  const s=(DB.students||[]).find(x=>x.id===id);if(!s)return;
  document.getElementById('st-name').value=s.name;
  document.getElementById('st-phone').value=s.phone||'';
  document.getElementById('st-email').value=s.email||'';
  document.getElementById('st-status').value=s.status;
  document.getElementById('st-date').value=s.enrollDate||'';
  document.getElementById('st-notes').value=s.notes||'';
  const sel=document.getElementById('st-class');
  if(sel){
    sel.innerHTML='<option value="">— Select class —</option>'+DB.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    sel.value=s.classId||'';
  }
  const saveBtn=document.querySelector('#modal-student .ma .btn');
  if(saveBtn){saveBtn.textContent='Save Changes';saveBtn.onclick=()=>updateStudent(id);}
  const m=document.getElementById('modal-student');if(m)m.classList.add('open');
  const ma=document.getElementById('main-area');if(ma)ma.style.position='relative';
}

function updateStudent(id){
  const s=(DB.students||[]).find(x=>x.id===id);if(!s)return;
  const oldClassId=s.classId;
  const newClassIdVal=document.getElementById('st-class').value;
  const newClassId=newClassIdVal?parseInt(newClassIdVal):null;
  if(oldClassId!==newClassId){
    if(oldClassId){
      const oldCls=DB.classes.find(c=>c.id===oldClassId);
      if(oldCls){
        oldCls.students=Math.max(0,(oldCls.students||1)-1);
        if(oldCls.relatedStudents)oldCls.relatedStudents=oldCls.relatedStudents.filter(x=>x!==id);
      }
    }
    if(newClassId){
      const newCls=DB.classes.find(c=>c.id===newClassId);
      if(newCls){
        newCls.students=(newCls.students||0)+1;
        if(!newCls.relatedStudents)newCls.relatedStudents=[];
        if(!newCls.relatedStudents.includes(id))newCls.relatedStudents.push(id);
      }
    }
  }
  const cls=newClassId?DB.classes.find(c=>c.id===newClassId):null;
  s.name=document.getElementById('st-name').value.trim()||s.name;
  s.phone=document.getElementById('st-phone').value;
  s.email=document.getElementById('st-email').value;
  s.classId=newClassId;
  s.status=document.getElementById('st-status').value;
  s.enrollDate=document.getElementById('st-date').value;
  s.notes=document.getElementById('st-notes').value;
  s.totalMeetEnrolled=cls?getClassTotalMeet(cls):0;
  s.completedMeet=cls?Math.min(getClassMeetProgress(cls).completed,s.totalMeetEnrolled):0;
  s.progress=cls?getClassMeetProgress(cls).pct:0;
  s.graduatedAt=cls&&getClassMeetProgress(cls).completed>=getClassMeetProgress(cls).total?new Date().toISOString():null;
  if(cls)syncClassMeetProgress(cls.id);
  const saveBtn=document.querySelector('#modal-student .ma .btn');
  if(saveBtn){saveBtn.textContent='Add Student';saveBtn.onclick=saveStudent;}
  closeModal('modal-student');
  triggerSaveWithFeedback('Student updated');
  renderAcademy();
}

function deleteStudent(id){
  if(!confirm('Delete this student?'))return;
  const s=(DB.students||[]).find(x=>x.id===id);
  if(s&&s.classId){
    const cls=DB.classes.find(c=>c.id===s.classId);
    if(cls){
      cls.students=Math.max(0,(cls.students||1)-1);
      if(cls.relatedStudents)cls.relatedStudents=cls.relatedStudents.filter(x=>x!==id);
      syncClassMeetProgress(cls.id);
    }
  }
  DB.students=(DB.students||[]).filter(x=>x.id!==id);
  saveDBFn();
  renderAcademy();
}

// ════════════════════════════════════════
// BUG 3: Student progress notes
// ════════════════════════════════════════
function openStudentNotes(studentId){
  const s=(DB.students||[]).find(x=>x.id===studentId);if(!s)return;
  if(!DB.classNotes)DB.classNotes=[];
  const existing=document.getElementById('modal-student-notes');
  if(existing)existing.remove();
  const modal=document.createElement('div');
  modal.id='modal-student-notes';
  modal.className='modal-bg';
  modal.style.cssText='display:flex;z-index:9999';
  modal.innerHTML=`
    <div class="modal" style="max-width:400px">
      <div class="mh"><span class="mt">📝 Class Note — ${s.name}</span></div>
      <div style="padding:16px">
        <div style="margin-bottom:12px">
          <div style="font-size:11px;font-weight:600;margin-bottom:6px">Date</div>
          <input type="date" id="note-date" value="${new Date().toISOString().split('T')[0]}" class="fi" style="width:100%">
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;margin-bottom:6px">Note</div>
          <textarea id="note-text" class="fi" placeholder="Progress, behavior, achievements, areas to improve…" style="width:100%;min-height:100px;resize:vertical"></textarea>
        </div>
      </div>
      <div class="ma">
        <button class="btn-o" onclick="document.getElementById('modal-student-notes').remove()">Cancel</button>
        <button class="btn" onclick="saveClassNote(${studentId})">Save Note</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
}

function saveClassNote(studentId){
  const date=document.getElementById('note-date').value;
  const note=document.getElementById('note-text').value.trim();
  if(!note){alert('Please write a note first');return}
  if(!DB.classNotes)DB.classNotes=[];
  if(!DB.nextId.note)DB.nextId.note=1;
  DB.classNotes.push({id:DB.nextId.note++,studentId,date,note,createdAt:new Date().toISOString()});
  document.getElementById('modal-student-notes')?.remove();
  triggerSaveWithFeedback('Note saved');
  renderAcademy();
}

// ════════ INVOICE LABEL FILTER ════════
let invLabelFilter='';
function setInvFilter(label){
  invLabelFilter=label;
  ['invf-all','invf-studio','invf-rental','invf-academy'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.borderColor='';el.style.color='';el.classList.remove('on');}});
  const activeId={'':'invf-all','Studio':'invf-studio','Rental':'invf-rental','Academy':'invf-academy'}[label]||'invf-all';
  const el=document.getElementById(activeId);if(el){el.style.borderColor='var(--accent)';el.style.color='var(--accent)';el.classList.add('on');}
  renderInvoices();
}
