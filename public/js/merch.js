// ════════ RENDER: MERCH ════════
// ════════ RENDER: MERCH (full tabbed system) ════════
let merchTab=0;
const MERCH_BRANDS=['EXP','NAH','X'];
const MERCH_CATS={AP:'Apparel',AC:'Accessories',CL:'Collectibles'};
function genSKU(brand,cat,num){return`${brand}-${cat}-${String(num).padStart(3,'0')}`;}
function switchMerchTab(el,idx){
  merchTab=idx;
  document.querySelectorAll('#merch-tabs .tab').forEach((t,i)=>t.classList.toggle('on',i===idx));
  const btns=document.getElementById('merch-ph-btns');
  const btnMap={0:'',1:'<button class="btn btn-sm" onclick="openModal(\'modal-product\')">+ New Product</button>',2:'<button class="btn btn-sm" onclick="openModal(\'modal-purchase\')">+ New Purchase</button>',3:'<button class="btn btn-sm" onclick="openModal(\'modal-sale\')">+ Log Sale</button>'};
  if(btns)btns.innerHTML=btnMap[idx]||'';
  renderMerch();
}
function renderMerch(){
  const products=DB.products||[];
  const purchases=DB.purchases||[];
  const sales=DB.sales||[];
  const totalRevenue=sales.filter(s=>s.type==='Sales').reduce((a,s)=>a+((s.unitPrice||0)*(s.qty||1)),0);
  const totalStock=products.reduce((a,p)=>a+(p.stock||0),0);
  const totalSold=sales.reduce((a,s)=>a+(s.qty||1),0);
  document.getElementById('merch-sub').textContent=`${products.length} products · ${totalSold} sold`;
  const wrap=document.getElementById('merch-tab-content');if(!wrap)return;

  if(merchTab===0){
    // Summary
    wrap.innerHTML=`
      <div class="kgrid" style="margin-bottom:16px">
        <div class="kc"><div class="kl">Products</div><div class="kv">${products.length}</div></div>
        <div class="kc"><div class="kl">Total Stock</div><div class="kv" style="color:var(--blue)">${totalStock}</div></div>
        <div class="kc"><div class="kl">Total Sold</div><div class="kv" style="color:var(--amber)">${totalSold}</div></div>
        <div class="kc"><div class="kl">Sales Revenue</div><div class="kv" style="color:var(--green);font-size:15px">${rp(totalRevenue)}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="panel"><div class="pnh"><span class="pnt">Most Stock</span></div>
          ${products.length?[...products].sort((a,b)=>{var sa=sales.filter(s=>s.productId===a.id).reduce((x,s)=>x+(s.qty||1),0);var sb=sales.filter(s=>s.productId===b.id).reduce((x,s)=>x+(s.qty||1),0);return ((b.initialStock||b.stock||0)-sb)-((a.initialStock||a.stock||0)-sa);}).slice(0,10).map(p=>{const sold=sales.filter(s=>s.productId===p.id).reduce((a,s)=>a+(s.qty||1),0);const cur=(p.initialStock||p.stock||0)-sold;return`<div class="lr"><div><div style="font-size:11px;font-weight:500">${p.name}</div><div style="font-size:9px;color:var(--text3)">${p.sku} · ${p.brand||'EXP'}</div></div><div style="text-align:right"><div style="font-size:11px;color:${cur>5?'var(--green)':cur>0?'var(--amber)':'var(--red)'}">Stock: ${Math.max(0,cur)}</div><div style="font-size:9px;color:var(--text3)">of ${p.initialStock||p.stock||0}</div></div></div>`;}).join(''):'<div class="empty" style="padding:12px">No products yet.</div>'}
        </div>
        <div class="panel"><div class="pnh"><span class="pnt">Recent Sales</span></div>
          ${sales.slice(-5).reverse().map(s=>{const p=products.find(x=>x.id===s.productId);const c=DB.clients.find(x=>x.id===s.clientId);return`<div class="lr"><div><div style="font-size:11px;font-weight:500">${p?p.name:'Unknown'}</div><div style="font-size:9px;color:var(--text3)">${c?c.name:'Walk-in'} · ${fmtDate(s.date)}</div></div><div><div style="font-size:11px;color:var(--green)">${rp((s.unitPrice||0)*(s.qty||1))}</div><span class="pill ${s.type==='Free'?'pa_':'pg_'}" style="font-size:8px">${s.type}</span></div></div>`;}).join('')||'<div class="empty" style="padding:12px">No sales yet.</div>'}
        </div>
      </div>`;
  } else if(merchTab===1){
    // Inventory
    wrap.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>Product</th><th>SKU</th><th>Brand</th><th>Category</th><th>Init Stock</th><th>Current</th><th>Sold</th><th>Sell Price</th><th>Member</th><th>Status</th><th>Action</th></tr></thead><tbody>
      ${products.length?products.map(p=>{const sold=sales.filter(s=>s.productId===p.id).reduce((a,s)=>a+(s.qty||1),0);const cur=(p.initialStock||p.stock||0)-sold;return`<tr><td style="font-weight:500">${p.unicode?p.unicode+' ':''}${p.name}</td><td style="font-family:monospace;font-size:10px;color:var(--accent)">${p.sku}</td><td class="tc">${p.brand||'EXP'}</td><td class="tc">${MERCH_CATS[p.category]||p.category||'—'}</td><td class="tc">${p.initialStock||p.stock||0}</td><td class="tc" style="color:${cur>5?'var(--green)':cur>0?'var(--amber)':'var(--red)'}">${Math.max(0,cur)}</td><td class="tc">${sold}</td><td style="color:var(--green)">${rp(p.price)}</td><td>${p.memberPrice?rp(p.memberPrice):'—'}</td><td><span class="pill ${cur>0?'pg_':'pr_'}">${cur>0?'In Stock':'Out'}</span></td><td><div style="display:flex;gap:4px"><button class="btn-o btn-xs" onclick="openEditProduct(${p.id})">✎</button><button class="btn-danger btn-xs" onclick="deleteProduct(${p.id})">✕</button></div></td></tr>`;}).join(''):'<tr><td colspan="11" class="empty">No products yet. Add a product to start.</td></tr>'}
    </tbody></table></div>
    <div class="card-list">${products.map(p=>{const sold=sales.filter(s=>s.productId===p.id).reduce((a,s)=>a+(s.qty||1),0);const cur=Math.max(0,(p.initialStock||p.stock||0)-sold);return`<div class="card-item"><div class="card-item-header"><div><div class="card-item-title">${p.unicode?p.unicode+' ':''}${p.name}</div><div class="card-item-sub" style="font-family:monospace;font-size:10px">${p.sku}</div></div><span class="pill ${cur>0?'pg_':'pr_'}">${cur>0?'In Stock':'Out'}</span></div><div class="card-item-row"><span class="card-item-label">Stock</span><span class="card-item-val">${cur} / ${p.initialStock||p.stock||0}</span></div><div class="card-item-row"><span class="card-item-label">Price</span><span class="card-item-val" style="color:var(--green)">${rp(p.price)}</span></div><div class="card-item-actions"><button class="btn-o btn-xs" onclick="openEditProduct(${p.id})">✎ Edit</button></div></div>`;}).join('')}</div>`;
  } else if(merchTab===2){
    // Purchases
    wrap.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>Product</th><th>Qty</th><th>Total Cost</th><th>HPP/unit</th><th>Supplier</th><th>Status</th><th>Action</th></tr></thead><tbody>
      ${purchases.length?purchases.slice().reverse().map(pu=>{const p=products.find(x=>x.id===pu.productId);const hpp=pu.qty?(pu.totalCost/pu.qty):0;const sc={Paid:'pg_','In Production':'pb_',Due:'pa_'}[pu.status]||'pa_';return`<tr><td style="font-weight:500">${p?p.name:'Unknown'}</td><td class="tc">${pu.qty}</td><td style="color:var(--red)">${rp(pu.totalCost)}</td><td class="tc" style="color:var(--amber)">${rp(hpp)}</td><td class="tc">${pu.supplier||'—'}</td><td><span class="pill ${sc}">${pu.status}</span></td><td><div style="display:flex;gap:4px">${pu.status!=='Paid'?`<button class="btn btn-xs" style="background:var(--green)" onclick="markPurchasePaid(${pu.id})">✓ Paid</button>`:''}<button class="btn-danger btn-xs" onclick="deletePurchase(${pu.id})">✕</button></div></td></tr>`;}).join(''):'<tr><td colspan="7" class="empty">No purchases yet.</td></tr>'}
    </tbody></table></div>`;
  } else {
    // Sales Log
    wrap.innerHTML=`<div class="tw"><table class="tbl"><thead><tr><th>Date</th><th>Product</th><th>Customer</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Type</th><th>Action</th></tr></thead><tbody>
      ${sales.length?sales.slice().reverse().map(s=>{const p=products.find(x=>x.id===s.productId);const c=DB.clients.find(x=>x.id===s.clientId);const total=(s.unitPrice||0)*(s.qty||1);const tc={Sales:'pg_',Bundle:'pb_',Free:'pa_'}[s.type]||'pg_';return`<tr><td class="tc">${fmtDate(s.date)}</td><td style="font-weight:500">${p?p.name:'—'}</td><td>${c?c.name:'Walk-in'}</td><td class="tc">${s.qty||1}</td><td class="tc">${rp(s.unitPrice||0)}</td><td style="color:var(--green)">${rp(total)}</td><td><span class="pill ${tc}">${s.type}</span></td><td><div style="display:flex;gap:4px"><button class="btn btn-xs" onclick="makeSaleInvoice(${s.id})">Invoice</button><button class="btn-danger btn-xs" onclick="deleteSale(${s.id})">✕</button></div></td></tr>`;}).join(''):'<tr><td colspan="8" class="empty">No sales yet.</td></tr>'}
    </tbody></table></div>`;
  }
}

// ── Merch CRUD ──
function savePurchase(){
  const prodId=parseInt(document.getElementById('pu-product').value);
  const qty=parseInt(document.getElementById('pu-qty').value)||1;
  const cost=parseFloat(document.getElementById('pu-cost').value)||0;
  const supplier=document.getElementById('pu-supplier').value.trim();
  const status=document.getElementById('pu-status').value;
  if(!prodId||!cost){alert('Select product and enter cost');return}
  DB.purchases.push({id:DB.nextId.pu++,productId:prodId,qty,totalCost:cost,supplier,status,createdAt:new Date().toISOString()});
  if(status==='Paid'){
    DB.transactions.push({id:DB.nextId.tx++,description:`Purchase: ${(DB.products.find(p=>p.id===prodId)||{name:'Product'}).name} × ${qty}`,amount:cost,type:'Expense',category:'Merchandise',division:'Merchandise',bank:'bca',date:new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()});
    const acc=DB.bankAccounts.find(a=>a.id==='bca');if(acc)acc.balance-=cost;
  }
  closeModal('modal-purchase');triggerSaveWithFeedback('Saving purchase…');renderMerch();
}
function markPurchasePaid(id){
  const pu=DB.purchases.find(x=>x.id===id);if(!pu)return;
  pu.status='Paid';
  const p=DB.products.find(x=>x.id===pu.productId);
  DB.transactions.push({id:DB.nextId.tx++,description:`Purchase: ${p?p.name:'Product'} × ${pu.qty}`,amount:pu.totalCost,type:'Expense',category:'Merchandise',division:'Merchandise',bank:'bca',date:new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()});
  const acc=DB.bankAccounts.find(a=>a.id==='bca');if(acc)acc.balance-=pu.totalCost;
  saveDBFn();renderMerch();
}
function deletePurchase(id){if(!confirm('Delete?'))return;DB.purchases=DB.purchases.filter(x=>x.id!==id);saveDBFn();renderMerch();}
function saveSale(){
  const prodId=parseInt(document.getElementById('sl-product').value);
  const clientId=document.getElementById('sl-client').value?parseInt(document.getElementById('sl-client').value):null;
  const qty=parseInt(document.getElementById('sl-qty').value)||1;
  const unitPrice=parseFloat(document.getElementById('sl-price').value)||0;
  const type=document.getElementById('sl-type').value;
  const date=document.getElementById('sl-date').value||new Date().toISOString().slice(0,10);
  if(!prodId){alert('Select a product');return}
  DB.sales.push({id:DB.nextId.sl++,productId:prodId,clientId,qty,unitPrice,type,date,createdAt:new Date().toISOString()});
  if(type==='Sales'){
    const total=unitPrice*qty;
    DB.transactions.push({id:DB.nextId.tx++,description:`Sale: ${(DB.products.find(p=>p.id===prodId)||{name:'Product'}).name} × ${qty}`,amount:total,type:'Income',category:'Merchandise',division:'Merchandise',bank:'bca',date,createdAt:new Date().toISOString()});
    const acc=DB.bankAccounts.find(a=>a.id==='bca');if(acc)acc.balance+=total;
  }
  closeModal('modal-sale');triggerSaveWithFeedback('Saving sale…');renderMerch();
}
function deleteSale(id){if(!confirm('Delete?'))return;DB.sales=DB.sales.filter(x=>x.id!==id);saveDBFn();renderMerch();}
function makeSaleInvoice(id){
  const s=DB.sales.find(x=>x.id===id);if(!s||!s.clientId){alert('Need a customer linked to create invoice');return}
  const p=DB.products.find(x=>x.id===s.productId);
  const inv={id:DB.nextId.i++,clientId:s.clientId,category:'Studio',type:'quote',status:'Awaiting Approval',items:[{desc:(p?p.name:'Product'),qty:s.qty||1,price:s.unitPrice||0}],subtotal:(s.unitPrice||0)*(s.qty||1),taxPct:0,tax:0,total:(s.unitPrice||0)*(s.qty||1),due:'',notes:'From Merchandise Sale',createdBy:currentUser,createdAt:new Date().toISOString()};
  DB.invoices.push(inv);
  USERS.forEach(u=>{if(u.id!==currentUser)addNotification(u.id,`Merch invoice created: ${rp(inv.total)}`,'quote',inv.id);});
  saveDBFn();nav('invoices');
}

