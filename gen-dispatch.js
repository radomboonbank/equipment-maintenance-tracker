import {editIconHtml} from './edit-icons.js?v=20261106';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createGenDispatchStore(context){
 const access=()=>{const c=context();return {...c,editable:!!c.user&&['admin','editor'].includes(c.role),deletable:!!c.user&&c.role==='admin'&&['super admin','king admin'].includes(c.duty)}};
 return {
  canEdit:()=>access().editable,canDelete:()=>access().deletable,
  listen(next,error){const c=access();if(!c.cloud||!c.user){error(Error('กรุณาเข้าสู่ระบบเพื่อดูข้อมูล Gen Dispatch'));return ()=>{}}return c.cloud.onSnapshot(c.cloud.collection(c.cloud.db,'GenDispatch'),s=>next(s.docs.map(d=>({...d.data(),id:d.id}))),error)},
  async save(data,record){const c=access();if(!c.editable)throw Error('ไม่มีสิทธิ์บันทึก');
   const keys=['date','time','plant','unit','mw','details'];
   if(keys.some(k=>typeof data[k]!=='string')||data.plant.length>500||data.unit.length>250||data.details.length>4000||data.date.length>10||data.time.length>5||data.mw.length>40)throw Error('รูปแบบข้อมูลไม่ถูกต้อง');
   if(data.mw!==''&&(!Number.isFinite(Number(data.mw))||Number(data.mw)<0))throw Error('กำลังผลิตต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
   const ref=record?c.cloud.doc(c.cloud.db,'GenDispatch',record.id):c.cloud.doc(c.cloud.collection(c.cloud.db,'GenDispatch'));
   await c.cloud.runTransaction(c.cloud.db,async t=>{const s=await t.get(ref),old=s.exists()?s.data():null;
    if(record&&(!old||old.revision!==record.revision))throw Error('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาเปิดรายการใหม่');
    t.set(ref,{schemaVersion:1,type:'gen-dispatch',data,createdBy:old?.createdBy||c.user.uid,createdAt:old?.createdAt||c.cloud.serverTimestamp(),updatedBy:c.user.uid,updatedByName:c.displayName||c.username,updatedByUsername:c.username,updatedAt:c.cloud.serverTimestamp(),revision:(old?.revision||0)+1});
   });return ref.id;
  },
  async remove(record){const c=access();if(!c.deletable)throw Error('เฉพาะ super admin เท่านั้นที่ลบได้');if(!record?.id||record.id==='_schema')throw Error('รายการไม่ถูกต้อง');
   const ref=c.cloud.doc(c.cloud.db,'GenDispatch',record.id);await c.cloud.runTransaction(c.cloud.db,async t=>{const s=await t.get(ref);if(!s.exists()||s.data().revision!==record.revision)throw Error('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาเปิดรายการใหม่');t.delete(ref)});
  }
 };
}
export function openGenDispatch(store){
 const page=document.createElement('dialog');page.className='gen-dispatch-page work-draft-dialog';
 page.innerHTML=`<div class="work-draft-title"><h2>Gen Dispatch</h2><button type="button" data-close-page>ปิด ✕</button></div><div class="gen-dispatch-toolbar"><input type="search" placeholder="ค้นหาโรงไฟฟ้า สถานี หน่วยผลิต หรือรายละเอียด" aria-label="ค้นหา Gen Dispatch"><button type="button" class="primary" data-add>＋ เพิ่มข้อมูล</button></div><p role="status" data-load-status>กำลังโหลดข้อมูล…</p><div class="table-wrap"><table><thead><tr><th>วันที่ / เวลา</th><th>โรงไฟฟ้า / สถานี</th><th>หน่วยผลิต</th><th>กำลังผลิต (MW)</th><th>รายละเอียด</th><th>ผู้เพิ่ม / ปรับปรุง</th><th aria-label="การจัดการรายการ"></th></tr></thead><tbody></tbody></table></div>`;
 document.body.append(page);page.showModal();let records=[];
 const status=page.querySelector('[data-load-status]'),add=page.querySelector('[data-add]'),search=page.querySelector('input');add.hidden=!store.canEdit();
 const stamp=d=>{const [day,month,year]=String(d.date||'').split('/');return `${year||'0000'}${month||'00'}${day||'00'}${d.time||''}`};
 const render=()=>{const q=search.value.toLowerCase().trim(),rows=records.filter(r=>['plant','unit','details'].some(k=>String(r.data[k]||'').toLowerCase().includes(q))||!q).sort((a,b)=>stamp(b.data).localeCompare(stamp(a.data)));
 page.querySelector('tbody').innerHTML=rows.map(r=>`<tr><td>${esc(r.data.date||'—')} ${esc(r.data.time)}</td><td>${esc(r.data.plant||'—')}</td><td>${esc(r.data.unit||'—')}</td><td>${esc(r.data.mw||'—')}</td><td>${esc(r.data.details||'—')}</td><td>${esc(r.updatedByName||'—')}</td><td>${store.canEdit()?`<button type="button" class="edit-action-button" data-edit="${esc(r.id)}" aria-label="แก้ไขรายการ" title="แก้ไขรายการ">${editIconHtml}</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7">ยังไม่มีข้อมูลที่ตรงกับการค้นหา</td></tr>';status.textContent=`${rows.length} รายการ`;
 page.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editor(records.find(r=>r.id===b.dataset.edit)));
 };
 const editor=(record=null)=>{
  const d=document.createElement('dialog');d.className='work-draft-dialog';
  d.innerHTML=`<form class="work-draft-form"><div class="work-draft-title"><h2>${record?'แก้ไข':'เพิ่มข้อมูล'} Gen Dispatch</h2><button type="button" data-cancel>✕</button></div><div class="construction-grid"><label>วันที่ (พ.ศ.)<input name="date" placeholder="วว/ดด/พ.ศ."></label><label>เวลา<input type="time" name="time"></label><label>โรงไฟฟ้า / สถานี<input name="plant" maxlength="500"></label><label>หน่วยผลิต<input name="unit" maxlength="250"></label><label>กำลังผลิต (MW)<input type="number" step="any" min="0" name="mw"></label><label>รายละเอียด<textarea name="details" maxlength="4000" rows="4"></textarea></label></div><p role="status"></p><div class="work-action-buttons">${record&&store.canDelete()?'<button type="button" class="danger delete-record">ลบรายการ</button>':''}<button type="button" data-cancel>ปิด</button><button type="submit" class="primary">บันทึกข้อมูล</button></div></form>`;
  const form=d.querySelector('form');
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB-u-ca-buddhist-nu-latn',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const initial=record?.data||{date:`${parts.day}/${parts.month}/${parts.year}`,time:`${parts.hour}:${parts.minute}`};for(const [k,v] of Object.entries(initial)){if(form.elements.namedItem(k))form.elements.namedItem(k).value=v}
  document.body.append(d);d.showModal();let busy=false;const message=d.querySelector('[role=status]');
  d.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{if(!busy)d.close()});d.addEventListener('close',()=>d.remove(),{once:true});
  const run=async action=>{if(busy)return;busy=true;const buttons=[...d.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);message.textContent='กำลังดำเนินการ…';try{await action();d.close()}catch(e){message.textContent='ดำเนินการไม่สำเร็จ: '+(e.code==='permission-denied'?'ไม่มีสิทธิ์เข้าถึงข้อมูล กรุณาตรวจสิทธิ์ Firebase':e.message)}finally{busy=false;buttons.forEach(b=>b.disabled=false)}};
  form.onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(['date','time','plant','unit','mw','details'].map(k=>[k,String(new FormData(form).get(k)||'').trim()]));void run(()=>store.save(data,record))};
  const remove=d.querySelector('.delete-record');if(remove)remove.onclick=()=>{if(confirm('ยืนยันลบข้อมูล Gen Dispatch รายการนี้ออกจาก Firebase ถาวรหรือไม่?'))void run(()=>store.remove(record))};
 };
 add.onclick=()=>editor();search.oninput=render;page.querySelector('[data-close-page]').onclick=()=>page.close();
 const stop=store.listen(rows=>{records=rows;render()},e=>{status.textContent='โหลดข้อมูลไม่สำเร็จ: '+(e.code==='permission-denied'?'ยังไม่ได้เปิดสิทธิ์ Gen Dispatch ใน Firebase':e.message)});
 page.addEventListener('close',()=>{stop?.();page.remove()},{once:true});
}
