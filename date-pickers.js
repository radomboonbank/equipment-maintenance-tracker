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


;(() => {
 const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
 const shorts=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
 const weekdays=['อา','จ','อ','พ','พฤ','ศ','ส'];
 const today=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date()).map(p=>[p.type,p.value]));return {y:+p.year+543,m:+p.month,d:+p.day};};
 const style=document.createElement('style');style.textContent='.be-calendar{display:flex;position:relative;width:100%;margin-top:9px;min-width:0}.be-calendar-display{flex:1;min-width:0;text-align:left}.be-calendar button{font:inherit;color:#414f5b;cursor:pointer;background:white;border:1px solid #cbdde5;padding:10px 14px;min-height:44px}.be-calendar-display{border-radius:9px 0 0 9px!important;font-weight:600!important}.be-calendar-toggle{border-radius:0 9px 9px 0!important}.be-calendar-panel{position:fixed;z-index:2147483000;width:300px;max-width:calc(100vw - 24px);background:white;color:#414f5b;border:1px solid #d6e1e7;border-radius:8px;box-shadow:0 8px 28px #102d3a40;padding:8px}.be-calendar-nav{display:grid;grid-template-columns:38px 1fr 38px;gap:4px}.be-calendar-panel button{border:0;border-radius:5px;padding:7px;min-height:36px}.be-calendar-panel button:hover,.be-calendar-panel button:focus-visible{background:#e5f3fc;outline:2px solid #008bbb}.be-calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}.be-calendar-grid.months,.be-calendar-grid.years{grid-template-columns:repeat(4,1fr);gap:8px}.be-calendar-grid.months button,.be-calendar-grid.years button{min-height:64px}.be-calendar-weekday{padding:7px 0;font-weight:600}.be-calendar-panel button.selected{background:linear-gradient(#0099bf,#0647c9);color:white}.be-calendar-panel button.current:not(.selected){background:#fff0a0}.be-calendar-panel button.outside{color:#a0a0a0}.be-calendar-footer{display:flex;justify-content:space-between;margin-top:7px;border-top:1px solid #e4ebef}.be-calendar-panel[hidden]{display:none!important}';
 document.head.append(style);
 function enhance(){
 document.querySelectorAll('.date-control,.thai-date-controls,.local-date-picker').forEach(group=>{
  if(group.dataset.calendarEnhanced)return;
  const selects=[...group.querySelectorAll('select')];if(selects.length!==3)return;
  group.dataset.calendarEnhanced='true';group.style.display='none';
  const wrapper=document.createElement('span');wrapper.className='be-calendar';
  const display=document.createElement('button');display.type='button';display.className='be-calendar-display';display.setAttribute('aria-label','เลือกวันที่ พ.ศ.');
  const toggle=document.createElement('button');toggle.type='button';toggle.className='be-calendar-toggle';toggle.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/></svg>';toggle.setAttribute('aria-label','เปิดปฏิทิน');
  const panel=document.createElement('span');panel.className='be-calendar-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','ปฏิทิน พ.ศ.');
  wrapper.append(display,toggle,panel);group.after(wrapper);
  let mode='day',view=today(),lastBacking;
  const backing=group.previousElementSibling?.matches('input')?group.previousElementSibling:null;
  const selected=()=>({d:+selects[0].value,m:+selects[1].value,y:+selects[2].value});
  function refresh(){
   if(backing&&backing.value!==lastBacking){lastBacking=backing.value;const slash=lastBacking.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/),iso=lastBacking.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const parts=slash?[+slash[1],+slash[2],+slash[3]]:iso?[+iso[3],+iso[2],+iso[1]+543]:null;
    if(parts)parts.forEach((v,i)=>{if(![...selects[i].options].some(o=>o.value===String(v)))selects[i].add(new Option(String(v),String(v)));selects[i].value=String(v);});
    else if(!lastBacking)selects.forEach(s=>s.value='');
   }
   const v=selected(),date=v.d&&v.m&&v.y?new Date(Date.UTC(v.y-543,v.m-1,v.d)):null;
   display.textContent=date?v.d+' '+months[v.m-1]+' '+v.y:'เลือกวันที่';
   display.disabled=toggle.disabled=selects.some(s=>s.disabled);
   if(!group.isConnected)wrapper.remove();
  }
  function close(){panel.hidden=true;display.setAttribute('aria-expanded','false');toggle.setAttribute('aria-expanded','false');}
  function commit(v){
   [v.d,v.m,v.y].forEach((value,i)=>{if(value&&!Array.from(selects[i].options).some(o=>o.value===String(value)))selects[i].add(new Option(String(value),String(value)));selects[i].value=value?String(value):'';});
   selects.forEach(s=>s.dispatchEvent(new Event('change',{bubbles:true})));refresh();close();display.focus();
  }
  const button=(text,fn,cls='')=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.onclick=fn;return b;};
  function render(){
   panel.replaceChildren();const nav=document.createElement('span');nav.className='be-calendar-nav';
   nav.append(button('‹',()=>{if(mode==='day'){view.m--;if(view.m<1){view.m=12;view.y--;}}else view.y-=mode==='month'?1:10;render();}));
   nav.append(button(mode==='day'?months[view.m-1]+' '+view.y:mode==='month'?String(view.y):Math.floor(view.y/10)*10+'–'+(Math.floor(view.y/10)*10+9),()=>{mode=mode==='day'?'month':'year';render();}));
   nav.append(button('›',()=>{if(mode==='day'){view.m++;if(view.m>12){view.m=1;view.y++;}}else view.y+=mode==='month'?1:10;render();}));panel.append(nav);
   const grid=document.createElement('span');grid.className='be-calendar-grid'+(mode==='month'?' months':mode==='year'?' years':'');
   const v=selected(),now=today();
   if(mode==='day'){
    weekdays.forEach(w=>{const h=document.createElement('span');h.textContent=w;h.className='be-calendar-weekday';grid.append(h);});
    const first=new Date(Date.UTC(view.y-543,view.m-1,1)).getUTCDay();
    for(let n=0;n<42;n++){const date=new Date(Date.UTC(view.y-543,view.m-1,n-first+1));const pick={d:date.getUTCDate(),m:date.getUTCMonth()+1,y:date.getUTCFullYear()+543};
     const cls=(pick.d===v.d&&pick.m===v.m&&pick.y===v.y?'selected':pick.d===now.d&&pick.m===now.m&&pick.y===now.y?'current':pick.m!==view.m?'outside':'');
     const b=button(String(pick.d),()=>commit(pick),cls);b.setAttribute('aria-label',pick.d+' '+months[pick.m-1]+' '+pick.y);grid.append(b);
    }
   }else if(mode==='month'){shorts.forEach((m,i)=>grid.append(button(m,()=>{view.m=i+1;mode='day';render();},view.y===v.y&&i+1===v.m?'selected':'')));}
   else{const start=Math.floor(view.y/10)*10-2;for(let y=start;y<start+12;y++)grid.append(button(String(y),()=>{view.y=y;mode='month';render();},y===v.y?'selected':''));}
   panel.append(grid);const footer=document.createElement('span');footer.className='be-calendar-footer';footer.append(button('วันนี้',()=>commit(today())),button('ล้าง',()=>commit({d:0,m:0,y:0})));panel.append(footer);
  }
  function open(){if(display.disabled)return;view={...today(),...Object.fromEntries(Object.entries(selected()).filter(([,v])=>v))};mode='day';render();panel.hidden=false;
   const rect=wrapper.getBoundingClientRect();panel.style.left=Math.max(12,Math.min(rect.left,window.innerWidth-312))+'px';panel.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-390))+'px';display.setAttribute('aria-expanded','true');toggle.setAttribute('aria-expanded','true');}
  display.onclick=toggle.onclick=()=>panel.hidden?open():close();
  wrapper.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();display.focus();}});
  document.addEventListener('click',e=>{if(!e.composedPath().includes(wrapper))close();});
  selects.forEach(s=>s.addEventListener('change',refresh));new MutationObserver(refresh).observe(group,{attributes:true,subtree:true,attributeFilter:['disabled']});
  const timer=setInterval(()=>{if(!group.isConnected){clearInterval(timer);wrapper.remove();return;}refresh();},400);
  refresh();
 });
 }
 new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});enhance();
})();
