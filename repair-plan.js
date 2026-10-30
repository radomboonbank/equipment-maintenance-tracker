const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function repairPlanControl(record={},dateControl) {
 const plan=record.repairPlan||{};
 const values={approach:plan.approach??record.solution??'',responsible:plan.responsible??record.owner??''};
 const expected=plan.unknownDate===true?'':(plan.expectedDate??record.due??'');
 return `<fieldset class="repair-plan-field wide"><legend>แผนงานซ่อมแซมแก้ไข</legend><div class="form-grid">
 ${[['approach','1. แนวทางการแก้ไข (แผนดำเนินการแก้ไข)'],['responsible','2. ผู้รับผิดชอบ การแก้ไข (ชื่อ และเบอร์มือถือ)']].map(([key,label])=>`<label for="repair-${key}">${label}<textarea id="repair-${key}" name="repair-${key}" maxlength="4000">${esc(values[key])}</textarea>${key==='approach'&&plan.schedule?`<details class="repair-legacy"><summary>แผนดำเนินการแก้ไขเดิม</summary><p>${esc(plan.schedule)}</p></details>`:''}</label>`).join('')}
 <div class="repair-operator"><div id="repair-operator-title">3. Operator สฟ.</div><div class="repair-operator-row" role="group" aria-labelledby="repair-operator-title">
 ${[['operatorName','ชื่อ Operator สฟ.','text'],['operatorId','เลขประจำตัว','text'],['operatorMobile','เบอร์มือถือ','tel']].map(([key,label,type])=>`<label for="repair-${key}">${label}<input id="repair-${key}" name="repair-${key}" type="${type}" ${type==='tel'?'inputmode="tel"':''} maxlength="250" value="${esc(plan[key])}"></label>`).join('')}
 </div></div>
 <div class="repair-date"><div id="repair-expected-title">4. วันที่คาดว่าจะแก้ไขเสร็จ (พ.ศ.)</div><div role="group" aria-labelledby="repair-expected-title">${dateControl('repair-expected',expected)}</div><label class="repair-unknown"><input id="repair-unknown" name="repair-unknown" type="checkbox" ${plan.unknownDate===true?'checked':''}>ยังไม่ทราบกำหนดการแก้ไข</label></div>
 </div></fieldset>`;
}

export function setupRepairPlan(root,editable) {
 const checkbox=root.querySelector('#repair-unknown');
 const update=()=>root.querySelectorAll('[name^="repair-expected-"]').forEach(el=>{el.disabled=!editable||checkbox.checked;});
 checkbox.addEventListener('change',update);update();
}

export function readRepairPlan(form,previous={},readDate) {
 const unknownDate=form.get('repair-unknown')==='on';
 const plan={...Object.fromEntries(['approach','responsible','operatorName','operatorId','operatorMobile'].map(key=>[key,String(form.get('repair-'+key)||'').trim()])),schedule:previous.schedule??'',unknownDate,expectedDate:unknownDate?'':readDate(form,'repair-expected')};
 if(['approach','responsible','schedule'].some(key=>plan[key].length>4000))throw Error('แผนงานซ่อมแซมแต่ละข้อยาวได้ไม่เกิน 4,000 ตัวอักษร');
 if(['operatorName','operatorId','operatorMobile'].some(key=>plan[key].length>250))throw Error('ข้อมูล Operator สฟ. แต่ละช่องยาวได้ไม่เกิน 250 ตัวอักษร');
 return plan;
}
