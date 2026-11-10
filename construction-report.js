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
export function showConstructionRows(doc,records,openEditor){
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
 doc.querySelector('#count').textContent='ทั้งหมด '+records.length+' รายการ';
}
if(document.querySelector('#report-table')){
 const key=new URLSearchParams(location.hash.slice(1)).get('report');
 const login=document.querySelector('#dashboard-link');
 if(key){
  login.href='./?view=construction#report='+encodeURIComponent(key);
  login.textContent='เปิดใน Dashboard เพื่อบันทึกลง Firebase';
  readConstructionReport(key).then(rows=>showConstructionRows(document,rows)).catch(()=>{
   document.querySelector('#count').textContent='เปิดข้อมูลไม่ได้ กรุณาใช้ลิงก์รายงานฉบับเต็ม';
  });
 }else if(!window.opener){
  document.querySelector('#count').textContent='เข้าสู่ระบบใน Dashboard แล้วกด ตารางงานก่อสร้างทั้งหมด';
 }
}
