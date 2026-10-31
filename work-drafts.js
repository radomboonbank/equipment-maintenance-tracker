(() => {
 const groups={construction:['ข้อมูลงานก่อสร้าง',['สถานีไฟฟ้า','สายส่งไฟฟ้า','หม้อแปลงไฟฟ้า','เบรคเกอร์','คาปาซิเตอร์']],important:['ข้อมูลงานสำคัญ อปก.',['BESS','LPLC','TSLC','Data Center']]};

 const constructionEquipmentTypes=["หม้อแปลงไฟฟ้า", "สายส่งไฟฟ้า", "เซอร์กิตเบรกเกอร์", "Disconnecting SW", "คาปาซิเตอร์แบงค์", "รีเลย์ระบบป้องกัน", "ระบบสื่อสาร"];
 const constructionSections=[
 ['ข้อมูลโครงการ',[
 ['projectId','เลขที่โครงการ (Project ID)'],['title','ชื่อโครงการ'],['scope','ขอบเขตงาน','long'],['category','ประเภทงาน','constructionType']]],
 ['สถานีไฟฟ้า ที่มีงานก่อสร้าง',[['station','สถานีไฟฟ้าแรงสูง','stationToggle'],['constructionEquipmentType','ชนิดอุปกรณ์ที่ก่อสร้าง','equipmentType'],['equipmentDescription','คำอธิบายเพิ่มเติมอุปกรณ์','long']]],
 ['ผู้รับผิดชอบ',[['owner','เจ้าของโครงการ'],['supervisor','ผู้ควบคุมงาน'],['contractor','ผู้รับจ้าง']]],
 ['แผนงาน',[['startDate','วันเริ่มต้น (พ.ศ.)','text','วว/ดด/พ.ศ.'],['plannedEndDate','วันสิ้นสุดตามแผน (พ.ศ.)','text','วว/ดด/พ.ศ.'],['forecastEndDate','วันสิ้นสุดคาดการณ์ (พ.ศ.)','text','วว/ดด/พ.ศ.']]],
 ['ความคืบหน้า',[['plannedProgress','เปอร์เซ็นต์ตามแผน (%)','percent'],['actualProgress','เปอร์เซ็นต์จริง (%)','percent']]],
 ['ขั้นตอนงาน',[['workStage','ขั้นตอนงานปัจจุบัน','long','ออกแบบ, จัดซื้อ, ก่อสร้าง, ติดตั้ง, ทดสอบ, Energization, ส่งมอบ']]],
 ['ผลกระทบต่อระบบ',[['outageRequired','ต้องดับไฟหรือไม่'],['affectedEquipment','อุปกรณ์ที่เกี่ยวข้อง','long'],['affectedCircuits','วงจรที่ได้รับผลกระทบ','long']]],
 ['แผนดับไฟ',[['outageWindow','ช่วงเวลา','text','ระบุวันที่ (พ.ศ.) และเวลาเริ่ม–สิ้นสุด'],['outageDuration','ระยะเวลา'],['outageApproval','สถานะการอนุมัติ']]],
 ['ความเสี่ยง',[['delayRisk','งานล่าช้า','long'],['deliveryRisk','อุปกรณ์ส่งมอบช้า','long'],['siteConstraints','ข้อจำกัดพื้นที่','long'],['systemRisk','ความเสี่ยงด้านระบบ','long']]],
 ['ประเด็นค้าง',[['openIssues','รายการปัญหา','long'],['issueOwner','ผู้รับผิดชอบประเด็นค้าง'],['issueDue','กำหนดแก้ไข (พ.ศ.)','text','วว/ดด/พ.ศ.']]],
 ['ความพร้อมก่อนจ่ายไฟ',[['testReport','Test Report','long'],['protectionSetting','Protection Setting','long'],['interlock','Interlock','long'],['permit','Permit และการอนุมัติที่เกี่ยวข้อง','long']]],
 ['การส่งมอบ',[['actualEndDate','วันเสร็จจริง (พ.ศ.)','text','วว/ดด/พ.ศ.'],['testResult','ผลทดสอบ','long'],['asBuilt','เอกสาร As-built','long'],['handoverStatus','สถานะส่งมอบ']]]
 ];
 const constructionForm=()=>constructionSections.map(([heading,fields],i)=>`<fieldset class="construction-section"><legend>${i+1}. ${heading}</legend><div class="construction-grid">${fields.map(([name,label,type='text',hint=''])=>`<label>${label}${type==='stationToggle'?`<div class="construction-station-control"><button type="button" data-line-toggle aria-pressed="false" aria-controls="construction-line-fields">สายส่งไฟฟ้า</button><input type="hidden" name="stationMode" value="single"><div data-single-station><input name="station" maxlength="500" aria-label="สถานีไฟฟ้าแรงสูง"></div><div id="construction-line-fields" hidden><span>สถานีไฟฟ้าแรงสูงต้นทาง</span><input name="stationFrom" maxlength="500" aria-label="สถานีไฟฟ้าแรงสูงต้นทาง" disabled><span>สถานีไฟฟ้าแรงสูงปลายทาง</span><input name="stationTo" maxlength="500" aria-label="สถานีไฟฟ้าแรงสูงปลายทาง" disabled></div></div>`:type==='equipmentType'?`<select name="${name}"><option value="">เลือกชนิดอุปกรณ์</option>${constructionEquipmentTypes.map(v=>`<option value="${v}">${v}</option>`).join('')}</select>`:type==='constructionType'?`<select name="${name}"><option value="">อื่นๆ/ยังไม่ระบุ</option>${['สถานีไฟฟ้า','สายส่งไฟฟ้า','หม้อแปลงไฟฟ้า','เบรคเกอร์','คาปาซิเตอร์'].map(v=>`<option value="${v}" ${v==='เบรคเกอร์'?'selected':''}>${v}</option>`).join('')}</select>`:type==='long'?`<textarea name="${name}" maxlength="4000" rows="3" placeholder="${hint}"></textarea>`:`<input name="${name}" type="${type==='percent'?'number':'text'}" ${type==='percent'?'min="0" max="100" step="0.01"':'maxlength="500"'} placeholder="${hint}">`}</label>`).join('')}</div></fieldset>`).join('');
 document.querySelectorAll('[data-work-draft]').forEach(button=>button.addEventListener('click',()=>{
  const kind=button.dataset.workDraft,[title,choices]=groups[kind];
  const dialog=document.createElement('dialog');dialog.className='work-draft-dialog';
  dialog.innerHTML=`<form class="work-draft-form"><!-- All construction fields are optional. --><div class="work-draft-title"><h2>${title}</h2><button type="button" class="work-draft-close" data-cancel aria-label="ปิดหน้าต่าง">✕</button></div><p>แบบทดลองออฟไลน์ · เก็บเฉพาะในเบราว์เซอร์เครื่องนี้ ยังไม่รวมยอด Dashboard</p>${kind==='construction'?constructionForm():`<label>ประเภท<select name="category"><option value="">ยังไม่ระบุ</option>${choices.map(x=>`<option>${x}</option>`).join('')}</select></label><label>ชื่อโครงการ / งาน<input name="title" maxlength="250"></label><label>สถานีไฟฟ้า / พื้นที่<input name="station" maxlength="250"></label><label>รายละเอียด<textarea name="details" maxlength="4000"></textarea></label><label>ผู้รับผิดชอบ<input name="owner" maxlength="250"></label>`}<p role="status"></p><div class="work-action-buttons"><button type="button" data-cancel>ปิด</button><button class="primary">บันทึกฉบับร่างในเครื่อง</button></div></form>`;
  document.body.append(dialog);dialog.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>dialog.close());
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  if(kind==='construction'){
   const toggle=dialog.querySelector('[data-line-toggle]'),mode=dialog.querySelector('[name=stationMode]'),single=dialog.querySelector('[data-single-station]'),line=dialog.querySelector('#construction-line-fields');
   const sync=()=>{const active=mode.value==='line';toggle.setAttribute('aria-pressed',String(active));single.hidden=active;line.hidden=!active;single.querySelector('input').disabled=active;line.querySelectorAll('input').forEach(input=>input.disabled=!active)};
   toggle.onclick=()=>{mode.value=mode.value==='line'?'single':'line';sync()};
   dialog.querySelector('form').addEventListener('reset',()=>setTimeout(sync,0));sync();
  }

  dialog.querySelector('form').onsubmit=e=>{
   e.preventDefault();const message=dialog.querySelector('[role=status]');
   try{const key='crod-local-work-drafts-v1',drafts=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(drafts))throw Error();drafts.push({...Object.fromEntries(new FormData(e.target)),kind,createdAt:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(drafts));message.textContent='เก็บฉบับร่างในเครื่องแล้ว';e.target.reset()}catch{message.textContent='บันทึกไม่ได้ กรุณาคัดลอกข้อมูลไว้ก่อนปิดหน้าต่าง'}
  };dialog.showModal();
 }));
})();
