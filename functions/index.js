'use strict';
const {onDocumentWritten}=require('firebase-functions/v2/firestore');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {createHash,randomUUID}=require('node:crypto');
const {messages}=require('./message');
initializeApp();
const botToken=defineSecret('TELEGRAM_BOT_TOKEN'),chatId=defineSecret('TELEGRAM_CHAT_ID');
exports.notifyEquipmentSave=onDocumentWritten({document:'equipment/{id}',region:'asia-southeast1',secrets:[botToken,chatId],retry:true,maxInstances:1,concurrency:1,timeoutSeconds:300,memory:'256MiB'},async event=>{
 const after=event.data?.after;if(!after?.exists)return; // Only successful creates/updates, no deletes.
 const record=after.data(),parts=messages(record,!event.data.before.exists);
 const db=getFirestore(),delivery=db.collection('telegramDeliveries').doc(createHash('sha256').update(event.id).digest('hex')),owner=randomUUID();
 const state=await db.runTransaction(async t=>{const doc=await t.get(delivery),d=doc.data()||{};if(d.status==='sent')return null;if((d.leaseUntil||0)>Date.now())throw Error('Delivery currently in progress');const next={owner,status:'sending',leaseUntil:Date.now()+360000,nextPart:d.nextPart||0,recordId:event.params.id,revision:record.revision||0,attempts:(d.attempts||0)+1,updatedAt:new Date().toISOString()};t.set(delivery,next,{merge:true});return next});
 if(!state)return;
 try{
  for(let i=state.nextPart;i<parts.length;i++){
   let response;
   // Never log request URLs or raw fetch errors: the Telegram URL contains the token.
   try{response=await fetch(`https://api.telegram.org/bot${botToken.value()}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId.value(),text:parts[i],link_preview_options:{is_disabled:true}}),signal:AbortSignal.timeout(20000)})}catch{throw Error('Telegram network request failed')}
   let result;try{result=await response.json()}catch{throw Error('Invalid Telegram response')}
   if(!response.ok||!result.ok)throw Error(`Telegram rejected message (${response.status})`);
   await delivery.update({nextPart:i+1,lastMessageId:result.result.message_id,updatedAt:new Date().toISOString()});
   if(i+1<parts.length)await new Promise(resolve=>setTimeout(resolve,3100));
  }
  await delivery.update({status:'sent',leaseUntil:0,sentAt:new Date().toISOString()});
 }catch(error){
  await db.runTransaction(async t=>{const d=await t.get(delivery);if(d.data()?.owner===owner)t.update(delivery,{status:'failed',leaseUntil:0,updatedAt:new Date().toISOString()})});
  throw error;
 }
});
