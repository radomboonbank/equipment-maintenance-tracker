export const systemStatuses={normal:'ปกติ',monitoring:'เฝ้าระวัง',degraded:'มีข้อจำกัด',critical:'วิกฤต'};
export function bangkokDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function repairDue(record){if(record.repairPlan?.expectedDateUnknown)return '';const value=record.repairPlan?.expectedDate;return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value?value:''}
export function dashboardSummary(records,now=new Date()){
 const open=records.filter(r=>r.status!=='resolved'),today=bangkokDay(now);
 return {open:open.length,high:open.filter(r=>r.criticality==='high').length,unassessed:open.filter(r=>!['high','medium','low'].includes(r.criticality)).length,overdue:open.filter(r=>repairDue(r)&&repairDue(r)<today),undated:open.filter(r=>!repairDue(r)),today};
}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mainTypes=['หม้อแปลงไฟฟ้า','สายส่งไฟฟ้า','เซอร์กิตเบรกเกอร์','Disconnecting SW','คาปาซิเตอร์แบงค์','รีเลย์ระบบป้องกัน','ระบบสื่อสาร'];
const colors=['#ef6474','#f4a640','#38c99a','#57a7f5','#a68bf2','#e789c4','#51cbd0','#a6ce60','#f5c65b','#7f9ff6','#dc9371','#84bac5'];
const mainType=r=>String(r.category||'').split(' · ')[0];
export function sixPanelSummary(records){
 const open=records.filter(r=>r.status!=='resolved');
 const faults=open.filter(r=>r.eventType==='อุปกรณ์ขัดข้อง');
 const alarms=open.filter(r=>r.eventType==='Abnormal Alarm');
 const construction=open.filter(r=>r.eventType==='โครงการก่อสร้าง');
 const count=(list,type)=>list.filter(r=>mainType(r)===type).length;
 return {open,faults,alarms,construction,count};
}
export function dashboardHtml(records,assessment=null,now=new Date()){
 const {open,faults,alarms,construction,count}=sixPanelSummary(records);
 const bars=(items)=>{const max=Math.max(1,...items.map(x=>x[1]));return items.map(([label,n,color])=>`<div class="grid-summary-row"><span>${esc(label)}</span><div class="grid-summary-track"><i style="width:${n/max*100}%;background:${color}"></i></div><b>${n}</b></div>`).join('')};
 const panel=(n,title,items,note)=>`<article class="grid-summary-panel"><header><span class="grid-summary-number">0${n}</span><h3>${title}</h3></header>${bars(items)}<p>${esc(note)}</p></article>`;
 const alarmTypes=[['หม้อแปลง','หม้อแปลงไฟฟ้า'],['เบรคเกอร์','เซอร์กิตเบรกเกอร์'],['ระบบสื่อสาร','ระบบสื่อสาร'],['รีเลย์','รีเลย์ระบบป้องกัน'],['อุปกรณ์สฟ.','อุปกรณ์ภายใน สฟ.']];
 const constructionTypes=[['สถานีไฟฟ้า','สถานีไฟฟ้า'],['สายส่งไฟฟ้า','สายส่งไฟฟ้า'],['หม้อแปลงไฟฟ้า','หม้อแปลงไฟฟ้า'],['เบรคเกอร์','เซอร์กิตเบรกเกอร์'],['คาปาซิเตอร์','คาปาซิเตอร์แบงค์']];
 const winding=open.filter(r=>r.eventType==='Winding Temp Alarm');
 const impact=open.filter(r=>String(r.criticalityAssessment?.effect||'').trim());
 return `<div class="grid-summary-six">`+
 panel(1,'สรุปอุปกรณ์ที่ชำรุด',[...mainTypes.map((t,i)=>[t,count(faults,t),colors[i]]),['ยังไม่ระบุ / อื่น ๆ',faults.filter(r=>!mainTypes.includes(mainType(r))).length,'#8d9baa']],`อุปกรณ์ขัดข้องทั้งหมด ${faults.length} รายการ`)+
 panel(2,'สรุป Abnormal Alarm',[...alarmTypes.map(([l,t],i)=>[l,count(alarms,t),colors[i]]),['Winding Temp',winding.length,'#e789c4'],['อื่น ๆ / ยังไม่ระบุ',alarms.filter(r=>!alarmTypes.some(([,t])=>t===mainType(r))).length,'#8d9baa']],`รวม ${alarms.length+winding.length} รายการ · รวม Winding Temp Alarm เฉพาะงานที่ยังไม่ปิด`).replace('</header>','</header><div class="grid-summary-row"><span>BESS ทริป</span><span class="grid-summary-pending">รอจัดหมวดข้อมูล</span></div>').replace('</article>','<p>BESS ทริป: ยังไม่มีช่องจัดประเภทในข้อมูลเดิม จึงยังไม่นับรวม</p></article>')+
 panel(3,'ระดับความสำคัญอุปกรณ์',[['สูง',open.filter(r=>r.criticality==='high').length,'#ef6474'],['ปานกลาง',open.filter(r=>r.criticality==='medium').length,'#f4a640'],['ต่ำ',open.filter(r=>r.criticality==='low').length,'#38c99a'],['ยังไม่ประเมิน',open.filter(r=>!['high','medium','low'].includes(r.criticality)).length,'#8d9baa']],`ทุกประเภทเหตุการณ์ รวม ${open.length} รายการ`)+
 panel(4,'อุปกรณ์ที่มีผลกระทบต่อระบบ',[['มีรายละเอียดผลต่อระบบ',impact.length,'#57a7f5'],['ยังไม่ระบุผลต่อระบบ',open.length-impact.length,'#8d9baa']],'นับการกรอกผลประเมินข้อ 3 เท่านั้น ยังไม่ใช่จำนวนที่ยืนยันว่ามีผลกระทบ ต้องเพิ่มเกณฑ์ยืนยันก่อนสรุป')+
 panel(5,'สรุปงานก่อสร้าง',[...constructionTypes.map(([l,t],i)=>[l,count(construction,t),colors[i]]),['อื่น ๆ / ยังไม่ระบุ',construction.filter(r=>!constructionTypes.some(([,t])=>t===mainType(r))).length,'#8d9baa']],`รวม ${construction.length} รายการ · ยังไม่มีชนิดหลักสถานีไฟฟ้าในแบบฟอร์ม`)+
 `<article class="grid-summary-panel"><header><span class="grid-summary-number">06</span><h3>งานสำคัญ อปก.</h3></header>${['BESS','LPLC','TSLC','Data Center'].map(t=>`<div class="grid-summary-row"><span>${t}</span><span class="grid-summary-pending">รอจัดหมวดข้อมูล</span></div>`).join('')}<p>ข้อมูลปัจจุบันยังไม่มีช่องระบุหมวดงานสำคัญ จึงไม่แสดงเป็นศูนย์หรือเดาจากข้อความ</p></article></div>`;
}
