(() => {
 const field=(name,label,hint='',long=false)=>`<label>${label}${long?`<textarea name="${name}" rows="3" maxlength="4000" placeholder="${hint}"></textarea>`:`<input name="${name}" maxlength="500" placeholder="${hint}">`}</label>`;
 const select=(name,label,values)=>`<label>${label}<select name="${name}"><option value="">ยังไม่ระบุ</option>${values.map(v=>`<option>${v}</option>`).join('')}</select></label>`;
 const reporterFields=prefix=>`<div class="construction-grid alarm-section-reporter">${field(prefix+'ReporterName','แจ้ง พนักงานประจำ สฟ. ชื่อ','ชื่อพนักงาน')}<label>เบอร์มือถือ<input type="tel" name="${prefix}ReporterPhone" maxlength="50" placeholder="เบอร์มือถือ"></label></div>`;
 const section=(n,title,content)=>`<fieldset class="construction-section" data-alarm-section="${n}"><legend>${n}. ${title}</legend><div class="construction-grid">${content}</div><div class="alarm-section-save"><p role="status" data-section-status></p><button type="button" data-close>ปิด</button><button type="button" class="primary" data-save-section="${n}">บันทึกข้อมูล</button></div></fieldset>`;
 window.openAbnormalDraft=(existing=null,targetDocument=document)=>{
  const document=targetDocument, Event=document.defaultView.Event, dialogWindow=document.defaultView;
  const offlinePreview=location.protocol==='file:'&&!window.GRID_ALARM_STORE;
  const d=document.createElement('dialog');d.className='work-draft-dialog';
  d.innerHTML=`<form class="work-draft-form"><div class="work-draft-title"><div><small style="color:#087f85">ALARM REPORT</small><h2>แจ้ง Abnormal Alarm</h2></div><button type="button" data-close aria-label="ปิดหน้าต่าง">✕</button></div><p>ทุกช่องเว้นว่างได้ · บันทึกแยกแต่ละข้อ</p>`+
  section(1,'ข้อมูลรับแจ้งและรายละเอียด Alarm',field('receivedDate','วันที่ได้รับแจ้ง (พ.ศ.)','วว/ดด/พ.ศ.')+'<label>เวลาที่ได้รับแจ้ง<input type="time" name="receivedTime"></label>'+field('station','สถานีไฟฟ้าแรงสูง','เช่น PTG')+field('equipment','ชื่อ / รหัสอุปกรณ์','เช่น TX1 หรือ Bkr. 80212')+select('alarmGroup','กลุ่ม Alarm',['หม้อแปลง','เบรคเกอร์','ระบบสื่อสาร','รีเลย์','อุปกรณ์ สฟ.','BESS ทริป','Winding Temp','อื่น ๆ'])+select('alarmState','สถานะ Alarm',['ยังปรากฏอยู่','เกิดเป็นครั้งคราว','หายแล้ว รอตรวจสอบ'])+field('alarmText','ข้อความ Alarm ที่ปรากฏ','ข้อความตามหน้าจอหรืออุปกรณ์',true)+field('symptoms','อาการและรายละเอียด','สิ่งที่ตรวจพบ และลำดับเหตุการณ์',true)+field('stationReporterName','แจ้ง พนักงานประจำ สฟ. ชื่อ','ชื่อพนักงาน')+'<label>เบอร์มือถือ<input type="tel" name="reporterPhone" maxlength="50" placeholder="เบอร์มือถือ"></label>')+
  section(2,'ข้อมูล BESS ทริป','<div class="bess-full"><p>บันทึกการทริปแต่ละชุดแยกแถว · เลือก PB ได้หลายหมายเลข · ทุกช่องเว้นว่างได้</p><div data-bess-events></div>'+reporterFields('bess')+'</div>')+
  section(3,'ข้อมูล Winding Temp Alarm','<div class="bess-full"><div class="construction-grid">'+field('windingDate','วันที่เกิด Alarm','วว/ดด/พ.ศ.')+'<label>เวลา<input type="time" name="windingTime" step="60"></label>'+field('windingStation','สถานีไฟฟ้าแรงสูง','เช่น RY2, BL, SR1')+`<fieldset class="bess-pb-field"><legend>ชื่อ หม้อแปลงไฟฟ้า</legend><div style="display:flex;flex-wrap:wrap;gap:16px">${['1A','2A','3A','4A','5A'].map(v=>`<label class="bess-trip-check"><input type="radio" name="windingTransformer" value="${v}">${v}</label>`).join('')}</div></fieldset>`+field('windingCause','สาเหตุ / หมายเหตุ','เช่น PEA ย้าย Load มาฝาก หรือมีงาน De-energize หม้อแปลงอีกชุด',true)+`<fieldset class="bess-pb-field"><legend>Annunciator Show (เลือกได้ 1 รายการ)</legend>${['Winding Temp. Alarm Stage 1','Winding Temp. Alarm Stage 2','Oil Temperature Alarm'].map(v=>`<label class="bess-trip-check"><input type="radio" name="windingAnnunciator" value="${v}">${v}</label>`).join('')}</fieldset>`+'</div><p>เพิ่มลำดับสำหรับ Alarm และ Reset แต่ละครั้ง แยกวันที่เมื่อข้ามวัน · ค่าที่ไม่ทราบให้เว้นว่าง · เก็บตัวเลขตามที่ได้รับแจ้ง</p><div data-winding-events></div>'+reporterFields('winding')+'</div>')+
  '</form>';
  document.body.append(d);d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());d.addEventListener('close',()=>d.remove(),{once:true});
  const form=d.querySelector('form');
  if(offlinePreview){
   d.querySelector('.work-draft-title + p').textContent='หน้าตัวอย่างออฟไลน์ · บันทึกเฉพาะในเครื่อง ไม่ส่งข้อมูลไป Firebase';
   d.querySelectorAll('[data-save-section]').forEach(button=>button.textContent='บันทึกฉบับร่างในเครื่อง');
  }
  const sectionIds=new Map();
  if(existing?.id)sectionIds.set(existing.section,existing.id);
  if(existing?.id&&window.GRID_ALARM_STORE?.canDelete?.()){
   const actions=d.querySelector(`[data-alarm-section="${existing.section}"] .alarm-section-save`);
   const remove=document.createElement('button');remove.type='button';remove.className='danger delete-record';remove.textContent='ลบรายการ';
   actions.prepend(remove);
   remove.onclick=async()=>{
    if(remove.disabled||!window.GRID_ALARM_STORE.canDelete())return;
    if(!dialogWindow.confirm('ยืนยันลบรายการนี้ออกจาก Firebase ถาวรหรือไม่?'))return;
    const buttons=[...actions.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
    const message=actions.querySelector('[data-section-status]');message.textContent='กำลังลบ…';
    try{await window.GRID_ALARM_STORE.remove(existing.id,existing.revision);d.close();document.querySelectorAll('[data-edit-alarm]').forEach(button=>{if(button.dataset.editAlarm==='alarm:'+existing.id)button.closest('tr')?.remove()});dialogWindow.alert('ลบข้อมูลใน Firebase แล้ว')}
    catch(error){message.textContent='ลบไม่สำเร็จ: '+(error.message||'กรุณาลองใหม่');buttons.forEach(b=>b.disabled=false)}
   };
  }
  d.querySelectorAll('[data-save-section]').forEach(button=>button.onclick=async()=>{
   const block=button.closest('[data-alarm-section]'),message=block.querySelector('[data-section-status]');
   const controls=[...block.querySelectorAll('input,select,textarea')];
   const invalid=controls.find(el=>!el.disabled&&!el.checkValidity());
   if(invalid){invalid.reportValidity();message.textContent='กรุณาตรวจสอบข้อมูลในข้อนี้';return}
   if(button.disabled)return;button.disabled=true;message.textContent='กำลังบันทึก…';
   try{
    const values=existing?.data?{...existing.data}:{};
    const seenCheckboxes=new Set();
    controls.forEach(el=>{
     if(el.disabled||!el.name)return;
     if(el.type==='radio'){if(el.checked)values[el.name]=el.value;return}
     if(el.type==='checkbox'){
      if(el.hasAttribute('data-breaker-trip'))values[el.name]=el.checked;
      else {if(!seenCheckboxes.has(el.name)){values[el.name]=[];seenCheckboxes.add(el.name)}if(el.checked)values[el.name].push(el.value)}
      return;
     }
     values[el.name]=el.multiple?[...el.selectedOptions].map(o=>o.value):el.value;
    });
    const section=Number(button.dataset.saveSection);
    if(window.GRID_ALARM_STORE){
     const id=await window.GRID_ALARM_STORE.save(section,values,sectionIds.get(section));
     sectionIds.set(section,id);message.textContent=`บันทึกข้อมูลข้อ ${section} ใน Firebase สำเร็จ`;
    }else{
     if(!offlinePreview)throw Error('ระบบเชื่อมต่อ Firebase ยังไม่พร้อม กรุณาโหลดหน้าใหม่แล้วเข้าสู่ระบบอีกครั้ง');
     const key='crod-abnormal-section-drafts-v1',items=JSON.parse(localStorage.getItem(key)||'[]');
     if(!Array.isArray(items))throw Error('ข้อมูลฉบับร่างในเครื่องไม่ถูกต้อง');
     items.push({section,data:values,createdAt:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(items));
     message.textContent=`บันทึกฉบับร่างข้อ ${section} ในเครื่องแล้ว (หน้าตัวอย่าง)`;
    }
    const savedMessage=message.textContent;
    d.close();
    const notice=document.createElement('div');notice.setAttribute('role','status');
    notice.textContent=savedMessage;
    notice.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:10000;background:#087f85;color:white;padding:16px 24px;border-radius:12px;max-width:90vw';
    document.body.append(notice);setTimeout(()=>notice.remove(),8000);
   }catch(error){message.textContent='บันทึกไม่สำเร็จ: '+(error.code==='permission-denied'?'ไม่มีสิทธิ์บันทึก กรุณาตรวจบัญชีและกฎฐานข้อมูล':error.message||'กรุณาลองใหม่')+' (ข้อมูลยังอยู่ในฟอร์ม)'}finally{button.disabled=false}
  });

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
    
    '<div class="bess-pb-side">'+select(prefix+'alarm','Alarm',['รอตรวจสอบ','Fire Alarm Bess op.','Fire Alarm Op.','Power Unit Temperature High','Lost Communication','Smoke Detector Op.','Inverter Fault','ATS MCCB Incoming UV Relay Op.','Fire System Operated','อื่น ๆ'])+'</div>'+
    `<fieldset class="bess-pb-field"><legend>PB ที่ทริป (เลือกได้หลายรายการ)</legend><div class="bess-pb-grid">${Array.from({length:20},(_,i)=>`<label class="bess-pb-option"><input type="checkbox" name="${prefix}pb" value="${i+1}"><span>PB.${i+1}</span></label>`).join('')}</div></fieldset>`+
    `<div class="bess-breaker-state"><span>สถานะ 22 kV เบรกเกอร์</span><p data-breaker-state>ไม่มี 22 kV เบรกเกอร์ ทริป</p><label class="bess-trip-check"><input type="checkbox" name="${prefix}breaker22Trip" value="yes" data-breaker-trip> มี 22 kV เบรกเกอร์ ทริป</label><input type="hidden" name="${prefix}breaker22Status" value="ไม่มี 22 kV เบรกเกอร์ ทริป"><fieldset data-breaker-details class="bess-breaker-codes" hidden><legend>22 kV เบรกเกอร์ที่ทริป (เลือกได้หลายรายการ)</legend><div class="bess-breaker-code-grid">${['22212','22312','22412','22512','22612','22712','22812','22912','221012','221112'].map(code=>`<label class="bess-pb-option"><input type="checkbox" name="${prefix}breaker22Codes" value="${code}" disabled><span>${code}</span></label>`).join('')}</div></fieldset></div>`+
    
    '<div class="bess-cause-weather">'+select(prefix+'cause','สาเหตุ',['รอตรวจสอบ','ตรวจสอบแล้ว (ระบุรายละเอียด)'])+select(prefix+'weather','สภาพอากาศ',['ปกติ','ฝนตก','ฝนฟ้าคะนอง','อื่น ๆ'])+'</div>'+field(prefix+'causeDetails','รายละเอียดสาเหตุ','กรอกผลตรวจสอบจริง',true)+'</div>';
   const grid=row.querySelector('.construction-grid');
   const columns=document.createElement('div');columns.className='bess-content-columns';
   const left=document.createElement('div');left.className='bess-content-column';
   const right=document.createElement('div');right.className='bess-content-column';
   left.append(row.querySelector('.bess-pb-side'),row.querySelector('.bess-breaker-state'),row.querySelector(`[name="${prefix}causeDetails"]`).closest('label'));
   right.append(row.querySelector('.bess-pb-field'),row.querySelector('.bess-cause-weather'));
   columns.append(left,right);grid.append(columns);
   const trip=row.querySelector('[data-breaker-trip]'),details=row.querySelector('[data-breaker-details]');
   trip.onchange=()=>{const text=trip.checked?'มี 22 kV เบรกเกอร์ ทริป':'ไม่มี 22 kV เบรกเกอร์ ทริป';row.querySelector('[data-breaker-state]').textContent=text;row.querySelector(`[name="${prefix}breaker22Status"]`).value=text;details.hidden=!trip.checked;details.querySelectorAll('input').forEach(input=>input.disabled=!trip.checked)};
   if(id===1){
    const current=Object.fromEntries(new Intl.DateTimeFormat('en-GB-u-ca-buddhist-nu-latn',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(part=>[part.type,part.value]));
    row.querySelector(`[name="${prefix}date"]`).value=`${current.day}/${current.month}/${current.year}`;
    row.querySelector(`[name="${prefix}time"]`).value=`${current.hour}:${current.minute}`;
   }
   bessRows.append(row);
  };
  addBess();
  const windingRows=d.querySelector('[data-winding-events]');let windingSequence=0;
  const addWinding=()=>{
   const id=++windingSequence,prefix='winding-'+id+'-';const row=document.createElement('div');row.className='bess-event';
   const numeric=(key,label)=>`<label>${label}<input type="number" step="any" name="${prefix}${key}" ${['mva','loadPercent'].includes(key)?'readonly placeholder="คำนวณอัตโนมัติ"':key==='kv'?'placeholder="เช่น 22.4 หรือไม่ทราบให้ว่าง"':'placeholder="ไม่ทราบให้เว้นว่าง"'}></label>`;
   row.innerHTML=`<fieldset class="bess-pb-field"><legend>สถานะ Reset Alarm</legend><div style="display:flex;flex-wrap:wrap;gap:20px"><label class="bess-trip-check"><input type="radio" name="${prefix}resetState" value="pending" checked>รอ Reset Alarm</label><label class="bess-trip-check"><input type="radio" name="${prefix}resetState" value="reset">Reset Alarm</label></div></fieldset><div data-reset-fields class="construction-grid" hidden></div>`+
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
   const resetFields=row.querySelector('[data-reset-fields]');
   row.querySelectorAll(`[name="${prefix}resetState"]`).forEach(radio=>radio.addEventListener('change',()=>{
    const active=row.querySelector(`[name="${prefix}resetState"]:checked`).value==='reset';
    resetFields.hidden=!active;
    resetFields.replaceChildren();
    if(active){
     resetFields.innerHTML=field(prefix+'date','วันที่ Reset Alarm','วว/ดด/พ.ศ.')+`<label>เวลา<input type="time" name="${prefix}time"></label>`;
     const current=Object.fromEntries(new Intl.DateTimeFormat('en-GB-u-ca-buddhist-nu-latn',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(part=>[part.type,part.value]));
     inputFor('date').value=`${current.day}/${current.month}/${current.year}`;
     inputFor('time').value=`${current.hour}:${current.minute}`;
    }
   }));
   windingRows.append(row);
  };
  addWinding();
  form.onsubmit=e=>e.preventDefault();
  if(existing?.data){
   d.querySelectorAll('[data-alarm-section]').forEach(block=>block.hidden=Number(block.dataset.alarmSection)!==existing.section);
   d.querySelector('h2').textContent='แก้ไข '+({1:'Abnormal Alarm',2:'BESS ทริป',3:'Winding Temp Alarm'}[existing.section]);
   const populate=()=>d.querySelectorAll('input,select,textarea').forEach(el=>{
    if(!el.name||!Object.prototype.hasOwnProperty.call(existing.data,el.name))return;
    const value=existing.data[el.name];
    if(el.type==='checkbox')el.checked=el.hasAttribute('data-breaker-trip')?value===true:Array.isArray(value)&&value.includes(el.value);
    else if(el.type==='radio')el.checked=el.value===value;
    else el.value=value??'';
   });
   populate();
   d.querySelectorAll('[data-breaker-trip],input[name$="resetState"]:checked').forEach(el=>el.dispatchEvent(new Event('change',{bubbles:true})));
   populate();
  }
  d.showModal();
 };
 const previewButton=document.getElementById('preview-add-abnormal');
 if(previewButton)previewButton.onclick=window.openAbnormalDraft;
})();
