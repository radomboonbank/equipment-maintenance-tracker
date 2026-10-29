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
