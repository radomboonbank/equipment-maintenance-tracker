# Telegram: ส่งเฉพาะเมื่อกดบันทึก

เมื่อผู้ใช้ admin/editor กดบันทึกและ Firestore transaction สำเร็จ เว็บเรียก Apps Script Web App ครั้งเดียวสำหรับ revision นั้น ไม่มีตัวตั้งเวลา ไม่มีการตรวจคิวทุก 5 นาที ไม่มีการส่งเมื่อเปิดหน้า/เข้าสู่ระบบ/ดูข้อมูล และไม่มีการส่งซ้ำอัตโนมัติ

telegramOutbox คงไว้เป็นหลักฐาน snapshot และสถานะส่ง เอกสารเก่าจะไม่ถูกกวาดส่ง ผู้ใช้ตรวจสถานะได้เฉพาะเอกสารที่ตนสร้างเท่านั้น

## ตั้งค่า
โครงการ: https://script.google.com/home/projects/1kvZcs4am3YrXlzmSxtSeiSQRm1JO4TgpcIy6icZGaQU5pWC_P97XozQs/edit
1. ใช้ Code.gs และ Message.gs พร้อม manifest ใน apps-script/
2. เก็บ TELEGRAM_BOT_TOKEN และ TELEGRAM_CHAT_ID ใน Script Properties เท่านั้น
3. รัน removeTrigger แล้วตรวจว่ามี 0 ทริกเกอร์
4. Deploy Web App: Execute as owner; access Anyone เพื่อให้ GitHub Pages ส่ง POST ได้
5. บันทึก URL /exec ใน window.GRID_TELEGRAM_URL ของ firebase-config.js
6. เผยแพร่ firestore.rules ที่ให้ editor อ่านสถานะรายการของตนได้

URL เปิดรับ POST แต่ doPost ตรวจ Firebase ID token ผ่าน Firestore Security Rules ของ DatabaseLogin และตรวจ role admin/editor อีกชั้น อ่านข้อความจาก snapshot เท่านั้น ไม่รับข้อความหรือ Chat ID จากผู้เรียก ไม่เก็บหรือ log ID token
ผู้เรียกต้องเป็นผู้บันทึก revision นั้น และเรียกภายใน 5 นาทีหลังบันทึก (อายุคำขอ ไม่ใช่ timer) ใช้ updateTime precondition ป้องกันคำขอซ้ำ ไม่ลองใหม่เมื่อ failed/sending/sent

## ข้อจำกัด
- เว็บแสดงผลบันทึกแยกจากผลส่ง Telegram ส่งไม่สำเร็จข้อมูลยังบันทึกแล้ว
- อย่าปิดหน้าขณะกำลังส่ง รอข้อความผลลัพธ์
- ไม่มี background retry เมื่อเครือข่ายขาด/โควตาเต็ม/Telegram ปฏิเสธ
- ข้อความยาวแบ่งหลายส่วน หากล้มเหลวอาจได้รับบางส่วน
- Telegram รับแล้วแต่บันทึกผลล้มเหลว สถานะอาจไม่แน่นอน จะไม่ส่งซ้ำเอง
- การลบไม่ส่งแจ้งเตือน
- ไม่เปิด Cloud Functions, Cloud Run, Scheduler, paid Telegram broadcast หรือ Blaze

## ตรวจต้นทุน 19 ตุลาคม 2569
Firebase console ยืนยัน Spark / Project cost: No-cost หน้าจอรายงาน reads ประมาณ 1.2K/50K ต่อวัน writes 20/20K deletes 10/20K (อาจล่าช้า)

| ส่วน | เงื่อนไขฟรี |
|---|---|
| GitHub Pages | public repository / github.io ไม่มีซื้อโดเมน |
| GitHub Actions | standard ubuntu-latest สำหรับ Pages ไม่มี larger runner/cache/package |
| Firebase Auth | Email/Password ไม่มี SMS/Phone Auth |
| Firestore Spark | (default) ฐานเดียว: 1 GiB, reads 50,000/วัน, writes 20,000/วัน, deletes 20,000/วัน, egress 10 GiB/เดือน |
| Apps Script | Gmail URL Fetch 20,000/วัน, รัน 6 นาที/ครั้ง |
| Telegram | Bot API ปกติ ไม่เปิด allow_paid_broadcast |
| Fonts / SDK | Google Fonts และ Firebase SDK สาธารณะ |

ฟรีมีโควตา ไม่ใช่ไม่จำกัด Spark จำกัด/หยุดบริการเมื่อเต็ม ไม่อัปเกรดเอง อย่าผูก Billing/เปลี่ยน Blaze หรือเปิดบริการคิดเงินเพื่อคงต้นทุน 0 บาท ค่าสมาชิกส่วนตัวอื่นอยู่นอกขอบเขตเว็บนี้
หนึ่งบันทึกข้อความส่วนเดียวใช้ประมาณ 5 document writes และ URL Fetch 6 ครั้ง รวม reads สิทธิ์/transaction; realtime listeners และผู้ชมหลายคนใช้ read quota ด้วย snapshot สะสมใช้พื้นที่ ต้องดูแลก่อนถึง 1 GiB ไม่มี TTL หรือ scheduled backup ที่เสียเงิน

อ้างอิง:
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/docs/firestore/pricing
- https://developers.google.com/apps-script/guides/services/quotas
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://core.telegram.org/bots

ทดสอบ: node --test apps-script/worker.test.cjs
