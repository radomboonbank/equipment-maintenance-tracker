export function matchesListFilters(record,filters={}) {
 const eventType=record.eventType==='Power Flow Control'?'ข้อจำกัด ระบบส่ง':String(record.eventType||'').trim();
 const mainType=String(record.category||'').split(' · ')[0].trim();
 return (!filters.eventType || (filters.eventType==='__unspecified__'?(!eventType||eventType==='ยังไม่ระบุ'):eventType===filters.eventType))
  && (!filters.equipmentType || mainType===filters.equipmentType)
  && (!filters.station || record.station===filters.station);
}

// Sort by the event date, never by the last edit timestamp. Undated rows go last.
export function compareEventDates(a,b) {
 const key=r=>{
  const date=String(r.date||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return '';
  const parsed=new Date(date+'T00:00:00Z');
  if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return '';
  const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.time||'')?r.time:'00:00';
  return date+'T'+time;
 };
 return key(b).localeCompare(key(a))||String(a.code||'').localeCompare(String(b.code||''),'th',{numeric:true});
}
