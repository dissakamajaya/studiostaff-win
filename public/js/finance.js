// ════════ RENDER: FINANCE (full ecosystem) ════════
const BANK_COLORS={bca:'var(--blue)',jenius:'var(--accent)',nah:'var(--amber)'};
function bankBalance(bankId){
  return (DB.transactions||[]).filter(t=>t.bank===bankId).reduce((s,t)=>s+(t.type==='Income'?t.amount:-t.amount),0);
}

function backfillFinanceLog(){
  if (DB._financeLogBackfilled) return;
  if (!DB.financeLogs) DB.financeLogs = [];
  if (DB.financeLogs.length > 0) { DB._financeLogBackfilled = true; return; }

  const entries = [];
  (DB.transactions || []).forEach(function(t) {
    entries.push({
      id: Date.now() + entries.length,
      ts: t.createdAt || new Date().toISOString(),
      user: t.createdBy || currentUser || 'unknown',
      action: 'Added',
      entityType: 'Transaction',
      description: `${t.description || 'Transaction'} (${t.type || ''})`,
      amount: t.amount || null
    });
  });
  (DB.payrolls || []).forEach(function(p) {
    entries.push({
      id: Date.now() + entries.length,
      ts: p.createdAt || new Date().toISOString(),
      user: p.createdBy || currentUser || 'unknown',
      action: 'Added',
      entityType: 'Payroll',
      description: `Payroll — ${getUserName(p.userId)} ${p.period || ''}`.trim(),
      amount: p.amount || null
    });
  });
  (DB.debts || []).forEach(function(d) {
    entries.push({
      id: Date.now() + entries.length,
      ts: d.createdAt || new Date().toISOString(),
      user: d.createdBy || currentUser || 'unknown',
      action: 'Added',
      entityType: 'Debt',
      description: `Debt — ${d.description || ''}${d.party ? ` (${d.party})` : ''}`,
      amount: d.amount || null
    });
  });
  (DB.zakats || []).forEach(function(z) {
    entries.push({
      id: Date.now() + entries.length,
      ts: z.createdAt || new Date().toISOString(),
      user: z.createdBy || currentUser || 'unknown',
      action: 'Added',
      entityType: 'Zakat',
      description: `Zakat — ${z.period || ''} ${z.label || ''}`.trim(),
      amount: z.zakatAmount || null
    });
  });
  (DB.cleanings || []).forEach(function(c) {
    entries.push({
      id: Date.now() + entries.length,
      ts: c.createdAt || new Date().toISOString(),
      user: c.createdBy || currentUser || 'unknown',
      action: c.status === 'Paid' ? 'Paid' : 'Added',
      entityType: 'Cleaning',
      description: `Cleaning — ${c.cleaner || 'Pak Amin'}`,
      amount: c.amount || null
    });
  });
  (DB.reimbursements || []).forEach(function(r) {
    entries.push({
      id: Date.now() + entries.length,
      ts: r.createdAt || new Date().toISOString(),
      user: r.userId || currentUser || 'unknown',
      action: 'Added',
      entityType: 'Reimbursement',
      description: r.description || '',
      amount: r.amount || null
    });
  });

  entries.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  DB.financeLogs = entries.slice(-1000);
  DB._financeLogBackfilled = true;
  if (typeof saveDBFn === 'function') saveDBFn();
}

// ════════ FINANCE ACTIVITY LOG ════════
function addFinanceLog(action, entityType, description, amount){
  if(!DB.financeLogs) DB.financeLogs=[];
  DB.financeLogs.push({
    id: Date.now(),
    ts: new Date().toISOString(),
    user: currentUser||'unknown',
    action,        // 'Added','Edited','Deleted','Paid','Settled','Account Changed'
    entityType,    // 'Transaction','Payroll','Debt','Zakat'
    description,
    amount: amount||null
  });
  // Keep latest 1000
  if(DB.financeLogs.length>1000) DB.financeLogs=DB.financeLogs.slice(-1000);
}

function renderFinanceLog(){
  backfillFinanceLog();
  const wrap=document.getElementById('finance-tab-content');
  if(!wrap)return;
  const logs=(DB.financeLogs||[]).slice().reverse();
  const pgLogs=_pgSlice(logs,'finLog');
  const actionColors={
    'Added':'var(--green)','Edited':'var(--blue)','Deleted':'var(--red)',
    'Paid':'var(--green)','Settled':'var(--amber)','Account Changed':'var(--accent)',
    'Failed':'var(--red)'
  };
  const fmtTs=ts=>{const d=new Date(ts);return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});};
  wrap.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-size:11px;color:var(--text3)">${logs.length} log entr${logs.length===1?'y':'ies'}</span>
      ${isAdmin(currentUser)?`<button class="btn-danger btn-xs" onclick="if(confirm('Clear all finance logs?')){DB.financeLogs=[];saveDBFn();renderFinanceLog()}">Clear Log</button>`:''}
    </div>
    ${pgLogs.length?pgLogs.map(l=>`
      <div class="lr" style="align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;min-width:32px">
          <div class="av" style="background:${getUserColor(l.user)}22;color:${getUserColor(l.user)};width:28px;height:28px;font-size:10px;flex-shrink:0">${(getUserName(l.user)||l.user||'?')[0].toUpperCase()}</div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px">
            <span style="font-size:10px;font-weight:700;color:${actionColors[l.action]||'var(--text3)'};background:${actionColors[l.action]||'var(--bg3)'}18;padding:1px 6px;border-radius:4px;border:1px solid ${actionColors[l.action]||'var(--border)'}40">${l.action}</span>
            <span style="font-size:10px;color:var(--text3);background:var(--bg3);padding:1px 5px;border-radius:4px">${l.entityType}</span>
            ${l.amount?`<span style="font-size:10px;font-weight:600;color:var(--text2)">${rp(l.amount)}</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.description}</div>
          <div style="font-size:9px;color:var(--text3);margin-top:2px">${fmtTs(l.ts)} - ${getUserName(l.user)||l.user}</div>
        </div>
      </div>`).join(''):'<div class="empty" style="padding:24px 0">No activity logged yet.</div>'}
    ${_pgControls(logs.length,'finLog','renderFinanceLog')}`;
}

let finTab=0;
let finSort='date-desc';
let finGroupLabel='';
let finDateRange='all';
let finSearch='';
let finGroupBy='';
function switchFinTab(el,idx){
  finTab=idx;
  document.querySelectorAll('#finance-tabs .tab').forEach((t,i)=>t.classList.toggle('on',i===idx));
  const btns=document.getElementById('finance-ph-btns');
  if(btns){
    const btnMap={0:'<button class="btn btn-sm" onclick="openModal(\'modal-transaction\')">+ Log Transaction</button>',1:'<button class="btn btn-sm" onclick="openTransactionModal(\'Income\')">+ Income</button>',2:'<button class="btn btn-sm" onclick="openTransactionModal(\'Expense\')">+ Expense</button>',3:'<button class="btn btn-sm" onclick="openModal(\'modal-payroll\')">+ Payroll</button>',4:'<button class="btn btn-sm" onclick="openModal(\'modal-debt\')">+ Log Debt</button>',5:'',6:'<button class="btn btn-sm" onclick="openZakatModal()">+ Zakat</button>',7:''};
    btns.innerHTML=btnMap[idx]||'';
  }
  renderFinance();
}
function renderFinance(){
  // Bank strip
  const strip=document.getElementById('finance-bank-strip');
  if(strip&&DB.bankAccounts){
    const debts=(DB.debts||[]).filter(d=>d.status!=='Settled');
    const debtPayable=debts.filter(d=>d.type==='payable').reduce((s,d)=>s+(d.remainingAmount!==undefined?d.remainingAmount:d.amount),0);
    const debtReceivable=debts.filter(d=>d.type==='receivable').reduce((s,d)=>s+(d.remainingAmount!==undefined?d.remainingAmount:d.amount),0);
    const netDebt=debtReceivable-debtPayable;
    strip.innerHTML=DB.bankAccounts.map(a=>`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 16px;flex:1;min-width:120px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${a.name}</div><div style="font-family:var(--ui);font-size:16px;font-weight:700;color:${BANK_COLORS[a.id]||'var(--text)'}">${rp(bankBalance(a.id))}</div><div style="font-size:9px;color:var(--text3);margin-top:2px">${a.owner}</div></div>`).join('')+`<div style="background:var(--bg2);border:1px solid ${netDebt>=0?'var(--green)':'var(--red)'};border-radius:8px;padding:10px 16px;flex:1;min-width:120px;cursor:pointer" onclick="switchFinTab(null,4)"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">DEBT</div><div style="font-family:var(--ui);font-size:16px;font-weight:700;color:${netDebt>=0?'var(--green)':'var(--red)'}">${rp(netDebt)}</div><div style="font-size:9px;color:var(--text3);margin-top:2px">${netDebt>=0?'Receivable':'Payable'}</div></div>`;
  }
  document.getElementById('finance-sub').textContent='Financial ecosystem';
  const wrap=document.getElementById('finance-tab-content');
  if(!wrap)return;

  const income=DB.transactions.filter(t=>t.type==='Income').reduce((s,t)=>s+t.amount,0)+DB.invoices.filter(i=>i.type==='invoice'&&i.status==='Paid').reduce((s,i)=>s+i.total,0);
  const expense=DB.transactions.filter(t=>t.type==='Expense').reduce((s,t)=>s+t.amount,0);

  if(finTab===0){
    // ─ Overview ─
    const now0=new Date();
    const monthStart0=new Date(now0.getFullYear(),now0.getMonth(),1);
    const incomeMonth=DB.transactions.filter(t=>t.type==='Income'&&t.date&&new Date(t.date)>=monthStart0).reduce((s,t)=>s+t.amount,0);
    const expenseMonth=DB.transactions.filter(t=>t.type==='Expense'&&t.date&&new Date(t.date)>=monthStart0).reduce((s,t)=>s+t.amount,0);
    const netMonth=incomeMonth-expenseMonth;
    const pendingInv=DB.invoices.filter(i=>i.type==='invoice'&&i.status!=='Paid').reduce((s,i)=>s+i.total,0);
    const allTimeIncome=DB.transactions.filter(t=>t.type==='Income').reduce((s,t)=>s+t.amount,0);
    const allTimeExpense=DB.transactions.filter(t=>t.type==='Expense').reduce((s,t)=>s+t.amount,0);
    wrap.innerHTML=`
      <div class="kgrid" style="margin-bottom:16px">
        <div class="kc"><div class="kl">Income (This Month)</div><div class="kv" style="color:var(--green)">${rp(incomeMonth)}</div></div>
        <div class="kc"><div class="kl">Expense (This Month)</div><div class="kv" style="color:var(--red)">${rp(expenseMonth)}</div></div>
        <div class="kc"><div class="kl">Net Profit (This Month)</div><div class="kv" style="color:${netMonth>=0?'var(--green)':'var(--red)'}">${rp(netMonth)}</div></div>
        <div class="kc"><div class="kl">Pending Invoices</div><div class="kv" style="color:var(--amber)">${rp(pendingInv)}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="panel"><div class="pnh"><span class="pnt">Recent Transactions</span><button class="btn-o btn-sm" onclick="switchFinTab(null,1)">All →</button></div>
          ${DB.transactions.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(t=>{const isInc=t.type==='Income';return`<div class="lr"><div><div style="font-size:11px;font-weight:500">${t.description}</div><div style="font-size:9px;color:var(--text3)">${fmtDate(t.date)} · ${t.bank?'['+t.bank.toUpperCase()+']':''}</div></div><span style="font-weight:600;color:${isInc?'var(--green)':'var(--red)'}">${isInc?'+':'−'}${rp(t.amount)}</span></div>`;}).join('')||'<div class="empty" style="padding:12px">No transactions yet.</div>'}
        </div>
        <div class="panel"><div class="pnh"><span class="pnt">Outstanding Debt</span><button class="btn-o btn-sm" onclick="switchFinTab(null,4)">All →</button></div>
          ${(DB.debts||[]).filter(d=>d.status==='Outstanding').slice(0,5).map(d=>`<div class="lr"><div><div style="font-size:11px;font-weight:500">${d.description}</div><div style="font-size:9px;color:var(--text3)">${d.party} · Due ${fmtDate(d.due)}</div></div><span style="color:${d.type==='payable'?'var(--red)':'var(--green)'};font-weight:600">${rp(d.amount)}</span></div>`).join('')||'<div class="empty" style="padding:12px">No outstanding debts.</div>'}
        </div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px;margin-top:12px;display:flex;gap:24px;flex-wrap:wrap">
        <div><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">All Time Income</div><div style="font-size:15px;font-weight:700;color:var(--green)">${rp(allTimeIncome)}</div></div>
        <div><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">All Time Expense</div><div style="font-size:15px;font-weight:700;color:var(--red)">${rp(allTimeExpense)}</div></div>
        <div><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Net All Time</div><div style="font-size:15px;font-weight:700;color:${allTimeIncome-allTimeExpense>=0?'var(--green)':'var(--red)'}">${rp(allTimeIncome-allTimeExpense)}</div></div>
      </div>`;

  } else if(finTab===1||finTab===2){
    // ─ Income or Expense ─
    const typeStr=finTab===1?'Income':'Expense';
    let txs=DB.transactions.filter(t=>t.type===typeStr);
    if(finGroupLabel)txs=txs.filter(t=>t.division===finGroupLabel);
    // Date range
    const now2=new Date();
    if(finDateRange==='week'){const s=new Date(now2);s.setDate(s.getDate()-s.getDay());s.setHours(0,0,0,0);txs=txs.filter(t=>t.date&&new Date(t.date)>=s);}
    else if(finDateRange==='month'){const s=new Date(now2.getFullYear(),now2.getMonth(),1);txs=txs.filter(t=>t.date&&new Date(t.date)>=s);}
    // Search
    if(finSearch){const q=finSearch.toLowerCase();txs=txs.filter(t=>t.description.toLowerCase().includes(q)||t.category.toLowerCase().includes(q)||(t.division||'').toLowerCase().includes(q)||(t.bank||'').toLowerCase().includes(q));}
    // Sort
    txs=txs.slice().sort((a,b)=>finSort==='date-asc'?new Date(a.date)-new Date(b.date):new Date(b.date)-new Date(a.date));
    const total=txs.reduce((s,t)=>s+t.amount,0);
    // Group-by helper
    function renderGrouped(arr,groupKey){
      const groups={};arr.forEach(t=>{const k=t[groupKey]||'—';if(!groups[k])groups[k]=[];groups[k].push(t);});
      let gi=0;
      return Object.entries(groups).map(([k,items])=>{
        const grpTotal=items.reduce((s,t)=>s+t.amount,0);
        const gid=`fg_${++gi}_${k.replace(/\W/g,'_')}`;
        return `<div style="margin-bottom:8px"><div onclick="var el=document.getElementById('${gid}');el.style.display=el.style.display==='none'?'':'none'" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg3);border-radius:6px;cursor:pointer;border:1px solid var(--border);user-select:none"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;color:var(--text3);transition:.15s">▾</span><span style="font-size:11px;font-weight:700;color:var(--text)">${k.toUpperCase()}</span><span style="font-size:9px;color:var(--text3);background:var(--bg4);padding:1px 6px;border-radius:8px">${items.length}</span></div><span style="font-weight:700;color:${typeStr==='Income'?'var(--green)':'var(--red)'}">${rp(grpTotal)}</span></div><div id="${gid}" style="padding:4px 0 0 12px">${items.map(t=>`<div class="lr" style="border-bottom:1px solid var(--border);padding:6px 0;cursor:pointer" onclick="openEditTransaction(${t.id})"><div style="flex:1;min-width:0"><div style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.description}</div><div style="font-size:9px;color:var(--text3)">${fmtDate(t.date)} · ${t.bank?t.bank.toUpperCase():'—'}</div></div><div style="display:flex;align-items:center;gap:6px;flex-shrink:0"><span style="font-weight:600;color:${typeStr==='Income'?'var(--green)':'var(--red)'}">${rp(t.amount)}</span><span style="font-size:10px;color:var(--text3)">✎</span></div></div>`).join('')}</div></div>`;
      }).join('');
    }
    wrap.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
        <select class="fi" style="padding:4px 8px;font-size:11px;width:100%" onchange="finDateRange=this.value;renderFinance()">
          <option value="all" ${finDateRange==='all'?'selected':''}>📅 All Time</option>
          <option value="week" ${finDateRange==='week'?'selected':''}>📅 This Week</option>
          <option value="month" ${finDateRange==='month'?'selected':''}>📅 This Month</option>
        </select>
        <select class="fi" style="padding:4px 8px;font-size:11px;width:100%" onchange="finSort=this.value;renderFinance()">
          <option value="date-desc" ${finSort==='date-desc'?'selected':''}>↓ Newest First</option>
          <option value="date-asc" ${finSort==='date-asc'?'selected':''}>↑ Oldest First</option>
        </select>
        <select class="fi" style="padding:4px 8px;font-size:11px;width:100%" onchange="finGroupBy=this.value;renderFinance()">
          <option value="" ${!finGroupBy?'selected':''}>⊞ No Grouping</option>
          <option value="bank" ${finGroupBy==='bank'?'selected':''}>⊞ By Bank</option>
          <option value="category" ${finGroupBy==='category'?'selected':''}>⊞ By Category</option>
          <option value="division" ${finGroupBy==='division'?'selected':''}>⊞ By Label</option>
        </select>
        <select class="fi" style="padding:4px 8px;font-size:11px;width:100%" onchange="finGroupLabel=this.value;renderFinance()">
          <option value="" ${!finGroupLabel?'selected':''}>🏷 All Labels</option>
          ${['studio','rental','academy','Domestic','Other'].map(l=>`<option value="${l}" ${finGroupLabel===l?'selected':''}>🏷 ${l}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:10px">
        <input class="fi" placeholder="🔍 Search transactions..." style="width:100%;padding:4px 8px;font-size:11px;box-sizing:border-box" value="${finSearch}" oninput="finSearch=this.value;renderFinance()"/>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:12px;color:var(--text3)">${txs.length} transactions</div>
        <div style="font-size:14px;font-weight:700;color:${typeStr==='Income'?'var(--green)':'var(--red)'}">${rp(total)}</div>
      </div>
      ${finGroupBy?`<div>${renderGrouped(txs,finGroupBy)}</div>`:`
      <div class="tw"><table class="tbl"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Label</th><th>Account</th><th class="ta">Amount</th><th>Action</th></tr></thead><tbody>
        ${txs.length?txs.map(t=>`<tr><td class="tc" style="white-space:nowrap" data-label="Date">${fmtDate(t.date)}</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${t.description}" data-label="Description">${t.description}</td><td class="tc" data-label="Category">${t.category}</td><td data-label="Label"><span style="background:var(--bg3);border-radius:3px;padding:1px 6px;font-size:9px">${t.division||'—'}</span></td><td class="tc" style="color:${BANK_COLORS[t.bank]||'var(--text3)'};font-weight:500;cursor:pointer;user-select:none" onclick="openAccountBalloon(${t.id},this)" title="Click to change account" data-label="Account">${t.bank?t.bank.toUpperCase():'—'} <span style="font-size:8px;opacity:.5">▾</span></td><td class="ta" style="color:${typeStr==='Income'?'var(--green)':'var(--red)'};font-weight:500" data-label="Amount">${rp(t.amount)}</td><td data-label="Action"><div style="display:flex;gap:4px"><button class="btn-o btn-xs" onclick="openEditTransaction(${t.id})">✎</button>${t.id<10000?`<button class="btn-danger btn-xs" onclick="deleteTransaction(${t.id})">✕</button>`:`<span style="font-size:8px;color:var(--text3);padding:2px 4px;background:var(--bg3);border-radius:3px">CSV</span>`}</div></td></tr>`).join(''):'<tr><td colspan="7" class="empty">No transactions.</td></tr>'}
      </tbody></table></div>
      <div class="card-list">${txs.slice(0,50).map(t=>`<div class="card-item"><div class="card-item-header"><div><div class="card-item-title" style="font-size:11px">${t.description}</div><div class="card-item-sub">${t.category} · ${t.division||'—'}</div></div><span style="font-weight:700;color:${typeStr==='Income'?'var(--green)':'var(--red)'};white-space:nowrap">${rp(t.amount)}</span></div><div class="card-item-row"><span class="card-item-label">Date</span><span class="card-item-val">${fmtDate(t.date)}</span></div><div class="card-item-row"><span class="card-item-label">Account</span><span class="card-item-val" style="color:${BANK_COLORS[t.bank]||'var(--text3)'};cursor:pointer" onclick="openAccountBalloon(${t.id},this)" title="Click to change account">${t.bank?t.bank.toUpperCase():'—'} <span style="font-size:8px;opacity:.5">▾</span></span></div></div>`).join('')}${txs.length>50?`<div style="text-align:center;padding:12px;font-size:10px;color:var(--text3)">Showing 50 of ${txs.length} — use desktop table for all.</div>`:''}</div>`}
    `;

  } else if(finTab===3){
    // ─ Payroll ─
    const payrolls=DB.payrolls||[];
    const totalPending=payrolls.filter(p=>p.status!=='Paid').reduce((s,p)=>s+p.amount,0);
    const totalPaid=payrolls.filter(p=>p.status==='Paid').reduce((s,p)=>s+p.amount,0);
    wrap.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="kc"><div class="kl">Awaiting Approval</div><div class="kv" style="color:var(--amber)">${rp(totalPending)}</div></div>
        <div class="kc"><div class="kl">Total Paid</div><div class="kv" style="color:var(--green)">${rp(totalPaid)}</div></div>
      </div>
      <div class="tw"><table class="tbl"><thead><tr><th>Period</th><th>Employee</th><th>Amount</th><th>Account</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${payrolls.length?payrolls.slice().reverse().map(p=>`<tr><td style="font-weight:500">${p.period}</td><td>${getUserName(p.userId)}</td><td style="color:${p.status==='Paid'?'var(--red)':'var(--amber)'}">${rp(p.amount)}</td><td style="color:${BANK_COLORS[p.bank]||'var(--text3)'}">${p.bank?p.bank.toUpperCase():'—'}</td><td><span class="pill ${p.status==='Paid'?'pg_':'pa_'}">${p.status}</span></td><td><div style="display:flex;gap:4px">${p.status!=='Paid'?`<button class="btn btn-xs" style="background:var(--green)" onclick="markPayrollPaid(${p.id})">✓ Mark Paid</button>`:''} ${p.status==='Paid'?`<button class="btn-o btn-xs" onclick="downloadPayslipPDF(${p.id})">📄 Payslip</button>`:''}<button class="btn-danger btn-xs" onclick="deletePayroll(${p.id})">✕</button></div></td></tr>`).join(''):'<tr><td colspan="6" class="empty">No payroll records yet.</td></tr>'}
      </tbody></table></div>
      <div class="card-list">${payrolls.length?payrolls.slice().reverse().map(p=>`<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${getUserName(p.userId)}</div><div class="card-item-sub">${p.period}</div></div><span class="pill ${p.status==='Paid'?'pg_':'pa_'}">${p.status}</span></div><div class="card-item-row"><span class="card-item-label">Amount</span><span class="card-item-val" style="font-weight:600;color:${p.status==='Paid'?'var(--red)':'var(--amber)'}">${rp(p.amount)}</span></div><div class="card-item-row"><span class="card-item-label">Account</span><span class="card-item-val" style="color:${BANK_COLORS[p.bank]||'var(--text3)'}">${p.bank?p.bank.toUpperCase():'—'}</span></div><div class="card-item-actions">${p.status!=='Paid'?`<button class="btn btn-xs" style="background:var(--green)" onclick="markPayrollPaid(${p.id})">✓ Pay</button>`:''} ${p.status==='Paid'?`<button class="btn-o btn-xs" onclick="downloadPayslipPDF(${p.id})">📄</button>`:''}<button class="btn-danger btn-xs" onclick="deletePayroll(${p.id})">✕</button></div></div>`).join(''):'<div class="empty">No payroll records yet.</div>'}</div>`;

  } else if(finTab===4){
    const debts=DB.debts||[];
    const payable=debts.filter(d=>d.type==='payable'&&d.status!=='Settled').reduce((s,d)=>s+(d.remainingAmount!==undefined?d.remainingAmount:d.amount),0);
    const receivable=debts.filter(d=>d.type==='receivable'&&d.status!=='Settled').reduce((s,d)=>s+(d.remainingAmount!==undefined?d.remainingAmount:d.amount),0);
    wrap.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="kc"><div class="kl">We Owe (Outstanding)</div><div class="kv" style="color:var(--red)">${rp(payable)}</div></div>
        <div class="kc"><div class="kl">Owed to Us (Outstanding)</div><div class="kv" style="color:var(--green)">${rp(receivable)}</div></div>
      </div>
      <div class="tw"><table class="tbl"><thead><tr><th>Description</th><th>Payable To</th><th>Type</th><th>Label</th><th>Original</th><th>Remaining</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${debts.length?debts.slice().reverse().map(d=>{
          const remaining=d.remainingAmount!==undefined?d.remainingAmount:d.amount;
          const sc={Settled:'pg_','Partially Settled':'pb_',Outstanding:'pa_'}[d.status]||'pa_';
          return`<tr><td style="font-weight:500" data-label="Description">${d.description}${d.settlements?.length?`<div style="font-size:9px;color:var(--text3)">${d.settlements.length} partial settlement(s)</div>`:''}</td><td class="tc" data-label="Payable To">${d.party||'—'}</td><td data-label="Type"><span class="pill ${d.type==='payable'?'pr_':'pg_'}">${d.type==='payable'?'Pay':'Rec'}</span></td><td data-label="Label"><span style="font-size:9px;background:var(--bg3);border-radius:3px;padding:1px 5px">${d.label||'—'}</span></td><td style="color:var(--text3)" data-label="Original">${rp(d.amount)}</td><td style="color:${d.type==='payable'?'var(--red)':'var(--green)'};font-weight:500" data-label="Remaining">${rp(remaining)}</td><td class="tc" data-label="Due">${fmtDate(d.due)}</td><td data-label="Status"><span class="pill ${sc}">${d.status}</span></td><td data-label="Action"><div style="display:flex;gap:4px"><button class="btn-o btn-xs" onclick="viewDebt(${d.id})">View</button>${d.status!=='Settled'?`<button class="btn btn-xs" onclick="markDebtPaid(${d.id})">Settle</button>`:''}<button class="btn-o btn-xs" onclick="downloadDebtPDF(${d.id})">📄 PDF</button><button class="btn-danger btn-xs" onclick="deleteDebt(${d.id})">✕</button></div></td></tr>`;
        }).join(''):'<tr><td colspan="10" class="empty">No debt records.</td></tr>'}
      </tbody></table></div>
      <div class="card-list">${debts.length?debts.slice().reverse().map(d=>{const remaining=d.remainingAmount!==undefined?d.remainingAmount:d.amount;const sc={Settled:'pg_','Partially Settled':'pb_',Outstanding:'pa_'}[d.status]||'pa_';return`<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${d.description}</div><div class="card-item-sub">${d.party||'—'} · <span class="pill ${d.type==='payable'?'pr_':'pg_'}" style="font-size:9px">${d.type==='payable'?'Pay':'Rec'}</span></div></div><span class="pill ${sc}">${d.status}</span></div><div class="card-item-row"><span class="card-item-label">Remaining</span><span class="card-item-val" style="font-weight:600;color:${d.type==='payable'?'var(--red)':'var(--green)'}">${rp(remaining)}</span></div><div class="card-item-row"><span class="card-item-label">Due</span><span class="card-item-val">${fmtDate(d.due)}</span></div><div class="card-item-actions"><button class="btn-o btn-xs" onclick="viewDebt(${d.id})">View</button>${d.status!=='Settled'?`<button class="btn btn-xs" onclick="markDebtPaid(${d.id})">Settle</button>`:''}<button class="btn-o btn-xs" onclick="downloadDebtPDF(${d.id})">📄</button><button class="btn-danger btn-xs" onclick="deleteDebt(${d.id})">✕</button></div></div>`;}).join(''):'<div class="empty">No debt records.</div>'}</div>
      <h3 style="margin:18px 0 10px;font-size:13px;color:var(--text2);text-transform:uppercase;letter-spacing:.05em">Settlement History</h3>
      ${(()=>{
        const allSettlements=[];
        (DB.debts||[]).forEach(d=>{
          (d.settlements||[]).forEach((s,si)=>{
            allSettlements.push({...s,debtId:d.id,debtDesc:d.description,party:d.party||'—',label:d.label||'studio',debtType:d.type,idx:si});
          });
        });
        allSettlements.sort((a,b)=>new Date(b.date)-new Date(a.date));
        const totalSettled=allSettlements.reduce((s,x)=>s+x.amount,0);
        return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="kc"><div class="kl">Total Settlements</div><div class="kv">${allSettlements.length}</div></div>
        <div class="kc"><div class="kl">Total Amount Settled</div><div class="kv" style="color:var(--green)">${rp(totalSettled)}</div></div>
      </div>
      ${allSettlements.length?`
      <div class="tw"><table class="tbl"><thead><tr>
        <th>Date</th><th>Debt</th><th>Party</th><th>Label</th><th>Account</th><th>Settled By</th><th>Amount</th><th>Action</th>
      </tr></thead><tbody>
        ${allSettlements.map(s=>{
          const bankLabel=s.bank?s.bank.toUpperCase():'—';
          return`<tr>
            <td style="white-space:nowrap;color:var(--text3)" data-label="Date">${fmtDate(s.date)}</td>
            <td style="font-weight:500" data-label="Debt">${s.debtDesc}</td>
            <td class="tc" data-label="Party">${s.party}</td>
            <td data-label="Label"><span style="font-size:9px;background:var(--bg3);border-radius:3px;padding:1px 5px">${s.label}</span></td>
            <td data-label="Account"><span class="pill pb_">${bankLabel}</span></td>
            <td data-label="Settled By">${getUserName(s.by)}</td>
            <td style="font-weight:600;color:var(--green)" data-label="Amount">${rp(s.amount)}</td>
            <td data-label="Action"><button class="btn-o btn-xs" onclick="downloadDebtPDF(${s.debtId})">📄 PDF</button></td>
          </tr>`;
        }).join('')}
      </tbody></table></div>
      <div class="card-list">${allSettlements.map(s=>`<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${s.debtDesc}</div><div class="card-item-sub">${s.party} · ${fmtDate(s.date)}</div></div><span style="font-weight:600;color:var(--green)">${rp(s.amount)}</span></div><div class="card-item-row"><span class="card-item-label">Settled By</span><span class="card-item-val">${getUserName(s.by)}</span></div><div class="card-item-row"><span class="card-item-label">Account</span><span class="card-item-val">${s.bank?s.bank.toUpperCase():'—'}</span></div><div class="card-item-actions"><button class="btn-o btn-xs" onclick="downloadDebtPDF(${s.debtId})">📄 PDF</button></div></div>`).join('')}</div>`
        :'<div class="empty" style="padding:40px;text-align:center">No settlements recorded yet.</div>'}`;
      })()}
    `;

  } else if(finTab===5){
    // ─ Financial Statements ─
    const now=new Date();
    const periods=[
      {label:'This Week',fn:()=>{const s=new Date(now);s.setDate(s.getDate()-s.getDay());return s;}},
      {label:'This Month',fn:()=>new Date(now.getFullYear(),now.getMonth(),1)},
      {label:'This Quarter',fn:()=>new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3,1)},
      {label:'This Year',fn:()=>new Date(now.getFullYear(),0,1)},
      {label:'All Time',fn:()=>null}
    ];
    wrap.innerHTML=`
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        ${periods.map((p,i)=>`<button class="btn-o btn-sm" id="stmt-btn-${i}" onclick="renderStatement(${i})" style="${i===0?'border-color:var(--accent);color:var(--accent)':''}">${p.label}</button>`).join('')}
      </div>
      <div id="stmt-content"></div>`;
    renderStatement(0);

  } else if(finTab===6){
    // ─ Zakat ─
    const zakats=(DB.zakats||[]).slice().reverse();
    const totalPending=zakats.filter(z=>z.status==='Pending').reduce((s,z)=>s+z.zakatAmount,0);
    const totalPaid=zakats.filter(z=>z.status==='Paid').reduce((s,z)=>s+z.zakatAmount,0);
    wrap.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="kc"><div class="kl">Pending Zakat</div><div class="kv" style="color:var(--amber)">${rp(totalPending)}</div></div>
        <div class="kc"><div class="kl">Total Paid</div><div class="kv" style="color:var(--green)">${rp(totalPaid)}</div></div>
      </div>
      <div class="tw"><table class="tbl"><thead><tr><th>Period</th><th>Label</th><th>Account</th><th>Penerima</th><th>Total Income</th><th>Zakat (2.5%)</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${zakats.length?zakats.map(z=>`<tr>
          <td style="font-weight:500">${z.period}</td>
          <td><span style="font-size:9px;background:var(--bg3);border-radius:3px;padding:1px 5px">${z.label}</span></td>
          <td><span class="pill pb_">${z.account==='All'?'All':z.account.toUpperCase()}</span></td>
          <td style="font-size:11px;color:var(--text2)">${z.penerima||'—'}</td>
          <td style="color:var(--green)">${rp(z.totalIncome)}</td>
          <td style="font-weight:600;color:var(--accent)">${rp(z.zakatAmount)}</td>
          <td><span class="pill ${z.status==='Paid'?'pg_':'pa_'}">${z.status}</span></td>
          <td><div style="display:flex;gap:4px">
            ${z.status!=='Paid'?`<button class="btn btn-xs" style="background:var(--green)" onclick="markZakatPaid(${z.id})">✓ Pay</button>`:''}
            <button class="btn-o btn-xs" onclick="downloadZakatPDF(${z.id})">📄 PDF</button>
            <button class="btn-danger btn-xs" onclick="deleteZakat(${z.id})">✕</button>
          </div></td>
        </tr>`).join(''):'<tr><td colspan="7" class="empty">No zakat records yet.</td></tr>'}
      </tbody></table></div>
      <div class="card-list">${zakats.length?zakats.map(z=>`<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${z.period}</div><div class="card-item-sub">${z.label} · ${z.account==='All'?'All':z.account.toUpperCase()}</div></div><span class="pill ${z.status==='Paid'?'pg_':'pa_'}">${z.status}</span></div><div class="card-item-row"><span class="card-item-label">Penerima</span><span class="card-item-val">${z.penerima||'—'}</span></div><div class="card-item-row"><span class="card-item-label">Zakat (2.5%)</span><span class="card-item-val" style="font-weight:600;color:var(--accent)">${rp(z.zakatAmount)}</span></div><div class="card-item-actions">${z.status!=='Paid'?`<button class="btn btn-xs" style="background:var(--green)" onclick="markZakatPaid(${z.id})">✓ Pay</button>`:''}<button class="btn-o btn-xs" onclick="downloadZakatPDF(${z.id})">📄</button><button class="btn-danger btn-xs" onclick="deleteZakat(${z.id})">✕</button></div></div>`).join(''):'<div class="empty">No zakat records yet.</div>'}</div>`;
  } else if(finTab===7){
    renderFinanceLog();
    return;
  }
}

// ════════ FINANCE: DELETE HELPERS (named so log can be added) ════════
function deletePayroll(id){
  if(!confirm('Delete this payroll record?'))return;
  const p=DB.payrolls.find(x=>x.id===id);
  if(p){addFinanceLog('Deleted','Payroll',`${getUserName(p.userId)} — ${p.period}`,p.amount);}
  DB.payrolls=DB.payrolls.filter(x=>x.id!==id);
  saveDBFn();renderPage(_currentPage);
}
function deleteDebt(id){
  if(!confirm('Delete this debt record?'))return;
  const d=DB.debts.find(x=>x.id===id);
  if(d){addFinanceLog('Deleted','Debt',`${d.description} (${d.party||'—'})`,d.amount);}
  DB.debts=DB.debts.filter(x=>x.id!==id);
  saveDBFn();renderPage(_currentPage);
}
function deleteZakat(id){
  if(!confirm('Delete this zakat record?'))return;
  const z=DB.zakats?.find(x=>x.id===id);
  if(z){addFinanceLog('Deleted','Zakat',`Period ${z.period} — ${z.label}`,z.zakatAmount);}
  DB.zakats=DB.zakats.filter(x=>x.id!==id);
  saveDBFn();renderPage(_currentPage);
}

function calcZakatPreview(){
  const period=document.getElementById('zk-period')?.value||'';
  const label=document.getElementById('zk-label')?.value||'All';
  const account=document.getElementById('zk-account')?.value||'All';
  let total=0;
  if(period){
    const [yr,mo]=period.split('-').map(Number);
    total=(DB.transactions||[]).filter(t=>{
      if(t.type!=='Income')return false;
      if(!t.date)return false;
      const d=new Date(t.date);
      if(d.getFullYear()!==yr||d.getMonth()+1!==mo)return false;
      if(label!=='All'&&t.division&&t.division!==label)return false;
      if(account!=='All'&&t.bank&&t.bank!==account)return false;
      return true;
    }).reduce((s,t)=>s+t.amount,0);
  }
  const zakat=Math.round(total*0.025);
  const inc=document.getElementById('zk-preview-income');
  const zkt=document.getElementById('zk-preview-zakat');
  if(inc)inc.textContent=rp(total);
  if(zkt)zkt.textContent=rp(zakat);
}
function saveZakat(){
  const period=document.getElementById('zk-period')?.value||'';
  if(!period){alert('Please select a period.');return;}
  const label=document.getElementById('zk-label')?.value||'All';
  const account=document.getElementById('zk-account')?.value||'All';
  const [yr,mo]=period.split('-').map(Number);
  const totalIncome=(DB.transactions||[]).filter(t=>{
    if(t.type!=='Income')return false;
    if(!t.date)return false;
    const d=new Date(t.date);
    if(d.getFullYear()!==yr||d.getMonth()+1!==mo)return false;
    if(label!=='All'&&t.division&&t.division!==label)return false;
    if(account!=='All'&&t.bank&&t.bank!==account)return false;
    return true;
  }).reduce((s,t)=>s+t.amount,0);
  const zakatAmount=Math.round(totalIncome*0.025);
  const penerima=document.getElementById('zk-penerima')?.value.trim()||'';
  if(!DB.zakats)DB.zakats=[];
  const id=DB.nextId.zk||1;
  DB.zakats.push({id,period,label,account,totalIncome,zakatAmount,penerima,status:'Pending',paidAt:null,transactionId:null,createdBy:currentUser||'',createdAt:new Date().toISOString()});
  DB.nextId.zk=(DB.nextId.zk||1)+1;
  addFinanceLog('Added','Zakat',`Period ${period} — ${label}, ${account}`,zakatAmount);
  saveDBFn();
  closeModal('modal-zakat');
  renderPage(_currentPage);
}
function openZakatModal(){
  const now=new Date();
  const mo=String(now.getMonth()+1).padStart(2,'0');
  document.getElementById('zk-period').value=`${now.getFullYear()}-${mo}`;
  document.getElementById('zk-label').value='All';
  document.getElementById('zk-account').value='All';
  const zkp=document.getElementById('zk-penerima');if(zkp)zkp.value='';
  calcZakatPreview();
  openModal('modal-zakat');
}
function markZakatPaid(id){
  const z=DB.zakats?.find(x=>x.id===id);
  if(!z||z.status==='Paid')return;
  const now=new Date().toISOString();
  z.status='Paid';
  z.paidAt=now;
  // Log expense transaction
  const txId=DB.nextId.tx||1;
  const monthLabel=z.period;
  if(!DB.transactions)DB.transactions=[];
  DB.transactions.push({
    id:txId,type:'Expense',
    description:`Zakat — ${monthLabel}`,
    amount:z.zakatAmount,
    category:'Zakat',
    bank:z.account!=='All'?z.account:'',
    division:z.label!=='All'?z.label:'studio',
    date:now.slice(0,10),
    notes:`Auto-logged from Zakat record #${id}`,
    createdAt:now,
  });
  z.transactionId=txId;
  DB.nextId.tx=(DB.nextId.tx||1)+1;
  addFinanceLog('Paid','Zakat',`Period ${z.period} — ${z.label} (${z.penerima||'—'})`,z.zakatAmount);
  saveDBFn();
  renderPage(_currentPage);
}

let _stmtPeriods=[
  {label:'This Week',start:()=>{const n=new Date();n.setDate(n.getDate()-n.getDay());n.setHours(0,0,0,0);return n;}},
  {label:'This Month',start:()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),1);}},
  {label:'This Quarter',start:()=>{const n=new Date();return new Date(n.getFullYear(),Math.floor(n.getMonth()/3)*3,1);}},
  {label:'This Year',start:()=>{return new Date(new Date().getFullYear(),0,1);}},
  {label:'All Time',start:()=>null}
];
function renderStatement(idx){
  document.querySelectorAll('[id^="stmt-btn-"]').forEach((b,i)=>{b.style.borderColor=i===idx?'var(--accent)':'';b.style.color=i===idx?'var(--accent)':'';});
  const start=_stmtPeriods[idx].start();
  const label=_stmtPeriods[idx].label;
  const txs=start?DB.transactions.filter(t=>t.date&&new Date(t.date)>=start):DB.transactions.filter(t=>t.date);
  const incomeAmt=txs.filter(t=>t.type==='Income').reduce((s,t)=>s+t.amount,0);
  const expenseAmt=txs.filter(t=>t.type==='Expense').reduce((s,t)=>s+t.amount,0);
  const net=incomeAmt-expenseAmt;
  const catMap={};txs.forEach(t=>{if(!catMap[t.division])catMap[t.division]={in:0,out:0};catMap[t.division][t.type==='Income'?'in':'out']+=t.amount;});
  // Income by category
  const incCat={};txs.filter(t=>t.type==='Income').forEach(t=>{const c=t.category||'—';incCat[c]=(incCat[c]||0)+t.amount;});
  const expCat={};txs.filter(t=>t.type==='Expense').forEach(t=>{const c=t.category||'—';expCat[c]=(expCat[c]||0)+t.amount;});
  // Top sources
  const topIncomeCat=Object.entries(incCat).sort((a,b)=>b[1]-a[1])[0];
  const topExpenseCat=Object.entries(expCat).sort((a,b)=>b[1]-a[1])[0];
  const topIncomeDiv=Object.entries(catMap).filter(([k,v])=>v.in>0).sort((a,b)=>b[1].in-a[1].in)[0];
  const topExpenseDiv=Object.entries(catMap).filter(([k,v])=>v.out>0).sort((a,b)=>b[1].out-a[1].out)[0];
  const hasIncome=incomeAmt>0, hasExpense=expenseAmt>0;
  const wrap=document.getElementById('stmt-content');
  wrap.innerHTML=`
    <div class="panel">
      <div class="pnh" style="display:flex;justify-content:space-between;align-items:center"><span class="pnt">📊 Financial Statement — ${label}</span><button class="btn btn-xs" onclick="exportStmtPDF(${idx})">📄 Export PDF</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
        <div style="background:var(--gbg);border:1px solid rgba(34,197,94,.15);border-radius:8px;padding:12px;text-align:center"><div style="font-size:9px;color:var(--text3);margin-bottom:4px">TOTAL INCOME</div><div style="font-size:20px;font-weight:700;color:var(--green)">${rp(incomeAmt)}</div></div>
        <div style="background:var(--rbg);border:1px solid rgba(240,68,68,.15);border-radius:8px;padding:12px;text-align:center"><div style="font-size:9px;color:var(--text3);margin-bottom:4px">TOTAL EXPENSE</div><div style="font-size:20px;font-weight:700;color:var(--red)">${rp(expenseAmt)}</div></div>
        <div style="background:${net>=0?'var(--gbg)':'var(--rbg)'};border:1px solid ${net>=0?'rgba(34,197,94,.15)':'rgba(240,68,68,.15)'};border-radius:8px;padding:12px;text-align:center"><div style="font-size:9px;color:var(--text3);margin-bottom:4px">NET PROFIT</div><div style="font-size:20px;font-weight:700;color:${net>=0?'var(--green)':'var(--red)'}">${rp(net)}</div></div>
      </div>
      ${hasIncome||hasExpense?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px">
          <div style="font-size:10px;font-weight:600;color:var(--green);text-transform:uppercase;margin-bottom:8px">↑ Most Income From</div>
          ${topIncomeDiv?`<div style="font-size:13px;font-weight:700;margin-bottom:4px">${topIncomeDiv[0]}</div><div style="font-size:18px;font-weight:700;color:var(--green)">${rp(topIncomeDiv[1].in)}</div><div style="font-size:9px;color:var(--text3);margin-top:4px">${topIncomeDiv[1].in>0?Math.round(topIncomeDiv[1].in/incomeAmt*100)+'% of total income':''}</div>`:'<div class="empty" style="padding:8px">No income</div>'}
          ${topIncomeCat?`<div style="border-top:1px solid var(--border);margin-top:10px;padding-top:8px;font-size:9px;color:var(--text3)">Top category: ${topIncomeCat[0]} (${rp(topIncomeCat[1])})</div>`:''}
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px">
          <div style="font-size:10px;font-weight:600;color:var(--red);text-transform:uppercase;margin-bottom:8px">↓ Most Expense To</div>
          ${topExpenseDiv?`<div style="font-size:13px;font-weight:700;margin-bottom:4px">${topExpenseDiv[0]}</div><div style="font-size:18px;font-weight:700;color:var(--red)">${rp(topExpenseDiv[1].out)}</div><div style="font-size:9px;color:var(--text3);margin-top:4px">${topExpenseDiv[1].out>0?Math.round(topExpenseDiv[1].out/expenseAmt*100)+'% of total expense':''}</div>`:'<div class="empty" style="padding:8px">No expense</div>'}
          ${topExpenseCat?`<div style="border-top:1px solid var(--border);margin-top:10px;padding-top:8px;font-size:9px;color:var(--text3)">Top category: ${topExpenseCat[0]} (${rp(topExpenseCat[1])})</div>`:''}
        </div>
      </div>`:''}
      ${hasIncome?`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px">
        <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Income by Category</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${Object.entries(incCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div style="background:var(--gbg);border-radius:6px;padding:4px 10px;font-size:10px"><span style="color:var(--text3)">${c}</span> <span style="color:var(--green);font-weight:600">${rp(v)}</span></div>`).join('')}</div>
      </div>`:''}
      ${hasExpense?`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px">
        <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Expense by Category</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${Object.entries(expCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div style="background:var(--rbg);border-radius:6px;padding:4px 10px;font-size:10px"><span style="color:var(--text3)">${c}</span> <span style="color:var(--red);font-weight:600">${rp(v)}</span></div>`).join('')}</div>
      </div>`:''}
      <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Breakdown by Division</div>
      ${Object.entries(catMap).map(([div,v])=>`<div class="lr"><div style="font-size:11px;font-weight:500">${div}</div><div style="display:flex;gap:16px"><span style="color:var(--green);font-size:11px">+${rp(v.in)}</span><span style="color:var(--red);font-size:11px">−${rp(v.out)}</span><span style="font-weight:600;font-size:11px;color:${v.in-v.out>=0?'var(--green)':'var(--red)'}">${rp(v.in-v.out)}</span></div></div>`).join('')||'<div class="empty" style="padding:12px">No transactions in this period.</div>'}
      <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px">
        <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Bank Account Summary</div>
        ${(DB.bankAccounts||[]).map(a=>`<div class="lr"><div><div style="font-size:11px;font-weight:500">${a.name}</div><div style="font-size:10px;color:var(--text3)">${a.owner}</div></div><div style="font-size:14px;font-weight:700;color:${BANK_COLORS[a.id]||'var(--text)'}">${rp(bankBalance(a.id))}</div></div>`).join('')}
      </div>
    </div>`;
}
function exportStmtPDF(idx){
  const period=_stmtPeriods[idx];
  const start=period.start();
  const label=period.label;
  const txs=start?DB.transactions.filter(t=>t.date&&new Date(t.date)>=start):DB.transactions.filter(t=>t.date);
  const incomeAmt=txs.filter(t=>t.type==='Income').reduce((s,t)=>s+t.amount,0);
  const expenseAmt=txs.filter(t=>t.type==='Expense').reduce((s,t)=>s+t.amount,0);
  const net=incomeAmt-expenseAmt;
  const catMap={};txs.forEach(t=>{if(!catMap[t.division])catMap[t.division]={in:0,out:0};catMap[t.division][t.type==='Income'?'in':'out']+=t.amount;});
  const incCat={};txs.filter(t=>t.type==='Income').forEach(t=>{const c=t.category||'—';incCat[c]=(incCat[c]||0)+t.amount;});
  const expCat={};txs.filter(t=>t.type==='Expense').forEach(t=>{const c=t.category||'—';expCat[c]=(expCat[c]||0)+t.amount;});
  const topIncomeCat=Object.entries(incCat).sort((a,b)=>b[1]-a[1])[0];
  const topExpenseCat=Object.entries(expCat).sort((a,b)=>b[1]-a[1])[0];
  const topIncomeDiv=Object.entries(catMap).filter(([k,v])=>v.in>0).sort((a,b)=>b[1].in-a[1].in)[0];
  const topExpenseDiv=Object.entries(catMap).filter(([k,v])=>v.out>0).sort((a,b)=>b[1].out-a[1].out)[0];
  const today=new Date().toISOString().slice(0,10);
  const divRows=Object.entries(catMap).sort((a,b)=>(b[1].in-b[1].out)-(a[1].in-a[1].out)).map(([d,v])=>`<tr><td>${d}</td><td style="color:#22c55e">+${rp(v.in)}</td><td style="color:#ef4444">-${rp(v.out)}</td><td style="font-weight:600;color:${v.in-v.out>=0?'#22c55e':'#ef4444'}">${rp(v.in-v.out)}</td></tr>`).join('');
  const incRows=Object.entries(incCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<tr><td>${c}</td><td style="color:#22c55e">${rp(v)}</td><td style="color:#888">${incomeAmt?Math.round(v/incomeAmt*100)+'%':''}</td></tr>`).join('');
  const expRows=Object.entries(expCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<tr><td>${c}</td><td style="color:#ef4444">${rp(v)}</td><td style="color:#888">${expenseAmt?Math.round(v/expenseAmt*100)+'%':''}</td></tr>`).join('');
  const bankRows=(DB.bankAccounts||[]).map(a=>`<tr><td>${a.name}</td><td>${a.owner}</td><td style="font-weight:700">${rp(bankBalance(a.id))}</td></tr>`).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Financial Statement - ${label}</title>
    <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:40px;color:#1a1a1a;background:#fff;line-height:1.5}
      h1{font-size:24px;margin-bottom:4px}h2{font-size:16px;color:#666;margin-top:24px;margin-bottom:12px;border-bottom:2px solid #22c55e;padding-bottom:4px}
      .summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:20px 0}
      .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center}
      .card-num{font-size:24px;font-weight:700}.green{color:#22c55e}.red{color:#ef4444}
      h3{font-size:14px;color:#333;margin:20px 0 8px;text-transform:uppercase;letter-spacing:.05em}
      table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #e2e8f0}th{background:#f1f5f9;font-size:11px;text-transform:uppercase;color:#666}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
      .meta{font-size:11px;color:#888;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px}
      @media print{@page{size:A4;margin:20mm}}</style></head>
    <body><h1>Financial Statement</h1><p style="color:#666">Period: ${label} | Generated: ${today}</p>
    <div class="summary">
      <div class="card"><div style="font-size:11px;color:#666;margin-bottom:4px">TOTAL INCOME</div><div class="card-num green">${rp(incomeAmt)}</div></div>
      <div class="card"><div style="font-size:11px;color:#666;margin-bottom:4px">TOTAL EXPENSE</div><div class="card-num red">${rp(expenseAmt)}</div></div>
      <div class="card"><div style="font-size:11px;color:#666;margin-bottom:4px">NET PROFIT</div><div class="card-num ${net>=0?'green':'red'}">${rp(net)}</div></div>
    </div>
    ${(topIncomeDiv||topExpenseDiv)?`<h2 style="border-color:#22c55e">Key Insights</h2><div class="two-col">
      <div><div style="font-size:12px;font-weight:600;color:#22c55e;margin-bottom:8px">Top Income Source</div>${topIncomeDiv?`<div style="font-size:16px;font-weight:700">${topIncomeDiv[0]}</div><div class="green" style="font-size:20px;font-weight:700">${rp(topIncomeDiv[1].in)}</div><div style="font-size:12px;color:#888">${incomeAmt?Math.round(topIncomeDiv[1].in/incomeAmt*100)+'% of total income':''}</div>`:'<div style="color:#888">No income</div>'}</div>
      <div><div style="font-size:12px;font-weight:600;color:#ef4444;margin-bottom:8px">Top Expense Target</div>${topExpenseDiv?`<div style="font-size:16px;font-weight:700">${topExpenseDiv[0]}</div><div class="red" style="font-size:20px;font-weight:700">${rp(topExpenseDiv[1].out)}</div><div style="font-size:12px;color:#888">${expenseAmt?Math.round(topExpenseDiv[1].out/expenseAmt*100)+'% of total expense':''}</div>`:'<div style="color:#888">No expense</div>'}</div>
    </div>`:''}
    ${incomeAmt>0?`<h2>Income Breakdown by Category</h2><table><thead><tr><th>Category</th><th>Amount</th><th>%</th></tr></thead><tbody>${incRows}</tbody></table>`:''}
    ${expenseAmt>0?`<h2>Expense Breakdown by Category</h2><table><thead><tr><th>Category</th><th>Amount</th><th>%</th></tr></thead><tbody>${expRows}</tbody></table>`:''}
    <h2>Breakdown by Division</h2><table><thead><tr><th>Division</th><th>Income</th><th>Expense</th><th>Net</th></tr></thead><tbody>${divRows}</tbody></table>
    ${bankRows?`<h2>Bank Account Balances</h2><table><thead><tr><th>Account</th><th>Owner</th><th>Balance</th></tr></thead><tbody>${bankRows}</tbody></table>`:''}
    <div class="meta"><p>House of EXP - Studio Management System | Generated ${new Date().toLocaleString()}</p></div>
    </body></html>`;
  const win=window.open('','_blank');win.document.write(html);win.document.close();win.print();
}
function openEditTransaction(id){
  const t=DB.transactions.find(x=>x.id===id);if(!t)return;
  document.getElementById('etx-id').value=id;
  setRTEValue('etx-desc',t.description||'');
  const etxEl=document.getElementById('etx-amount');etxEl.dataset.raw=String(t.amount);etxEl.value=parseFloat(t.amount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  document.getElementById('etx-type').value=t.type;
  document.getElementById('etx-cat').value=t.category;
  document.getElementById('etx-div').value=t.division;
  document.getElementById('etx-bank').value=t.bank||'';
  document.getElementById('etx-date').value=t.date;
  openModal('modal-edit-transaction');
}
function updateTransaction(){
  const id=parseInt(document.getElementById('etx-id').value);
  const t=DB.transactions.find(x=>x.id===id);if(!t)return;
  const oldDesc=t.description;
  t.description=document.getElementById('etx-desc').value.trim()||t.description;
  t.amount=getAmtVal('etx-amount')||t.amount;
  t.type=document.getElementById('etx-type').value;
  t.category=document.getElementById('etx-cat').value;
  t.division=document.getElementById('etx-div').value;
  t.bank=document.getElementById('etx-bank').value||t.bank;
  t.date=document.getElementById('etx-date').value;
  addFinanceLog('Edited','Transaction',`${oldDesc} → ${t.description}`,t.amount);addActivityLog('Transaction','Edited',`${oldDesc} → ${t.description}`,'finance');
  closeModal('modal-edit-transaction');saveDBFn();renderPage(_currentPage);
}
function openAccountBalloon(txId,el){
  // Remove any existing balloon
  const existing=document.getElementById('acct-balloon');
  if(existing){existing.remove();if(existing._txId===txId)return;}
  const t=DB.transactions.find(x=>x.id===txId);if(!t)return;
  const accounts=DB.bankAccounts||[];
  const balloon=document.createElement('div');
  balloon._txId=txId;
  balloon.id='acct-balloon';
  balloon.style.cssText='position:fixed;z-index:9999;background:var(--bg2);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.35);padding:12px 14px;min-width:180px';
  balloon.innerHTML=`
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:8px;font-weight:600">Change Account</div>
    <select id="acct-balloon-sel" class="fi" style="width:100%;padding:5px 8px;font-size:12px">
      <option value="">— None —</option>
      ${accounts.map(a=>`<option value="${a.id}" ${t.bank===a.id?'selected':''}>${a.name}</option>`).join('')}
    </select>
    <div style="display:flex;gap:6px;margin-top:10px;justify-content:flex-end">
      <button class="btn-o btn-xs" style="font-size:11px" onclick="document.getElementById('acct-balloon').remove()">Cancel</button>
      <button class="btn btn-xs" style="font-size:11px" onclick="saveAccountBalloon(${txId})">Save</button>
    </div>`;
  // Position balloon near the clicked element
  const rect=el.getBoundingClientRect();
  const top=Math.min(rect.bottom+4, window.innerHeight-160);
  const left=Math.min(rect.left, window.innerWidth-200);
  balloon.style.top=top+'px';
  balloon.style.left=left+'px';
  document.body.appendChild(balloon);
  // Close on outside click
  setTimeout(()=>{
    function outsideClick(e){if(!balloon.contains(e.target)&&e.target!==el){balloon.remove();document.removeEventListener('mousedown',outsideClick);}}
    document.addEventListener('mousedown',outsideClick);
  },0);
}
function saveAccountBalloon(txId){
  const t=DB.transactions.find(x=>x.id===txId);if(!t)return;
  const sel=document.getElementById('acct-balloon-sel');if(!sel)return;
  const oldBank=t.bank;
  t.bank=sel.value||'';
  addFinanceLog('Account Changed','Transaction',`${t.description} — ${oldBank||'none'} → ${t.bank||'none'}`,t.amount);
  document.getElementById('acct-balloon')?.remove();
  saveDBFn();renderFinance();
}
function deleteTransaction(id){
  if(!confirm('Delete this transaction?'))return;
  const t=DB.transactions.find(x=>x.id===id);
  if(t){addFinanceLog('Deleted','Transaction',`${t.description} (${t.type})`,t.amount);addActivityLog('Transaction','Deleted',`${t.description} (${t.type})`,'finance');}
  DB.transactions=DB.transactions.filter(x=>x.id!==id);
  saveDBFn();renderFinance();
}
