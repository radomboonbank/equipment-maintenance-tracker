import {editIconHtml,editIconStyles} from './edit-icons.js?v=20261106';
export function inventoryTableHtml(){
 const rows=[['สถานีไฟฟ้า',[16,20,28,'–']],['คาปาซิเตอร์แบงค์',['–',12,18,16]],['สายส่งไฟฟ้า',[16,20,28,28]],['จุดจ่ายไฟ',['–',20,28,28]]];
 const cells=values=>{const max=Math.max(...values.filter(v=>typeof v==="number"));return values.map(v=>`<td${typeof v==="number"&&v===max?' class="inventory-max"':""}>${v}</td>`).join("");};
 return `<div class="inventory-table-wrap"><table class="inventory-voltage-table"><thead><tr><th scope="col">อุปกรณ์</th>${['500','230','115','22'].map(v=>`<th scope="col">${v}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,values])=>`<tr><th scope="row">${label}</th>${cells(values)}</tr>`).join('')}</tbody><tbody class="inventory-transformers"><tr><td></td><th scope="col">500/230</th><th scope="col">230/115</th><th scope="col">115/22</th><td rowspan="2">–</td></tr><tr><th scope="row">หม้อแปลงไฟฟ้า</th>${cells([16,20,28])}</tr></tbody></table></div><div class="inventory-peaks"><section><svg class="peak-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v16h16M7 15l4-5 4 3 5-7M16 6h4v4"/></svg><h4>สูงสุดปี 2569</h4><strong>9,392.8 <small>MW</small></strong><p>28 เมษายน 2569 · 22:35 น.</p></section><section><svg class="peak-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H5v2a4 4 0 0 0 4 4M16 5h3v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6v3"/></svg><h4>สถิติสูงสุดตลอดกาล</h4><strong>9,800.2 <small>MW</small></strong><p>2 พฤษภาคม 2567 · 22:47 น.</p></section></div>`;
}
export const systemStatuses={normal:'ปกติ',monitoring:'เฝ้าระวัง',degraded:'มีข้อจำกัด',critical:'วิกฤต'};
export function bangkokDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function repairDue(record){if(record.repairPlan?.expectedDateUnknown)return '';const value=record.repairPlan?.expectedDate;return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value?value:''}
export function dashboardSummary(records,now=new Date()){
 const open=records.filter(r=>r.status!=='resolved'),today=bangkokDay(now);
 return {open:open.length,high:open.filter(r=>r.criticality==='high').length,unassessed:open.filter(r=>!['extreme','severe','moderate','minor'].includes(r.criticality)).length,overdue:open.filter(r=>repairDue(r)&&repairDue(r)<today),undated:open.filter(r=>!repairDue(r)),today};
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
export function faultRecordsForType(records,type){
 return sixPanelSummary(records).faults.filter(r=>type==='ยังไม่ระบุ / อื่น ๆ'?!mainTypes.includes(mainType(r)):mainType(r)===type);
}
export function constructionRecordsForType(records,projects,type){
 const types={'สถานีไฟฟ้า':'สถานีไฟฟ้า','สายส่งไฟฟ้า':'สายส่งไฟฟ้า','หม้อแปลงไฟฟ้า':'หม้อแปลงไฟฟ้า','เบรคเกอร์':'เซอร์กิตเบรกเกอร์','คาปาซิเตอร์':'คาปาซิเตอร์แบงค์'};
 const mapped=projects.filter(p=>p.data).map(p=>{const d=p.data;const m=String(d.startDate||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return {id:'construction:'+p.id,category:types[d.category]||d.category||'',date:m?`${Number(m[3])-543}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'',station:d.stationMode==='line'?[d.stationFrom,d.stationTo].filter(Boolean).join(' – '):d.station,equipment:[d.title,d.equipmentDescription].filter(Boolean).join(' · '),cause:d.scope};});
 return [...sixPanelSummary(records).construction,...mapped].filter(r=>type==='อื่น ๆ / ยังไม่ระบุ'?!Object.values(types).includes(mainType(r)):mainType(r)===types[type]);
}
export function assessmentRecordsForType(records,type){
 const open=records.filter(r=>r.status!=='resolved');
 const levels={'รุนแรงมาก':'extreme','รุนแรง':'severe','ปานกลาง':'moderate','เล็กน้อย':'minor'};
 if(levels[type])return open.filter(r=>r.criticality===levels[type]);
 if(type==='ยังไม่ประเมิน')return open.filter(r=>!['extreme','severe','moderate','minor'].includes(r.criticality));
 if(type==='มีรายละเอียดผลต่อระบบ')return open.filter(r=>String(r.criticalityAssessment?.effect||'').trim());
 if(type==='ยังไม่ระบุผลต่อระบบ')return open.filter(r=>!String(r.criticalityAssessment?.effect||'').trim());
 return [];
}
export function storedAlarmRecords(documents){
 const iso=value=>{const m=String(value||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${Number(m[3])-543}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:''};
 const types={'หม้อแปลง':'หม้อแปลงไฟฟ้า','เบรคเกอร์':'เซอร์กิตเบรกเกอร์','รีเลย์':'รีเลย์ระบบป้องกัน','อุปกรณ์ สฟ.':'อุปกรณ์ภายใน สฟ.'};
 return documents.filter(x=>[1,2,3].includes(x.section)&&x.data).map(x=>{
  const d=x.data,bess=x.section===2,winding=x.section===3;
  const pb=Array.isArray(d['bess-1-pb'])?d['bess-1-pb'].map(v=>'PB.'+v).join(', '):'';
  return {id:'alarm:'+x.id,updatedAt:x.updatedAt,createdAt:x.createdAt,updatedByName:x.updatedByName,updatedByUsername:x.updatedByUsername,date:iso(bess?d['bess-1-date']:winding?d.windingDate:d.receivedDate),
   eventType:winding||d.alarmGroup==='Winding Temp'?'Winding Temp Alarm':'Abnormal Alarm',
   category:bess?'BESS ทริป':types[d.alarmGroup]||d.alarmGroup||'',
   station:winding?d.windingStation:d.station||'',
   equipment:bess?['BESS',pb,d['bess-1-alarm']].filter(Boolean).join(' · '):winding?[d.windingTransformer,d.windingAnnunciator].filter(Boolean).join(' · '):[d.equipment,d.alarmText].filter(Boolean).join(' · '),
   cause:bess?[d['bess-1-cause'],d['bess-1-causeDetails']].filter(Boolean).join(' · '):winding?d.windingCause:d.symptoms,
   status:winding&&d['winding-1-resetState']==='reset'?'resolved':'pending'};
 });
}
export function alarmRecordsForType(records,type){
 const {open,alarms}=sixPanelSummary(records);
 if(type==='Winding Temp')return open.filter(r=>r.eventType==='Winding Temp Alarm');
 const types={'BESS ทริป':'BESS ทริป','หม้อแปลง':'หม้อแปลงไฟฟ้า','เบรคเกอร์':'เซอร์กิตเบรกเกอร์','ระบบสื่อสาร':'ระบบสื่อสาร','รีเลย์':'รีเลย์ระบบป้องกัน','อุปกรณ์สฟ.':'อุปกรณ์ภายใน สฟ.'};
 if(type==='อื่น ๆ / ยังไม่ระบุ')return alarms.filter(r=>!Object.values(types).includes(mainType(r)));
 return types[type]?alarms.filter(r=>mainType(r)===types[type]):[];
}
export function faultTablePage(type,rows,alarm=false,assessment=false,construction=false){
 const editable=rows.some(r=>r.editId);
 const levelTable=assessment&&['รุนแรงมาก','รุนแรง','ปานกลาง','เล็กน้อย','ยังไม่ประเมิน'].includes(type);
 const title=construction?'งานก่อสร้าง เกี่ยวกับ '+type:levelTable?'ระดับความสำคัญอุปกรณ์ เท่ากับ '+type:!alarm&&!assessment?'อุปกรณ์ที่ชำรุด คือ '+type:type;
 return `<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — CROD GRID CARE</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap');body{font-family:'Noto Sans Thai',Tahoma,sans-serif;background:#f3f7fa;color:#193c50;margin:0;padding:28px}h1{font-size:24px}.page-heading{display:flex;align-items:center;justify-content:space-between;gap:20px}.close-page{display:inline-flex;align-items:center;justify-content:center;width:max-content;min-width:max-content;white-space:nowrap;overflow-wrap:normal;word-break:normal;flex-shrink:0;padding:12px 20px;border:1px solid #087f83;border-radius:10px;background:#087f83;color:white;font:inherit;font-weight:bold;cursor:pointer}.close-page:hover{background:#e1f2ff;color:#193c50}.close-page:focus-visible{outline:3px solid #38bdf8;outline-offset:3px}p{color:#587283}.wrap{overflow:auto;background:white;border-radius:14px;border:1px solid #dce6eb}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:15px;text-align:left;border-bottom:1px solid #e5edf2;vertical-align:top}th{background:#eaf4f7}td{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#087f83}${editIconStyles}</style><div class="page-heading"><h1>${esc(title)}</h1><button type="button" class="close-page" id="close-table-page" aria-label="ปิดหน้าตาราง">ปิด ✕</button></div><p>${construction?'รายการงานก่อสร้าง':assessment?'รายการที่ยังไม่ปิดงาน':alarm?'Abnormal Alarm ที่ยังไม่ปิดงาน':'อุปกรณ์ขัดข้องที่ยังไม่ปิดงาน'} · ${rows.length} รายการ · ข้อมูล ณ เวลาที่เปิดหน้านี้</p><div class="wrap"><table><thead><tr><th>วันที่</th><th>สถานีไฟฟ้า</th><th>อุปกรณ์ที่ชำรุด</th><th>สาเหตุ</th>${levelTable?'':'<th>ระดับความสำคัญ</th>'}${editable?'<th aria-label="การจัดการรายการ"></th>':''}</tr></thead><tbody>${rows.map(r=>`<tr>${[r.date,r.station,r.equipment,r.cause,...(levelTable?[]:[r.criticality])].map((v,index)=>`<td${index===0?' class="thai-date-display" style="white-space:nowrap"':''}>${esc(v||'—')}</td>`).join('')}${editable?`<td>${r.editId?`<button type="button" class="edit-action-button" data-edit-alarm="${esc(r.editId)}" aria-label="แก้ไขรายการ" title="แก้ไขรายการ">${editIconHtml}</button>`:''}</td>`:''}</tr>`).join('')||'<tr><td colspan="5">ไม่มีรายการอุปกรณ์ชนิดนี้ที่ยังไม่ปิดงาน</td></tr>'}</tbody></table></div></html>`;
}
export function dashboardHtml(records,assessment=null,now=new Date(),projects=[],projectState='ready',alarmDocuments=[],alarmState='ready'){
 const {open,faults,construction,count}=sixPanelSummary(records);
 const alarmSummary=sixPanelSummary([...records,...storedAlarmRecords(alarmDocuments)]),alarms=alarmSummary.alarms;
 const bars=(items,clickable=false)=>{const max=Math.max(1,...items.map(x=>x[1]));return [...items].sort((a,b)=>clickable===4&&['รุนแรงมาก','รุนแรง','ปานกลาง','เล็กน้อย','ยังไม่ประเมิน'].includes(a[0])?['รุนแรงมาก','รุนแรง','ปานกลาง','เล็กน้อย','ยังไม่ประเมิน'].indexOf(a[0])-['รุนแรงมาก','รุนแรง','ปานกลาง','เล็กน้อย','ยังไม่ประเมิน'].indexOf(b[0]):b[1]-a[1]).map(([label,n,color])=>`<div class="grid-summary-row"><span>${esc(label)}</span>${clickable?`<button type="button" class="fault-drilldown" data-fault-type="${esc(label)}" data-summary-kind="${clickable===3?'construction':clickable===4?'assessment':clickable===2?'alarm':'fault'}" aria-label="ดูรายการ ${esc(label)} ${n} รายการ"><span class="grid-summary-track"><i style="width:${n/max*100}%;background:${color}"></i></span><b>${n}</b></button>`:`<div class="grid-summary-track"><i style="width:${n/max*100}%;background:${color}"></i></div><b>${n}</b>`}</div>`).join('')};
 const panel=(n,title,items,note)=>`<article class="grid-summary-panel"><header><span class="grid-summary-number">${n}</span><h3>${title}</h3></header>${bars(items,n>=1&&n<=4?n:0)}<p>${esc(note)}</p></article>`;
 const alarmTypes=[['BESS ทริป','BESS ทริป'],['หม้อแปลง','หม้อแปลงไฟฟ้า'],['เบรคเกอร์','เซอร์กิตเบรกเกอร์'],['ระบบสื่อสาร','ระบบสื่อสาร'],['รีเลย์','รีเลย์ระบบป้องกัน'],['อุปกรณ์สฟ.','อุปกรณ์ภายใน สฟ.']];
 const constructionTypes=[['สถานีไฟฟ้า','สถานีไฟฟ้า'],['สายส่งไฟฟ้า','สายส่งไฟฟ้า'],['หม้อแปลงไฟฟ้า','หม้อแปลงไฟฟ้า'],['เบรคเกอร์','เซอร์กิตเบรกเกอร์'],['คาปาซิเตอร์','คาปาซิเตอร์แบงค์']];
 const projectType=p=>({'เบรคเกอร์':'เซอร์กิตเบรกเกอร์','คาปาซิเตอร์':'คาปาซิเตอร์แบงค์'}[p.data?.category]||p.data?.category||'');
 const constructionCounts=constructionTypes.map(([l,t],i)=>[l,count(construction,t)+projects.filter(p=>projectType(p)===t).length,colors[i]]);
 const otherConstruction=construction.filter(r=>!constructionTypes.some(([,t])=>t===mainType(r))).length+projects.filter(p=>!constructionTypes.some(([,t])=>t===projectType(p))).length;
 const constructionNote=projectState==='ready'?`รวม ${construction.length+projects.length} รายการ · เดิม ${construction.length} / แบบฟอร์มก่อสร้าง ${projects.length}`:projectState==='guest'?'แสดงรายการเดิม · เข้าสู่ระบบเพื่อดูข้อมูลก่อสร้างเพิ่มเติม':projectState==='error'?'ข้อมูลก่อสร้างใหม่โหลดไม่สำเร็จ · ยอดยังไม่ครบ':'กำลังโหลดข้อมูลก่อสร้างเพิ่มเติม…';
 const winding=alarmSummary.open.filter(r=>r.eventType==='Winding Temp Alarm');
 const impact=open.filter(r=>String(r.criticalityAssessment?.effect||'').trim());
 return `<div class="grid-summary-six">`+
 panel(1,'สรุปอุปกรณ์ที่ชำรุด',[...mainTypes.map((t,i)=>[t,count(faults,t),colors[i]]),['ยังไม่ระบุ / อื่น ๆ',faults.filter(r=>!mainTypes.includes(mainType(r))).length,'#8d9baa']],`อุปกรณ์ขัดข้องทั้งหมด ${faults.length} รายการ`)+
 panel(2,'สรุป Abnormal Alarm',[...alarmTypes.map(([l,t],i)=>[l,count(alarms,t),colors[i]]),['Winding Temp',winding.length,'#e789c4'],['อื่น ๆ / ยังไม่ระบุ',alarms.filter(r=>!alarmTypes.some(([,t])=>t===mainType(r))).length,'#8d9baa']],`รวม ${alarms.length+winding.length} รายการ · รวม Winding Temp Alarm เฉพาะงานที่ยังไม่ปิด`).replace('</article>',alarmState==='ready'?'</article>':`<p>${alarmState==='error'?'โหลดข้อมูล AbnormalAlarm ไม่สำเร็จ ยอดยังไม่ครบ':alarmState==='guest'?'เข้าสู่ระบบเพื่อดูข้อมูล Alarm เพิ่มเติม':'กำลังโหลดข้อมูล Alarm เพิ่มเติม…'}</p></article>` )+
 panel(3,'สรุปงานก่อสร้าง',[...constructionCounts,['อื่น ๆ / ยังไม่ระบุ',otherConstruction,'#8d9baa']],constructionNote)+
 panel(4,'ระดับความสำคัญและผลกระทบต่อระบบไฟฟ้า',[['รุนแรงมาก',open.filter(r=>r.criticality==='extreme').length,'#ff0000'],['รุนแรง',open.filter(r=>r.criticality==='severe').length,'#ff6600'],['ปานกลาง',open.filter(r=>r.criticality==='moderate').length,'#ffff00'],['เล็กน้อย',open.filter(r=>r.criticality==='minor').length,'#00ee00'],['ยังไม่ประเมิน',open.filter(r=>!['extreme','severe','moderate','minor'].includes(r.criticality)).length,'#8d9baa']],`ทุกประเภทเหตุการณ์ รวม ${open.length} รายการ`).replace('class="grid-summary-panel"','class="grid-summary-panel grid-summary-combined"').replace('</header>','</header><div class="combined-assessments"><section><h4>ระดับความสำคัญอุปกรณ์</h4>').replace('</article>',`</section><section><h4>อุปกรณ์ที่มีผลกระทบต่อระบบ</h4>${bars([['มีรายละเอียดผลต่อระบบ',impact.length,'#57a7f5'],['ยังไม่ระบุผลต่อระบบ',open.length-impact.length,'#8d9baa']],4)}<p>นับรายการที่กรอกประเมินผลกระทบต่อระบบไฟฟ้า ยังไม่ใช่จำนวนที่ยืนยันว่ามีผลกระทบ</p></section></div></article>`)+
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
  const author=/[\u0E00-\u0E7F]/.test(r.updatedByName||'')?r.updatedByName:/[\u0E00-\u0E7F]/.test(last?.displayName||'')?last.displayName:names.get(r.updatedByUsername||last?.by)||r.updatedByName||'ไม่พบชื่อผู้บันทึกในประวัติ';
  return {record:r,at,author};
 }).filter(x=>x.at).sort((a,b)=>b.at-a.at||String(a.record.id||a.record.code).localeCompare(String(b.record.id||b.record.code))).slice(0,3);
}
export function latestUpdatesHtml(records){
 const entries=latestRecordUpdates(records);
 if(!entries.length)return '<p class="empty">ยังไม่มีประวัติการเพิ่มหรือแก้ไข</p>';
 return '<div class="table-wrap"><table class="recent-updates-table"><thead><tr><th>อุปกรณ์</th><th>ผู้เพิ่ม / แก้ไข</th></tr></thead><tbody>'+entries.map(({record:r,at,author})=>`<tr><td><strong>${esc(r.equipment||r.breaker||'ยังไม่ระบุอุปกรณ์')}</strong><time>${esc(new Intl.DateTimeFormat('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at)))}</time></td><td>${esc(author)}</td></tr>`).join('')+'</tbody></table></div>';
}

export function genDispatchTablePage(records=[]){
 const rows=records.map(r=>`<tr>${[r.date,r.plant,r.unit,r.mw,r.details].map(v=>`<td>${esc(v??'—')}</td>`).join('')}</tr>`).join('');
 return `<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gen Dispatch — CROD GRID CARE</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap');body{font-family:'Noto Sans Thai',Tahoma,sans-serif;background:#f3f7fa;color:#193c50;margin:0;padding:28px}.page-heading{display:flex;justify-content:space-between;align-items:center;gap:20px}h1{font-size:24px}.close-page{padding:12px 20px;border:1px solid #087f83;border-radius:10px;background:#087f83;color:white;font:inherit;font-weight:600;white-space:nowrap;cursor:pointer}p{color:#587283}.wrap{overflow:auto;background:white;border:1px solid #dce6eb;border-radius:14px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:15px;text-align:left;border-bottom:1px solid #e5edf2;vertical-align:top}th{background:#eaf4f7}td{white-space:pre-wrap;overflow-wrap:anywhere}.empty{text-align:center;padding:36px;color:#587283}</style><div class="page-heading"><h1>Gen Dispatch</h1><button class="close-page" id="close-table-page" type="button">ปิด ✕</button></div><p>ข้อมูล Gen Dispatch · ${records.length} รายการ</p><div class="wrap"><table><thead><tr><th>วันที่ / เวลา</th><th>โรงไฟฟ้า / สถานี</th><th>หน่วยผลิต</th><th>กำลังผลิต (MW)</th><th>รายละเอียด</th></tr></thead><tbody>${rows||'<tr><td class="empty" colspan="5">ยังไม่มีข้อมูล Gen Dispatch</td></tr>'}</tbody></table></div></html>`;
}
