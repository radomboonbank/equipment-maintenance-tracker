(() => {
'use strict';
const groups=['ผู้บริหาร อปก','กคก-ส','กถก-ส','กสก-ส','กรก-ส','กบหก'];
const channel=new BroadcastChannel('grid-standby-v1'),client=crypto.randomUUID(),pending=new Map();
const overrides=new Map();
let group='ทั้งหมด',mayEdit=false,mayUpload=false,server='',ready=false,editing=null,saving=false,importing=false,importAttempted=false;
const $=id=>document.getElementById(id),search=$('standby-search'),body=$('standby-rows');
const buttons=[...document.querySelectorAll('[data-group]')],dialog=$('standby-editor'),form=$('standby-edit-form');
const labels=['ลำดับที่','รหัสพนักงาน','ชื่อ - สกุล','ตำแหน่ง','สังกัด','รายละเอียด','โทรศัพท์มือถือ'];
const visibleFields=[1,2,3,4,5,6];
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
 if(p.action!=='session'&&m.server!==p.server)return;
 clearTimeout(p.timer);pending.delete(m.id);
 if(m.error)p.reject(Error(m.error));else{if(p.action==='session')server=m.server;p.resolve(m.result);}
};
async function refreshAccess(){
 try{const r=await request('session');mayEdit=!!r.canEdit;mayUpload=r.canUpload===true;}catch{mayEdit=false;mayUpload=false;server='';}
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
     if(!saved.deleted)overrides.set(entry.key,{row:entry.row,revision:saved.revision});completed++;
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
 $('standby-upload').hidden=!mayUpload;
 $('txt-upload').hidden=!mayUpload;
 $('txt-upload').disabled=!ready||importing;
 $('standby-upload').disabled=!ready||importing;
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
function planImport(book, xlsx) {
 const updates=new Map(), fields=labels.slice(3,6);
 const clean=value=>String(value??'').trim();
 const header=value=>clean(value).replace(/\s+/g,'');
 for(const name of book.SheetNames){
  const rows=xlsx.utils.sheet_to_json(book.Sheets[name],{header:1,raw:false,defval:''});
  const start=rows.findIndex(row=>row.some(cell=>header(cell)===labels[1]));
  if(start<0)continue;
  const titles=rows[start].map(header);
  for(const field of [labels[1],...fields]){
   if(titles.filter(v=>v===field).length!==1)throw Error('ชีต '+name+' ต้องมีหัวคอลัมน์ '+field+' เพียงหนึ่งคอลัมน์');
  }
  const orderColumn=titles.findIndex(t=>[labels[0],'ลำดับ'].includes(t));
  const groupIndex=groups.findIndex(g=>header(g)===header(name));
  for(const cells of rows.slice(start+1)){
   const id=clean(cells[titles.indexOf(labels[1])]);
   if(!id||id===labels[1])continue;
   const values=fields.map(field=>clean(cells[titles.indexOf(field)]));
   if(values.some(v=>v.length>2000))throw Error('ข้อมูลยาวเกินกำหนดสำหรับรหัส '+id);
   if(!updates.has(id))updates.set(id,[]);
   updates.get(id).push({values,order:clean(cells[orderColumn]),groupIndex});
  }
 }
 if(!updates.size)throw Error('ไม่พบข้อมูล กรุณาใช้หัวคอลัมน์ รหัสพนักงาน ตำแหน่ง สังกัด และรายละเอียด');
 const byEmployee=new Map(),changes=[],ambiguous=[],notices=[];
 for(const [key,record] of overrides){
  const id=record.row[1].trim();
  if(!byEmployee.has(id))byEmployee.set(id,[]);
  byEmployee.get(id).push({...record,key});
 }
 let skipped=0;
 for(const [id,inputs] of updates){
  const records=byEmployee.get(id);
  if(!records){skipped++;continue;}
  const assignments=new Map();
  const sameValues=(a,b)=>a.every((v,i)=>v===b[i]);
  if(inputs.every(input=>sameValues(input.values,inputs[0].values))){
   for(const record of records)assignments.set(record,inputs[0].values);
  }else{
   // Different duties can share an employee ID. Resolve every source row before saving this ID.
   for(const input of inputs){
    const matches=records.filter(r=>(!input.order||input.order===r.row[0])&&
     (input.groupIndex<0||r.key.startsWith('g'+input.groupIndex+'-')));
    const target=matches[0];
    if(matches.length!==1||(assignments.has(target)&&!sameValues(assignments.get(target),input.values))){
     ambiguous.push(id);assignments.clear();break;
    }
    assignments.set(target,input.values);
   }
  }
  const ordersByGroup=new Map();
  for(const {key,row} of records){
   const groupName=groups[Number(key.slice(1).split('-')[0])];
   if(!ordersByGroup.has(groupName))ordersByGroup.set(groupName,[]);
   ordersByGroup.get(groupName).push(row[0]);
  }
  for(const [groupName,orders] of ordersByGroup){
   if(orders.length<2)continue;
   orders.sort((a,b)=>a.localeCompare(b,'th',{numeric:true}));
   const list=orders.slice(0,-1).join(', ')+' และ '+orders.at(-1);
   notices.push('รหัส '+id+' มี '+orders.length+' รายการในกลุ่ม '+groupName+' คือ ลำดับ '+list+
    (assignments.size?'':' · ข้ามรหัสนี้เพราะจับคู่กับแถวใน Excel ไม่ได้'));
  }
  for(const [{key,row,revision},values] of assignments){
   if(values.every((v,i)=>v===row[3+i]))continue;
   const next=[...row];next.splice(3,3,...values);
   changes.push({key,row:next,revision});
  }
 }
 if(skipped===updates.size)throw Error('ไม่พบรหัสพนักงานใน Excel ที่ตรงกับรายชื่อ Standby');
 return {changes,skipped,ambiguous,notices};
}
const txtInput=$('txt-file');
$('txt-upload').onclick=()=>txtInput.click();
txtInput.onchange=async()=>{
 const file=txtInput.files[0];txtInput.value='';
 if(!file||!mayUpload||!ready||importing)return;
 const status=$('standby-status');
 let saved=0;
 importing=true;render();$('standby-duplicates').textContent='';
 try{
  if(!/\.txt$/i.test(file.name))throw Error('กรุณาเลือกไฟล์ .txt');
  const lines=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()).split(/\r\n?|\n/).map(line=>line.trim());
  const header=/^(.+?)\s*\((\d+)\)$/;
  const entries=new Map();
  for(let i=0;i<lines.length;i++){
   const match=lines[i].match(header);
   if(!match)continue;
   const name=match[1].trim(),id=match[2],position=lines[i+1],department=lines[i+2];
   if(!name||!position||!department||header.test(position)||header.test(department)||Math.max(name.length,position.length,department.length)>2000)
    throw Error('ตรวจตำแหน่งและสังกัดของรหัส '+id);
   const previous=entries.get(id);
   if(previous&&(previous.name!==name||previous.position!==position||previous.department!==department))
    throw Error('พบข้อมูลขัดกันสำหรับรหัส '+id);
   entries.set(id,{name,position,department});i+=2;
  }
  if(!entries.size)throw Error('ไม่พบรหัสพนักงานในวงเล็บ');
  const matched=new Set();
  for(const [key,{row,revision}] of Array.from(overrides)){
   const id=row[1].trim(),entry=entries.get(id);
   if(!entry)continue;
   matched.add(id);
   if(row[2]===entry.name&&row[3]===entry.position&&row[4]===entry.department)continue;
   const next=[...row];next[2]=entry.name;next[3]=entry.position;next[4]=entry.department;
   status.textContent='กำลังบันทึกรหัส '+id;
   await request('upload',{key,row:next,revision},30000);saved++;
  }
  status.textContent='พบรหัสตรงกัน '+matched.size+' · บันทึก '+saved+' รายการ · ไม่พบรหัส '+(entries.size-matched.size);
 }catch(error){status.textContent='บันทึกแล้ว '+saved+' รายการ · '+error.message;}
 finally{importing=false;render();}
};
const fileInput=$('standby-file');
$('standby-upload').addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',async()=>{
 const file=fileInput.files[0];fileInput.value='';
 if(!file||!mayUpload||!ready||importing)return;
 const status=$('standby-status'),notice=$('standby-duplicates');
 notice.textContent='';
 let saved=0;
 importing=true;render();status.textContent='กำลังอ่านไฟล์ Excel…';
 try{
  const xlsx=await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
  const book=xlsx.read(await file.arrayBuffer(),{type:'array'});
  const {changes,skipped,ambiguous,notices}=planImport(book,xlsx);
  notice.textContent=notices.join('\n');
  for(const record of changes){
   status.textContent='กำลังอัปเดต Firebase '+(saved+1)+' / '+changes.length;
   await request('upload',record,30000);
   saved++;
  }
  status.textContent=(ambiguous.length?(saved?'อัปเดตได้บางส่วน':'ไม่มีรายการเปลี่ยนแปลง'):'อัปเดตสมบูรณ์')+' · บันทึก '+saved+' รายการ'+(skipped?' · ข้าม '+skipped+' รหัสที่ไม่พบในรายชื่อ':'')+
   (ambiguous.length?' · ข้ามรหัสที่จับคู่ไม่ได้: '+ambiguous.join(', ')+' · ตรวจคอลัมน์ ลำดับที่ ให้ตรงกับรายชื่อเดิม และใช้ชื่อกลุ่มเป็นชื่อชีตเมื่อมีหลายกลุ่ม':'');
 }catch(error){
  status.textContent='อัปเดตไม่สำเร็จ · Firebase ยืนยันแล้ว '+saved+' รายการ · '+error.message;
 }finally{importing=false;render();}
});
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
 setEditorBusy(true);
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
  setEditorBusy(false);
 }
});
function setEditorBusy(busy){
 saving=busy;
 for(const id of ['standby-save','standby-cancel','standby-delete'])$(id).disabled=busy;
}
$('standby-delete').addEventListener('click',async()=>{
 if(saving||!mayEdit||!editing)return;
 const {key,row,revision}=editing;
 const label=displayName(row[2])+' ('+row[1]+') กลุ่ม '+groups[Number(key.slice(1).split('-')[0])]+' ลำดับ '+row[0];
 if(!window.confirm('ยืนยันลบ '+label+' ออกจาก Firebase?'))return;
 const message=$('standby-edit-message');
 setEditorBusy(true);message.textContent='กำลังลบรายการจาก Firebase…';
 try{
  const access=await request('session');
  if(!access.canDelete)throw Error('กรุณารีเฟรชแท็บหลักเพื่อใช้ปุ่มลบรายการ');
  const result=await request('delete',{key,revision},30000);
  if(!result.deleted)throw Error('Firebase ยังไม่ยืนยันการลบ');
  overrides.delete(key);editing=null;dialog.close();render();
  $('standby-status').textContent='ลบรายการจาก Firebase แล้ว · '+label;
 }catch(error){message.textContent='ลบรายการไม่สำเร็จ · '+error.message;}
 finally{setEditorBusy(false);}
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