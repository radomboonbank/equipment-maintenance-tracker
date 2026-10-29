export function matchesListFilters(record,filters={}) {
 const eventType=record.eventType==='Power Flow Control'?'ข้อจำกัด ระบบส่ง':record.eventType;
 const mainType=String(record.category||'').split(' · ')[0].trim();
 return (!filters.eventType || eventType===filters.eventType)
  && (!filters.equipmentType || mainType===filters.equipmentType)
  && (!filters.station || record.station===filters.station);
}
