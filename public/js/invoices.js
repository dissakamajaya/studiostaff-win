// ════════ RENDER: INVOICES ════════
let invTypeFilter='';
let invSearchQuery='';

function renderInvoices(typeFilter){
  if(typeFilter!==undefined)invTypeFilter=typeFilter||'';
  let data=DB.invoices;
  if(invTypeFilter)data=data.filter(i=>i.type===invTypeFilter);
  if(invLabelFilter)data=data.filter(i=>(i.category||'Studio')===invLabelFilter);
  if(invSearchQuery){
    const q=invSearchQuery.toLowerCase();
    data=data.filter(i=>{
      const c=DB.clients.find(cl=>cl.id===i.clientId);
      return [
        getInvNum(i),i.status,i.type,i.category,i.terminNote,i.due,
        c&&c.name,i.total&&String(i.total)
      ].filter(Boolean).some(v=>String(v).toLowerCase().includes(q));
    });
  }
  ['quote','invoice','all'].forEach(k=>{
    const el=document.getElementById(`inv-type-${k}`);
    if(el)el.classList.toggle('on',(k==='all'&&!invTypeFilter)||invTypeFilter===k);
  });
  ['invf-all','invf-studio','invf-rental','invf-academy'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const label={ 'invf-all':'','invf-studio':'Studio','invf-rental':'Rental','invf-academy':'Academy' }[id];
    el.classList.toggle('on',(invLabelFilter||'')===label);
  });

  const sortSel=document.getElementById('inv-sort-sel');
  const sortVal=sortSel?sortSel.value:'date-desc';
  const statusOrder={'Awaiting Approval':0,'Approved':1,'Rejected':2,'Accepted':3,'Paid':4,'Overdue':5,'Draft':6};
  data=data.slice().sort((a,b)=>{
    if(sortVal==='date-asc')    return new Date(a.createdAt)-new Date(b.createdAt);
    if(sortVal==='status')      return (statusOrder[a.status]||9)-(statusOrder[b.status]||9);
    if(sortVal==='amount-desc') return b.total-a.total;
    if(sortVal==='amount-asc')  return a.total-b.total;
    return new Date(b.createdAt)-new Date(a.createdAt);
  });

  const pendingInvoices=DB.invoices.filter(i=>i.type==='invoice'&&i.status!=='Paid');
  const paidInvoices=DB.invoices.filter(i=>i.type==='invoice'&&i.status==='Paid');
  const openQuotes=DB.invoices.filter(i=>i.type==='quote'&&(i.status==='Draft'||i.status==='Awaiting Approval'));
  const pend    = pendingInvoices.reduce((s,i)=>s+i.total,0);
  const paid    = paidInvoices.reduce((s,i)=>s+i.total,0);
  const _today  = new Date().toISOString().slice(0,10);
  const overdue = DB.invoices.filter(i=>
    i.type==='invoice' &&
    i.status!=='Paid' &&
    (i.status==='Overdue' || (i.due && i.due < _today))
  ).length;

  document.getElementById('inv-sub').textContent=
    `${DB.invoices.filter(i=>i.type==='quote').length} quotes · ${DB.invoices.filter(i=>i.type==='invoice').length} invoices`;

  document.getElementById('inv-kpis').innerHTML=[
    {key:'pending',label:'Pending Invoices',value:rp(pend),sub:`${pendingInvoices.length} invoices`,icon:'▧'},
    {key:'overdue',label:'Overdue',value:overdue,sub:`${overdue} invoices`,icon:'△'},
    {key:'paid',label:'Paid',value:rp(paid),sub:`${paidInvoices.length} invoices`,icon:'▣'},
    {key:'open',label:'Open Quotes',value:openQuotes.length,sub:`${openQuotes.length} quotes`,icon:'66'}
  ].map(k=>`<div class="kc invoice-kpi-card ${k.key}">
    <div><div class="kl">${k.label}</div><div class="kv">${k.value}</div><div class="invoice-kpi-sub">${k.sub}</div></div>
    <div class="invoice-kpi-icon">${k.icon}</div>
  </div>`).join('');

  const tbl   = document.getElementById('inv-tbl');
  const cards = document.getElementById('inv-cards');
  const labelColors2 = {Studio:'var(--accent)',Rental:'var(--green)',Academy:'var(--amber)'};

  if(!data.length){
    tbl.innerHTML   = `<tr><td colspan="6" class="empty">No records.</td></tr>`;
    cards.innerHTML = `<div class="empty">No records yet.</div>`;
    return;
  }

  tbl.innerHTML = data.map(inv=>{
    const c=DB.clients.find(cl=>cl.id===inv.clientId);
    const num=getInvNum(inv);
    const cat=inv.category||'Studio';
    const lc=labelColors2[cat]||'var(--accent)';
    const due=_invDueMeta(inv.due);
    const process=_invProcessActions(inv);
    return `<tr>
      <td>${_invStatusSelect(inv)}</td>
      <td><div class="invoice-process-cell">
        ${process}
        <div class="invoice-number">${num}${_terminBadge(inv)}</div>
        <div class="invoice-row-sub">${inv.type==='quote'?'Quote':'Invoice'}</div>
      </div></td>
      <td class="invoice-client"><div>${c?c.name:'—'}</div><span class="invoice-client-label" style="color:${lc}"><span class="invoice-dot" style="background:${lc}"></span>${cat}</span></td>
      <td class="invoice-total">${rp(inv.total)}</td>
      <td class="invoice-due"><div>${inv.due?fmtDate(inv.due):'—'}</div>${due.sub?`<span class="${due.cls}">${due.sub}</span>`:''}</td>
      <td><div class="invoice-type-actions">
        <button class="btn-o btn-xs" onclick="viewInvoice(${inv.id})">View</button>
        ${inv.type==='quote'&&inv.status==='Awaiting Approval'&&inv.createdBy!==currentUser?`<button class="btn btn-xs" style="background:var(--green)" onclick="approveQuote(${inv.id})">✓</button>`:''}
      </div></td>
    </tr>`;
  }).join('');

  cards.innerHTML = data.map(inv=>{
    const c=DB.clients.find(cl=>cl.id===inv.clientId);
    const num=getInvNum(inv);
    const cat=inv.category||'Studio';
    const lc=labelColors2[cat]||'var(--accent)';
    const statusClass=_statusClass(inv.status);
    const process=_invProcessActions(inv);
    const due=_invDueMeta(inv.due);
    return `<div class="card-item">
      <div class="card-item-header">
        <div>
          <div class="card-item-title" style="color:var(--accent)">${num}${_terminBadge(inv)}</div>
          <div class="card-item-sub">${c?c.name:'—'}</div>
        </div>
        <span class="pill ${statusClass}">${inv.status}</span>
      </div>
      <div class="card-item-row"><span class="card-item-label">Label</span><span class="card-item-val"><span style="background:${lc}22;color:${lc};border-radius:3px;padding:1px 6px;font-size:9px">${cat}</span></span></div>
      <div class="card-item-row"><span class="card-item-label">Total</span><span class="card-item-val" style="color:var(--green);font-weight:600">${rp(inv.total)}</span></div>
      ${process?`<div class="card-item-row"><span class="card-item-label">Process</span><span class="card-item-val">${process}</span></div>`:''}
      <div class="card-item-row"><span class="card-item-label">Type</span><span class="card-item-val">${inv.type==='quote'?'Quote':'Invoice'}</span></div>
      ${inv.due?`<div class="card-item-row"><span class="card-item-label">Due</span><span class="card-item-val">${fmtDate(inv.due)}${due.sub?` · ${due.sub}`:''}</span></div>`:''}
      <div class="card-item-actions">
        <button class="btn-o btn-xs" onclick="viewInvoice(${inv.id})">View</button>
        ${inv.type==='quote'&&inv.status==='Awaiting Approval'&&inv.createdBy!==currentUser?`<button class="btn btn-xs" style="background:var(--green)" onclick="approveQuote(${inv.id})">✓ Approve</button>`:''}
      </div>
    </div>`;
  }).join('');
}

function setInvSearch(value){
  invSearchQuery=(value||'').trim();
  renderInvoices();
}

// ─── shared helpers ───────────────────────────────────────────────────────────
function _statusClass(status){
  return {'Draft':'pa_','Sent':'pb_','Accepted':'pg_','Rejected':'pr_',
          'Awaiting Approval':'pa_','Approved':'pg_','Paid':'pg_','Overdue':'pr_','Pending':'pa_'}[status]||'pa_';
}
function _terminBadge(inv){
  return inv.terminNote
    ?`<span class="invoice-termin">${inv.terminNote}</span>`
    :'';
}

function _invProcessActions(inv){
  const actions=[];
  if(inv.type==='quote'&&inv.status==='Approved')actions.push(`<button class="btn btn-xs invoice-process-btn" onclick="convertToInvoice(${inv.id})">Make Invoice</button>`);
  if(inv.type==='invoice'&&inv.status!=='Paid')actions.push(`<button class="btn btn-xs invoice-process-btn paid" onclick="markPaid(${inv.id})">Mark Paid</button>`);
  return actions.join('');
}

function _invDueMeta(due){
  if(!due)return {sub:'',cls:''};
  const today=new Date();
  today.setHours(0,0,0,0);
  const target=new Date(due+'T00:00:00');
  const diff=Math.round((target-today)/86400000);
  if(diff===0)return {sub:'Today',cls:'invoice-due-today'};
  if(diff>0)return {sub:`${diff} days left`,cls:'invoice-due-left'};
  return {sub:`${Math.abs(diff)} days ago`,cls:'invoice-due-late'};
}

// ─── inline status change from table dropdown ─────────────────────────────────
function changeInvStatus(id,newStatus,selectEl){
  const inv=DB.invoices.find(i=>i.id===id);if(!inv)return;
  inv.status=newStatus;
  if(selectEl){
    ['pa_','pb_','pg_','pr_','pp_'].forEach(c=>selectEl.classList.remove(c));
    selectEl.classList.add(_statusClass(newStatus));
  }
  const label=(inv.type==='quote'?'QT-':'INV-')+String(id).padStart(4,'0');
  addActivityLog(inv.type==='quote'?'Quote':'Invoice','Status Changed',label+' → '+newStatus,'invoice');
  saveDBFn();
  renderDash();
}

function _invStatusSelect(inv){
  const quoteStatuses=['Awaiting Approval','Approved','Rejected','Accepted'];
  const invoiceStatuses=['Draft','Sent','Awaiting Approval','Paid','Overdue','Pending'];
  const opts=(inv.type==='quote'?quoteStatuses:invoiceStatuses);
  const sc=_statusClass(inv.status);
  return `<select class="pill invoice-status-select ${sc}"
    onchange="changeInvStatus(${inv.id},this.value,this)">${
    opts.map(s=>`<option value="${s}"${inv.status===s?' selected':''}>${s}</option>`).join('')
  }</select>`;
}
