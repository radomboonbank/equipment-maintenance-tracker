export const projectAbbreviations = [
 {
  "title": "โครงการก่อสร้างขยายและเสริมความมั่นคงระบบส่งไฟฟ้า",
  "code": "อค-กส.",
  "items": [
   {
    "number": "1.1",
    "title": "โครงการขยายระบบส่งไฟฟ้า ระยะที่ 12",
    "code": "TS12"
   },
   {
    "number": "1.2",
    "title": "แผนงานปรับปรุงสถานีไฟฟ้าแรงสูงในพื้นที่ภาคใต้ เพื่อป้องกันการเกิดวินาศกรรมและอุทกภัย",
    "code": "HSIS"
   }
  ]
 },
 {
  "title": "โครงการก่อสร้างระบบส่งไฟฟ้าเพื่อรับไฟฟ้าจากโรงไฟฟ้าเอกชน",
  "code": "อค-สช.",
  "items": [
   {
    "number": "2.1",
    "title": "โครงการระบบส่งเพื่อรับซื้อไฟฟ้าจากโรงไฟฟ้าผู้ผลิตไฟฟ้าเอกชนรายใหญ่",
    "code": "IPPP"
   },
   {
    "number": "2.2",
    "title": "โครงการปรับปรุงระบบส่งไฟฟ้าบริเวณภาคตะวันตกและภาคใต้ เพื่อเสริมความมั่นคงระบบไฟฟ้า",
    "code": "TIWS"
   },
   {
    "number": "2.3",
    "title": "โครงการปรับปรุงระบบส่งไฟฟ้าบริเวณภาคตะวันออกเฉียงเหนือ ภาคเหนือตอนล่าง ภาคกลาง และกรุงเทพมหานคร เพื่อเสริมความมั่นคงระบบไฟฟ้า",
    "code": "TIEC"
   },
   {
    "number": "2.4",
    "title": "โครงการปรับปรุงระบบส่งไฟฟ้าบริเวณภาคใต้ตอนล่าง เพื่อเสริมความมั่นคงระบบไฟฟ้า",
    "code": "TILS"
   },
   {
    "number": "2.5",
    "title": "โครงการพัฒนาระบบเคเบิลใต้ทะเลไปยังบริเวณอำเภอเกาะสมุย จังหวัดสุราษฎร์ธานี เพื่อเสริมความมั่นคงของระบบไฟฟ้า",
    "code": "SPSS"
   },
   {
    "number": "2.6",
    "title": "โครงการพัฒนาระบบส่งไฟฟ้าบริเวณจังหวัด น่าน แพร่ และ อุตรดิตถ์ เพื่อรับซื้อไฟฟ้าจากโครงการใน สปป.ลาว",
    "code": "NPUP"
   }
  ]
 },
 {
  "title": "โครงการพัฒนาระบบส่งนครหลวงและปริมณฑล",
  "code": "อค-นร.",
  "items": [
   {
    "number": "3.1",
    "title": "โครงการปรับปรุงระบบส่งไฟฟ้าบริเวณภาคตะวันออก เพื่อเสริมความมั่นคงระบบไฟฟ้า",
    "code": "TIPE"
   },
   {
    "number": "3.2",
    "title": "โครงการขยายระบบไฟฟ้าในเขตกรุงเทพฯ และปริมณฑล ระยะที่ 3",
    "code": "GBA3"
   },
   {
    "number": "3.3",
    "title": "โครงการปรับปรุงระบบส่งไฟฟ้าบริเวณภาคเหนือตอนบน เพื่อเสริมความมั่นคงระบบไฟฟ้า",
    "code": "TIPN"
   },
   {
    "number": "3.4",
    "title": "แผนงานปรับปรุงระบบส่งไฟฟ้าเพื่อรองรับการรับซื้อไฟฟ้าจากผู้ผลิตไฟฟ้ารายเล็ก ระยะที่ 1",
    "code": "SPP1"
   },
   {
    "number": "3.5",
    "title": "แผนงานปรับปรุงสถานีไฟฟ้าแรงสูงเพื่อรองรับการเชื่อมต่อตามข้อกำหนดเกี่ยวกับการเชื่อมต่อระบบโครงข่ายไฟฟ้าของ กฟผ.",
    "code": "SICC"
   },
   {
    "number": "3.6",
    "title": "แผนลงทุนระยะยาวเพื่อรองรับกลุ่มผู้ใช้ไฟฟ้าขนาดใหญ่",
    "code": "LPLC"
   }
  ]
 }
];

export function installProjectAbbreviations(doc=document){
 const button=doc.querySelector('#project-abbreviations');
 if(!button||button.dataset.ready)return;
 button.dataset.ready='true';
 const style=doc.createElement('style');style.textContent=`
 #project-reference{width:min(980px,94vw);max-width:980px;max-height:88vh;color:#183747;background:white;padding:24px;border:1px solid #cce0e4;border-radius:16px;font:14px/1.7 'Noto Sans Thai',Tahoma,sans-serif}
 #project-reference::backdrop{background:#102d3a99}#project-reference header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px}
 #project-reference h2{margin:0;font-size:23px}#project-reference input{width:100%;font:inherit;padding:11px 14px;border:1px solid #b8cfd1;border-radius:9px;margin-bottom:14px}
 #project-reference section{overflow:visible;border:0;margin:0 0 18px}#project-reference h3{margin:0;padding:10px 12px;background:#eaf5f5;border-radius:8px;font-size:15px}
 #project-reference .project-item{display:grid;grid-template-columns:70px minmax(0,1fr);gap:14px;padding:12px;border-bottom:1px solid #e3edef}#project-reference .project-code{font-weight:700;color:#087f83}
 #project-reference button{background:#087f83;color:white;border:0;border-radius:9px;padding:10px 15px;font:inherit;font-weight:600;cursor:pointer}#project-reference p{margin:10px 0;color:#607b86}
 #project-abbreviations{padding:10px 16px;border-radius:10px;border:1px solid #b8cfd1;background:white;color:#087f83;font:inherit;font-weight:600;cursor:pointer}
 @media(max-width:600px){#project-reference{padding:16px}#project-reference .project-item{grid-template-columns:58px 1fr;gap:8px}}`;
 doc.head.append(style);
 const modal=doc.createElement('dialog');modal.id='project-reference';modal.setAttribute('aria-labelledby','project-reference-title');
 const header=doc.createElement('header'),title=doc.createElement('h2'),close=doc.createElement('button');title.id='project-reference-title';title.textContent='คำย่อโครงการ';close.type='button';close.textContent='ปิด ×';close.onclick=()=>modal.close();header.append(title,close);
 const search=doc.createElement('input');search.type='search';search.placeholder='ค้นหาคำย่อหรือชื่อโครงการ';search.setAttribute('aria-label','ค้นหาคำย่อโครงการ');
 const content=doc.createElement('div');modal.append(header,search,content);doc.body.append(modal);
 const render=()=>{
  const term=search.value.trim().toLocaleLowerCase('th');content.replaceChildren();let count=0;
  for(const group of projectAbbreviations){
   const groupMatch=(group.code+' '+group.title).toLocaleLowerCase('th').includes(term);
   const items=group.items.filter(item=>groupMatch||(item.code+' '+item.title).toLocaleLowerCase('th').includes(term));if(!items.length)continue;
   const section=doc.createElement('section'),heading=doc.createElement('h3');heading.textContent=group.title+' ('+group.code+')';section.append(heading);
   for(const item of items){const row=doc.createElement('div'),code=doc.createElement('span'),name=doc.createElement('span');row.className='project-item';code.className='project-code';code.textContent=item.code;name.textContent=item.title;row.append(code,name);section.append(row);count++;}
   content.append(section);
  }
  if(!count){const empty=doc.createElement('p');empty.textContent='ไม่พบคำย่อโครงการที่ตรงกับคำค้น';content.append(empty);}
 };
 search.addEventListener('input',render);button.addEventListener('click',()=>{search.value='';render();modal.showModal();search.focus();});
}
if(typeof document!=='undefined')installProjectAbbreviations();
