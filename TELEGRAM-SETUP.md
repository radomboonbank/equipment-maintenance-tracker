# เปิดแจ้งเตือน Telegram

สถานะ: เตรียมโค้ดแล้ว ยังไม่ได้เปิดใช้จริง ต้องมีบอท ห้องปลายทาง และ Firebase Blaze ก่อน deploy

## เตรียมใน Telegram
1. เปิดบอททางการ https://t.me/BotFather แล้วส่ง `/newbot` ตั้งชื่อและ username ที่ลงท้าย `bot`
2. เก็บ Bot Token ไว้ส่วนตัว อย่าส่งเข้า GitHub หรือใส่ใน JavaScript หน้าเว็บ
3. สร้างกลุ่มสำหรับแจ้งเตือน เพิ่มบอทเข้ากลุ่มและอนุญาตให้ส่งข้อความ ไม่จำเป็นต้องให้สิทธิ์ดูแลทุกอย่าง
4. ส่งข้อความในกลุ่มโดย mention บอท เพื่อให้ระบุ Chat ID ได้ผ่าน Bot API `getUpdates` จากเครื่องผู้ดูแล (ไม่ควรเปิด URL ที่มี token ใน browser เพราะติดประวัติ)
5. กำหนดกลุ่มผู้รับให้ถูกต้อง: ข้อความที่จะส่งมีข้อมูลอุปกรณ์ ผู้บันทึก ข้อมูลติดตาม และชื่อ/มือถือผู้แจ้งปิดงาน

## Firebase
Cloud Functions ต้องใช้ Blaze และ billing account ผู้ดูแลต้องเปิดแผนด้วยตัวเองก่อน ไม่ได้เปิดหรือผูกบัตรอัตโนมัติ
เมื่อพร้อม ใช้ Firebase CLI ที่ลงชื่อเข้าใช้เป็นผู้ดูแลโครงการจากโฟลเดอร์นี้:

```powershell
firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project equipment-maintenance-tr-fdae3
firebase functions:secrets:set TELEGRAM_CHAT_ID --project equipment-maintenance-tr-fdae3
npm --prefix functions install
npm --prefix functions test
firebase deploy --only functions:notifyEquipmentSave --project equipment-maintenance-tr-fdae3
```

คำสั่ง secrets:set จะให้กรอกค่าลับแบบ interactive ไม่ใส่ token ลง command line หรือไฟล์ repo
Function ใช้ region asia-southeast1 ซึ่งรับ trigger จาก Firestore ใน asia-southeast3 ได้; ตรวจ role/permission ที่ CLI ขอระหว่าง deploy ก่อนอนุมัติ

## การทำงาน
- ส่งเมื่อเอกสาร equipment สร้าง/อัปเดตสำเร็จ รวมทุกครั้งที่กดบันทึก เพราะ revision เพิ่มทุกครั้ง
- การบันทึกผิดพลาด การเปิดดู และการลบ ไม่ส่งข้อความ
- ทำงานฝั่งเซิร์ฟเวอร์ แม้ปิดหน้าเว็บหลังบันทึก ไม่ต้องเรียก Telegram จาก browser
- ส่งรายละเอียดหลัก ข้อมูลติดตาม 3 ลำดับ และข้อมูลปิดงาน พร้อมรหัส revision; วันที่ พ.ศ. เขต Asia/Bangkok
- ข้อความยาวแบ่งเป็นหลายส่วนไม่เกินขนาด Telegram ไม่ตัดข้อมูลกลางทาง
- Secret Manager เก็บ Bot Token และ Chat ID, `telegramDeliveries` เก็บสถานะส่งแบบ private เฉพาะ backend อ่านเขียนได้
- Event retry เปิดไว้ และ event ID ป้องกันส่งซ้ำเมื่อส่งสำเร็จแล้ว แต่ถ้า Telegram รับข้อความสำเร็จและเครือข่ายขาดก่อนบันทึกสถานะ อาจส่งซ้ำได้ (Telegram ไม่มี idempotency key)
- ไม่รับประกันลำดับข้อความของการบันทึกพร้อมกัน ให้ดูรหัส/ครั้งที่บันทึกในข้อความ
- หากกลุ่มลบบอท token ผิด หรือ API ล่ม จะ retry ตามช่วงเวลาของ Cloud Functions; หลังหมดช่วง retry ต้องให้ผู้ดูแลตรวจ failed delivery และดำเนินการใหม่ ข้อมูลอุปกรณ์ยังบันทึกสำเร็จตามปกติ
- เอกสารเดิมไม่ส่งย้อนหลังอัตโนมัติ การแจ้งเตือนเริ่มหลัง deploy เท่านั้น

## ตรวจหลังเปิดใช้
สร้างรายการทดสอบหนึ่งรายการ ตรวจข้อความในกลุ่มให้ตรงทั้งรหัส/สถานะ/วันที่ จากนั้นแก้ไขข้อมูลติดตามและปิดงาน ตรวจว่าทุก revision ส่งและสถานะ `telegramDeliveries` เป็น `sent` แล้วลบรายการทดสอบ
ทดสอบนี้ยังไม่ได้ทำกับ Telegram จริง เพราะยังไม่มีบอทหรือกลุ่ม

เอกสาร: https://firebase.google.com/docs/functions/get-started และ https://core.telegram.org/bots/api#sendmessage
