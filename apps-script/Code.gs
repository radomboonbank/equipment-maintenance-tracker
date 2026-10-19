// GRID CARE: private scheduled worker. No web-app deployment or public endpoint.
var PROJECT_ID = 'equipment-maintenance-tr-fdae3';
var DB_URL = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents';
var NEVER = '9999-12-31T00:00:00.000Z';

function checkConnection() {
  var result = firestore_(':runQuery', {structuredQuery:{from:[{collectionId:'telegramOutbox'}],limit:1}});
  console.log('Firebase connection OK. Queue is private. No Telegram message sent.');
  return result.length;
}

function installTrigger() {
  config_();
  checkConnection();
  var existing=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='processQueue'});
  if(!existing.length)ScriptApp.newTrigger('processQueue').timeBased().everyMinutes(5).create();
  console.log('Telegram queue trigger ready: every 5 minutes.');
}

function removeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t){if(t.getHandlerFunction()==='processQueue')ScriptApp.deleteTrigger(t)});
}

function config_() {
  var p=PropertiesService.getScriptProperties();
  var token=p.getProperty('TELEGRAM_BOT_TOKEN'),chat=p.getProperty('TELEGRAM_CHAT_ID');
  if(!token||!chat)throw new Error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Script Properties first.');
  if(!/^\d+:[A-Za-z0-9_-]+$/.test(token)||!/^(-?\d+|@[A-Za-z0-9_]+)$/.test(chat))throw new Error('Invalid Telegram configuration format.');
  return {token:token,chat:chat};
}

function processQueue() {
  var config=config_(),lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return;
  var started=Date.now();
  try {
    var rows=firestore_(':runQuery',{structuredQuery:{from:[{collectionId:'telegramOutbox'}],where:{fieldFilter:{field:{fieldPath:'readyAt'},op:'LESS_THAN_OR_EQUAL',value:{timestampValue:new Date().toISOString()}}},orderBy:[{field:{fieldPath:'readyAt'},direction:'ASCENDING'}],limit:5}});
    for(var row of rows){
      if(!row.document||Date.now()-started>18000)continue;
      deliver_(row.document,config,started);
    }
  }finally{lock.releaseLock()}
}

function deliver_(doc,config,started) {
  var job=decode_({mapValue:{fields:doc.fields}});
  if(job.status==='sent'||job.status==='failed')return;
  // Update-time precondition prevents two separate workers from claiming the same job.
  try{doc=patch_(doc,{readyAt:timestamp_(Date.now()+360000),attempts:{integerValue:String((job.attempts||0)+1)}})}catch(e){if(e.status===409||e.status===412)return;throw e}
  try {
    var parts=messages(job.record,job.revision===1),next=job.nextPart||0;
    for(var i=next;i<parts.length;i++){
      if(Date.now()-started>18000){patch_(doc,{readyAt:timestamp_(Date.now()+300000)});return}
      var messageId=telegram_(config,parts[i]);
      doc=patch_(doc,{nextPart:{integerValue:String(i+1)},lastMessageId:{integerValue:String(messageId)}});
      Utilities.sleep(3100); // Respect group message limits across jobs and message chunks.
    }
    patch_(doc,{status:{stringValue:'sent'},readyAt:{timestampValue:NEVER},sentAt:timestamp_(Date.now())});
  }catch(e){
    var attempts=(job.attempts||0)+1,paused=attempts>=20;
    patch_(doc,{status:{stringValue:paused?'failed':'pending'},readyAt:timestamp_(paused?NEVER:Date.now()+Math.min(3600000,Math.max(e.retryAfterMs||0,300000*Math.pow(2,Math.min(attempts-1,4))))),lastError:{stringValue:'Delivery failed; check configuration, permissions and Telegram availability.'}});
    // Never log token, Telegram URL, contact details, or raw network errors.
    console.warn('Queue delivery deferred. Attempt '+attempts+(paused?' (paused for review)':''));
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
  try{response=UrlFetchApp.fetch(DB_URL+suffix,{method:method||'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},payload:JSON.stringify(body),muteHttpExceptions:true})}catch(e){throw new Error('Firestore network failure')}
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
