const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const eventGroups={
 'อุปกรณ์ชำรุด/ไม่พร้อมใช้งาน':['คาปาซิเตอร์แบงค์','หม้อแปลงไฟฟ้า','อุปกรณ์ อื่นๆๆ','รีเลย์ระบบป้องกัน','Breaker และ DS','สายส่งไฟฟ้า','อุปกรณ์เฝ้าระวังพิเศษ','โรงไฟฟ้า ใน อปก.'],
 'Abnormal Alarm':['BESS ทริป','Winding Temp','หม้อแปลงไฟฟ้า','คาปาซิเตอร์แบงค์','Breaker','ระบบสื่อสาร','รีเลย์ระบบป้องกัน','อุปกรณ์ อื่นๆๆ'],
 'งานก่อสร้าง':['สถานีไฟฟ้า','สายส่งไฟฟ้า','หม้อแปลงไฟฟ้า','คาปาซิเตอร์แบงค์','Breaker','อุปกรณ์ อื่นๆๆ']
};
const faults=['อุปกรณ์ขัดข้อง','งานบำรุงรักษาเกินกำหนด','ข้อจำกัด ระบบส่ง','Power Flow Control','งาน Switching Order'];
export function validEventPair(primary,secondary){return Object.hasOwn(eventGroups,primary)&&eventGroups[primary].includes(secondary);}
export function eventTypeFor(primary,secondary){
 if(primary==='อุปกรณ์ชำรุด/ไม่พร้อมใช้งาน')return 'อุปกรณ์ขัดข้อง';
 if(primary==='Abnormal Alarm')return secondary==='Winding Temp'?'Winding Temp Alarm':'Abnormal Alarm';
 if(primary==='งานก่อสร้าง')return 'โครงการก่อสร้าง';
 return '';
}
export function readEventClassification(record={}){
 const primary=Object.hasOwn(eventGroups,record.eventPrimary)?record.eventPrimary:record.eventType==='Winding Temp Alarm'||record.eventType==='Abnormal Alarm'?'Abnormal Alarm':record.eventType==='โครงการก่อสร้าง'?'งานก่อสร้าง':faults.includes(record.eventType)?'อุปกรณ์ชำรุด/ไม่พร้อมใช้งาน':'';
 if(validEventPair(primary,record.eventSecondary))return {primary,secondary:record.eventSecondary};
 let category=String(record.category||'').split(' · ')[0];
 const aliases={'หม้อแปลง':'หม้อแปลงไฟฟ้า','คาปาซิเตอร์':'คาปาซิเตอร์แบงค์','รีเลย์':'รีเลย์ระบบป้องกัน','เบรคเกอร์':'Breaker','เซอร์กิตเบรกเกอร์':'Breaker','Disconnecting SW':'Breaker และ DS','อุปกรณ์ สฟ.':'อุปกรณ์ อื่นๆๆ','อุปกรณ์ภายใน สฟ.':'อุปกรณ์ อื่นๆๆ','อื่น ๆ':'อุปกรณ์ อื่นๆๆ','ยังไม่ระบุ / อื่น ๆ':'อุปกรณ์ อื่นๆๆ'};
 category=aliases[category]||category;
 if(primary==='อุปกรณ์ชำรุด/ไม่พร้อมใช้งาน'&&category==='Breaker')category='Breaker และ DS';
 if(primary!=='อุปกรณ์ชำรุด/ไม่พร้อมใช้งาน'&&category==='Breaker และ DS')category='Breaker';
 if(record.eventType==='Winding Temp Alarm'&&primary==='Abnormal Alarm')category='Winding Temp';
 return {primary,secondary:validEventPair(primary,category)?category:''};
}
export function serializeEventClassification(primary,secondary,previous={}){
 if(!validEventPair(primary,secondary))throw Error('กรุณาเลือกเหตุการณ์หลักและเหตุการณ์ย่อยให้ครบและตรงกัน');
 const eventType=eventTypeFor(primary,secondary);
 return {eventPrimary:primary,eventSecondary:secondary,eventType,...(previous.eventType&&previous.eventType!==eventType&&!previous.originalEventType?{originalEventType:previous.eventType}:{})};
}
const radioHtml=(primary,selected='',disabled=false)=>(eventGroups[primary]||[]).map(label=>`<label><input type="radio" name="eventSecondary" value="${esc(label)}" required ${label===selected?'checked':''} ${disabled?'disabled':''}><span>${esc(label)}</span></label>`).join('');
export function eventClassificationHtml(record={}, {faultOnly=false}={}){
 const current=readEventClassification(record);
 const primary=faultOnly?'อุปกรณ์ชำรุด/ไม่พร้อมใช้งาน':current.primary;
 const secondary=validEventPair(primary,current.secondary)?current.secondary:'';
 const primaryChoices=faultOnly?[primary]:Object.keys(eventGroups);
 return `<div class="event-classification wide" data-event-classification><fieldset class="event-type-field"><legend>เหตุการณ์หลัก</legend><div class="event-type-options" role="radiogroup" aria-label="เหตุการณ์หลัก" data-event-primary>${primaryChoices.map(label=>`<label><input type="radio" name="eventPrimary" value="${esc(label)}" required ${label===primary?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div></fieldset><fieldset class="event-type-field"><legend>เหตุการณ์ย่อย (ชนิดของ อุปกรณ์ชำรุด/ไม่พร้อมใช้งาน)</legend><div class="event-type-options" role="radiogroup" aria-label="เหตุการณ์ย่อย" data-event-secondary>${primary?radioHtml(primary,secondary):'<p class="event-choice-hint">เลือกเหตุการณ์หลักเพื่อแสดงเหตุการณ์ย่อย</p>'}</div></fieldset><input type="hidden" name="eventType" value="${esc(eventTypeFor(primary,secondary))}"></div>`;
}
export function setupEventClassification(root,{editable=true,onSubChange=()=>{}}={}){
 if(!root)return;
 const primary=root.querySelector('[data-event-primary]'),choices=root.querySelector('[data-event-secondary]'),legacy=root.querySelector('[name="eventType"]');
 const primaryValue=()=>primary.querySelector('[name="eventPrimary"]:checked')?.value||'';
 const sync=()=>{const sub=choices.querySelector('[name="eventSecondary"]:checked')?.value||'';legacy.value=eventTypeFor(primaryValue(),sub);if(sub)onSubChange(sub);};
 primary.addEventListener('change',()=>{choices.innerHTML=primaryValue()?radioHtml(primaryValue(),'',!editable):'<p class="event-choice-hint">เลือกเหตุการณ์หลักเพื่อแสดงเหตุการณ์ย่อย</p>';sync();});
 choices.addEventListener('change',sync);
 primary.querySelectorAll('input').forEach(el=>el.disabled=!editable);
 choices.querySelectorAll('input').forEach(el=>el.disabled=!editable);
}
