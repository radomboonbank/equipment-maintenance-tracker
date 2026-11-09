(() => {
'use strict';
const groups=['ผู้บริหาร อปก','กคก-ส','กถก-ส','กสก-ส','กรก-ส','กบหก'];
const channel=new BroadcastChannel('grid-standby-v1'),client=crypto.randomUUID(),pending=new Map();
const overrides=new Map();
let group='ทั้งหมด',mayEdit=false,server='',ready=false,editing=null,saving=false,importing=false,importAttempted=false;
const $=id=>document.getElementById(id),search=$('standby-search'),body=$('standby-rows');
const buttons=[...document.querySelectorAll('[data-group]')],dialog=$('standby-editor'),form=$('standby-edit-form');
const labels=['ลำดับที่','รหัสพนักงาน','ชื่อ - สกุล','ตำแหน่ง','สังกัด','รายละเอียด','โทรศัพท์มือถือ'];
const visibleFields=[1,2,3,4,6];
const displayName=value=>value.replace(/^(?:นางสาว|น\.ส\.|นาย|นาง)\s*/,'');
const normalize=v=>v.toLocaleLowerCase('th').replace(/[\s-]/g,'');
function request(action,payload,timeout=5000) {
 return new Promise((resolve,reject)=>{
  const id=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);reject(Error('กรุณาเปิดแท็บหลักและเข้าสู่ระบบด้วย King Admin หรือ Super Admin'));},timeout);
  pending.set(id,{resolve,reject,timer,action,server:action==='session'?'':server});
  channel.postMessage({kind:'request',client,id,action,payload,server:action==='session'?'':server});
 });
}
channel.onmessage=({data:m})=>{
 if(m?.kind!=='response'||m.client!==client)return;
 const p=pending.get(m.id);if(!p)return;
 if(p.action==='session'&&!m.result?.canEdit)return;
 if(p.action==='save'&&m.server!==p.server)return;
 clearTimeout(p.timer);pending.delete(m.id);
 if(m.error)p.reject(Error(m.error));else{if(p.action==='session')server=m.server;p.resolve(m.result);}
};
async function refreshAccess(){
 try{const r=await request('session');mayEdit=!!r.canEdit;}catch{mayEdit=false;server='';}
 if(!mayEdit&&dialog.open&&!saving)dialog.close();
 render();
 void ensureImported();
}
function entries(){
 const prefix='g'+groups.indexOf(group)+'-';
 return [...overrides.entries()].filter(([key])=>group==='ทั้งหมด'||key.startsWith(prefix))
  .sort(([a],[b])=>Number(a.slice(1).split('-')[0])-Number(b.slice(1).split('-')[0])||Number(a.split('-')[1])-Number(b.split('-')[1]))
  .map(([key,value])=>({key,row:value.row,revision:value.revision}));
}
async function ensureImported(){
 if(!mayEdit||!ready||importing||importAttempted)return;
 importAttempted=true;importing=true;
 try{
  const {seedGroups}=await import('./standby-seed.js?v=20261108');
  const missing=seedGroups.flatMap((rows,i)=>rows.map((row,index)=>({key:'g'+i+'-'+index,row}))).filter(e=>!overrides.has(e.key));
  if(!missing.length)return;
  let completed=0;
  for(let i=0;i<missing.length;i+=4){
   $('standby-status').textContent='กำลังนำเข้ารายชื่อไป Firebase '+completed+' / '+missing.length+' รายการ';
   await Promise.all(missing.slice(i,i+4).map(async entry=>{
    if(overrides.has(entry.key)){completed++;return;}
    try{
     const saved=await request('save',{...entry,revision:0},30000);
     overrides.set(entry.key,{row:entry.row,revision:saved.revision});completed++;
    }catch(error){
     if(!overrides.has(entry.key))throw error;
     completed++;
    }
   }));
  }
  $('standby-status').textContent='ข้อมูล Standby ทั้งหมดจัดเก็บบน Firebase แล้ว';
  render();
 }catch(error){
  $('standby-status').textContent='นำเข้ายังไม่ครบ: '+error.message+' · เปิดหน้านี้ใหม่เพื่อลองต่อจากรายการที่เหลือ';
 }finally{importing=false;render();}
}
function render(){
 $('standby-edit-heading').hidden=!(mayEdit&&ready);
 const source=entries(),matches=source.filter(e=>normalize(e.row.join(' ')).includes(normalize(search.value.trim())));
 $('group-title').textContent=group==='ทั้งหมด'?'รายชื่อทั้งหมด':group;
 $('standby-count').textContent='แสดง '+matches.length+' จาก '+source.length+' รายชื่อ';
 $('standby-empty').hidden=matches.length>0;
 $('standby-empty').textContent='ไม่พบรายชื่อที่ตรงกับคำค้นหา';
 body.replaceChildren();
 for(const entry of matches){
  const tr=document.createElement('tr');
  visibleFields.forEach(index=>{
   const value=entry.row[index];
   const td=document.createElement('td');
   if(index===6&&/^0\d{9}$/.test(value)&&entry.row[2]!=='ว่าง'){
    const a=document.createElement('a');a.href='tel:'+value;a.textContent=value.replace(/(\d{3})(\d{3})(\d{4})/,'$1-$2-$3');
    a.setAttribute('aria-label','โทรหา '+displayName(entry.row[2])+' '+value);td.append(a);
   }else td.textContent=(index===2?displayName(value):value)||'—';
   tr.append(td);
  });
  if(mayEdit&&ready){
   const td=document.createElement('td'),b=document.createElement('button');
   b.type='button';b.textContent='แก้ไข';b.disabled=importing;b.setAttribute('aria-label','แก้ไข '+displayName(entry.row[2]));
   b.addEventListener('click',()=>openEditor(entry));td.append(b);tr.append(td);
  }
  body.append(tr);
 }
 buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===group)));
}
function openEditor(entry){
 if(!mayEdit||!ready||importing)return;
 editing={...entry,group};$('standby-edit-title').textContent='แก้ไขข้อมูล · '+groups[Number(entry.key.slice(1).split('-')[0])];
 $('standby-edit-message').textContent='';
 const fields=$('standby-edit-fields');fields.replaceChildren();
 visibleFields.forEach(i=>{
  const label=labels[i];
  const wrap=document.createElement('label');wrap.textContent=label;
  const input=document.createElement(i===5?'textarea':'input');
  input.name='field'+i;input.maxLength=2000;input.value=i===2?displayName(entry.row[i]):entry.row[i];
  if(i===2)input.required=true;
  if(i===6){input.inputMode='tel';input.maxLength=50;}
  wrap.append(input);fields.append(wrap);
 });
 dialog.showModal();
}
form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(saving)return;
 const message=$('standby-edit-message');
 if(!editing){message.textContent='ไม่พบรายการที่จะแก้ไข กรุณาปิดและเปิดรายการใหม่';return;}
 saving=true;$('standby-save').disabled=true;$('standby-cancel').disabled=true;
 message.textContent='กำลังตรวจสิทธิ์และบันทึกออนไลน์…';
 const record={...editing,row:[...editing.row]};
 try{
  const row=[...record.row];
  visibleFields.forEach(i=>{
   const input=form.querySelector('[name="field'+i+'"]');
   if(!input)throw Error('โหลดช่องแก้ไขไม่ครบ กรุณาปิดและเปิดรายการใหม่');
   row[i]=input.value.trim();
  });
  if(row[2]===displayName(record.row[2]))row[2]=record.row[2];
  row[6]=row[6].replace(/[\s()-]/g,'')||(row[6].trim()==='-'?'-':'');
  if(!row[2]||row[6]&&row[6]!=='-'&&row[2]!=='ว่าง'&&!/^0\d{9}$/.test(row[6]))throw Error('กรุณากรอกชื่อและเบอร์มือถือ 10 หลัก (เว้นว่างได้)');
  const access=await request('session');
  if(!access.canEdit)throw Error('บัญชีนี้ไม่มีสิทธิ์แก้ไขข้อมูล');
  const saved=await request('save',{key:record.key,row,revision:record.revision},30000);
  overrides.set(record.key,{row,revision:saved.revision});
  editing=null;
  dialog.close();
  $('standby-status').textContent='บันทึกข้อมูลออนไลน์แล้ว';
  render();
 }catch(error){
  message.textContent=error?.message||'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง';
  message.setAttribute('tabindex','-1');message.focus();
 }finally{
  saving=false;$('standby-save').disabled=false;$('standby-cancel').disabled=false;
 }
});
$('standby-cancel').addEventListener('click',()=>{if(!saving)dialog.close();});
dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();});
buttons.forEach(b=>b.addEventListener('click',()=>{group=b.dataset.group;search.value='';render();}));
$('standby-close').addEventListener('click',()=>{window.close();window.setTimeout(()=>window.location.assign('./'),150);});
search.addEventListener('input',render);
render();void refreshAccess();const accessTimer=setInterval(refreshAccess,6000);
window.addEventListener('focus',()=>void refreshAccess());
window.addEventListener('pagehide',()=>{clearInterval(accessTimer);channel.close();},{once:true});
async function connect(){
 try{
  const base='https://www.gstatic.com/firebasejs/13.0.0/';
  const [app,f]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-firestore.js')]);
  const instance=app.initializeApp(window.GRID_FIREBASE_CONFIG,'standby-directory'),db=f.getFirestore(instance);
  f.onSnapshot(f.collection(db,'StandbyContacts'),snapshot=>{
   overrides.clear();
   snapshot.docs.forEach(doc=>{const d=doc.data();if(Array.isArray(d.row)&&d.row.length===7&&d.row.every(v=>typeof v==='string'))overrides.set(doc.id,d);});
   ready=true;if(!importing&&!overrides.size)$('standby-status').textContent='ยังไม่มีรายชื่อใน Firebase · รอ King Admin หรือ Super Admin เข้าสู่ระบบเพื่อนำเข้าข้อมูล';render();void ensureImported();
  },()=>{ready=false;$('standby-status').textContent='โหลดข้อมูลออนไลน์ไม่ได้ กรุณารีเฟรชหน้าอีกครั้ง';render();});
 }catch{ready=false;$('standby-status').textContent='เชื่อมต่อข้อมูลออนไลน์ไม่ได้ กรุณาตรวจอินเทอร์เน็ต';render();}
}
void connect();

})();