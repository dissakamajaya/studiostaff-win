// ════════ PDF DOWNLOAD ════════
const STUDIO_INFO={
  name:'House of EXP',
  address:'Kyomi Space - Area belakang Jl. Ir. H. Juanda No.130, Dago, Kecamatan Coblong, Kota Bandung, Jawa Barat 40135',
  phone:'+62-812-147-159-13',
  email:'studio@houseofexp.com',
  web:'www.houseofexp.com'
};
function getPdfBrand(inv){
  const cat=(inv&&inv.category||'').toLowerCase();
  if(cat==='rental'){
    return {
      name:'Noise Ambient House',
      payment:{
        title:'Pay with Bank transfer',
        bank:'SMBC (Jenius)',
        account:'90020331979',
        recipient:'Islam Bilhaqy'
      }
    };
  }
  if(cat==='academy'){
    return {
      name:'EXP Academy',
      payment:{
        title:'Pay with Bank Transfer',
        bank:'BCA',
        account:'1394227369',
        recipient:'Islam Bilhaqy'
      }
    };
  }
  return {
    name:STUDIO_INFO.name,
    payment:{
      title:'Pay with Bank Transfer',
      bank:'BCA',
      account:'1394227369',
      recipient:'Islam Bilhaqy'
    }
  };
}
function downloadInvoicePDF(invId){
  const inv=DB.invoices.find(i=>i.id===invId);if(!inv)return;
  const c=DB.clients.find(cl=>cl.id===inv.clientId);
  const proj=inv.projectId?DB.projects.find(p=>p.id===inv.projectId):null;
  const num=getInvNum(inv);
  const isInvoice=inv.type==='invoice';
  const brand=getPdfBrand(inv);
  const dateStr=new Date(inv.createdAt).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'});
  const dueStr=inv.due?new Date(inv.due).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'}):'—';

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${num}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:40px;max-width:794px;margin:0 auto}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:2px solid #111}
    .studio-name{font-size:22px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase}
    .studio-info{font-size:10px;color:#555;line-height:1.6;margin-top:6px;max-width:260px}
    .doc-type{font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#777;margin-bottom:4px}
    .doc-num{font-size:28px;font-weight:900;letter-spacing:-1px}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:32px}
    .meta-block label{font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#888;display:block;margin-bottom:4px}
    .meta-block p{font-size:13px;font-weight:600}
    .meta-block .sub{font-size:11px;font-weight:400;color:#555}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    thead th{background:#111;color:#fff;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.06em}
    thead th:last-child{text-align:right}
    tbody td{padding:10px 12px;border-bottom:1px solid #eee;font-size:12px}
    tbody td:last-child{text-align:right}
    tbody tr:last-child td{border-bottom:none}
    .totals{margin-left:auto;width:260px;margin-bottom:28px}
    .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#555}
    .total-final{display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid #111;font-size:16px;font-weight:900;margin-top:4px}
    .section{background:#f7f7f7;border-radius:6px;padding:16px;margin-bottom:16px}
    .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:10px}
    .thanks{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#888}
    .pill{background:#111;color:#fff;font-size:9px;padding:3px 8px;border-radius:10px;font-weight:600;letter-spacing:0.06em}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="hdr">
    <div>
      <div class="studio-name">${brand.name}</div>
      <div class="studio-info">${STUDIO_INFO.address}<br>📞 ${STUDIO_INFO.phone}<br>✉ ${STUDIO_INFO.email}<br>🌐 ${STUDIO_INFO.web}</div>
    </div>
    <div style="text-align:right">
      <div class="doc-type">${isInvoice?'Invoice':'Quotation'}</div>
      <div class="doc-num">${num}</div>
      ${inv.terminNote?`<div style="margin-top:6px"><span style="background:#111;color:#fff;font-size:10px;padding:3px 10px;border-radius:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${inv.terminNote}</span></div>`:''}
      <div style="font-size:10px;color:#777;margin-top:6px">Date: ${dateStr}</div>
      ${isInvoice?`<div style="font-size:10px;color:#777">Due: ${dueStr}</div>`:''}
      <div style="margin-top:8px"><span class="pill">${inv.status}</span></div>
    </div>
  </div>
  <div class="meta">
    <div class="meta-block">
      <label>Bill To</label>
      <p>${c?c.name:'—'}</p>
      ${c&&c.email?`<p class="sub">${c.email}</p>`:''}
      ${c&&c.phone?`<p class="sub">${c.phone}</p>`:''}
      ${c&&c.address?`<p class="sub">${c.address}</p>`:''}
    </div>
    <div class="meta-block">
      ${proj?`<label>Project</label><p>${proj.name}</p>`:''}
      ${inv.category?`<label style="margin-top:${proj?'10px':'0'}">Category</label><p>${inv.category}</p>`:''}
      ${inv.notes?`<label style="margin-top:10px">Notes</label><p class="sub">${inv.notes}</p>`:''}
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${inv.items.map((it,i)=>`<tr><td style="color:#888">${i+1}</td><td>${it.desc}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${rp(it.price)}</td><td style="font-weight:600">${rp(it.qty*it.price)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${rp(inv.subtotal)}</span></div>
    ${inv.taxPct?`<div class="total-row"><span>Discount (${inv.taxPct}%)</span><span style="color:#22c55e">−${rp(inv.tax)}</span></div>`:''}
    <div class="total-final"><span>Total</span><span>${rp(inv.total)}</span></div>
  </div>
  ${brand.payment?`
  <div class="section">
    <div class="section-title">${brand.payment.title}</div>
    <div style="display:flex;gap:32px;flex-wrap:wrap">
      <div><div style="font-size:10px;color:#888">Bank Name</div><div style="font-weight:700;font-size:13px">${brand.payment.bank}</div></div>
      <div><div style="font-size:10px;color:#888">Account Number</div><div style="font-weight:700;font-size:13px">${brand.payment.account}</div></div>
      <div><div style="font-size:10px;color:#888">Recipient Name</div><div style="font-weight:700;font-size:13px">${brand.payment.recipient}</div></div>
    </div>
  </div>
  <div class="thanks">
    <p style="font-size:14px;font-weight:700;margin-bottom:4px">Thank you 🙏</p>
    <p>Please send the payment according to the due date indicated on this document :)</p>
  </div>`:''}
  </body></html>`;

  const win=window.open('','_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(()=>{win.print();},400);
}

function downloadDebtPDF(debtId){
  const dt=DB.debts.find(d=>d.id===debtId);if(!dt)return;
  const remaining=dt.remainingAmount!==undefined?dt.remainingAmount:dt.amount;
  const settled=dt.amount-remaining;
  const settlements=dt.settlements||[];
  const createdStr=new Date(dt.createdAt).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'});
  const dueStr=dt.due?new Date(dt.due).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'}):'—';
  const settledStr=dt.settledAt?new Date(dt.settledAt).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'}):'—';
  const typeLabel=dt.type==='payable'?'We Owe (Payable)':'Owed to Us (Receivable)';
  const statusColor={Settled:'#22c55e','Partially Settled':'#f59e0b',Outstanding:'#ef4444'}[dt.status]||'#888';

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Debt Receipt — ${dt.description}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:40px;max-width:794px;margin:0 auto}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:2px solid #111}
    .studio-name{font-size:22px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase}
    .studio-info{font-size:10px;color:#555;line-height:1.6;margin-top:6px;max-width:260px}
    .doc-type{font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#777;margin-bottom:4px}
    .doc-num{font-size:24px;font-weight:900;letter-spacing:-0.5px}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
    .meta-block label{font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#888;display:block;margin-bottom:4px}
    .meta-block p{font-size:13px;font-weight:600}
    .meta-block .sub{font-size:11px;font-weight:400;color:#555}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    thead th{background:#111;color:#fff;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.06em}
    thead th:last-child{text-align:right}
    tbody td{padding:10px 12px;border-bottom:1px solid #eee;font-size:12px}
    tbody td:last-child{text-align:right}
    tbody tr:last-child td{border-bottom:none}
    .summary{background:#f7f7f7;border-radius:6px;padding:16px;margin-bottom:20px}
    .summary-row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid #eee}
    .summary-row:last-child{border-bottom:none;font-weight:700;font-size:14px;margin-top:4px}
    .status-badge{display:inline-block;padding:4px 12px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase}
    .footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#888}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="hdr">
    <div>
      <div class="studio-name">House of EXP</div>
      <div class="studio-info">${STUDIO_INFO.address}<br>📞 ${STUDIO_INFO.phone}<br>✉ ${STUDIO_INFO.email}</div>
    </div>
    <div style="text-align:right">
      <div class="doc-type">Debt Receipt</div>
      <div class="doc-num">${dt.description}</div>
      <div style="margin-top:8px"><span class="status-badge" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44">${dt.status}</span></div>
      <div style="font-size:10px;color:#777;margin-top:6px">Date Logged: ${createdStr}</div>
      <div style="font-size:10px;color:#777">Due: ${dueStr}</div>
    </div>
  </div>
  <div class="meta">
    <div class="meta-block">
      <label>${dt.type==='payable'?'Payable To':'Receivable From'}</label>
      <p>${dt.party||'—'}</p>
    </div>
    <div class="meta-block">
      <label>Type &amp; Label</label>
      <p>${typeLabel}</p>
      <p class="sub">${dt.label||'—'}</p>
    </div>
  </div>
  <div class="summary">
    <div class="summary-row"><span>Original Amount</span><span>${rp(dt.amount)}</span></div>
    <div class="summary-row"><span>Total Settled</span><span style="color:#22c55e">${rp(settled)}</span></div>
    <div class="summary-row"><span>Remaining Balance</span><span style="color:${remaining>0?'#ef4444':'#22c55e'}">${rp(remaining)}</span></div>
    ${dt.settledAt?`<div class="summary-row" style="font-size:11px;font-weight:normal"><span style="color:#888">Fully Settled On</span><span style="color:#888">${settledStr}</span></div>`:''}
  </div>
  ${settlements.length?`
  <div style="margin-bottom:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888">Settlement History</div>
  <table>
    <thead><tr><th>#</th><th>Date</th><th>Settled By</th><th>Account</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${settlements.map((s,i)=>`<tr><td style="color:#888">${i+1}</td><td>${fmtDate(s.date)}</td><td>${getUserName&&getUserName(s.by)||s.by||'—'}</td><td>${s.bank?s.bank.toUpperCase():'—'}</td><td style="font-weight:600;color:#22c55e">${rp(s.amount)}</td></tr>`).join('')}
    </tbody>
  </table>`:''}
  ${dt.notes?`<div style="background:#f7f7f7;border-radius:6px;padding:12px;font-size:11px;color:#555"><strong>Notes:</strong> ${dt.notes}</div>`:''}
  <div class="footer">House of EXP · ${STUDIO_INFO.email} · Generated ${new Date().toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'})}</div>
  </body></html>`;

  const win=window.open('','_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(()=>{win.print();},400);
}

function downloadPayslipPDF(payrollId){
  const py=DB.payrolls.find(p=>p.id===payrollId);if(!py)return;
  const emp=getUserName(py.userId);
  const paidStr=py.paidAt?new Date(py.paidAt).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'}):'—';
  const createdStr=new Date(py.createdAt).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'});
  const fees=py.fees||{};
  const feeItems=[
    {label:'Operational Fee',val:fees.operational||0},
    {label:'BPJS Insurance',val:fees.bpjs||0},
    {label:'Project Fee',val:fees.project||0},
    {label:'Food Credit',val:fees.food||0},
  ].filter(f=>f.val>0);
  const feeTotal=feeItems.reduce((s,f)=>s+f.val,0);
  const baseAmt=py.amount-feeTotal;

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Payslip — ${emp} ${py.period}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:40px;max-width:794px;margin:0 auto}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #111}
    .studio-name{font-size:22px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase}
    .studio-info{font-size:10px;color:#555;line-height:1.6;margin-top:6px}
    .slip-title{font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#777;margin-bottom:4px}
    .period{font-size:24px;font-weight:900}
    .emp-block{background:#f7f7f7;border-radius:8px;padding:16px;display:flex;justify-content:space-between;margin-bottom:24px}
    .emp-name{font-size:18px;font-weight:800}
    .emp-sub{font-size:11px;color:#777;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    thead th{background:#111;color:#fff;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.06em}
    thead th:last-child{text-align:right}
    tbody td{padding:10px 12px;border-bottom:1px solid #eee;font-size:12px}
    tbody td:last-child{text-align:right}
    tbody tr:last-child td{border-bottom:none}
    .total-block{background:#111;color:#fff;border-radius:8px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
    .total-label{font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;opacity:.7}
    .total-amount{font-size:26px;font-weight:900}
    .footer{text-align:center;margin-top:32px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#888}
    .sign-area{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:36px}
    .sign-box{border-top:1px solid #111;padding-top:8px;font-size:10px;color:#555}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="hdr">
    <div>
      <div class="studio-name">House of EXP</div>
      <div class="studio-info">${STUDIO_INFO.address}<br>📞 ${STUDIO_INFO.phone}<br>✉ ${STUDIO_INFO.email}</div>
    </div>
    <div style="text-align:right">
      <div class="slip-title">Slip Gaji Karyawan</div>
      <div class="period">${py.period}</div>
      <div style="font-size:10px;color:#777;margin-top:6px">Dibuat: ${createdStr}</div>
      <div style="font-size:10px;color:#777">Tanggal Bayar: ${paidStr}</div>
      <div style="margin-top:8px"><span style="background:#22c55e22;color:#22c55e;border:1px solid #22c55e44;padding:3px 10px;border-radius:10px;font-size:10px;font-weight:700">PAID</span></div>
    </div>
  </div>
  <div class="emp-block">
    <div>
      <div class="emp-name">${emp}</div>
      <div class="emp-sub">Periode: ${py.period}</div>
      ${py.bank?`<div class="emp-sub">Akun Pembayaran: ${py.bank.toUpperCase()}</div>`:''}
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;color:#777">Status</div>
      <div style="font-weight:700;color:#22c55e;font-size:13px">${py.status}</div>
    </div>
  </div>
  <div style="margin-bottom:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888">Rincian Gaji</div>
  <table>
    <thead><tr><th>Komponen</th><th style="text-align:right">Jumlah</th></tr></thead>
    <tbody>
      ${feeItems.map(f=>`<tr><td>${f.label}</td><td style="font-weight:600">${rp(f.val)}</td></tr>`).join('')||'<tr><td colspan="2" style="color:#aaa;font-style:italic">—</td></tr>'}
    </tbody>
  </table>
  <div class="total-block">
    <div><div class="total-label">Gaji Pokok (Total Diterima)</div>${py.notes?`<div style="font-size:10px;opacity:.6;margin-top:4px">${py.notes}</div>`:''}</div>
    <div class="total-amount">${rp(py.amount)}</div>
  </div>
  <div class="sign-area">
    <div><div style="height:50px"></div><div class="sign-box">Diterima oleh (${emp})<br><br>Tanggal: ________________</div></div>
    <div><div style="height:50px"></div><div class="sign-box">Disetujui oleh<br><br>House of EXP</div></div>
  </div>
  <div class="footer">Dokumen ini merupakan slip gaji resmi dari House of EXP · ${STUDIO_INFO.email}</div>
  </body></html>`;

  const win=window.open('','_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(()=>{win.print();},400);
}
function downloadZakatPDF(zakatId){
  const z=(DB.zakats||[]).find(x=>x.id===zakatId);if(!z)return;
  const periodLabel=z.period;
  const createdStr=new Date(z.createdAt).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'});
  const paidStr=z.paidAt?new Date(z.paidAt).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'}):'—';
  const statusColor=z.status==='Paid'?'#22c55e':'#f59e0b';
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Zakat Receipt — ${periodLabel}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:40px;max-width:794px;margin:0 auto}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:2px solid #111}
    .studio-name{font-size:22px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase}
    .studio-info{font-size:10px;color:#555;line-height:1.6;margin-top:6px;max-width:260px}
    .doc-type{font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#777;margin-bottom:4px}
    .doc-num{font-size:24px;font-weight:900;letter-spacing:-0.5px}
    .summary{background:#f7f7f7;border-radius:6px;padding:16px;margin-bottom:20px}
    .summary-row{display:flex;justify-content:space-between;padding:8px 0;font-size:12px;border-bottom:1px solid #eee}
    .summary-row:last-child{border-bottom:none;font-weight:700;font-size:15px;margin-top:4px}
    .badge{display:inline-block;padding:4px 12px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase}
    .footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#888}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="hdr">
    <div>
      <div class="studio-name">House of EXP</div>
      <div class="studio-info">${STUDIO_INFO.address}<br>📞 ${STUDIO_INFO.phone}<br>✉ ${STUDIO_INFO.email}</div>
    </div>
    <div style="text-align:right">
      <div class="doc-type">Zakat Receipt</div>
      <div class="doc-num">Period: ${periodLabel}</div>
      <div style="margin-top:8px"><span class="badge" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44">${z.status}</span></div>
      <div style="font-size:10px;color:#777;margin-top:6px">Created: ${createdStr}</div>
      ${z.status==='Paid'?`<div style="font-size:10px;color:#777">Paid: ${paidStr}</div>`:''}
    </div>
  </div>
  <div class="summary">
    <div class="summary-row"><span>Income Period</span><span style="font-weight:600">${periodLabel}</span></div>
    <div class="summary-row"><span>Label Filter</span><span>${z.label}</span></div>
    <div class="summary-row"><span>Account Filter</span><span>${z.account==='All'?'All':z.account.toUpperCase()}</span></div>
    <div class="summary-row"><span>Total Income</span><span style="color:#22c55e">${rp(z.totalIncome)}</span></div>
    <div class="summary-row"><span>Zakat Rate</span><span>2.5%</span></div>
    <div class="summary-row"><span style="color:${statusColor}">Zakat Amount Due</span><span style="color:${statusColor}">${rp(z.zakatAmount)}</span></div>
  </div>
  <div style="background:#f7f7f7;border-radius:6px;padding:14px;font-size:11px;color:#555;text-align:center;line-height:1.7">
    <strong>Dasar Hukum Zakat Penghasilan:</strong><br>
    2.5% dari total penghasilan bersih yang telah mencapai nisab, dibayarkan setiap bulan atau setiap tahun.
  </div>
  <div class="footer">House of EXP · ${STUDIO_INFO.email} · Generated ${new Date().toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'})}</div>
  </body></html>`;
  const win=window.open('','_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(()=>{win.print();},400);
}
function downloadCleaningReceiptPDF(cleaningId){
  const c=(DB.cleanings||[]).find(x=>x.id===cleaningId);if(!c)return;
  const dateStr=new Date(c.date).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'});
  const paidStr=c.paidAt?new Date(c.paidAt).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'}):'—';
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cleaning Receipt — ${c.date}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:40px;max-width:560px;margin:0 auto}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #111}
    .studio-name{font-size:20px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase}
    .studio-info{font-size:10px;color:#555;line-height:1.6;margin-top:4px}
    .doc-type{font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#777;margin-bottom:4px;text-align:right}
    .doc-num{font-size:20px;font-weight:900;letter-spacing:-0.5px;text-align:right}
    .row{display:flex;justify-content:space-between;padding:9px 0;font-size:12px;border-bottom:1px solid #eee}
    .row:last-child{border-bottom:none;font-weight:700;font-size:15px;padding-top:12px}
    .badge{display:inline-block;padding:3px 10px;border-radius:8px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;background:#22c55e22;color:#22c55e;border:1px solid #22c55e44}
    .footer{text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#888}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="hdr">
    <div>
      <div class="studio-name">House of EXP</div>
      <div class="studio-info">${STUDIO_INFO.address}<br>📞 ${STUDIO_INFO.phone}</div>
    </div>
    <div>
      <div class="doc-type">Cleaning Receipt</div>
      <div class="doc-num">${c.date}</div>
      <div style="text-align:right;margin-top:6px"><span class="badge">Paid</span></div>
    </div>
  </div>
  <div style="background:#f7f7f7;border-radius:6px;padding:16px">
    <div class="row"><span style="color:#555">Tanggal</span><span>${dateStr}</span></div>
    <div class="row"><span style="color:#555">Petugas</span><span style="font-weight:600">${c.cleaner||'Pak Amin'}</span></div>
    ${c.notes?`<div class="row"><span style="color:#555">Catatan</span><span>${c.notes}</span></div>`:''}
    <div class="row"><span>Total Pembayaran</span><span style="color:#22c55e">${rp(c.amount)}</span></div>
  </div>
  <div style="margin-top:16px;font-size:11px;color:#555">Dibayar pada: ${paidStr}</div>
  <div class="footer">House of EXP · Generated ${new Date().toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'})}</div>
  </body></html>`;
  const win=window.open('','_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(()=>{win.print();},400);
}
function filterPortalClients(){
  const q=(document.getElementById('portal-search')?.value||'').toLowerCase();
  const sel=document.getElementById('portal-client-sel');
  if(!sel)return;
  sel.innerHTML='<option value="">Select client...</option>'+DB.clients.filter(c=>!q||c.name.toLowerCase().includes(q)).map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
}
