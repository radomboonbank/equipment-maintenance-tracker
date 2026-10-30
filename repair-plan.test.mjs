import test from 'node:test';
import assert from 'node:assert/strict';
import {readRepairPlan,repairPlanControl,setupRepairPlan} from './repair-plan.js';
import {readDate} from './utils.js';
import {dashboardSummary} from './dashboard.js';
const date=(f,n)=>readDate(f.get(n+'-day'),f.get(n+'-month'),f.get(n+'-year'));
test('operator fields round-trip as text, retaining leading zeros and legacy plan',()=>{
 const f=new FormData();f.set('repair-operatorName',' Operator A ');f.set('repair-operatorId','00123');f.set('repair-operatorMobile','0812345678');
 const plan=readRepairPlan(f,{schedule:'แผนเดิม'},date);
 assert.equal(plan.operatorName,'Operator A');assert.equal(plan.operatorId,'00123');assert.equal(plan.operatorMobile,'0812345678');assert.equal(plan.schedule,'แผนเดิม');
 const html=repairPlanControl({repairPlan:plan},()=>'<select></select>');assert.match(html,/value="00123"/);assert.match(html,/แผนเดิม/);
});
test('unknown schedule overrides a partial date and is excluded from overdue work',()=>{
 const f=new FormData();f.set('repair-unknown','on');f.set('repair-expected-day','1');
 const plan=readRepairPlan(f,{},date);assert.equal(plan.expectedDate,'');assert.equal(plan.unknownDate,true);
 const summary=dashboardSummary([{status:'pending',repairPlan:plan}]);assert.equal(summary.overdue.length,0);assert.equal(summary.undated.length,1);
 assert.match(repairPlanControl({repairPlan:plan},()=>''),/type="checkbox" checked/);
});
test('known dates validate and convert Buddhist year; incomplete dates fail',()=>{
 const f=new FormData();f.set('repair-expected-day','31');f.set('repair-expected-month','10');f.set('repair-expected-year','2569');
 assert.equal(readRepairPlan(f,{},date).expectedDate,'2026-10-31');f.delete('repair-expected-year');assert.throws(()=>readRepairPlan(f,{},date));
});
test('checkbox toggles date controls without erasing unsaved selection or enabling guest controls',()=>{
 let change;const checkbox={checked:true,addEventListener:(_,fn)=>change=fn};const selects=[{value:'31',disabled:false}];const root={querySelector:()=>checkbox,querySelectorAll:()=>selects};
 setupRepairPlan(root,true);assert.equal(selects[0].disabled,true);checkbox.checked=false;change();assert.equal(selects[0].disabled,false);assert.equal(selects[0].value,'31');setupRepairPlan(root,false);change();assert.equal(selects[0].disabled,true);
});
test('operator length limits and HTML escaping',()=>{
 const f=new FormData();f.set('repair-operatorId','a'.repeat(251));assert.throws(()=>readRepairPlan(f,{},date));
 assert.match(repairPlanControl({repairPlan:{operatorName:'<script>',schedule:'<img>'}},()=>''),/&lt;script&gt;/);
});
