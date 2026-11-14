import {createWebBoard} from './webboard.js?v=20261114-board-tabs';
const source=window.opener;
function session(){
 try{
  if(!source||source.closed||source.location.origin!==window.location.origin)return {};
  return source.GRID_WEBBOARD_SESSION?.()||{};
 }catch{return {};}
}
const threadId=new URLSearchParams(window.location.search).get('thread');
document.title=threadId?'เพิ่มกระทู้ (เว็บบอร์ด) — CROD GRID CARE':'เว็บบอร์ด — CROD GRID CARE';
const board=createWebBoard(session,{page:true,threadId});
const signature=()=>{const c=session();return JSON.stringify([c.user?.uid,c.role,c.duty]);};
let current=signature();
board.open();
document.querySelector('#board-loading')?.remove();
const watch=()=>setInterval(()=>{
 const next=signature();if(next===current)return;
 current=next;board.reset();board.open();
},1000);
let timer=watch();
window.addEventListener('pagehide',()=>{clearInterval(timer);board.reset();});
window.addEventListener('pageshow',event=>{if(event.persisted){current=signature();board.open();timer=watch();}});
