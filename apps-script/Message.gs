'use strict';
function date(value){if(!value)return '—';const d=new Date(value.length===10?value+'T00:00:00+07:00':value);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',...(value.length>10?{hour:'2-digit',minute:'2-digit'}:{})}).format(d)}
function messages(record,isNew){
 const v=x=>String(x??'').trim()||'—';
 const equipment=String(record.equipment||'').trim(),off=String(record.breaker||'').trim();
 const combined=!off||equipment===off||equipment.split('\n').some(line=>line.trim()===off)?equipment||off:[equipment,off].filter(Boolean).join('\n');
 const lines=[
  'Crod-GRID-CARE :: บันทึกกิจกรรม',
  `รหัส: ${v(record.code)} · ครั้งที่ ${v(record.revision)}`,
  `บันทึกเมื่อ: ${date(record.updatedAt)}`,
  `ผู้บันทึก: ${v(record.history?.at(-1)?.displayName || record.history?.at(-1)?.by)}`,
  '',
  `วันที่ชำรุด: ${date(record.date)} ${v(record.time)}`,
  `สถานีไฟฟ้า: ${v(record.station)}`,
  `อุปกรณ์ที่ชำรุด (อุปกรณ์ที่ OFF): ${v(combined)}`,
  `ชนิดอุปกรณ์: ${v(record.category)}`,
  `สาเหตุ ที่ ปลด (OFF): ${v(record.cause)}`,
  `ระดับ: ${{high:'สูง',medium:'ปานกลาง',low:'ต่ำ'}[record.criticality]||'ยังไม่ประเมิน'}`
 ];
 // Plain text only: user-entered markup cannot change Telegram formatting.
 const text=lines.join('\n'),chunks=[];let part='';
 for(const char of text){if(part.length+char.length>3800){chunks.push(part);part=''}part+=char}if(part)chunks.push(part);
 return chunks.map((s,i)=>chunks.length>1?`[${i+1}/${chunks.length}] รหัส ${v(record.code)}\n${s}`:s);
}

