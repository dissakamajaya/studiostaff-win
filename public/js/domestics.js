// ════════ RENDER: DOMESTICS (tabbed) ════════
let domTab=0;
function navToLeaveNotice(){nav('domestic');setTimeout(()=>{switchDomTab(null,1);},0);}
function switchDomTab(el,idx){
  domTab=idx;
  document.querySelectorAll('#domestic-tabs .tab').forEach((t,i)=>t.classList.toggle('on',i===idx));
  renderDomestics();
}
function renderDomestics(){
  document.getElementById('domestic-sub').textContent='Internal operations';
  const phBtns=document.getElementById('domestic-ph-btns');
  const wrap=document.getElementById('domestic-tab-content');

  if(domTab===5){
    // ── Water Management ──
    renderWaterManagement();
    return;
  } else if(domTab===0){
    // ── Tasks ──
    phBtns.innerHTML=`<button class="btn btn-sm" onclick="openModal('modal-domestic')">+ Add Task</button>`;
    if(!DB.domestics.length){wrap.innerHTML='<div class="empty">No domestic tasks yet.</div>';return}
    const today=new Date().toISOString().slice(0,10);
    const tblRows=DB.domestics.map(t=>{
      const statusClass={'To Do':'pa_','In Progress':'pb_','Done':'pg_'}[t.status]||'pa_';
      const pColor=t.priority==='high'?'var(--red)':'var(--blue)';
      const overdue=t.dueDate&&t.dueDate<today&&t.status!=='Done';
      return `<tr><td><div style="font-size:11px;font-weight:500">${t.name}</div></td><td><div style="display:flex;align-items:center;gap:6px"><div class="av" style="background:${getUserColor(t.assignee)}22;color:${getUserColor(t.assignee)};width:20px;height:20px;font-size:8px">${getUserName(t.assignee)[0]}</div>${getUserName(t.assignee)}</div></td><td class="tc" style="color:${overdue?'var(--red)':''}">${fmtDate(t.dueDate)}${overdue?' ⚠':''}</td><td><span style="color:${pColor}">${t.priority}</span></td><td><span class="pill ${statusClass}" style="cursor:pointer" onclick="cycleDomesticStatus(${t.id})">${t.status}</span></td><td><div style="display:flex;gap:4px"><button class="btn-o btn-xs" onclick="openEditDomestic(${t.id})">✎</button><button class="btn-danger btn-xs" onclick="deleteDomestic(${t.id})">✕</button></div></td></tr>`;
    }).join('');
    const cardRows=DB.domestics.map(t=>{
      const statusClass={'To Do':'pa_','In Progress':'pb_','Done':'pg_'}[t.status]||'pa_';
      const overdue=t.dueDate&&t.dueDate<today&&t.status!=='Done';
      return `<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${t.name}</div><div class="card-item-sub" style="display:flex;align-items:center;gap:6px;margin-top:4px"><div class="av" style="background:${getUserColor(t.assignee)}22;color:${getUserColor(t.assignee)};width:18px;height:18px;font-size:7px">${getUserName(t.assignee)[0]}</div>${getUserName(t.assignee)}</div></div><span class="pill ${statusClass}" style="cursor:pointer" onclick="cycleDomesticStatus(${t.id})">${t.status}</span></div><div class="card-item-row"><span class="card-item-label">Due</span><span class="card-item-val" style="color:${overdue?'var(--red)':''}">${fmtDate(t.dueDate)}${overdue?' ⚠':''}</span></div><div class="card-item-row"><span class="card-item-label">Priority</span><span class="card-item-val" style="color:${t.priority==='high'?'var(--red)':'var(--blue)'}">${t.priority}</span></div><div class="card-item-actions"><button class="btn-o btn-xs" onclick="openEditDomestic(${t.id})">✎ Edit</button><button class="btn-danger btn-xs" onclick="deleteDomestic(${t.id})">✕</button></div></div>`;
    }).join('');
    wrap.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>Task</th><th>Assigned</th><th>Due</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead><tbody>${tblRows}</tbody></table></div><div class="card-list">${cardRows}</div>`;

  } else if(domTab===1){
    // ── Leave Notice ──
    phBtns.innerHTML=`<button class="btn btn-sm" onclick="openModal('modal-leave')">+ New Leave</button>`;
    const notices=DB.leaveNotices||[];
    if(!notices.length){wrap.innerHTML='<div class="empty">No leave notices yet.</div>';return}
    wrap.innerHTML=notices.slice().reverse().map(lv=>{
      const statusClass={'Awaiting Approval':'pa_',Pending:'pa_',Approved:'pg_',Rejected:'pr_'}[lv.status]||'pa_';
      const allApproved=lv.approvals&&USERS.filter(u=>u.id!==lv.userId).every(u=>lv.approvals.includes(u.id));
      return `<div class="panel" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;justify-content:space-between"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div class="av" style="background:${getUserColor(lv.userId)}22;color:${getUserColor(lv.userId)};width:24px;height:24px;font-size:9px">${getUserName(lv.userId)[0]}</div><span style="font-size:12px;font-weight:500">${getUserName(lv.userId)}</span><span class="pill ${statusClass}">${lv.status}</span></div><div style="font-size:11px;color:var(--text2)">${lv.type}</div><div style="font-size:10px;color:var(--text3);margin-top:4px">${fmtDate(lv.start)} → ${fmtDate(lv.end)}</div>${lv.reason?`<div style="font-size:10px;color:var(--text3);margin-top:4px;font-style:italic">"${lv.reason}"</div>`:''}</div><div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">${lv.status==='Awaiting Approval'&&lv.userId!==currentUser&&!lv.approvals?.includes(currentUser)?`<button class="btn btn-xs" style="background:var(--green)" onclick="approveLeave(${lv.id})">✓ Approve</button>`:''}${lv.status==='Awaiting Approval'?`<button class="btn-danger btn-xs" onclick="rejectLeave(${lv.id})">✕ Reject</button>`:''}<button class="btn-danger btn-xs" onclick="deleteLeave(${lv.id})">Delete</button></div></div>${lv.approvals?.length?`<div style="font-size:9px;color:var(--text3);margin-top:8px;border-top:1px solid var(--border);padding-top:6px">Approved by: ${lv.approvals.map(uid=>getUserName(uid)).join(', ')}</div>`:''}</div>`;
    }).join('');

  } else if(domTab===2){
    // ── Food Credits ──
    phBtns.innerHTML='';
    const today=new Date().toISOString().slice(0,10);
    const myTodayCredit=DB.foodCredits.find(f=>f.userId===currentUser&&f.date===today);
    const credits=DB.foodCredits||[];
    wrap.innerHTML=`
      <div class="panel" style="margin-bottom:14px;border-color:var(--green)">
        <div class="pnh"><span class="pnt" style="color:var(--green)">🍱 Daily Food Credit — Rp 25.000/user</span></div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Tap button to claim your daily food credit. One per user per day. You can also claim for a custom date.</div>
        <div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 12px">
          <span style="font-size:10px;color:var(--text3)">💳 Paid by:</span>
          <select id="food-paid-by" class="fi" style="width:auto;font-size:11px">
            <option value="">Each person (self)</option>
            ${USERS.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
          </select>
          <span style="font-size:9px;color:var(--text3)">— select if one person paid for everyone today</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          ${USERS.map(u=>{
            const claimed=DB.foodCredits.find(f=>f.userId===u.id&&f.date===today);
            return `<div style="background:var(--bg3);border:1px solid ${claimed?'var(--green)':'var(--border)'};border-radius:8px;padding:12px 16px;text-align:center;flex:1;min-width:100px">
              <div class="av" style="background:${u.color}22;color:${u.color};margin:0 auto 6px;width:28px;height:28px;font-size:11px">${u.name[0]}</div>
              <div style="font-size:11px;font-weight:500">${u.name}</div>
              ${claimed?`<div style="font-size:9px;color:var(--green);margin-top:4px">✓ Claimed${claimed.paidBy&&claimed.paidBy!==claimed.userId?' via '+getUserName(claimed.paidBy):''} (${claimed.status})</div>`:`<button class="btn btn-xs" style="margin-top:6px;background:var(--green);width:100%" onclick="claimFoodCredit('${u.id}')">${u.id===currentUser?'Claim Mine':'Claim for '+u.name}</button>`}
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <div style="font-size:10px;color:var(--text3)">Custom date:</div>
          <input type="date" id="food-custom-date" class="fi" style="width:auto;max-width:160px" value="${today}"/>
          <select id="food-custom-user" class="fi" style="width:auto">${USERS.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}</select>
          <select id="food-custom-paid-by" class="fi" style="width:auto">
            <option value="">Paid by self</option>
            ${USERS.map(u=>`<option value="${u.id}">${u.name} (payer)</option>`).join('')}
          </select>
          <button class="btn btn-xs" onclick="claimFoodCreditCustom()">+ Claim Custom Date</button>
        </div>
      </div>
      <div class="panel">
        <div class="pnh"><span class="pnt">Food Credit Log</span></div>
        ${credits.length?credits.slice().reverse().map(f=>{
          const statusClass={'Awaiting Approval':'pa_',Pending:'pa_',Approved:'pg_',Rejected:'pr_'}[f.status]||'pa_';
          return `<div class="lr"><div><div style="font-size:11px;font-weight:500">${getUserName(f.userId)}${f.paidBy&&f.paidBy!==f.userId?` <span style="font-size:9px;color:var(--amber);background:var(--amber)18;border-radius:4px;padding:1px 5px">via ${getUserName(f.paidBy)}</span>`:''}</div><div style="font-size:9px;color:var(--text3)">${fmtDate(f.date)}${f.notes?' · '+f.notes:''}</div></div><div style="display:flex;align-items:center;gap:8px"><span style="color:var(--green);font-size:11px">${rp(f.amount||25000)}</span><span class="pill ${statusClass}">${f.status}</span>${f.status==='Awaiting Approval'&&currentUser==='bil'?`<button class="btn btn-xs" style="background:var(--green)" onclick="approveFoodCredit(${f.id})">✓</button>`:''}${f.userId===currentUser||currentUser==='bil'?`<button class="btn-o btn-xs" onclick="openEditFood(${f.id})">✎</button>`:''}
          </div></div>`;
        }).join(''):'<div class="empty" style="padding:12px">No food credits yet.</div>'}
      </div>`;

  } else if(domTab===3){
    // ── Reimbursements ──
    phBtns.innerHTML=`<button class="btn btn-sm" onclick="openModal('modal-reimburse')">+ Request</button>`;
    const reimbs=DB.reimbursements||[];
    if(!reimbs.length){wrap.innerHTML='<div class="empty">No reimbursement requests yet.</div>';return}
    wrap.innerHTML=reimbs.slice().reverse().map(rb=>{
      const statusClass={'Awaiting Approval':'pa_',Pending:'pa_',Approved:'pg_',Rejected:'pr_'}[rb.status]||'pa_';
      return `<div class="panel" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;justify-content:space-between"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div class="av" style="background:${getUserColor(rb.userId)}22;color:${getUserColor(rb.userId)};width:24px;height:24px;font-size:9px">${getUserName(rb.userId)[0]}</div><span style="font-size:12px;font-weight:500">${getUserName(rb.userId)}</span><span class="pill ${statusClass}">${rb.status}</span></div><div style="font-size:11px;color:var(--text2)">${rb.description}</div><div style="font-size:10px;color:var(--text3);margin-top:4px">${rb.category} · ${fmtDate(rb.date)}</div>${rb.notes?`<div style="font-size:10px;color:var(--text3);font-style:italic;margin-top:4px">"${rb.notes}"</div>`:''}</div><div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><div style="font-size:16px;font-weight:700;color:var(--green)">${rp(rb.amount)}</div>${rb.status==='Awaiting Approval'&&currentUser==='bil'?`<button class="btn btn-xs" style="background:var(--green)" onclick="approveReimbursement(${rb.id})">✓ Approve</button><button class="btn-danger btn-xs" onclick="rejectReimbursement(${rb.id})">✕ Reject</button>`:rb.status==='Awaiting Approval'?'<span style="font-size:9px;color:var(--amber)">Awaiting Bil</span>':''}</div></div></div>`;
    }).join('');

  } else if(domTab===4){
    // ── General Cleaning ──
    phBtns.innerHTML=``;
    const cleanings=(DB.cleanings||[]).slice().reverse();
    const totalPending=cleanings.filter(c=>c.status==='Pending').reduce((s,c)=>s+c.amount,0);
    const totalPaid=cleanings.filter(c=>c.status==='Paid').reduce((s,c)=>s+c.amount,0);
    wrap.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="kc"><div class="kl">Pending Payment</div><div class="kv" style="color:var(--amber)">${rp(totalPending)}</div></div>
        <div class="kc"><div class="kl">Total Paid</div><div class="kv" style="color:var(--green)">${rp(totalPaid)}</div></div>
      </div>
      <div style="margin-bottom:12px">
        <button class="btn" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);padding:10px 16px;display:flex;align-items:center;gap:8px;font-size:12px" onclick="addPakAminCleaning()">
          🧹 <span>+ Pak Amin</span>
        </button>
      </div>
      <div class="tw"><table class="tbl"><thead><tr><th>Date</th><th>Cleaner</th><th>Amount</th><th>Notes</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${cleanings.length?cleanings.map(c=>`<tr>
          <td style="font-weight:500">${fmtDate(c.date)}</td>
          <td>${c.cleaner||'—'}</td>
          <td style="color:var(--text)">${rp(c.amount)}</td>
          <td style="font-size:10px;color:var(--text3)">${c.notes||'—'}</td>
          <td><span class="pill ${c.status==='Paid'?'pg_':'pa_'}">${c.status}</span></td>
          <td><div style="display:flex;gap:4px">
            ${c.status!=='Paid'?`<button class="btn btn-xs" style="background:var(--green)" onclick="markCleaningPaid(${c.id})">✓ Pay</button>`:''}
            ${c.status==='Paid'?`<button class="btn-o btn-xs" onclick="downloadCleaningReceiptPDF(${c.id})">📄 Receipt</button>`:''}
            <button class="btn-danger btn-xs" onclick="if(confirm('Delete?')){DB.cleanings=DB.cleanings.filter(x=>x.id!==${c.id});saveDBFn();renderDomestics()}">✕</button>
          </div></td>
        </tr>`).join(''):'<tr><td colspan="6" class="empty">No cleaning records yet.</td></tr>'}
      </tbody></table></div>
      <div class="card-list">${cleanings.length?cleanings.map(c=>`<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${fmtDate(c.date)}</div><div class="card-item-sub">${c.cleaner||'—'}</div></div><span class="pill ${c.status==='Paid'?'pg_':'pa_'}">${c.status}</span></div><div class="card-item-row"><span class="card-item-label">Amount</span><span class="card-item-val" style="font-weight:600">${rp(c.amount)}</span></div><div class="card-item-actions">${c.status!=='Paid'?`<button class="btn btn-xs" style="background:var(--green)" onclick="markCleaningPaid(${c.id})">✓ Pay</button>`:''} ${c.status==='Paid'?`<button class="btn-o btn-xs" onclick="downloadCleaningReceiptPDF(${c.id})">📄</button>`:''}<button class="btn-danger btn-xs" onclick="if(confirm('Delete?')){DB.cleanings=DB.cleanings.filter(x=>x.id!==${c.id});saveDBFn();renderDomestics()}">✕</button></div></div>`).join(''):'<div class="empty">No cleaning records yet.</div>'}</div>`;
  }
}

// ════════ LEAVE NOTICE ════════
function saveLeave(){
  const type=document.getElementById('lv-type').value;
  const start=document.getElementById('lv-start').value;
  let end=document.getElementById('lv-end').value;
  // If duration not custom, auto-compute end from start + duration
  if(typeof leaveDurVal!=='undefined'&&leaveDurVal!=='custom'&&start){
    const d=new Date(start);d.setDate(d.getDate()+parseInt(leaveDurVal)-1);
    end=d.toISOString().slice(0,10);
    document.getElementById('lv-end').value=end;
  }
  const reason=document.getElementById('lv-reason').value;
  if(!start){alert('Select a start date');return}
  if(!end){alert('Select an end date or duration');return}
  const notice={id:DB.nextId.lv++,userId:currentUser,type,start,end,reason,status:'Awaiting Approval',approvals:[],createdAt:new Date().toISOString()};
  DB.leaveNotices.push(notice);
  USERS.forEach(u=>{if(u.id!==currentUser)addNotification(u.id,`${getUserName(currentUser)} filed a ${type} notice (${fmtDate(start)} → ${fmtDate(end)})— please approve`,'leave',notice.id);});
  ['lv-start','lv-reason'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  const lve=document.getElementById('lv-end');if(lve)lve.value='';
  if(typeof leaveDurVal!=='undefined')leaveDurVal='1';
  closeModal('modal-leave');triggerSaveWithFeedback('Saving leave notice…');renderDomestics();
}
function approveLeave(id){
  const lv=DB.leaveNotices.find(x=>x.id===id);if(!lv)return;
  if(!lv.approvals)lv.approvals=[];
  if(!lv.approvals.includes(currentUser))lv.approvals.push(currentUser);
  const otherUsers=USERS.filter(u=>u.id!==lv.userId);
  if(otherUsers.every(u=>lv.approvals.includes(u.id))){
    lv.status='Approved';
    addNotification(lv.userId,`Your ${lv.type} notice has been fully approved`,'leave',lv.id);
  }
  saveDBFn();renderDomestics();
}
function rejectLeave(id){
  const lv=DB.leaveNotices.find(x=>x.id===id);if(!lv)return;
  lv.status='Rejected';
  addNotification(lv.userId,`Your ${lv.type} notice was rejected by ${getUserName(currentUser)}`,'leave',lv.id);
  saveDBFn();renderDomestics();
}
function deleteLeave(id){
  if(!confirm('Delete this leave notice?'))return;
  DB.leaveNotices=DB.leaveNotices.filter(x=>x.id!==id);
  saveDBFn();renderDomestics();
}

// ════════ FOOD CREDITS ════════
function claimFoodCredit(userId){
  const today=new Date().toISOString().slice(0,10);
  if(DB.foodCredits.find(f=>f.userId===userId&&f.date===today)){alert(`${getUserName(userId)} already claimed today's food credit.`);return}
  const paidBy=document.getElementById('food-paid-by')?.value||'';
  const effectivePayer=paidBy&&paidBy!==userId?paidBy:'';
  const fc={id:DB.nextId.fc++,userId,date:today,amount:25000,status:'Awaiting Approval',notes:'',paidBy:effectivePayer,createdAt:new Date().toISOString()};
  DB.foodCredits.push(fc);
  const payerNote=effectivePayer?` (paid by ${getUserName(effectivePayer)})`:''
  addNotification('bil',`${getUserName(userId)} claimed food credit (${rp(25000)}) for ${today}${payerNote} — please approve`,'food',fc.id);
  triggerSaveWithFeedback('Saving food credit…');renderDomestics();
}
function claimFoodCreditCustom(){
  const date=document.getElementById('food-custom-date')?.value;
  const userId=document.getElementById('food-custom-user')?.value;
  const rawPaidBy=document.getElementById('food-custom-paid-by')?.value||'';
  if(!date||!userId){alert('Select a date and user.');return;}
  if(DB.foodCredits.find(f=>f.userId===userId&&f.date===date)){alert(`${getUserName(userId)} already has a credit for ${date}.`);return;}
  const paidBy=rawPaidBy&&rawPaidBy!==userId?rawPaidBy:'';
  const fc={id:DB.nextId.fc++,userId,date,amount:25000,status:'Awaiting Approval',notes:'',paidBy,createdAt:new Date().toISOString()};
  DB.foodCredits.push(fc);
  const payerNote=paidBy?` (paid by ${getUserName(paidBy)})`:''
  addNotification('bil',`${getUserName(userId)} claimed food credit (${rp(25000)}) for ${date}${payerNote} — please approve`,'food',fc.id);
  triggerSaveWithFeedback('Saving food credit…');renderDomestics();
}
function approveFoodCredit(id){
  const fc=DB.foodCredits.find(x=>x.id===id);if(!fc)return;
  fc.status='Approved';
  // Auto-create expense transaction — if paid by someone else, credit goes to that person
  const beneficiary=fc.paidBy&&fc.paidBy!==fc.userId?fc.paidBy:fc.userId;
  const desc=fc.paidBy&&fc.paidBy!==fc.userId
    ?`Food Credit — ${getUserName(fc.userId)} (via ${getUserName(beneficiary)})`
    :`Food Credit — ${getUserName(fc.userId)}`;
  const fcAmt=fc.amount||25000;
  DB.transactions.push({id:DB.nextId.tx++,description:desc,amount:fcAmt,type:'Expense',category:'Food',bank:'bca',division:'studio',date:fc.date,createdAt:new Date().toISOString()});
  const fcAcc=DB.bankAccounts.find(a=>a.id==='bca');if(fcAcc)fcAcc.balance-=fcAmt;
  addNotification(fc.userId,`Your food credit for ${fmtDate(fc.date)} has been approved by Bil`,'food',fc.id);
  if(fc.paidBy&&fc.paidBy!==fc.userId)addNotification(beneficiary,`Food credit for ${getUserName(fc.userId)} on ${fmtDate(fc.date)} approved — ${rp(fc.amount||25000)} logged`,'food',fc.id);
  triggerSaveWithFeedback('Approving food credit…');renderDomestics();
}
function openEditFood(id){
  const fc=DB.foodCredits.find(x=>x.id===id);if(!fc)return;
  document.getElementById('efc-id').value=id;
  document.getElementById('efc-date').value=fc.date;
  document.getElementById('efc-amount').value=fc.amount||25000;
  document.getElementById('efc-notes').value=fc.notes||'';
  openModal('modal-edit-food');
}
function updateFoodCredit(){
  const id=parseInt(document.getElementById('efc-id').value);
  const fc=DB.foodCredits.find(x=>x.id===id);if(!fc)return;
  fc.date=document.getElementById('efc-date').value;
  fc.amount=parseFloat(document.getElementById('efc-amount').value)||25000;
  fc.notes=document.getElementById('efc-notes').value;
  closeModal('modal-edit-food');triggerSaveWithFeedback('Saving food credit…');renderDomestics();
}
function deleteFoodCredit(id){
  if(!confirm('Delete this food credit?'))return;
  DB.foodCredits=DB.foodCredits.filter(x=>x.id!==id);
  triggerSaveWithFeedback('Deleting food credit…');renderDomestics();
}

// ════════ GENERAL CLEANING ════════
function addPakAminCleaning(){
  const today=new Date().toISOString().slice(0,10);
  document.getElementById('cl-date').value=today;
  document.getElementById('cl-cleaner').value='Pak Amin';
  const amtEl=document.getElementById('cl-amount');
  amtEl.value='125,000.00';
  amtEl.dataset.raw='125000';
  document.getElementById('cln-notes').value='';
  openModal('modal-cleaning');
}
function saveCleaning(){
  const date=document.getElementById('cl-date').value;
  const cleaner=document.getElementById('cl-cleaner').value.trim()||'Pak Amin';
  const amount=getAmtVal('cl-amount');
  if(!date){alert('Select a date.');return;}
  if(!amount){alert('Enter an amount.');return;}
  const notes=document.getElementById('cln-notes').value.trim();
  if(!DB.cleanings)DB.cleanings=[];
  const cl={id:DB.nextId.cl||1,date,cleaner,amount,notes,status:'Pending',paidAt:null,transactionId:null,createdBy:currentUser||'',createdAt:new Date().toISOString()};
  DB.cleanings.push(cl);
  DB.nextId.cl=(DB.nextId.cl||1)+1;
  closeModal('modal-cleaning');triggerSaveWithFeedback('Saving cleaning log…');renderDomestics();
}
function markCleaningPaid(id){
  const cl=(DB.cleanings||[]).find(x=>x.id===id);
  if(!cl||cl.status==='Paid')return;
  const now=new Date().toISOString();
  cl.status='Paid';
  cl.paidAt=now;
  // Auto-log expense transaction
  if(!DB.transactions)DB.transactions=[];
  const txId=DB.nextId.tx||1;
  DB.transactions.push({
    id:txId,type:'Expense',
    description:`General Cleaning — ${cl.cleaner} (${cl.date})`,
    amount:cl.amount,category:'General Cleaning',
    bank:'bca',division:'Domestic',
    date:cl.date,
    notes:`Auto-logged from cleaning record #${cl.id}`,
    createdAt:now,
  });
  cl.transactionId=txId;
  DB.nextId.tx=(DB.nextId.tx||1)+1;
  const clAcc=DB.bankAccounts.find(a=>a.id==='bca');if(clAcc)clAcc.balance-=cl.amount;
  saveDBFn();renderDomestics();
}

// ════════ REIMBURSEMENTS ════════
function saveReimbursement(){
  const desc=document.getElementById('rb-desc').value.trim();
  const amount=getAmtVal('rb-amount');
  const date=document.getElementById('rb-date').value;
  if(!desc||!amount||!date){alert('Fill all required fields');return}
  const rb={id:DB.nextId.rb++,userId:currentUser,description:desc,amount,category:document.getElementById('rb-cat').value,date,notes:document.getElementById('rb-notes').value,status:'Awaiting Approval',createdAt:new Date().toISOString()};
  DB.reimbursements.push(rb);
  addNotification('bil',`${getUserName(currentUser)} requests reimbursement: ${desc} — ${rp(amount)}`,'reimburse',rb.id);
  ['rb-desc','rb-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  const rba=document.getElementById('rb-amount');if(rba){rba.value='';rba.dataset.raw='';}
  const rbd=document.getElementById('rb-date');if(rbd)rbd.value='';
  closeModal('modal-reimburse');triggerSaveWithFeedback('Saving reimbursement…');renderDomestics();
}
function approveReimbursement(id){
  const rb=DB.reimbursements.find(x=>x.id===id);if(!rb)return;
  rb.status='Approved';
  // Auto-create expense transaction
  DB.transactions.push({id:DB.nextId.tx++,description:`Reimbursement — ${rb.description} (${getUserName(rb.userId)})`,amount:rb.amount,type:'Expense',category:'Reimbursement',bank:'bca',division:'Domestic',date:rb.date,createdAt:new Date().toISOString()});
  const rbAcc=DB.bankAccounts.find(a=>a.id==='bca');if(rbAcc)rbAcc.balance-=rb.amount;
  addNotification(rb.userId,`Your reimbursement "${rb.description}" (${rp(rb.amount)}) was approved by Bil`,  'reimburse',rb.id);
  saveDBFn();renderDomestics();
}
function rejectReimbursement(id){
  const rb=DB.reimbursements.find(x=>x.id===id);if(!rb)return;
  rb.status='Rejected';
  addNotification(rb.userId,`Your reimbursement "${rb.description}" was rejected by Bil`,'reimburse',rb.id);
  saveDBFn();renderDomestics();
}

// ════════ WATER MANAGEMENT ════════
function renderWaterManagement(){
  const wrap=document.getElementById('domestic-tab-content');
  const phBtns=document.getElementById('domestic-ph-btns');
  phBtns.innerHTML='';

  const status=DB.galonStatus?.status||'ready';
  const isReady=status==='ready';
  const openTask=(DB.tasks||[]).find(t=>t.title==='Galon abis pa'&&t.status!=='Done');

  // Get location from user profile or default
  const location='Banjar, West Java'; // TODO: pull from user profile

  // Build log table
  const logs=(DB.waterLogs||[]).slice().reverse();
  const pgLogs=_pgSlice(logs,'waterLog');
  const logRows=pgLogs.map(l=>{
    const time=l.timestamp?String(l.timestamp).split('T')[1]?.slice(0,5)||'':'';
    return `<tr><td style="white-space:nowrap;color:var(--text3)" data-label="Date/Time">${fmtDate(l.timestamp)} ${time}</td><td data-label="Type">${l.type==='request'?'Request Made':l.type==='payment'?'Water Paid':'Request Satisfied'}</td><td data-label="Location">${l.location||'—'}</td><td data-label="Status"><span class="pill ${l.status==='closed'?'pg_':'pa_'}">${l.status==='closed'?'Closed':'Open'}</span></td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-label="Notes" title="${l.notes||''}">${l.notes||'—'}</td></tr>`;
  }).join('');
  const logTable=`<div class="tw"><table class="tbl"><thead><tr><th>Date/Time</th><th>Type</th><th>Location</th><th>Status</th><th>Notes</th></tr></thead><tbody>${logRows.length?logRows:'<tr><td colspan="5" class="empty">No water logs yet.</td></tr>'}</tbody></table></div><div class="card-list">${pgLogs.length?pgLogs.map(l=>{const time=l.timestamp?String(l.timestamp).split('T')[1]?.slice(0,5)||'':'';return`<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${l.type==='request'?'Request Made':l.type==='payment'?'Water Paid':'Request Satisfied'}</div><div class="card-item-sub">${fmtDate(l.timestamp)} ${time}</div></div><span class="pill ${l.status==='closed'?'pg_':'pa_'}">${l.status==='closed'?'Closed':'Open'}</span></div></div>`;}).join(''):'<div class="empty">No water logs yet.</div>'}</div>${_pgControls(logs.length,'waterLog','renderDomestics')}`;

  wrap.innerHTML=`
    <div class="panel" style="margin-bottom:14px">
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;color:var(--text2)">Aqua Galon Status</div>
        <div class="pill" style="font-size:13px;padding:6px 12px;background:${isReady?'var(--gbg)':'var(--rbg)'};color:${isReady?'var(--green)':'var(--red)'};border:1px solid ${isReady?'var(--green)':'var(--red)'}40">${isReady?'✅ Ready':'Segera ganti galon'}</div>
      </div>

      <div class="water-actions" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <button class="btn ${isReady?'btn-danger':'btn-o'}" style="${isReady?'':'border-color:var(--red);color:var(--red)'};flex:1;min-width:140px" onclick="needReplacement()" ${!isReady?'disabled':''}>Segera ganti galon</button>
        <button class="btn ${!isReady?'btn':'btn-o'}" style="${!isReady?'':'border-color:var(--green);color:var(--green)'};flex:1;min-width:140px" onclick="markReloaded()" ${isReady?'disabled':''}>ready</button>
        <button class="btn btn-o" style="flex:1;min-width:140px" onclick="openWaterPaymentModal()">💧 Water Paid</button>
      </div>

      <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Water Log</div>
      ${logTable}
    </div>
  `;
}
function needReplacement(){
  if(DB.galonStatus?.status!=='ready')return;

  // 1. Update galon status
  DB.galonStatus={status:'needs_replacement',lastUpdated:new Date().toISOString()};

  // 2. Create domestic task for Aldi (skip if an open one already exists —
  //    prevents duplicate "Galon abis pa" rows piling up across cycles).
  const aldiId='aldi';
  const hasOpen=DB.domestics.some(t=>
    t.assignee===aldiId &&
    t.name==='Galon abis pa' &&
    t.status!=='Done'
  );
  if(!hasOpen){
    DB.domestics.push({
      id:DB.nextId.dm++,
      name:'Galon abis pa',
      description:'Aqua galon perlu diganti - notifikasi dari Water Management',
      assignee:aldiId,
      priority:'high',
      dueDate:new Date().toISOString().slice(0,10),
      status:'To Do',
      createdAt:new Date().toISOString()
    });
  }

  // 3. Log water action
  DB.waterLogs.push({
    id:DB.nextId.wl++,
    type:'request',
    timestamp:new Date().toISOString(),
    location:'Banjar, West Java', // TODO: dynamic
    status:'open',
    notes:'User requested galon replacement'
  });
  addActivityLog('Water','Added','Galon replacement requested','domestic');

  // 4. Notify Aldi
  addNotification(aldiId,'💧 Galon aqua perlu diganti! Task "Galon abis pa" telah dibuat.','water',null);

  saveDBFn();
  renderWaterManagement();
}
function markReloaded(){
  // 1. Update galon status
  DB.galonStatus={status:'ready',lastUpdated:new Date().toISOString()};

  // 2. Complete any open galon domestic task
  const openTask=(DB.domestics||[]).find(t=>t.name==='Galon abis pa'&&t.status!=='Done');
  if(openTask) openTask.status='Done';

  // 3. Log water action
  DB.waterLogs.push({
    id:DB.nextId.wl++,
    type:'satisfied',
    timestamp:new Date().toISOString(),
    location:'Banjar, West Java',
    status:'closed',
    notes:'Galon has been reloaded'
  });
  addActivityLog('Water','Updated','Galon reloaded','domestic');

  // 4. Optional: notify assignee
  if(openTask){
    addNotification(openTask.assignee,'✅ Galon telah di-reload. Task "Galon abis pa" telah ditutup.','water',null);
  }

  saveDBFn();
  renderWaterManagement();
}

// ════════ WATER PAYMENT ════════
function openWaterPaymentModal(){
  const modal=document.getElementById('modal-water-payment');
  if(modal){
    const today=new Date().toISOString().slice(0,10);
    const descEl=document.getElementById('wp-desc');
    if(descEl)descEl.value=today+' - Aqua galon payment';
    modal.style.display='flex';
  }
}
function closeWaterPaymentModal(){
  const modal=document.getElementById('modal-water-payment');
  if(modal){modal.style.display='none';}
}
function saveWaterPayment(){
  const amt=getAmtVal('wp-amount');
  if(!amt){alert('Enter amount');return;}
  const desc=document.getElementById('wp-desc')?.value||'Aqua galon payment';
  const today=new Date().toISOString().slice(0,10);

  // Create expense transaction: Domestic / Studio / BCA
  DB.transactions.push({
    id:DB.nextId.tx++,
    description:desc,
    amount:amt,
    type:'Expense',
    category:'Domestic',
    division:'Studio',
    bank:'bca',
    date:today,
    createdAt:new Date().toISOString()
  });

  // Deduct from BCA balance
  const acc=DB.bankAccounts.find(a=>a.id==='bca');
  if(acc)acc.balance-=amt;

  // Log water payment
  DB.waterLogs.push({
    id:DB.nextId.wl++,
    type:'payment',
    timestamp:new Date().toISOString(),
    location:'Banjar, West Java',
    status:'closed',
    notes:`Water payment: ${desc} - Rp ${rp(amt)}`
  });
  addActivityLog('Water','Paid',desc,'domestic');

  addNotification(currentUser,'💧 Water payment logged successfully','water',null);
  closeWaterPaymentModal();
  saveDBFn();
  renderWaterManagement();
}

// ════════ RENDER: ACADEMY (tabbed) ════════
let academyTab=0;
function switchAcademyTab(el,idx){
  academyTab=idx;
  document.querySelectorAll('#academy-tabs .tab').forEach((t,i)=>t.classList.toggle('on',i===idx));
  const btns=document.getElementById('academy-ph-btns');
  if(btns){
    if(idx===2)btns.innerHTML='<button class="btn btn-sm" onclick="openAddStudent()">+ Add Student</button>';
    else if(idx===0||idx===1)btns.innerHTML='<button class="btn btn-sm" onclick="openNewClassModal()">+ New Class</button>';
    else btns.innerHTML='';
  }
  // idx 3 = Report, idx 4 = Invoice
  renderAcademy();
}
