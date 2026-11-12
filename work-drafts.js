(() => {
 const groups={construction:['แบบบันทึกข้อมูลงานก่อสร้าง',['สถานีไฟฟ้า','สายส่งไฟฟ้า','หม้อแปลงไฟฟ้า','เบรคเกอร์','คาปาซิเตอร์']],important:['ข้อมูลงานสำคัญ อปก.',['BESS','LPLC','TSLC','Data Center']]};

 const constructionForm = `<fieldset class="construction-section"><legend>ข้อมูลโครงการ</legend><div class="construction-grid">
<label class="wide highlight-control"><input type="checkbox" name="highlight"> highlight</label>
<label>Job No. *<input name="projectId" required></label>
<label>ลำดับในรายงาน<input name="reportItem"></label>
<label class="wide">โครงการก่อสร้างทำที่ สถานีไฟฟ้า *<input name="title" required></label>
<label>ประเภทงาน<select name="category"><option value=""></option><option>สถานีไฟฟ้า</option><option>สายส่งไฟฟ้า</option><option>หม้อแปลงไฟฟ้า</option><option>เบรคเกอร์</option><option>คาปาซิเตอร์</option><option>อื่น ๆ</option></select></label>
<label>ระดับแรงดัน (kV)<select name="voltage"><option value=""></option><option>500</option><option>230</option><option>115</option><option>22</option></select></label>
<label>สถานีไฟฟ้า / สถานีต้นทาง<input name="station"></label><label>สถานีปลายทาง (สำหรับสายส่ง)<input name="stationTo"></label>
<label class="wide">ขอบเขตงานและอุปกรณ์<textarea name="scope"></textarea></label>
<label class="wide">รายละเอียดงาน<textarea name="workDetails" rows="4"></textarea></label>
</div></fieldset>
<fieldset class="construction-section"><legend>กำหนดเสร็จและเอกสารอ้างอิง</legend><div class="construction-grid">
<label>กำหนดแล้วเสร็จ (พ.ศ.)<input name="plannedEndDate"></label>
<label>ที่มาของกำหนดเสร็จ<input name="scheduleBasis"></label>
<label>เลขที่เอกสาร / ฉบับแก้ไข<input name="referenceNumber"></label><label>วันที่เอกสาร (พ.ศ.)<input name="referenceDate"></label>
<label>สถานะงานตามรายงาน<input name="workStatus"></label><label>โครงการที่รับงานต่อ<input name="successorProject"></label>
<label class="wide">เหตุผลหรือหมายเหตุ<textarea name="remarks"></textarea></label></div></fieldset>
<fieldset class="construction-section"><legend>ความคืบหน้าในรอบรายงาน</legend><p><small>ถ้ารายงานระบุ “-%” ให้เว้นว่าง ถ้าระบุ 0.00% ให้กรอก 0</small></p><div class="construction-grid">
<label>ผลงานรวม (%)<input type="number" name="actualProgress" min="0" max="100" step="any"></label>
<label>เทียบกับแผนปฏิบัติการ<select name="varianceDirection"><option value=""></option><option>เร็วกว่าแผน</option><option>ช้ากว่าแผน</option><option>ตามแผน</option></select></label>
<label>ส่วนต่างจากแผนตามรายงาน (%)<input type="number" name="variancePercent" min="0" max="100" step="any"></label>
<label>เปอร์เซ็นต์งานโยธา (%)<input type="number" name="civilProgress" min="0" max="100" step="any"></label>
<label>เปอร์เซ็นต์งานไฟฟ้า (%)<input type="number" name="electricalProgress" min="0" max="100" step="any"></label></div></fieldset>
<fieldset class="construction-section"><legend>แหล่งข้อมูล</legend><div class="construction-grid"><label>รอบรายงาน / วันที่ข้อมูล (พ.ศ.)<input name="reportPeriod"></label><label>ไฟล์ต้นฉบับและจุดอ้างอิง<input name="source"></label></div></fieldset>`;
 function openWorkDraft(kind,record=null,existingTab=null){
  const [title,choices]=groups[kind];
  let savedId=record?.id||null,pending=false;const online=kind==='construction';
  const tab=online?(existingTab||window.open('','_blank')):null;
  if(online&&!tab){window.alert('กรุณาอนุญาตให้เปิดแท็บใหม่เพื่อกรอกข้อมูลงานก่อสร้าง');return;}
  const doc=tab?tab.document:document;
  if(tab){
   tab.opener=null;
   doc.open();
   doc.write('<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>แบบบันทึกข้อมูลงานก่อสร้าง · CROD GRID CARE</title></head><body></body></html>');
   doc.close();
   const css=doc.createElement('link');css.rel='stylesheet';css.href=new URL('styles.css?v=20261112-highlight',location.href).href;doc.head.append(css);
  }
  const dialog=doc.createElement(tab?'main':'dialog');dialog.className=tab?'construction-page':'work-draft-dialog';
  const closeForm=()=>tab?window.returnToConstructionTable(tab):dialog.close();
  if(kind==='construction')dialog.classList.add('construction-report-dialog');
  dialog.innerHTML=`<form class="work-draft-form"><div class="work-draft-title"><h2>${title}</h2><button type="button" class="work-draft-close" data-cancel aria-label="ปิดหน้าต่าง">✕</button></div><p>${online?'กรอกหนึ่ง Job No. ต่อหนึ่งรอบรายงาน ช่องที่มี * จำเป็นต้องกรอก':'แบบทดลองออฟไลน์ · เก็บเฉพาะในเบราว์เซอร์เครื่องนี้ ยังไม่รวมยอด Dashboard'}</p>${kind==='construction'?constructionForm:`<label>ประเภท<select name="category"><option value="">ยังไม่ระบุ</option>${choices.map(x=>`<option>${x}</option>`).join('')}</select></label><label>ชื่อโครงการ / งาน<input name="title" maxlength="250"></label><label>สถานีไฟฟ้า / พื้นที่<input name="station" maxlength="250"></label><label>รายละเอียด<textarea name="details" maxlength="4000"></textarea></label><label>ผู้รับผิดชอบ<input name="owner" maxlength="250"></label>`}<p role="status"></p><div class="work-action-buttons"><button type="button" data-cancel style="background:#087f83;color:#fff;border-color:#087f83;display:inline-flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap">ปิด <span aria-hidden="true">×</span></button><button class="primary">${online?'บันทึกข้อมูล':'บันทึกฉบับร่างในเครื่อง'}</button></div></form>`;
  if(online){
   const actions=dialog.querySelector('.work-action-buttons');
   const remove=document.createElement('button');remove.type='button';remove.className='danger delete-record';remove.textContent='ลบรายการ';remove.disabled=!(record?.id&&window.GRID_CONSTRUCTION_STORE?.canDelete());actions.prepend(remove);
   remove.onclick=async()=>{
    if(pending||!window.GRID_CONSTRUCTION_STORE.canDelete())return;
    if(!dialog.ownerDocument.defaultView.confirm('ยืนยันลบรายการงานก่อสร้างนี้ออกจาก Firebase ถาวรหรือไม่?'))return;
    const message=dialog.querySelector('[role=status]');pending=true;
    const buttons=[...actions.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);message.textContent='กำลังลบ…';
    try{await window.GRID_CONSTRUCTION_STORE.remove(record.id,record.revision);closeForm()}
    catch(error){message.textContent='ลบไม่สำเร็จ: '+(error.code==='permission-denied'?'ไม่มีสิทธิ์ลบรายการ กรุณาตรวจสิทธิ์ Firebase':error.message)}
    finally{pending=false;buttons.forEach(b=>b.disabled=false)}
   };
  }
  if(record?.data)for(const [name,value] of Object.entries(record.data)){const input=dialog.querySelector('form').elements.namedItem(name);if(input){
   if(name==='voltage'&&value){
    const previous=String(value).trim(),normalized=previous.replace(/\s*kV$/i,'').trim();
    if(['500','230','115','22'].includes(normalized)){input.value=normalized;continue;}
    input.add(new Option(previous+' (ค่าเดิม)',previous));input.value=previous;
   }else if(input.type==='checkbox')input.checked=value===true;
   else input.value=value??'';
  }}
  const highlightInput=dialog.querySelector('[name="highlight"]');if(highlightInput)highlightInput.disabled=!window.GRID_CONSTRUCTION_STORE?.canHighlight?.();
  doc.body.append(dialog);dialog.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{if(!pending)closeForm()});
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  if(kind==='construction'&&record?.data?.stationMode==='line'){
   dialog.querySelector('[name=station]').value=record.data.stationFrom||record.data.station||'';
  }
  dialog.querySelector('form').onsubmit=async e=>{
   e.preventDefault();if(pending)return;const message=dialog.querySelector('[role=status]');
   if(online){const button=dialog.querySelector('button.primary');pending=true;button.disabled=true;message.textContent='กำลังบันทึก…';try{const formData=new FormData(e.target),data=Object.fromEntries(formData);data.highlight=window.GRID_CONSTRUCTION_STORE?.canHighlight?.()?formData.has('highlight'):record?.data?.highlight===true;
    for(const name of ['projectId','title']){
     data[name]=data[name].trim();
     if(!data[name])throw Error('กรุณากรอก Job No. และชื่อย่อ สฟ.');
    }
    for(const name of ['actualProgress','variancePercent','civilProgress','electricalProgress']){
     data[name]=data[name]===''?null:Number(data[name]);
    }
    data.stationMode=data.stationTo.trim()?'line':'single';
    data.stationFrom=data.stationMode==='line'?data.station:'';
    if(!window.GRID_CONSTRUCTION_STORE)throw Error('กรุณาตรวจการเชื่อมต่อและเข้าสู่ระบบในแท็บหลัก');
    savedId=await window.GRID_CONSTRUCTION_STORE.save(data,savedId,record?.revision);const category=e.target.elements.namedItem('category').value||'อื่น ๆ / ยังไม่ระบุ';closeForm();const notice=document.createElement('div');notice.setAttribute('role','status');notice.textContent='บันทึกข้อมูลใน Firebase แล้ว · หมวด '+category;notice.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:10000;background:#087f85;color:white;padding:16px 24px;border-radius:12px;max-width:90vw';document.body.append(notice);setTimeout(()=>notice.remove(),8000);}catch(error){message.textContent='บันทึกไม่สำเร็จ: '+(error.code==='permission-denied'?'บัญชีนี้ไม่มีสิทธิ์บันทึกข้อมูล':error.message)+' (ข้อมูลยังอยู่ในฟอร์ม)';}finally{pending=false;button.disabled=false}return;}
   try{const key='crod-local-work-drafts-v1',drafts=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(drafts))throw Error();drafts.push({...Object.fromEntries(new FormData(e.target)),kind,createdAt:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(drafts));message.textContent='เก็บฉบับร่างในเครื่องแล้ว';e.target.reset()}catch{message.textContent='บันทึกไม่ได้ กรุณาคัดลอกข้อมูลไว้ก่อนปิดหน้าต่าง'}
  };if(tab)tab.focus();else dialog.showModal();
 }
 window.openConstructionDraft=(record,tab)=>openWorkDraft('construction',record,tab);
 document.querySelectorAll('[data-work-draft]').forEach(button=>button.addEventListener('click',()=>openWorkDraft(button.dataset.workDraft)));
})();
