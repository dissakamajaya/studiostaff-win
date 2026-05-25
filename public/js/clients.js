// ════════ RENDER: CLIENTS ════════
let dbFilter='all', dbGroup='none';
function setDbFilter(f){
  dbFilter=f;
  ['all','studio','booking','academy'].forEach(k=>{const el=document.getElementById('dbf-'+k);if(el){el.style.borderColor=k===f?'var(--accent)':'';el.style.color=k===f?'var(--accent)':''}});
  renderClients();
}
function setDbGroup(g){
  dbGroup=g;
  ['none','label','type'].forEach(k=>{const el=document.getElementById('dbg-'+k);if(el){el.style.borderColor=k===g?'var(--accent)':'';el.style.color=k===g?'var(--accent)':''}});
  renderClients();
}
const labelColors={Studio:'var(--accent)',Booking:'var(--green)',Academy:'var(--amber)'};
function renderClients(){
  const search=(document.getElementById('db-search')?.value||'').toLowerCase();
  let list=DB.clients.filter(c=>{
    if(dbFilter==='studio')return(c.label||'Studio')==='Studio';
    if(dbFilter==='booking')return(c.label||'Studio')==='Booking';
    if(dbFilter==='academy')return(c.label||'Studio')==='Academy';
    return true;
  }).filter(c=>!search||c.name.toLowerCase().includes(search)||(c.phone||'').toLowerCase().includes(search));
  document.getElementById('db-sub').textContent=`${list.length} of ${DB.clients.length} clients`;
  const pgList=_pgSlice(list,'dbClients');

  const makeRow=c=>{
    const projs=DB.projects.filter(p=>p.clientId===c.id).length;
    const lifetime=DB.invoices.filter(i=>i.clientId===c.id&&i.type==='invoice'&&i.status==='Paid').reduce((s,i)=>s+i.total,0);
    const lc=c.label||'Studio';
    return `<tr><td><div style="display:flex;align-items:center;gap:8px"><div class="av" style="background:${avColor(c.name)}22;color:${avColor(c.name)}">${initials(c.name)}</div><div><div style="font-size:11px;font-weight:500">${c.name}</div><div class="td-s">${c.city||c.phone||'—'}</div></div></div></td><td><select class="fi" style="padding:2px 6px;font-size:10px;width:auto;border-color:${labelColors[lc]||'var(--accent)'}44;color:${labelColors[lc]||'var(--accent)'}" onchange="setClientLabel(${c.id},this.value)"><option ${lc==='Studio'?'selected':''}>Studio</option><option ${lc==='Booking'?'selected':''}>Booking</option><option ${lc==='Academy'?'selected':''}>Academy</option></select></td><td class="tc">${c.type}</td><td class="tc">${c.relationship||'—'}</td><td style="color:var(--blue);text-align:center">${projs}</td><td style="color:var(--green)">${rp(lifetime)}</td><td><span class="pill pg_">${c.status}</span></td><td><div style="display:flex;gap:4px"><button class="btn-o btn-xs" onclick="viewClient(${c.id})">View</button><button class="btn-o btn-xs" onclick="openEditClient(${c.id})">✎</button><button class="btn btn-xs" onclick="quickProject(${c.id})">+ Proj</button><button class="btn-danger btn-xs" onclick="deleteClient(${c.id})">✕</button></div></td></tr>`;
  };
  const makeCard=c=>{
    const projs=DB.projects.filter(p=>p.clientId===c.id).length;
    const lifetime=DB.invoices.filter(i=>i.clientId===c.id&&i.type==='invoice'&&i.status==='Paid').reduce((s,i)=>s+i.total,0);
    const lc=c.label||'Studio';
    return `<div class="card-item"><div class="card-item-header"><div><div class="card-item-title" style="display:flex;align-items:center;gap:8px"><div class="av" style="background:${avColor(c.name)}22;color:${avColor(c.name)};width:28px;height:28px;font-size:10px">${initials(c.name)}</div>${c.name}</div><div class="card-item-sub">${c.type}${c.relationship?' · '+c.relationship:''}</div></div><span class="pill" style="background:${labelColors[lc]||'var(--accent)'}22;color:${labelColors[lc]||'var(--accent)'};border-color:${labelColors[lc]||'var(--accent)'}33">${lc}</span></div><div class="card-item-row"><span class="card-item-label">City</span><span class="card-item-val">${c.city||'—'}</span></div><div class="card-item-row"><span class="card-item-label">Phone</span><span class="card-item-val">${c.phone||'—'}</span></div><div class="card-item-row"><span class="card-item-label">Projects</span><span class="card-item-val" style="color:var(--blue)">${projs}</span></div><div class="card-item-row"><span class="card-item-label">Lifetime Value</span><span class="card-item-val" style="color:var(--green)">${rp(lifetime)}</span></div><div class="card-item-actions"><button class="btn-o btn-xs" onclick="viewClient(${c.id})">View</button><button class="btn-o btn-xs" onclick="openEditClient(${c.id})">✎ Edit</button><button class="btn btn-xs" onclick="quickProject(${c.id})">+ Project</button><button class="btn-danger btn-xs" onclick="deleteClient(${c.id})">✕</button></div></div>`;
  };

  if(dbGroup==='none'||dbGroup==='label'||dbGroup==='type'){
    if(dbGroup==='none'){
      document.getElementById('client-tbl').innerHTML=pgList.length?pgList.map(makeRow).join(''):'<tr><td colspan="8" class="empty">No clients match.</td></tr>';
      document.getElementById('client-cards').innerHTML=pgList.length?pgList.map(makeCard).join(''):'<div class="empty">No clients match.</div>';
    } else {
      const key=dbGroup==='label'?'label':'type';
      const groups={};pgList.forEach(c=>{const g=c[key]||'Other';if(!groups[g])groups[g]=[];groups[g].push(c)});
      let tblHtml='',cardHtml='';
      Object.keys(groups).sort().forEach((g,gi)=>{
        const gid=`cg_${gi}_${g.replace(/\W/g,'_')}`;
        tblHtml+=`<tr onclick="var rows=document.querySelectorAll('.cg_${gid}');rows.forEach(r=>r.style.display=r.style.display==='none'?'':'none')" style="cursor:pointer;user-select:none"><td colspan="8" style="background:var(--bg3);font-size:10px;font-weight:600;color:${labelColors[g]||'var(--text3)'};padding:6px 12px;text-transform:uppercase;letter-spacing:.06em">▾ ${g} (${groups[g].length})</td></tr>${groups[g].map(c=>`<tr class="cg_${gid}">${makeRow(c).replace('<tr>','').replace('</tr>','')}</tr>`).join('')}`;
        cardHtml+=`<div style="font-size:11px;font-weight:600;color:${labelColors[g]||'var(--text3)'};margin:12px 0 6px;text-transform:uppercase;letter-spacing:.06em;cursor:pointer" onclick="var el=document.getElementById('ccard_${gid}');el.style.display=el.style.display==='none'?'':'none'">▾ ${g} <span style="font-weight:400;color:var(--text3)">(${groups[g].length})</span></div><div id="ccard_${gid}">${groups[g].map(makeCard).join('')}</div>`;
      });
      document.getElementById('client-tbl').innerHTML=tblHtml||'<tr><td colspan="8" class="empty">No clients.</td></tr>';
      document.getElementById('client-cards').innerHTML=cardHtml||'<div class="empty">No clients.</div>';
    }
  }
  const pager=document.getElementById('client-pagination');
  if(pager)pager.innerHTML=_pgControls(list.length,'dbClients','renderClients');
}

function setClientLabel(id,label){
  const c=DB.clients.find(x=>x.id===id);if(!c)return;
  c.label=label;saveDBFn();renderClients();
}
