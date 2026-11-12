// Stores one independently saved alarm section per Firestore document.
export function createAlarmStore(getContext){
 return {
  canHighlight(){const {role,duty}=getContext();return role==='admin'&&['super admin','king admin'].includes(duty)},
  canDelete(){const {user,role,duty}=getContext();return !!user&&role==='admin'&&['super admin','king admin'].includes(duty)},
  async remove(id,revision){
   const {cloud,user,role,duty}=getContext();
   if(!cloud||!user||role!=='admin'||!['super admin','king admin'].includes(duty))throw Error('เฉพาะ super admin เท่านั้นที่ลบได้');
   if(!id||id==='_schema')throw Error('รายการไม่ถูกต้อง');
   const ref=cloud.doc(cloud.db,'AbnormalAlarm',id);
   await cloud.runTransaction(cloud.db,async transaction=>{
    const snapshot=await transaction.get(ref);
    if(!snapshot.exists())throw Error('รายการถูกลบแล้ว');
    if(snapshot.data().revision!==revision)throw Error('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาเปิดรายการใหม่ก่อนลบ');
    transaction.delete(ref);
   });
  },
  async saveMany(section,rows,ids){
   const {cloud,user,role,duty,username,displayName}=getContext();
   if(!cloud||!user||!['admin','editor'].includes(role))throw Error('กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์บันทึก');
   if(section!==2||!Array.isArray(rows)||!rows.length||rows.length>20||!Array.isArray(ids)||ids.length!==rows.length||new Set(ids).size!==ids.length)throw Error('ชุดเหตุการณ์ไม่ถูกต้อง');
   rows.forEach(data=>{if(!data||Array.isArray(data)||typeof data!=='object'||Object.keys(data).length>400||JSON.stringify(data).length>150000)throw Error('ข้อมูลเหตุการณ์ไม่ถูกต้อง');});
   if(ids.some(id=>typeof id!=='string'||!/^[A-Za-z0-9-]{1,100}$/.test(id)))throw Error('รหัสเหตุการณ์ไม่ถูกต้อง');
   const refs=ids.map(id=>cloud.doc(cloud.db,'AbnormalAlarm',id));
   await cloud.runTransaction(cloud.db,async tx=>{
    const snapshots=await Promise.all(refs.map(ref=>tx.get(ref)));
    const current=getContext();
    if(current.user?.uid!==user.uid||!['admin','editor'].includes(current.role))throw Error('บัญชีหรือสิทธิ์เปลี่ยนแปลง กรุณาเข้าสู่ระบบใหม่');
    snapshots.forEach((snapshot,i)=>{
     const previous=snapshot.exists()?snapshot.data():null;
     if(previous&&(previous.section!==section||previous.createdBy!==user.uid))throw Error('รหัสเหตุการณ์ซ้ำ กรุณาเปิด txt2web ใหม่');
     const previousHighlight=previous?.data?.highlight===true,highlight=rows[i].highlight===true;
     if(highlight!==previousHighlight&&!(role==='admin'&&['super admin','king admin'].includes(duty)))throw Error('เฉพาะ Super Admin หรือ King Admin เท่านั้นที่เปลี่ยน highlight ได้');
     tx.set(refs[i],{schemaVersion:1,section,type:'bess',data:{...rows[i],highlight},
      createdBy:previous?.createdBy||user.uid,createdAt:previous?.createdAt||cloud.serverTimestamp(),
      updatedBy:user.uid,updatedByName:displayName||username,updatedByUsername:username,
      updatedAt:cloud.serverTimestamp(),revision:(previous?.revision||0)+1});
    });
   });
   return ids;
  },
  async save(section,data,id){
   const {cloud,user,role,duty,username,displayName}=getContext();
   if(!cloud||!user||!['admin','editor'].includes(role))throw Error('กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์บันทึก');
   if(![1,2,3].includes(section)||!data||Array.isArray(data)||typeof data!=='object')throw Error('รูปแบบข้อมูลไม่ถูกต้อง');
   if(Object.keys(data).length>400||JSON.stringify(data).length>150000)throw Error('ข้อมูลมากเกินไป กรุณาแยกบันทึก');
   const ref=id?cloud.doc(cloud.db,'AbnormalAlarm',id):cloud.doc(cloud.collection(cloud.db,'AbnormalAlarm'));
   await cloud.runTransaction(cloud.db,async transaction=>{
    const existing=await transaction.get(ref),previous=existing.exists()?existing.data():null;
    if(previous&&previous.section!==section)throw Error('ประเภทข้อมูลไม่ตรงกับรายการเดิม');
    const previousHighlight=previous?.data?.highlight===true;
    const highlight=typeof data.highlight==='boolean'?data.highlight:previousHighlight;
    if(highlight!==previousHighlight&&!(role==='admin'&&['super admin','king admin'].includes(duty)))throw Error('เฉพาะ Super Admin หรือ King Admin เท่านั้นที่เปลี่ยน highlight ได้');
    const next={schemaVersion:1,section,type:['','general','bess','winding'][section],data:{...data,highlight},
     createdBy:previous?.createdBy||user.uid,createdAt:previous?.createdAt||cloud.serverTimestamp(),
     updatedBy:user.uid,updatedByName:displayName||username,updatedByUsername:username,
     updatedAt:cloud.serverTimestamp(),revision:(previous?.revision||0)+1};
    transaction.set(ref,next);
   });
   return ref.id;
  }
 };
}
