export function installStandbyBridge(session) {
 const channel = new BroadcastChannel('grid-standby-v1');
 const server = crypto.randomUUID();
 const canEdit = c => !!c.user && c.role === 'admin' && ['king admin','super admin'].includes(c.duty);
 channel.onmessage = async ({data:m}) => {
  if (!m || m.kind !== 'request' || m.server && m.server !== server) return;
  if (!['session','save'].includes(m.action)) return;
  const c = session();
  if (m.action === 'session') {
   channel.postMessage({kind:'response',id:m.id,client:m.client,server,result:{canEdit:canEdit(c)}});
   return;
  }
  try {
   if (!canEdit(c)) throw Error('บัญชีนี้ไม่มีสิทธิ์แก้ไข หรือออกจากระบบแล้ว');
   const {key,row,revision} = m.payload || {};
   if (!/^g[0-5]-[0-9]{1,3}$/.test(key) || !Array.isArray(row) || row.length !== 7 || row.some(v=>typeof v !== 'string' || v.length>2000) || !row[2].trim() || !Number.isInteger(revision) || revision<0) throw Error('ข้อมูลไม่ถูกต้อง');
   if (row[6] && row[6] !== '-' && row[2] !== 'ว่าง' && !/^0\d{9}$/.test(row[6])) throw Error('กรุณากรอกเบอร์มือถือ 10 หลัก');
   const f=c.cloud, ref=f.doc(f.db,'StandbyContacts',key),uid=c.user.uid;
   await f.runTransaction(f.db,async tx=>{
    const existing=await tx.get(ref);
    const member=await tx.get(f.doc(f.db,'DatabaseLogin',uid));
    const current=session();
    if(current.user?.uid!==uid || !canEdit(current) || !member.exists() || member.data().role!=='admin' || !['king admin','super admin'].includes(member.data().duty)) throw Error('ไม่มีสิทธิ์แก้ไขข้อมูล');
    if((existing.exists()?existing.data().revision:0)!==revision) throw Error('ข้อมูลถูกแก้ไขจากอีกหน้าแล้ว กรุณาปิดและเปิดรายการใหม่');
    tx.set(ref,{row,revision:revision+1,updatedBy:uid,updatedAt:f.serverTimestamp()});
   });
   channel.postMessage({kind:'response',id:m.id,client:m.client,server,result:{revision:revision+1}});
  } catch(e) {channel.postMessage({kind:'response',id:m.id,client:m.client,server,error:e.message||'บันทึกไม่สำเร็จ'});}
 };
 return ()=>channel.close();
}
