// ════════ WA LOG ════════
async function renderWALog(){
  var el=document.getElementById('walog-view');
  if(!el)return;
  el.innerHTML='<div style="padding:24px;text-align:center;color:var(--text3);font-size:12px">Loading…</div>';

  var token=localStorage.getItem('ss-token');
  if(!token){el.innerHTML='<div style="padding:24px;text-align:center;color:var(--text3);font-size:12px">Not authenticated</div>';return;}

  try{
    var r=await fetch('/api/wa-log',{headers:{'Authorization':'Bearer '+token}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    var j=await r.json();
    _updateWAStatusBar(j.wa_paused||false);
    var logs=j.logs||[];
    if(!logs.length){
      el.innerHTML='<div style="padding:40px;text-align:center;color:var(--text3);font-size:12px">No WhatsApp messages sent yet.</div>';
      return;
    }
    _renderWALogTable(el,logs);
  }catch(e){
    el.innerHTML='<div style="padding:24px;text-align:center;color:var(--red);font-size:12px">Failed to load log: '+e.message+'</div>';
  }
}

function _updateWAStatusBar(paused){
  var dot=document.getElementById('wa-status-dot');
  var text=document.getElementById('wa-status-text');
  var btn=document.getElementById('wa-pause-btn');
  if(!dot||!text||!btn)return;
  if(paused){
    dot.style.background='var(--red)';
    text.textContent='WhatsApp Paused — notifications will NOT be sent';
    text.style.color='var(--red)';
    btn.textContent='▶ Resume WA';
    btn.style.color='var(--green)';
    btn.style.borderColor='var(--green)';
  }else{
    dot.style.background='var(--green)';
    text.textContent='WhatsApp Active — notifications are being sent';
    text.style.color='';
    btn.textContent='⏸ Pause WA';
    btn.style.color='';
    btn.style.borderColor='';
  }
}

async function toggleWAPause(btn){
  if(!requireAdmin())return;
  var token=localStorage.getItem('ss-token');
  if(!token)return;
  if(btn)btn.disabled=true;
  // Determine current state from button label
  var pausing=btn&&btn.textContent.includes('Pause');
  try{
    var r=await fetch('/api/wa-log',{
      method:'PATCH',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({paused:pausing})
    });
    var j=await r.json().catch(function(){return{};});
    if(r.ok){
      _updateWAStatusBar(j.wa_paused);
      if(typeof showToast==='function')showToast(pausing?'WhatsApp paused':'WhatsApp resumed','success');
    }else{
      if(typeof showToast==='function')showToast('Failed: '+(j.error||'HTTP '+r.status),'error');
    }
  }catch(e){
    if(typeof showToast==='function')showToast('Error: '+e.message,'error');
  }finally{
    if(btn)btn.disabled=false;
  }
}

function _renderWALogTable(el,logs){
  var pgLogs=_pgSlice(logs,'waLog');
  var rows=pgLogs.map(function(l){
    var user=USERS.find(function(u){return u.id===l.user_id;})||{name:l.user_id||'—',color:'#888'};
    // The "Sent" status reflects WhatsApp delivery success. When the message
    // content is a bot error reply (starts with ❌, or contains "Format:" /
    // "Need N fields"), surface that distinction so admins can tell a real
    // notification from a bot complaint.
    var msg=String(l.message||'');
    var isBotErrorReply=l.status==='sent' && (
      msg.trimStart().indexOf('❌')===0 ||
      /Need \d+ fields, got \d+/.test(msg) ||
      /Format:\s*`/.test(msg)
    );
    var statusPill;
    if(l.status==='sent' && isBotErrorReply){
      statusPill='<span class="pill pa_" style="background:var(--amber)22;color:var(--amber)" title="Delivered to user but content is a bot error reply">✓ Sent · bot error</span>';
    } else if(l.status==='sent'){
      statusPill='<span class="pill pg_" style="background:var(--green)22;color:var(--green)">✓ Sent</span>';
    } else {
      statusPill='<span class="pill pg_" style="background:var(--red)22;color:var(--red)">✗ Error</span>';
    }
    var date=new Date(l.created_at);
    var dateStr=date.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
    var timeStr=date.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    var errorCell=l.error?'<div style="font-size:9px;color:var(--red);margin-top:2px">'+escHtml(l.error)+'</div>':'';
    return '<tr>'
      +'<td style="white-space:nowrap;color:var(--text3);font-size:10px">'+dateStr+'<br>'+timeStr+'</td>'
      +'<td><div class="av" style="background:'+user.color+'22;color:'+user.color+';display:inline-flex">'+((user.name||'?')[0].toUpperCase())+'</div> <span style="font-size:11px">'+escHtml(user.name||l.user_id||'—')+'</span></td>'
      +'<td style="font-size:11px;font-family:monospace;color:var(--text2)">'+escHtml(l.phone)+'</td>'
      +'<td style="font-size:11px;max-width:360px;white-space:normal">'+escHtml(l.message)+errorCell+'</td>'
      +'<td>'+statusPill+'</td>'
      +'</tr>';
  }).join('');

  el.innerHTML='<div class="panel" style="overflow-x:auto">'
    +'<table style="width:100%;border-collapse:collapse;font-size:11px">'
    +'<thead><tr style="border-bottom:1px solid var(--border2);text-align:left">'
    +'<th style="padding:8px 10px;color:var(--text3);font-size:10px;font-weight:500;white-space:nowrap">Time</th>'
    +'<th style="padding:8px 10px;color:var(--text3);font-size:10px;font-weight:500">Recipient</th>'
    +'<th style="padding:8px 10px;color:var(--text3);font-size:10px;font-weight:500">Phone</th>'
    +'<th style="padding:8px 10px;color:var(--text3);font-size:10px;font-weight:500">Message</th>'
    +'<th style="padding:8px 10px;color:var(--text3);font-size:10px;font-weight:500">Status</th>'
    +'</tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'</table>'
    +_pgControls(logs.length,'waLog','renderWALog')
    +'</div>';
}

async function sendWATestMessage(btn){
  if(!requireAdmin())return;
  var phoneEl=document.getElementById('walog-test-phone');
  var msgEl=document.getElementById('walog-test-msg');
  var phone=(phoneEl&&phoneEl.value.trim().replace(/[^0-9]/g,''))||'';
  var message=(msgEl&&msgEl.value.trim())||'Test message from STUDIOSTAFF';
  if(!phone){if(typeof showToast==='function')showToast('Masukkan nomor WhatsApp dulu','error');return;}
  if(btn)btn.disabled=true;
  var token=localStorage.getItem('ss-token');
  try{
    var r=await fetch('/api/whatsapp',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+(token||'')},
      body:JSON.stringify({phone:phone,message:message})
    });
    var j=await r.json().catch(function(){return {};});
    if(r.ok){
      if(typeof showToast==='function')showToast('Test message terkirim ke '+phone,'success');
      setTimeout(function(){renderWALog();},1500);
    }else{
      if(typeof showToast==='function')showToast('Gagal: '+(j.error||'HTTP '+r.status),'error');
    }
  }catch(e){
    if(typeof showToast==='function')showToast('Error: '+e.message,'error');
  }finally{
    if(btn)btn.disabled=false;
  }
}

function escHtml(str){
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function clearWALog(btn){
  if(!requireAdmin())return;
  if(!confirm('Clear all WhatsApp log entries? This cannot be undone.'))return;
  if(btn)btn.disabled=true;
  var token=localStorage.getItem('ss-token');
  try{
    var r=await fetch('/api/wa-log',{method:'DELETE',headers:{'Authorization':'Bearer '+token}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    if(typeof showToast==='function')showToast('WA log cleared','success');
    renderWALog();
  }catch(e){
    if(typeof showToast==='function')showToast('Failed to clear log','error');
  }finally{
    if(btn)btn.disabled=false;
  }
}
