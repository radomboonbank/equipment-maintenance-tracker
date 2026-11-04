// Preserve the original assessment while storing the four-level assessment separately.
const levels=['extreme','severe','moderate','minor'];
const legacyLevels={high:'severe',medium:'moderate',low:'minor'};
export function decodeSeverityRecord(raw){
 return {...raw,legacyCriticality:raw.criticality||'',criticality:levels.includes(raw.severityLevel)?raw.severityLevel:legacyLevels[raw.criticality]||raw.criticality||''};
}
export function encodeSeverityRecord(record){
 const {legacyCriticality,...stored}=record;
 if(levels.includes(record.criticality)){
  stored.severityLevel=record.criticality;
  stored.criticality=['high','medium','low'].includes(legacyCriticality)?legacyCriticality:'';
 }
 return stored;
}
