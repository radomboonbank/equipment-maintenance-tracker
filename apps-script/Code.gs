// GRID CARE: authenticated, on-save Telegram delivery. No scheduled jobs.
var PROJECT_ID = 'equipment-maintenance-tr-fdae3';
var DB_URL = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents';
var NEVER = '9999-12-31T00:00:00.000Z';

function checkConnection() {
  var result = firestore_(':runQuery', {structuredQuery:{from:[{collectionId:'telegramOutbox'}],limit:1}});
  console.log('Firebase connection OK. Queue is private. No Telegram message sent.');
  return result.length;
}

function removeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t){if(t.getHandlerFunction()==='processQueue')ScriptApp.deleteTrigger(t)});
  console.log('Scheduled Telegram delivery disabled.');
}

// Only a signed-in editor can dispatch their own newly saved revision.
// No timer, sweep, background retry, or sending on page load.
function doPost(e) {
  var result={ok:false};
  try {
    if(!e || !e.postData || e.postData.contents.length>10000)throw Error('Invalid request');
    result=dispatch_(JSON.parse(e.postData.contents));
  } catch(err) { result={ok:false,error:'Request rejected or delivery unavailable'}; }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
function dispatch_(input) {
  if(!input || !/^[A-Za-z0-9_-]{1,250}__[1-9][0-9]{0,9}$/.test(input.key||'') || typeof input.idToken!=='string' || input.idToken.length>8000)throw Error('Invalid request');
  var uid=authenticate_(input.idToken);
  var doc=firestore_('/telegramOutbox/'+input.key,null,'get');
  var job=decode_({mapValue:{fields:doc.fields}});
  if(job.createdBy!==uid)throw Error('Not owner');
  if(job.status==='sent')return {ok:true,status:'sent'};
  if(job.status!=='pending' || job.attempts!==0)return {ok:false,status:job.status};
  // Historical pending records are never swept or dispatched on reload.
  if(Date.now()-Date.parse(job.createdAt)>300000)throw Error('Save request expired');
  return deliver_(doc,config_());
}
function authenticate_(token) {
  var parts=token.split('.');
  if(parts.length!==3)throw Error('Invalid identity');
  // Decode only to select the profile path. Firestore validates the signature,
  // project, expiry and uid through its existing self-only profile rules.
  var claims=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString());
  var uid=claims.sub;
  if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(uid))throw Error('Invalid identity');
  var response=UrlFetchApp.fetch(DB_URL+'/DatabaseLogin/'+uid,{headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});
  if(response.getResponseCode()!==200)throw Error('Invalid identity');
  var profile=decode_({mapValue:{fields:JSON.parse(response.getContentText()).fields}});
  if(['admin','editor'].indexOf(profile.role)<0)throw Error('Read only');
  return uid;
}

function config_() {
  var p=PropertiesService.getScriptProperties();
  var token=p.getProperty('TELEGRAM_BOT_TOKEN'),chat=p.getProperty('TELEGRAM_CHAT_ID');
  if(!token||!chat)throw new Error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Script Properties first.');
  if(!/^\d+:[A-Za-z0-9_-]+$/.test(token)||!/^(-?\d+|@[A-Za-z0-9_]+)$/.test(chat))throw new Error('Invalid Telegram configuration format.');
  return {token:token,chat:chat};
}

function deliver_(doc,config) {
  var job=decode_({mapValue:{fields:doc.fields}});
  if(job.status==='sent')return {ok:true,status:'sent'};
  if(job.status!=='pending'||job.attempts!==0)return {ok:false,status:job.status};
  // Atomic claim makes repeated POSTs and concurrent clicks a single attempt.
  try{doc=patch_(doc,{status:{stringValue:'sending'},readyAt:{timestampValue:NEVER},attempts:{integerValue:'1'}})}catch(e){if(e.status===409||e.status===412)return {ok:false,status:'sending'};throw e}
  try {
    var parts=messages(job.record,job.revision===1);
    if(parts.length>40)throw Error('Message too long');
    for(var i=0;i<parts.length;i++){
      var messageId=telegram_(config,parts[i]);
      doc=patch_(doc,{nextPart:{integerValue:String(i+1)},lastMessageId:{integerValue:String(messageId)}});
      if(i+1<parts.length)Utilities.sleep(3100);
    }
    patch_(doc,{status:{stringValue:'sent'},sentAt:timestamp_(Date.now())});
    return {ok:true,status:'sent'};
  }catch(e){
    patch_(doc,{status:{stringValue:'failed'},lastError:{stringValue:'Telegram delivery failed. No automatic retry.'}});
    return {ok:false,status:'failed'};
  }
}

function telegram_(config,text) {
  var response;
  try{response=UrlFetchApp.fetch('https://api.telegram.org/bot'+config.token+'/sendMessage',{method:'post',contentType:'application/json',payload:JSON.stringify({chat_id:config.chat,text:text,link_preview_options:{is_disabled:true}}),muteHttpExceptions:true})}catch(e){throw new Error('Telegram network failure')}
  var body;try{body=JSON.parse(response.getContentText())}catch(e){throw new Error('Invalid Telegram response')}
  if(response.getResponseCode()!==200||!body.ok){var error=new Error('Telegram delivery rejected');error.retryAfterMs=(body.parameters?.retry_after||0)*1000;throw error}
  return body.result.message_id;
}

function firestore_(suffix,body,method) {
  var response;
  var options={method:method||'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true};
  if(body!==null && body!==undefined)options.payload=JSON.stringify(body);
  try{response=UrlFetchApp.fetch(DB_URL+suffix,options)}catch(e){throw new Error('Firestore network failure')}
  var code=response.getResponseCode();
  if(code<200||code>=300){var error=new Error('Firestore request failed ('+code+'). Check owner permissions and API access.');error.status=code;throw error}
  return JSON.parse(response.getContentText());
}

function patch_(doc,fields) {
  var path=doc.name.split('/documents/')[1];
  if(!/^telegramOutbox\/[A-Za-z0-9_-]+$/.test(path))throw new Error('Invalid queue path');
  var mask=Object.keys(fields).map(function(k){return 'updateMask.fieldPaths='+encodeURIComponent(k)}).join('&');
  return firestore_('/'+path+'?'+mask+'&currentDocument.updateTime='+encodeURIComponent(doc.updateTime),{fields:fields},'patch');
}
function timestamp_(value){return {timestampValue:new Date(value).toISOString()}}
function decode_(v){
  if('mapValue' in v){var out={};Object.keys(v.mapValue.fields||{}).forEach(function(k){out[k]=decode_(v.mapValue.fields[k])});return out}
  if('arrayValue' in v)return (v.arrayValue.values||[]).map(decode_);
  if('integerValue' in v)return Number(v.integerValue);
  if('nullValue' in v)return null;
  return v[Object.keys(v)[0]];
}
