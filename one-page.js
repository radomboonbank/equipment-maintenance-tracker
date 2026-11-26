const templateUrl=new URL('./assets/one-page-template.png',import.meta.url).href;
const criteriaUrl=new URL('./assets/severity-criteria.webp',import.meta.url).href;
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

export async function exportOnePage({title,code,sections,document:doc=document}){
 const [background,criteria]=await Promise.all([loadImage(templateUrl),loadImage(criteriaUrl)]);
 await doc.fonts?.ready;
 const canvas=doc.createElement('canvas');
 canvas.width=4000;canvas.height=Math.round(4000*19.05/27.517);
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('เบราว์เซอร์นี้ไม่รองรับการสร้างภาพ');
 const margin=100,top=470,gap=90;
 let bottom,colWidth,chartX,chartY,chartH;
 const geometry=()=>{bottom=canvas.height-190;colWidth=(canvas.width-margin*2-gap)/2;chartX=margin+colWidth+gap;chartY=top;chartH=colWidth*criteria.height/criteria.width;};
 geometry();
 function layout(size){
  const lines=[];let column=0,y=top;
  const starts=[top,chartY+chartH+65];
  for(const section of sections){
   for(const [content,bold] of [[section.title,true],[section.text||'—',false]]){
    ctx.font=`${bold?'bold ':''}${size}px Tahoma, sans-serif`;
    for(const line of wrapText(ctx,content,colWidth)){
     if(y+size*1.55>bottom){column++;y=starts[column];}
     if(column>1)return null;
     lines.push({x:margin+column*(colWidth+gap),y,text:line,bold});y+=size*1.55;
    }
   }y+=size*.7;
  }return lines;
 }
 let size,lines;
 for(const width of [4000,6000,8000]){
  canvas.width=width;canvas.height=Math.round(width*19.05/27.517);geometry();
  for(size=36;size>=14;size--){lines=layout(size);if(lines)break;}
  if(lines)break;
 }
 if(!lines)throw Error('ข้อมูลยาวเกินขนาดภาพหนึ่งหน้า กรุณาลดข้อความก่อนส่งออก');
 // Keep the supplied logo, replace the placeholder footer with the real date.
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(background,0,0,canvas.width,canvas.width*background.height/background.width);
 ctx.fillRect(0,440,canvas.width,canvas.height-440);
 ctx.fillStyle='#193f50';ctx.font='bold 62px Tahoma, sans-serif';
 const heading=wrapText(ctx,title,canvas.width-650);
 heading.forEach((line,i)=>ctx.fillText(line,550,170+i*85));
 ctx.font='30px Tahoma, sans-serif';ctx.fillText('รายละเอียด #'+(code||'รายการใหม่')+' · ข้อมูลตามฟอร์มขณะส่งออก',550,370);
 ctx.drawImage(criteria,chartX,chartY,colWidth,chartH);
 ctx.textBaseline='top';
 for(const line of lines){ctx.fillStyle=line.bold?'#087f83':'#193f50';ctx.font=`${line.bold?'bold ':''}${size}px Tahoma, sans-serif`;ctx.fillText(line.text,line.x,line.y);}
 ctx.font='26px Tahoma, sans-serif';ctx.fillStyle='#333';ctx.textAlign='right';
 ctx.fillText('สร้างเมื่อ '+new Date().toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}),canvas.width-margin,canvas.height-90);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));
 if(!blob)throw Error('สร้าง JPG ไม่สำเร็จ');
 const url=URL.createObjectURL(blob),link=doc.createElement('a');link.href=url;link.download='one-page-'+String(code||'draft').replace(/[^a-zA-Z0-9_-]/g,'_')+'.jpg';
 doc.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 return {width:canvas.width,height:canvas.height,fontSize:size};
}
