(() => {
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-followup-now]');if(!button)return;
  const row=button.closest('tr'),prefix='follow-'+button.dataset.followupNow;
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB-u-ca-buddhist-nu-latn',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  for(const part of ['day','month','year']){
   const control=row.querySelector(`[name="${prefix}-${part}"]`);control.value=String(Number(parts[part]));control.dispatchEvent(new Event('change',{bubbles:true}));
  }
  const input=row.querySelector(`[name="${prefix}-time"]`),value=parts.hour+':'+parts.minute;
  input.value=value;
  const group=input.nextElementSibling;
  if(group?.classList.contains('time-picker-24')){
   const controls=group.querySelectorAll('select');controls[0].value=parts.hour;controls[1].value=parts.minute;
   controls[0].dispatchEvent(new Event('change',{bubbles:true}));
  }
  input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
 });
})();
