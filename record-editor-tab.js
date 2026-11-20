let activeTab=null;
export function recordEditorDocument(fallback=document){return activeTab&&!activeTab.closed?activeTab.document:fallback;}
export function hasRecordEditorTab(){return !!activeTab&&!activeTab.closed;}
export function focusRecordEditorTab(){if(hasRecordEditorTab())activeTab.focus();}
export function openRecordEditorTab({dialog,prepare,enhance,title='แก้ไขข้อมูลอุปกรณ์',openWindow,onActivity=()=>{}}){
 if(hasRecordEditorTab()){activeTab.focus();return 'existing';}
 const parent=dialog.ownerDocument,win=parent.defaultView;
 const tab=openWindow?openWindow():win.open('','_blank');if(!tab)return 'blocked';
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const asset=name=>escape(new URL(name,win.location.href).href);
 let restored=false,timer;
 const restore=()=>{
  if(restored)return;restored=true;
  dialog.removeEventListener('close',restore);win.removeEventListener('pagehide',restore);win.clearInterval(timer);
  if(dialog.open)dialog.close();
  parent.body.append(dialog);activeTab=null;
  if(!tab.closed)tab.close();
 };
 try{
  prepare();
  tab.document.open();
  tab.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · CROD GRID CARE</title><link rel="stylesheet" href="${asset('styles.css?v=20261120-followup-layout')}"><link rel="stylesheet" href="${asset('responsive.css?v=20261115-compact-records')}"><style>html,body{margin:0;background:white}dialog#editor[open]{position:relative;inset:auto;width:100%;max-width:none;max-height:none;margin:0 auto;border:0;border-radius:0;box-shadow:none;padding:clamp(18px,3vw,40px)}dialog::backdrop{background:white}</style></head><body></body></html>`);
  tab.document.close();tab.opener=null;
  tab.document.body.append(dialog);activeTab=tab;
  enhance?.(tab);
  for(const file of ['date-pickers.js?v=20261114-no-short-weekday','time-pickers.js?v=20261102-24h','followup-now.js?v=20261104']){const script=tab.document.createElement('script');script.src=new URL(file,win.location.href).href;tab.document.body.append(script);}
  dialog.showModal();dialog.addEventListener('close',restore);
  tab.addEventListener('pagehide',restore,{once:true});win.addEventListener('pagehide',restore,{once:true});
  for(const name of ['pointerdown','keydown','input','scroll'])tab.document.addEventListener(name,event=>{if(event.isTrusted)onActivity();},{capture:true});
  timer=win.setInterval(()=>{if(tab.closed)restore();},500);
  tab.focus();return 'opened';
 }catch(error){restore();throw error;}
}
