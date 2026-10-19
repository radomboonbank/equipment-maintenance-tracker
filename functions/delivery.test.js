const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function harness(){
 const docs=new Map(),sent=[];let fail=false;
 const ref={update:async v=>docs.set('delivery',{...docs.get('delivery'),...v})};
 const db={collection:()=>({doc:()=>ref}),runTransaction:async fn=>fn({get:async()=>({data:()=>docs.get('delivery')}),set:(_,v)=>docs.set('delivery',{...docs.get('delivery'),...v}),update:(_,v)=>docs.set('delivery',{...docs.get('delivery'),...v})})};
 const context={exports:{},Date,Error,Promise,setTimeout,AbortSignal,fetch:async(url,options)=>{if(fail)throw Error('contains-sensitive-url');sent.push(JSON.parse(options.body));return {ok:true,status:200,json:async()=>({ok:true,result:{message_id:1}})}},require:name=>({'firebase-functions/v2/firestore':{onDocumentWritten:(options,handler)=>handler},'firebase-functions/params':{defineSecret:name=>({value:()=>name==='TELEGRAM_BOT_TOKEN'?'fake-token':'test-chat'})},'firebase-admin/app':{initializeApp(){}},'firebase-admin/firestore':{getFirestore:()=>db},'node:crypto':require('node:crypto'),'./message':require('./message')}[name])};
 vm.runInNewContext(fs.readFileSync(require.resolve('./index'),'utf8'),context);
 const event={id:'event-1',params:{id:'test'},data:{before:{exists:false},after:{exists:true,data:()=>({code:'TEST',revision:1,status:'pending'})}}};
 return {run:()=>context.exports.notifyEquipmentSave(event),event,docs,sent,setFail:v=>fail=v};
}
test('successful event retry does not send twice',async()=>{const h=harness();await h.run();await h.run();assert.equal(h.sent.length,1);assert.equal(h.docs.get('delivery').status,'sent');assert.equal(h.sent[0].chat_id,'test-chat')});
test('network failure remains retryable without exposing token',async()=>{const h=harness();h.setFail(true);await assert.rejects(h.run(),/^Error: Telegram network request failed$/);assert.equal(h.docs.get('delivery').status,'failed');h.setFail(false);await h.run();assert.equal(h.sent.length,1);assert.equal(h.docs.get('delivery').status,'sent')});
test('delete events do not send',async()=>{const h=harness();h.event.data.after.exists=false;await h.run();assert.equal(h.sent.length,0)});
