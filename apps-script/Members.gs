// Member administration. Called only by doPost; never from a public GET.
// Firebase verifies the caller token before owner OAuth is used for any write.
function manageMember_(input) {
 if(!input || !/^[a-f0-9-]{36}$/.test(input.requestId||'') || ['create','update','delete'].indexOf(input.action)<0)throw Error('Invalid request');
 var uid=authenticate_(input.idToken);
 var actor=memberDoc_(uid);
 if(actor.data.role!=='admin'||actor.data.duty!=='super admin')throw Error('Super admin required');
 var lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  // Recheck privileges inside the lock, including after a concurrent demotion.
  actor=memberDoc_(uid);
  if(actor.data.role!=='admin'||actor.data.duty!=='super admin')throw Error('Super admin required');
  var path='/memberOperations/'+input.requestId,prior;
  try{prior=firestore_(path,null,'get')}catch(e){if(e.status!==404)throw e}
  if(prior){if(decode_({mapValue:{fields:prior.fields}}).actor!==uid)throw Error('Request conflict');return {ok:true};}
  memberReceipt_(path,uid,'processing','กำลังดำเนินการ',true);
  try{
   applyMember_(input.action,input.member,uid,input.requestId);
   memberReceipt_(path,uid,'success','ดำเนินการสำเร็จ');
  }catch(e){memberReceipt_(path,uid,'error',e.memberMessage||'ดำเนินการไม่สำเร็จ กรุณาโหลดข้อมูลใหม่และตรวจสิทธิ์บริการก่อนลองอีกครั้ง');}
  return {ok:true};
 }finally{lock.releaseLock()}
}
function memberFail_(message){var e=Error(message);e.memberMessage=message;throw e}
function memberDoc_(uid){if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid||''))throw Error('Invalid uid');var d=firestore_('/DatabaseLogin/'+uid,null,'get');return {doc:d,data:decode_({mapValue:{fields:d.fields}})}}
function memberFields_(obj){var fields={};Object.keys(obj).forEach(function(k){fields[k]={stringValue:String(obj[k])}});return fields}
function memberReceipt_(path,actor,status,message,create){firestore_(path+(create?'?currentDocument.exists=false':''),{fields:memberFields_({actor:actor,status:status,message:message,at:new Date().toISOString()})},'patch')}
function authAdmin_(action,payload){
 var url='https://identitytoolkit.googleapis.com/v1/projects/'+PROJECT_ID+'/accounts'+(action==='create'?'':':'+action);
 var r=UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),'X-Goog-User-Project':PROJECT_ID},payload:JSON.stringify(payload),muteHttpExceptions:true});
 var body=JSON.parse(r.getContentText()||'{}');
 if(r.getResponseCode()<200||r.getResponseCode()>=300){if(body.error?.message?.indexOf('EMAIL_EXISTS')>=0)memberFail_('รหัสพนักงานนี้มีบัญชีแล้ว');throw Error('Auth administration failed ('+r.getResponseCode()+'): '+(body.error?.message||'Unknown error'))}
 return body;
}
function applyMember_(action,m,actor,requestId){
 if(!m||typeof m!=='object')throw Error('Invalid member');
 var current=action==='create'?null:memberDoc_(m.uid),old=current?.data;
 if(current && (old.memberVersion||'')!==(m.version||''))memberFail_('ข้อมูลสมาชิกเปลี่ยนแปลงแล้ว กรุณาโหลดใหม่');
 if(action==='delete'&&m.uid===actor)memberFail_('ไม่อนุญาตลบบัญชีตนเอง');
 var roles={'super admin':'admin','cac term':'editor','user':'viewer'};
 if(action!=='delete'){
  if(typeof m.employeeId!=='string'||!/^[a-z0-9_-]{1,64}$/.test(m.employeeId)||typeof m.displayName!=='string'||!m.displayName.trim()||m.displayName.length>250||typeof m.department!=='string'||m.department.length>250||!Object.prototype.hasOwnProperty.call(roles,m.duty))memberFail_('ข้อมูลสมาชิกไม่ถูกต้อง');
  if(m.passwordHash!==undefined && !/^[a-f0-9]{64}$/.test(m.passwordHash))throw Error('Invalid password');
  if(action==='create'&&!m.passwordHash)memberFail_('กรุณากรอกรหัสผ่าน');
  if(current&&old.username!==m.employeeId)memberFail_('ไม่สามารถเปลี่ยนรหัสพนักงานของบัญชีเดิม');
  if(current&&m.uid===actor&&m.duty!=='super admin')memberFail_('ไม่อนุญาตถอดสิทธิ์ตนเอง');
 }
 if(current&&old.role==='admin'&&old.duty==='super admin'&&(action==='delete'||m.duty!=='super admin')){
  var admins=firestore_(':runQuery',{structuredQuery:{from:[{collectionId:'DatabaseLogin'}],where:{fieldFilter:{field:{fieldPath:'duty'},op:'EQUAL',value:{stringValue:'super admin'}}}}}).filter(function(r){return r.document&&decode_({mapValue:{fields:r.document.fields}}).role==='admin'});
  if(admins.length<=1)memberFail_('ต้องเหลือ super admin อย่างน้อยหนึ่งบัญชี');
 }
 if(action==='delete'){
  // Disable first; remove authorization before deleting Auth. Never delete equipment/history.
  authAdmin_('update',{localId:m.uid,disableUser:true});
  firestore_('/DatabaseLogin/'+m.uid+'?currentDocument.updateTime='+encodeURIComponent(current.doc.updateTime),null,'delete');
  try{authAdmin_('delete',{localId:m.uid})}catch(e){memberFail_('ปิดสิทธิ์สมาชิกแล้ว แต่ลบบัญชี Authentication ไม่สำเร็จ ให้ผู้ดูแลตรวจบัญชีที่ถูกระงับใน Firebase')}
  return;
 }
 var values={employeeId:m.employeeId,username:m.employeeId,displayName:m.displayName.trim(),department:m.department.trim(),duty:m.duty,role:roles[m.duty],memberVersion:requestId};
 if(action==='create'){
  var auth=authAdmin_('create',{email:m.employeeId+'@'+PROJECT_ID+'.firebaseapp.com',password:m.passwordHash,displayName:values.displayName,disabled:true});
  var uid=auth.localId;
  try{
   firestore_('/DatabaseLogin/'+uid+'?currentDocument.exists=false',{fields:memberFields_(values)},'patch');
   authAdmin_('update',{localId:uid,disableUser:false});
  }catch(e){
   // A failed create must not leave usable permissions or an active Auth account.
   try{firestore_('/DatabaseLogin/'+uid,null,'delete')}catch(ignore){}
   try{authAdmin_('delete',{localId:uid})}catch(ignore){}
   throw e;
  }
 }else{
  var change={localId:m.uid,displayName:values.displayName};if(m.passwordHash)change.password=m.passwordHash;
  authAdmin_('update',change);
  var mask=Object.keys(values).map(function(k){return 'updateMask.fieldPaths='+k}).join('&');
  try{firestore_('/DatabaseLogin/'+m.uid+'?'+mask+'&currentDocument.updateTime='+encodeURIComponent(current.doc.updateTime),{fields:memberFields_(values)},'patch')}
  catch(e){memberFail_('อัปเดต Authentication แล้ว แต่บันทึกข้อมูลสมาชิกไม่สำเร็จ กรุณาโหลดใหม่ก่อนแก้ไขซ้ำ')}
 }
}
function checkMemberAdminConnection(){
 var result=authAdmin_('lookup',{localId:['PNJqfmNwYrQu4XbutduI5xenIbv2']});
 if(!result.users||!result.users.length)throw Error('Member Auth connection unavailable');
 console.log('Member administration OAuth connection OK. No account changed.');
}
