// ════════ DETAIL VIEWS ════════
function viewClient(id){
  const c=DB.clients.find(cl=>cl.id===id);if(!c)return;
  const projs=DB.projects.filter(p=>p.clientId===id);const rents=DB.rentals.filter(r=>r.clientId===id);const invs=DB.invoices.filter(i=>i.clientId===id);
  document.getElementById('detail-title').textContent=c.name;
  document.getElementById('detail-body').innerHTML=`<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px"><div class="av" style="background:${avColor(c.name)}22;color:${avColor(c.name)};width:42px;height:42px;font-size:14px">${initials(c.name)}</div><div><div style="font-size:13px;font-weight:500">${c.name}</div><div style="font-size:11px;color:var(--text3)">${c.type} · ${c.email||'—'} · ${c.phone||'—'}</div></div></div><div class="three" style="margin-bottom:14px"><div class="kc"><div class="kl">Projects</div><div class="kv" style="font-size:18px;color:var(--blue)">${projs.length}</div></div><div class="kc"><div class="kl">Rentals</div><div class="kv" style="font-size:18px;color:var(--amber)">${rents.length}</div></div><div class="kc"><div class="kl">Invoices</div><div class="kv" style="font-size:18px;color:var(--green)">${invs.filter(i=>i.type==='invoice').length}</div></div></div>${projs.length?'<div style="font-size:10px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">Projects</div>'+projs.map(p=>`<div class="lr"><div><div style="font-size:11px">${p.name}</div><div class="td-s">${p.type} · ${p.progress}%</div></div><span class="pill pg_">${p.status}</span></div>`).join(''):''}`;
  document.getElementById('detail-actions').innerHTML=`<button class="btn-o" onclick="closeModal('modal-detail')">Close</button><button class="btn-o" style="border-color:var(--amber);color:var(--amber)" onclick="openEditClient(${id})">✎ Edit</button><button class="btn" onclick="closeModal('modal-detail');quickProject(${id})">+ Project</button><button class="btn" onclick="closeModal('modal-detail');quickQuote(${id},null)">+ Quote</button>`;
  openModal('modal-detail');
}

function viewProject(id){
  const p=DB.projects.find(pr=>pr.id===id);if(!p)return;
  const c=DB.clients.find(cl=>cl.id===p.clientId);
  const invs=DB.invoices.filter(i=>i.projectId===id);
  const tasks=DB.tasks.filter(t=>t.projectId===id);
  const feedbacks=(DB.feedbacks||[]).filter(f=>f.projectId===id);
  const totalItems=tasks.length+feedbacks.length;
  const doneItems=tasks.filter(t=>t.status==='Done').length+feedbacks.filter(f=>f.status==='Done').length;
  const itemProg=totalItems?Math.round(doneItems/totalItems*100):0;
  const jns=DB.journals.filter(j=>j.linkedType==='project'&&j.linkedId===id);
  document.getElementById('detail-title').textContent=p.name;
  document.getElementById('detail-body').innerHTML=`
    <div class="two" style="margin-bottom:12px">
      <div><div class="fl">Client</div><div style="font-size:12px">${c?c.name:'\u2014'}</div></div>
      <div><div class="fl">Type</div><div style="font-size:12px"><span class="chip">${p.type}</span></div></div>
    </div>
    <div class="two" style="margin-bottom:12px">
      <div><div class="fl">Value</div><div style="font-size:12px;color:var(--green)">${rp(p.value)}</div></div>
      <div><div class="fl">Deadline</div><div style="font-size:12px">${fmtDate(p.deadline)}</div></div>
    </div>
    <div class="two" style="margin-bottom:12px">
      <div><div class="fl">Progress</div><div style="display:flex;align-items:center;gap:8px;margin-top:4px"><div style="flex:1;height:4px;background:var(--bg4);border-radius:2px"><div style="width:${p.progress}%;height:100%;background:var(--accent);border-radius:2px"></div></div><span style="font-size:11px">${p.progress}%</span></div></div>
      <div><div class="fl">Status</div><div style="margin-top:4px"><span class="pill ${{Active:'pg_',Pending:'pa_','Awaiting Approval':'pa_','Awaiting Feedback':'pb_',Done:'pp_','On Hold':'pr_',Cancelled:'pr_'}[p.status]||'pa_'}">${p.status}</span></div></div>
    </div>
    ${p.desc?`<div style="margin-bottom:14px"><div class="fl">Description</div><div style="font-size:11px;color:var(--text2);margin-top:4px">${p.desc}</div></div>`:''}
    <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="fl" style="margin:0">Tasks & Feedback (${totalItems})${totalItems?' \u00b7 '+doneItems+'/'+totalItems+' done \u00b7 '+itemProg+'%':''}</div>
        <button class="btn-o btn-xs" onclick="closeModal('modal-detail');openTaskForProject(${p.id})">+ Add Task</button>
      </div>
      ${totalItems?'<div class="prog-bar" style="margin-bottom:8px"><div class="prog-fill" style="width:'+itemProg+'%;background:var(--green)"></div></div>':''}
      ${tasks.length?'<div style="font-size:9px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Tasks</div>'+tasks.map(t=>`
        <div class="lr" style="padding:6px 0">
          <div style="display:flex;align-items:center;gap:8px;flex:1">
            <div class="task-prio" style="background:${prioColor[t.priority]||'var(--blue)'}"></div>
            <div style="flex:1">
              <div style="font-size:11px;${t.status==='Done'?'text-decoration:line-through;color:var(--text3)':''}">${t.title}</div>
              <div style="font-size:9px;color:var(--text3)">${getUserName(t.assignee)}${t.dueDate?' \u00b7 Due '+fmtDate(t.dueDate):''}</div>
            </div>
          </div>
          <span class="pill ${'To Do'===t.status?'pa_':'In Progress'===t.status?'pb_':'pg_'}" style="cursor:pointer;font-size:8px" onclick="cycleTaskStatus(${t.id});viewProject(${p.id})">${t.status}</span>
          <button onclick="openEditTask(${t.id})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;padding:0 4px;margin-left:2px">\u270e</button>
        </div>
      `).join(''):'<div style="font-size:10px;color:var(--text3);padding:4px 0">No tasks yet.</div>'}
      ${feedbacks.length?'<div style="font-size:9px;color:var(--text3);margin-top:8px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Feedback</div>'+feedbacks.map(f=>`
        <div class="lr" style="padding:6px 0;cursor:pointer" onclick="closeModal(\'modal-detail\');viewFeedback(${f.id})">
          <div style="flex:1">
            <div style="font-size:11px;${f.status==='Done'?'text-decoration:line-through;color:var(--text3)':''}">${f.title||'(Untitled)'}</div>
            <div style="font-size:9px;color:var(--text3)">${f.revisionPhase||''}${f.dueDate?' \u00b7 Due '+fmtDate(f.dueDate):''}</div>
          </div>
          <span class="pill ${'To Do'===f.status?'pa_':'Ongoing'===f.status?'pb_':'pg_'}" style="cursor:pointer;font-size:8px" onclick="event.stopPropagation();moveFeedback(${f.id},'forward');viewProject(${p.id})">${f.status}</span>
          <button onclick="event.stopPropagation();openFeedbackModal(${f.id})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;padding:0 4px;margin-left:2px">\u270e</button>
        </div>
      `).join(''):''}
    </div>
    ${invs.length?`<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px"><div class="fl" style="margin-bottom:6px">Quotes & Invoices (${invs.length})</div>${invs.map(i=>`<div class="lr"><span style="font-size:11px;color:var(--accent)">${i.type==='quote'?'QT':'INV'}-${String(i.id).padStart(4,'0')}</span><span style="font-size:11px">${rp(i.total)}</span><span class="pill pa_">${i.status}</span></div>`).join('')}</div>`:''}
    ${jns.length?`<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div class="fl" style="margin:0">📓 Journal (${jns.length})</div><button class="btn-o btn-xs" onclick="closeModal('modal-detail');nav('journal')">View All →</button></div>${jns.slice(0,3).map(j=>{const lc=journalLabelColors[j.label]||'var(--text3)';return`<div class="lr" style="cursor:pointer" onclick="closeModal('modal-detail');viewJournal(${j.id})"><div style="flex:1"><div style="font-size:11px;font-weight:500">${j.title}</div><div style="font-size:9px;color:var(--text3)">${fmtDate(j.createdAt)} · ${getUserName(j.createdBy)}</div></div><span style="background:${lc}22;color:${lc};border-radius:3px;padding:1px 6px;font-size:8px">${j.label}</span></div>`;}).join('')}</div>`:''}`;
  document.getElementById('detail-actions').innerHTML=`
    <button class="btn-o" onclick="closeModal('modal-detail')">Close</button>
    <button class="btn-o" onclick="editProject(${p.id})" style="border-color:var(--amber);color:var(--amber)">✎ Edit Project</button>
    <button class="btn" onclick="closeModal('modal-detail');quickQuote(${p.clientId},${p.id})">+ Quote</button>`;
  openModal('modal-detail');
}

function openTaskForProject(projId){
  openModal('modal-task');
  setTimeout(()=>{
    const sel=document.getElementById('tk-project');
    if(sel)sel.value=projId;
  },80);
}

function viewDebt(id){
  const d=DB.debts.find(x=>x.id===id);if(!d)return;
  const remaining=d.remainingAmount!==undefined?d.remainingAmount:d.amount;
  const sc={Settled:'pg_','Partially Settled':'pb_',Outstanding:'pa_'}[d.status]||'pa_';
  const typeCol=d.type==='payable'?'var(--red)':'var(--green)';
  document.getElementById('detail-title').textContent=d.description;
  document.getElementById('detail-body').innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:14px">
      <div>
        <div style="font-size:12px;font-weight:600">${d.party||'—'}</div>
        <div class="td-s">${d.type==='payable'?'We owe (Payable)':'Owed to us (Receivable)'}</div>
        <div class="td-s">Label: ${d.label||'—'}</div>
        <div style="margin-top:6px"><span class="pill ${sc}">${d.status}</span></div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:var(--text3)">Original</div>
        <div style="font-family:var(--ui);font-size:18px;font-weight:700;color:var(--text3);text-decoration:line-through">${rp(d.amount)}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:4px">Remaining</div>
        <div style="font-family:var(--ui);font-size:22px;font-weight:700;color:${typeCol}">${rp(remaining)}</div>
        ${d.due?`<div style="font-size:10px;color:var(--text3);margin-top:4px">Due: ${fmtDate(d.due)}</div>`:''}
      </div>
    </div>
    ${d.notes?`<div style="font-size:11px;color:var(--text2);background:var(--bg3);border-radius:6px;padding:8px 10px;margin-bottom:12px">${d.notes}</div>`:''}
    ${d.settlements&&d.settlements.length?`
    <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Settlements</div>
    <div class="tw"><table class="tbl"><thead><tr><th>Date</th><th>Amount</th><th>Account</th><th>By</th></tr></thead><tbody>
      ${d.settlements.map(s=>`<tr><td style="color:var(--text3)">${fmtDate(s.date)}</td><td style="color:var(--green);font-weight:600">${rp(s.amount)}</td><td>${s.bank?s.bank.toUpperCase():'—'}</td><td>${getUserName(s.by)}</td></tr>`).join('')}
    </tbody></table></div>`:'<div class="empty" style="padding:10px 0">No settlements yet.</div>'}`;
  document.getElementById('detail-actions').innerHTML=`
    <button class="btn-o" onclick="closeModal('modal-detail')">Close</button>
    ${d.status!=='Settled'?`<button class="btn" onclick="closeModal('modal-detail');markDebtPaid(${d.id})">Settle</button>`:''}
    <button class="btn-o" style="border-color:var(--blue);color:var(--blue)" onclick="downloadDebtPDF(${d.id})">📄 PDF</button>
    <button class="btn-danger" onclick="closeModal('modal-detail');deleteDebt(${d.id})">✕ Delete</button>`;
  openModal('modal-detail');
}

function viewInvoice(id){
  const inv=DB.invoices.find(i=>i.id===id);if(!inv)return;
  const c=DB.clients.find(cl=>cl.id===inv.clientId);const p=inv.projectId?DB.projects.find(pr=>pr.id===inv.projectId):null;
  const num=getInvNum(inv);
  document.getElementById('detail-title').textContent=num;
  document.getElementById('detail-body').innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:14px"><div><div style="font-size:12px;font-weight:600">${c?c.name:'—'}</div><div class="td-s">${p?'Project: '+p.name:'No project linked'}</div>${inv.category?`<div class="td-s">Label: ${inv.category}</div>`:''}<div style="margin-top:6px"><span class="pill pa_">${inv.status}</span></div></div><div style="text-align:right"><div style="font-size:10px;color:var(--text3)">${num}</div><div style="font-family:var(--ui);font-size:22px;font-weight:700;color:var(--accent)">${rp(inv.total)}</div>${inv.due?`<div style="font-size:10px;color:var(--text3);margin-top:4px">Due: ${fmtDate(inv.due)}</div>`:''}</div></div><div class="inv-preview">${inv.items.map(it=>`<div class="inv-line"><span>${it.desc}</span><span style="color:var(--text3)">${it.qty}x ${rp(it.price)}</span><span>${rp(it.qty*it.price)}</span></div>`).join('')}<div class="inv-line"><span style="color:var(--text3)">Subtotal</span><span>${rp(inv.subtotal)}</span></div>${inv.taxPct?`<div class="inv-line"><span style="color:var(--green)">Discount (${inv.taxPct}%)</span><span style="color:var(--green)">−${rp(inv.tax)}</span></div>`:''}<div class="inv-line"><span>Total</span><span style="color:var(--accent)">${rp(inv.total)}</span></div></div>${inv.notes?`<div style="font-size:11px;color:var(--text3)">Notes: ${inv.notes}</div>`:''}`;
  document.getElementById('detail-actions').innerHTML=`<button class="btn-o" onclick="closeModal('modal-detail')">Close</button>
    <button class="btn-o" style="border-color:var(--blue);color:var(--blue)" onclick="downloadInvoicePDF(${inv.id})">📄 Download PDF</button>
    ${inv.type==='quote'&&inv.status==='Awaiting Approval'&&inv.createdBy!==currentUser?`<button class="btn" style="background:var(--red)" onclick="rejectQuote(${inv.id})">✕ Reject</button><button class="btn" style="background:var(--green)" onclick="approveQuote(${inv.id})">✓ Approve</button>`:''}
    ${inv.type==='quote'&&(inv.status==='Approved')?`<button class="btn" onclick="closeModal('modal-detail');convertToInvoice(${inv.id})">→ Convert to Invoice</button>`:''}
    ${inv.type==='quote'&&inv.status==='Awaiting Approval'?`<span style="font-size:10px;color:var(--amber);padding:4px 8px">⏳ Awaiting approval</span>`:''}
    ${inv.type==='invoice'&&inv.status!=='Paid'?`<button class="btn" style="background:var(--green)" onclick="closeModal('modal-detail');markPaid(${inv.id})">Mark as Paid</button>`:''}
    <button class="btn-o" style="border-color:var(--amber);color:var(--amber)" onclick="openEditInvoice(${inv.id})">✎ Edit</button>
    <button class="btn-danger" onclick="deleteInvoiceConfirm(${inv.id})">✕ Delete</button>`;
  openModal('modal-detail');
}

// ════════ ACADEMY INVOICE WORKFLOW ════════
// Student action now opens the invoice builder as an Academy quote with prefilled class fees.
function _ensureAcademyClient(student){
  if(student.clientId)return student.clientId;
  const existingClient=(DB.clients||[]).find(c=>(c.name||'').toLowerCase()===(student.name||'').toLowerCase());
  if(existingClient){
    student.clientId=existingClient.id;
    saveDBFn();
    return existingClient.id;
  }
  const clientId=DB.nextId.c++;
  DB.clients.push({
    id:clientId,
    name:student.name,
    type:'Education',
    label:'Academy',
    email:student.email||'',
    phone:student.phone||'',
    address:'',
    notes:'Auto-created from student enrollment',
    status:'Active',
    createdAt:new Date().toISOString()
  });
  student.clientId=clientId;
  saveDBFn();
  return clientId;
}
function createStudentQuote(studentId){
  const s=(DB.students||[]).find(x=>x.id===studentId);if(!s)return;
  const cls=s.classId?DB.classes.find(c=>c.id===s.classId):null;
  const clientId=_ensureAcademyClient(s);
  if(!clientId){alert('No client linked to this student.');return;}
  const totalMeet=(s.totalMeetEnrolled|| (cls?cls.totalMeet:0) || 1);
  const feePerMeet=(cls&&cls.fee?cls.fee:125000);
  const items=[{
    desc:`${cls?cls.name:'Academy class'} tuition for ${s.name}`,
    qty:totalMeet,
    price:feePerMeet
  }];
  const noteParts=[`Student: ${s.name}`];
  if(cls)noteParts.push(`Class: ${cls.name}`);
  noteParts.push(`Total meet: ${totalMeet}`);
  quickQuote(clientId,cls?cls.id:null,{
    category:'Academy',
    studentId:s.id,
    items,
    discountPct:0,
    notes:noteParts.join(' | ')
  });
}
function createStudentInvoice(studentId){return createStudentQuote(studentId);}
function createClassBatchInvoices(classId){
  const cls=DB.classes.find(c=>c.id===classId);if(!cls)return;
  const enrolled=(DB.students||[]).filter(s=>s.classId===classId&&s.status==='Active');
  if(!enrolled.length){alert('No active students in this class.');return;}
  const totalMeet=cls.totalMeet||1;
  const feePerMeet=cls.fee||125000;
  let created=0;
  enrolled.forEach(s=>{
    const clientId=_ensureAcademyClient(s);
    const inv={
      id:DB.nextId.i++,
      clientId,
      projectId:null,
      category:'Academy',
      type:'invoice',
      status:'Awaiting Approval',
      items:[{desc:`${cls.name} — ${totalMeet} meet(s) (${s.name})`,qty:totalMeet,price:feePerMeet}],
      subtotal:totalMeet*feePerMeet,
      taxPct:0,
      tax:0,
      total:totalMeet*feePerMeet,
      due:'',
      notes:`Class: ${cls.name} | Student: ${s.name} | Batch: ${cls.batchNo||1} | Code: ${cls.code||'—'}`,
      createdBy:currentUser,
      createdAt:new Date().toISOString()
    };
    DB.invoices.push(inv);
    created++;
  });
  USERS.forEach(u=>{if(u.id!==currentUser)addNotification(u.id,`${created} Academy invoices created for class "${cls.name}"`,'info',null);});
  saveDBFn();
  alert(`Created ${created} invoice(s) for class "${cls.name}".\nGo to Invoice Builder (Academy tab) to view them.`);
  renderAcademy();
}
function getInvNum(inv){
  if(inv.type==='quote'){
    // #QEXP-00 format (sequential among all quotes)
    const quotes=DB.invoices.filter(i=>i.type==='quote').sort((a,b)=>a.id-b.id);
    const idx=quotes.findIndex(q=>q.id===inv.id);
    return `#QEXP-${String(idx+1).padStart(2,'0')}`;
  } else {
    // #EXP-000 format (sequential among all invoices)
    const invs=DB.invoices.filter(i=>i.type==='invoice').sort((a,b)=>a.id-b.id);
    const idx=invs.findIndex(i=>i.id===inv.id);
    return `#EXP-${String(idx+1).padStart(3,'0')}`;
  }
}
