// Excel stored Buddhist short years as 19xx. Preserve the source value and
// store the corresponding Gregorian ISO date; Thai display uses Buddhist years.
function correctExcelDate(record, by, at = new Date().toISOString()) {
  if (!record.dateNeedsReview || !/^19\d{2}-\d{2}-\d{2}$/.test(record.date || '')) return null;
  const original = record.date;
  const buddhistYear = Number(original.slice(0,4)) + 600;
  const corrected = String(buddhistYear - 543) + original.slice(4);
  const parsed = new Date(corrected + 'T00:00:00Z');
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0,10) !== corrected) throw Error('วันเดือนไม่ถูกต้องหลังแก้ปี: ' + original);
  return {...record, date: corrected, originalDate: record.originalDate || original,
    dateNeedsReview: false, revision: (record.revision || 0) + 1, updatedAt: at,
    history: [...(record.history || []), {at, by,
      note: `แก้ปีวันที่ตามผู้ดูแล: ${original} → พ.ศ. ${buddhistYear}${original.slice(4)} (คงวันและเดือนเดิม)`}]};
}
const fixDatesButton = document.createElement('button');
fixDatesButton.id = 'fix-excel-dates';
fixDatesButton.textContent = 'แก้ปีวันที่ Excel 19xx → พ.ศ. 25xx';
document.querySelector('#setup').appendChild(fixDatesButton);
fixDatesButton.onclick = async () => {
  if (busy) return;
  if (cloud && !cloudReady) return toast('กรุณาเข้าสู่ระบบและรอโหลดข้อมูลก่อน');
  const candidates = data.filter(r => r.dateNeedsReview && /^19\d{2}-\d{2}-\d{2}$/.test(r.date || ''));
  if (!candidates.length) return toast('ไม่มีวันที่ 19xx ที่ต้องแก้ไข');
  if (!confirm(`แก้ปีวันที่ ${candidates.length} รายการ จาก 19xx เป็น พ.ศ. 25xx โดยคงวันและเดือนเดิม และเก็บค่าก่อนแก้ในประวัติ?`)) return;
  busy = true; fixDatesButton.disabled = true;
  const at = new Date().toISOString();
  let changed = 0;
  try {
    if (cloud) {
      for (let i = 0; i < candidates.length; i += 50) {
        const ids = candidates.slice(i,i+50).map(r=>r.id);
        changed += await cloud.runTransaction(cloud.db, async transaction => {
          const refs = ids.map(id=>cloud.doc(cloud.db,'equipment',id));
          const snapshots = await Promise.all(refs.map(ref=>transaction.get(ref)));
          let count = 0;
          snapshots.forEach((snapshot,j)=>{
            if (!snapshot.exists()) return;
            const updated = correctExcelDate(snapshot.data(), user.email, at);
            if (updated) {transaction.set(refs[j],updated);count++;}
          });
          return count;
        });
      }
    } else {
      persist(data.map(r=>{const updated=correctExcelDate(r,'ผู้ใช้บนเครื่อง',at);if(updated)changed++;return updated||r;}));
    }
    render(); toast(`แก้ปีวันที่แล้ว ${changed} รายการ`); $('#setup').close();
  } catch (error) {toast('แก้ปีไม่สำเร็จ: '+error.message+' สามารถกดซ้ำเพื่อดำเนินการส่วนที่เหลือ');}
  finally {busy=false;fixDatesButton.disabled=false;}
};
