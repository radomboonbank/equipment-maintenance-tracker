import {historyTime} from './record-history.js?v=20261114-record-history';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const boardCategories=['ทั่วไป','งานระบบไฟฟ้า','แจ้งปัญหา / ข้อเสนอแนะ'];
export function validateBoardText(title,body){
 if(typeof title!=='string'||!title.trim()||title.trim().length>120)throw Error('กรุณากรอกหัวข้อไม่เกิน 120 ตัวอักษร');
 if(typeof body!=='string'||!body.trim()||body.trim().length>10000)throw Error('กรุณากรอกข้อความไม่เกิน 10,000 ตัวอักษร');
}
export function boardRowDate(value){
 const raw=value?.toDate?.()??(typeof value?.seconds==='number'?value.seconds*1000:value);
 const date=raw instanceof Date?raw:new Date(raw||NaN);
 return Number.isNaN(date.getTime())?'ไม่พบวันที่':new Intl.DateTimeFormat('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
}
export function boardRowHtml(r){
 const label=r.title+' ('+r.createdByName+')';
 return `<article class="board-row"><time class="board-row-date thai-date-display">${esc(boardRowDate(r.createdAt))}</time><button type="button" class="board-topic" data-board-topic="${esc(r.id)}" title="${esc(label)}">${r.hidden?'[ซ่อน] ':''}${esc(label)}</button></article>`;
}
export function createWebBoard(session, {page=false,threadId=null}={}){
 let dialog=null,stopThreads=null,stopReplies=null,rows=[],selected=null,epoch=0,busy=false,limit=50;
 const context=()=>session();
 window.GRID_WEBBOARD_SESSION=context;
 const boardUrl=id=>`webboard.html${id?'?thread='+encodeURIComponent(id):''}`;
 const readable=()=>{const c=context();return !!c.cloud&&!!c.user&&['admin','editor','viewer'].includes(c.role)};
 const writable=()=>readable()&&['admin','editor'].includes(context().role);
 const moderator=()=>readable()&&context().role==='admin'&&context().duty==='king admin';
 const $=selector=>dialog.querySelector(selector);
 const status=(text,error=false)=>{const e=$('[data-board-status]');e.textContent=text;e.classList.toggle('board-error',error)};
 const editable=record=>moderator();
 function stop(){stopThreads?.();stopReplies?.();stopThreads=stopReplies=null;epoch++;}
 function close(){stop();if(page){window.close();return;}dialog?.close();dialog?.remove();dialog=null;rows=[];selected=null;busy=false;}
 function lock(value){busy=value;if(!dialog)return;dialog.querySelectorAll('[data-board-write]').forEach(b=>b.disabled=value);}
 function fail(error){status(error?.code==='permission-denied'?'บัญชีนี้ยังไม่มีสิทธิ์เข้าถึงเว็บบอร์ด':error?.message||'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่',true);}
 function renderList(){
  if(!dialog)return;
  const term=$('[data-board-search]').value.trim().toLocaleLowerCase('th'),category=$('[data-board-filter]').value;
  const visible=rows.filter(r=>(!r.hidden||moderator())&&(!category||r.category===category)&&(!term||[r.title,r.body,r.createdByName].some(v=>String(v||'').toLocaleLowerCase('th').includes(term))));
  $('[data-board-count]').textContent=`แสดง ${visible.length} จาก ${rows.filter(r=>!r.hidden||moderator()).length} กระทู้ที่โหลด`;
  $('[data-board-list]').innerHTML=visible.length?visible.map(r=>boardRowHtml(r).replace('<button type="button"','<a target="_blank" rel="opener" href="'+boardUrl(r.id)+'"').replace('</button>','</a>')).join(''):'<div class="board-empty"><strong>ยังไม่มีกระทู้ที่ตรงกับมุมมองนี้</strong><p>เริ่มแบ่งปันข้อมูลหรือสอบถามเรื่องงานได้ที่ “ตั้งกระทู้”</p></div>';
  $('[data-board-more]').hidden=rows.length<limit;
  if(selected){const fresh=rows.find(r=>r.id===selected.id);if(fresh){selected=fresh;renderTopic();}else{$('[data-board-detail]').hidden=true;selected=null;stopReplies?.();stopReplies=null;}}
 }
 function listen(){
  if(threadId){listenTopic();return;}
  stopThreads?.();const {cloud}=context(),mark=epoch;status('กำลังโหลดกระทู้…');
  stopThreads=cloud.onSnapshot(cloud.query(cloud.collection(cloud.db,'WebBoardThreads'),cloud.orderBy('createdAt','desc'),cloud.limit(limit)),snapshot=>{
   if(mark!==epoch||!dialog)return;rows=snapshot.docs.map(d=>({...d.data(),id:d.id}));status('');renderList();
  },error=>{if(mark===epoch&&dialog)fail(error)});
 }

 function listenTopic(){
  stopThreads?.();const {cloud}=context(),mark=epoch;
  status('กำลังโหลดกระทู้…');
  stopThreads=cloud.onSnapshot(cloud.doc(cloud.db,'WebBoardThreads',threadId),snapshot=>{
   if(mark!==epoch||!dialog)return;
   if(!snapshot.exists()||(snapshot.data().hidden&&!moderator())){
    selected=null;stopReplies?.();stopReplies=null;$('[data-board-detail]').hidden=true;
    status('ไม่พบกระทู้หรือกระทู้นี้ไม่เปิดให้แสดง');return;
   }
   const first=!selected;selected={...snapshot.data(),id:snapshot.id};rows=[selected];status('');
   if(first)openTopic(threadId);else renderTopic();
  },error=>{if(mark===epoch&&dialog)fail(error)});
 }
 function renderTopic(){
  if(!selected||!dialog)return;const r=selected;
  if(page&&threadId)document.title=r.title+' — เว็บบอร์ด';
  $('[data-board-detail]').hidden=false;
  $('[data-board-topic-content]').innerHTML=`<div class="board-topic-heading"><div><span class="board-category">${esc(r.category)}</span><h3 tabindex="-1">${esc(r.title)}</h3><small>${esc(r.createdByName)} · ${esc(historyTime(r.createdAt))}${r.revision>1?' · แก้ไขล่าสุด '+esc(historyTime(r.updatedAt)):''}</small></div><div class="board-topic-actions">${moderator()?'<button type="button" class="danger" data-board-delete data-board-write>ลบกระทู้</button>':''}${editable(r)?'<button type="button" data-board-edit data-board-write>แก้ไขกระทู้</button>':''}${moderator()?`<button type="button" data-board-hide data-board-write>${r.hidden?'แสดงกระทู้':'ซ่อนกระทู้'}</button>`:''}</div></div><p class="board-body">${esc(r.body)}</p>${r.hidden?'<p class="board-hidden">กระทู้นี้ถูกซ่อน</p>':''}`;
  $('[data-board-reply-form]').hidden=!writable()||r.hidden;
 }
 function openTopic(id){
  selected=rows.find(r=>r.id===id);if(!selected)return;
  stopReplies?.();renderTopic();$('[data-board-reply-form]').reset();$('[data-board-replies]').textContent='กำลังโหลดคำตอบ…';
  const {cloud}=context(),mark=epoch,topicId=id;
  stopReplies=cloud.onSnapshot(cloud.query(cloud.collection(cloud.db,'WebBoardThreads',id,'replies'),cloud.orderBy('createdAt','desc')),snapshot=>{
   if(mark!==epoch||!dialog||selected?.id!==topicId)return;
   $('[data-board-replies]').innerHTML=snapshot.docs.map(d=>({...d.data(),id:d.id})).filter(r=>!r.hidden||moderator()).map(r=>`<article class="board-reply"><small>${esc(r.createdByName)} · ${esc(historyTime(r.createdAt))}</small><p class="board-body">${esc(r.body)}</p>${moderator()?`<button type="button" data-board-hide-reply="${esc(r.id)}" data-hidden="${r.hidden}" data-board-write>${r.hidden?'แสดงคำตอบ':'ซ่อนคำตอบ'}</button>`:''}</article>`).join('')||'<p class="board-muted">ยังไม่มีคำตอบ</p>';
  },error=>{if(mark===epoch&&dialog)fail(error)});
  $('[data-board-topic-content] h3').focus();
 }
 function openComposer(record=null){
  if(!writable()||busy)return;const f=$('[data-board-compose]');f.hidden=false;f.dataset.editId=record?.id||'';f.dataset.revision=String(record?.revision||0);
  f.elements.title.value=record?.title||'';f.elements.body.value=record?.body||'';f.elements.category.value=record?.category||boardCategories[0];
  $('[data-board-compose-title]').textContent=record?'แก้ไขกระทู้':'ตั้งกระทู้ใหม่';f.elements.title.focus();
 }
 async function runWrite(action){
  if(busy||!writable())return;lock(true);const mark=epoch,uid=context().user.uid;
  try{await action(uid);if(mark!==epoch||!dialog)return;status('บันทึกข้อมูลแล้ว');}
  catch(error){if(mark===epoch&&dialog)fail(error)}finally{if(mark===epoch)lock(false)}
 }
 function open(){
  if(!page){const tab=window.open(boardUrl(),'_blank');if(tab)tab.focus();else window.alert('กรุณาอนุญาตให้เปิดแท็บใหม่สำหรับเว็บบอร์ด');return;}
  if(dialog){dialog.focus();return;}
  dialog=document.createElement(page?'main':'dialog');dialog.className=page?'webboard-page':'webboard-dialog';dialog.setAttribute('aria-labelledby','webboard-title');
  dialog.innerHTML=`<div class="board-top"><div><div class="eyebrow">CROD GRID CARE</div><h2 id="webboard-title">${threadId?'เพิ่มกระทู้ (เว็บบอร์ด)':'เว็บบอร์ด'}</h2><p>แบ่งปันข้อมูล สอบถาม และแลกเปลี่ยนเรื่องงาน</p>${threadId?'<p><a href="webboard.html">← รายการกระทู้</a></p>':''}</div><button type="button" data-board-close>ปิด ×</button></div><p data-board-status role="status" aria-live="polite"></p><div data-board-members><div class="board-toolbar"><input type="search" data-board-search aria-label="ค้นหากระทู้" placeholder="ค้นหาหัวข้อ ข้อความ หรือผู้ตั้งกระทู้…"><select data-board-filter aria-label="หมวดหมู่"><option value="">ทุกหมวดหมู่</option>${boardCategories.map(c=>`<option>${c}</option>`).join('')}</select><button type="button" class="primary" data-board-new data-board-write>+ ตั้งกระทู้</button><button type="button" data-board-refresh>โหลดใหม่</button></div><form data-board-compose hidden class="board-compose"><h3 data-board-compose-title>ตั้งกระทู้ใหม่</h3><label>หัวข้อ<input name="title" required maxlength="120"></label><label>หมวดหมู่<select name="category">${boardCategories.map(c=>`<option>${c}</option>`).join('')}</select></label><label>ข้อความ<textarea name="body" required maxlength="10000" rows="6"></textarea></label><div class="board-form-actions"><button type="button" data-board-cancel>ยกเลิก</button><button class="primary" type="submit" data-board-write>บันทึกกระทู้</button></div></form><p data-board-count class="board-muted"></p><div data-board-list></div><button type="button" data-board-more hidden>โหลดกระทู้เพิ่มเติม</button><section data-board-detail hidden class="board-detail"><button type="button" data-board-back>← กลับรายการกระทู้</button><div data-board-topic-content></div><h3>ประวัติข้อมูลที่เพิ่ม · ล่าสุดก่อน</h3><div data-board-replies></div><form data-board-reply-form><label>ตอบกระทู้<textarea name="reply" required maxlength="10000" rows="4"></textarea></label><button class="primary" type="submit" data-board-write>ส่งคำตอบ</button></form></section></div>`;
  document.body.append(dialog);if(!page)dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();if(!busy)close()});$('[data-board-close]').onclick=()=>{if(!busy)close()};
  if(!readable()){$('[data-board-members]').hidden=true;status('กรุณาเข้าสู่ระบบที่หน้าหลัก แล้วเปิดจากเมนูเว็บบอร์ด โดยเปิดหน้าหลักค้างไว้');return;}
  if(threadId){$('[data-board-new]').remove();$('[data-board-list]').hidden=true;$('[data-board-count]').hidden=true;$('[data-board-more]').hidden=true;dialog.querySelector('.board-toolbar').hidden=true;}
  else $('[data-board-new]').hidden=!writable();$('[data-board-search]').oninput=renderList;$('[data-board-filter]').onchange=renderList;
  $('[data-board-refresh]').onclick=listen;$('[data-board-more]').onclick=()=>{limit+=50;listen()};if(!threadId)$('[data-board-new]').onclick=()=>openComposer();
  $('[data-board-cancel]').onclick=()=>{if(!busy)$('[data-board-compose]').hidden=true};
  $('[data-board-back]').onclick=()=>{if(threadId){window.location.href=boardUrl();return;}$('[data-board-detail]').hidden=true;selected=null;stopReplies?.();stopReplies=null;$('[data-board-search]').focus()};
  dialog.onclick=e=>{if(e.target.closest('[data-board-edit]')&&selected&&moderator())openComposer(selected);
   const remove=e.target.closest('[data-board-delete]');if(remove&&selected&&moderator()&&!busy){
    const target=selected;
    if(window.confirm('ลบกระทู้นี้พร้อมคำตอบทั้งหมดถาวรหรือไม่?'))void runWrite(async uid=>{
     const {cloud}=context();
     const replies=await cloud.getDocs(cloud.collection(cloud.db,'WebBoardThreads',target.id,'replies'));
     if(!moderator()||context().user.uid!==uid)throw Error('สิทธิ์เปลี่ยนแปลง');
     for(let i=0;i<replies.docs.length;i+=400){const batch=cloud.writeBatch(cloud.db);replies.docs.slice(i,i+400).forEach(d=>batch.delete(d.ref));await batch.commit();}
     await cloud.deleteDoc(cloud.doc(cloud.db,'WebBoardThreads',target.id));
     if(dialog){selected=null;stopReplies?.();stopReplies=null;$('[data-board-detail]').hidden=true;}
    });
   }
   const hide=e.target.closest('[data-board-hide]');if(hide&&selected&&moderator())void runWrite(async uid=>{const {cloud}=context();const ref=cloud.doc(cloud.db,'WebBoardThreads',selected.id);await cloud.runTransaction(cloud.db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw Error('ไม่พบกระทู้');if(!moderator()||context().user.uid!==uid)throw Error('สิทธิ์เปลี่ยนแปลง');tx.update(ref,{hidden:!snap.data().hidden,updatedAt:cloud.serverTimestamp(),updatedBy:uid,revision:snap.data().revision+1})})});
   const reply=e.target.closest('[data-board-hide-reply]');if(reply&&selected&&moderator())void runWrite(async uid=>{const {cloud}=context();await cloud.updateDoc(cloud.doc(cloud.db,'WebBoardThreads',selected.id,'replies',reply.dataset.boardHideReply),{hidden:reply.dataset.hidden!=='true',updatedAt:cloud.serverTimestamp(),updatedBy:uid})});
  };
  $('[data-board-compose]').onsubmit=e=>{e.preventDefault();const f=e.currentTarget,title=f.elements.title.value.trim(),body=f.elements.body.value.trim(),category=f.elements.category.value,id=f.dataset.editId;
   try{validateBoardText(title,body)}catch(error){fail(error);return;}
   void runWrite(async uid=>{const {cloud,displayName,username}=context();const ref=id?cloud.doc(cloud.db,'WebBoardThreads',id):cloud.doc(cloud.collection(cloud.db,'WebBoardThreads'));
    await cloud.runTransaction(cloud.db,async tx=>{const snap=await tx.get(ref);if(!writable()||context().user.uid!==uid)throw Error('บัญชีหรือสิทธิ์เปลี่ยนแปลง');if(id){if(!snap.exists()||!editable(snap.data()))throw Error('ไม่มีสิทธิ์แก้ไขกระทู้นี้');if(snap.data().revision!==Number(f.dataset.revision))throw Error('กระทู้เปลี่ยนแปลงแล้ว กรุณาเปิดแก้ไขใหม่');tx.update(ref,{title,body,category,updatedAt:cloud.serverTimestamp(),updatedBy:uid,revision:snap.data().revision+1});}
     else tx.set(ref,{schemaVersion:1,title,body,category,createdBy:uid,createdByName:displayName||username,createdAt:cloud.serverTimestamp(),updatedBy:uid,updatedAt:cloud.serverTimestamp(),revision:1,hidden:false});});
    if(dialog){f.reset();f.hidden=true;}
   });
  };
  $('[data-board-reply-form]').onsubmit=e=>{e.preventDefault();if(!selected||selected.hidden)return;const f=e.currentTarget,body=f.elements.reply.value.trim(),id=selected.id;if(!body||body.length>10000){status('กรุณากรอกคำตอบไม่เกิน 10,000 ตัวอักษร',true);return;}
   void runWrite(async uid=>{const {cloud,displayName,username}=context();await cloud.setDoc(cloud.doc(cloud.collection(cloud.db,'WebBoardThreads',id,'replies')),{schemaVersion:1,body,createdBy:uid,createdByName:displayName||username,createdAt:cloud.serverTimestamp(),updatedBy:uid,updatedAt:cloud.serverTimestamp(),hidden:false});if(dialog)f.reset();});
  };
  listen();
 }
 document.querySelector('#webboard-nav')?.addEventListener('click',open);
 return {open,reset:()=>{if(page){stop();dialog?.remove();dialog=null;}else close();}};
}
