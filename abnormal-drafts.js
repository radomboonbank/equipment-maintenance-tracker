(() => {
 const field=(name,label,hint='',long=false)=>`<label>${label}${long?`<textarea name="${name}" rows="3" maxlength="4000" placeholder="${hint}"></textarea>`:`<input name="${name}" maxlength="500" placeholder="${hint}">`}</label>`;
 const select=(name,label,values)=>`<label>${label}<select name="${name}"><option value="">ยังไม่ระบุ</option>${values.map(v=>`<option>${v}</option>`).join('')}</select></label>`;
 const reporterFields=prefix=>`<div class="construction-grid alarm-section-reporter">${field(prefix+'ReporterName','แจ้ง พนักงานประจำ สฟ. ชื่อ','ชื่อพนักงาน')}<label>เบอร์มือถือ<input type="tel" name="${prefix}ReporterPhone" maxlength="50" placeholder="เบอร์มือถือ"></label></div>`;
 const section=(n,title,content)=>`<fieldset class="construction-section"><legend>${n}. ${title}</legend><div class="construction-grid">${content}</div></fieldset>`;
 window.openAbnormalDraft=()=>{
  const d=document.createElement('dialog');d.className='work-draft-dialog';
  d.innerHTML=`<form class="work-draft-form"><div class="work-draft-title"><div><small style="color:#087f85">ALARM REPORT</small><h2>แจ้ง Abnormal Alarm</h2></div><button type="button" data-close aria-label="ปิดหน้าต่าง">✕</button></div><p>แบบออกแบบออฟไลน์ · ทุกช่องเว้นว่างได้ · ยังไม่ส่ง Firebase หรือ Telegram</p>`+
  section(1,'ข้อมูลรับแจ้งและรายละเอียด Alarm',field('receivedDate','วันที่ได้รับแจ้ง (พ.ศ.)','วว/ดด/พ.ศ.')+'<label>เวลาที่ได้รับแจ้ง<input type="time" name="receivedTime"></label>'+field('station','สถานีไฟฟ้าแรงสูง','เช่น PTG')+field('equipment','ชื่อ / รหัสอุปกรณ์','เช่น TX1 หรือ Bkr. 80212')+select('alarmGroup','กลุ่ม Alarm',['หม้อแปลง','เบรคเกอร์','ระบบสื่อสาร','รีเลย์','อุปกรณ์ สฟ.','BESS ทริป','Winding Temp','อื่น ๆ'])+select('alarmState','สถานะ Alarm',['ยังปรากฏอยู่','เกิดเป็นครั้งคราว','หายแล้ว รอตรวจสอบ'])+field('alarmText','ข้อความ Alarm ที่ปรากฏ','ข้อความตามหน้าจอหรืออุปกรณ์',true)+field('symptoms','อาการและรายละเอียด','สิ่งที่ตรวจพบ และลำดับเหตุการณ์',true)+field('stationReporterName','แจ้ง พนักงานประจำ สฟ. ชื่อ','ชื่อพนักงาน')+'<label>เบอร์มือถือ<input type="tel" name="reporterPhone" maxlength="50" placeholder="เบอร์มือถือ"></label>')+
  section(2,'ข้อมูล BESS ทริป','<div class="bess-full"><p>บันทึกการทริปแต่ละชุดแยกแถว · เลือก PB ได้หลายหมายเลข · ทุกช่องเว้นว่างได้</p><div data-bess-events></div><button type="button" data-add-bess>＋ เพิ่มเหตุการณ์ทริป อื่นในวันเดียวกัน</button>'+reporterFields('bess')+'</div>')+
  section(3,'ข้อมูล Winding Temp Alarm','<div class="bess-full"><div class="construction-grid">'+field('windingDate','วันที่เกิด Alarm','วว/ดด/พ.ศ.')+'<label>เวลา<input type="time" name="windingTime" step="60"></label>'+field('windingStation','สถานีไฟฟ้าแรงสูง','เช่น RY2, BL, SR1')+field('windingTransformer','ชื่อ หม้อแปลงไฟฟ้า','เช่น KT5A, KT3A, KT1A')+field('windingCause','สาเหตุ / หมายเหตุ','เช่น PEA ย้าย Load มาฝาก หรือมีงาน De-energize หม้อแปลงอีกชุด',true)+`<fieldset class="bess-pb-field"><legend>Annunciator Show (เลือกได้ 1 รายการ)</legend>${['Winding Temp. Alarm Stage 1','Winding Temp. Alarm Stage 2','Oil Temperature Alarm'].map(v=>`<label class="bess-trip-check"><input type="radio" name="windingAnnunciator" value="${v}">${v}</label>`).join('')}</fieldset>`+'</div><p>เพิ่มลำดับสำหรับ Alarm และ Reset แต่ละครั้ง แยกวันที่เมื่อข้ามวัน · ค่าที่ไม่ทราบให้เว้นว่าง · เก็บตัวเลขตามที่ได้รับแจ้ง</p><div data-winding-events></div><button type="button" data-add-winding>＋ เพิ่มเหตุการณ์ Alarm / Reset</button>'+reporterFields('winding')+'</div>')+
  '<p role="status"></p><div class="work-action-buttons"><button type="button" data-close>ปิด</button><button class="primary">บันทึกฉบับร่างในเครื่อง</button></div></form>';
  document.body.append(d);d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());d.addEventListener('close',()=>d.remove(),{once:true});
  const form=d.querySelector('form');
  const now=new Date();
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB-u-ca-buddhist-nu-latn',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  form.elements.receivedDate.value=`${parts.day}/${parts.month}/${parts.year}`;
  form.elements.receivedTime.value=`${parts.hour}:${parts.minute}`;
  form.elements.windingDate.value=`${parts.day}/${parts.month}/${parts.year}`;
  form.elements.windingTime.value=`${parts.hour}:${parts.minute}`;

  const bessRows=d.querySelector('[data-bess-events]');let bessSequence=0;
  const addBess=()=>{
   const id=++bessSequence,prefix='bess-'+id+'-';
   const row=document.createElement('div');row.className='bess-event';
   row.innerHTML=`<div class="work-draft-title"><h3>เหตุการณ์ ทริป ที่ ${id}</h3></div><div class="construction-grid">`+
    (id===1?field(prefix+'date','วันที่เกิดเหตุการณ์ทริป (พ.ศ.)','วว/ดด/พ.ศ.')+`<label>เวลาเกิดเหตุการณ์ทริป<input type="time" name="${prefix}time" step="60"></label>`:`<label>เวลาเกิดเหตุการณ์ทริป ที่ ${id}<input type="time" name="${prefix}time" step="60"></label><div class="bess-time-spacer" aria-hidden="true"></div>`)+
    select(prefix+'tripType','ชนิดการทริป',['AC&DC Bkr. BESS','22 kV Bkr.','BESS (ยังไม่ระบุชนิดเบรกเกอร์)','อื่น ๆ'])+
    
    '<div class="bess-pb-side">'+select(prefix+'alarm','Alarm',['รอตรวจสอบ','Fire Alarm Bess op.','Fire Alarm Op.','Power Unit Temperature High','Lost Communication','อื่น ๆ'])+'</div>'+
    `<fieldset class="bess-pb-field"><legend>PB ที่ทริป (เลือกได้หลายรายการ)</legend><div class="bess-pb-grid">${Array.from({length:20},(_,i)=>`<label class="bess-pb-option"><input type="checkbox" name="${prefix}pb" value="${i+1}"><span>PB.${i+1}</span></label>`).join('')}</div></fieldset>`+
    `<div class="bess-breaker-state"><span>สถานะ 22 kV เบรกเกอร์</span><p data-breaker-state>ไม่มี 22 kV เบรกเกอร์ ทริป</p><label class="bess-trip-check"><input type="checkbox" name="${prefix}breaker22Trip" value="yes" data-breaker-trip> มี 22 kV เบรกเกอร์ ทริป</label><input type="hidden" name="${prefix}breaker22Status" value="ไม่มี 22 kV เบรกเกอร์ ทริป"><fieldset data-breaker-details class="bess-breaker-codes" hidden><legend>22 kV เบรกเกอร์ที่ทริป (เลือกได้หลายรายการ)</legend><div class="bess-breaker-code-grid">${['22212','22312','22412','22512','22612','22712','22812','22912','221012','221112'].map(code=>`<label class="bess-pb-option"><input type="checkbox" name="${prefix}breaker22Codes" value="${code}" disabled><span>${code}</span></label>`).join('')}</div></fieldset></div>`+
    
    '<div class="bess-cause-weather">'+select(prefix+'cause','สาเหตุ',['รอตรวจสอบ','ตรวจสอบแล้ว (ระบุรายละเอียด)'])+select(prefix+'weather','สภาพอากาศ',['ปกติ','ฝนตก','ฝนฟ้าคะนอง','อื่น ๆ'])+'</div>'+field(prefix+'causeDetails','รายละเอียดสาเหตุ','กรอกผลตรวจสอบจริง',true)+'</div>';
   const trip=row.querySelector('[data-breaker-trip]'),details=row.querySelector('[data-breaker-details]');
   trip.onchange=()=>{const text=trip.checked?'มี 22 kV เบรกเกอร์ ทริป':'ไม่มี 22 kV เบรกเกอร์ ทริป';row.querySelector('[data-breaker-state]').textContent=text;row.querySelector(`[name="${prefix}breaker22Status"]`).value=text;details.hidden=!trip.checked;details.querySelectorAll('input').forEach(input=>input.disabled=!trip.checked)};
   if(id===1){
    const current=Object.fromEntries(new Intl.DateTimeFormat('en-GB-u-ca-buddhist-nu-latn',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(part=>[part.type,part.value]));
    row.querySelector(`[name="${prefix}date"]`).value=`${current.day}/${current.month}/${current.year}`;
    row.querySelector(`[name="${prefix}time"]`).value=`${current.hour}:${current.minute}`;
   }
   bessRows.append(row);
  };
  d.querySelector('[data-add-bess]').onclick=addBess;addBess();
  const windingRows=d.querySelector('[data-winding-events]');let windingSequence=0;
  const addWinding=()=>{
   const id=++windingSequence,prefix='winding-'+id+'-';const row=document.createElement('div');row.className='bess-event';
   const numeric=(key,label)=>`<label>${label}<input type="number" step="any" name="${prefix}${key}" ${['mva','loadPercent'].includes(key)?'readonly placeholder="คำนวณอัตโนมัติ"':key==='kv'?'placeholder="เช่น 22.4 หรือไม่ทราบให้ว่าง"':'placeholder="ไม่ทราบให้เว้นว่าง"'}></label>`;
   row.innerHTML=`<div class="construction-grid">`+
    field(prefix+'date','วันที่ Reset Alarm','วว/ดด/พ.ศ.')+`<label>เวลา<input type="time" name="${prefix}time"></label>`+
    
    
    '</div>'+
    '<h4>Load ขณะเกิดเหตุ</h4><div class="winding-values-grid">'+numeric('mw','กำลังจริง (MW)')+numeric('mvar','กำลังรีแอคทีฟ (MVAr)')+numeric('mva','กำลังปรากฏ (MVA)')+numeric('loadPercent','โหลด (%)')+numeric('kv','ระดับแรงดันไฟฟ้า 22 kV อ่านได้ (kV)')+'</div>'+
    '<h4>อุณหภูมิ (°C)</h4><div class="winding-values-grid">'+numeric('ot','OT — อุณหภูมิน้ำมัน')+numeric('wtHv','Wt.(HV / HS) — ขดลวดแรงสูง')+numeric('wtLv','Wt.(LV / LS) — ขดลวดแรงต่ำ')+numeric('at','AT — อุณหภูมิแวดล้อม')+'</div>';
   const inputFor=key=>row.querySelector(`[name="${prefix}${key}"]`);
   const calculateLoad=()=>{
    const mw=inputFor('mw'),mvar=inputFor('mvar'),mva=inputFor('mva'),load=inputFor('loadPercent');
    if(mw.value.trim()===''||mvar.value.trim()===''||!Number.isFinite(mw.valueAsNumber)||!Number.isFinite(mvar.valueAsNumber)){mva.value='';load.value='';return}
    const apparent=Math.hypot(mw.valueAsNumber,mvar.valueAsNumber),percent=apparent/50*100;
    mva.value=Number.isFinite(apparent)?apparent.toFixed(2):'';
    load.value=Number.isFinite(percent)?percent.toFixed(2):'';
   };
   inputFor('mw').addEventListener('input',calculateLoad);inputFor('mvar').addEventListener('input',calculateLoad);
   const current=Object.fromEntries(new Intl.DateTimeFormat('en-GB-u-ca-buddhist-nu-latn',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(part=>[part.type,part.value]));
   row.querySelector(`[name="${prefix}date"]`).value=`${current.day}/${current.month}/${current.year}`;
   row.querySelector(`[name="${prefix}time"]`).value=`${current.hour}:${current.minute}`;
   windingRows.append(row);
  };
  d.querySelector('[data-add-winding]').onclick=addWinding;addWinding();
  form.onsubmit=e=>{e.preventDefault();try{const key='crod-abnormal-design-drafts-v1',items=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(items))throw Error();const values=new FormData(form);const bessEvents=[...bessRows.children].map(row=>{const entry={};row.querySelectorAll('input,select,textarea').forEach(el=>{if(el.disabled||!el.name)return;const key=el.name.replace(/^bess-\d+-/,'');if(key==='breaker22Trip'){entry[key]=el.checked;return}if(el.type==='checkbox'){entry[key]??=[];if(el.checked)entry[key].push(el.value)}else{entry[key]=el.multiple?[...el.selectedOptions].map(o=>o.value):el.value}});return entry}).filter(entry=>Object.values(entry).some(v=>Array.isArray(v)?v.length:typeof v==='boolean'?v:String(v).trim()));const windingEvents=[...windingRows.children].map(row=>{const entry={};row.querySelectorAll('input,select,textarea').forEach(el=>{if(el.disabled||!el.name)return;const key=el.name.replace(/^winding-\d+-/,'');if(el.type==='checkbox'){entry[key]??=[];if(el.checked)entry[key].push(el.value)}else{entry[key]=el.value}});return entry}).filter(entry=>Object.values(entry).some(v=>Array.isArray(v)?v.length:String(v).trim()));const general=Object.fromEntries([...values].filter(([key])=>!key.startsWith('bess-')&&!key.startsWith('winding-')));items.push({...general,bessEvents,windingEvents,createdAt:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(items));d.querySelector('[role=status]').textContent='บันทึกฉบับร่างในเครื่องแล้ว — ยังไม่ส่งฐานข้อมูล';}catch{d.querySelector('[role=status]').textContent='บันทึกไม่สำเร็จ กรุณาคัดลอกข้อมูลไว้ก่อนปิด'}};
  d.showModal();
 };
 const previewButton=document.getElementById('preview-add-abnormal');
 if(previewButton)previewButton.onclick=window.openAbnormalDraft;
})();
