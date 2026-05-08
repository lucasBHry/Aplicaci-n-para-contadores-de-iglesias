// ─── State ───────────────────────────────────────────────────────
const state = { currentUser:null, orgName:'', logo:null, currentDia:null, allPersonNames:[] };

const $ = (sel,ctx=document) => ctx.querySelector(sel);
const $$ = (sel,ctx=document) => [...ctx.querySelectorAll(sel)];

function el(tag,attrs={},...children){
  const e=document.createElement(tag);
  for(const[k,v]of Object.entries(attrs)){
    if(k==='class')e.className=v;
    else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);
    else e.setAttribute(k,v);
  }
  for(const c of children){if(c==null)continue;e.appendChild(typeof c==='string'?document.createTextNode(c):c);}
  return e;
}

function show(id){ $$('.screen').forEach(s=>s.classList.remove('active')); document.getElementById(id)?.classList.add('active'); }

function toast(msg,type='info'){
  const t=el('div',{style:`position:fixed;bottom:20px;right:20px;z-index:9999;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:500;background:${type==='error'?'#a32d2d':'#1a3a5c'};color:white;box-shadow:0 4px 12px rgba(0,0,0,0.2);`},msg);
  document.body.appendChild(t); setTimeout(()=>t.remove(),3000);
}

function confirmDialog(msg,onYes,danger=true){
  const overlay=el('div',{class:'overlay'});
  const popup=el('div',{class:'popup'});
  popup.innerHTML=`<div class="popup-title ${danger?'danger':''}">Confirmar</div><p class="popup-msg">${msg}</p>`;
  const actions=el('div',{class:'popup-actions'});
  actions.appendChild(el('button',{class:'btn',onclick:()=>overlay.remove()},'Cancelar'));
  actions.appendChild(el('button',{class:`btn ${danger?'btn-danger':'btn-primary'}`,onclick:()=>{overlay.remove();onYes();}},'Confirmar'));
  popup.appendChild(actions); overlay.appendChild(popup); document.body.appendChild(overlay);
}

function svgIcon(d,size=18){
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('width',size);s.setAttribute('height',size);s.setAttribute('fill','none');
  s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','2');s.setAttribute('viewBox','0 0 24 24');
  s.innerHTML=d; return s;
}

const ICONS={
  eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  edit:'<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  download:'<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  logout:'<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  back:'<polyline points="15 18 9 12 15 6"/>',
  users:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  book:'<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>',
  key:'<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  upload:'<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>',
};

const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Logo ─────────────────────────────────────────────────────────
function makeLogo(size=36){
  if(!state.logo)return null;
  return el('img',{src:state.logo,style:`width:${size}px;height:${size}px;object-fit:contain;border-radius:4px;`});
}
function addLogoToTopbar(tb){
  if(!state.logo)return;
  const wrap=el('div',{style:'display:flex;align-items:center;margin-left:8px;'});
  wrap.appendChild(makeLogo(32)); tb.appendChild(wrap);
}

// ─── PDF ─────────────────────────────────────────────────────────
function getJsPDF(){
  // jsPDF v4 UMD exports to window.jspdf.jsPDF (lowercase namespace)
  if(window.jspdf&&window.jspdf.jsPDF) return window.jspdf.jsPDF;
  if(window.jsPDF) return window.jsPDF;
  throw new Error('jsPDF no disponible');
}

function addLogoToPdf(doc){
  if(!state.logo)return;
  try{ const pw=doc.internal.pageSize.width; doc.addImage(state.logo,'PNG',pw-42,6,30,30); }catch(e){}
}

async function downloadPdfDia(dia){
  try{
    const jsPDF=getJsPDF();
    const doc=new jsPDF();
    const orgName=state.orgName||'Organización';
    const contadores=JSON.parse(dia.contadores||'[]').join(', ');
    addLogoToPdf(doc);
    doc.setFontSize(14);doc.setFont(undefined,'bold');doc.text(orgName,14,18);
    doc.setFontSize(11);doc.setFont(undefined,'normal');
    doc.text(`Registro del día: ${dia.fecha}`,14,26);
    doc.text(`Contador(es): ${contadores}`,14,33);
    let startY=40;
    if(dia.modified_by){
      doc.setFontSize(9);doc.setTextColor(150);
      dia.modified_by.split('\n').forEach((l,i)=>doc.text(l,14,40+i*5));
      doc.setTextColor(0);startY=40+dia.modified_by.split('\n').length*5+4;
    }
    const filas=dia.filas.filter(f=>f.nombre);
    const pageW=doc.internal.pageSize.width;
    const pageH=doc.internal.pageSize.height;
    const marginL=14, marginR=14, tableW=pageW-marginL-marginR;
    doc.autoTable({
      startY,
      margin:{left:marginL,right:marginR},
      tableWidth:tableW,
      head:[['Nombre','Ofrenda','Ofrenda especial','Diezmo','Descripción ofrenda especial']],
      body:filas.map(f=>[
        f.nombre,
        `${f.ofrenda!=null?f.ofrenda:0} €`,
        `${f.ofrenda_especial!=null?f.ofrenda_especial:0} €`,
        `${f.diezmo!=null?f.diezmo:0} €`,
        f.descripcion_especial||''
      ]),
      styles:{fontSize:9,cellPadding:3},
      headStyles:{fillColor:[26,58,92],textColor:255,fontStyle:'bold'},
      alternateRowStyles:{fillColor:[240,246,255]},
      columnStyles:{0:{cellWidth:'auto'},1:{halign:'center'},2:{halign:'center'},3:{halign:'center'},4:{cellWidth:'auto'}},
      didParseCell:(data)=>{
        if(data.section==='body'&&data.column.index>0&&data.column.index<4){data.cell.styles.halign='center';}
      },
      didDrawPage:(data)=>{
        doc.setFontSize(9);doc.setTextColor(150);
        doc.text(`Hecho por: ${orgName}`,marginL,pageH-8);
      }
    });
    const b64=doc.output('datauristring').split(',')[1];
    const result=await window.api.pdfSave({base64:b64,filename:`registro-${dia.fecha}.pdf`});
    if(result&&result.ok)toast('PDF guardado'); else toast('Descarga cancelada');
  }catch(e){toast('Error al generar PDF: '+e.message,'error');}
}

async function downloadPdfPersona(nombre,year,months){
  try{
    const jsPDF=getJsPDF();
    const doc=new jsPDF();
    const orgName=state.orgName||'Organización';
    addLogoToPdf(doc);
    doc.setFontSize(14);doc.setFont(undefined,'bold');doc.text(orgName,14,18);
    doc.setFontSize(12);doc.setFont(undefined,'normal');doc.text(`Ofrendas de: ${nombre} — ${year}`,14,27);
    const totalOf=months.reduce((s,m)=>s+m.ofrenda,0);
    const totalEsp=months.reduce((s,m)=>s+m.ofrenda_especial,0);
    const totalDiezmo=months.reduce((s,m)=>s+m.diezmo,0);
    const pageW2=doc.internal.pageSize.width;
    const pageH2=doc.internal.pageSize.height;
    const mL=20, mR=20, tW=pageW2-mL-mR;
    const fmtE=v=>`${Number(v)||0} €`;
    doc.autoTable({
      startY:38,
      margin:{left:mL,right:mR},
      tableWidth:tW,
      head:[['Mes','Ofrenda','Ofrenda especial','Diezmo']],
      body:months.map((m,i)=>[MONTHS[i],fmtE(m.ofrenda),fmtE(m.ofrenda_especial),fmtE(m.diezmo)]),
      foot:[['Total',fmtE(totalOf),fmtE(totalEsp),fmtE(totalDiezmo)]],
      styles:{fontSize:10,cellPadding:4},
      headStyles:{fillColor:[26,58,92],textColor:255,fontStyle:'bold'},
      footStyles:{fillColor:[26,58,92],textColor:255,fontStyle:'bold',halign:'center'},
      alternateRowStyles:{fillColor:[240,246,255]},
      columnStyles:{0:{cellWidth:'auto',halign:'left'},1:{halign:'center'},2:{halign:'center'},3:{halign:'center'}},
      didParseCell:(data)=>{
        if(data.section==='foot'&&data.column.index>0){data.cell.styles.halign='center';}
        if(data.section==='foot'&&data.column.index===0){data.cell.styles.halign='left';}
      },
      didDrawPage:(data)=>{
        doc.setFontSize(9);doc.setTextColor(150);
        doc.text(`Hecho por: ${orgName}`,mL,pageH2-8);
      }
    });
    // Total general box - bottom right, white bg, big text
    const afterY=doc.lastAutoTable.finalY+6;
    const boxW=60,boxH=18,boxX=pageW2-mR-boxW;
    doc.setDrawColor(26,58,92);doc.setLineWidth(0.8);
    doc.setFillColor(255,255,255);
    doc.roundedRect(boxX,afterY,boxW,boxH,3,3,'FD');
    doc.setFontSize(14);doc.setFont(undefined,'bold');doc.setTextColor(26,58,92);
    doc.text(`Total: ${fmtE(totalOf+totalEsp+totalDiezmo)}`,boxX+boxW/2,afterY+boxH/2+1,{align:'center',baseline:'middle'});
    doc.setFont(undefined,'normal');
    const b64=doc.output('datauristring').split(',')[1];
    const result=await window.api.pdfSave({base64:b64,filename:`${nombre}-${year}.pdf`});
    if(result&&result.ok)toast('PDF guardado'); else toast('Descarga cancelada');
  }catch(e){toast('Error al generar PDF: '+e.message,'error');}
}

// ─── XLSX anual ───────────────────────────────────────────────────
async function downloadXlsxAnual(year){
  try{
    toast('Generando Excel...');
    const result=await window.api.xlsxGenerate({year:String(year),orgName:state.orgName||'Organización'});
    if(result&&result.ok)toast('Excel guardado');
    else if(result&&result.error)toast('Error: '+result.error,'error');
    else toast('Descarga cancelada');
  }catch(e){toast('Error al generar Excel: '+e.message,'error');}
}

// ─── Autocomplete ─────────────────────────────────────────────────
async function refreshAllPersonNames(){
  const years=await window.api.personasYears();
  const all=new Set();
  for(const y of years){(await window.api.personasList(y)).forEach(n=>all.add(n));}
  state.allPersonNames=[...all].sort();
}

function attachNameAutocomplete(input){
  let dd=null;
  const remove=()=>{if(dd){dd.remove();dd=null;}};
  input.addEventListener('input',()=>{
    remove();
    const q=input.value.trim().toLowerCase();
    if(!q)return;
    const matches=state.allPersonNames.filter(n=>n.toLowerCase().includes(q)).slice(0,6);
    if(!matches.length)return;
    dd=el('div',{style:'position:fixed;background:white;border:1px solid #d0dce8;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:500;min-width:180px;max-width:280px;overflow:hidden;'});
    matches.forEach(name=>{
      const item=el('div',{style:'padding:6px 10px;font-size:12px;cursor:pointer;color:#1a2a3a;border-bottom:1px solid #f0f4f8;'});
      const idx=name.toLowerCase().indexOf(q);
      if(idx>=0){item.appendChild(document.createTextNode(name.slice(0,idx)));item.appendChild(el('strong',{},name.slice(idx,idx+q.length)));item.appendChild(document.createTextNode(name.slice(idx+q.length)));}
      else item.textContent=name;
      item.addEventListener('mouseenter',()=>item.style.background='#e6f1fb');
      item.addEventListener('mouseleave',()=>item.style.background='');
      item.addEventListener('mousedown',e=>{e.preventDefault();input.value=name;remove();});
      dd.appendChild(item);
    });
    const rect=input.getBoundingClientRect();
    dd.style.top=(rect.bottom+2)+'px';dd.style.left=rect.left+'px';
    document.body.appendChild(dd);
  });
  input.addEventListener('blur',()=>setTimeout(remove,200));
  input.addEventListener('keydown',e=>{if(e.key==='Escape')remove();});
}

// ─── SETUP ───────────────────────────────────────────────────────
function renderSetup(){
  const s=document.getElementById('s-setup'); s.innerHTML='';
  const wrap=el('div',{class:'auth-wrap'});
  wrap.innerHTML=`<div class="auth-logo">${svgIcon('<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',26).outerHTML}</div><h1 class="auth-title">Configuración inicial</h1><p class="auth-sub">Crea el administrador de la aplicación</p>`;
  const card=el('div',{class:'auth-card'});
  card.innerHTML=`<div class="warning-box"><strong>⚠ Importante:</strong> Recuerda tu contraseña. No hay forma de recuperarla. Si la pierdes, deberás borrar todos los datos y empezar de nuevo.</div><div class="form-group"><label>Nombre de la organización</label><input id="su-org" type="text" placeholder="Ej: Fundación Esperanza"/></div><div class="form-group"><label>Usuario administrador</label><input type="text" value="administrador" disabled/></div><div class="form-group"><label>Contraseña</label><input id="su-pass" type="password" placeholder="Mínimo 4 caracteres"/></div><div class="form-group"><label>Repite la contraseña</label><input id="su-pass2" type="password" placeholder="Repite tu contraseña"/></div>`;
  const btn=el('button',{class:'btn btn-primary',style:'width:100%;margin-top:4px;',onclick:doSetup},'Crear administrador');
  card.appendChild(btn); card.addEventListener('keydown',e=>{if(e.key==='Enter')doSetup();}); wrap.appendChild(card); s.appendChild(wrap);
}
async function doSetup(){
  const org=$('#su-org').value.trim(),pass=$('#su-pass').value,pass2=$('#su-pass2').value;
  if(!org)return toast('Escribe el nombre de la organización','error');
  if(pass.length<4)return toast('La contraseña debe tener al menos 4 caracteres','error');
  if(pass!==pass2)return toast('Las contraseñas no coinciden','error');
  const res=await window.api.setupCreate({orgName:org,password:pass});
  if(res.ok){state.orgName=org;renderLogin();show('s-login');}
  else toast(res.error||'Error al crear','error');
}

// ─── LOGIN ────────────────────────────────────────────────────────
function renderLogin(){
  const s=document.getElementById('s-login'); s.innerHTML='';
  const wrap=el('div',{class:'auth-wrap'});
  if(state.logo){const lw=el('div',{style:'text-align:center;margin-bottom:12px;'});lw.appendChild(makeLogo(64));wrap.appendChild(lw);}
  else wrap.innerHTML=`<div class="auth-logo">${svgIcon('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',24).outerHTML}</div>`;
  wrap.appendChild(el('h1',{class:'auth-title'},'Iniciar sesión'));
  wrap.appendChild(el('p',{class:'auth-sub'},state.orgName||''));
  const card=el('div',{class:'auth-card'});
  card.innerHTML=`<div class="form-group"><label>Usuario</label><input id="li-user" type="text" placeholder="administrador o nombre de contador"/></div><div class="form-group"><label>Contraseña</label><input id="li-pass" type="password" placeholder="Tu contraseña"/></div>`;
  const btn=el('button',{class:'btn btn-primary',style:'width:100%;margin-top:4px;',onclick:doLogin},'Entrar');
  card.appendChild(btn); card.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();}); wrap.appendChild(card); s.appendChild(wrap);
}
async function doLogin(){
  const username=$('#li-user').value.trim(),password=$('#li-pass').value;
  if(!username||!password)return toast('Completa todos los campos','error');
  const res=await window.api.login({username,password});
  if(!res.ok)return toast(res.error||'Error','error');
  state.currentUser=res.user;
  await refreshAllPersonNames();
  if(res.user.role==='admin'){renderHome();show('s-home');}
  else{renderContadorView();show('s-contador');}
}
function doLogout(){state.currentUser=null;renderLogin();show('s-login');}

// ─── HOME ─────────────────────────────────────────────────────────
function renderHome(){
  const s=document.getElementById('s-home'); s.innerHTML='';
  const tb=el('div',{class:'topbar'});
  const left=el('div',{class:'topbar-left'});
  const orgSpan=el('span',{class:'org-name-display'},state.orgName);
  const editOrgBtn=el('button',{class:'btn-icon',style:'color:rgba(255,255,255,0.7);',title:'Editar nombre',onclick:()=>editOrgName(orgSpan)});
  editOrgBtn.appendChild(svgIcon(ICONS.edit,15));
  left.appendChild(el('span',{class:'topbar-title'},'Panel de administrador'));
  left.appendChild(orgSpan); left.appendChild(editOrgBtn); tb.appendChild(left);
  const tbRight=el('div',{style:'display:flex;align-items:center;gap:8px;'});
  const logoutBtn=el('button',{class:'btn btn-ghost btn-sm',onclick:doLogout});
  logoutBtn.appendChild(svgIcon(ICONS.logout,14)); logoutBtn.appendChild(document.createTextNode(' Cerrar sesión'));
  tbRight.appendChild(logoutBtn); addLogoToTopbar(tbRight); tb.appendChild(tbRight); s.appendChild(tb);

  const content=el('div',{class:'content',style:'text-align:center;'});
  const btns=el('div',{class:'home-btns'});
  const bCont=el('button',{class:'big-btn',onclick:()=>{renderContadores();show('s-contadores');}});
  bCont.appendChild(svgIcon(ICONS.users,36)); bCont.appendChild(document.createTextNode('Contadores'));
  const bContab=el('button',{class:'big-btn',onclick:()=>{renderContabilidad();show('s-contabilidad');}});
  bContab.appendChild(svgIcon(ICONS.book,36)); bContab.appendChild(document.createTextNode('Contabilidad'));
  btns.appendChild(bCont); btns.appendChild(bContab); content.appendChild(btns);

  const adminRow=el('div',{style:'display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap;'});
  const mkAdminBtn=(icon,label,fn)=>{const b=el('button',{class:'btn btn-sm',onclick:fn});b.appendChild(svgIcon(icon,13));b.appendChild(document.createTextNode(' '+label));return b;};
  adminRow.appendChild(mkAdminBtn(ICONS.key,'Cambiar contraseña',showChangePassword));
  adminRow.appendChild(mkAdminBtn(ICONS.download,'Copia de seguridad',async()=>{const r=await window.api.backupSave();if(r&&r.ok)toast('Copia guardada');}));
  adminRow.appendChild(mkAdminBtn(ICONS.upload,'Cargar copia',showRestoreBackup));
  adminRow.appendChild(mkAdminBtn(ICONS.image,state.logo?'Cambiar logo':'Añadir logo',showLogoManager));
  content.appendChild(adminRow); s.appendChild(content);
}

function editOrgName(span){
  const input=el('input',{class:'org-name-input',type:'text',value:state.orgName});
  span.replaceWith(input); input.focus();
  const save=async()=>{const val=input.value.trim()||state.orgName;state.orgName=val;await window.api.configSet('org_name',val);const ns=el('span',{class:'org-name-display'},val);input.replaceWith(ns);};
  input.addEventListener('blur',save); input.addEventListener('keydown',e=>{if(e.key==='Enter')save();});
}

function showChangePassword(){
  const ov=el('div',{class:'overlay',onclick:e=>{if(e.target===ov)ov.remove();}});
  const popup=el('div',{class:'popup'});
  popup.innerHTML='<div class="popup-title">Cambiar contraseña de administrador</div>';
  const mkFg=(lbl,ph,type='password')=>{const g=el('div',{class:'form-group'});g.innerHTML=`<label>${lbl}</label>`;const i=el('input',{type,placeholder:ph});g.appendChild(i);return{g,i};};
  const{g:g1,i:old}=mkFg('Contraseña actual','Contraseña actual');
  const{g:g2,i:nw}=mkFg('Nueva contraseña','Mínimo 4 caracteres');
  const{g:g3,i:nw2}=mkFg('Repite nueva contraseña','Repite la nueva contraseña');
  popup.appendChild(g1);popup.appendChild(g2);popup.appendChild(g3);
  const actions=el('div',{class:'popup-actions'});
  actions.appendChild(el('button',{class:'btn',onclick:()=>ov.remove()},'Cancelar'));
  actions.appendChild(el('button',{class:'btn btn-primary',onclick:async()=>{
    if(nw.value.length<4)return toast('Mínimo 4 caracteres','error');
    if(nw.value!==nw2.value)return toast('Las contraseñas no coinciden','error');
    const r=await window.api.adminChangePassword({oldPassword:old.value,newPassword:nw.value});
    if(r.ok){ov.remove();toast('Contraseña cambiada');}else toast(r.error||'Error','error');
  }},'Cambiar'));
  popup.appendChild(actions);ov.appendChild(popup);document.body.appendChild(ov);setTimeout(()=>old.focus(),50);
}

function showLogoManager(){
  const ov=el('div',{class:'overlay',onclick:e=>{if(e.target===ov)ov.remove();}});
  const popup=el('div',{class:'popup'});
  popup.innerHTML='<div class="popup-title">Logo de la organización</div>';
  if(state.logo){const p=el('div',{style:'text-align:center;margin-bottom:12px;'});p.appendChild(makeLogo(80));popup.appendChild(p);}
  else popup.appendChild(el('p',{class:'popup-msg'},'No hay logo. Añade una imagen PNG, JPG o WebP.'));
  const actions=el('div',{class:'popup-actions',style:'flex-direction:column;gap:8px;'});
  const pick=el('button',{class:'btn btn-primary',style:'width:100%;',onclick:async()=>{
    const r=await window.api.logoPick();
    if(r.ok){state.logo=r.logo;ov.remove();toast('Logo actualizado');renderHome();show('s-home');}
  }},state.logo?'Cambiar imagen':'Seleccionar imagen');
  actions.appendChild(pick);
  if(state.logo){const rm=el('button',{class:'btn btn-danger',style:'width:100%;',onclick:async()=>{await window.api.logoRemove();state.logo=null;ov.remove();toast('Logo eliminado');renderHome();show('s-home');}});rm.textContent='Eliminar logo';actions.appendChild(rm);}
  actions.appendChild(el('button',{class:'btn',style:'width:100%;',onclick:()=>ov.remove()},'Cerrar'));
  popup.appendChild(actions);ov.appendChild(popup);document.body.appendChild(ov);
}

function showRestoreBackup(){
  const input=document.createElement('input');input.type='file';input.accept='.db';
  input.onchange=async()=>{
    const file=input.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=async e=>{
      const arr=new Uint8Array(e.target.result);
      const magic=String.fromCharCode(...arr.slice(0,6));
      if(magic!=='SQLite')return toast('Este archivo no es una copia de seguridad válida','error');
      confirmDialog('¿Seguro que quieres cargar esta copia de seguridad? Los datos se combinarán con los actuales. Si ya tienes los mismos registros, no se duplicarán.',async()=>{
        const result=await window.api.backupRestore({buffer:Array.from(arr)});
        if(result&&result.ok){toast('Copia cargada. Reiniciando...');setTimeout(()=>window.location.reload(),1500);}
        else toast((result&&result.error)||'Error al cargar la copia','error');
      },false);
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

// ─── CONTADORES ───────────────────────────────────────────────────
async function renderContadores(){
  const s=document.getElementById('s-contadores');s.innerHTML='';
  const list=await window.api.contadoresList();
  const tb=makeTopbar('Contadores',()=>{renderHome();show('s-home');});addLogoToTopbar(tb);s.appendChild(tb);
  const content=el('div',{class:'content'});
  const sr=el('div',{class:'search-row'});
  const si=el('input',{type:'text',placeholder:'Buscar contador...'});
  si.addEventListener('input',()=>$$('.contador-card',listEl).forEach(c=>c.style.display=c.dataset.name.toLowerCase().includes(si.value.toLowerCase())?'':'none'));
  const ab=el('button',{class:'btn btn-primary',onclick:()=>showContadorPopup({mode:'add'})});
  ab.appendChild(svgIcon(ICONS.plus,14));ab.appendChild(document.createTextNode(' Añadir contador'));
  sr.appendChild(si);sr.appendChild(ab);content.appendChild(sr);
  const listEl=el('div',{id:'contadores-list'});
  renderContadoresList(list,listEl);content.appendChild(listEl);s.appendChild(content);
}

function renderContadoresList(list,container){
  container.innerHTML='';
  if(!list.length){container.appendChild(el('div',{class:'empty-state'},'No hay contadores. Añade el primero.'));return;}
  list.forEach(c=>{
    const card=el('div',{class:'contador-card card','data-name':c.username});
    const info=el('div',{class:'card-info'});
    const title=el('span',{class:'card-title'},c.username);
    if(!c.active)title.appendChild(el('span',{class:'badge-inactive'},'Inactivo'));
    info.appendChild(title);card.appendChild(info);
    const actions=el('div',{class:'card-actions'});
    const tb=el('button',{class:'btn-icon',title:c.active?'Desactivar':'Activar',onclick:()=>{
      confirmDialog(c.active?`¿Desactivar a "${c.username}"?`:`¿Activar a "${c.username}"?`,async()=>{
        await window.api.contadoresToggle(c.id);
        renderContadoresList(await window.api.contadoresList(),document.getElementById('contadores-list'));
      },c.active);
    }});
    tb.appendChild(svgIcon(c.active?ICONS.x:ICONS.plus,15));tb.style.color=c.active?'#a32d2d':'#1a3a5c';
    const eb=el('button',{class:'btn-icon',title:'Editar',onclick:()=>showContadorPopup({mode:'edit',contador:c})});eb.appendChild(svgIcon(ICONS.edit,15));
    const db2=el('button',{class:'btn-icon danger',title:'Eliminar',onclick:()=>confirmDialog(`¿Eliminar a "${c.username}"?`,async()=>{await window.api.contadoresDelete(c.id);renderContadoresList(await window.api.contadoresList(),document.getElementById('contadores-list'));})});
    db2.appendChild(svgIcon(ICONS.trash,15));
    actions.appendChild(tb);actions.appendChild(eb);actions.appendChild(db2);card.appendChild(actions);container.appendChild(card);
  });
}

function showContadorPopup({mode,contador}){
  const ov=el('div',{class:'overlay',onclick:e=>{if(e.target===ov)ov.remove();}});
  const popup=el('div',{class:'popup'});
  popup.innerHTML=`<div class="popup-title">${mode==='add'?'Añadir contador':'Modificar contador'}</div>`;
  const mkFg=(lbl,val,ph,type='text')=>{const g=el('div',{class:'form-group'});g.innerHTML=`<label>${lbl}</label>`;const i=el('input',{type,placeholder:ph,value:val||''});g.appendChild(i);return{g,i};};
  const{g:gn,i:nameI}=mkFg('Nombre',mode==='edit'?contador.username:'','Nombre del contador');
  const{g:gp,i:passI}=mkFg(mode==='edit'?'Nueva contraseña (vacío = no cambiar)':'Contraseña','','',  'password');
  const{g:gp2,i:pass2I}=mkFg('Repite contraseña','','','password');
  popup.appendChild(gn);popup.appendChild(gp);popup.appendChild(gp2);
  const actions=el('div',{class:'popup-actions'});
  actions.appendChild(el('button',{class:'btn',onclick:()=>ov.remove()},'Cancelar'));
  actions.appendChild(el('button',{class:'btn btn-primary',onclick:async()=>{
    const name=nameI.value.trim(),pass=passI.value,pass2=pass2I.value;
    if(!name)return toast('El nombre es obligatorio','error');
    if(mode==='add'){if(pass.length<4)return toast('Mínimo 4 caracteres','error');if(pass!==pass2)return toast('Las contraseñas no coinciden','error');const r=await window.api.contadoresAdd({username:name,password:pass});if(!r.ok)return toast(r.error||'Error','error');}
    else{if(pass&&pass.length<4)return toast('Mínimo 4 caracteres','error');if(pass&&pass!==pass2)return toast('Las contraseñas no coinciden','error');const r=await window.api.contadoresEdit({id:contador.id,username:name,password:pass||null});if(!r.ok)return toast(r.error||'Error','error');}
    ov.remove();renderContadoresList(await window.api.contadoresList(),document.getElementById('contadores-list'));toast(mode==='add'?'Contador añadido':'Actualizado');
  }},mode==='add'?'Guardar':'Modificar'));
  popup.appendChild(actions);ov.appendChild(popup);document.body.appendChild(ov);setTimeout(()=>nameI.focus(),50);
}

// ─── CONTABILIDAD ─────────────────────────────────────────────────
function renderContabilidad(tab='dia'){
  const s=document.getElementById('s-contabilidad');s.innerHTML='';
  const tb=makeTopbar('Contabilidad',()=>{renderHome();show('s-home');});addLogoToTopbar(tb);s.appendChild(tb);
  const content=el('div',{class:'content'});
  const nav=el('div',{class:'sub-nav'});
  [['dia','Registro por día'],['persona','Registro por persona'],['anual','Registro anual']].forEach(([id,label])=>{
    nav.appendChild(el('button',{class:'sub-nav-btn'+(tab===id?' active':''),onclick:()=>renderContabilidad(id)},label));
  });
  content.appendChild(nav);
  const tc=el('div',{id:'tab-content'});content.appendChild(tc);s.appendChild(content);
  if(tab==='dia')renderTabDia(tc);else if(tab==='persona')renderTabPersona(tc);else renderTabAnual(tc);
}

// ─── Tab: Día ────────────────────────────────────────────────────
async function renderTabDia(container){
  container.innerHTML='<p style="color:var(--text-muted);font-size:13px;">Cargando...</p>';
  const dias=await window.api.diasList();container.innerHTML='';
  const sr=el('div',{class:'search-row'});
  const si=el('input',{type:'text',placeholder:'Buscar por fecha (ej: 15-04-2026)...'});
  const ab=el('button',{class:'btn btn-primary',onclick:showNuevoDia});
  ab.appendChild(svgIcon(ICONS.plus,14));ab.appendChild(document.createTextNode(' Nuevo día'));
  sr.appendChild(si);sr.appendChild(ab);container.appendChild(sr);
  const listEl=el('div',{id:'dias-list'});
  renderDiasList(dias,listEl);container.appendChild(listEl);
  si.addEventListener('input',()=>$$('.dia-card',listEl).forEach(c=>c.style.display=c.dataset.fecha.includes(si.value.toLowerCase())?'':'none'));
}

function renderDiasList(dias,container){
  container.innerHTML='';
  if(!dias.length){container.appendChild(el('div',{class:'empty-state'},'No hay registros. Crea el primero.'));return;}
  dias.forEach(d=>{
    const card=el('div',{class:'dia-card card','data-fecha':d.fecha});
    const info=el('div',{class:'card-info'});
    info.appendChild(el('div',{class:'card-title'},d.fecha));
    info.appendChild(el('div',{class:'card-sub'},`Contador: ${JSON.parse(d.contadores||'[]').join(', ')}`));
    if(d.modified_by){
      const lines=d.modified_by.split('\n').filter(Boolean);
      const shown=lines.slice(-3);
      const hidden=lines.slice(0,-3);
      const modEl=el('div',{class:'card-mod'});
      const visibleText=el('span',{style:'white-space:pre-line;'},shown.join('\n'));
      modEl.appendChild(visibleText);
      if(hidden.length>0){
        const hiddenEl=el('span',{style:'white-space:pre-line;display:none;'},hidden.join('\n')+'\n');
        const moreBtn=el('button',{style:'background:none;border:none;cursor:pointer;color:var(--navy);font-size:11px;padding:0;margin-top:2px;display:block;',onclick:(e)=>{e.stopPropagation();hiddenEl.style.display=hiddenEl.style.display==='none'?'block':'none';moreBtn.textContent=hiddenEl.style.display==='none'?`Mostrar más (${hidden.length})`:'Mostrar menos';}},`Mostrar más (${hidden.length})`);
        modEl.insertBefore(hiddenEl,visibleText);modEl.appendChild(moreBtn);
      }
      info.appendChild(modEl);
    }
    card.appendChild(info);
    const actions=el('div',{class:'card-actions'});
    const eyeBtn=el('button',{class:'btn-icon',title:'Ver',onclick:()=>openDia(d.id,'view')});eyeBtn.appendChild(svgIcon(ICONS.eye,16));
    const editBtn=el('button',{class:'btn-icon',title:'Editar',onclick:()=>openDia(d.id,'edit')});editBtn.appendChild(svgIcon(ICONS.edit,16));
    const delBtn=el('button',{class:'btn-icon danger',title:'Eliminar',onclick:()=>confirmDialog(`¿Eliminar el registro del ${d.fecha}?`,async()=>{await window.api.diasDelete(d.id);renderDiasList(await window.api.diasList(),container);})});
    delBtn.appendChild(svgIcon(ICONS.trash,16));
    actions.appendChild(eyeBtn);actions.appendChild(editBtn);actions.appendChild(delBtn);card.appendChild(actions);container.appendChild(card);
  });
}


// ─── Date validation ──────────────────────────────────────────────
function diasEnMes(mes, anio) {
  const m = parseInt(mes);
  const a = parseInt(anio);
  if (m === 2) {
    const bisiesto = (a % 4 === 0 && a % 100 !== 0) || (a % 400 === 0);
    return bisiesto ? 29 : 28;
  }
  return [4,6,9,11].includes(m) ? 30 : 31;
}
function validarFecha(dStr, mStr, aStr) {
  const d = parseInt(dStr), m = parseInt(mStr), a = parseInt(aStr);
  if (!dStr || !aStr || isNaN(d) || isNaN(m) || isNaN(a)) return 'Completa todos los campos';
  if (d < 1) return 'El día debe ser al menos 1';
  const maxDias = diasEnMes(m, a);
  if (d > maxDias) return `El mes seleccionado solo tiene ${maxDias} días`;
  return null;
}

function showNuevoDia(){
  const ov=el('div',{class:'overlay',onclick:e=>{if(e.target===ov)ov.remove();}});
  const popup=el('div',{class:'popup'});popup.innerHTML='<div class="popup-title">Nuevo registro por día</div>';
  const row=el('div',{style:'display:flex;gap:8px;'});
  const dg=el('div',{class:'form-group',style:'flex:1;'});dg.innerHTML='<label>Día</label>';const di=el('input',{type:'number',min:'1',max:'31',placeholder:'15'});dg.appendChild(di);
  const mg=el('div',{class:'form-group',style:'flex:2;'});mg.innerHTML='<label>Mes</label>';const ms=el('select');MONTHS.forEach((m,i)=>{const o=el('option',{value:String(i+1).padStart(2,'0')},m);if(i===new Date().getMonth())o.setAttribute('selected','');ms.appendChild(o);});mg.appendChild(ms);
  const ag=el('div',{class:'form-group',style:'flex:1;'});ag.innerHTML='<label>Año</label>';const ai=el('input',{type:'number',value:String(new Date().getFullYear())});ag.appendChild(ai);
  row.appendChild(dg);row.appendChild(mg);row.appendChild(ag);popup.appendChild(row);
  const actions=el('div',{class:'popup-actions'});
  actions.appendChild(el('button',{class:'btn',onclick:()=>ov.remove()},'Cancelar'));
  actions.appendChild(el('button',{class:'btn btn-primary',onclick:async()=>{
    const d=di.value.trim().padStart(2,'0'),m=ms.value,a=ai.value.trim();
    const errV=validarFecha(di.value.trim(),m,a);
    if(errV)return toast(errV,'error');
    const res=await window.api.diasCreate({fecha:`${d}-${m}-${a}`,createdBy:state.currentUser.username});
    if(!res.ok)return toast(res.error||'Error','error');ov.remove();openDia(res.id,'edit');
  }},'Crear'));
  popup.appendChild(actions);ov.appendChild(popup);document.body.appendChild(ov);setTimeout(()=>di.focus(),50);
}

async function openDia(id,mode){
  state.currentDia=id;
  const dia=await window.api.diasGet(id);
  renderDiaDetalle(dia,mode);show('s-dia-detalle');
}

function renderDiaDetalle(dia,mode){
  const s=document.getElementById('s-dia-detalle');s.innerHTML='';
  const goBack=()=>{renderContabilidad('dia');show('s-contabilidad');};
  // Snapshot of original values to detect real changes
  const originalSnapshot=JSON.stringify(dia.filas.map(f=>({
    nombre:f.nombre||'',ofrenda:f.ofrenda!=null?String(f.ofrenda):'',
    ofrenda_especial:f.ofrenda_especial!=null?String(f.ofrenda_especial):'',
    diezmo:f.diezmo!=null?String(f.diezmo):'',
    descripcion_especial:f.descripcion_especial||''
  })));
  const onBack=()=>{
    if(mode!=='edit'){goBack();return;}
    const currentSnapshot=JSON.stringify($$('#dia-tbody tr').map(tr=>{
      const c=$$('input',tr);
      return{nombre:c[0]?.value.trim()||'',ofrenda:c[1]?.value||'',ofrenda_especial:c[2]?.value||'',diezmo:c[3]?.value||'',descripcion_especial:c[4]?.value.trim()||''};
    }));
    if(currentSnapshot===originalSnapshot){goBack();return;}
    confirmDialog('¿Salir sin guardar? Los cambios que hayas hecho se perderán.',()=>goBack(),true);
  };
  const tb=makeTopbar(`${mode==='edit'?'Editando':'Ver registro'} — ${dia.fecha}`,onBack);
  addLogoToTopbar(tb);s.appendChild(tb);
  const content=el('div',{class:'content'});
  const contadores=JSON.parse(dia.contadores||'[]').join(', ');
  const meta=el('div',{style:'margin-bottom:12px;font-size:13px;color:var(--text-muted);'});
  meta.innerHTML=`Contador: <strong>${contadores}</strong>${mode==='view'?' &nbsp;<span class="tag-readonly">Solo lectura</span>':''}`;
  content.appendChild(meta);
  if(mode==='edit'&&dia.modified_by){
    const modLines=dia.modified_by.split('\n').filter(Boolean);
    const modShown=modLines.slice(-3);
    const modHidden=modLines.slice(0,-3);
    const modWrap=el('div',{style:'font-size:11px;color:var(--red);margin-bottom:10px;'});
    if(modHidden.length>0){
      const hidEl=el('span',{style:'display:none;white-space:pre-line;'},modHidden.join('\n')+'\n');
      const moreBtn=el('button',{style:'background:none;border:none;cursor:pointer;color:#a32d2d;font-size:11px;padding:0;margin-bottom:2px;display:block;text-decoration:underline;',onclick:()=>{hidEl.style.display=hidEl.style.display==='none'?'block':'none';moreBtn.textContent=hidEl.style.display==='none'?`Mostrar más (${modHidden.length})`:'Mostrar menos';}},`Mostrar más (${modHidden.length})`);
      modWrap.appendChild(moreBtn);modWrap.appendChild(hidEl);
    }
    modWrap.appendChild(el('span',{style:'white-space:pre-line;'},modShown.join('\n')));
    content.appendChild(modWrap);
  }
  const wrap=el('div',{class:'excel-wrap'});
  const table=el('table',{class:'excel'});
  table.innerHTML=`<thead><tr><th style="width:25%">Nombre${mode==='edit'?' *':''}</th><th style="width:13%">Ofrenda</th><th style="width:13%">Ofrenda especial</th><th style="width:13%">Diezmo</th><th>Descripción ofrenda especial</th></tr></thead>`;
  const tbody=el('tbody',{id:'dia-tbody'});
  dia.filas.forEach((f,i)=>tbody.appendChild(makeFila(f,i,mode)));
  table.appendChild(tbody);wrap.appendChild(table);content.appendChild(wrap);
  if(mode==='edit'){
    const arb=el('button',{class:'btn add-rows-btn',onclick:async()=>{
      await window.api.diasAddRows({id:dia.id,count:10});
      const upd=await window.api.diasGet(dia.id);
      const tb2=document.getElementById('dia-tbody');
      upd.filas.slice(-10).forEach((f,i)=>tb2.appendChild(makeFila(f,upd.filas.length-10+i,'edit')));
    }});arb.appendChild(svgIcon(ICONS.plus,13));arb.appendChild(document.createTextNode(' Añadir 10 filas'));content.appendChild(arb);
  }
  content.appendChild(renderComments(dia.comentarios,dia.id,mode));
  const pa=el('div',{class:'page-actions'});
  if(mode==='view'){const dlb=el('button',{class:'btn btn-primary',onclick:()=>downloadPdfDia(dia)});dlb.appendChild(svgIcon(ICONS.download,15));dlb.appendChild(document.createTextNode(' Descargar PDF'));pa.appendChild(dlb);}
  else{const sb=el('button',{class:'btn btn-primary',onclick:()=>saveDia(dia.id)});sb.appendChild(document.createTextNode('Guardar cambios'));pa.appendChild(sb);}
  content.appendChild(pa);s.appendChild(content);
}

function makeFila(f,idx,mode){
  const tr=el('tr');
  [['nombre','text','Nombre...'],['ofrenda','number','0'],['ofrenda_especial','number','0'],['diezmo','number','0'],['descripcion_especial','text','Descripción...']].forEach(([field,type,ph])=>{
    const td=el('td',{style:'position:relative;'});
    if(mode==='edit'){
      const input=el('input',{type,placeholder:ph,value:f[field]!=null?String(f[field]):'','data-field':field,'data-idx':String(idx)});
      if(type==='number')input.setAttribute('step','0.01');
      if(field==='nombre'&&state.currentUser&&state.currentUser.role==='admin')attachNameAutocomplete(input);
      td.appendChild(input);
    }else{td.textContent=f[field]!=null&&f[field]!==''?String(f[field]):'—';}
    tr.appendChild(td);
  });
  return tr;
}

async function saveDia(id){
  const inputs=$$('#dia-tbody tr').map(tr=>{
    const cells=$$('input',tr);
    return{nombre:cells[0]?.value.trim()||null,ofrenda:cells[1]?.value!==''&&cells[1]?.value!=null?parseFloat(cells[1].value):null,ofrenda_especial:cells[2]?.value!==''&&cells[2]?.value!=null?parseFloat(cells[2].value):null,diezmo:cells[3]?.value!==''&&cells[3]?.value!=null?parseFloat(cells[3].value):null,descripcion_especial:cells[4]?.value.trim()||null};
  });
  for(const f of inputs){
    if(!f.nombre)continue;
    if(f.ofrenda==null&&f.ofrenda_especial==null&&f.diezmo==null)return toast('Si pones un nombre, debes poner al menos una ofrenda o diezmo','error');
    if(f.ofrenda_especial!=null&&!f.descripcion_especial)return toast('Si pones ofrenda especial, debes poner su descripción','error');
  }
  const res=await window.api.diasSave({id,filas:inputs,username:state.currentUser.username});
  if(res.ok){await refreshAllPersonNames();toast('Guardado correctamente');renderDiaDetalle(await window.api.diasGet(id),'edit');}
  else toast('Error al guardar','error');
}

function renderComments(comentarios,diaId,mode){
  const sec=el('div',{class:'comments-section'});
  sec.appendChild(el('div',{class:'comments-title'},'Comentarios'));
  if(!comentarios.length)sec.appendChild(el('div',{style:'font-size:13px;color:var(--text-muted);margin-bottom:8px;'},'Sin comentarios todavía.'));
  comentarios.forEach(c=>{const item=el('div',{class:'comment-item'});item.innerHTML=`<span class="comment-author">${c.autor}</span><span class="comment-date"> · ${c.created_at}</span><div class="comment-text">${c.texto}</div>`;sec.appendChild(item);});
  const row=el('div',{class:'comment-add'});
  const input=el('input',{type:'text',placeholder:'Añadir comentario...'});
  const btn=el('button',{class:'btn btn-primary btn-sm',onclick:async()=>{
    const texto=input.value.trim();if(!texto)return;
    await window.api.comentariosAdd({diaId,autor:state.currentUser.username,texto});
    input.value='';const upd=await window.api.diasGet(diaId);sec.replaceWith(renderComments(upd.comentarios,diaId,mode));
  }},'Enviar');
  input.addEventListener('keydown',e=>{if(e.key==='Enter')btn.click();});
  row.appendChild(input);row.appendChild(btn);sec.appendChild(row);return sec;
}

// ─── Tab: Persona ─────────────────────────────────────────────────
async function renderTabPersona(container){
  container.innerHTML='<p style="font-size:13px;color:var(--text-muted);">Cargando...</p>';
  const years=await window.api.personasYears();
  const currentYear=years[0]||String(new Date().getFullYear());
  const personas=await window.api.personasList(currentYear);
  container.innerHTML='';
  const tr=el('div',{class:'search-row'});
  const si=el('input',{type:'text',placeholder:'Buscar por nombre...'});
  const ys=el('select',{class:'year-select'});
  (years.length?years:[String(new Date().getFullYear())]).forEach(y=>{const o=el('option',{value:y},y);if(y===currentYear)o.setAttribute('selected','');ys.appendChild(o);});
  ys.addEventListener('change',async()=>renderPersonasList(await window.api.personasList(ys.value),listEl));
  tr.appendChild(si);tr.appendChild(ys);container.appendChild(tr);
  const listEl=el('div',{id:'personas-list'});renderPersonasList(personas,listEl);container.appendChild(listEl);
  si.addEventListener('input',()=>$$('.persona-card',listEl).forEach(c=>c.style.display=c.dataset.nombre.toLowerCase().includes(si.value.toLowerCase())?'':'none'));
}

function renderPersonasList(personas,container){
  container.innerHTML='';
  if(!personas.length){container.appendChild(el('div',{class:'empty-state'},'No hay personas registradas para este año.'));return;}
  personas.forEach(nombre=>{
    const card=el('div',{class:'persona-card card','data-nombre':nombre,style:'cursor:pointer;',onclick:()=>openPersona(nombre)});
    card.appendChild(el('div',{class:'card-info'},el('div',{class:'card-title'},nombre)));
    card.appendChild(el('span',{style:'color:var(--text-muted);font-size:18px;'},'›'));
    container.appendChild(card);
  });
}

async function openPersona(nombre){
  const years=await window.api.personasYears();
  renderPersonaDetalle(nombre,years[0]||String(new Date().getFullYear()),years);
  show('s-persona-detalle');
}

async function renderPersonaDetalle(nombre,year,years){
  const s=document.getElementById('s-persona-detalle');s.innerHTML='';
  const data=await window.api.personasData({nombre,year});
  const tb=makeTopbar(nombre,()=>{renderContabilidad('persona');show('s-contabilidad');});addLogoToTopbar(tb);s.appendChild(tb);
  const content=el('div',{class:'content'});
  const header=el('div',{class:'persona-header'});
  const ys=el('select',{class:'year-select'});
  (years&&years.length?years:[String(new Date().getFullYear())]).forEach(y=>{const o=el('option',{value:y},y);if(y===year)o.setAttribute('selected','');ys.appendChild(o);});
  ys.addEventListener('change',async()=>renderPersonaDetalle(nombre,ys.value,await window.api.personasYears()));
  let showingFechas=false;
  const toggleBtn=el('button',{class:'btn btn-sm',onclick:()=>{
    showingFechas=!showingFechas;toggleBtn.textContent=showingFechas?'Mostrar año':'Mostrar fechas';
    resumenDiv.style.display=showingFechas?'none':'';fechasDiv.style.display=showingFechas?'':'none';
  }},'Mostrar fechas');
  header.appendChild(ys);header.appendChild(toggleBtn);content.appendChild(header);

  // Resumen mensual
  const resumenDiv=el('div');
  const rw=el('div',{class:'excel-wrap'});
  const tbl=el('table',{class:'excel'});
  tbl.innerHTML='<thead><tr><th>Mes</th><th>Ofrenda</th><th>Ofrenda especial</th><th>Diezmo</th></tr></thead>';
  const tbody=el('tbody');
  let totOf=0,totEsp=0,totDiezmo=0;
  data.months.forEach((m,i)=>{
    totOf+=m.ofrenda;totEsp+=m.ofrenda_especial;totDiezmo+=m.diezmo;
    const tr=el('tr');
    const fmt=v=>`${v>0?v:0} €`;
    tr.innerHTML=`<td>${MONTHS[i]}</td><td style="text-align:center;">${fmt(m.ofrenda)}</td><td style="text-align:center;">${fmt(m.ofrenda_especial)}</td><td style="text-align:center;">${fmt(m.diezmo)}</td>`;
    tbody.appendChild(tr);
  });
  const totRow=el('tr',{class:'total-row'});
  const fmtT=v=>`${v>0?v:0} €`;
  totRow.innerHTML=`<td><strong>Total</strong></td><td style="text-align:center;"><strong>${fmtT(totOf)}</strong></td><td style="text-align:center;"><strong>${fmtT(totEsp)}</strong></td><td style="text-align:center;"><strong>${fmtT(totDiezmo)}</strong></td>`;
  const totGenRow=el('tr');
  totGenRow.innerHTML=`<td colspan="3" style="border:none;background:transparent;"></td><td style="background:white;border:2px solid var(--navy);border-radius:6px;font-size:18px;font-weight:700;color:var(--navy);text-align:center;padding:12px;">${totOf+totEsp+totDiezmo} €</td>`;
  tbody.appendChild(totRow);tbody.appendChild(totGenRow);tbl.appendChild(tbody);rw.appendChild(tbl);resumenDiv.appendChild(rw);
  const dlBtn=el('button',{class:'btn btn-primary',style:'margin-top:12px;',onclick:()=>downloadPdfPersona(nombre,year,data.months)});
  dlBtn.appendChild(svgIcon(ICONS.download,15));dlBtn.appendChild(document.createTextNode(' Descargar PDF'));
  resumenDiv.appendChild(dlBtn);content.appendChild(resumenDiv);

  // Detalle por fecha
  const fechasDiv=el('div',{style:'display:none;'});
  const fw=el('div',{class:'excel-wrap'});
  const ftbl=el('table',{class:'excel'});
  ftbl.innerHTML='<thead><tr><th>Fecha</th><th>Ofrenda</th><th>Ofrenda especial</th><th>Diezmo</th><th>Descripción</th></tr></thead>';
  const ftbody=el('tbody');
  data.porFecha.forEach(f=>{
    const tr=el('tr');
    const fmtf=v=>v>0?`${v} €`:'0 €';
    tr.innerHTML=`<td>${f.fecha}</td><td style="text-align:center;">${fmtf(f.ofrenda)}</td><td style="text-align:center;">${fmtf(f.ofrenda_especial)}</td><td style="text-align:center;">${fmtf(f.diezmo)}</td><td>${f.descripciones||''}</td>`;
    ftbody.appendChild(tr);
  });
  ftbl.appendChild(ftbody);fw.appendChild(ftbl);fechasDiv.appendChild(fw);
  const addBtn=el('button',{class:'btn add-rows-btn',onclick:()=>showAddFilaPersona(nombre,year,async()=>renderPersonaDetalle(nombre,year,await window.api.personasYears()))});
  addBtn.appendChild(svgIcon(ICONS.plus,13));addBtn.appendChild(document.createTextNode(' Añadir fila'));
  fechasDiv.appendChild(addBtn);content.appendChild(fechasDiv);s.appendChild(content);
}

function showAddFilaPersona(nombre,year,onSave){
  const ov=el('div',{class:'overlay',onclick:e=>{if(e.target===ov)ov.remove();}});
  const popup=el('div',{class:'popup'});popup.innerHTML=`<div class="popup-title">Añadir ofrenda — ${nombre}</div>`;
  const row=el('div',{style:'display:flex;gap:8px;'});
  const dg=el('div',{class:'form-group',style:'flex:1;'});dg.innerHTML='<label>Día</label>';const di=el('input',{type:'number',min:'1',max:'31',placeholder:'15'});dg.appendChild(di);
  const mg=el('div',{class:'form-group',style:'flex:2;'});mg.innerHTML='<label>Mes</label>';const ms=el('select');MONTHS.forEach((m,i)=>{ms.appendChild(el('option',{value:String(i+1).padStart(2,'0')},m));});mg.appendChild(ms);
  const ag=el('div',{class:'form-group',style:'flex:1;'});ag.innerHTML='<label>Año</label>';const ai=el('input',{type:'number',value:year});ag.appendChild(ai);
  row.appendChild(dg);row.appendChild(mg);row.appendChild(ag);popup.appendChild(row);
  const mkFld=(lbl,ph,type='number')=>{const g=el('div',{class:'form-group'});g.innerHTML=`<label>${lbl}</label>`;const i=el('input',{type,placeholder:ph,step:'0.01'});g.appendChild(i);return{g,i};};
  const{g:og,i:oi}=mkFld('Ofrenda','0');const{g:eg,i:ei}=mkFld('Ofrenda especial','0');const{g:dg2,i:di2}=mkFld('Diezmo','0');const{g:descg,i:desci}=mkFld('Descripción ofrenda especial','Descripción...','text');
  popup.appendChild(og);popup.appendChild(eg);popup.appendChild(dg2);popup.appendChild(descg);
  const actions=el('div',{class:'popup-actions'});
  actions.appendChild(el('button',{class:'btn',onclick:()=>ov.remove()},'Cancelar'));
  actions.appendChild(el('button',{class:'btn btn-primary',onclick:async()=>{
    const d=di.value.trim().padStart(2,'0'),m=ms.value,a=ai.value.trim();
    const ofrenda=oi.value!==''?parseFloat(oi.value):null;
    const ofrenda_especial=ei.value!==''?parseFloat(ei.value):null;
    const diezmo=di2.value!==''?parseFloat(di2.value):null;
    const desc=desci.value.trim()||null;
    if(!d||!a)return toast('Fecha incompleta','error');
    if(ofrenda==null&&ofrenda_especial==null&&diezmo==null)return toast('Pon al menos una ofrenda o diezmo','error');
    if(ofrenda_especial!=null&&!desc)return toast('Falta descripción de ofrenda especial','error');
    const res=await window.api.personasAddFila({nombre,fecha:`${d}-${m}-${a}`,ofrenda,ofrenda_especial,descripcion_especial:desc,diezmo,currentUser:state.currentUser.username});
    if(!res.ok)return toast('Error al guardar','error');
    ov.remove();toast('Fila añadida');onSave();
  }},'Guardar'));
  popup.appendChild(actions);ov.appendChild(popup);document.body.appendChild(ov);
}

// ─── Tab: Anual ───────────────────────────────────────────────────
async function renderTabAnual(container){
  container.innerHTML='<p style="font-size:13px;color:var(--text-muted);">Cargando...</p>';
  const years=await window.api.personasYears();
  await buildAnualTable(container,years[0]||String(new Date().getFullYear()),years);
}

async function buildAnualTable(container,year,years){
  const personas=await window.api.personasList(year);
  container.innerHTML='';
  const tr=el('div',{class:'search-row'});
  const si=el('input',{type:'text',placeholder:'Buscar persona...'});
  const ys=el('select',{class:'year-select'});
  (years&&years.length?years:[String(new Date().getFullYear())]).forEach(y=>{const o=el('option',{value:y},y);if(y===year)o.setAttribute('selected','');ys.appendChild(o);});
  ys.addEventListener('change',async()=>buildAnualTable(container,ys.value,await window.api.personasYears()));
  tr.appendChild(si);tr.appendChild(ys);container.appendChild(tr);

  if(!personas.length){container.appendChild(el('div',{class:'empty-state'},'No hay datos para este año.'));return;}
  const allData=await Promise.all(personas.map(n=>window.api.personasData({nombre:n,year})));

  const dlRow=el('div',{style:'margin-bottom:12px;'});
  const dlBtn=el('button',{class:'btn btn-primary',onclick:()=>downloadXlsxAnual(year)});
  dlBtn.appendChild(svgIcon(ICONS.download,14));dlBtn.appendChild(document.createTextNode(` Descargar Excel ${year}`));
  dlRow.appendChild(dlBtn);container.appendChild(dlRow);

  const wrap=el('div',{class:'anual-wrap'});
  const table=el('table',{class:'anual'});
  const hr1=el('tr');hr1.appendChild(el('th',{class:'name-col',rowspan:'2'},'Nombre'));
  MONTHS.forEach(m=>hr1.appendChild(el('th',{colspan:'3',style:'text-align:center;'},m)));
  // Total columns header
  hr1.appendChild(el('th',{colspan:'3',style:'text-align:center;background:#0f2540;'},`Total ${year}`));
  hr1.appendChild(el('th',{rowspan:'2',style:'text-align:center;background:#0a1a30;min-width:60px;'},'Total general'));
  const hr2=el('tr',{class:'subheader'});
  MONTHS.forEach(()=>{hr2.appendChild(el('th',{},'Ofrenda'));hr2.appendChild(el('th',{},'Ofrenda especial'));hr2.appendChild(el('th',{},'Diezmo'));});
  // Total subheader
  hr2.appendChild(el('th',{style:'background:#0f2540;'},'Ofrenda'));
  hr2.appendChild(el('th',{style:'background:#0f2540;'},'Ofr. especial'));
  hr2.appendChild(el('th',{style:'background:#0f2540;'},'Diezmo'));
  const thead=el('thead');thead.appendChild(hr1);thead.appendChild(hr2);table.appendChild(thead);
  const tbody=el('tbody',{id:'anual-tbody'});
  personas.forEach((nombre,idx)=>{
    const d=allData[idx];
    const tr2=el('tr',{class:'anual-row','data-nombre':nombre});
    tr2.appendChild(el('td',{class:'name-cell'},nombre));
    let totOf=0,totEsp=0,totDi=0;
    const fmtA=v=>`${v>0?v:0} €`;
    d.months.forEach(m=>{
      totOf+=m.ofrenda;totEsp+=m.ofrenda_especial;totDi+=m.diezmo;
      tr2.appendChild(el('td',{style:'text-align:center;'},fmtA(m.ofrenda)));
      tr2.appendChild(el('td',{style:'text-align:center;'},fmtA(m.ofrenda_especial)));
      tr2.appendChild(el('td',{style:'text-align:center;'},fmtA(m.diezmo)));
    });
    tr2.appendChild(el('td',{style:'background:#e6f1fb;font-weight:600;text-align:center;'},fmtA(totOf)));
    tr2.appendChild(el('td',{style:'background:#e6f1fb;font-weight:600;text-align:center;'},fmtA(totEsp)));
    tr2.appendChild(el('td',{style:'background:#e6f1fb;font-weight:600;text-align:center;'},fmtA(totDi)));
    tr2.appendChild(el('td',{style:'background:white;border:2px solid var(--navy);font-size:15px;font-weight:700;color:var(--navy);text-align:center;padding:6px 10px;'},`${totOf+totEsp+totDi>0?totOf+totEsp+totDi:0} €`));
    tbody.appendChild(tr2);
  });
  table.appendChild(tbody);wrap.appendChild(table);container.appendChild(wrap);
  si.addEventListener('input',()=>$$('.anual-row',tbody).forEach(r=>r.style.display=r.dataset.nombre.toLowerCase().includes(si.value.toLowerCase())?'':'none'));
  container.appendChild(el('p',{style:'font-size:12px;color:var(--text-muted);margin-top:8px;'},'Solo lectura. No editable.'));
}

// ─── CONTADOR VIEW ────────────────────────────────────────────────
async function renderContadorView(){
  const s=document.getElementById('s-contador');s.innerHTML='';
  const tb=el('div',{class:'topbar'});
  const left=el('div',{class:'topbar-left'});left.appendChild(el('span',{class:'topbar-title'},`Mis registros — ${state.currentUser.username}`));tb.appendChild(left);
  const right=el('div',{style:'display:flex;align-items:center;gap:8px;'});
  const lb=el('button',{class:'btn btn-ghost btn-sm',onclick:doLogout});lb.appendChild(svgIcon(ICONS.logout,14));lb.appendChild(document.createTextNode(' Cerrar sesión'));
  right.appendChild(lb);addLogoToTopbar(right);tb.appendChild(right);s.appendChild(tb);
  const content=el('div',{class:'content'});
  const dias=await window.api.diasList();
  const misDias=dias.filter(d=>JSON.parse(d.contadores||'[]').includes(state.currentUser.username));
  const sr=el('div',{class:'search-row'});
  const si=el('input',{type:'text',placeholder:'Buscar por fecha...'});
  const ab=el('button',{class:'btn btn-primary',onclick:showNuevoDiaContador});ab.appendChild(svgIcon(ICONS.plus,14));ab.appendChild(document.createTextNode(' Nuevo día'));
  sr.appendChild(si);sr.appendChild(ab);content.appendChild(sr);
  const listEl=el('div',{id:'contador-dias-list'});
  renderContadorDiasList(misDias,listEl);content.appendChild(listEl);
  si.addEventListener('input',()=>$$('.dia-card',listEl).forEach(c=>c.style.display=c.dataset.fecha.includes(si.value.toLowerCase())?'':'none'));
  s.appendChild(content);
}

function renderContadorDiasList(dias,container){
  container.innerHTML='';
  if(!dias.length){container.appendChild(el('div',{class:'empty-state'},'No tienes registros todavía.'));return;}
  dias.forEach(d=>{
    const card=el('div',{class:'dia-card card','data-fecha':d.fecha});
    const info=el('div',{class:'card-info'});info.appendChild(el('div',{class:'card-title'},d.fecha));
    if(d.modified_by)info.appendChild(el('div',{class:'card-mod'},d.modified_by));
    card.appendChild(info);
    const actions=el('div',{class:'card-actions'});
    const eb=el('button',{class:'btn-icon',title:'Ver',onclick:()=>openDiaContador(d.id,'view')});eb.appendChild(svgIcon(ICONS.eye,16));
    const ed=el('button',{class:'btn-icon',title:'Editar',onclick:()=>openDiaContador(d.id,'edit')});ed.appendChild(svgIcon(ICONS.edit,16));
    actions.appendChild(eb);actions.appendChild(ed);card.appendChild(actions);container.appendChild(card);
  });
}

async function openDiaContador(id,mode){
  state.currentDia=id;const dia=await window.api.diasGet(id);renderDiaDetalleContador(dia,mode);show('s-dia-contador');
}

function renderDiaDetalleContador(dia,mode){
  const s=document.getElementById('s-dia-contador');s.innerHTML='';
  const tb=makeTopbar(`${mode==='edit'?'Editando':'Ver'} — ${dia.fecha}`,()=>{renderContadorView();show('s-contador');});addLogoToTopbar(tb);s.appendChild(tb);
  const content=el('div',{class:'content'});
  if(mode==='view')content.appendChild(el('p',{style:'font-size:13px;color:var(--text-muted);margin-bottom:12px;'},'Solo lectura'));
  const wrap=el('div',{class:'excel-wrap'});
  const table=el('table',{class:'excel'});
  table.innerHTML=`<thead><tr><th style="width:25%">Nombre${mode==='edit'?' *':''}</th><th style="width:13%">Ofrenda</th><th style="width:13%">Ofrenda especial</th><th style="width:13%">Diezmo</th><th>Descripción ofrenda especial</th></tr></thead>`;
  const tbody=el('tbody',{id:'dia-tbody'});
  dia.filas.forEach((f,i)=>tbody.appendChild(makeFila(f,i,mode)));
  table.appendChild(tbody);wrap.appendChild(table);content.appendChild(wrap);
  if(mode==='edit'){
    const arb=el('button',{class:'btn add-rows-btn',onclick:async()=>{await window.api.diasAddRows({id:dia.id,count:10});const upd=await window.api.diasGet(dia.id);const tb2=document.getElementById('dia-tbody');upd.filas.slice(-10).forEach((f,i)=>tb2.appendChild(makeFila(f,upd.filas.length-10+i,'edit')));}}); 
    arb.appendChild(svgIcon(ICONS.plus,13));arb.appendChild(document.createTextNode(' Añadir 10 filas'));content.appendChild(arb);
  }
  content.appendChild(renderComments(dia.comentarios,dia.id,mode));
  if(mode==='edit'){
    const sb=el('button',{class:'btn btn-primary',style:'margin-top:16px;',onclick:async()=>{
      const inputs=$$('#dia-tbody tr').map(tr=>{const c=$$('input',tr);return{nombre:c[0]?.value.trim()||null,ofrenda:c[1]?.value!==''&&c[1]?.value!=null?parseFloat(c[1].value):null,ofrenda_especial:c[2]?.value!==''&&c[2]?.value!=null?parseFloat(c[2].value):null,diezmo:c[3]?.value!==''&&c[3]?.value!=null?parseFloat(c[3].value):null,descripcion_especial:c[4]?.value.trim()||null};});
      for(const f of inputs){if(!f.nombre)continue;if(f.ofrenda==null&&f.ofrenda_especial==null&&f.diezmo==null)return toast('Si pones nombre debes poner una ofrenda o diezmo','error');if(f.ofrenda_especial!=null&&!f.descripcion_especial)return toast('Falta descripción de ofrenda especial','error');}
      const res=await window.api.diasSave({id:dia.id,filas:inputs,username:state.currentUser.username});
      if(res.ok){toast('Guardado');renderContadorView();show('s-contador');}else toast('Error al guardar','error');
    }});sb.textContent='Guardar cambios';content.appendChild(sb);
  }
  s.appendChild(content);
}

function showNuevoDiaContador(){
  const ov=el('div',{class:'overlay',onclick:e=>{if(e.target===ov)ov.remove();}});
  const popup=el('div',{class:'popup'});popup.innerHTML='<div class="popup-title">Nuevo registro por día</div>';
  const row=el('div',{style:'display:flex;gap:8px;'});
  const dg=el('div',{class:'form-group',style:'flex:1;'});dg.innerHTML='<label>Día</label>';const di=el('input',{type:'number',min:'1',max:'31',placeholder:'15'});dg.appendChild(di);
  const mg=el('div',{class:'form-group',style:'flex:2;'});mg.innerHTML='<label>Mes</label>';const ms=el('select');MONTHS.forEach((m,i)=>{const o=el('option',{value:String(i+1).padStart(2,'0')},m);if(i===new Date().getMonth())o.setAttribute('selected','');ms.appendChild(o);});mg.appendChild(ms);
  const ag=el('div',{class:'form-group',style:'flex:1;'});ag.innerHTML='<label>Año</label>';const ai=el('input',{type:'number',value:String(new Date().getFullYear())});ag.appendChild(ai);
  row.appendChild(dg);row.appendChild(mg);row.appendChild(ag);popup.appendChild(row);
  const actions=el('div',{class:'popup-actions'});
  actions.appendChild(el('button',{class:'btn',onclick:()=>ov.remove()},'Cancelar'));
  actions.appendChild(el('button',{class:'btn btn-primary',onclick:async()=>{
    const d=di.value.trim().padStart(2,'0'),m=ms.value,a=ai.value.trim();
    const err2=validarFecha(di.value.trim(),m,a);
    if(err2)return toast(err2,'error');
    const res=await window.api.diasCreate({fecha:`${d}-${m}-${a}`,createdBy:state.currentUser.username});
    if(!res.ok)return toast(res.error||'Error','error');ov.remove();openDiaContador(res.id,'edit');
  }},'Crear'));
  popup.appendChild(actions);ov.appendChild(popup);document.body.appendChild(ov);
}

// ─── Helpers ──────────────────────────────────────────────────────
function makeTopbar(title,onBack){
  const tb=el('div',{class:'topbar'});
  const left=el('div',{class:'topbar-left'});
  const bb=el('button',{class:'btn btn-ghost btn-sm',onclick:onBack});
  bb.appendChild(svgIcon(ICONS.back,14));bb.appendChild(document.createTextNode(' Volver'));
  left.appendChild(bb);left.appendChild(el('span',{class:'topbar-title'},title));tb.appendChild(left);
  return tb;
}

// ─── Init ─────────────────────────────────────────────────────────
async function init(){
  const{needsSetup}=await window.api.setupCheck();
  state.orgName=await window.api.configGet('org_name')||'';
  state.logo=await window.api.configGet('logo')||null;
  if(needsSetup){renderSetup();show('s-setup');}
  else{renderLogin();show('s-login');}
}
document.addEventListener('DOMContentLoaded',init);