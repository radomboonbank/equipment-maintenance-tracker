(() => {
 'use strict';
 const contacts = [["1", "553263", "นายอดิสรณ์ พึ่งพา", "กคก-ส.", "", "", "0634425459"], ["2", "548839", "นายนพพร กิฎามร", "วศ.10", "", "", "0851324899"], ["3", "515280", "นายเศกสันต์ แก้วสมนึก", "วศ.9", "", "", "0982565454"], ["4", "573744", "นายฉัตรชัย ดำคำ", "วศ.7", "สก.กคก-ส.", "", "0928249425"], ["5", "568481", "นายเชาวลิต กวีวัจน์", "หศก-ส.", "", "", "0866649642"], ["6", "590882", "นายธนภัทร ธนากุลชัย", "วศ.7", "หศก-ส.", "", "0944056989"], ["7", "574880", "นายโกสินทร์ นิลเต่า", "หจก-ส.", "", "", "0841794929"], ["8", "590634", "นายภาสกร เลขสุนทรากร", "วศ.7", "หจก-ส.", "", "0867877590"], ["9", "562149", "นายอานุภาพ พฤกษาวาณิชย์", "หปก1-ส.", "", "", "0922733399"], ["10", "494259", "นายเสน่ห์ กองรส", "หปก2-ส.", "", "", "0926249698"], ["11", "559350", "นายระดมบุญ ทักษณา", "หปก3-ส.", "", "", "0644651555"], ["12", "531022", "นายทรงศักดิ์ วนานุกัณฑ์", "หปก4-ส.", "", "", "0891132733"], ["13", "468568", "นายนพนัฐ มิตรสมาน", "ช.7", "หปก1-ส.", "", "0843326578"], ["14", "591965", "นายนิวัฒน์ เก่งกล้า", "วศ.7", "หปก2-ส.", "", "0646269525"], ["15", "590196", "นายลาภชนก ทิมสถิตย์", "วศ.7", "หปก3-ส.", "", "0979785451"], ["16", "529672", "นายสิริพงษ์ สินจินา", "ช.8", "หปก4-ส.", "", "0891313699"]];
 const dialog = document.getElementById('standby-dialog');
 const search = document.getElementById('standby-search');
 const body = document.getElementById('standby-rows');
 const count = document.getElementById('standby-count');
 function render() {
  const query = search.value.trim().toLocaleLowerCase('th').replace(/[\s-]/g, '');
  const matches = contacts.filter(row => row.join(' ').toLocaleLowerCase('th').replace(/[\s-]/g, '').includes(query));
  body.replaceChildren();
  for (const row of matches) {
   const tr = document.createElement('tr');
   row.forEach((value, index) => {
    const td = document.createElement('td');
    if (index === 6) {
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
  count.textContent = `แสดง ${matches.length} จาก ${contacts.length} รายชื่อ`;
  document.getElementById('standby-empty').hidden = matches.length > 0;
 }
 document.getElementById('standby-nav').addEventListener('click', () => {
  search.value = '';
  render();
  dialog.showModal();
  search.focus();
 });
 document.getElementById('standby-close').addEventListener('click', () => dialog.close());
 search.addEventListener('input', render);
})();
