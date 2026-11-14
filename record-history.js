const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function historyTime(value){
 const raw=value?.toDate?.()??(typeof value?.seconds==='number'?value.seconds*1000:value);
 const date=raw instanceof Date?raw:new Date(raw||NaN);
 return Number.isNaN(date.getTime())?'ไม่พบวันเวลาที่บันทึก':new Intl.DateTimeFormat('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
}
export function recordHistoryEntries(record){
 if(!record)return [];
 const saved=record._audit||record;
 const history=Array.isArray(saved.history)?saved.history:Array.isArray(saved.data?._history)?saved.data._history:[];
 if(history.length)return history.slice().reverse();
 const entries=[];
 if(saved.updatedAt)entries.push({at:saved.updatedAt,displayName:saved.updatedByName,by:saved.updatedByUsername||saved.updatedBy,note:'บันทึกข้อมูลล่าสุด',summaryOnly:true});
 if(saved.createdAt&&historyTime(saved.createdAt)!==historyTime(saved.updatedAt))entries.push({at:saved.createdAt,displayName:saved.createdByName,by:saved.createdByUsername||saved.createdBy,note:'สร้างรายการ',summaryOnly:true});
 return entries;
}
export function recordHistoryHtml(record){
 const entries=recordHistoryEntries(record);
 return `<section data-record-history style="grid-column:1/-1;min-width:0;margin:22px 0"><h3 style="font-size:15px;margin:0 0 14px;color:#193743">ประวัติรายการ</h3>${entries.length?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:8px">${entries.map(h=>`<article style="min-width:0;border-left:2px solid #73bbb4;background:#f4f9f9;padding:10px 12px;font-size:13px;line-height:1.6;overflow-wrap:anywhere"><div>${escapeHtml(h.note||'บันทึกข้อมูล')}</div><small style="display:block;color:#627c8c"><time>${escapeHtml(historyTime(h.at))}</time> · ${escapeHtml(h.displayName||h.by||'ไม่พบชื่อผู้บันทึก')}</small></article>`).join('')}</div>${entries.some(e=>e.summaryOnly)?'<p style="font-size:12px;color:#627c8c">แสดงข้อมูลที่ระบบเก็บไว้ รายการเดิมไม่มีประวัติการเปลี่ยนแปลงย้อนหลังครบทุกครั้ง</p>':''}`:'<p style="font-size:13px;color:#627c8c">ยังไม่มีประวัติรายการที่บันทึกไว้</p>'}</section>`;
}
export function mountRecordHistory(root,record){
 if(!root)return;
 root.querySelector('[data-record-history]')?.remove();
 const slot=root.ownerDocument.createElement('div');slot.innerHTML=recordHistoryHtml(record);
 const section=slot.firstElementChild;
 const actions=root.querySelector('.dialog-actions,.work-action-buttons,.actions,.edit-actions');
 if(actions)actions.before(section);else root.append(section);
}
if(typeof window!=='undefined')window.GRID_RECORD_HISTORY={mount:mountRecordHistory,html:recordHistoryHtml};
