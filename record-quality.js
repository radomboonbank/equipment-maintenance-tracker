export function normalizeStation(value){
 return String(value||'').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF\u0E3A]/g,'').trim().toUpperCase().replace(/\s*[-–—]\s*/g,' – ').replace(/\s+/g,' ');
}
export function missingCore(record){
 return [['date','วันที่รับแจ้ง'],['station','สถานี'],['equipment','อุปกรณ์'],['cause','สาเหตุ'],['eventType','ประเภทเหตุการณ์'],['category','ชนิดอุปกรณ์']].filter(([key])=>!String(key==='equipment'?(record.equipment||record.breaker||''):record[key]||'').trim()||String(record[key]).trim()==='—').map(([,label])=>label);
}
export function dueDate(record){return record.repairPlan?.expectedDateUnknown?'':record.repairPlan?.expectedDate||record.due||''}
export function todayThai(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function overdue(record,today=todayThai()){return record.status!=='resolved'&&/^\d{4}-\d{2}-\d{2}$/.test(dueDate(record))&&dueDate(record)<today}
export function ageDays(record,today=todayThai()){return /^\d{4}-\d{2}-\d{2}$/.test(record.date||'')?Math.max(0,Math.floor((Date.parse(today)-Date.parse(record.date))/86400000)):null}

export const stationCodes='AP AT2 AY1 AY2 AY3 BBG BI1 BKI BL BL2 BPK BWN CB CB2 CBD CC2 CT CTN KLA KLD LB1 LB2 NCO NY PA1 PA2 PDG PH2 PTB PTG RY2 RY4 SH1 SH2 SI SP SR1 SR2 SR4 TL1 TL3 TR WN WNK'.split(' ');
export function validStation(value){const parts=normalizeStation(value).split(' – ');return parts.length<=2&&parts.every(code=>stationCodes.includes(code))}
