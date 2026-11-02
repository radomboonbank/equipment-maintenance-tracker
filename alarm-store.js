// Stores one independently saved alarm section per Firestore document.
export function createAlarmStore(getContext){
 return {
  async save(section,data,id){
   const {cloud,user,role,username,displayName}=getContext();
   if(!cloud||!user||!['admin','editor'].includes(role))throw Error('กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์บันทึก');
   if(![1,2,3].includes(section)||!data||Array.isArray(data)||typeof data!=='object')throw Error('รูปแบบข้อมูลไม่ถูกต้อง');
   if(Object.keys(data).length>400||JSON.stringify(data).length>150000)throw Error('ข้อมูลมากเกินไป กรุณาแยกบันทึก');
   const ref=id?cloud.doc(cloud.db,'AbnormalAlarm',id):cloud.doc(cloud.collection(cloud.db,'AbnormalAlarm'));
   await cloud.runTransaction(cloud.db,async transaction=>{
    const existing=await transaction.get(ref),previous=existing.exists()?existing.data():null;
    if(previous&&previous.section!==section)throw Error('ประเภทข้อมูลไม่ตรงกับรายการเดิม');
    const next={schemaVersion:1,section,type:['','general','bess','winding'][section],data,
     createdBy:previous?.createdBy||user.uid,createdAt:previous?.createdAt||cloud.serverTimestamp(),
     updatedBy:user.uid,updatedByName:displayName||username,updatedByUsername:username,
     updatedAt:cloud.serverTimestamp(),revision:(previous?.revision||0)+1};
    transaction.set(ref,next);
   });
   return ref.id;
  }
 };
}
