export function dateParts(now=new Date()){
 return Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
}
export function dateText(value){if(!value)return '';const d=new Date(value.length===10?value+'T00:00:00+07:00':value);return Number.isNaN(d.getTime())?'ไม่ระบุวันที่':new Intl.DateTimeFormat('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',...(value.length>10?{hour:'2-digit',minute:'2-digit'}:{})}).format(d)}
export function stamp(now=new Date()){const d=dateParts(now);return `${d.day}${d.month}${Number(d.year)+543}_${d.hour}${d.minute}${d.second}${String(now.getMilliseconds()).padStart(3,'0')}`}
export function readDate(day,month,beYear){if(!day&&!month&&!beYear)return '';if(!day||!month||!beYear)throw Error('กรุณาระบุวัน เดือน และปีให้ครบ');const y=Number(beYear)-543,m=Number(month),d=Number(day);const check=new Date(Date.UTC(y,m-1,d));if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d)throw Error('วันที่ไม่ถูกต้อง โปรดตรวจวันและเดือน');return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
export function normalizeTime(value){const m=String(value||'').match(/(\d{1,2})[.:](\d{2})/);return m&&Number(m[1])<24&&Number(m[2])<60?m[1].padStart(2,'0')+':'+m[2]:''}
export const loginEmail=username=>`${username.toLowerCase()}@equipment-maintenance-tr-fdae3.firebaseapp.com`;
// Versioned credential encoding supports legacy short PINs. Firebase Auth hashes
// the resulting credential server-side. No passwords or hashes are stored in Firestore.
export async function credential(username,password){const bytes=new TextEncoder().encode('GRID-CARE:v1:'+username.toLowerCase()+':'+password);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('')}
