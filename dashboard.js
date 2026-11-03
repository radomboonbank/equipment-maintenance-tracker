export function inventoryTableHtml(){
 const rows=[['สถานีไฟฟ้า',[16,20,28,'–']],['คาปาซิเตอร์แบงค์',['–',12,18,16]],['สายส่งไฟฟ้า',[16,20,28,28]],['จุดจ่ายไฟ',['–',20,28,28]]];
 return `<div class="inventory-table-wrap"><table class="inventory-voltage-table"><caption>จำนวนแยกตามแรงดัน (kV)</caption><thead><tr><th scope="col">อุปกรณ์</th>${['500','230','115','22'].map(v=>`<th scope="col">${v}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,values])=>`<tr><th scope="row">${label}</th>${values.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody><tbody class="inventory-transformers"><tr><td></td><th scope="col">500/230</th><th scope="col">230/115</th><th scope="col">115/22</th><td rowspan="2">–</td></tr><tr><th scope="row">หม้อแปลงไฟฟ้า</th><td>16</td><td>20</td><td>28</td></tr></tbody></table></div>`;
}
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
export function dashboardHtml(records,assessment=null,now=new Date(),projects=[],projectState='ready'){
 const {open,faults,alarms,construction,count}=sixPanelSummary(records);
 const bars=(items)=>{const max=Math.max(1,...items.map(x=>x[1]));return [...items].sort((a,b)=>b[1]-a[1]).map(([label,n,color])=>`<div class="grid-summary-row"><span>${esc(label)}</span><div class="grid-summary-track"><i style="width:${n/max*100}%;background:${color}"></i></div><b>${n}</b></div>`).join('')};
 const panel=(n,title,items,note)=>`<article class="grid-summary-panel"><header><span class="grid-summary-number">${n}</span><h3>${title}</h3></header>${bars(items)}<p>${esc(note)}</p></article>`;
 const alarmTypes=[['หม้อแปลง','หม้อแปลงไฟฟ้า'],['เบรคเกอร์','เซอร์กิตเบรกเกอร์'],['ระบบสื่อสาร','ระบบสื่อสาร'],['รีเลย์','รีเลย์ระบบป้องกัน'],['อุปกรณ์สฟ.','อุปกรณ์ภายใน สฟ.']];
 const constructionTypes=[['สถานีไฟฟ้า','สถานีไฟฟ้า'],['สายส่งไฟฟ้า','สายส่งไฟฟ้า'],['หม้อแปลงไฟฟ้า','หม้อแปลงไฟฟ้า'],['เบรคเกอร์','เซอร์กิตเบรกเกอร์'],['คาปาซิเตอร์','คาปาซิเตอร์แบงค์']];
 const projectType=p=>({'เบรคเกอร์':'เซอร์กิตเบรกเกอร์','คาปาซิเตอร์':'คาปาซิเตอร์แบงค์'}[p.data?.category]||p.data?.category||'');
 const constructionCounts=constructionTypes.map(([l,t],i)=>[l,count(construction,t)+projects.filter(p=>projectType(p)===t).length,colors[i]]);
 const otherConstruction=construction.filter(r=>!constructionTypes.some(([,t])=>t===mainType(r))).length+projects.filter(p=>!constructionTypes.some(([,t])=>t===projectType(p))).length;
 const constructionNote=projectState==='ready'?`รวม ${construction.length+projects.length} รายการ · เดิม ${construction.length} / แบบฟอร์มก่อสร้าง ${projects.length}`:projectState==='guest'?'แสดงรายการเดิม · เข้าสู่ระบบเพื่อดูข้อมูลก่อสร้างเพิ่มเติม':projectState==='error'?'ข้อมูลก่อสร้างใหม่โหลดไม่สำเร็จ · ยอดยังไม่ครบ':'กำลังโหลดข้อมูลก่อสร้างเพิ่มเติม…';
 const winding=open.filter(r=>r.eventType==='Winding Temp Alarm');
 const impact=open.filter(r=>String(r.criticalityAssessment?.effect||'').trim());
 return `<div class="grid-summary-six">`+
 panel(1,'สรุปอุปกรณ์ที่ชำรุด',[...mainTypes.map((t,i)=>[t,count(faults,t),colors[i]]),['ยังไม่ระบุ / อื่น ๆ',faults.filter(r=>!mainTypes.includes(mainType(r))).length,'#8d9baa']],`อุปกรณ์ขัดข้องทั้งหมด ${faults.length} รายการ`)+
 panel(2,'สรุป Abnormal Alarm',[...alarmTypes.map(([l,t],i)=>[l,count(alarms,t),colors[i]]),['Winding Temp',winding.length,'#e789c4'],['อื่น ๆ / ยังไม่ระบุ',alarms.filter(r=>!alarmTypes.some(([,t])=>t===mainType(r))).length,'#8d9baa']],`รวม ${alarms.length+winding.length} รายการ · รวม Winding Temp Alarm เฉพาะงานที่ยังไม่ปิด`).replace('</header>','</header><div class="grid-summary-row"><span>BESS ทริป</span><span class="grid-summary-pending">รอจัดหมวดข้อมูล</span></div>').replace('</article>','<p>BESS ทริป: ยังไม่มีช่องจัดประเภทในข้อมูลเดิม จึงยังไม่นับรวม</p></article>')+
 panel(3,'สรุปงานก่อสร้าง',[...constructionCounts,['อื่น ๆ / ยังไม่ระบุ',otherConstruction,'#8d9baa']],constructionNote)+
 panel(4,'ระดับความสำคัญและผลกระทบต่อระบบไฟฟ้า',[['สูง',open.filter(r=>r.criticality==='high').length,'#ef6474'],['ปานกลาง',open.filter(r=>r.criticality==='medium').length,'#f4a640'],['ต่ำ',open.filter(r=>r.criticality==='low').length,'#38c99a'],['ยังไม่ประเมิน',open.filter(r=>!['high','medium','low'].includes(r.criticality)).length,'#8d9baa']],`ทุกประเภทเหตุการณ์ รวม ${open.length} รายการ`).replace('class="grid-summary-panel"','class="grid-summary-panel grid-summary-combined"').replace('</header>','</header><div class="combined-assessments"><section><h4>ระดับความสำคัญอุปกรณ์</h4>').replace('</article>',`</section><section><h4>อุปกรณ์ที่มีผลกระทบต่อระบบ</h4>${bars([['มีรายละเอียดผลต่อระบบ',impact.length,'#57a7f5'],['ยังไม่ระบุผลต่อระบบ',open.length-impact.length,'#8d9baa']])}<p>นับรายการที่กรอกประเมินผลกระทบต่อระบบไฟฟ้า ยังไม่ใช่จำนวนที่ยืนยันว่ามีผลกระทบ</p></section></div></article>`)+
 `<article class="grid-summary-panel"><header><span class="grid-summary-number">5</span><h3>งานสำคัญ อปก.</h3></header>${['BESS','LPLC','TSLC','Data Center'].map(t=>`<div class="grid-summary-row"><span>${t}</span><span class="grid-summary-pending">รอจัดหมวดข้อมูล</span></div>`).join('')}<p>ข้อมูลปัจจุบันยังไม่มีช่องระบุหมวดงานสำคัญ จึงไม่แสดงเป็นศูนย์หรือเดาจากข้อความ</p></article>`+
 `<article class="grid-summary-panel"><header><span class="grid-summary-number">6</span><h3>ข้อมูลอุปกรณ์ใน อปก.</h3></header>${inventoryTableHtml()}</article></div>`;
}

const updateMillis=value=>{const raw=value?.toDate?.()||value;const ms=raw?new Date(raw).getTime():NaN;return Number.isFinite(ms)?ms:0};
export function latestRecordUpdates(records){
 const names=new Map();
 for(const r of records)for(const h of r.history||[]){if(h.by&&/[\u0E00-\u0E7F]/.test(h.displayName||''))names.set(h.by,h.displayName)}
 return records.map(r=>{
  const history=[...(r.history||[])].sort((a,b)=>updateMillis(b.at)-updateMillis(a.at));const last=history[0];
  const at=updateMillis(r.updatedAt)||updateMillis(last?.at)||updateMillis(r.createdAt);
  const author=/[\u0E00-\u0E7F]/.test(last?.displayName||'')?last.displayName:names.get(last?.by)||'ไม่พบชื่อผู้บันทึกในประวัติ';
  return {record:r,at,author};
 }).filter(x=>x.at).sort((a,b)=>b.at-a.at||String(a.record.id||a.record.code).localeCompare(String(b.record.id||b.record.code))).slice(0,3);
}
export function latestUpdatesHtml(records){
 const entries=latestRecordUpdates(records);
 if(!entries.length)return '<p class="empty">ยังไม่มีประวัติการเพิ่มหรือแก้ไข</p>';
 return '<div class="table-wrap"><table class="recent-updates-table"><thead><tr><th>อุปกรณ์</th><th>ผู้เพิ่ม / แก้ไข</th></tr></thead><tbody>'+entries.map(({record:r,at,author})=>`<tr><td><strong>${esc(r.equipment||r.breaker||'ยังไม่ระบุอุปกรณ์')}</strong><time>${esc(new Intl.DateTimeFormat('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at)))}</time></td><td>${esc(author)}</td></tr>`).join('')+'</tbody></table></div>';
}
