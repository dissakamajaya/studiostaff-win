// ════════ SIDEBAR ════════
const NAV_ITEMS=[
  {grp:'Home',items:[
    {id:'__update__',label:'Update',action:'requestAppUpdate()',icon:'↻'},
    {id:'today',label:'Today',svg:'<rect x="1" y="1.5" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M7 4v3M7 4L9 5.5M7 4L5 5.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="9" r="1" fill="currentColor"/>'},
    {id:'dashboard',label:'Dashboard',svg:'<rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".7"/><rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".7"/><rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".7"/><rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".7"/>'},
    {id:'calendar',label:'Calendar',svg:'<rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M1 5.5h12M4 1v2M10 1v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'},
    {id:'journal',label:'Journal',svg:'<rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/><rect x="2" y="1" width="2.5" height="12" rx="1" fill="currentColor" opacity=".35"/><path d="M6 4h4M6 6.5h4M6 9h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'}
  ]},
  {grp:'Divisions',items:[
    {id:'studio',label:'Studio',svg:'<circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.3" fill="none"/><circle cx="7" cy="7" r="2" fill="currentColor"/>'},
    {id:'rental',label:'Rental',svg:'<path d="M2 4h10M2 7h10M2 10h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>'},
    {id:'academy',label:'Academy',svg:'<path d="M7 2L1 5l6 3 6-3-6-3zM1 9l6 3 6-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'},
    {id:'merch',label:'Merchandise',svg:'<rect x="1" y="5" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M4 5V4a3 3 0 016 0v1" stroke="currentColor" stroke-width="1.3" fill="none"/>'}
  ]},
  {grp:'Operations',items:[
    {id:'domestic',label:'Domestic',svg:'<path d="M1 12V5l6-4 6 4v7H1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" fill="none"/>'},
    {id:'finance',label:'Finance',svg:'<rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M1 6h12" stroke="currentColor" stroke-width="1.3"/>'},
    {id:'invoices',label:'Invoice Builder',svg:'<circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M7 3.5v1M7 9.5v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M5.5 8.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S8 7 7 7s-1.5-.67-1.5-1.5S6.17 4 7 4s1.5.67 1.5 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>'},
    {id:'docs',label:'Docs',svg:'<rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M5 4h4M5 7h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'}
  ]},
  {grp:'External',items:[{id:'portal',label:'Client Portal',svg:'<circle cx="7" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M1 13c0-3 2.5-4.5 6-4.5S13 10 13 13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>'}]},
  {grp:'System',items:[
    {id:'database',label:'Database',svg:'<ellipse cx="7" cy="3.5" rx="5" ry="2" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M2 3.5v3c0 1.1 2.2 2 5 2s5-.9 5-2v-3" stroke="currentColor" stroke-width="1.3"/><path d="M2 6.5v3c0 1.1 2.2 2 5 2s5-.9 5-2v-3" stroke="currentColor" stroke-width="1.3"/>'},
    {id:'walog',label:'WA Log',svg:'<path d="M11 2H3a1 1 0 00-1 1v7a1 1 0 001 1h1v2l2-2h5a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M5 5h4M5 7.5h2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'},
    {id:'settings',label:'Settings',svg:'<circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.9 2.9l1.4 1.4M9.7 9.7l1.4 1.4M2.9 11.1l1.4-1.4M9.7 4.3l1.4-1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'}
  ]}
];
let sbCollapsed=false;
const TASK_STATUS_TODO='To Do';
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
function getSidebarBadgeCounts(){
  const byUser=n=>n.userId===currentUser;
  const isUnread=n=>!n.read && _isImportantNotification(n);
  const unreadNotifs=DB.notifications.filter(n=>byUser(n)&&isUnread(n));
  const myJournal=unreadNotifs.filter(n=>n.type==='journal').length;
  const myStudioTasks=DB.tasks.filter(t=>t.assignee===currentUser&&t.status===TASK_STATUS_TODO).length;
  const myDomesticTasks=DB.domestics.filter(t=>t.assignee===currentUser&&t.status===TASK_STATUS_TODO).length;
  const awaitingApprovals=DB.invoices.filter(i=>i.status==='Awaiting Approval'&&i.createdBy!==currentUser).length;
  return {
    dashboard: unreadNotifs.length,
    journal: myJournal,
    studio: myStudioTasks,
    domestic: myDomesticTasks,
    invoices: awaitingApprovals
  };
}
function toggleSidebarCollapse(){
  sbCollapsed=!sbCollapsed;
  document.getElementById('sidebar').classList.toggle('sb-col',sbCollapsed);
  const btn=document.getElementById('sb-toggle-btn');
  if(btn)btn.innerHTML=sbCollapsed?'<span style="font-size:14px">›</span><span class="si-label" style="font-size:9px;opacity:.7">Expand</span>':'<span style="font-size:14px">‹</span><span class="si-label" style="font-size:9px;opacity:.7">Collapse</span>';
  localStorage.setItem('sb-col',sbCollapsed?'1':'');
}

function renderSidebar(){
  const u=USERS.find(u=>u.id===currentUser)||{name:'User',color:'#888'};
  const badgeCounts=getSidebarBadgeCounts();
  let html=`<div class="slogo"><img src="/favico-exp.png" style="width:32px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0"><div><div class="slogo-name">STUDIOSTAFF®</div><div class="slogo-sub">${u.name} · House of EXP</div></div></div>`;
  NAV_ITEMS.forEach(g=>{
    html+=`<div class="sg"><div class="sgl">${g.grp}</div>`;
    let balloonItems='';
    g.items.forEach(item=>{
      if(item.action){
        html+=`<button class="si si-action" onclick="${item.action}" title="${item.label}"><span class="si-ic" style="font-size:13px;line-height:1">${item.icon}</span><span class="si-label">${item.label}</span></button>`;
        balloonItems+=`<button class="si-balloon-item" onclick="${item.action}"><span class="si-ic" style="font-size:13px;line-height:1">${item.icon}</span><span>${item.label}</span></button>`;
        return;
      }
      const badgeCount=badgeCounts[item.id]||0;
      const badge=badgeCount>0?`<span class="si-badge">${badgeCount}</span>`:'';
      html+=`<button class="si" data-nav="${item.id}" onclick="nav('${item.id}')" title="${item.label}"><svg class="si-ic" viewBox="0 0 14 14" fill="none">${item.svg}</svg><span class="si-label">${item.label}</span>${badge}</button>`;
      balloonItems+=`<button class="si-balloon-item" onclick="nav('${item.id}')"><svg class="si-ic" viewBox="0 0 14 14" fill="none">${item.svg}</svg><span>${item.label}</span>${badge}</button>`;
    });
    html+=`<div class="sg-balloon"><div class="sg-balloon-grp">${g.grp}</div>${balloonItems}</div>`;
    html+=`</div>`;
  });
  html+=`<div class="sbottom"><div class="s-user"><div class="s-user-av" style="background:${u.color}22;color:${u.color}">${u.name[0]}</div><div class="s-uname"><div style="font-size:11px;font-weight:500;color:var(--text)">${u.name}</div><div style="font-size:9px;color:var(--green)">● Online</div></div></div><button class="s-logout" onclick="logout()" title="Sign Out">↪ <span class="s-logout-txt">Sign Out</span></button></div>`;
  html+=`<button class="sb-toggle" id="sb-toggle-btn" onclick="toggleSidebarCollapse()" title="Toggle sidebar">${sbCollapsed?'<span style="font-size:14px">›</span><span class="si-label" style="font-size:9px;opacity:.7">Expand</span>':'<span style="font-size:14px">‹</span><span class="si-label" style="font-size:9px;opacity:.7">Collapse</span>'}</button>`;
  document.getElementById('sidebar').innerHTML=html;
  if(sbCollapsed)document.getElementById('sidebar').classList.add('sb-col');
}

function renderTopbar(){
  const d=new Date();
  const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('today-date').textContent=`${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  updateNotifCount();
}

// ════════ MOBILE SIDEBAR ════════
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ════════ NAVIGATION ════════
let _currentPage='dashboard';
function nav(pg){
  let notificationsMarkedAsRead=false;
  const markByType=function(types){
    const targetNotifs=DB.notifications.filter(n=>n.userId===currentUser&&!n.read&&types.includes(n.type));
    targetNotifs.forEach(n=>{n.read=true;});
    if(targetNotifs.length)notificationsMarkedAsRead=true;
  };
  if(pg==='journal')markByType(['journal']);
  if(pg==='studio')markByType(['task']);
  if(pg==='domestic')markByType(['domestic']);
  if(pg==='invoices')markByType(['quote','invoice','reminder']);
  if(notificationsMarkedAsRead){saveDBFn();updateNotifCount();}

  _currentPage=pg;
  // Update URL hash — but don't trigger a hashchange loop
  if(window.location.hash!=='#'+pg){
    history.replaceState(null,'','#'+pg);
  }
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  const el=document.getElementById('pg-'+pg);if(el)el.classList.add('on');
  document.querySelectorAll('.si').forEach(s=>s.classList.toggle('on',s.dataset.nav===pg));
  const labels={dashboard:'Home Dashboard',studio:'Studio',rental:'Rental',academy:'Academy',merch:'Merchandise',domestic:'Domestic',finance:'Finance',invoices:'Invoice Builder',docs:'Docs',portal:'Client Portal',database:'Database',settings:'Setting/Auth',calendar:'Calendar',journal:'Journal',walog:'WhatsApp Log',revision:'Feedback Board',today:'Today'};
  document.getElementById('bc-text').textContent=labels[pg]||pg;
  closeSidebar(); // close on mobile nav
  // restore page after update-reload
  const _returnPage=sessionStorage.getItem('ss-return-page');
  if(_returnPage&&_returnPage!==pg){sessionStorage.removeItem('ss-return-page');nav(_returnPage);return;}
  renderPage(pg);
}

function renderPage(pg){
  const fns={today:renderToday,dashboard:renderDash,database:renderClients,studio:renderStudio,rental:renderRentals,invoices:()=>renderInvoices(),portal:renderPortalSel,finance:renderFinance,domestic:renderDomestics,academy:renderAcademy,merch:renderMerch,docs:renderDocs,calendar:renderCalendar,settings:renderSettings,journal:renderJournal,walog:renderWALog,revision:renderRevisionBoard};
  if(fns[pg]){try{const r=fns[pg]();if(r&&typeof r.catch==='function')r.catch(function(e){console.error('[renderPage] '+pg+' error:',e);});}catch(e){console.error('[renderPage] '+pg+' error:',e);}}
}

// ════════ TOAST NOTIFICATIONS ════════
(function(){
  var _toastContainer=null;
  function _getContainer(){
    if(_toastContainer&&document.body.contains(_toastContainer))return _toastContainer;
    _toastContainer=document.createElement('div');
    _toastContainer.id='toast-container';
    _toastContainer.style.cssText='position:fixed;bottom:24px;right:20px;z-index:9990;display:flex;flex-direction:column-reverse;gap:8px;pointer-events:none';
    document.body.appendChild(_toastContainer);
    return _toastContainer;
  }
  window.showToast=function(message,type){
    var accent=type==='success'?'#22c55e':type==='error'?'#ef4444':type==='warning'?'#f59e0b':'#a78bfa';
    var toast=document.createElement('div');
    toast.style.cssText='background:#1e1a2e;border:1px solid '+accent+';color:#e2e8f0;font-size:12px;padding:10px 14px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.4);display:flex;align-items:center;gap:10px;min-width:220px;max-width:320px;pointer-events:all;cursor:pointer;transition:opacity .3s ease;border-left:3px solid '+accent;
    var dot=document.createElement('div');
    dot.style.cssText='width:7px;height:7px;border-radius:50%;background:'+accent+';flex-shrink:0';
    var txt=document.createElement('span');
    txt.style.cssText='flex:1;line-height:1.4';
    txt.textContent=message;
    var close=document.createElement('span');
    close.textContent='✕';
    close.style.cssText='color:#64748b;font-size:10px;flex-shrink:0';
    toast.appendChild(dot);toast.appendChild(txt);toast.appendChild(close);
    _getContainer().appendChild(toast);
    function dismiss(){
      toast.style.opacity='0';
      setTimeout(function(){if(toast.parentNode)toast.parentNode.removeChild(toast);},320);
    }
    toast.addEventListener('click',dismiss);
    setTimeout(dismiss,4500);
  };
}());

// ════════ RICH TEXT EDITOR HELPERS ════════
function setRTEValue(id,content){
  const body=document.getElementById(id+'-rte');
  const hidden=document.getElementById(id);
  if(body)body.innerHTML=content||'';
  if(hidden)hidden.value=content||'';
}
function clearRTE(id){
  const body=document.getElementById(id+'-rte');
  const hidden=document.getElementById(id);
  if(body)body.innerHTML='';
  if(hidden)hidden.value='';
}
function rteInsertLink(rteId){
  const url=prompt('Enter URL (e.g. https://example.com):');
  if(!url)return;
  const body=document.getElementById(rteId+'-rte');
  if(body)body.focus();
  document.execCommand('createLink',false,url);
  // Make links open in new tab
  if(body){body.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';});}
  const hidden=document.getElementById(rteId);
  if(hidden&&body)hidden.value=body.innerHTML;
}
function rteInsertBullet(rteId){
  const body=document.getElementById(rteId+'-rte');
  if(body)body.focus();
  document.execCommand('insertUnorderedList',false,null);
  const hidden=document.getElementById(rteId);
  if(hidden&&body)hidden.value=body.innerHTML;
}
// Auto-inject link button into all .rte-bar elements (global RTE enhancement)
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('.rte-bar').forEach(function(bar){
    if(bar.querySelector('[data-rte-link]'))return;
    const rteBody=bar.nextElementSibling;
    const linkBtn=document.createElement('button');
    linkBtn.type='button';linkBtn.className='rte-btn';
    linkBtn.setAttribute('data-rte-link','1');linkBtn.title='Insert Link';
    linkBtn.innerHTML='🔗';
    linkBtn.onmousedown=function(e){
      e.preventDefault();
      const url=prompt('Enter URL (e.g. https://example.com):');
      if(!url)return;
      if(rteBody)rteBody.focus();
      document.execCommand('createLink',false,url);
      if(rteBody)rteBody.querySelectorAll('a').forEach(function(a){a.target='_blank';a.rel='noopener noreferrer';});
      const hidden=rteBody?document.getElementById(rteBody.dataset.target):null;
      if(hidden&&rteBody)hidden.value=rteBody.innerHTML;
    };
    bar.appendChild(linkBtn);
  });
});
document.addEventListener('input',function(e){
  const t=e.target;
  if(t.contentEditable==='true'&&t.dataset&&t.dataset.target){
    const h=document.getElementById(t.dataset.target);
    if(h)h.value=(t.innerText.trim()==='')?'':t.innerHTML;
  }
},true);
