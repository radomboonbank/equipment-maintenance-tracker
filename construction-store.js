// Stores a construction project with server timestamps and editor attribution.
export function createConstructionStore(getContext){
 return {
  canDelete(){const {user,role,duty}=getContext();return !!user&&role==='admin'&&['super admin','king admin'].includes(duty)},
  async remove(id,revision){
   const {cloud,user,role,duty}=getContext();
   if(!cloud||!user||role!=='admin'||!['super admin','king admin'].includes(duty))throw Error('เฉพาะ super admin เท่านั้นที่ลบได้');
   if(!id||id==='_schema')throw Error('รายการไม่ถูกต้อง');
   const ref=cloud.doc(cloud.db,'ConstructionProjects',id);
   await cloud.runTransaction(cloud.db,async transaction=>{
    const snapshot=await transaction.get(ref);
    if(!snapshot.exists())throw Error('รายการถูกลบแล้ว');
    if(snapshot.data().revision!==revision)throw Error('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาเปิดรายการใหม่ก่อนลบ');
    transaction.delete(ref);
   });
  },
  async save(data,id){
   const {cloud,user,role,username,displayName}=getContext();
   if(!cloud||!user||!['admin','editor'].includes(role))throw Error('กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์บันทึก');
   if(!data||Array.isArray(data)||typeof data!=='object')throw Error('รูปแบบข้อมูลไม่ถูกต้อง');
   if(Object.keys(data).length>400||JSON.stringify(data).length>150000)throw Error('ข้อมูลมากเกินไป กรุณาแยกบันทึก');
   const ref=id?cloud.doc(cloud.db,'ConstructionProjects',id):cloud.doc(cloud.collection(cloud.db,'ConstructionProjects'));
   await cloud.runTransaction(cloud.db,async transaction=>{
    const existing=await transaction.get(ref),previous=existing.exists()?existing.data():null;
    
    const next={schemaVersion:1,type:'construction',data,
     createdBy:previous?.createdBy||user.uid,createdAt:previous?.createdAt||cloud.serverTimestamp(),
     updatedBy:user.uid,updatedByName:displayName||username,updatedByUsername:username,
     updatedAt:cloud.serverTimestamp(),revision:(previous?.revision||0)+1};
    transaction.set(ref,next);
   });
   return ref.id;
  }
 };
}
