// ════════ RENDER: DASHBOARD ════════
let dashTab=0;
function switchDashTab(el,idx){dashTab=idx;document.querySelectorAll('#dash-tabs .tab').forEach((t,i)=>t.classList.toggle('on',i===idx));renderDashContent()}
function openStudioRevisionFromDashboard(){
  nav('studio');
  setTimeout(() => { switchStudioTab(null, 3); }, 0);
}

function _dashDateValue(row){
  return row.date||row.tx_date||row.paidAt||row.createdAt||row.due||row.deadline||row.dueDate||'';
}
function _dashInMonth(value,date){
  if(!value)return false;
  const d=new Date(value);
  return !Number.isNaN(d.getTime())&&d.getFullYear()===date.getFullYear()&&d.getMonth()===date.getMonth();
}
function _dashMonthLabel(date){
  return date.toLocaleDateString('id-ID',{month:'short'});
}
function _dashStatusRank(status){
  const s=(status||'To Do').toLowerCase();
  if(s==='done'||s==='completed'||s==='paid')return 2;
  if(s==='in progress'||s==='ongoing'||s==='active')return 1;
  return 0;
}
function _dashPriorityRank(priority){
  const p=(priority||'normal').toLowerCase();
  return {urgent:0,high:1,medium:2,normal:3,low:4}[p]??3;
}
function _dashStatusLabel(status){
  const rank=_dashStatusRank(status);
  return rank===2?'Done':rank===1?'Ongoing':'To Do';
}
function _dashTopMoneyItems(rows,count){
  return rows.slice().sort((a,b)=>(b.amount||b.total||0)-(a.amount||a.total||0)).slice(0,count);
}
function _dashMoneyList(rows,emptyText,color){
  if(!rows.length)return `<div class="dash-empty-line">${emptyText}</div>`;
  return rows.map(r=>`<div class="dash-money-row"><span>${r.description||r.title||r.category||(typeof getInvNum==='function'?getInvNum(r):'Untitled')}</span><strong style="color:${color}">${rp(r.amount||r.total||0)}</strong></div>`).join('');
}
function _dashGalonNeeds(){
  return DB.galonStatus?.status==='needs_replacement';
}

function renderDash(){
  const u=USERS.find(u=>u.id===currentUser)||{name:'User'};
  const hr=new Date().getHours();
  const greet=`${hr<12?'Good morning':hr<17?'Good afternoon':'Good evening'}, ${u.name}`;
  document.getElementById('dash-greeting').textContent=greet;
  document.querySelector('#pg-dashboard .ps').textContent='Today at a glance: approvals, cash flow, tasks, and monthly income rhythm.';
  renderDashContent();
}

function renderDashContent(){
  const wrap=document.getElementById('dash-tab-content');
  const stats=document.getElementById('dash-stats');
  const upcoming=document.getElementById('dash-upcoming');
  const tabs=document.getElementById('dash-tabs');
  const assigned=document.getElementById('dash-assigned-alert');
  if(tabs)tabs.style.display='none';
  if(upcoming)upcoming.innerHTML='';
  if(assigned)assigned.innerHTML='';

  const now=new Date();
  const thisYear=now.getFullYear();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const nextMonth=new Date(now.getFullYear(),now.getMonth()+1,1);
  const isThisMonth=d=>_dashInMonth(d,now);

  const quotesAwaiting=(DB.invoices||[]).filter(i=>i.type==='quote'&&i.status==='Awaiting Approval');
  const reimburseAwaiting=(DB.reimbursements||[]).filter(r=>['Pending','Awaiting Approval','Submitted'].includes(r.status||'Pending'));
  const leaveAwaiting=(DB.leaveNotices||[]).filter(l=>['Pending','Awaiting Approval'].includes(l.status||'Pending'));
  const galonNeeds=_dashGalonNeeds();
  const invoiceAwaiting=(DB.invoices||[]).filter(i=>i.type==='invoice'&&i.status==='Awaiting Approval');

  const quoteProjection=(DB.invoices||[])
    .filter(i=>i.type==='quote'&&['Awaiting Approval','Approved','Accepted'].includes(i.status)&&isThisMonth(i.due||i.createdAt))
    .reduce((s,i)=>s+(i.total||0),0);
  const expectedExpense=[
    ...(DB.reimbursements||[]).filter(r=>['Pending','Awaiting Approval','Approved'].includes(r.status||'Pending')&&isThisMonth(r.createdAt||r.date)).map(r=>({description:r.description||'Reimbursement',amount:r.amount||0})),
    ...(DB.debts||[]).filter(d=>d.type==='payable'&&d.status!=='Settled'&&isThisMonth(d.due||d.createdAt)).map(d=>({description:d.description||'Payable debt',amount:d.remainingAmount!==undefined?d.remainingAmount:d.amount||0}))
  ];
  const expectedExpenseTotal=expectedExpense.reduce((s,t)=>s+t.amount,0);

  const incomeTx=(DB.transactions||[]).filter(t=>t.type==='Income'&&isThisMonth(_dashDateValue(t)));
  const paidInvoices=(DB.invoices||[]).filter(i=>i.type==='invoice'&&i.status==='Paid'&&isThisMonth(i.paidAt||i.updatedAt||i.createdAt)).map(i=>({description:typeof getInvNum==='function'?getInvNum(i):'Paid invoice',amount:i.total||0,total:i.total||0}));
  const actualIncomeRows=[...incomeTx,...paidInvoices];
  const actualIncomeTotal=actualIncomeRows.reduce((s,t)=>s+(t.amount||t.total||0),0);
  const expenseTx=(DB.transactions||[]).filter(t=>t.type==='Expense'&&isThisMonth(_dashDateValue(t)));
  const actualExpenseTotal=expenseTx.reduce((s,t)=>s+(t.amount||0),0);

  if(stats){
    stats.className='dash-approval-grid';
    stats.innerHTML=[
      {label:'Quotation',value:quotesAwaiting.length,click:"nav('invoices')",tone:'var(--blue)'},
      {label:'Reimbursement',value:reimburseAwaiting.length,click:"nav('domestic');switchDomTab(null,3)",tone:'var(--amber)'},
      {label:'Leave Notices',value:leaveAwaiting.length,click:"nav('domestic');switchDomTab(null,1)",tone:'var(--forest)'},
      {label:'Isi Galon',value:galonNeeds?'!':'Ready',note:galonNeeds?'Segera ganti galon':'Ready',click:"nav('domestic');switchDomTab(null,5)",tone:galonNeeds?'var(--red)':'var(--green)',alert:galonNeeds},
      {label:'Invoice Approval',value:invoiceAwaiting.length,click:"nav('invoices')",tone:'var(--brick)'}
    ].map(item=>`<button class="dash-approval-card ${item.alert?'alert':''}" onclick="${item.click}" style="--tone:${item.tone}">
      <span>${item.label}</span><strong>${item.value}</strong><em>${item.note||'Need approval'}</em>
    </button>`).join('');
  }

  const incomeByMonth=Array.from({length:12},(_,m)=>{
    const txTotal=(DB.transactions||[]).filter(t=>t.type==='Income'&&_dashDateValue(t)&&new Date(_dashDateValue(t)).getFullYear()===thisYear&&new Date(_dashDateValue(t)).getMonth()===m).reduce((s,t)=>s+(t.amount||0),0);
    const invTotal=(DB.invoices||[]).filter(i=>i.type==='invoice'&&i.status==='Paid'&&(i.paidAt||i.updatedAt||i.createdAt)&&new Date(i.paidAt||i.updatedAt||i.createdAt).getFullYear()===thisYear&&new Date(i.paidAt||i.updatedAt||i.createdAt).getMonth()===m).reduce((s,i)=>s+(i.total||0),0);
    return {date:new Date(thisYear,m,1),total:txTotal+invTotal};
  });
  const maxIncome=Math.max(1,...incomeByMonth.map(m=>m.total));

  const allTasks=[
    ...(DB.tasks||[]).map(t=>{const proj=DB.projects.find(p=>p.id===t.projectId);return{...t,module:'Studio',context:proj?proj.name:'No project',moduleColor:'var(--blue)'}}),
    ...(DB.domestics||[]).map(t=>({...t,title:t.name,module:'Domestic',context:'Internal',moduleColor:'var(--amber)'}))
  ].sort((a,b)=>{
    const sr=_dashStatusRank(a.status)-_dashStatusRank(b.status);
    if(sr!==0)return sr;
    const pr=_dashPriorityRank(a.priority)-_dashPriorityRank(b.priority);
    if(pr!==0)return pr;
    if(a.dueDate&&!b.dueDate)return -1;
    if(!a.dueDate&&b.dueDate)return 1;
    return new Date(a.dueDate||a.createdAt||0)-new Date(b.dueDate||b.createdAt||0);
  });

  const taskCard=t=>{
    const status=_dashStatusLabel(t.status);
    const isDone=status==='Done';
    const statusClass=status==='Done'?'pg_':status==='Ongoing'?'pb_':'pa_';
    const nextLabel=status==='To Do'?'Start':status==='Ongoing'?'Done':'Done';
    const click=t.module==='Studio'?`cycleTaskStatus(${t.id})`:`cycleDomesticStatus(${t.id})`;
    return `<article class="dash-task-card ${isDone?'done':''}">
      <div class="dash-task-top">
        <span class="dash-module" style="--module:${t.moduleColor}">${t.module}</span>
        <span class="pill ${statusClass}">${status}</span>
      </div>
      <h3>${t.title||'Untitled task'}</h3>
      <div class="dash-task-meta">
        <span><i style="background:${prioColor[t.priority]||'var(--blue)'}"></i>${t.priority||'normal'}</span>
        <span>${getUserName(t.assignee)}</span>
      </div>
      <div class="dash-task-foot">
        <span>${t.context||'No context'}</span>
        <span>${t.dueDate?fmtDate(t.dueDate):'No due date'}</span>
      </div>
      ${!isDone?`<button class="btn-o btn-xs" onclick="${click}">${nextLabel}</button>`:''}
    </article>`;
  };

  wrap.innerHTML=`
    <section class="dash-finance-grid">
      <div class="dash-money-card projection">
        <div class="dash-card-label">Income Projection This Month</div>
        <div class="dash-card-value">${rp(quoteProjection)}</div>
        <div class="dash-card-note">From active quotation amount</div>
      </div>
      <div class="dash-money-card expected">
        <div class="dash-card-label">Expected Expense This Month</div>
        <div class="dash-card-value">${rp(expectedExpenseTotal)}</div>
        <div class="dash-card-note">Pending reimbursements and payable debt</div>
      </div>
      <div class="dash-money-card income">
        <div class="dash-card-label">Actual Total Income This Month</div>
        <div class="dash-card-value">${rp(actualIncomeTotal)}</div>
        <div class="dash-money-list">${_dashMoneyList(_dashTopMoneyItems(actualIncomeRows,5),'No income logged this month.','var(--green)')}</div>
      </div>
      <div class="dash-money-card expense">
        <div class="dash-card-label">Actual Expense This Month</div>
        <div class="dash-card-value">${rp(actualExpenseTotal)}</div>
        <div class="dash-money-list">${_dashMoneyList(_dashTopMoneyItems(expenseTx,5),'No expense logged this month.','var(--red)')}</div>
      </div>
    </section>

    <section class="dash-chart-panel">
      <div class="dash-section-head">
        <div><h2>Monthly Income ${thisYear}</h2><p>Actual received income by month</p></div>
        <strong>${rp(incomeByMonth.reduce((s,m)=>s+m.total,0))}</strong>
      </div>
      <div class="dash-bar-chart">
        ${incomeByMonth.map(m=>`<div class="dash-bar-cell" title="${_dashMonthLabel(m.date)} ${rp(m.total)}">
          <div class="dash-bar-track"><div class="dash-bar" style="height:${Math.max(4,Math.round((m.total/maxIncome)*100))}%"></div></div>
          <span>${_dashMonthLabel(m.date)}</span>
        </div>`).join('')}
      </div>
    </section>

    <section class="dash-task-panel">
      <div class="dash-section-head">
        <div><h2>Task List</h2><p>Sorted To Do, ongoing, done, then by priority</p></div>
        <button class="btn btn-sm" onclick="openModal('modal-task')">+ New Task</button>
      </div>
      <div class="dash-task-grid">
        ${allTasks.length?allTasks.map(taskCard).join(''):'<div class="empty">No tasks yet.</div>'}
      </div>
    </section>`;
}
