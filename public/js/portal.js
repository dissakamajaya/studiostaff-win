function renderPortalSel(){
  filterPortalClients();
  renderPortal();
}
function renderPortal(){
  const cid=parseInt(document.getElementById('portal-client-sel').value);
  const wrap=document.getElementById('portal-content');
  if(!cid){wrap.innerHTML='<div class="empty"><div class="empty-icon">▲</div>Select a client to view their portal.</div>';return}
  const c=DB.clients.find(cl=>cl.id===cid);if(!c){wrap.innerHTML='';return}
  const projs=DB.projects.filter(p=>p.clientId===cid);const rents=DB.rentals.filter(r=>r.clientId===cid);
  const quotes=DB.invoices.filter(i=>i.clientId===cid&&i.type==='quote');const invs=DB.invoices.filter(i=>i.clientId===cid&&i.type==='invoice');
  const totalPaid=invs.filter(i=>i.status==='Paid').reduce((s,i)=>s+i.total,0);const totalDue=invs.filter(i=>i.status!=='Paid').reduce((s,i)=>s+i.total,0);
  wrap.innerHTML=`<div class="portal-view"><div class="pv-hdr"><div class="pv-av" style="background:${avColor(c.name)}22;color:${avColor(c.name)}">${initials(c.name)}</div><div style="flex:1"><div style="font-size:15px;font-weight:600;font-family:var(--ui)">${c.name}</div><div style="font-size:11px;color:var(--text3)">${c.type} · ${c.email||'—'}</div></div><div class="three" style="gap:8px"><div class="kc" style="text-align:center"><div class="kl">Projects</div><div class="kv" style="font-size:16px;color:var(--blue)">${projs.length}</div></div><div class="kc" style="text-align:center"><div class="kl">Paid</div><div class="kv" style="font-size:16px;color:var(--green)">${rp(totalPaid)}</div></div><div class="kc" style="text-align:center"><div class="kl">Due</div><div class="kv" style="font-size:16px;color:var(--amber)">${rp(totalDue)}</div></div></div></div></div>
  ${projs.length?`<div class="panel"><div class="pnh"><span class="pnt">My Projects</span></div>${projs.map(p=>`<div class="lr"><div style="flex:1"><div style="font-size:11px;font-weight:500">${p.name}</div><div class="td-s">${p.type}${p.deadline?' · Due '+fmtDate(p.deadline):''}</div><div class="prog-bar" style="margin-top:6px"><div class="prog-fill" style="width:${p.progress}%;background:var(--accent)"></div></div></div><div style="text-align:right;margin-left:16px"><div style="font-size:12px;color:var(--accent);font-weight:500">${p.progress}%</div><span class="pill pg_">${p.status}</span></div></div>`).join('')}</div>`:''}
  ${rents.length?`<div class="panel"><div class="pnh"><span class="pnt">My Rentals</span></div>${rents.map(r=>`<div class="lr"><div><div style="font-size:11px;font-weight:500">${r.equipment}</div><div class="td-s">${fmtDate(r.start)} → ${fmtDate(r.returnDate)}</div></div><div style="text-align:right"><div style="font-size:11px;color:var(--green)">${rp(r.total)}</div><span class="pill ${r.status==='Active'?'pg_':'pp_'}">${r.status}</span></div></div>`).join('')}</div>`:''}
  ${quotes.length?`<div class="panel"><div class="pnh"><span class="pnt">My Quotes</span></div>${quotes.map(q=>`<div class="lr"><div><div style="font-size:11px;font-weight:500">${typeof getInvNum!=='undefined'?getInvNum(q):'QT-'+String(q.id).padStart(4,'0')}</div><div class="td-s">${q.items.length} items</div></div><div style="text-align:right"><div style="font-size:11px;color:var(--accent)">${rp(q.total)}</div><span class="pill pa_">${q.status}</span></div></div>`).join('')}</div>`:''}
  ${invs.length?`<div class="panel"><div class="pnh"><span class="pnt">My Invoices</span></div>${invs.map(i=>`<div class="lr"><div><div style="font-size:11px;font-weight:500">${typeof getInvNum!=='undefined'?getInvNum(i):'INV-'+String(i.id).padStart(4,'0')}</div><div class="td-s">${i.due?'Due '+fmtDate(i.due):fmtDate(i.createdAt)}</div></div><div style="text-align:right"><div style="font-size:11px;color:var(--green)">${rp(i.total)}</div><span class="pill ${i.status==='Paid'?'pg_':'pa_'}">${i.status}</span></div></div>`).join('')}</div>`:''}
  ${!projs.length&&!rents.length&&!quotes.length&&!invs.length?'<div class="empty"><div class="empty-icon">●</div>No activity yet for this client.</div>':''}`;
}

// ════════ RENDER: JOURNAL ════════
const journalLabelColors={Studio:'var(--accent)',Rental:'var(--green)',Academy:'var(--amber)',Domestic:'var(--blue)'};
