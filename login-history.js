export function rotateLogins(previous,entry){return {first:entry,second:previous?.first||null,third:previous?.second||null}}
export function loginEntries(value){return [value?.first,value?.second,value?.third].filter(Boolean)}
export function loginTime(value){
 const date=value?.toDate?.() || (value instanceof Date?value:null);
 if(!date || Number.isNaN(date.getTime()))return 'กำลังยืนยันเวลา…';
 return new Intl.DateTimeFormat('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date);
}

export const publicLoginSlots=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];
export function publicLoginEntries(value){return publicLoginSlots.map(key=>value?.[key]).filter(Boolean)}
export function rotatePublicLogins(previous,entry){return Object.fromEntries(publicLoginSlots.map((key,i)=>[key,i===0?entry:previous?.[publicLoginSlots[i-1]]||null]))}
