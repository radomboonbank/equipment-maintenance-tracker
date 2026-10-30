export const equipmentTypes = [
 {name:'หม้อแปลงไฟฟ้า',subtypes:['Tie TX','Loading TX','Station Service'],voltages:['500/230 kV','230/115 kV','115/69 kV','115/22 kV']},
 {name:'สายส่งไฟฟ้า',subtypes:['ภายใน อปก.','โรงไฟฟ้า','ลูกค้าตรง','สายส่ง Tie Line'],voltages:['500 kV','230 kV','115 kV','69 kV']},
 {name:'เซอร์กิตเบรกเกอร์',subtypes:[],voltages:['500 kV','230 kV','115 kV','69 kV','22 kV']},
 {name:'Disconnecting SW',subtypes:['ใบมีด','ใบมีด Ground','Power Fuse'],voltages:['500 kV','230 kV','115 kV','69 kV','22 kV']},
 {name:'คาปาซิเตอร์แบงค์',subtypes:[],voltages:['230 kV','115 kV','69 kV','22 kV']},
 {name:'จุดจ่ายไฟ ลูกค้า',subtypes:['กฟภ.','โรงไฟฟ้า','ลูกค้าตรง'],voltages:['230 kV','115 kV','69 kV','22 kV']},
 {name:'รีเลย์ระบบป้องกัน',subtypes:[],voltages:[]},
 {name:'ระบบสื่อสาร',subtypes:['สถานีไฟฟ้า','ศูนย์นนทบุรี'],voltages:[]},
 {name:'บัส',subtypes:[],voltages:['500 kV','230 kV','115 kV','22 kV']},
 {name:'SCADA system',subtypes:['สถานีไฟฟ้า','ศูนย์นนทบุรี'],voltages:[]},
 {name:'DC system',subtypes:['สถานีไฟฟ้า'],voltages:[]},
 {name:'อุปกรณ์ภายใน สฟ.',subtypes:[],voltages:[]}
];
const separator=' · ';
export function parseEquipmentCategory(value='') {
 const [name,...parts]=value.split(separator),type=equipmentTypes.find(v=>v.name===name);
 if(!type)return {legacy:value,name:'',subtype:'',voltage:''};
 const subtype=type.subtypes.length?parts.shift()||'':'',voltage=type.voltages.length?parts.shift()||'':'';
 if(parts.length||(subtype&&!type.subtypes.includes(subtype))||(voltage&&!type.voltages.includes(voltage)))return {legacy:value,name:'',subtype:'',voltage:''};
 return {legacy:'',name,subtype,voltage};
}
export function formatEquipmentCategory(name,subtype='',voltage='') {
 const type=equipmentTypes.find(v=>v.name===name);
 if(!type)return '';
 if(subtype&&type.subtypes.length&&!type.subtypes.includes(subtype))throw Error('กรุณาเลือกชนิดอุปกรณ์ย่อย');
 if(voltage&&type.voltages.length&&!type.voltages.includes(voltage))throw Error('กรุณาเลือกระดับแรงดัน');
 return [name,...(type.subtypes.length?[subtype]:[]),...(type.voltages.length?[voltage]:[])].join(separator);
}
