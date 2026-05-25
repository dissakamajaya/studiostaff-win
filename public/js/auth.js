// ════════ LOGIN ════════
async function initLogin(){
  // Try existing session token first
  var token=localStorage.getItem('ss-token');
  if(token){
    // ── Paint instantly from cache before any network request ──
    var _cachedUser=localStorage.getItem('ss-user');
    if(_cachedUser){
      try{
        var _cu=JSON.parse(_cachedUser);
        currentUser=_cu.id;
        var _ex=USERS.find(function(u){return u.id===_cu.id;});
        if(_ex){_ex.name=_cu.name;_ex.color=_cu.color;_ex.role=_cu.role||'staff';}
        else USERS.push({id:_cu.id,name:_cu.name,color:_cu.color,wa_phone:_cu.wa_phone||'',role:_cu.role||'staff'});
        // Show app shell immediately using cached DB (loadDB handles cache internally)
        document.getElementById('login-wrap').style.display='none';
        document.getElementById('app').classList.add('on');
        sbCollapsed=localStorage.getItem('sb-col')==='1';
      }catch(e){}
    }
    try{
      // Verify session + load fresh data (loadDB now does cache-first render)
      var r=await fetch('/api/auth?action=me',{headers:{'Authorization':'Bearer '+token}});
      if(r.ok){
        var j=await r.json();
        currentUser=j.user.id;
        localStorage.setItem('ss-user',JSON.stringify(j.user));
        var existing=USERS.find(function(u){return u.id===j.user.id;});
        if(existing){existing.name=j.user.name;existing.color=j.user.color;existing.wa_phone=j.user.wa_phone||'';existing.role=j.user.role||'staff';}
        else USERS.push({id:j.user.id,name:j.user.name,color:j.user.color,wa_phone:j.user.wa_phone||'',role:j.user.role||'staff'});
        fetchAndRenderUsers();
        await loadDB(); // cache-first paint + background network refresh
        if(!_cachedUser)showApp(); // only call showApp if we didn't already show shell
        else { checkApprovalReminders();if(typeof initRealtimeSync==='function')initRealtimeSync();if(typeof initPushNotifications==='function')initPushNotifications(); }
        return;
      }
    }catch(e){}
    localStorage.removeItem('ss-token');
    localStorage.removeItem('ss-user');
  }
  // Check for saved login (auto-fill)
  var _saved=null;
  try{var _raw=localStorage.getItem('ss-saved-login');if(_raw)_saved=JSON.parse(_raw);}catch(e){}
  
  // Show login
  document.getElementById('login-wrap').style.display='flex';
  document.getElementById('login-remember-wrap').style.display='';
  var passEl=document.getElementById('login-pass');
  if(passEl){
    passEl.value=_saved&&_saved.password?_saved.password:'';
    passEl.onkeydown=function(e){if(e.key==='Enter')doLogin();};
    passEl.focus();
  }
  document.getElementById('login-err').textContent='';
  // Load users without blocking login UI setup
  fetchAndRenderUsers();
}

// Refresh login user list asynchronously without blocking initial UI.
async function fetchAndRenderUsers(){
  try{
    var ru=await fetch('/api/auth?action=users');
    if(ru.ok){
      var uj=await ru.json();
      if(uj.users&&uj.users.length)_renderLoginUsers(uj.users);
      else _showLoginError('No users found. Check database connection.');
    } else {
      console.warn('fetchAndRenderUsers: API returned', ru.status);
      _showLoginError('Could not load users (HTTP '+ru.status+'). Check connection.');
    }
  }catch(e){
    console.warn('fetchAndRenderUsers error:', e);
    _showLoginError('Could not load users. Check connection and try again.');
  }
}
function _showLoginError(msg){
  var el=document.getElementById('login-users-loading');
  if(el){el.textContent=msg;el.style.color='var(--red)';el.style.padding='12px';}
}

function _renderLoginUsers(users){
  // Sync into global USERS array for getUserName/getUserColor/getUserPhone etc.
  users.forEach(function(u){
    var existing=USERS.find(function(x){return x.id===u.id;});
    if(existing){existing.name=u.name;existing.color=u.color;existing.wa_phone=u.wa_phone||'';existing.role=u.role||'staff';}
    else USERS.push({id:u.id,name:u.name,color:u.color,wa_phone:u.wa_phone||'',role:u.role||'staff'});
  });
  // Build buttons dynamically — no hardcoded HTML required
  var container=document.getElementById('login-users');
  if(!container)return;
  container.innerHTML=users.map(function(u){
    if(!u||(!u.name&&!u.id))return'';
    var initial=(u.name||u.id)[0].toUpperCase();
    var adminBadge=u.role==='admin'?'<div style="font-size:8px;font-weight:700;letter-spacing:.06em;color:'+u.color+';opacity:.8;text-transform:uppercase;margin-top:1px">admin</div>':'';
    return '<button class="login-user-btn" id="ubtn-'+u.id+'" onclick="selectLoginUser(\''+u.id+'\')"><div class="login-av" style="background:'+u.color+'22;color:'+u.color+'">'+initial+'</div><div class="login-uname">'+(u.name||u.id)+'</div>'+adminBadge+'</button>';
  }).join('');
  // Auto-select saved user after render
  var _saved=null;
  try{var _raw=localStorage.getItem('ss-saved-login');if(_raw)_saved=JSON.parse(_raw);}catch(e){}
  if(_saved&&_saved.userId&&document.getElementById('ubtn-'+_saved.userId)){
    selectLoginUser(_saved.userId);
    var qel=document.getElementById('login-quick');
    if(qel)qel.style.display='';
  }
}

var selectedLoginUser=null;
function selectLoginUser(uid){
  selectedLoginUser=uid;
  var btns=document.querySelectorAll('.login-user-btn');
  for(var i=0;i<btns.length;i++){
    btns[i].classList.toggle('sel',btns[i].id==='ubtn-'+uid);
  }
  document.getElementById('login-err').textContent='';
}

async function doLogin(){
  if(!selectedLoginUser){
    document.getElementById('login-err').textContent='Select a user first';
    return;
  }
  var passEl=document.getElementById('login-pass');
  if(!passEl)return;
  var password=passEl.value;
  if(!password){document.getElementById('login-err').textContent='Enter password';return;}
  return _doLoginWithCreds(selectedLoginUser, password);
}

async function _doLoginWithCreds(userId, password){
  var btn=document.getElementById('login-submit-btn');
  if(btn){btn.textContent='Signing in...';btn.disabled=true;}
  try{
    var r=await fetch('/api/auth?action=login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId:userId,password:password})
    });
    var j=await r.json();
    if(!r.ok){
      document.getElementById('login-err').textContent=j.error||'Login failed';
      var card=document.querySelector('.login-card');
      if(card){card.style.animation='none';void card.offsetHeight;card.style.animation='shake .4s';}
      if(btn){btn.textContent='Sign In →';btn.disabled=false;}
      return;
    }
    // Save login if checkbox checked
    var rem=document.getElementById('login-remember');
    if(rem && rem.checked){
      try{
        localStorage.setItem('ss-saved-login',JSON.stringify({userId:userId,password:password}));
      }catch(e){}
    }
    localStorage.setItem('ss-token',j.token);
    localStorage.setItem('ss-user',JSON.stringify(j.user));
    currentUser=j.user.id;
    var existing=USERS.find(function(u){return u.id===j.user.id;});
    if(existing){existing.name=j.user.name;existing.color=j.user.color;existing.wa_phone=j.user.wa_phone||'';existing.role=j.user.role||'staff';}
    else USERS.push({id:j.user.id,name:j.user.name,color:j.user.color,wa_phone:j.user.wa_phone||'',role:j.user.role||'staff'});
    await loadDB();
    // Log the login activity with IP and location
    if(typeof logLogin==='function'){
      try{
        const ipRes=await fetch('https://api.ipify.org?format=json');
        const ipData=await ipRes.json();
        const geoRes=await fetch(`https://ipapi.co/${ipData.ip}/json/`);
        const geoData=await geoRes.json();
        const location=geoData.city||'Unknown location';
        await logLogin(currentUser,`IP ${ipData.ip} from ${location} logged in and active online`);
      }catch(e){
        await logLogin(currentUser);
      }
    }
    showApp();
  }catch(e){
    // Offline fallback
    if(false){
      currentUser=selectedLoginUser;
      await loadDB();
      showApp();
    }else{
      document.getElementById('login-err').textContent='Wrong password';
    }
  }
  if(btn){btn.textContent='Sign In →';btn.disabled=false;}
}

// Quick login with saved credentials
async function quickLogin(){
  try{
    var _raw=localStorage.getItem('ss-saved-login');
    if(!_raw)return;
    var _saved=JSON.parse(_raw);
    if(!_saved.userId||!_saved.password)return;
    var qBtn=document.getElementById('login-quick-btn');
    if(qBtn){qBtn.textContent='Signing in...';qBtn.disabled=true;}
    await _doLoginWithCreds(_saved.userId, _saved.password);
  }catch(e){
    document.getElementById('login-err').textContent='Auto-login failed';
  }
}

async function logout(){
  // Log the logout activity BEFORE clearing session
  if(currentUser&&typeof logLogout==='function')await logLogout(currentUser);
  
  var token=localStorage.getItem('ss-token');
  if(token){
    try{await fetch('/api/auth?action=logout',{method:'POST',headers:{'Authorization':'Bearer '+token}});}catch(e){}
    localStorage.removeItem('ss-token');
    localStorage.removeItem('ss-user');
    localStorage.removeItem('ss-saved-login');
  }
  // Stop real-time polling and remove push subscription
  if(typeof stopRealtimeSync==='function')stopRealtimeSync();
  if(typeof unsubscribePush==='function')unsubscribePush();
  currentUser=null;
  selectedLoginUser=null;
  document.getElementById('app').classList.remove('on');
  document.getElementById('login-wrap').style.display='flex';
  document.getElementById('login-quick').style.display='none';
  var passEl=document.getElementById('login-pass');
  if(passEl)passEl.value='';
  document.getElementById('login-err').textContent='';
  var checkEl=document.getElementById('login-remember');
  if(checkEl)checkEl.checked=false;
  var btns=document.querySelectorAll('.login-user-btn');
  for(var i=0;i<btns.length;i++){btns[i].classList.remove('sel');}
}

async function showApp(){
  document.getElementById('login-wrap').style.display='none';
  document.getElementById('app').classList.add('on');
  await loadDB();
  sbCollapsed=localStorage.getItem('sb-col')==='1';
  renderSidebar();renderTopbar();
  // Hash routing: if URL has #pagename, navigate there instead of dashboard
  const hashPage=(window.location.hash||'').replace('#','');
  const validPages=['dashboard','today','studio','rental','academy','merch','domestic','finance','invoices','docs','portal','database','calendar','journal','settings','walog','revision'];
  nav(validPages.includes(hashPage)?hashPage:'dashboard');
  checkApprovalReminders();
  // Real-time sync (15s polling for cross-user updates)
  if(typeof initRealtimeSync==='function')initRealtimeSync();
  // Push notifications (only if permission already granted; else user presses bell)
  if(typeof initPushNotifications==='function')initPushNotifications();
  // iOS install prompt
  if(typeof showIosInstallBanner==='function')showIosInstallBanner();
}

// ════════ APPROVAL REMINDERS ════════
function checkApprovalReminders(){
  const now=new Date();
  const sevenDaysAgo=new Date(now-7*864e5);
  DB.invoices.filter(i=>i.type==='quote'&&i.status==='Awaiting Approval'&&i.createdBy!==currentUser).forEach(q=>{
    const created=new Date(q.createdAt);
    if(created<sevenDaysAgo){
      const qNum=`${typeof getInvNum!=='undefined'?getInvNum(q):'QT-'+String(q.id).padStart(4,'0')}`;
      const alreadyNotified=DB.notifications.some(n=>n.userId===currentUser&&n.refId===q.id&&n.type==='reminder'&&new Date(n.createdAt)>sevenDaysAgo);
      if(!alreadyNotified){
        DB.notifications.push({id:DB.nextId.n++,userId:currentUser,message:`⏰ Reminder: ${qNum} from ${getUserName(q.createdBy)} is still awaiting your approval (${Math.floor((now-created)/864e5)} days old)`,read:false,createdAt:now.toISOString(),type:'reminder',refId:q.id});
        saveDBFn();updateNotifCount();renderSidebar();
      }
    }
  });
}
