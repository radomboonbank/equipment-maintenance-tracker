const templateUrl=new URL('./assets/one-page-template.png',import.meta.url).href;
const fontUrl=new URL('./assets/NotoSansThai.ttf',import.meta.url).href;
const levels=['extreme','severe','moderate','minor'];
export const canExportOnePage=(role,duty)=>role==='admin'&&duty==='king admin';
export function assessmentTable(ctx,x,y,width,selected,draw=false){
 const rows=[
 ['ปัจจัยที่ใช้พิจารณา','รุนแรงมาก','รุนแรง','ปานกลาง','เล็กน้อย'],
 ['พื้นที่ไฟดับ','หลายจังหวัด (ทั้งจังหวัด)\nกรุงเทพฯ\nเมืองใหญ่','ทั้งจังหวัด\nย่านธุรกิจ\nย่านอุตสาหกรรม\nสถานที่สำคัญ\nเมืองใหญ่','เขตตัวเมือง หรือมากกว่า 50% ของจังหวัด','บางพื้นที่ในจังหวัด'],
 ['ระยะเวลาที่ไฟดับ','มากกว่า 8 ชั่วโมง','มากกว่า 2 ชั่วโมง แต่ไม่เกิน 8 ชั่วโมง','30–120 นาที','น้อยกว่า 30 นาที'],
 ['จำนวนพลังงานไฟฟ้าที่หายไป','ไฟดับ > 500 MW\n(อนล., อปก.)','ไฟดับ 100–500 MW\n(อนล., อปก.)','ไฟดับ 30–100 MW\n(อนล., อปก.)','ไฟดับ < 30 MW\n(อนล., อปก.)'],
 ['ไฟดับขณะมีเหตุการณ์สำคัญหรือพิเศษ','การนับคะแนนเลือกตั้งระดับประเทศ\nการจัดงานระดับประเทศ ฯลฯ','การเลือกตั้งระดับประเทศ\nการถ่ายทอดรายการ/เหตุการณ์สำคัญทางโทรทัศน์ ฯลฯ','การเลือกตั้งระดับท้องถิ่น\nการจัดงานเทศกาลที่สำคัญของจังหวัด ฯลฯ','—']
 ];
 const size=width/51,lineHeight=size*1.45,pad=width/100;
 const widths=[width*.22,...Array(4).fill(width*.195)];let cy=y;
 rows.forEach((row,ri)=>{
  ctx.font=`${ri===0?'700':'400'} ${size}px "Noto Sans Thai"`;
  const lines=row.map((s,i)=>wrapText(ctx,(ri===0&&levels[i-1]===selected?'✓ ':'')+s,widths[i]-pad*2));
  const height=Math.max(...lines.map(a=>a.length))*lineHeight+pad*2;
  if(draw){let cx=x;row.forEach((_,i)=>{
   const active=i>0&&levels[i-1]===selected;
   ctx.fillStyle=ri===0?(active?'#087f83':'#193f50'):(active?'#e0f4ef':'#fff');ctx.fillRect(cx,cy,widths[i],height);
   ctx.strokeStyle=active?'#087f83':'#bacbd1';ctx.lineWidth=active?5:2;ctx.strokeRect(cx,cy,widths[i],height);
   ctx.fillStyle=ri===0?'#fff':'#193f50';ctx.textBaseline='top';
   lines[i].forEach((s,j)=>ctx.fillText(s,cx+pad,cy+pad+j*lineHeight));cx+=widths[i];
  });}cy+=height;
 });return cy-y;
}
const loadImage=url=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('โหลดรูปประกอบไม่สำเร็จ กรุณาลองใหม่'));img.src=url;});

// Word segmentation preserves Thai clusters; grapheme fallback handles long IDs/URLs.
export function wrapText(ctx,text,width){
 const result=[];
 const words=typeof Intl.Segmenter==='function'?new Intl.Segmenter('th',{granularity:'word'}):null;
 const chars=typeof Intl.Segmenter==='function'?new Intl.Segmenter('th',{granularity:'grapheme'}):null;
 for(const paragraph of String(text??'').split('\n')){
  let line='';
  for(const token of words?Array.from(words.segment(paragraph),x=>x.segment):Array.from(paragraph)){
   if(ctx.measureText(line+token).width<=width){line+=token;continue;}
   if(line){result.push(line.trimEnd());line='';}
   for(const c of chars?Array.from(chars.segment(token),x=>x.segment):Array.from(token)){
    if(line&&ctx.measureText(line+c).width>width){result.push(line.trimEnd());line='';}line+=c;
   }
  }
  result.push(line.trimEnd());
 }
 return result;
}

export async function exportOnePage({title,code,sections,criticality='',document:doc=document}){
 const background=await loadImage(templateUrl);
 if(!Array.from(doc.fonts).some(face=>face.family==='Noto Sans Thai')){
  const face=new FontFace('Noto Sans Thai',`url("${fontUrl}")`,{weight:'100 900'});await face.load();doc.fonts.add(face);
 }
 await doc.fonts.load('400 52px "Noto Sans Thai"');await doc.fonts.load('700 52px "Noto Sans Thai"');
 sections=sections.filter(s=>String(s.text??'').trim()&&s.text!=='—');
 criticality=({high:'severe',medium:'moderate',low:'minor'})[criticality]||criticality;
 const canvas=doc.createElement('canvas');
 canvas.width=4000;canvas.height=Math.round(4000*19.05/27.517);
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('เบราว์เซอร์นี้ไม่รองรับการสร้างภาพ');
 const margin=100,top=470,gap=90;
 let bottom,colWidth,chartX,chartY,chartH;
 const geometry=()=>{bottom=canvas.height-150;colWidth=(canvas.width-margin*2-gap)/2;chartX=margin+colWidth+gap;chartY=top+65;chartH=assessmentTable(ctx,chartX,chartY,colWidth,criticality);};
 geometry();
 function layout(size){
  const lines=[];let column=0,y=top;
  const starts=[top,chartY+chartH+65];
  for(const section of sections){
   for(const [content,bold] of [[section.title,true],[section.text||'—',false]]){
    ctx.font=`${bold?'700':'400'} ${size}px "Noto Sans Thai"`;
    for(const line of wrapText(ctx,content,colWidth)){
     if(y+size*1.55>bottom){column++;y=starts[column];}
     if(column>1)return null;
     lines.push({x:margin+column*(colWidth+gap),y,text:line,bold});y+=size*1.55;
    }
   }y+=size*.7;
  }return lines;
 }
 let size,lines;
 for(const width of [5000,6500,8000]){
  canvas.width=width;canvas.height=Math.round(width*19.05/27.517);geometry();
  for(size=56;size>=30;size--){lines=layout(size);if(lines)break;}
  if(lines)break;
 }
 if(!lines)throw Error('ข้อมูลยาวเกินขนาดภาพหนึ่งหน้า กรุณาลดข้อความก่อนส่งออก');
 // Keep the supplied logo, replace the placeholder footer with the real date.
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(background,0,0,4000,4000*background.height/background.width);
 ctx.fillRect(0,440,canvas.width,canvas.height-440);
 ctx.fillStyle='#193f50';ctx.font='700 72px "Noto Sans Thai"';
 const heading=wrapText(ctx,title,canvas.width-650);
 heading.forEach((line,i)=>ctx.fillText(line,550,170+i*85));
 ctx.font='400 40px "Noto Sans Thai"';ctx.fillText('รายละเอียด #'+(code||'รายการใหม่')+' · ข้อมูลตามฟอร์มขณะส่งออก',550,370);
 ctx.font='700 42px "Noto Sans Thai"';ctx.fillText('ตารางประเมินเหตุการณ์นี้ · '+({extreme:'รุนแรงมาก',severe:'รุนแรง',moderate:'ปานกลาง',minor:'เล็กน้อย'}[criticality]||'ยังไม่ประเมิน'),chartX,top+25);
 assessmentTable(ctx,chartX,chartY,colWidth,criticality,true);
 ctx.textBaseline='top';
 for(const line of lines){ctx.fillStyle=line.bold?'#087f83':'#193f50';ctx.font=`${line.bold?'700':'400'} ${size}px "Noto Sans Thai"`;ctx.fillText(line.text,line.x,line.y);}
 ctx.font='32px "Noto Sans Thai"';ctx.fillStyle='#333';ctx.textAlign='right';
 ctx.fillText('สร้างเมื่อ '+new Date().toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}),canvas.width-margin,canvas.height-90);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));
 if(!blob)throw Error('สร้าง JPG ไม่สำเร็จ');
 const url=URL.createObjectURL(blob),link=doc.createElement('a');link.href=url;link.download='one-page-'+String(code||'draft').replace(/[^a-zA-Z0-9_-]/g,'_')+'.jpg';
 doc.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 return {width:canvas.width,height:canvas.height,fontSize:size};
}
