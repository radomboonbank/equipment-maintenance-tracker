(() => {
 const bindings=new WeakMap();
 const pad=n=>String(n).padStart(2,'0');
 function enhance(){
  document.querySelectorAll('input[type="time"]').forEach(input=>{
   const original=input.value.slice(0,5);
   const group=document.createElement('span');group.className='time-picker-24';group.setAttribute('role','group');
   const label=input.getAttribute('aria-label')||input.closest('label')?.childNodes[0]?.textContent?.trim()||'เวลา';
   group.setAttribute('aria-label',label+' รูปแบบ 24 ชั่วโมง');
   const make=(part,count,selected)=>{
    const select=document.createElement('select');select.setAttribute('aria-label',label+' '+part);
    select.add(new Option('—',''));for(let i=0;i<count;i++)select.add(new Option(pad(i),pad(i),false,selected===pad(i)));
    return select;
   };
   const [h,m]=original.split(':');const hour=make('ชั่วโมง (00–23)',24,h),minute=make('นาที (00–59)',60,m);
   const sync=()=>{
    const complete=hour.value!==''&&minute.value!=='';
    hour.setCustomValidity((hour.value!==''||minute.value!=='')&&!complete?'กรุณาเลือกชั่วโมงและนาทีให้ครบ':'');
    input.value=complete?hour.value+':'+minute.value:'';
    input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
   };
   const colon=document.createElement('span');colon.textContent=':';colon.setAttribute('aria-hidden','true');
   group.append(hour,colon,minute);input.after(group);input.type='hidden';input.dataset.timeEnhanced='true';
   bindings.set(input,[hour,minute]);
   hour.addEventListener('change',sync);minute.addEventListener('change',sync);
   input.closest('form')?.addEventListener('reset',()=>setTimeout(()=>{hour.value=h||'';minute.value=m||'';sync()},0));
  });
  document.querySelectorAll('input[data-time-enhanced]').forEach(input=>{
   const controls=bindings.get(input);if(!controls)return;
   for(const select of controls){const disabled=input.disabled||input.readOnly;if(select.disabled!==disabled)select.disabled=disabled}
  });
 }
 new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','readonly']});
 enhance();
})();
