(() => {
'use strict';
const contacts = [["1","553263","นายอดิสรณ์ พึ่งพา","กคก-ส.","","","0634425459"],["2","548839","นายนพพร กิฎามร","วศ.10","","","0851324899"],["3","515280","นายเศกสันต์ แก้วสมนึก","วศ.9","","","0982565454"],["4","573744","นายฉัตรชัย ดำคำ","วศ.7","สก.กคก-ส.","","0928249425"],["5","568481","นายเชาวลิต กวีวัจน์","หศก-ส.","","","0866649642"],["6","590882","นายธนภัทร ธนากุลชัย","วศ.7","หศก-ส.","","0944056989"],["7","574880","นายโกสินทร์ นิลเต่า","หจก-ส.","","","0841794929"],["8","590634","นายภาสกร เลขสุนทรากร","วศ.7","หจก-ส.","","0867877590"],["9","562149","นายอานุภาพ พฤกษาวาณิชย์","หปก1-ส.","","","0922733399"],["10","494259","นายเสน่ห์ กองรส","หปก2-ส.","","","0926249698"],["11","559350","นายระดมบุญ ทักษณา","หปก3-ส.","","","0644651555"],["12","531022","นายทรงศักดิ์ วนานุกัณฑ์","หปก4-ส.","","","0891132733"],["13","468568","นายนพนัฐ มิตรสมาน","ช.7","หปก1-ส.","","0843326578"],["14","591965","นายนิวัฒน์ เก่งกล้า","วศ.7","หปก2-ส.","","0646269525"],["15","590196","นายลาภชนก ทิมสถิตย์","วศ.7","หปก3-ส.","","0979785451"],["16","529672","นายสิริพงษ์ สินจินา","ช.8","หปก4-ส.","","0891313699"]];
const executiveContacts = [["1","518980","นายพุฒิขจร บุญมี","อปก","","","0652364203"],["2","531006","นายสัมพันธ์ สุคนธประพันธ์","ช.1","","","0818174626"],["3","556327","นายสุภัช ผาพันธุ์","ช.2","","","0972479355"],["4","553263","นายอดิสรณ์ พึ่งพา","กคก-ส.","","","0634425459"],["5","556335","นายสำเริงศักดิ์ ช่วยสกุล","กถก-ส.","","","0815635853"],["6","540595","นายวิโรจน์ สุขรัตน์","กสก-ส.","","","0632134466"],["7","489387","นายธาณินทร์ ศรีอ่อน","กรก-ส.","","","0891777898"],["8","555555","ว่าง","กบหก-ส.","","","1111111111"],["9","548839","นายนพพร กิฎามร","วศ.10","กคก-ส.","","0851324899"],["10","475734","นายวชิรเมธี อารีราษฎร์","วศ.10","กถก-ส.","","0922631333"],["11","557072","นายชัยธนันท์ วรรณรวีวัฒน์","วศ.10","กสก-ส.","","0615989145"],["12","534447","นางศรัณรัตน์ รัศมี","พช.10","","","0813733928"],["13","471070","นายบุญเชิด คันธชุมภู","วศ.9","กรก-ส.","","0818356501"],["14","533505","นางญาณี เจียรนัยกุลวานิช","วก.9","กบหก-ส.","","0817412870"],["15","533718","นายชลทิพย์ ภาวิไล","หปลก-ส.","","","0898229348"]];
const search = document.getElementById('standby-search');
const body = document.getElementById('standby-rows');
const buttons = [...document.querySelectorAll('[data-group]')];
let group = 'กคก-ส';
const normalize = value => value.toLocaleLowerCase('th').replace(/[\s-]/g, '');
function render() {
 const source = group === 'กคก-ส' ? contacts : group === 'ผู้บริหาร อปก' ? executiveContacts : [];
 const matches = source.filter(row => normalize(row.join(' ')).includes(normalize(search.value.trim())));
 document.getElementById('group-title').textContent = group;
 document.getElementById('standby-source').textContent = group === 'ผู้บริหาร อปก' ? 'ข้อมูลจากไฟล์ ผู้บริหาร.xlsx' : source.length ? 'ข้อมูลจากรายชื่อ Standby กคก. วันที่ 30 ธ.ค. 2568' : '';
 document.getElementById('standby-count').textContent = 'แสดง ' + matches.length + ' จาก ' + source.length + ' รายชื่อ';
 const empty = document.getElementById('standby-empty');
 empty.hidden = matches.length > 0;
 empty.textContent = source.length ? 'ไม่พบรายชื่อที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลรายชื่อ ' + group;
 body.replaceChildren();
 for (const row of matches) {
  const tr = document.createElement('tr');
  row.forEach((value, index) => {
   const td = document.createElement('td');
   if (index === 6 && row[2] !== 'ว่าง') {
    const link = document.createElement('a');
    link.href = 'tel:' + value;
    link.textContent = value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    link.setAttribute('aria-label', 'โทรหา ' + row[2] + ' ' + value);
    td.append(link);
   } else td.textContent = value || '—';
   tr.append(td);
  });
  body.append(tr);
 }
 buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.group === group)));
}
buttons.forEach(button => button.addEventListener('click', () => {
 group = button.dataset.group;
 search.value = '';
 render();
}));
search.addEventListener('input', render);
render();
})();