import {highlightDetailPage} from './dashboard.js?v=20261114-record-history';
// The source tab supplies a one-time snapshot through the browser's tab-scoped storage.
// This page does not initialize Firebase Authentication or create a login session.
const token=location.hash.slice(1),key='grid-highlight-detail:'+token;
try{
 if(!/^[a-f0-9-]{36}$/i.test(token))throw Error('ไม่พบรายการ กรุณาเปิดจาก highlight ใน Dashboard');
 const raw=sessionStorage.getItem(key);sessionStorage.removeItem(key);
 if(!raw||raw.length>500000)throw Error('ไม่พบข้อมูล กรุณากลับไปกดรายการ highlight ใหม่');
 const payload=JSON.parse(raw);
 if(!['equipment','alarm','construction'].includes(payload.kind)||!payload.record||Array.isArray(payload.record)||typeof payload.record!=='object')throw Error('ข้อมูลรายการไม่ถูกต้อง');
 const parsed=new DOMParser().parseFromString(highlightDetailPage(payload.kind,payload.record),'text/html');
 document.title=parsed.title;
 for(const style of parsed.head.querySelectorAll('style'))document.head.append(style);
 document.body.replaceChildren(...parsed.body.childNodes);
 document.getElementById('close-highlight-detail').onclick=()=>window.close();
 history.replaceState(null,'',location.pathname);
}catch(error){
 document.body.replaceChildren();
 const message=document.createElement('p');message.setAttribute('role','alert');message.textContent=error.message;
 const close=document.createElement('button');close.textContent='ปิด ✕';close.onclick=()=>window.close();document.body.append(message,close);
}
