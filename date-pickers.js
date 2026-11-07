(() => {
 const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
 let sequence=0;
 function enhance(root=document){
  root.querySelectorAll('input[placeholder="วว/ดด/พ.ศ."]').forEach(input=>{
   if(input.dataset.dateEnhanced)return;
   input.dataset.dateEnhanced='true';
   const initial=input.value.split('/').map(Number),current=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric'}).format(new Date()))+543;
   const group=document.createElement('span');group.className='local-date-picker';group.setAttribute('role','group');group.setAttribute('aria-label','วัน เดือน ปี พ.ศ.');
   const make=(label,values,selected)=>{
    const select=document.createElement('select');select.setAttribute('aria-label',label);select.id='local-date-'+(++sequence);
    select.add(new Option('—',''));
    values.forEach(([value,text])=>select.add(new Option(text,String(value),false,Number(selected)===value)));
    select.disabled=input.disabled;return select;
   };
   const day=make('วัน',Array.from({length:31},(_,i)=>[i+1,String(i+1)]),initial[0]);
   const month=make('เดือน',months.map((m,i)=>[i+1,m]),initial[1]);
   const years=Array.from({length:41},(_,i)=>current-20+i);if(initial[2]&&!years.includes(initial[2]))years.push(initial[2]);years.sort((a,b)=>a-b);
   const year=make('ปี พ.ศ.',years.map(y=>[y,String(y)]),initial[2]);
   const sync=()=>{
    const d=Number(day.value),m=Number(month.value),y=Number(year.value);const any=d||m||y;
    const check=new Date(Date.UTC(y-543,m-1,d));
    const valid=d&&m&&y&&check.getUTCFullYear()===y-543&&check.getUTCMonth()===m-1&&check.getUTCDate()===d;
    day.setCustomValidity(any&&!valid?'กรุณาเลือกวัน เดือน และปีให้ครบและถูกต้อง':'');
    input.value=valid?`${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`:'';
   };
   group.append(day,month,year);input.after(group);input.type='hidden';
   [day,month,year].forEach(select=>select.addEventListener('change',sync));
   input.closest('form')?.addEventListener('reset',()=>setTimeout(()=>{day.value=initial[0]||'';month.value=initial[1]||'';year.value=initial[2]||'';sync()},0));
  });
 }
 new MutationObserver(()=>enhance()).observe(document.documentElement,{childList:true,subtree:true});
 enhance();
})();
