'use strict';
const statuses={unreviewed:'รอตรวจสอบ',pending:'รอดำเนินการ',repairing:'กำลังซ่อม',resolved:'ซ่อมแล้ว'};
function date(value){if(!value)return '—';const d=new Date(value.length===10?value+'T00:00:00+07:00':value);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',...(value.length>10?{hour:'2-digit',minute:'2-digit'}:{})}).format(d)}
function messages(record,isNew){
 const v=x=>String(x??'').trim()||'—';
 const lines=[`GRID CARE · ${isNew?'สร้างรายการ':'บันทึกข้อมูล'}`,`รหัส: ${v(record.code)} · ครั้งที่ ${v(record.revision)}`,`บันทึกเมื่อ: ${date(record.updatedAt)}`,`ผู้บันทึก: ${v(record.history?.at(-1)?.by)}`];
 const fields={station:'สถานี',equipment:'อุปกรณ์',category:'ชนิดอุปกรณ์',breaker:'อุปกรณ์ OFF',cause:'สาเหตุ',solution:'แนวทางแก้ไข',impact:'ผลกระทบ',mitigation:'มาตรการรองรับ',owner:'ผู้รับผิดชอบ',reporter:'ผู้แจ้ง',receiver:'ศูนย์ที่รับเรื่อง'};
 lines.push(`สถานะ: ${statuses[record.status]||v(record.status)}`,`ความเร่งด่วน: ${{normal:'ปกติ',urgent:'เร่งด่วน',critical:'วิกฤต'}[record.priority]||v(record.priority)}`,`วันที่ชำรุด: ${date(record.date)} ${v(record.time)}`,`กำหนดเสร็จ: ${date(record.due)}`);
 for(const [key,label] of Object.entries(fields))lines.push(`${label}: ${v(record[key])}`);
 for(const [i,f] of (record.followups||[]).entries())if(Object.values(f).some(Boolean))lines.push(`\nติดตาม ${i+1}: ${date(f.date)} ${v(f.time)}`,`ผู้ให้ข้อมูล: ${v(f.informant)} · โทร ${v(f.mobile)}`,`รายละเอียด: ${v(f.details)}`,`ผู้ตามข้อมูล: ${v(f.follower)}`);
 const c=record.closure;if(c?.date)lines.push(`\nปิดงาน: ${date(c.date)} ${v(c.time)}`,`ผู้แจ้งปิดงาน: ${v(c.reporter)}`,`มือถือ: ${v(c.mobile)}`,`รายละเอียด: ${v(c.details)}`,`ผู้ตามข้อมูล: ${v(c.follower)}`);
 lines.push('\nhttps://radomboonbank.github.io/equipment-maintenance-tracker/');
 // Plain text only: user-entered markup cannot change Telegram formatting.
 const text=lines.join('\n'),chunks=[];let part='';
 for(const char of text){if(part.length+char.length>3800){chunks.push(part);part=''}part+=char}if(part)chunks.push(part);
 return chunks.map((s,i)=>chunks.length>1?`[${i+1}/${chunks.length}] รหัส ${v(record.code)}\n${s}`:s);
}
module.exports={messages,date};
