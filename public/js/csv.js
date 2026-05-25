// ════════════════════════════════════════
// CSV IMPORT ENGINE
// ════════════════════════════════════════

// Schema definitions for each target
const CSV_SCHEMAS = {
  clients: {
    label: 'Clients',
    fields: [
      {key:'name',      label:'Name *',    required:true},
      {key:'type',      label:'Type',      default:'Artist', options:['Artist','Band','Corporate','Media','Film','Education','Other']},
      {key:'email',     label:'Email',     default:''},
      {key:'phone',     label:'Phone',     default:''},
      {key:'address',   label:'Address',   default:''},
      {key:'label',     label:'Label',     default:'Studio', options:['Studio','Booking','Academy']},
      {key:'notes',     label:'Notes',     default:''},
    ],
    example: [
      'name,type,email,phone,address,label,notes',
      'Rendra Studio,Artist,rendra@email.com,+62811111111,Bandung,Studio,VIP client',
      'Aesthetic Pleasure,Band,ap@band.id,+62822222222,Jakarta,Studio,',
    ].join('\n'),
    import(rows){ return rows.map(r=>({
      id:DB.nextId.c++, name:r.name||'Unknown', type:r.type||'Artist',
      label:r.label||'Studio', email:r.email||'', phone:r.phone||'',
      address:r.address||'', notes:r.notes||'', status:'Active',
      createdAt:new Date().toISOString()
    }));}
  },
  projects: {
    label: 'Studio Projects',
    fields: [
      {key:'name',       label:'Project Name *', required:true},
      {key:'clientName', label:'Client Name',    hint:'Will match or create client'},
      {key:'type',       label:'Type',           default:'Recording', options:['Recording','Mixing','Mastering','Sound Design','Composition','Podcast','Film Score','Video Games','Studio Rental','Company Profile','Voice Over','Other']},
      {key:'deadline',   label:'Deadline',       hint:'YYYY-MM-DD'},
      {key:'status',     label:'Status',         default:'Active', options:['Active','On Hold','Done','Awaiting Approval']},
      {key:'desc',       label:'Description',    default:''},
    ],
    example: [
      'name,clientName,type,deadline,status,desc',
      'Album Recording Rendra,Rendra Studio,Recording,2025-06-30,Active,Full album 10 tracks',
      'Heineken Jingle Mix,,Mixing,2025-05-15,Done,Campaign music mix',
    ].join('\n'),
    import(rows){
      return rows.filter(r=>r.name).map(r=>{
        let clientId=null;
        if(r.clientName){
          const c=DB.clients.find(cl=>cl.name.toLowerCase()===r.clientName.toLowerCase());
          if(c){clientId=c.id;}
          else{
            clientId=DB.nextId.c++;
            DB.clients.push({id:clientId,name:r.clientName,type:'Other',label:'Studio',email:'',phone:'',address:'',notes:'Auto-created by CSV import',status:'Active',createdAt:new Date().toISOString()});
          }
        }
        return {id:DB.nextId.p++,name:r.name,clientId,type:r.type||'Recording',value:0,deadline:r.deadline||'',progress:0,status:r.status||'Active',desc:r.desc||'',createdAt:new Date().toISOString()};
      });
    }
  },
  products: {
    label: 'Merch Inventory',
    fields: [
      {key:'name',         label:'Product Name *', required:true},
      {key:'brand',        label:'Brand',          default:'EXP',  options:['EXP','NAH','X']},
      {key:'category',     label:'Category Code',  default:'AP',   options:['AP','AC','CL'], hint:'AP=Apparel, AC=Accessories, CL=Collectibles'},
      {key:'sku',          label:'SKU',            hint:'Auto-generated if blank'},
      {key:'price',        label:'Sell Price (Rp)',default:'0'},
      {key:'memberPrice',  label:'Member Price',   default:'0'},
      {key:'initialStock', label:'Initial Stock',  default:'0'},
      {key:'edition',      label:'Color/Edition',  default:''},
      {key:'unicode',      label:'Emoji',          default:''},
    ],
    example: [
      'name,brand,category,sku,price,memberPrice,initialStock,edition,unicode',
      'White Tee EXP,EXP,AP,EXP-AP-001,135000,120000,50,White,👕',
      'White Cap NAH,NAH,AC,NAH-AC-001,180000,150000,30,White,🧢',
      'EXP Sticker Pack,EXP,CL,,25000,20000,100,,🏷️',
    ].join('\n'),
    import(rows){
      return rows.filter(r=>r.name).map(r=>{
        const brand=r.brand||'EXP';
        const cat=r.category||'AP';
        const num=DB.products.length+1;
        const sku=r.sku||(brand+'-'+cat+'-'+String(num).padStart(3,'0'));
        return {id:DB.nextId.pr++,name:r.name,unicode:r.unicode||'',brand,category:cat,sku,year:new Date().getFullYear(),edition:r.edition||'',initialStock:parseInt(r.initialStock)||0,stock:parseInt(r.initialStock)||0,price:parseFloat(r.price)||0,memberPrice:parseFloat(r.memberPrice)||0,sold:0,status:'Active',createdAt:new Date().toISOString()};
      });
    }
  },
  purchases: {
    label: 'Merch Purchases',
    fields: [
      {key:'productName', label:'Product Name *', required:true, hint:'Must match existing product name'},
      {key:'qty',         label:'Qty *',          required:true},
      {key:'totalCost',   label:'Total Cost (Rp)*',required:true},
      {key:'supplier',    label:'Supplier',       default:''},
      {key:'status',      label:'Status',         default:'Paid', options:['Paid','Due','In Production']},
    ],
    example: [
      'productName,qty,totalCost,supplier,status',
      'White Tee EXP,50,3000000,Vendor Bandung,Paid',
      'White Cap NAH,30,2500000,Surabaya Factory,In Production',
    ].join('\n'),
    import(rows){
      const imported=[];
      rows.filter(r=>r.productName&&r.qty&&r.totalCost).forEach(r=>{
        const p=DB.products.find(x=>x.name.toLowerCase()===r.productName.toLowerCase());
        if(!p)return; // skip if product not found
        const cost=parseFloat(r.totalCost)||0;
        imported.push({id:DB.nextId.pu++,productId:p.id,qty:parseInt(r.qty)||1,totalCost:cost,supplier:r.supplier||'',status:r.status||'Paid',createdAt:new Date().toISOString()});
      });
      return imported;
    }
  },
  sales: {
    label: 'Merch Sales',
    fields: [
      {key:'productName', label:'Product Name *', required:true},
      {key:'clientName',  label:'Customer Name',  hint:'Optional — will try to match client'},
      {key:'qty',         label:'Qty',            default:'1'},
      {key:'unitPrice',   label:'Unit Price (Rp)',default:'0'},
      {key:'type',        label:'Type',           default:'Sales', options:['Sales','Bundle','Free']},
      {key:'date',        label:'Date',           hint:'YYYY-MM-DD'},
    ],
    example: [
      'productName,clientName,qty,unitPrice,type,date',
      'White Tee EXP,Rama,1,135000,Sales,2025-03-20',
      'White Cap NAH,,2,180000,Sales,2025-03-21',
      'EXP Sticker Pack,Agam,3,0,Free,2025-03-22',
    ].join('\n'),
    import(rows){
      const imported=[];
      rows.filter(r=>r.productName).forEach(r=>{
        const p=DB.products.find(x=>x.name.toLowerCase()===r.productName.toLowerCase());
        if(!p)return;
        let clientId=null;
        if(r.clientName){const c=DB.clients.find(cl=>cl.name.toLowerCase()===r.clientName.toLowerCase());if(c)clientId=c.id;}
        const today=new Date().toISOString().slice(0,10);
        const date=r.date||today;
        const qty=parseInt(r.qty)||1;
        const unitPrice=parseFloat(r.unitPrice)||0;
        const type=r.type||'Sales';
        const total=unitPrice*qty;
        imported.push({id:DB.nextId.sl++,productId:p.id,clientId,qty,unitPrice,type,date,createdAt:new Date().toISOString()});
        if(type==='Sales'&&total>0){
          DB.transactions.push({id:DB.nextId.tx++,description:`Sale: ${p.name} × ${qty}`,amount:total,type:'Income',category:'Merchandise',division:'Merchandise',bank:'bca',date,createdAt:new Date().toISOString()});
          const acc=DB.bankAccounts.find(a=>a.id==='bca');if(acc)acc.balance+=total;
        }
      });
      return imported;
    }
  },
  'transactions-income': {
    label: 'Finance Income',
    fields: [
      {key:'description', label:'Description *',  required:true},
      {key:'amount',      label:'Amount (Rp) *',  required:true, hint:'Numbers only, no IDR or commas'},
      {key:'category',    label:'Category',       default:'Studio Booking'},
      {key:'division',    label:'Division/Label', default:'studio', options:['studio','rental','academy','Merchandise','Domestic','Other']},
      {key:'bank',        label:'Bank Account',   default:'bca', options:['bca','jenius','nah'], hint:'bca / jenius / nah'},
      {key:'date',        label:'Date',           hint:'YYYY-MM-DD or M/D/YYYY'},
    ],
    example: [
      'description,amount,category,division,bank,date',
      '[Client Name] Recording Session,2500000,Studio Booking,studio,bca,2025-04-01',
      '[Academy] DAW Course - Student Name,125000,DAW,academy,bca,2025-04-03',
      '[Merch] White Tee Sale,135000,Merchandise,Merchandise,bca,2025-04-05',
    ].join('\n'),
    import(rows){
      const imported=[];
      rows.filter(r=>r.description&&r.amount).forEach(r=>{
        const amt=parseFloat(String(r.amount).replace(/[^0-9.]/g,''))||0;
        if(!amt)return;
        const bank=r.bank||'bca';
        const date=parseCSVDate(r.date);
        imported.push({id:DB.nextId.tx++,description:r.description,amount:amt,type:'Income',category:r.category||'Studio Booking',division:r.division||'studio',bank,date,createdAt:new Date().toISOString()});
        const acc=DB.bankAccounts.find(a=>a.id===bank);if(acc)acc.balance+=amt;
      });
      return imported;
    }
  },
  'transactions-expense': {
    label: 'Finance Expense',
    fields: [
      {key:'description', label:'Description *',  required:true},
      {key:'amount',      label:'Amount (Rp) *',  required:true, hint:'Numbers only'},
      {key:'category',    label:'Category',       default:'Other'},
      {key:'division',    label:'Division/Label', default:'studio', options:['studio','rental','academy','Merchandise','Domestic','Other']},
      {key:'bank',        label:'Bank Account',   default:'bca', options:['bca','jenius','nah']},
      {key:'date',        label:'Date',           hint:'YYYY-MM-DD'},
    ],
    example: [
      'description,amount,category,division,bank,date',
      'Biznet Monthly Bill,333000,Monthly Bills,studio,bca,2025-04-10',
      'Amin Clean,125000,Amin Clean,Domestic,bca,2025-04-13',
      'Payroll Aldi,2150000,Salary,Domestic,bca,2025-04-30',
    ].join('\n'),
    import(rows){
      const imported=[];
      rows.filter(r=>r.description&&r.amount).forEach(r=>{
        const amt=parseFloat(String(r.amount).replace(/[^0-9.]/g,''))||0;
        if(!amt)return;
        const bank=r.bank||'bca';
        const date=parseCSVDate(r.date);
        imported.push({id:DB.nextId.tx++,description:r.description,amount:amt,type:'Expense',category:r.category||'Other',division:r.division||'studio',bank,date,createdAt:new Date().toISOString()});
        const acc=DB.bankAccounts.find(a=>a.id===bank);if(acc)acc.balance-=amt;
      });
      return imported;
    }
  },
  docs: {
    label: 'Docs',
    fields: [
      {key:'title',   label:'Title *',   required:true},
      {key:'type',    label:'Type',      default:'Notes', options:['Contract','Agreement','Brief','Material','Lyric','Revision','Notes','Other']},
      {key:'status',  label:'Status',    default:'Draft', options:['Draft','Final','Signed','Archived']},
      {key:'related', label:'Related',   default:'', hint:'Project or client name reference'},
      {key:'content', label:'Content',   default:''},
    ],
    example: [
      'title,type,status,related,content',
      'Recording Contract - Client A,Contract,Draft,Client A,This agreement is between...',
      'Lyrics - Heartbeat,Lyric,Final,,Verse 1: ...',
      'Brief - Campaign Q2,Brief,Draft,Campaign Q2,Objective: ...',
    ].join('\n'),
    import(rows){
      return rows.filter(r=>r.title).map(r=>({
        id:DB.nextId.dc++,title:r.title,type:r.type||'Notes',related:r.related||'',projectId:null,clientId:null,mentions:[],content:r.content||'',status:r.status||'Draft',createdBy:currentUser,createdAt:new Date().toISOString()
      }));
    }
  }
};

// ── CSV Parse Helpers ──
function parseCSVDate(s){
  if(!s||!s.trim())return new Date().toISOString().slice(0,10);
  s=s.trim();
  // YYYY-MM-DD
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  // M/D/YYYY or MM/DD/YYYY
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  // "Month DD, YYYY"
  const months={January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12'};
  const m2=s.match(/^(\w+)\s+(\d{1,2}),\s*(\d{4})$/);
  if(m2&&months[m2[1]])return `${m2[3]}-${months[m2[1]]}-${m2[2].padStart(2,'0')}`;
  return new Date().toISOString().slice(0,10);
}

function parseCSVText(text){
  const lines=text.split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length)return{headers:[],rows:[]};
  // Parse header
  const headers=parseCSVLine(lines[0]);
  const rows=[];
  for(let i=1;i<lines.length;i++){
    if(!lines[i].trim())continue;
    const vals=parseCSVLine(lines[i]);
    const row={};
    headers.forEach((h,idx)=>{row[h.trim()]=vals[idx]!==undefined?(vals[idx]||'').trim():''});
    rows.push(row);
  }
  return{headers,rows};
}

function parseCSVLine(line){
  const result=[];let cur='';let inQuote=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(inQuote&&line[i+1]==='"'){cur+='"';i++;}
      else inQuote=!inQuote;
    } else if(ch===','&&!inQuote){result.push(cur);cur='';}
    else cur+=ch;
  }
  result.push(cur);
  return result;
}

// ── CSV Import UI ──
let csvParsed={headers:[],rows:[]};
let csvColumnMap={};
let csvCurrentTarget='';

function openCSVImport(target){
  if(!requireAdmin())return;
  csvCurrentTarget=target||'';
  csvParsed={headers:[],rows:[]};csvColumnMap={};
  const targetSel=document.getElementById('csv-target');
  if(targetSel&&target)targetSel.value=target;
  // reset UI
  const preview=document.getElementById('csv-preview-wrap');
  const mapping=document.getElementById('csv-mapping-wrap');
  const status=document.getElementById('csv-import-status');
  const fileInput=document.getElementById('csv-file-input');
  if(preview)preview.style.display='none';
  if(mapping)mapping.style.display='none';
  if(status)status.innerHTML='';
  if(fileInput)fileInput.value='';
  document.getElementById('csv-do-import-btn').style.display='none';
  openModal('modal-csv-import');
  if(target)csvTargetChanged();
}

function csvTargetChanged(){
  const target=document.getElementById('csv-target').value;
  csvCurrentTarget=target;
  const schema=CSV_SCHEMAS[target];
  const hint=document.getElementById('csv-template-hint');
  const dlBtn=document.getElementById('csv-download-template-btn');
  if(!schema){if(hint)hint.innerHTML='';if(dlBtn)dlBtn.style.display='none';return;}
  if(hint){
    const required=schema.fields.filter(f=>f.required).map(f=>`<code style="background:var(--abg);color:var(--accent);padding:1px 4px;border-radius:3px">${f.key}</code>`).join(' ');
    const all=schema.fields.map(f=>`<code style="background:var(--bg3);padding:1px 4px;border-radius:3px;font-size:9px">${f.key}</code>`).join(' ');
    hint.innerHTML=`<div style="background:var(--bg3);border-radius:6px;padding:10px;font-size:10px"><div style="font-weight:600;color:var(--text);margin-bottom:6px">${schema.label} — Expected Columns:</div><div style="margin-bottom:4px">Required: ${required}</div><div>All fields: ${all}</div><div style="margin-top:6px;color:var(--text3)">💡 Column order doesn't matter — we'll auto-map by header name. Unrecognized columns are ignored.</div></div>`;
  }
  if(dlBtn)dlBtn.style.display='';
  // Reset file input and preview
  const fileInput=document.getElementById('csv-file-input');if(fileInput)fileInput.value='';
  const preview=document.getElementById('csv-preview-wrap');if(preview)preview.style.display='none';
  const mapping=document.getElementById('csv-mapping-wrap');if(mapping)mapping.style.display='none';
  document.getElementById('csv-do-import-btn').style.display='none';
}

function csvFileSelected(){
  const file=document.getElementById('csv-file-input').files[0];
  if(!file){return;}
  const reader=new FileReader();
  reader.onload=e=>{
    const text=e.target.result;
    csvParsed=parseCSVText(text);
    if(!csvParsed.headers.length){
      document.getElementById('csv-import-status').innerHTML=`<div style="color:var(--red);font-size:11px">⚠ Could not parse CSV. Make sure the file has a header row.</div>`;
      return;
    }
    renderCSVPreview();
    renderCSVMapping();
    document.getElementById('csv-do-import-btn').style.display='';
  };
  reader.readAsText(file,'UTF-8');
}

function renderCSVPreview(){
  const {headers,rows}=csvParsed;
  const previewRows=rows.slice(0,5);
  document.getElementById('csv-preview-count').textContent=`(${rows.length} rows)`;
  document.getElementById('csv-preview-head').innerHTML=`<tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>`;
  document.getElementById('csv-preview-body').innerHTML=previewRows.map(r=>`<tr>${headers.map(h=>`<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r[h]||''}</td>`).join('')}</tr>`).join('');
  document.getElementById('csv-preview-wrap').style.display='';
}

function renderCSVMapping(){
  const target=csvCurrentTarget;
  const schema=CSV_SCHEMAS[target];
  if(!schema){return;}
  const {headers}=csvParsed;
  const grid=document.getElementById('csv-mapping-grid');
  // Auto-map: find best matching header for each schema field
  csvColumnMap={};
  schema.fields.forEach(field=>{
    // Try exact match first, then case-insensitive, then partial
    let matched=headers.find(h=>h===field.key)
      ||headers.find(h=>h.toLowerCase()===field.key.toLowerCase())
      ||headers.find(h=>h.toLowerCase().includes(field.key.toLowerCase())||field.key.toLowerCase().includes(h.toLowerCase()));
    csvColumnMap[field.key]=matched||'';
  });
  grid.innerHTML=schema.fields.map(field=>{
    const isRequired=field.required;
    const selectedCol=csvColumnMap[field.key]||'';
    return `
      <div style="font-size:11px;color:${isRequired?'var(--text)':'var(--text2)'};font-weight:${isRequired?600:400}">
        ${field.label}${field.hint?`<div style="font-size:9px;color:var(--text3)">${field.hint}</div>`:''}
      </div>
      <div style="color:var(--text3);font-size:14px;text-align:center">→</div>
      <select class="fi" style="padding:3px 6px;font-size:11px" onchange="csvColumnMap['${field.key}']=this.value" id="csvmap-${field.key}">
        <option value="">— ${isRequired?'Required':'Optional (skip)'}  —</option>
        ${csvParsed.headers.map(h=>`<option value="${h}" ${h===selectedCol?'selected':''}>${h}</option>`).join('')}
        <option value="__default__" ${selectedCol===''&&!isRequired?'selected':''}>Use default: "${field.default!==undefined?field.default:'—'}"</option>
      </select>`;
  }).join('');
  document.getElementById('csv-mapping-wrap').style.display='';
}

function downloadCSVTemplate(){
  const target=csvCurrentTarget;
  const schema=CSV_SCHEMAS[target];
  if(!schema)return;
  const blob=new Blob([schema.example],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`studiostaff_template_${target}.csv`;
  a.click();
}

function doCSVImport(){
  const target=csvCurrentTarget;
  const schema=CSV_SCHEMAS[target];
  if(!schema){alert('Select a target database first.');return;}
  if(!csvParsed.rows.length){alert('No data to import. Please upload a CSV file.');return;}

  // Check required fields have mappings
  const missing=schema.fields.filter(f=>f.required&&!csvColumnMap[f.key]);
  if(missing.length){
    document.getElementById('csv-import-status').innerHTML=`<div style="color:var(--red);font-size:11px">⚠ Required fields missing mapping: <b>${missing.map(f=>f.label).join(', ')}</b></div>`;
    return;
  }

  // Re-read current mappings from selects
  schema.fields.forEach(field=>{
    const sel=document.getElementById(`csvmap-${field.key}`);
    if(sel)csvColumnMap[field.key]=sel.value;
  });

  // Transform raw CSV rows → mapped rows using column mapping
  const mappedRows=csvParsed.rows.map(rawRow=>{
    const mapped={};
    schema.fields.forEach(field=>{
      const colName=csvColumnMap[field.key];
      if(colName==='__default__'||!colName){
        mapped[field.key]=field.default!==undefined?field.default:'';
      } else {
        mapped[field.key]=rawRow[colName]!==undefined?(rawRow[colName]||'').trim():(field.default!==undefined?field.default:'');
      }
    });
    return mapped;
  }).filter(r=>{
    // Filter out rows where required fields are empty
    return schema.fields.filter(f=>f.required).every(f=>r[f.key]&&r[f.key].trim());
  });

  if(!mappedRows.length){
    document.getElementById('csv-import-status').innerHTML=`<div style="color:var(--red);font-size:11px">⚠ No valid rows after mapping. Check that required columns have data.</div>`;
    return;
  }

  // Run the import function
  const beforeCount=getTargetArray(target).length;
  const imported=schema.import(mappedRows);
  
  // Append to the right array
  if(target==='clients')DB.clients.push(...imported);
  else if(target==='projects')DB.projects.push(...imported);
  else if(target==='products')DB.products.push(...imported);
  else if(target==='purchases')DB.purchases.push(...imported);
  else if(target==='sales')DB.sales.push(...imported);
  else if(target==='transactions-income'||target==='transactions-expense')DB.transactions.push(...imported);
  else if(target==='docs')DB.docs.push(...imported);

  const skippedPurchases=target==='purchases'?mappedRows.length-imported.length:0;
  const skippedSales=target==='sales'?mappedRows.length-imported.length:0;
  const skipped=skippedPurchases||skippedSales;

  saveDBFn();
  
  const statusEl=document.getElementById('csv-import-status');
  statusEl.innerHTML=`<div style="background:var(--gbg);border:1px solid rgba(34,197,94,.3);border-radius:6px;padding:12px;font-size:11px">
    <div style="font-weight:600;color:var(--green);margin-bottom:4px">✓ Import Successful!</div>
    <div>Imported: <b>${imported.length}</b> records</div>
    ${skipped?`<div style="color:var(--amber)">Skipped: ${skipped} rows (product not found in inventory)</div>`:''}
    <div style="color:var(--text3);margin-top:4px">Total in ${schema.label}: <b>${getTargetArray(target).length}</b></div>
  </div>`;
  document.getElementById('csv-do-import-btn').style.display='none';
  
  // Refresh the relevant page
  if(_currentPage!=='settings')renderPage(_currentPage);
  renderDash();
}

function getTargetArray(target){
  const map={'clients':DB.clients,'projects':DB.projects,'products':DB.products,'purchases':DB.purchases,'sales':DB.sales,'transactions-income':DB.transactions.filter(t=>t.type==='Income'),'transactions-expense':DB.transactions.filter(t=>t.type==='Expense'),'docs':DB.docs};
  return map[target]||[];
}

