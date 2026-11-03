// Stores a construction project with server timestamps and editor attribution.
export function createConstructionStore(getContext){
 return {
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
