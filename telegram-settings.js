export async function saveEquipmentWithTelegram(cloud,ref,original,next,encode,user){
 const settingsRef=cloud.doc(cloud.db,'metadata','telegramSending');
 return cloud.runTransaction(cloud.db,async transaction=>{
  const snapshot=await transaction.get(ref),settings=await transaction.get(settingsRef);
  if(original&&(!snapshot.exists()||snapshot.data().revision!==original.revision))throw Error('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาปิดและเปิดรายการใหม่');
  if(!original&&snapshot.exists())throw Error('รหัสซ้ำ กรุณาบันทึกอีกครั้ง');
  const enabled=!settings.exists()||settings.data().enabled!==false;
  transaction.set(ref,encode(next));
  if(enabled)transaction.set(cloud.doc(cloud.db,'telegramOutbox',next.id+'__'+next.revision),{recordId:next.id,revision:next.revision,record:encode(next),createdBy:user.uid,createdAt:cloud.serverTimestamp(),readyAt:cloud.serverTimestamp(),status:'pending',nextPart:0,attempts:0});
  return enabled;
 });
}

export function setupTelegramControl(root,session){
 const panel=document.createElement('section');panel.className='panel telegram-control';panel.hidden=true;
 panel.innerHTML='<div><h2>การส่งข้อมูลไป Telegram</h2><p>ส่งข้อความแจ้งเตือน Telegram เมื่อบันทึกข้อมูลอุปกรณ์</p><p data-telegram-status role="status" aria-live="polite">กำลังโหลดสถานะ…</p></div><button type="button" class="telegram-switch" role="switch" aria-label="การส่งข้อมูลไป Telegram" aria-checked="false" disabled><span data-telegram-toggle-label>กำลังโหลด…</span></button>';
 root.querySelector('.heading').after(panel);
 const button=panel.querySelector('button'),label=panel.querySelector('[data-telegram-toggle-label]'),message=panel.querySelector('[data-telegram-status]');
 let allowed=false,ready=false,busy=false,enabled=true,stop=null,generation=0;
 const access=()=>{const c=session();return allowed&&!!c.user&&c.role==='admin'&&c.duty==='king admin';};
 function render(){panel.hidden=!access();button.disabled=!access()||!ready||busy;button.setAttribute('aria-checked',String(ready&&enabled));button.dataset.enabled=String(ready&&enabled);label.textContent=busy?'กำลังบันทึก…':!ready?'กำลังโหลด…':enabled?'เปิดอยู่ · กดเพื่อปิด':'ปิดอยู่ · กดเพื่อเปิด';}
 function reset(){generation++;stop?.();stop=null;allowed=false;ready=false;busy=false;enabled=true;panel.hidden=true;message.textContent='';render();}
 function setAccess(value){const c=session();if(!value||!c.user||c.role!=='admin'||c.duty!=='king admin'){reset();return;}allowed=true;panel.hidden=false;if(stop){render();return;}const mark=++generation;ready=false;message.textContent='กำลังโหลดสถานะ…';render();const {cloud}=session();
  stop=cloud.onSnapshot(cloud.doc(cloud.db,'metadata','telegramSending'),snapshot=>{if(mark!==generation)return;ready=true;enabled=!snapshot.exists()||snapshot.data().enabled!==false;message.textContent=enabled?'เปิดการส่งข้อความแจ้งเตือน Telegram อยู่':'ปิดการส่ง Telegram อยู่ · บันทึกข้อมูลได้ตามปกติ';render();},()=>{if(mark!==generation)return;ready=false;message.textContent='โหลดสถานะไม่ได้ กรุณาตรวจการเชื่อมต่อแล้วเปิดหน้านี้ใหม่';render();});
 }
 button.onclick=async()=>{if(!access()||!ready||busy)return;const {cloud,user}=session(),mark=generation,previous=enabled,desired=!enabled;busy=true;message.textContent='กำลังบันทึกสถานะ…';render();
  try{await cloud.runTransaction(cloud.db,async transaction=>{const ref=cloud.doc(cloud.db,'metadata','telegramSending'),snapshot=await transaction.get(ref);if(mark!==generation||!access()||session().user?.uid!==user.uid)throw Error('สิทธิ์หรือบัญชีเปลี่ยนแปลง กรุณาเข้าสู่ระบบใหม่');const current=!snapshot.exists()||snapshot.data().enabled!==false;if(current!==previous)throw Error('สถานะถูกเปลี่ยนจากอีกหน้าแล้ว กรุณาตรวจสถานะล่าสุดแล้วลองอีกครั้ง');transaction.set(ref,{enabled:desired,updatedBy:user.uid,updatedAt:cloud.serverTimestamp()});});if(mark!==generation)return;enabled=desired;message.textContent=desired?'เปิดการส่ง Telegram แล้ว':'ปิดการส่ง Telegram แล้ว · บันทึกข้อมูลได้ตามปกติ';}
  catch(error){if(mark===generation)message.textContent=error.code==='permission-denied'?'เปลี่ยนสถานะไม่ได้ เฉพาะ King Admin เท่านั้น':error.message||'บันทึกสถานะไม่สำเร็จ กรุณาลองใหม่';}
  finally{if(mark===generation){busy=false;render();}}
 };
 return {setAccess,reset,render};
}
