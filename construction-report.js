export async function readConstructionReport(keyText){
 const bytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('raw',bytes(keyText),'AES-GCM',false,['decrypt']);
 const response=await fetch(new URL('./construction-report-data.json',import.meta.url));
 if(!response.ok)throw Error('โหลดรายงานไม่สำเร็จ');
 const source=await response.json();
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(source.iv)},key,bytes(source.data));
 return JSON.parse(new TextDecoder().decode(plain));
}

const fields=[
 ['reportItem','ลำดับในรายงาน'],['projectId','Job No.'],['title','สถานี / งานก่อสร้าง'],['category','ประเภทงาน'],
 ['plannedEndDate','กำหนดเสร็จ (พ.ศ.)'],['actualProgress','ผลงานรวม (%)'],['varianceDirection','เทียบกับแผน'],
 ['variancePercent','ส่วนต่าง (%)'],['civilProgress','โยธา (%)'],['electricalProgress','ไฟฟ้า (%)'],
 ['scope','ขอบเขตงานและอุปกรณ์'],['workDetails','รายละเอียดงาน'],['voltage','ระดับแรงดัน (kV)'],
 ['station','สถานีไฟฟ้า / ต้นทาง'],['stationTo','สถานีปลายทาง'],['scheduleBasis','ที่มาของกำหนดเสร็จ'],
 ['referenceNumber','เลขที่เอกสาร'],['referenceDate','วันที่เอกสาร'],['workStatus','สถานะงาน'],
 ['successorProject','โครงการที่รับงานต่อ'],['remarks','เหตุผลหรือหมายเหตุ'],['reportPeriod','รอบรายงาน'],['source','แหล่งข้อมูล']
];
const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
const months = 'มกราคม กุมภาพันธ์ มีนาคม เมษายน พฤษภาคม มิถุนายน กรกฎาคม สิงหาคม กันยายน ตุลาคม พฤศจิกายน ธันวาคม'.split(' ');
const numericFields = new Set(['reportItem', 'actualProgress', 'variancePercent', 'civilProgress', 'electricalProgress']);

function sortValue(data, key) {
 const value = String(data[key] ?? '').trim();
 if (!value || value === '—' || value === '-') return null;
 if (numericFields.has(key)) {
  const number = Number(value.replaceAll(',', ''));
  if (Number.isFinite(number)) return number;
 }
 if (key === 'plannedEndDate') {
  const month = months.findIndex(name => value.includes(name));
  const year = value.match(/\d{4}/);
  if (month >= 0 && year) {
   const day = Number(value.match(/^\s*(\d{1,2})\s/)?.[1] || 1);
   return Number(year[0]) * 10000 + (month + 1) * 100 + day;
  }
 }
 return value;
}

export function showConstructionRows(doc, records, openEditor) {
 const search = doc.querySelector('#report-search');
 if (!search) return renderRows(doc, records, openEditor, records.length);
 const clear = doc.querySelector('#clear-search');
 const headers = Array.from(doc.querySelectorAll('#report-table th'));
 const keys = [...fields.slice(0, 10).map(([key]) => key), 'workDetails'];
 function render() {
  const term = search.value.trim().toLocaleLowerCase('th');
  clear.hidden = search.value.length === 0;
  const visible = records.filter(({data}) => !term || fields.some(([key]) =>
   String(data[key] ?? '').toLocaleLowerCase('th').includes(term)));
  const index = headers.findIndex(header => header.hasAttribute('aria-sort'));
  if (index >= 0) {
   const direction = headers[index].getAttribute('aria-sort') === 'ascending' ? 1 : -1;
   visible.sort((left, right) => {
    const a = sortValue(left.data, keys[index]), b = sortValue(right.data, keys[index]);
    if (a === null || b === null) return Number(a === null) - Number(b === null);
    return direction * (typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(a, b));
   });
  }
  renderRows(doc, visible, openEditor, records.length);
 }
 headers.forEach(header => {
  let button = header.querySelector('button');
  if (!button) {
   button = doc.createElement('button');
   button.type = 'button';
   button.textContent = header.textContent;
   header.replaceChildren(button);
  }
  button.onclick = () => {
   const ascending = header.getAttribute('aria-sort') !== 'ascending';
   headers.forEach(other => other.removeAttribute('aria-sort'));
   header.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
   render();
  };
 });
 search.oninput = render;
 clear.onclick = () => { search.value = ''; render(); search.focus(); };
 render();
}

function renderRows(doc,records,openEditor,total){
 const body=doc.querySelector('tbody'),rows=doc.createDocumentFragment();
 const details=doc.querySelector('dialog');
 for(const record of records){
  const tr=doc.createElement('tr');
  for(const [key] of fields.slice(0,10)){
   const cell=tr.insertCell();cell.textContent=record.data[key]??'—';
  }
  const action=doc.createElement('button');action.textContent='ดูรายละเอียด';
  action.onclick=()=>{
   const list=details.querySelector('dl');list.replaceChildren();
   for(const [key,label] of fields){
    const value=record.data[key];if(value==null||value==='')continue;
    const dt=doc.createElement('dt'),dd=doc.createElement('dd');dt.textContent=label;dd.textContent=value;list.append(dt,dd);
   }
   const edit=details.querySelector('[data-edit]');edit.hidden=!openEditor;
   edit.onclick=()=>openEditor(record);details.showModal();
  };
  tr.insertCell().append(action);rows.append(tr);
 }
 body.replaceChildren(rows);
 doc.querySelector('#count').textContent=records.length===total
  ? 'ทั้งหมด '+total+' รายการ' : 'แสดง '+records.length+' จาก '+total+' รายการ';
}
if(document.querySelector('#report-table')){
 const key=new URLSearchParams(location.hash.slice(1)).get('report');
 const login=document.querySelector('#dashboard-link');
 if(key){
  login.hidden=false;
  login.href='./?view=construction#report='+encodeURIComponent(key);
  login.textContent='เปิดใน Dashboard เพื่อบันทึกลง Firebase';
  readConstructionReport(key).then(rows=>showConstructionRows(document,rows)).catch(()=>{
   document.querySelector('#count').textContent='เปิดข้อมูลไม่ได้ กรุณาใช้ลิงก์รายงานฉบับเต็ม';
  });
 }else if(!window.opener){
  document.querySelector('#count').textContent='เข้าสู่ระบบใน Dashboard แล้วกด ตารางงานก่อสร้างทั้งหมด';
 }
}
