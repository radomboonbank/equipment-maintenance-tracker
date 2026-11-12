export const ONLINE_WINDOW=180000;
export function activeUsers(entries,now=Date.now()){
 const users=new Map();
 for(const entry of entries){
  const at=entry.lastSeen?.toMillis?.() ?? 0;
  if(!entry.uid||!entry.displayName||at<=now-ONLINE_WINDOW||at>now+60000)continue;
  if(!users.has(entry.uid)||users.get(entry.uid).at<at)users.set(entry.uid,{uid:entry.uid,displayName:entry.displayName,at});
 }
 return [...users.values()].sort((a,b)=>b.at-a.at);
}
export function createPresence({render}){
 let run=null;
 function stop(){
  const old=run;run=null;
  if(!old)return Promise.resolve();
  clearInterval(old.timer);clearInterval(old.expiry);old.unsubscribe?.();
  window.removeEventListener('online',old.refresh);window.removeEventListener('offline',old.offline);
  window.removeEventListener('pagehide',old.leave);
  document.removeEventListener('visibilitychange',old.visible);
  return old.cloud.deleteDoc(old.ref).catch(()=>{});
 }
 function start(cloud,user,displayName){
  void stop();
  if(!user){render([],'เข้าสู่ระบบเพื่อดูผู้ใช้ออนไลน์');return}
  const state={cloud,ref:cloud.doc(cloud.db,'onlineSessions',user.uid+'_'+crypto.randomUUID()),entries:[],writing:false};run=state;
  render([],'กำลังโหลดผู้ใช้ออนไลน์…');
  state.offline=()=>{state.ready=false;if(run===state)render([],'ขาดการเชื่อมต่อ · ยังยืนยันผู้ใช้ออนไลน์ไม่ได้')};
  const paint=()=>{if(run===state&&state.ready&&navigator.onLine)render(activeUsers(state.entries))};
  state.refresh=()=>{
   if(run!==state||!navigator.onLine){state.offline();return}
   if(!state.writing){state.writing=true;cloud.setDoc(state.ref,{uid:user.uid,displayName,lastSeen:cloud.serverTimestamp()}).catch(()=>{if(run===state)render([],'ยังเชื่อมต่อสถานะออนไลน์ไม่ได้')}).finally(()=>{state.writing=false})}
   // Move the query window forward so abandoned session documents are not reread forever.
   state.unsubscribe?.();
   const query=cloud.query(cloud.collection(cloud.db,'onlineSessions'),cloud.where('lastSeen','>',cloud.Timestamp.fromMillis(Date.now()-ONLINE_WINDOW)));
   state.unsubscribe=cloud.onSnapshot(query,{includeMetadataChanges:true},snapshot=>{
    if(run!==state)return;
    if(snapshot.metadata.fromCache){state.ready=false;render([],'กำลังยืนยันสถานะออนไลน์…');return}
    state.ready=true;state.entries=snapshot.docs.filter(d=>!d.metadata.hasPendingWrites).map(d=>d.data());paint();
   },()=>{state.ready=false;if(run===state)render([],'ยังโหลดรายชื่อออนไลน์ไม่ได้ กรุณาตรวจสิทธิ์การเชื่อมต่อ')});
  };
  state.leave=()=>{void cloud.deleteDoc(state.ref).catch(()=>{})};
  state.visible=()=>{if(document.visibilityState==='visible')state.refresh()};
  window.addEventListener('online',state.refresh);window.addEventListener('offline',state.offline);
  window.addEventListener('pagehide',state.leave);document.addEventListener('visibilitychange',state.visible);
  state.timer=setInterval(state.refresh,60000);state.expiry=setInterval(paint,10000);state.refresh();
 }
 return {start,stop};
}

// One renewable login lease per Firebase account; King Admin bypasses the lease.
export function createLoginGuard({onLost}){
 const LEASE_MS=180000;
 let active=null;
 async function release(){
  const state=active;active=null;
  if(!state)return;
  clearInterval(state.timer);state.unsubscribe?.();
  window.removeEventListener('pagehide',state.leave);
  window.removeEventListener('online',state.refresh);
  window.removeEventListener('focus',state.refresh);
  document.removeEventListener('visibilitychange',state.visible);
  try{await state.cloud.runTransaction(state.cloud.db,async tx=>{
   const snap=await tx.get(state.ref);
   if(snap.exists()&&snap.data().sessionId===state.id)tx.delete(state.ref);
  })}catch{}
 }
 async function acquire(cloud,user,exempt=false){
  await release();
  if(exempt)return;
  const id=crypto.randomUUID(),ref=cloud.doc(cloud.db,'activeLogins',user.uid);
  const write=()=>({sessionId:id,lastSeen:cloud.serverTimestamp(),expiresAt:cloud.Timestamp.fromMillis(Date.now()+LEASE_MS)});
  await cloud.runTransaction(cloud.db,async tx=>{
   const snap=await tx.get(ref);
   if(snap.exists()&&snap.data().expiresAt.toMillis()>Date.now())throw Error('บัญชีนี้กำลังใช้งานอยู่ในหน้าต่างหรืออุปกรณ์อื่น กรุณาออกจากระบบที่เดิมก่อน');
   tx.set(ref,write());
  });
  const state={cloud,ref,id,writing:false};active=state;
  const lost=message=>{if(active!==state)return;void release().then(()=>onLost(message))};
  state.refresh=async()=>{
   if(active!==state||state.writing)return;
   state.writing=true;
   try{await cloud.runTransaction(cloud.db,async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists()||snap.data().sessionId!==id)throw Error('session-lost');
    tx.set(ref,write());
   })}catch(error){
    if(error.message==='session-lost'||error.code==='permission-denied')lost('เซสชันนี้สิ้นสุดแล้ว กรุณาเข้าสู่ระบบใหม่');
    else if(active===state&&Date.now()-state.confirmedAt>=LEASE_MS)lost('ยืนยันเซสชันไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วเข้าสู่ระบบใหม่');
   }finally{state.writing=false}
  };
  state.confirmedAt=Date.now();
  state.unsubscribe=cloud.onSnapshot(ref,snap=>{
   if(active!==state||snap.metadata.fromCache||snap.metadata.hasPendingWrites)return;
   if(!snap.exists()||snap.data().sessionId!==id){lost('บัญชีนี้มีเซสชันใหม่แล้ว กรุณาเข้าสู่ระบบใหม่');return}
   state.confirmedAt=Date.now();
  },()=>lost('ตรวจสอบเซสชันไม่ได้ กรุณาเข้าสู่ระบบใหม่'));
  state.leave=()=>{void release()};
  state.visible=()=>{if(!document.hidden)void state.refresh()};
  window.addEventListener('pagehide',state.leave);
  window.addEventListener('online',state.refresh);
  window.addEventListener('focus',state.refresh);
  document.addEventListener('visibilitychange',state.visible);
  state.timer=setInterval(state.refresh,45000);
 }
 return {acquire,release};
}
