import {repairPlanControl,setupRepairPlan,readRepairPlan} from './repair-plan.js';
import {createPresence} from './presence.js?v=20261029-presence';
import {createMembersPage} from './members.js?v=20261029-members3';
import {matchesListFilters,compareEventDates} from './table-filters.js?v=20261029-date-order';
import {stationControl,setupStation,readStation} from './station-control.js';
import {dashboardHtml,systemStatuses} from './dashboard.js';
import {equipmentTypes,parseEquipmentCategory,formatEquipmentCategory} from './equipment-types.js?v=20261029-stations';
import {rotateLogins,loginEntries,loginTime,publicLoginEntries,rotatePublicLogins} from './login-history.js?v=20261029-ten';
'use strict';
import {dateParts,dateText,stamp,credential,loginEmail,readDate,normalizeTime,mergedEquipment} from './utils.js?v=20261027-merged';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses={unreviewed:'รอตรวจสอบ',pending:'รอดำเนินการ',repairing:'กำลังซ่อม',resolved:'ซ่อมแล้ว'}, priorities={normal:'ปกติ',urgent:'เร่งด่วน',critical:'วิกฤต'};
const eventTypes=['อุปกรณ์ขัดข้อง','Abnormal Alarm','Winding Temp Alarm','โครงการก่อสร้าง','งานบำรุงรักษาเกินกำหนด','ข้อจำกัด ระบบส่ง'];
const fields={code:'รหัสชำรุด',date:'วันที่ได้รับแจ้งอุปกรณ์ชำรุด (พ.ศ.)',time:'เวลาที่ได้รับแจ้งอุปกรณ์ชำรุด',station:'สถานีไฟฟ้าแรงสูง',eventType:'ประเภทเหตุการณ์',category:'ชนิดอุปกรณ์',equipment:'อุปกรณ์ที่ชำรุด (อุปกรณ์ที่ OFF)',cause:'สาเหตุ ที่ ปลด (OFF)',criticality:'ระดับความสำคัญของอุปกรณ์นี้ต่อระบบไฟฟ้า',owner:'ผู้รับผิดชอบแก้ไข',reporter:'ผู้แจ้ง',receiver:'พนักงานศูนย์ ผู้รับเรื่อง',due:'คาดการณ์กำหนดการแก้ไข (พ.ศ.)',status:'สถานะ',priority:'ความเร่งด่วน'};
let data=[],notes=[],page=1,view='all',editing=null,cloud=null,unsubscribe=null,user=null,cloudReady=false,busy=false;
let systemAssessment=null,unsubscribeSystem=null;
let role='guest',username='',displayName='',generation=0;
let memberDuty='';
const membersPage=createMembersPage({session:()=>({cloud,user,role,duty:memberDuty}),endpoint:()=>window.GRID_TELEGRAM_URL});

let unsubscribeLogins=null;
function renderLogins(value,message='') {
 const entries=loginEntries(value);
 $('#last-logins-list').innerHTML=message?`<li class="login-empty">${esc(message)}</li>`:entries.length?entries.map((entry,i)=>`<li><span class="login-rank">0${i+1}</span><div class="login-entry"><strong>${esc(entry.displayName || entry.username)}</strong><time>${esc(loginTime(entry.at))}</time></div></li>`).join(''):'<li class="login-empty">ยังไม่มีประวัติการเข้าสู่ระบบ</li>';
}
async function recordLogin() {
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
 cloud.onSnapshot(cloud.doc(cloud.db,'publicLoginHistory','recent'),snapshot=>{
  const entries=publicLoginEntries(snapshot.exists()?snapshot.data():null);
  list.innerHTML=entries.length?entries.map((entry,i)=>`<li><span class="login-rank">${String(i+1).padStart(2,'0')}</span><div class="login-entry"><strong>${esc(entry.displayName)}</strong><time>${esc(loginTime(entry.at))}</time></div></li>`).join(''):'<li class="login-empty">ยังไม่มีประวัติการเข้าสู่ระบบ</li>';
 },error=>{list.innerHTML='<li class="login-empty">ยังโหลดประวัติไม่ได้ กรุณาลองเปิดหน้าใหม่ภายหลัง</li>';console.warn('Public login history unavailable:',error.code)});
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

const canEdit=()=>cloudReady&&['admin','editor'].includes(role);
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),6000)}
function dateLabel(r){return dateText(r.date)||'ไม่ระบุวันที่'}
function options(map,selected=''){return Object.entries(map).map(([v,l])=>`<option value="${esc(v)}" ${selected===v?'selected':''}>${esc(l)}</option>`).join('')}
$('#event-filter').innerHTML='<option value="">ทุกประเภทเหตุการณ์</option><option value="__unspecified__">ยังไม่ระบุ</option>'+options(Object.fromEntries(eventTypes.map(v=>[v,v])));
$('#equipment-filter').innerHTML='<option value="">ทุกชนิดอุปกรณ์หลัก</option>'+options(Object.fromEntries(equipmentTypes.map(v=>[v.name,v.name])));
function updateClock(){const now=new Date();$('#today').dateTime=now.toISOString();$('#today').innerHTML=`<span>${now.toLocaleDateString('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'long',year:'numeric'})}</span><strong>${now.toLocaleTimeString('en-GB',{timeZone:'Asia/Bangkok',hour12:false})}</strong>`}
updateClock();setInterval(updateClock,1000);
const presence=createPresence({render(entries,message){$('#online-count').textContent=message?'—':entries.length;$('#online-list').innerHTML=message?`<li class="online-empty">${esc(message)}</li>`:entries.length?entries.map(entry=>`<li><span class="online-avatar" aria-hidden="true">${esc(Array.from(entry.displayName)[0]||'●')}</span><div><strong>${esc(entry.displayName)}</strong><small>${entry.uid===user?.uid?'คุณ · ':''}เชื่อมต่อล่าสุด ${new Date(entry.at).toLocaleTimeString('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'})}</small></div><span class="online-dot" aria-label="ออนไลน์"></span></li>`).join(''):'<li>ยังไม่มีผู้ใช้ออนไลน์</li>'}});
function filtered(){const q=$('#search').value.toLowerCase().trim();return data.filter(r=>(view==='all'||(view==='open'?r.status!=='resolved':r.status==='resolved'))&&matchesListFilters(r,{eventType:$('#event-filter').value,equipmentType:$('#equipment-filter').value,station:$('#station').value})&&(!q||Object.keys(fields).some(k=>String(k==='equipment'?mergedEquipment(r):r[k]||'').toLowerCase().includes(q)))).sort(compareEventDates)}
function render(){ $('#dashboard').innerHTML=cloudReady?dashboardHtml(data,systemAssessment):'<p>กำลังโหลดข้อมูล Dashboard…</p>';$('#export-pdf').disabled=!cloudReady||!data.length;$('#add').hidden=!canEdit();const station=$('#station').value;$('#station').innerHTML='<option value="">ทุกสถานี</option>'+[...new Set(data.map(r=>r.station).filter(Boolean))].sort().map(s=>`<option ${s===station?'selected':''}>${esc(s)}</option>`).join('');const counts=Object.fromEntries(Object.keys(statuses).map(k=>[k,data.filter(r=>r.status===k).length]));const open=data.filter(r=>r.status!=='resolved');$('#stats').innerHTML=[['อุปกรณ์ทั้งหมด',data.length,'รายการในทะเบียน'],['งานที่ยังไม่ปิด',open.length,'รวมรายการรอตรวจสอบ'],['งานเร่งด่วน / วิกฤต',open.filter(r=>r.priority!=='normal').length,'เฉพาะรายการที่ยังไม่ปิด'],['ซ่อมแล้ว',counts.resolved,'รายการที่ยืนยันการแก้ไข']].map(([l,n,s])=>`<article class="stat"><div class="label">${l}</div><strong>${n.toLocaleString('th-TH')}</strong><small>${s}</small></article>`).join('');const bars=(entries,total)=>entries.map(([l,n])=>`<div class="bar-row"><span>${esc(l)}</span><div class="bar-bg"><div class="bar-fill" style="width:${total?n/total*100:0}%"></div></div><b>${n}</b></div>`).join('');$('#status-bars').innerHTML=bars(Object.keys(statuses).map(k=>[statuses[k],counts[k]]),data.length);const groups={};open.forEach(r=>{const s=r.station||'ไม่ระบุ';groups[s]=(groups[s]||0)+1});$('#station-bars').innerHTML=bars(Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,5),open.length)||'<p>ยังไม่มีงานค้างในทะเบียน</p>';const rows=filtered();page=Math.max(1,Math.min(page,Math.ceil(rows.length/12)||1));$('#count').textContent=rows.length;$('#rows').innerHTML=rows.slice((page-1)*12,page*12).map(r=>`<tr><td><span class="event-date ${r.dateNeedsReview?'warning':''}">${esc(dateLabel(r))}</span></td><td><strong>${esc(mergedEquipment(r))}</strong><small title="${esc(r.cause)}">${esc(r.cause||r.category||'—')}</small></td><td><span class="station-tag">${esc(r.station||'—')}</span></td><td>${esc(r.owner||'ยังไม่ระบุ')}</td><td><span class="badge event-type-badge">${esc(r.eventType==='Power Flow Control'?'ข้อจำกัด ระบบส่ง':r.eventType||'ยังไม่ระบุ')}</span></td><td>${criticalityBadge(r.criticality)}</td><td><button data-edit="${esc(r.id)}" aria-label="เปิดรายการ ${esc(r.code)}">เปิด →</button></td></tr>`).join('');$('#empty').hidden=rows.length>0;$('#range').textContent=rows.length?`${(page-1)*12+1}–${Math.min(page*12,rows.length)} จาก ${rows.length} รายการ`:'0 รายการ';$('#prev').disabled=page<=1;$('#next').disabled=page*12>=rows.length;
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
function formDate(f,name){return readDate(f.get(name+'-day'),f.get(name+'-month'),f.get(name+'-year'))}
function eventTypeControl(value='') {
 if(value==='Power Flow Control')value='ข้อจำกัด ระบบส่ง';
 return `<fieldset class="event-type-field wide"><legend>ประเภทเหตุการณ์</legend><div class="event-type-options">${eventTypes.map(label=>`<label><input type="radio" name="eventType" value="${esc(label)}" ${value===label?'checked':''} required><span>${esc(label)}</span></label>`).join('')}</div></fieldset>`;
}
function categoryControl(value='') {
 const current=parseEquipmentCategory(value);
 const choices=equipmentTypes.map(type=>[type.name,type.name]);
 if(current.legacy)choices.unshift(['__legacy__','ข้อมูลเดิม: '+current.legacy]);
 return `<fieldset class="equipment-category wide"><legend>ชนิดของอุปกรณ์ที่ชำรุด</legend><p class="category-hint">เลือกชนิดอุปกรณ์ เพื่อแสดงชนิดย่อยและระดับแรงดันที่เกี่ยวข้อง</p><div class="category-grid"><label>ชนิดอุปกรณ์หลัก<select id="equipment-type" aria-label="ชนิดอุปกรณ์หลัก" required><option value="">เลือกชนิดอุปกรณ์</option>${options(Object.fromEntries(choices),current.legacy?'__legacy__':current.name)}</select></label><label id="equipment-subtype-field" hidden>ชนิดอุปกรณ์ย่อย<select id="equipment-subtype" aria-label="ชนิดอุปกรณ์ย่อย"></select></label><label id="equipment-voltage-field" hidden>ระดับแรงดัน<select id="equipment-voltage" aria-label="ระดับแรงดัน"></select></label></div><input type="hidden" name="category" value="${esc(value)}"><p id="category-summary" class="category-summary" aria-live="polite"></p></fieldset>`;
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
   $(id).hidden=!values.length;select.required=values.length>0;
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
 return `<fieldset class="criticality-field wide"><legend>ระดับความสำคัญของอุปกรณ์นี้ต่อระบบไฟฟ้า</legend><div class="criticality-header" aria-hidden="true"><span>ระดับ</span><span>เกณฑ์พิจารณาเมื่ออุปกรณ์สูญเสียหน้าที่</span></div>${Object.entries(criticalities).map(([key,label])=>`<label class="criticality-option ${key}"><span class="criticality-choice"><input type="radio" name="criticality" value="${key}" ${value===key?'checked':''} required aria-describedby="criticality-${key}-criteria"><span class="criticality-dot" aria-hidden="true"></span><strong>${label}</strong></span><span id="criticality-${key}-criteria" class="criticality-criteria">${criticalityCriteria[key]}</span></label>`).join('')}${!criticalities[value]?'<p class="criticality-unassessed">ยังไม่ประเมิน — กรุณาเลือกระดับก่อนบันทึก</p>':''}</fieldset>`;
}
const assessmentFields={scope:['1. ขอบเขตผลกระทบ','เฉพาะอุปกรณ์ / สถานี / หลายสถานีหรือระบบหลัก'],replacement:['2. ระบบหรืออุปกรณ์ทดแทน','มีและรองรับได้ / มีแต่มีข้อจำกัด / ไม่มี'],effect:['3. ผลต่อระบบ','กระทบการส่งจ่ายไฟอย่างไร และที่ใด'],measures:['4. มาตรการรองรับเหตุการณ์','คืออะไร อย่างไร']};
function assessmentControl(value={}) {
 return `<fieldset class="assessment-field wide"><legend>ผลประเมินระดับความสำคัญ</legend><p id="assessment-requirement" class="assessment-requirement" aria-live="polite"></p><div class="form-grid">${Object.entries(assessmentFields).map(([key,[label,hint]])=>`<label for="assessment-${key}">${label}<span class="assessment-required" aria-hidden="true"> *</span><small id="assessment-${key}-hint">${hint}</small><textarea id="assessment-${key}" name="assessment-${key}" maxlength="4000" aria-describedby="assessment-${key}-hint">${esc(value?.[key])}</textarea></label>`).join('')}</div></fieldset>`;
}
function setupAssessment() {
 const update=()=>{
  const required=$('#fields [name="criticality"]:checked')?.value==='high';
  document.querySelectorAll('[name^="assessment-"]').forEach(el=>el.required=required);
  $('.assessment-field').classList.toggle('requires-assessment',required);
  $('#assessment-requirement').textContent=required?'ระดับสูง: ต้องกรอกผลประเมินให้ครบทั้ง 4 ข้อ':'ระดับปานกลางและต่ำ: กรอกผลประเมินเพิ่มเติมได้';
 };
 document.querySelectorAll('#fields [name="criticality"]').forEach(el=>el.addEventListener('change',update));update();
}
function edit(r){
 if(!cloudReady)return toast('รอโหลดข้อมูลก่อน');if(!r&&!canEdit())return;
 editing=r?structuredClone(r):null;
 $('#editor-title').textContent=r?'รายละเอียด #'+r.code:'แจ้งอุปกรณ์ชำรุด';
 $('#fields').innerHTML=Object.entries(fields).map(([k,l])=>{
  const val=(k==='equipment'?mergedEquipment(r||{}):r?.[k])||(k==='status'?'pending':k==='priority'?'normal':'');
  if(k==='station')return stationControl(r||{});
  if(k==='eventType')return eventTypeControl(val);
  if(k==='category')return categoryControl(val);
  if(k==='criticality')return criticalityControl(val)+assessmentControl(r?.criticalityAssessment)+repairPlanControl(r||{},dateControl);
  const long=['equipment','cause'].includes(k);
  const input=['date','due'].includes(k)?dateControl(k,val):k==='status'||k==='priority'?`<select name="${k}">${options(k==='status'?statuses:priorities,val)}</select>`:long?`<textarea name="${k}" maxlength="4000" ${k==='equipment'?'required':''}>${esc(val)}</textarea>`:`<input name="${k}" value="${esc(k==='time'?normalizeTime(val):val)}" ${k==='code'?'readonly placeholder="สร้างอัตโนมัติเมื่อบันทึก"':k==='time'?'type="time" step="60"':k==='station'?'required':''} maxlength="250">`;
  return `<label class="${long?'wide':''}">${l}${input}</label>`;
 }).join('');
 setupCategory(r?.category||'');
 setupAssessment();
 $('#legacy-tracking').textContent=r?.tracking?'ข้อมูลติดตามเดิม: '+r.tracking:'';
 $('#followups').innerHTML=Array.from({length:3},(_,i)=>{const v=r?.followups?.[i]||{};return `<tr><td>${i+1}</td><td>${dateControl('follow-'+i,v.date)}<input type="time" step="60" name="follow-${i}-time" aria-label="เวลาติดตาม ลำดับ ${i+1}" value="${esc(v.time)}"></td>`+['informant','mobile','details','follower'].map((k,j)=>`<td>${k==='details'?`<textarea name="follow-${i}-${k}" maxlength="4000" aria-label="${['ชื่อผู้ให้ข้อมูล','เบอร์มือถือผู้ให้ข้อมูล','รายละเอียด','ชื่อผู้ตามข้อมูล'][j]} ลำดับ ${i+1}">${esc(v[k])}</textarea>`:`<input name="follow-${i}-${k}" ${k==='mobile'?'type="tel" inputmode="tel"':''} maxlength="250" aria-label="${['ชื่อผู้ให้ข้อมูล','เบอร์มือถือผู้ให้ข้อมูล','รายละเอียด','ชื่อผู้ตามข้อมูล'][j]} ลำดับ ${i+1}" value="${esc(v[k])}">`}</td>`).join('')+'</tr>'}).join('');
 const c=r?.closure||{};
 $('#closure-fields').innerHTML=`<label>วันเวลาที่ปิดงาน (พ.ศ.)${dateControl('closure',c.date)}<input type="time" name="closure-time" aria-label="เวลาที่ปิดงาน" value="${esc(c.time)}"></label>`+[['reporter','ชื่อผู้แจ้งปิดงาน'],['mobile','เบอร์มือถือผู้แจ้งปิดงาน'],['details','รายละเอียด'],['follower','ชื่อผู้ตามข้อมูล']].map(([k,label])=>`<label class="${k==='details'?'wide':''}">${label}${k==='details'?`<textarea name="closure-${k}" aria-label="รายละเอียดปิดงาน" maxlength="4000">${esc(c[k])}</textarea>`:`<input name="closure-${k}" ${k==='mobile'?'type="tel" inputmode="tel"':''} value="${esc(c[k])}" maxlength="250">`}</label>`).join('');
 $('#history').innerHTML=(r?.history||[]).slice().reverse().map(h=>`<div class="history-item">${esc(String(h.note||'').replace(/แก้ปีวันที่ตามผู้ดูแล: 19\d{2}-\d{2}-\d{2} → พ.ศ. (25\d{2})-(\d{2})-(\d{2}) \(คงวันและเดือนเดิม\)/,'ตรวจแก้ปีวันที่เป็น $3/$2/$1 พ.ศ. (เก็บค่าต้นฉบับไว้แล้ว)'))}<small>${esc(dateText(h.at))} · ${esc(h.by)}</small></div>`).join('');
 document.querySelectorAll('#fields input,#fields textarea,#fields select,#followups input,#followups textarea,#followups select,#closure-fields input,#closure-fields textarea,#closure-fields select').forEach(el=>el.disabled=!canEdit());
 setupStation($('#fields .station-control'),canEdit());
 setupRepairPlan($('#fields'),canEdit());
 $('#save').hidden=!canEdit();$('#delete').hidden=role!=='admin'||!r;
 $('#editor').showModal();
}
$('#add').onclick=()=>edit();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
$('#record-form').onsubmit=async e=>{
 e.preventDefault();if(busy||!canEdit())return;
 try{
  const f=new FormData(e.target),r=Object.fromEntries(Object.keys(fields).map(k=>[k,['date','due'].includes(k)?formDate(f,k):String(f.get(k)||'').trim()]));
  Object.assign(r,readStation(f));
  if(!eventTypes.includes(r.eventType))throw Error('กรุณาเลือกประเภทเหตุการณ์');
  if(!Object.hasOwn(criticalities,r.criticality))throw Error('กรุณาเลือกระดับความสำคัญของอุปกรณ์นี้ต่อระบบไฟฟ้า');
  const criticalityAssessment=Object.fromEntries(Object.keys(assessmentFields).map(key=>[key,String(f.get('assessment-'+key)||'').trim()]));
  if(r.criticality==='high'&&Object.values(criticalityAssessment).some(value=>!value))throw Error('ระดับสูง: กรุณากรอกผลประเมินระดับความสำคัญให้ครบทั้ง 4 ข้อ');
  if(Object.values(criticalityAssessment).some(value=>value.length>4000))throw Error('ผลประเมินแต่ละข้อยาวได้ไม่เกิน 4,000 ตัวอักษร');
  const repairPlan=readRepairPlan(f,editing?.repairPlan||{},formDate);
  const followups=Array.from({length:3},(_,i)=>({date:formDate(f,'follow-'+i),...Object.fromEntries(['time','informant','mobile','details','follower'].map(k=>[k,String(f.get('follow-'+i+'-'+k)||'').trim()]))}));
  if(followups.some(v=>Object.values(v).some(Boolean)&&(!v.date||!v.time)))throw Error('กรุณาระบุวันและเวลาของลำดับที่มีข้อมูลติดตาม');
  const closure={date:formDate(f,'closure'),...Object.fromEntries(['time','reporter','mobile','details','follower'].map(k=>[k,String(f.get('closure-'+k)||'').trim()]))};
  const hasClosure=Object.values(closure).some(Boolean);
  if(hasClosure&&Object.values(closure).some(v=>!v))throw Error('กรุณากรอกข้อมูลปิดงานให้ครบทุกช่อง');
  if(hasClosure)r.status='resolved';
  if(r.status==='resolved'&&!hasClosure)throw Error('กรุณากรอกข้อมูลปิดงานก่อนเลือกสถานะซ่อมแล้ว');
  const now=new Date(),at=now.toISOString(),code=editing?.code||stamp(now);
  const next={...editing,...r,code,id:editing?.id||code,criticalityAssessment,repairPlan,followups,closure,history:[...(editing?.history||[]),{at,by:username,displayName:displayName||username,note:hasClosure?'บันทึกปิดงาน · '+closure.details:(!editing?'สร้างรายการ':'บันทึกข้อมูล · '+statuses[r.status])}],updatedAt:at,revision:(editing?.revision||0)+1,...(!editing?{createdAt:at,dateNeedsReview:false}:{})};
  if(editing?.breaker){next.originalBreaker=editing.originalBreaker||editing.breaker;next.breaker='';}
  if(r.equipment.length>4000)throw Error('ข้อมูลอุปกรณ์ยาวเกิน 4,000 ตัวอักษร กรุณาปรับข้อความก่อนบันทึก');
  if(editing?.time&&editing.time!==r.time&&!editing.originalTime)next.originalTime=editing.time;
  busy=true;$('#save').disabled=true;
  const ref=cloud.doc(cloud.db,'equipment',next.id),original=editing;
  await cloud.runTransaction(cloud.db,async t=>{const snap=await t.get(ref);if(original&&(!snap.exists()||snap.data().revision!==original.revision))throw Error('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาปิดและเปิดรายการใหม่');if(!original&&snap.exists())throw Error('รหัสซ้ำ กรุณาบันทึกอีกครั้ง');t.set(ref,next);t.set(cloud.doc(cloud.db,'telegramOutbox',next.id+'__'+next.revision),{recordId:next.id,revision:next.revision,record:next,createdBy:user.uid,createdAt:cloud.serverTimestamp(),readyAt:cloud.serverTimestamp(),status:'pending',nextPart:0,attempts:0})});
    $('#editor').close();toast('บันทึกข้อมูลแล้ว กำลังส่ง Telegram…');
    try {
      if(!window.GRID_TELEGRAM_URL)throw Error('ยังไม่ได้ตั้งค่าปลายทาง');
      const idToken=await user.getIdToken(),key=next.id+'__'+next.revision;
      await fetch(window.GRID_TELEGRAM_URL,{method:'POST',mode:'no-cors',credentials:'omit',redirect:'follow',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({key,idToken}),signal:AbortSignal.timeout(150000)});
      const receipt=await cloud.getDocFromServer(cloud.doc(cloud.db,'telegramOutbox',key));
      if(receipt.exists()&&receipt.data().status==='sent')toast('บันทึกข้อมูลและส่ง Telegram สำเร็จ');
      else toast('บันทึกข้อมูลสำเร็จ แต่ Telegram ยังส่งไม่สำเร็จ — ไม่มีการส่งซ้ำอัตโนมัติ');
    }catch(notificationError){toast('บันทึกข้อมูลสำเร็จ แต่ยังยืนยันการส่ง Telegram ไม่ได้ — ไม่มีการส่งซ้ำอัตโนมัติ')}
 }catch(err){toast('บันทึกไม่สำเร็จ: '+err.message)}finally{busy=false;$('#save').disabled=false}
};
$('#delete').onclick=async()=>{
 if(busy||role!=='admin'||!editing)return;
 if(!confirm('ลบรายการ #'+editing.code+' ถาวรหรือไม่?'))return;
 busy=true;$('#delete').disabled=true;
 try{const original=editing;await cloud.runTransaction(cloud.db,async t=>{const ref=cloud.doc(cloud.db,'equipment',original.id),snap=await t.get(ref);if(!snap.exists()||snap.data().revision!==original.revision)throw Error('ข้อมูลเปลี่ยนแปลง กรุณาเปิดใหม่');t.delete(ref)});$('#editor').close();toast('ลบรายการแล้ว')}catch(err){toast('ลบไม่สำเร็จ: '+err.message)}finally{busy=false;$('#delete').disabled=false}
};
function resetSession(){presence.stop();membersPage.reset();memberDuty="";generation++;unsubscribeSystem?.();unsubscribeSystem=null;systemAssessment=null;unsubscribeLogins?.();unsubscribeLogins=null;renderLogins(null);unsubscribe?.();unsubscribe=null;data=[];notes=[];cloudReady=false;role='guest';username='';displayName='';$('#editor').close();$('#workspace').hidden=true;$('#login-screen').hidden=false;render()}
function showWorkspace(){
 $('#current-account').textContent=role==='guest'?'ผู้ชมทั่วไป':`บัญชีของคุณ: ${displayName||username}`;
 presence.start(cloud,role==='guest'?null:user,displayName||username);
 membersPage.setAccess(role==='admin'&&memberDuty==='super admin');
 watchLogins();
 watchSystemAssessment();
 $('#workspace').hidden=false;$('#login-screen').hidden=true;
 $('#identity').textContent=username+' · '+({admin:'super admin',editor:'cac term',viewer:'user · ดูอย่างเดียว',guest:'ดูอย่างเดียว'}[role]);
 const gen=generation;
 unsubscribe=cloud.onSnapshot(cloud.collection(cloud.db,'equipment'),snap=>{if(gen!==generation)return;data=snap.docs.map(d=>({...d.data(),id:d.id}));cloudReady=true;$('#mode').textContent='Firebase · เชื่อมต่อแล้ว';$('#notice').textContent='ซิงก์ข้อมูลอัตโนมัติ · '+(['guest','viewer'].includes(role)?'โหมดดูอย่างเดียว':'บันทึกความคืบหน้าได้ทันที');render()},err=>{if(gen!==generation)return;cloudReady=false;data=[];render();$('#notice').textContent='โหลดข้อมูลไม่สำเร็จ กรุณาตรวจการเชื่อมต่อและสิทธิ์';toast(err.code==='permission-denied'?'ยังไม่ได้รับสิทธิ์อ่านฐานข้อมูล':err.message)});
}
$('#login').onsubmit=async e=>{
 e.preventDefault();if(!cloud||busy)return;busy=true;$('#login-submit').disabled=true;$('#guest').disabled=true;
 try{
  const name=$('#username').value.trim().toLowerCase(),password=$('#password').value;
  const result=await cloud.signInWithEmailAndPassword(cloud.auth,loginEmail(name),await credential(name,password));
  const profile=await cloud.getDoc(cloud.doc(cloud.db,'DatabaseLogin',result.user.uid));
  if(!profile.exists()||!['admin','editor','viewer'].includes(profile.data().role)||profile.data().username!==name)throw Error('บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน');
  resetSession();user=result.user;role=profile.data().role;memberDuty=profile.data().duty||'';username=name;displayName=profile.data().displayName||name;$('#password').value='';$('#login-status').textContent='';try{await recordLogin()}catch(historyError){console.warn('Login history unavailable')}showWorkspace();
 }catch(err){await cloud.signOut(cloud.auth);$('#login-status').textContent=err.code?.startsWith('auth/')?'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่เปิดใช้งานบัญชี':err.message}
 finally{busy=false;$('#login-submit').disabled=false;$('#guest').disabled=false}
};
$('#guest').onclick=async()=>{if(!cloud||busy)return;try{await cloud.signOut(cloud.auth);resetSession();user=null;username='ผู้ชมทั่วไป';showWorkspace()}catch(err){toast(err.message)}};
$('#logout').onclick=async()=>{if(busy)return;await Promise.race([presence.stop(),new Promise(resolve=>setTimeout(resolve,1500))]);resetSession();user=null;$('#password').value='';try{await cloud.signOut(cloud.auth)}catch(err){toast(err.message)}};
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

function watchSystemAssessment(){
 unsubscribeSystem?.();systemAssessment=null;
 $('#system-assessment-form').hidden=role!=='admin';
 if(role==='guest'){render();return}
 const gen=generation;
 unsubscribeSystem=cloud.onSnapshot(cloud.doc(cloud.db,'metadata','systemAssessment'),snap=>{if(gen!==generation)return;systemAssessment=snap.exists()?snap.data():null;render()},()=>{if(gen!==generation)return;systemAssessment=null;render();$('#system-assessment-message').textContent='ยังโหลดผลประเมินไม่ได้ กรุณาตรวจสิทธิ์และการเชื่อมต่อ'});
}
$('#system-assessment-form').onsubmit=async e=>{
 e.preventDefault();if(role!=='admin'||!user||busy)return;
 const f=new FormData(e.target),status=f.get('systemStatus'),reason=String(f.get('systemReason')||'').trim();if(!systemStatuses[status]||!reason)return;
 const button=e.target.querySelector('button');button.disabled=true;busy=true;
 try{await cloud.setDoc(cloud.doc(cloud.db,'metadata','systemAssessment'),{status,reason,assessedBy:displayName||username,assessedUid:user.uid,confirmedAt:cloud.serverTimestamp()});$('#system-assessment-message').textContent='บันทึกผลประเมินแล้ว'}catch(err){$('#system-assessment-message').textContent='บันทึกไม่สำเร็จ กรุณาลองใหม่'}finally{busy=false;button.disabled=false}
};
