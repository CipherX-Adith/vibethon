'use strict';
(() => {
  let session={authenticated:false},csrfToken='',pendingDialog='';
  const dialog=document.getElementById('authDialog');
  const form=document.getElementById('authForm');
  const errorNode=document.getElementById('authError');
  let mode='login';
  function emit(){
    const signIn=document.getElementById('signInButton'),label=document.getElementById('accountLabel'),signOut=document.getElementById('signOutButton');
    if(signIn) signIn.hidden=!!session.authenticated;
    if(label){label.hidden=!session.authenticated;label.textContent=session.authenticated?session.user.organization.name:'';label.title=session.authenticated?session.user.email:'';}
    if(signOut) signOut.hidden=!session.authenticated;
    window.dispatchEvent(new CustomEvent('aetheris:auth-changed',{detail:session}));
  }
  function setMode(value){
    mode=value==='register'?'register':'login';
    document.getElementById('authModeLogin').classList.toggle('active',mode==='login');
    document.getElementById('authModeRegister').classList.toggle('active',mode==='register');
    document.getElementById('authNameField').hidden=mode!=='register';
    document.getElementById('authOrganizationField').hidden=mode!=='register';
    document.getElementById('authName').required=mode==='register';
    document.getElementById('authOrganization').required=mode==='register';
    document.getElementById('authTitle').textContent=mode==='register'?'Create your organization account':'Sign in to Aetheris';
    document.getElementById('authSubmit').textContent=mode==='register'?'Create account':'Sign in';
    document.getElementById('authPassword').autocomplete=mode==='register'?'new-password':'current-password';
    errorNode.textContent='';
  }
  function open(pending=''){pendingDialog=pending;setMode('login');if(dialog&&!dialog.open)dialog.showModal();}
  function requireAccount(pending=''){if(session.authenticated)return true;open(pending);return false;}
  async function request(url,options={}){
    const method=String(options.method||'GET').toUpperCase(),headers=new Headers(options.headers||{});
    if(options.body&&!headers.has('content-type'))headers.set('content-type','application/json');
    if(!['GET','HEAD','OPTIONS'].includes(method)&&csrfToken)headers.set('x-csrf-token',csrfToken);
    const response=await fetch(url,{...options,method,headers,credentials:'same-origin',cache:method==='GET'?'no-store':options.cache});
    let payload={};try{payload=await response.json();}catch{}
    if(response.status===401&&session.authenticated){session={authenticated:false};csrfToken='';emit();}
    if(!response.ok)throw new Error(payload.error||'The request could not be completed.');
    return payload;
  }
  async function initialize(){
    try{const response=await fetch('/api/session',{cache:'no-store',credentials:'same-origin'});const payload=await response.json();session=payload.authenticated?payload:{authenticated:false};csrfToken=payload.csrfToken||'';}
    catch{session={authenticated:false};csrfToken='';}
    emit();return session;
  }
  document.getElementById('authModeLogin').addEventListener('click',()=>setMode('login'));
  document.getElementById('authModeRegister').addEventListener('click',()=>setMode('register'));
  document.getElementById('signInButton').addEventListener('click',()=>open());
  document.getElementById('signOutButton').addEventListener('click',async()=>{
    try{await request('/api/auth/logout',{method:'POST',body:'{}'});session={authenticated:false};csrfToken='';emit();}
    catch(error){if(errorNode){errorNode.textContent=error.message;open();}}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();errorNode.textContent='';const submit=document.getElementById('authSubmit');submit.disabled=true;
    const body={email:document.getElementById('authEmail').value, password:document.getElementById('authPassword').value};
    if(mode==='register'){body.displayName=document.getElementById('authName').value;body.organizationName=document.getElementById('authOrganization').value;}
    try{
      const response=await fetch(mode==='register'?'/api/auth/register':'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Could not sign in.');
      session=payload;csrfToken=payload.csrfToken||'';emit();form.reset();dialog.close();
      const next=pendingDialog;pendingDialog='';if(next)setTimeout(()=>document.getElementById(next)?.showModal(),0);
    }catch(error){errorNode.textContent=error.message||'Could not sign in.';}
    finally{submit.disabled=false;}
  });
  window.AetherisAuth={initialize,request,isSignedIn:()=>!!session.authenticated,session:()=>session,require:requireAccount,open};
})();
