'use strict';
import {dateParts,dateText,stamp,credential,loginEmail,readDate,normalizeTime} from './utils.js';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses={unreviewed:'รอตรวจสอบ',pending:'รอดำเนินการ',repairing:'กำลังซ่อม',resolved:'ซ่อมแล้ว'}, priorities={normal:'ปกติ',urgent:'เร่งด่วน',critical:'วิกฤต'};
const fields={code:'รหัสชำรุด',date:'วันที่ (พ.ศ.)',time:'เวลา',station:'สถานี',category:'ชนิดอุปกรณ์',equipment:'อุปกรณ์ที่ชำรุด หรือ ปลด',breaker:'Bkr. ที่ปลด / อุปกรณ์ OFF',cause:'สาเหตุ',solution:'แนวทางแก้ไข',impact:'ผลกระทบต่อระบบไฟฟ้า',mitigation:'มาตรการรองรับ',owner:'ผู้รับผิดชอบ',reporter:'ผู้แจ้ง',receiver:'ศูนย์ที่รับเรื่อง',due:'กำหนดเสร็จ (พ.ศ.)',status:'สถานะ',priority:'ความเร่งด่วน'};
let data=[],notes=[],page=1,view='all',editing=null,cloud=null,unsubscribe=null,user=null,cloudReady=false,busy=false;
let role='guest',username='',generation=0;
const canEdit=()=>cloudReady&&['admin','editor'].includes(role);
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),6000)}
function dateLabel(r){return dateText(r.date)||'ไม่ระบุวันที่'}
function options(map,selected=''){return Object.entries(map).map(([v,l])=>`<option value="${esc(v)}" ${selected===v?'selected':''}>${esc(l)}</option>`).join('')}
$('#status').innerHTML='<option value="">ทุกสถานะ</option>'+options(statuses);
$('#today').textContent=new Date().toLocaleDateString('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'long',year:'numeric'});
function filtered(){const q=$('#search').value.toLowerCase().trim();return data.filter(r=>(view==='all'||(view==='open'?r.status!=='resolved':r.status==='resolved'))&&(!$('#status').value||r.status===$('#status').value)&&(!$('#station').value||r.station===$('#station').value)&&(!$('#priority').value||r.priority===$('#priority').value)&&(!q||Object.keys(fields).some(k=>String(r[k]||'').toLowerCase().includes(q)))).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))||String(a.code).localeCompare(String(b.code),'th',{numeric:true}))}
function render(){$('#add').hidden=!canEdit();const station=$('#station').value;$('#station').innerHTML='<option value="">ทุกสถานี</option>'+[...new Set(data.map(r=>r.station).filter(Boolean))].sort().map(s=>`<option ${s===station?'selected':''}>${esc(s)}</option>`).join('');const counts=Object.fromEntries(Object.keys(statuses).map(k=>[k,data.filter(r=>r.status===k).length]));const open=data.filter(r=>r.status!=='resolved');$('#stats').innerHTML=[['อุปกรณ์ทั้งหมด',data.length,'รายการในทะเบียน'],['งานที่ยังไม่ปิด',open.length,'รวมรายการรอตรวจสอบ'],['งานเร่งด่วน / วิกฤต',open.filter(r=>r.priority!=='normal').length,'เฉพาะรายการที่ยังไม่ปิด'],['ซ่อมแล้ว',counts.resolved,'รายการที่ยืนยันการแก้ไข']].map(([l,n,s])=>`<article class="stat"><div class="label">${l}</div><strong>${n.toLocaleString('th-TH')}</strong><small>${s}</small></article>`).join('');const bars=(entries,total)=>entries.map(([l,n])=>`<div class="bar-row"><span>${esc(l)}</span><div class="bar-bg"><div class="bar-fill" style="width:${total?n/total*100:0}%"></div></div><b>${n}</b></div>`).join('');$('#status-bars').innerHTML=bars(Object.keys(statuses).map(k=>[statuses[k],counts[k]]),data.length);const groups={};open.forEach(r=>{const s=r.station||'ไม่ระบุ';groups[s]=(groups[s]||0)+1});$('#station-bars').innerHTML=bars(Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,5),open.length)||'<p>ยังไม่มีงานค้างในทะเบียน</p>';const rows=filtered();page=Math.max(1,Math.min(page,Math.ceil(rows.length/12)||1));$('#count').textContent=rows.length;$('#rows').innerHTML=rows.slice((page-1)*12,page*12).map(r=>`<tr><td><strong>#${esc(r.code)}</strong><small class="${r.dateNeedsReview?'warning':''}">${esc(dateLabel(r))}</small></td><td><strong>${esc(r.equipment)}</strong><small title="${esc(r.cause)}">${esc(r.cause||r.category||'—')}</small></td><td><span class="station-tag">${esc(r.station||'—')}</span></td><td>${esc(r.owner||'ยังไม่ระบุ')}</td><td><span class="badge ${r.status}">${statuses[r.status]}</span></td><td><span class="badge ${r.priority}">${priorities[r.priority]}</span></td><td><button data-edit="${esc(r.id)}" aria-label="เปิดรายการ ${esc(r.code)}">เปิด →</button></td></tr>`).join('');$('#empty').hidden=rows.length>0;$('#range').textContent=rows.length?`${(page-1)*12+1}–${Math.min(page*12,rows.length)} จาก ${rows.length} รายการ`:'0 รายการ';$('#prev').disabled=page<=1;$('#next').disabled=page*12>=rows.length;
if(cloud&&!cloudReady){document.querySelectorAll('.stat strong').forEach(el=>el.textContent='—');$('#empty').innerHTML='<strong>ยังไม่สามารถแสดงข้อมูลจาก Firebase</strong><p>กำลังเชื่อมต่อ หรือยังไม่ได้รับสิทธิ์เข้าถึงข้อมูล</p>';}else{$('#empty').innerHTML='<strong>ยังไม่มีรายการในมุมมองนี้</strong><p>ยังไม่มีข้อมูลที่ตรงกับตัวกรอง</p>';}}

for(const sel of ['#search','#status','#station','#priority'])$(sel).addEventListener(sel==='#search'?'input':'change',()=>{page=1;render()});
$('.table-wrap').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)edit(data.find(r=>r.id===b.dataset.edit))});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;page=1;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));render()});
$('#prev').onclick=()=>{page--;render()};$('#next').onclick=()=>{page++;render()};
function dateControl(name,value=''){
 const [y,m,d]=value.split('-').map(Number),current=Number(dateParts().year)+543;
 const opts=(values,selected)=>'<option value="">—</option>'+values.map(([v,l])=>`<option value="${v}" ${v===selected?'selected':''}>${l}</option>`).join('');
 const years=Array.from({length:current+11-2400},(_,i)=>current+10-i);if(y&& !years.includes(y+543))years.push(y+543);
 return `<div class="date-control"><select name="${name}-day" aria-label="วัน ${name}">${opts(Array.from({length:31},(_,i)=>[i+1,i+1]),d)}</select><select name="${name}-month" aria-label="เดือน ${name}">${opts(['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'].map((v,i)=>[i+1,v]),m)}</select><select name="${name}-year" aria-label="ปี พ.ศ. ${name}">${opts(years.map(v=>[v,v]),y+543)}</select></div>`;
}
function formDate(f,name){return readDate(f.get(name+'-day'),f.get(name+'-month'),f.get(name+'-year'))}
function edit(r){
 if(!cloudReady)return toast('รอโหลดข้อมูลก่อน');if(!r&&!canEdit())return;
 editing=r?structuredClone(r):null;
 $('#editor-title').textContent=r?'รายละเอียด #'+r.code:'แจ้งอุปกรณ์ชำรุด';
 $('#fields').innerHTML=Object.entries(fields).map(([k,l])=>{
  const val=r?.[k]||(k==='status'?'pending':k==='priority'?'normal':'');
  const long=['equipment','cause','solution','impact','mitigation'].includes(k);
  const input=['date','due'].includes(k)?dateControl(k,val):k==='status'||k==='priority'?`<select name="${k}">${options(k==='status'?statuses:priorities,val)}</select>`:long?`<textarea name="${k}" maxlength="4000" ${k==='equipment'?'required':''}>${esc(val)}</textarea>`:`<input name="${k}" value="${esc(k==='time'?normalizeTime(val):val)}" ${k==='code'?'readonly placeholder="สร้างอัตโนมัติเมื่อบันทึก"':k==='time'?'type="time" step="60"':k==='station'?'required':''} maxlength="250">`;
  return `<label class="${long?'wide':''}">${l}${input}</label>`;
 }).join('');
 $('#legacy-tracking').textContent=r?.tracking?'ข้อมูลติดตามเดิม: '+r.tracking:'';
 $('#followups').innerHTML=Array.from({length:3},(_,i)=>{const v=r?.followups?.[i]||{};return `<tr><td>${i+1}</td><td>${dateControl('follow-'+i,v.date)}<input type="time" step="60" name="follow-${i}-time" aria-label="เวลาติดตาม ลำดับ ${i+1}" value="${esc(v.time)}"></td>`+['informant','mobile','details','follower'].map((k,j)=>`<td>${k==='details'?`<textarea name="follow-${i}-${k}" maxlength="4000" aria-label="${['ชื่อผู้ให้ข้อมูล','เบอร์มือถือผู้ให้ข้อมูล','รายละเอียด','ชื่อผู้ตามข้อมูล'][j]} ลำดับ ${i+1}">${esc(v[k])}</textarea>`:`<input name="follow-${i}-${k}" ${k==='mobile'?'type="tel" inputmode="tel"':''} maxlength="250" aria-label="${['ชื่อผู้ให้ข้อมูล','เบอร์มือถือผู้ให้ข้อมูล','รายละเอียด','ชื่อผู้ตามข้อมูล'][j]} ลำดับ ${i+1}" value="${esc(v[k])}">`}</td>`).join('')+'</tr>'}).join('');
 $('#new-note').value='';$('#new-note').disabled=!canEdit();
 $('#history').innerHTML=(r?.history||[]).slice().reverse().map(h=>`<div class="history-item">${esc(String(h.note||'').replace(/แก้ปีวันที่ตามผู้ดูแล: 19\d{2}-\d{2}-\d{2} → พ.ศ. (25\d{2})-(\d{2})-(\d{2}) \(คงวันและเดือนเดิม\)/,'ตรวจแก้ปีวันที่เป็น $3/$2/$1 พ.ศ. (เก็บค่าต้นฉบับไว้แล้ว)'))}<small>${esc(dateText(h.at))} · ${esc(h.by)}</small></div>`).join('');
 document.querySelectorAll('#fields input,#fields textarea,#fields select,#followups input,#followups textarea,#followups select').forEach(el=>el.disabled=!canEdit());
 $('#save').hidden=!canEdit();$('#delete').hidden=role!=='admin'||!r;
 $('#editor').showModal();
}
$('#add').onclick=()=>edit();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
$('#record-form').onsubmit=async e=>{
 e.preventDefault();if(busy||!canEdit())return;
 try{
  const f=new FormData(e.target),r=Object.fromEntries(Object.keys(fields).map(k=>[k,['date','due'].includes(k)?formDate(f,k):String(f.get(k)||'').trim()]));
  const followups=Array.from({length:3},(_,i)=>({date:formDate(f,'follow-'+i),...Object.fromEntries(['time','informant','mobile','details','follower'].map(k=>[k,String(f.get('follow-'+i+'-'+k)||'').trim()]))}));
  if(followups.some(v=>Object.values(v).some(Boolean)&&(!v.date||!v.time)))throw Error('กรุณาระบุวันและเวลาของลำดับที่มีข้อมูลติดตาม');
  const now=new Date(),at=now.toISOString(),code=editing?.code||stamp(now);
  const next={...editing,...r,code,id:editing?.id||code,followups,history:[...(editing?.history||[]),{at,by:username,note:$('#new-note').value.trim()||(!editing?'สร้างรายการ':'บันทึกข้อมูล · '+statuses[r.status])}],updatedAt:at,revision:(editing?.revision||0)+1,...(!editing?{createdAt:at,dateNeedsReview:false}:{})};
  if(editing?.time&&editing.time!==r.time&&!editing.originalTime)next.originalTime=editing.time;
  busy=true;$('#save').disabled=true;
  const ref=cloud.doc(cloud.db,'equipment',next.id),original=editing;
  await cloud.runTransaction(cloud.db,async t=>{const snap=await t.get(ref);if(original&&(!snap.exists()||snap.data().revision!==original.revision))throw Error('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาปิดและเปิดรายการใหม่');if(!original&&snap.exists())throw Error('รหัสซ้ำ กรุณาบันทึกอีกครั้ง');t.set(ref,next)});
  $('#editor').close();toast('บันทึกข้อมูลแล้ว');
 }catch(err){toast('บันทึกไม่สำเร็จ: '+err.message)}finally{busy=false;$('#save').disabled=false}
};
$('#delete').onclick=async()=>{
 if(busy||role!=='admin'||!editing)return;
 if(!confirm('ลบรายการ #'+editing.code+' ถาวรหรือไม่?'))return;
 busy=true;$('#delete').disabled=true;
 try{const original=editing;await cloud.runTransaction(cloud.db,async t=>{const ref=cloud.doc(cloud.db,'equipment',original.id),snap=await t.get(ref);if(!snap.exists()||snap.data().revision!==original.revision)throw Error('ข้อมูลเปลี่ยนแปลง กรุณาเปิดใหม่');t.delete(ref)});$('#editor').close();toast('ลบรายการแล้ว')}catch(err){toast('ลบไม่สำเร็จ: '+err.message)}finally{busy=false;$('#delete').disabled=false}
};
function resetSession(){generation++;unsubscribe?.();unsubscribe=null;data=[];notes=[];cloudReady=false;role='guest';username='';$('#editor').close();$('#workspace').hidden=true;$('#login-screen').hidden=false;render()}
function showWorkspace(){
 $('#workspace').hidden=false;$('#login-screen').hidden=true;
 $('#identity').textContent=username+' · '+({admin:'Admin',editor:'ผู้ใช้งานทั่วไป',guest:'ดูอย่างเดียว'}[role]);
 const gen=generation;
 unsubscribe=cloud.onSnapshot(cloud.collection(cloud.db,'equipment'),snap=>{if(gen!==generation)return;data=snap.docs.map(d=>({...d.data(),id:d.id}));cloudReady=true;$('#mode').textContent='Firebase · เชื่อมต่อแล้ว';$('#notice').textContent='ซิงก์ข้อมูลอัตโนมัติ · '+(role==='guest'?'โหมดดูอย่างเดียว':'บันทึกความคืบหน้าได้ทันที');render()},err=>{if(gen!==generation)return;cloudReady=false;data=[];render();$('#notice').textContent='โหลดข้อมูลไม่สำเร็จ กรุณาตรวจการเชื่อมต่อและสิทธิ์';toast(err.code==='permission-denied'?'ยังไม่ได้รับสิทธิ์อ่านฐานข้อมูล':err.message)});
}
$('#login').onsubmit=async e=>{
 e.preventDefault();if(!cloud||busy)return;busy=true;$('#login-submit').disabled=true;$('#guest').disabled=true;
 try{
  const name=$('#username').value.trim().toLowerCase(),password=$('#password').value;
  const result=await cloud.signInWithEmailAndPassword(cloud.auth,loginEmail(name),await credential(name,password));
  const profile=await cloud.getDoc(cloud.doc(cloud.db,'DatabaseLogin',result.user.uid));
  if(!profile.exists()||!['admin','editor'].includes(profile.data().role)||profile.data().username!==name)throw Error('บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน');
  resetSession();user=result.user;role=profile.data().role;username=name;$('#password').value='';$('#login-status').textContent='';showWorkspace();
 }catch(err){await cloud.signOut(cloud.auth);$('#login-status').textContent=err.code?.startsWith('auth/')?'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือยังไม่เปิดใช้งานบัญชี':err.message}
 finally{busy=false;$('#login-submit').disabled=false;$('#guest').disabled=false}
};
$('#guest').onclick=async()=>{if(!cloud||busy)return;try{await cloud.signOut(cloud.auth);resetSession();user=null;username='ผู้ชมทั่วไป';showWorkspace()}catch(err){toast(err.message)}};
$('#logout').onclick=async()=>{if(busy)return;resetSession();user=null;$('#password').value='';try{await cloud.signOut(cloud.auth)}catch(err){toast(err.message)}};
async function init(){
 const base='https://www.gstatic.com/firebasejs/13.0.0/';
 try{const [app,auth,fs]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
 const instance=app.initializeApp(window.GRID_FIREBASE_CONFIG),a=auth.getAuth(instance);cloud={...auth,...fs,db:fs.getFirestore(instance),auth:a};
 await auth.setPersistence(a,auth.inMemoryPersistence);await auth.signOut(a);
 // Retire the old offline database cache; records now come exclusively from Firebase.
 localStorage.removeItem('grid-care-v1');localStorage.removeItem('grid-care-mode');localStorage.removeItem('grid-care-config');
 $('#login-submit').disabled=false;$('#guest').disabled=false;$('#login-status').textContent='พร้อมใช้งาน · เชื่อมต่อฐานข้อมูลอัตโนมัติ';
 }catch(err){$('#login-status').textContent='เชื่อมต่อไม่ได้ กรุณาตรวจอินเทอร์เน็ตและรีโหลดหน้า';}
}
render();init();
