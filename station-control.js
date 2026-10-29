const escapeStation=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function stationControl(record={}){
 const c=record.stationConnection||{},line=c.mode==='line';
 return `<div class="station-control"><div class="station-heading"><span>สถานีไฟฟ้าแรงสูง</span><button type="button" class="station-line-toggle" aria-pressed="${line}" aria-controls="line-stations">สายส่งไฟฟ้า</button></div><div class="single-station" ${line?'hidden':''}><label><span class="sr-only">สถานีไฟฟ้าแรงสูง</span><input name="station" maxlength="250" value="${escapeStation(record.station)}" ${line?'disabled':'required'}></label></div><div id="line-stations" class="line-stations" ${line?'':'hidden'}><label>สถานีต้นทาง<input name="stationFrom" maxlength="120" value="${escapeStation(c.from)}" ${line?'required':'disabled'}></label><label>สถานีปลายทาง<input name="stationTo" maxlength="120" value="${escapeStation(c.to)}" ${line?'required':'disabled'}></label></div></div>`;
}
export function setupStation(root,editable=true){
 const button=root.querySelector('.station-line-toggle'),single=root.querySelector('.single-station'),line=root.querySelector('.line-stations'),station=root.querySelector('[name=station]'),from=root.querySelector('[name=stationFrom]'),to=root.querySelector('[name=stationTo]');
 const update=isLine=>{button.setAttribute('aria-pressed',String(isLine));single.hidden=isLine;line.hidden=!isLine;station.disabled=!editable||isLine;station.required=!isLine;for(const input of [from,to]){input.disabled=!editable||!isLine;input.required=isLine}};
 button.disabled=!editable;
 button.onclick=()=>{const isLine=button.getAttribute('aria-pressed')!=='true';if(isLine&&!from.value&&!to.value){const parts=station.value.split(',').map(s=>s.trim());if(parts.length===2&&parts.every(Boolean)){from.value=parts[0];to.value=parts[1]}}if(!isLine&&from.value.trim()&&to.value.trim())station.value=from.value.trim()+' – '+to.value.trim();update(isLine)};
 update(button.getAttribute('aria-pressed')==='true');
}
export function readStation(form){
 const from=String(form.get('stationFrom')||'').trim(),to=String(form.get('stationTo')||'').trim();
 if(form.has('stationFrom')||form.has('stationTo')){if(!from||!to)throw Error('กรุณากรอกสถานีต้นทางและสถานีปลายทาง');if(from.toLowerCase()===to.toLowerCase())throw Error('สถานีต้นทางและปลายทางต้องต่างกัน');return {station:from+' – '+to,stationConnection:{mode:'line',from,to}}}
 const station=String(form.get('station')||'').trim();if(!station)throw Error('กรุณากรอกสถานีไฟฟ้าแรงสูง');return {station,stationConnection:{mode:'single',from:'',to:''}};
}
