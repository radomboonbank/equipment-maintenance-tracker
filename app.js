import {createIdleSession} from './idle-session.js?v=20261103';
import {createConstructionStore} from './construction-store.js?v=20261103-construction';
import {createAlarmStore} from './alarm-store.js?v=20261103-super-delete';
import {createPresence} from './presence.js?v=20261029-presence';
import {createMembersPage} from './members.js?v=20261029-members3';
import {matchesListFilters,compareEventDates} from './table-filters.js?v=20261029-date-order';
import {stationControl,setupStation,readStation} from './station-control.js?v=20261030-optional';
import {dashboardHtml,constructionRecordsForType,assessmentRecordsForType,storedAlarmRecords,latestUpdatesHtml,alarmRecordsForType,faultRecordsForType,faultTablePage} from './dashboard.js?v=20261103-fault-heading';
import {equipmentTypes,parseEquipmentCategory,formatEquipmentCategory} from './equipment-types.js?v=20261031-abnormal-local';
import {rotateLogins,loginEntries,loginTime,nextLoginStat,rotatePublicLogins} from './login-history.js?v=20261104-stats';
'use strict';
import {dateParts,dateText,stamp,credential,loginEmail,readDate,normalizeTime,mergedEquipment} from './utils.js?v=20261027-merged';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses={unreviewed:'รอตรวจสอบ',pending:'รอดำเนินการ',repairing:'กำลังซ่อม',resolved:'ซ่อมแล้ว'}, priorities={normal:'ปกติ',urgent:'เร่งด่วน',critical:'วิกฤต'};
const eventTypes=['อุปกรณ์ขัดข้อง','Abnormal Alarm','Winding Temp Alarm','โครงการก่อสร้าง','งานบำรุงรักษาเกินกำหนด','ข้อจำกัด ระบบส่ง'];
const fields={code:'รหัสอุปกรณ์ชำรุด',date:'วันที่ได้รับแจ้งอุปกรณ์ชำรุด (พ.ศ.)',time:'เวลาที่ได้รับแจ้งอุปกรณ์ชำรุด',station:'สถานีไฟฟ้าแรงสูง',eventType:'ประเภทเหตุการณ์',category:'ชนิดอุปกรณ์',equipment:'อุปกรณ์ที่ชำรุด (อุปกรณ์ที่ OFF)',cause:'สาเหตุ ที่ ปลด (OFF)',criticality:'ระดับความสำคัญของอุปกรณ์นี้ต่อระบบไฟฟ้า',owner:'ผู้รับผิดชอบแก้ไข',reporter:'ผู้แจ้ง',receiver:'พนักงานศูนย์ ผู้รับเรื่อง',due:'คาดการณ์กำหนดการแก้ไข (พ.ศ.)',status:'สถานะ',priority:'ความเร่งด่วน'};
const retiredRecordFields=new Set(['owner','reporter','receiver','due','status','priority']);
let data=[],notes=[],page=1,view='all',editing=null,cloud=null,unsubscribe=null,user=null,cloudReady=false,busy=false;

let role='guest',username='',displayName='',generation=0;
let loginStartedAt=null;
let headerOnlineUsers=[];
const onlineLoginInfo=new Map();
function updateLoginSession(){
 const label=document.getElementById('login-session-label');if(!label)return;
 label.replaceChildren();
 if(role==='guest'){label.textContent='ผู้ชมทั่วไป';return}
 const entries=headerOnlineUsers.length?headerOnlineUsers:(user?[{uid:user.uid,displayName:displayName||username}]:[]);
 for(const entry of entries){
  const own=entry.uid===user?.uid, info=onlineLoginInfo.get(entry.uid)||{};
  const started=own?loginStartedAt:info.started;
  const name=own?username:(info.username||entry.displayName);
  const item=document.createElement('span');item.className='login-session-user';
  if(own&&username==='559350'&&role==='admin'&&memberDuty==='super admin'){
   const avatar=document.createElement('img');avatar.className='login-session-avatar';avatar.src='admin-559350.ico';avatar.alt='';avatar.width=32;avatar.height=32;item.append(avatar);
  }
  const text=document.createElement('span');text.className='login-session-text';
  text.textContent=started?`${name} (${Math.max(0,Math.floor((Date.now()-started)/60000))} นาที)`:`${name} (ออนไลน์)`;
  item.append(text);label.append(item);
 }
}
function rememberLogin(uid,entry){
 const previous=onlineLoginInfo.get(uid)||{};
 const started=entry.at?.toMillis?.()??entry.lastLoginAt?.toMillis?.();
 onlineLoginInfo.set(uid,{...previous,...(entry.username?{username:entry.username}:{}),...(started?{started:Math.max(previous.started||0,started)}:{})});
}
let memberDuty='';
const membersPage=createMembersPage({session:()=>({cloud,user,role,duty:memberDuty}),endpoint:()=>window.GRID_TELEGRAM_URL});

let unsubscribeLogins=null;
function renderLogins(value,message='') {
 const entries=loginEntries(value);
 entries.forEach(entry=>rememberLogin(entry.uid,entry));updateLoginSession();
 $('#last-logins-list').innerHTML=message?`<li class="login-empty">${esc(message)}</li>`:entries.length?entries.map((entry,i)=>`<li><span class="login-rank">0${i+1}</span><div class="login-entry"><strong>${esc(entry.displayName || entry.username)}</strong><time>${esc(loginTime(entry.at))}</time></div></li>`).join(''):'<li class="login-empty">ยังไม่มีประวัติการเข้าสู่ระบบ</li>';
}
async function recordLogin() {
 const statsRef=cloud.doc(cloud.db,'publicLoginStats',user.uid);
 try {
  await cloud.runTransaction(cloud.db,async transaction=>{
   const snapshot=await transaction.get(statsRef);
   transaction.set(statsRef,nextLoginStat(snapshot.exists()?snapshot.data():null,displayName||username,cloud.serverTimestamp()));
  });
 } catch(error){console.warn('Login statistics unavailable:',error.code)}

 const ref=cloud.doc(cloud.db,'loginHistory','recent');
 const publicRef=cloud.doc(cloud.db,'publicLoginHistory','recent');
 await cloud.runTransaction(cloud.db,async transaction=>{
  const previous=await transaction.get(ref);
  const publicPrevious=await transaction.get(publicRef);
  transaction.set(publicRef,rotatePublicLogins(publicPrevious.exists()?publicPrevious.data():null,{displayName:displayName||username,at:cloud.serverTimestamp()}));
  transaction.set(ref,rotateLogins(previous.exists()?previous.data():null,{uid:user.uid,username,displayName,at:cloud.serverTimestamp()}));
 });
}

function watchPublicLogins(){
 const list=$('#public-logins-list');
 const query=cloud.query(cloud.collection(cloud.db,'publicLoginStats'),cloud.orderBy('lastLoginAt','desc'),cloud.limit(10));
 cloud.onSnapshot(query,snapshot=>{
  snapshot.docs.forEach(doc=>rememberLogin(doc.id,doc.data()));updateLoginSession();
  const entries=snapshot.docs.map(doc=>doc.data());
  list.innerHTML=entries.length?entries.map((entry,i)=>`<li><span class="login-rank">${String(i+1).padStart(2,'0')}</span><div class="login-entry"><strong>${esc(entry.displayName)} (${esc(entry.count)} ครั้ง)</strong><time>${esc(loginTime(entry.lastLoginAt))}</time></div></li>`).join(''):'<li class="login-empty">ยังไม่มีสถิติการเข้าสู่ระบบ</li>';
 },error=>{list.innerHTML='<li class="login-empty">ยังโหลดสถิติไม่ได้ กรุณาลองใหม่ภายหลัง</li>';console.warn('Public login statistics unavailable:',error.code)});
}
function watchLogins() {
 unsubscribeLogins?.();unsubscribeLogins=null;
 $('#last-logins-scope').textContent='รวมทุกเครื่อง · เวลาไทย (พ.ศ.)';
 if(role==='guest'){renderLogins(null,'เข้าสู่ระบบเพื่อดูประวัติ Login');return}
 renderLogins(null,'กำลังโหลดประวัติ…');
 const gen=generation;
 unsubscribeLogins=cloud.onSnapshot(cloud.doc(cloud.db,'loginHistory','recent'),snapshot=>{if(gen===generation)renderLogins(snapshot.exists()?snapshot.data():null)},error=>{
  if(gen===generation){$('#last-logins-list').replaceChildren();console.warn('Login history unavailable:',error.code)}
 });
}

let alarmData=[],alarmState='loading',unsubscribeAlarms=null;
let constructionData=[],constructionState='loading',unsubscribeConstruction=null;
window.GRID_CONSTRUCTION_STORE=createConstructionStore(()=>({cloud,user,role,username,displayName}));
window.GRID_ALARM_STORE=createAlarmStore(()=>({cloud,user,role,username,displayName,duty:memberDuty}));
const canEdit=()=>cloudReady&&['admin','editor'].includes(role);
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),6000)}
function dateLabel(r){return dateText(r.date)||'ไม่ระบุวันที่'}
function options(map,selected=''){return Object.entries(map).map(([v,l])=>`<option value="${esc(v)}" ${selected===v?'selected':''}>${esc(l)}</option>`).join('')}
$('#event-filter').innerHTML='<option value="">ทุกประเภทเหตุการณ์</option><option value="__unspecified__">ยังไม่ระบุ</option>'+options(Object.fromEntries(eventTypes.map(v=>[v,v])));
$('#equipment-filter').innerHTML='<option value="">ทุกชนิดอุปกรณ์หลัก</option>'+options(Object.fromEntries(equipmentTypes.map(v=>[v.name,v.name])));
function updateClock(){updateLoginSession();const now=new Date();$('#today').dateTime=now.toISOString();$('#today').innerHTML=`<span>${now.toLocaleDateString('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'long',year:'numeric'})}</span><strong>${now.toLocaleTimeString('en-GB',{timeZone:'Asia/Bangkok',hour12:false})}</strong>`}
updateClock();setInterval(updateClock,1000);
const presence=createPresence({render(entries,message){headerOnlineUsers=message?[]:entries;updateLoginSession();$('#online-count').textContent=message?'—':entries.length;$('#online-list').innerHTML=message?`<li class="online-empty">${esc(message)}</li>`:entries.length?entries.map(entry=>`<li><span class="online-avatar" aria-hidden="true">${esc(Array.from(entry.displayName)[0]||'●')}</span><div><strong>${esc(entry.displayName)}</strong><small>${entry.uid===user?.uid?'คุณ · ':''}เชื่อมต่อล่าสุด ${new Date(entry.at).toLocaleTimeString('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'})}</small></div><span class="online-dot" aria-label="ออนไลน์"></span></li>`).join(''):'<li>ยังไม่มีผู้ใช้ออนไลน์</li>'}});
let tableSort={key:'date',direction:'desc'};
function compareTableRows(a,b){
 const {key,direction}=tableSort;
 if(key==='date')return direction==='desc'?compareEventDates(a,b):compareEventDates(b,a);
 const value=r=>key==='equipment'?mergedEquipment(r):key==='eventType'?(r.eventType==='Power Flow Control'?'ข้อจำกัด ระบบส่ง':r.eventType||'ยังไม่ระบุ'):String(r[key]||'');
 const rank={high:0,medium:1,low:2};
 const result=key==='criticality'?(rank[a.criticality]??3)-(rank[b.criticality]??3):String(value(a)).localeCompare(String(value(b)),'th',{numeric:true});
 return (direction==='asc'?result:-result)||compareEventDates(a,b);
}
document.querySelectorAll('[data-sort]').forEach(button=>button.addEventListener('click',()=>{
 const key=button.dataset.sort;
 tableSort={key,direction:tableSort.key===key?(tableSort.direction==='asc'?'desc':'asc'):(key==='date'?'desc':'asc')};
 document.querySelectorAll('[data-sort]').forEach(b=>{
  const active=b.dataset.sort===key;
  b.closest('th').setAttribute('aria-sort',active?(tableSort.direction==='asc'?'ascending':'descending'):'none');
  b.querySelector('.sort-mark').textContent=active?(tableSort.direction==='asc'?'▲':'▼'):'↕';
 });
 page=1;render();
}));
function filtered(){const q=$('#search').value.toLowerCase().trim();return data.filter(r=>(view==='all'||(view==='open'?r.status!=='resolved':r.status==='resolved'))&&matchesListFilters(r,{eventType:$('#event-filter').value,equipmentType:$('#equipment-filter').value,station:$('#station').value})&&(!q||Object.keys(fields).some(k=>String(k==='equipment'?mergedEquipment(r):r[k]||'').toLowerCase().includes(q)))).sort(compareTableRows)}
function render(){ $('#dashboard').innerHTML=cloudReady?dashboardHtml(data,null,new Date(),constructionData,constructionState,alarmData,alarmState):'<p>กำลังโหลดข้อมูล Dashboard…</p>';$('#export-pdf').disabled=!cloudReady||!data.length;$('#add').hidden=!canEdit();$('#add-abnormal').hidden=!canEdit();document.querySelectorAll('[data-work-draft]').forEach(b=>b.hidden=!canEdit());const station=$('#station').value;$('#station').innerHTML='<option value="">ทุกสถานี</option>'+[...new Set(data.map(r=>r.station).filter(Boolean))].sort().map(s=>`<option ${s===station?'selected':''}>${esc(s)}</option>`).join('');const counts=Object.fromEntries(Object.keys(statuses).map(k=>[k,data.filter(r=>r.status===k).length]));const open=data.filter(r=>r.status!=='resolved');$('#stats').innerHTML=[['อุปกรณ์ทั้งหมด',data.length,'รายการในทะเบียน'],['งานที่ยังไม่ปิด',open.length,'รวมรายการรอตรวจสอบ'],['งานเร่งด่วน / วิกฤต',open.filter(r=>r.priority!=='normal').length,'เฉพาะรายการที่ยังไม่ปิด'],['ซ่อมแล้ว',counts.resolved,'รายการที่ยืนยันการแก้ไข']].map(([l,n,s])=>`<article class="stat"><div class="label">${l}</div><strong>${n.toLocaleString('th-TH')}</strong><small>${s}</small></article>`).join('');const bars=(entries,total)=>entries.map(([l,n])=>`<div class="bar-row"><span>${esc(l)}</span><div class="bar-bg"><div class="bar-fill" style="width:${total?n/total*100:0}%"></div></div><b>${n}</b></div>`).join('');const damaged=open.filter(r=>r.eventType==='อุปกรณ์ขัดข้อง');const groups={};damaged.forEach(r=>{const station=r.station||'ไม่ระบุ';groups[station]=(groups[station]||0)+1});$('#station-bars').innerHTML=bars(Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,5),damaged.length)||'<p>ยังไม่มีรายการอุปกรณ์ชำรุดที่ยังไม่ปิดงาน</p>';$('#recent-updates').innerHTML=latestUpdatesHtml([...data,...storedAlarmRecords(alarmData)]);const rows=filtered();page=Math.max(1,Math.min(page,Math.ceil(rows.length/12)||1));$('#count').textContent=rows.length;$('#rows').innerHTML=rows.slice((page-1)*12,page*12).map(r=>`<tr><td><span class="event-date ${r.dateNeedsReview?'warning':''}">${esc(dateLabel(r))}</span></td><td><strong>${esc(mergedEquipment(r))}</strong><small title="${esc(r.cause)}">${esc(r.cause||r.category||'—')}</small></td><td><span class="station-tag">${esc(r.station||'—')}</span></td><td><span class="badge event-type-badge">${esc(r.eventType==='Power Flow Control'?'ข้อจำกัด ระบบส่ง':r.eventType||'ยังไม่ระบุ')}</span></td><td>${criticalityBadge(r.criticality)}</td><td><button data-edit="${esc(r.id)}" aria-label="เปิดรายการ ${esc(r.code)}">เปิด →</button></td></tr>`).join('');$('#empty').hidden=rows.length>0;$('#range').textContent=rows.length?`${(page-1)*12+1}–${Math.min(page*12,rows.length)} จาก ${rows.length} รายการ`:'0 รายการ';$('#prev').disabled=page<=1;$('#next').disabled=page*12>=rows.length;
if(cloud&&!cloudReady){document.querySelectorAll('.stat strong').forEach(el=>el.textContent='—');$('#empty').innerHTML='<strong>ยังไม่สามารถแสดงข้อมูลจาก Firebase</strong><p>กำลังเชื่อมต่อ หรือยังไม่ได้รับสิทธิ์เข้าถึงข้อมูล</p>';}else{$('#empty').innerHTML='<strong>ยังไม่มีรายการในมุมมองนี้</strong><p>ยังไม่มีข้อมูลที่ตรงกับตัวกรอง</p>';}}

for(const sel of ['#search','#event-filter','#station','#equipment-filter'])$(sel).addEventListener(sel==='#search'?'input':'change',()=>{page=1;render()});
$('.table-wrap').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)edit(data.find(r=>r.id===b.dataset.edit))});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;page=1;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));render()});
$('#prev').onclick=()=>{page--;render()};$('#next').onclick=()=>{page++;render()};
function dateControl(name,value=''){
 const [y,m,d]=value.split('-').map(Number),current=Number(dateParts().year)+543;
 const opts=(values,selected)=>'<option value="">—</option>'+values.map(([v,l])=>`<option value="${v}" ${v===selected?'selected':''}>${l}</option>`).join('');
 const years=Array.from({length:current+11-2400},(_,i)=>current+10-i);if(y&& !years.includes(y+543))years.push(y+543);
 return `<div class="date-control"><select name="${name}-day" aria-label="วัน ${name}">${opts(Array.from({length:31},(_,i)=>[i+1,i+1]),d)}</select><select name="${name}-month" aria-label="เดือน ${name}">${opts(['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'].map((v,i)=>[i+1,v]),m)}</select><select name="${name}-year" aria-label="ปี พ.ศ. ${name}">${opts(years.map(v=>[v,v]),y+543)}</select></div>`;
}
function formDate(f,name){try{return readDate(f.get(name+'-day'),f.get(name+'-month'),f.get(name+'-year'))}catch(error){const label=name==='closure'?'วันที่ปิดงาน':name==='repair-expected'?'วันที่คาดว่าจะแก้ไขเสร็จ':name.startsWith('follow-')?'วันที่ติดตามครั้ง '+(Number(name.slice(7))+1):fields[name]||name;throw Error(label+': '+error.message)}}
function eventTypeControl(value='') {
 if(value==='Power Flow Control')value='ข้อจำกัด ระบบส่ง';
 const choices=eventTypes.filter(label=>!['Abnormal Alarm','Winding Temp Alarm','โครงการก่อสร้าง'].includes(label));
 if(['Abnormal Alarm','Winding Temp Alarm','โครงการก่อสร้าง'].includes(value))return `<input type="hidden" name="eventType" value="${esc(value)}"><p class="wide">ประเภทเหตุการณ์เดิม: ${esc(value)}</p>`;
 return `<fieldset class="event-type-field wide"><legend>ประเภทเหตุการณ์</legend><div class="event-type-options">${choices.map(label=>`<label><input type="radio" name="eventType" value="${esc(label)}" ${value===label?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div></fieldset>`;
}
function categoryControl(value='') {
 const current=parseEquipmentCategory(value);
 const choices=equipmentTypes.map(type=>[type.name,type.name]);
 if(current.legacy)choices.unshift(['__legacy__','ข้อมูลเดิม: '+current.legacy]);
 return `<fieldset class="equipment-category wide"><legend>ชนิดของอุปกรณ์ที่ชำรุด</legend><p class="category-hint">เลือกชนิดอุปกรณ์ เพื่อแสดงชนิดย่อยและระดับแรงดันที่เกี่ยวข้อง</p><div class="category-grid"><label>ชนิดอุปกรณ์หลัก<select id="equipment-type" aria-label="ชนิดอุปกรณ์หลัก"><option value="">เลือกชนิดอุปกรณ์</option>${options(Object.fromEntries(choices),current.legacy?'__legacy__':current.name)}</select></label><label id="equipment-subtype-field" hidden>ชนิดอุปกรณ์ย่อย<select id="equipment-subtype" aria-label="ชนิดอุปกรณ์ย่อย"></select></label><label id="equipment-voltage-field" hidden>ระดับแรงดัน<select id="equipment-voltage" aria-label="ระดับแรงดัน"></select></label></div><input type="hidden" name="category" value="${esc(value)}"><p id="category-summary" class="category-summary" aria-live="polite"></p></fieldset>`;
}
function setupCategory(value='') {
 const current=parseEquipmentCategory(value),main=$('#equipment-type'),sub=$('#equipment-subtype'),voltage=$('#equipment-voltage');
 const sync=()=>{
  let text='';
  if(main.value==='__legacy__')text=current.legacy;
  else if(main.value){try{text=formatEquipmentCategory(main.value,sub.value,voltage.value)}catch{}}
  $('#fields [name="category"]').value=text;
  $('#category-summary').textContent=text?'รายการที่เลือก: '+text:'กรุณาเลือกข้อมูลชนิดอุปกรณ์ให้ครบ';
 };
 const refresh=(initial=false)=>{
  const type=equipmentTypes.find(v=>v.name===main.value);
  for(const [select,id,values,selected] of [[sub,'#equipment-subtype-field',type?.subtypes||[],current.subtype],[voltage,'#equipment-voltage-field',type?.voltages||[],current.voltage]]){
   $(id).hidden=!values.length;select.required=false;
   select.innerHTML='<option value="">เลือก'+(select===sub?'ชนิดอุปกรณ์ย่อย':'ระดับแรงดัน')+'</option>'+options(Object.fromEntries(values.map(v=>[v,v])),initial?selected:'');
  }
  sync();
 };
 main.onchange=()=>refresh();sub.onchange=sync;voltage.onchange=sync;refresh(true);
}
const criticalities={high:'สูง',medium:'ปานกลาง',low:'ต่ำ'};
function criticalityBadge(value){const level=Object.hasOwn(criticalities,value)?value:'unassessed';return `<span class="badge criticality-badge criticality-${level}"><span aria-hidden="true">●</span> ${level==='unassessed'?'ยังไม่ประเมิน':criticalities[level]}</span>`}
const criticalityCriteria={
 high:'มีโอกาสทำให้ระบบหลักไม่มั่นคง เกิดเหตุขัดข้องต่อเนื่อง สูญเสียการเชื่อมโยงสำคัญ หรือสูญเสียระบบป้องกัน/ควบคุมที่จำเป็น โดยไม่มีระบบทดแทนที่เพียงพอ',
 medium:'ลดความสามารถส่งจ่ายหรือความสามารถรองรับเหตุขัดข้อง แต่ยังรักษาระบบได้ด้วยเส้นทางสำรอง การปรับระบบ หรือมาตรการที่ผ่านการประเมินแล้ว',
 low:'ผลกระทบจำกัดเฉพาะจุด ระบบทดแทนพร้อมและรองรับได้ โดยไม่กระทบเสถียรภาพหรือข้อจำกัดของระบบหลักตามผลประเมิน'
};
function criticalityControl(value='') {
 return `<fieldset class="criticality-field wide"><legend>ระดับความสำคัญของอุปกรณ์นี้ต่อระบบไฟฟ้า</legend><div class="criticality-header" aria-hidden="true"><span>ระดับ</span><span>เกณฑ์พิจารณาเมื่ออุปกรณ์สูญเสียหน้าที่</span></div>${Object.entries(criticalities).map(([key,label])=>`<label class="criticality-option ${key}"><span class="criticality-choice"><input type="radio" name="criticality" value="${key}" ${value===key?'checked':''} aria-describedby="criticality-${key}-criteria"><span class="criticality-dot" aria-hidden="true"></span><strong>${label}</strong></span><span id="criticality-${key}-criteria" class="criticality-criteria">${criticalityCriteria[key]}</span></label>`).join('')}${!criticalities[value]?'<p class="criticality-unassessed">ยังไม่ประเมิน</p>':''}</fieldset>`;
}
const assessmentFields={scope:['1. ขอบเขตผลกระทบ','เฉพาะอุปกรณ์ / สถานี / หลายสถานีหรือระบบหลัก'],replacement:['2. ระบบหรืออุปกรณ์ทดแทน','มีและรองรับได้ / มีแต่มีข้อจำกัด / ไม่มี'],effect:['3. ผลต่อระบบ','กระทบการส่งจ่ายไฟอย่างไร และที่ใด'],measures:['4. มาตรการรองรับเหตุการณ์','คืออะไร อย่างไร']};
function assessmentControl(value={}) {
 return `<fieldset class="assessment-field wide"><legend>ประเมินผลกระทบต่อระบบไฟฟ้า</legend><p id="assessment-requirement" class="assessment-requirement" aria-live="polite"></p><label for="assessment-effect">ประเมินผลกระทบต่อระบบไฟฟ้า<textarea id="assessment-effect" name="assessment-effect" maxlength="4000" rows="5">${esc(value?.effect)}</textarea></label></fieldset>`;
}
function setupAssessment() {
 const update=()=>{
  const required=false;
  document.querySelectorAll('[name^="assessment-"]').forEach(el=>el.required=required);
  $('.assessment-field').classList.toggle('requires-assessment',required);
  $('#assessment-requirement').textContent=required?'ระดับสูง: ต้องกรอกผลประเมินให้ครบทั้ง 4 ข้อ':'กรอกผลประเมินเพิ่มเติมได้ตามข้อมูลที่มี';
 };
 document.querySelectorAll('#fields [name="criticality"]').forEach(el=>el.addEventListener('change',update));update();
}
function repairPlanControl(record={}) {
 const plan=record.repairPlan||{};
 let approach=plan.approach??record.solution??'';
 if(!Object.hasOwn(plan,'operatorName')&&plan.schedule?.trim()&&plan.schedule.trim()!==approach.trim())approach+=(approach?'\n\n':'')+'แผนดำเนินการเดิม: '+plan.schedule;
 return `<fieldset class="repair-plan-field wide"><legend>แผนงานซ่อมแซมแก้ไข</legend><div class="form-grid"><label for="repair-approach">1. แนวทางการแก้ไข (แผนดำเนินการแก้ไข)<textarea id="repair-approach" name="repair-approach" maxlength="8000">${esc(approach)}</textarea></label><label for="repair-responsible">2. ผู้รับผิดชอบ การแก้ไข (ชื่อ และเบอร์มือถือ)<textarea id="repair-responsible" name="repair-responsible" maxlength="4000">${esc(plan.responsible??record.owner??'')}</textarea></label><fieldset class="repair-operator"><legend>3. ข้อมูล Operator สฟ.</legend><div class="repair-operator-row">${[['operatorName','Operator สฟ.'],['operatorId','เลขประจำตัว'],['operatorMobile','เบอร์มือถือ']].map(([key,label])=>`<label>${label}<input name="repair-${key}" maxlength="250" ${key==='operatorMobile'?'type="tel" inputmode="tel"':''} value="${esc(plan[key]||'')}"></label>`).join('')}</div></fieldset><div class="repair-expected"><label>4. วันที่คาดว่าจะแก้ไขเสร็จ (พ.ศ.)${dateControl('repair-expected',plan.expectedDateUnknown?'':(plan.expectedDate??record.due??''))}</label><label class="repair-unknown"><input type="checkbox" name="repair-unknown" ${plan.expectedDateUnknown?'checked':''}>ยังไม่ทราบกำหนดการแก้ไข</label></div></div></fieldset>`;
}
function setupRepairPlan(){
 const unknown=$('[name="repair-unknown"]');
 const update=()=>document.querySelectorAll('[name^="repair-expected-"]').forEach(el=>el.disabled=!canEdit()||unknown.checked);
 unknown.addEventListener('change',update);update();
}
function edit(r){
 if(!cloudReady)return toast('รอโหลดข้อมูลก่อน');if(!r&&!canEdit())return;
 editing=r?structuredClone(r):null;
 const current=dateParts();
 const defaults=r?{}:{date:`${current.year}-${current.month}-${current.day}`,time:`${current.hour}:${current.minute}`};
 $('#save-error').hidden=true;$('#save-error').textContent='';
 $('#editor-title').textContent=r?'รายละเอียด #'+r.code:'แจ้งอุปกรณ์ชำรุด';
 $('#fields').innerHTML=Object.entries(fields).filter(([key])=>!retiredRecordFields.has(key)).map(([k,l])=>{
  const val=(k==='equipment'?mergedEquipment(r||{}):(r?.[k]??defaults[k]))||(k==='status'?'pending':k==='priority'?'normal':'');
  if(k==='station')return stationControl(r||{});
  if(k==='eventType')return eventTypeControl(val);
  if(k==='category')return categoryControl(val);
  if(k==='criticality')return criticalityControl(val)+assessmentControl(r?.criticalityAssessment)+repairPlanControl(r||{});
  const long=['equipment','cause'].includes(k);
  const input=['date','due'].includes(k)?dateControl(k,val):k==='status'||k==='priority'?`<select name="${k}">${options(k==='status'?statuses:priorities,val)}</select>`:long?`<textarea name="${k}" maxlength="4000" >${esc(val)}</textarea>`:`<input name="${k}" value="${esc(k==='time'?normalizeTime(val):val)}" ${k==='code'?'readonly placeholder="สร้างอัตโนมัติเมื่อบันทึก"':k==='time'?'type="time" step="60"':k==='station'?'':''} maxlength="250">`;
  return `<label class="${long?'wide':''}">${l}${input}</label>`;
 }).join('');
 setupCategory(r?.category||'');
 setupAssessment();
 $('#legacy-tracking').textContent=r?.tracking?'ข้อมูลติดตามเดิม: '+r.tracking:'';
 $('#followups').innerHTML=Array.from({length:3},(_,i)=>{const v=r?.followups?.[i]||{};return `<tr><td>${i+1}</td><td>${dateControl('follow-'+i,v.date)}<input type="time" step="60" name="follow-${i}-time" aria-label="เวลาติดตาม ครั้ง ${i+1}" value="${esc(v.time)}"></td>`+['informant','mobile','details'].map((k,j)=>`<td>${k==='details'?`<textarea name="follow-${i}-${k}" maxlength="4000" aria-label="${['ชื่อผู้ให้ข้อมูล','เบอร์มือถือผู้ให้ข้อมูล','รายละเอียด'][j]} ครั้ง ${i+1}">${esc(v[k])}</textarea>`:`<input name="follow-${i}-${k}" ${k==='mobile'?'type="tel" inputmode="tel"':''} maxlength="250" aria-label="${['ชื่อผู้ให้ข้อมูล','เบอร์มือถือผู้ให้ข้อมูล','รายละเอียด'][j]} ครั้ง ${i+1}" value="${esc(v[k])}">`}</td>`).join('')+'</tr>'}).join('');
 const c=r?.closure||{};
 $('#closure-fields').innerHTML=`<label>วันเวลาที่ปิดงาน (พ.ศ.)${dateControl('closure',c.date)}<input type="time" name="closure-time" aria-label="เวลาที่ปิดงาน" value="${esc(c.time)}"></label>`+[['reporter','ชื่อผู้แจ้งปิดงาน'],['mobile','เบอร์มือถือผู้แจ้งปิดงาน'],['details','รายละเอียด'],['follower','ชื่อผู้ตามข้อมูล']].map(([k,label])=>`<label class="${k==='details'?'wide':''}">${label}${k==='details'?`<textarea name="closure-${k}" aria-label="รายละเอียดปิดงาน" maxlength="4000">${esc(c[k])}</textarea>`:`<input name="closure-${k}" ${k==='mobile'?'type="tel" inputmode="tel"':''} value="${esc(c[k])}" maxlength="250">`}</label>`).join('');
 $('#history').innerHTML=(r?.history||[]).slice().reverse().map(h=>`<div class="history-item">${esc(String(h.note||'').replace(/แก้ปีวันที่ตามผู้ดูแล: 19\d{2}-\d{2}-\d{2} → พ.ศ. (25\d{2})-(\d{2})-(\d{2}) \(คงวันและเดือนเดิม\)/,'ตรวจแก้ปีวันที่เป็น $3/$2/$1 พ.ศ. (เก็บค่าต้นฉบับไว้แล้ว)'))}<small>${esc(dateText(h.at))} · ${esc(h.by)}</small></div>`).join('');
 document.querySelectorAll('#fields input,#fields textarea,#fields select,#followups input,#followups textarea,#followups select,#closure-fields input,#closure-fields textarea,#closure-fields select').forEach(el=>el.disabled=!canEdit());
 setupStation($('#fields .station-control'),canEdit());
 setupRepairPlan();
 $('#save').hidden=!canEdit();$('#delete').hidden=role!=='admin'||memberDuty!=='super admin'||!r;
 $('#editor').showModal();
}
$('#add').onclick=()=>edit();
$('#add-abnormal').onclick=()=>{if(!canEdit())return;if(window.openAbnormalDraft)window.openAbnormalDraft();else toast('โหลดฟอร์มไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ')};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
function showSaveError(message){const box=$('#save-error');box.textContent=message;box.hidden=false;box.focus();}
$('#record-form').noValidate=true;
$('#record-form').onsubmit=async e=>{
 e.preventDefault();
 if(busy){showSaveError('กำลังบันทึกข้อมูล กรุณารอสักครู่');return}
 if(!canEdit()){showSaveError('ยังบันทึกไม่ได้ กรุณาตรวจการเชื่อมต่อและสิทธิ์ของบัญชี');return}
 $('#save-error').hidden=true;
 const invalid=Array.from(e.target.elements).find(el=>el.willValidate&&!el.validity.valid);
 if(invalid){const label=invalid.getAttribute('aria-label')||invalid.closest('label')?.textContent?.trim().slice(0,120)||invalid.name||'ช่องข้อมูล';showSaveError('กรุณาตรวจสอบ '+label+' — '+invalid.validationMessage);invalid.scrollIntoView({block:'center'});invalid.focus();invalid.reportValidity();return}
 try{
  const f=new FormData(e.target),r=Object.fromEntries(Object.keys(fields).map(k=>[k,retiredRecordFields.has(k)?(editing?.[k]??(k==='status'?'pending':k==='priority'?'normal':'')):['date','due'].includes(k)?formDate(f,k):String(f.get(k)||'').trim()]));
  Object.assign(r,readStation(f));
  if(r.eventType&&!eventTypes.includes(r.eventType))throw Error('กรุณาเลือกประเภทเหตุการณ์');
  if(r.criticality&&!Object.hasOwn(criticalities,r.criticality))throw Error('กรุณาเลือกระดับความสำคัญของอุปกรณ์นี้ต่อระบบไฟฟ้า');
  const criticalityAssessment=Object.fromEntries(Object.keys(assessmentFields).map(key=>[key,String(key==='effect'?(f.get('assessment-effect')||''):(editing?.criticalityAssessment?.[key]||'')).trim()]));
  if(Object.values(criticalityAssessment).some(value=>value.length>4000))throw Error('ผลประเมินแต่ละข้อยาวได้ไม่เกิน 4,000 ตัวอักษร');
  const repairPlan={...Object.fromEntries(['approach','responsible','operatorName','operatorId','operatorMobile'].map(key=>[key,String(f.get('repair-'+key)||'').trim()])),schedule:editing?.repairPlan?.schedule||'',expectedDateUnknown:f.has('repair-unknown'),expectedDate:f.has('repair-unknown')?'':formDate(f,'repair-expected')};
  if(repairPlan.approach.length>8000||['responsible','schedule'].some(key=>repairPlan[key].length>4000)||['operatorName','operatorId','operatorMobile'].some(key=>repairPlan[key].length>250))throw Error('ข้อความแผนงานซ่อมแซมยาวเกินขนาดที่กำหนด');
  const followups=Array.from({length:3},(_,i)=>({date:formDate(f,'follow-'+i),...Object.fromEntries(['time','informant','mobile','details','follower'].map(k=>[k,String(k==='follower'?(editing?.followups?.[i]?.follower||''):(f.get('follow-'+i+'-'+k)||'')).trim()]))}));
  const closure={date:formDate(f,'closure'),...Object.fromEntries(['time','reporter','mobile','details','follower'].map(k=>[k,String(f.get('closure-'+k)||'').trim()]))};
  const hasClosure=Object.values(closure).some(Boolean);
  closure.time=normalizeTime(closure.time);
  if(hasClosure)r.status='resolved';
  const now=new Date(),at=now.toISOString(),code=editing?.code||stamp(now);
  const next={...editing,...r,code,id:editing?.id||code,criticalityAssessment,repairPlan,followups,closure,history:[...(editing?.history||[]),{at,by:username,displayName:displayName||username,note:hasClosure?'บันทึกปิดงาน · '+closure.details:(!editing?'สร้างรายการ':'บันทึกข้อมูล · '+statuses[r.status])}],updatedAt:at,revision:(editing?.revision||0)+1,...(!editing?{createdAt:at,dateNeedsReview:false}:{})};
  if(editing?.breaker){next.originalBreaker=editing.originalBreaker||editing.breaker;next.breaker='';}
  if(r.equipment.length>4000)throw Error('ข้อมูลอุปกรณ์ยาวเกิน 4,000 ตัวอักษร กรุณาปรับข้อความก่อนบันทึก');
  if(editing?.time&&editing.time!==r.time&&!editing.originalTime)next.originalTime=editing.time;
  busy=true;$('#save').disabled=true;$('#save').textContent='กำลังบันทึก…';
  const ref=cloud.doc(cloud.db,'equipment',next.id),original=editing;
  await cloud.runTransaction(cloud.db,async t=>{const snap=await t.get(ref);if(original&&(!snap.exists()||snap.data().revision!==original.revision))throw Error('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาปิดและเปิดรายการใหม่');if(!original&&snap.exists())throw Error('รหัสซ้ำ กรุณาบันทึกอีกครั้ง');t.set(ref,next);t.set(cloud.doc(cloud.db,'telegramOutbox',next.id+'__'+next.revision),{recordId:next.id,revision:next.revision,record:next,createdBy:user.uid,createdAt:cloud.serverTimestamp(),readyAt:cloud.serverTimestamp(),status:'pending',nextPart:0,attempts:0})});
    $('#editor').close();toast('บันทึกข้อมูลแล้ว กำลังส่ง Telegram…');
    void sendRecordNotification(next);
 }catch(err){const explanation=err.code==='permission-denied'?'Firebase ไม่อนุญาตให้บันทึก กรุณาตรวจสิทธิ์บัญชีหรือรูปแบบข้อมูล':err.code==='unavailable'?'เชื่อมต่อ Firebase ไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง':err.message;showSaveError('บันทึกไม่สำเร็จ: '+explanation+' (ข้อมูลที่กรอกยังอยู่ในฟอร์ม)');console.warn('Record save failed',{code:err.code||'validation',recordId:editing?.id||null});}finally{busy=false;$('#save').disabled=false;$('#save').textContent='บันทึกข้อมูล'}
};
async function sendRecordNotification(next){
 try {
  if(!window.GRID_TELEGRAM_URL)throw Error('ยังไม่ได้ตั้งค่าปลายทาง');
  const idToken=await user.getIdToken(),key=next.id+'__'+next.revision;
  await fetch(window.GRID_TELEGRAM_URL,{method:'POST',mode:'no-cors',credentials:'omit',redirect:'follow',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({key,idToken}),signal:AbortSignal.timeout(150000)});
  const receipt=await cloud.getDocFromServer(cloud.doc(cloud.db,'telegramOutbox',key));
  toast(receipt.exists()&&receipt.data().status==='sent'?'บันทึกข้อมูลและส่ง Telegram สำเร็จ':'บันทึกข้อมูลสำเร็จ แต่ Telegram ยังส่งไม่สำเร็จ — ไม่มีการส่งซ้ำอัตโนมัติ');
 }catch{toast('บันทึกข้อมูลสำเร็จ แต่ยังยืนยันการส่ง Telegram ไม่ได้ — ไม่มีการส่งซ้ำอัตโนมัติ')}
}
$('#delete').onclick=async()=>{
 if(busy||role!=='admin'||memberDuty!=='super admin'||!editing)return;
 if(!confirm('ลบรายการ #'+editing.code+' ถาวรหรือไม่?'))return;
 busy=true;$('#delete').disabled=true;
 try{const original=editing;await cloud.runTransaction(cloud.db,async t=>{const ref=cloud.doc(cloud.db,'equipment',original.id),snap=await t.get(ref);if(!snap.exists()||snap.data().revision!==original.revision)throw Error('ข้อมูลเปลี่ยนแปลง กรุณาเปิดใหม่');t.delete(ref)});$('#editor').close();toast('ลบรายการแล้ว')}catch(err){toast('ลบไม่สำเร็จ: '+err.message)}finally{busy=false;$('#delete').disabled=false}
};
function resetSession(){headerOnlineUsers=[];onlineLoginInfo.clear();loginStartedAt=null;unsubscribeAlarms?.();unsubscribeAlarms=null;alarmData=[];alarmState='loading';idleSession.stop();document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());unsubscribeConstruction?.();unsubscribeConstruction=null;constructionData=[];constructionState='loading';presence.stop();membersPage.reset();memberDuty="";generation++;unsubscribeLogins?.();unsubscribeLogins=null;renderLogins(null);unsubscribe?.();unsubscribe=null;data=[];notes=[];cloudReady=false;role='guest';username='';displayName='';$('#editor').close();$('#workspace').hidden=true;$('#login-screen').hidden=false;render()}
function showWorkspace(){updateLoginSession();idleSession.start();
 $('#current-account').textContent=role==='guest'?'ผู้ชมทั่วไป':`บัญชีของคุณ: ${displayName||username}`;
 presence.start(cloud,role==='guest'?null:user,displayName||username);
 membersPage.setAccess(role==='admin'&&memberDuty==='super admin');
 watchLogins();
 
 $('#workspace').hidden=false;$('#login-screen').hidden=true;
 const gen=generation;
 alarmState=role==='guest'?'guest':'loading';
 if(role!=='guest')unsubscribeAlarms=cloud.onSnapshot(cloud.collection(cloud.db,'AbnormalAlarm'),snap=>{if(gen!==generation)return;alarmData=snap.docs.map(d=>({...d.data(),id:d.id})).filter(d=>[1,2,3].includes(d.section));alarmState='ready';render()},error=>{if(gen!==generation)return;alarmData=[];alarmState='error';render();console.warn('Alarm data unavailable:',error.code)});
 constructionState=role==='guest'?'guest':'loading';
 if(role!=='guest')unsubscribeConstruction=cloud.onSnapshot(cloud.collection(cloud.db,'ConstructionProjects'),snap=>{if(gen!==generation)return;constructionData=snap.docs.map(d=>({...d.data(),id:d.id})).filter(d=>d.type==='construction');constructionState='ready';render()},error=>{if(gen!==generation)return;constructionData=[];constructionState='error';render();console.warn('Construction data unavailable:',error.code)});
 unsubscribe=cloud.onSnapshot(cloud.collection(cloud.db,'equipment'),snap=>{if(gen!==generation)return;data=snap.docs.map(d=>({...d.data(),id:d.id}));cloudReady=true;$('#mode').textContent='Firebase · เชื่อมต่อแล้ว';$('#notice').hidden=true;$('#notice').textContent='';render()},err=>{if(gen!==generation)return;cloudReady=false;data=[];render();$('#notice').hidden=false;$('#notice').textContent='โหลดข้อมูลไม่สำเร็จ กรุณาตรวจการเชื่อมต่อและสิทธิ์';toast(err.code==='permission-denied'?'ยังไม่ได้รับสิทธิ์อ่านฐานข้อมูล':err.message)});
}
$('#login').onsubmit=async e=>{
 e.preventDefault();if(!cloud||busy)return;busy=true;$('#login-submit').disabled=true;$('#guest').disabled=true;
 try{
  const name=$('#username').value.trim().toLowerCase(),password=$('#password').value;
  const result=await cloud.signInWithEmailAndPassword(cloud.auth,loginEmail(name),await credential(name,password));
  const profile=await cloud.getDoc(cloud.doc(cloud.db,'DatabaseLogin',result.user.uid));
  if(!profile.exists()||!['admin','editor','viewer'].includes(profile.data().role)||profile.data().username!==name)throw Error('บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน');
  resetSession();loginStartedAt=Date.now();user=result.user;role=profile.data().role;memberDuty=profile.data().duty||'';username=name;displayName=profile.data().displayName||name;$('#password').value='';$('#login-status').textContent='';try{await recordLogin()}catch(historyError){console.warn('Login history unavailable')}showWorkspace();
 }catch(err){await cloud.signOut(cloud.auth);$('#login-status').textContent=err.code?.startsWith('auth/')?'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่เปิดใช้งานบัญชี':err.message}
 finally{busy=false;$('#login-submit').disabled=false;$('#guest').disabled=false}
};
$('#guest').onclick=async()=>{if(!cloud||busy)return;try{await cloud.signOut(cloud.auth);resetSession();user=null;username='ผู้ชมทั่วไป';showWorkspace()}catch(err){toast(err.message)}};
async function logoutSession(expired=false){
 const stopping=presence.stop();resetSession();user=null;$('#password').value='';
 if(expired)$('#login-status').textContent='ออกจากระบบเนื่องจากไม่มีการใช้งาน 15 นาที กรุณาเข้าสู่ระบบใหม่';
 try{await cloud.signOut(cloud.auth)}catch(err){toast(err.message)}
 await Promise.race([stopping,new Promise(resolve=>setTimeout(resolve,1500))]);
}
const idleSession=createIdleSession({onExpire:()=>{void logoutSession(true)}});
for(const event of ['pointerdown','pointermove','keydown','input','scroll','touchstart'])document.addEventListener(event,e=>{if(e.isTrusted)idleSession.activity()},{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)idleSession.check()});
window.addEventListener('focus',()=>idleSession.check());
$('#logout').onclick=()=>{if(!busy)void logoutSession()};
async function init(){
 const base='https://www.gstatic.com/firebasejs/13.0.0/';
 try{const [app,auth,fs]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
 const instance=app.initializeApp(window.GRID_FIREBASE_CONFIG),a=auth.getAuth(instance);cloud={...auth,...fs,db:fs.getFirestore(instance),auth:a};watchPublicLogins();
 await auth.setPersistence(a,auth.inMemoryPersistence);await auth.signOut(a);
 // Retire the old offline database cache; records now come exclusively from Firebase.
 localStorage.removeItem('grid-care-v1');localStorage.removeItem('grid-care-mode');localStorage.removeItem('grid-care-config');
 $('#login-submit').disabled=false;$('#guest').disabled=false;$('#login-status').textContent='พร้อมใช้งาน · เชื่อมต่อฐานข้อมูลอัตโนมัติ';
 }catch(err){$('#login-status').textContent='เชื่อมต่อไม่ได้ กรุณาตรวจอินเทอร์เน็ตและรีโหลดหน้า';}
}
render();init();

// Export the complete loaded snapshot, independent of filters and pagination.
function reportHtml(records) {
 const levels={high:'สูง',medium:'ปานกลาง',low:'ต่ำ'};
 const rows=[...records].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.station||'').localeCompare(String(b.station||''),'th'));
 return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>CROD GRID CARE - รายการเหตุการณ์ทั้งหมด</title><style>
 @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Tahoma,"Noto Sans Thai",sans-serif;color:#173540;margin:24px;font-size:11pt;line-height:1.6}h1{font-size:19pt;margin:0;color:#087f83}p{margin:4px 0 18px;color:#536b75}.toolbar{display:flex;align-items:center;gap:18px;padding:16px;background:#edf7f7;margin-bottom:24px}button{background:#087f83;color:white;border:0;border-radius:8px;padding:12px 20px;font:inherit;cursor:pointer}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #afc6ca;padding:9px 10px;text-align:left;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}th{background:#e3f1f1;font-weight:bold}tbody tr:nth-child(even){background:#f5f9fa}thead{display:table-header-group}tr{break-inside:avoid}col:nth-child(1){width:14%}col:nth-child(2){width:15%}col:nth-child(3){width:25%}col:nth-child(4){width:30%}col:nth-child(5){width:16%}@media print{body{margin:0;font-size:10pt}.toolbar{display:none}th,td{padding:7px 8px}h1{font-size:17pt}}
 </style></head><body><div class="toolbar"><button id="print-report">พิมพ์ / บันทึกเป็น PDF</button><span>เลือกปลายทาง “บันทึกเป็น PDF” และกระดาษ A4 แนวนอน</span></div><h1>CROD GRID CARE</h1><p>รายการเหตุการณ์ทั้งหมด · ${rows.length} รายการ · ออกรายงาน ${esc(dateText(new Date().toISOString()))}</p><table><colgroup><col><col><col><col><col></colgroup><thead><tr><th>วันที่เกิดเหตุการณ์ (พ.ศ.)</th><th>สถานีไฟฟ้าแรงสูง</th><th>ชนิดของอุปกรณ์ที่ชำรุด</th><th>สาเหตุ ที่ ปลด</th><th>ระดับความสำคัญของอุปกรณ์นี้ต่อระบบไฟฟ้า</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(dateLabel(r))}</td><td>${esc(r.station||'—')}</td><td>${esc(r.category||'—')}</td><td>${esc(r.cause||'—')}</td><td>${esc(levels[r.criticality]||'ยังไม่ประเมิน')}</td></tr>`).join('')}</tbody></table></body></html>`;
}
$('#export-pdf').onclick=()=>{
 if(!cloudReady||!data.length){toast('ยังไม่มีข้อมูลสำหรับส่งออก');return}
 const preview=document.createElement('dialog');
 preview.style.cssText='width:96vw;max-width:1400px;height:92vh;padding:16px';
 const close=document.createElement('button');close.textContent='ปิดรายงาน';close.style.cssText='display:block;margin:0 0 10px auto';
 close.onclick=()=>preview.close();
 const frame=document.createElement('iframe');frame.title='รายงานทุกเหตุการณ์สำหรับ PDF';frame.style.cssText='width:100%;height:calc(100% - 52px);border:0';
 frame.onload=()=>{frame.contentDocument.getElementById('print-report').onclick=()=>{frame.contentWindow.focus();frame.contentWindow.print()}};
 frame.srcdoc=reportHtml(data);preview.append(close,frame);document.body.append(preview);
 preview.addEventListener('close',()=>preview.remove(),{once:true});preview.showModal();
};



$('#dashboard').addEventListener('click',e=>{
 const button=e.target.closest('[data-fault-type]');if(!button||!cloudReady)return;
 const type=button.dataset.faultType;
 const alarm=button.dataset.summaryKind==='alarm';
 const assessment=button.dataset.summaryKind==='assessment';
 const construction=button.dataset.summaryKind==='construction';
 const rows=(construction?constructionRecordsForType(data,constructionData,type):assessment?assessmentRecordsForType(data,type):alarm?alarmRecordsForType([...data,...storedAlarmRecords(alarmData)],type):faultRecordsForType(data,type)).sort(compareEventDates).map(r=>({
  editId:canEdit()?((r.id.startsWith('alarm:')||r.id.startsWith('construction:'))?r.id:'equipment:'+r.id):'',
  date:dateLabel(r),station:r.station,category:r.category,equipment:mergedEquipment(r),cause:r.cause,
  criticality:({high:'สูง',medium:'ปานกลาง',low:'ต่ำ'})[r.criticality]||'ยังไม่ประเมิน'
 }));
 const page=window.open('','_blank');
 if(!page){toast('กรุณาอนุญาตให้เปิดหน้าต่างใหม่เพื่อดูตาราง');return;}
 page.opener=null;page.document.write(faultTablePage(type,rows,alarm,assessment,construction));page.document.close();
 page.document.querySelectorAll('[data-edit-alarm]').forEach(button=>button.addEventListener('click',()=>{
  if(!canEdit()){toast('กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์แก้ไข');return;}
  const key=button.dataset.editAlarm;
  if(key.startsWith('construction:')){const project=constructionData.find(r=>r.id===key.slice(13));if(!project){toast('ไม่พบรายการ กรุณาเปิดตารางใหม่');return;}window.focus();window.openConstructionDraft(project);page.close();return;}
  const stored=key.startsWith('alarm:');
  const id=key.slice(stored?6:10);
  const record=(stored?alarmData:data).find(r=>r.id===id);
  if(!record){toast('ไม่พบรายการ กรุณาเปิดตารางใหม่');return;}
  window.focus();
  if(stored){
   try{
    if(!page.document.querySelector('[data-alarm-editor-assets]')){
     const style=page.document.createElement('link');style.rel='stylesheet';style.href=new URL('./styles.css',location.href).href;style.dataset.alarmEditorAssets='true';page.document.head.append(style);
     for(const file of ['date-pickers.js','time-pickers.js']){const script=page.document.createElement('script');script.src=new URL(file,location.href).href;page.document.head.append(script)}
    }
    window.openAbnormalDraft(record,page.document);page.focus();
   }catch(error){console.error('Cannot open alarm editor',error);page.alert('เปิดข้อมูลไม่สำเร็จ: '+error.message)}
  }else{edit(record);page.close();}
 }));
 page.document.getElementById('close-table-page').addEventListener('click',()=>page.close());
});
