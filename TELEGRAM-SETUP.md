# Telegram ด้วย Google Apps Script (ใช้ Firebase Spark เดิม)

Apps Script: https://script.google.com/home/projects/1kvZcs4am3YrXlzmSxtSeiSQRm1JO4TgpcIy6icZGaQU5pWC_P97XozQs/edit

โค้ด Cloud Functions ถูกถอดออกแล้ว ไม่ต้อง Blaze, service account key หรือ public web app endpoint
ยังไม่มี Bot Token และ Chat ID จึงยังไม่เปิดส่งข้อความจริง

## เตรียมบอทและกลุ่ม
1. เปิด https://t.me/BotFather ส่ง `/newbot` ตั้งชื่อและ username ที่ลงท้าย bot
2. สร้างกลุ่มสำหรับแจ้งเตือน เพิ่มบอท ให้ส่งข้อความได้
3. ส่งข้อความ mention บอทในกลุ่ม แล้วหา Chat ID ผ่าน Bot API getUpdates จากเครื่องผู้ดูแล (ไม่เปิด URL ที่มี Token ใน browser)
4. ใน Apps Script > การตั้งค่าโครงการ > พร็อพเพอร์ตี้ของสคริปต์ เพิ่ม `TELEGRAM_BOT_TOKEN` และ `TELEGRAM_CHAT_ID`
5. เก็บ Token ใน Script Properties เท่านั้น ไม่ใส่โค้ด GitHub หรือ Firestore และอย่าแชร์สิทธิ์แก้ไข Apps Script ให้ผู้ที่ไม่ควรอ่าน Token

## เปิดใช้
1. ผู้ดูแล radomboon.t@gmail.com เปิด Apps Script ที่ลิงก์ด้านบน
2. เรียก `checkConnection` และอนุญาต OAuth ที่จำเป็น ได้แก่ Firestore/Datastore, เชื่อมต่อบริการภายนอก, จัดการทริกเกอร์ สคริปต์ใช้สิทธิ์ IAM ของบัญชีเจ้าของ ไม่ใช้ Firebase password หรือ service account key
3. ตรวจ log Firebase connection OK หากเจอ 403 ตรวจว่าเจ้าของมีสิทธิ์ Firestore และเปิด Cloud Firestore API ในโครงการที่ใช้ OAuth; อาจต้องเชื่อม Apps Script กับ standard GCP project เดิม โดยไม่เปิด billing
4. ใส่ Script Properties แล้วเรียก `installTrigger` เพื่อสร้างทริกเกอร์ทุก 5 นาที (เรียกซ้ำไม่สร้างซ้ำ)
5. บันทึกรายการทดสอบผ่านเว็บ ตรวจข้อความในกลุ่มและสถานะ sent ใน telegramOutbox แล้วลบข้อมูลทดสอบ

อย่ากด Deploy เป็นเว็บแอป ไม่ต้องเปิดให้ Anyone เข้าถึง สคริปต์ทำงานตามทริกเกอร์ของเจ้าของเท่านั้น

## ข้อมูลและการส่ง
- การบันทึกอุปกรณ์กับ telegramOutbox เกิดใน transaction เดียวกัน สำเร็จทั้งคู่หรือไม่เขียนทั้งคู่
- ID คิว `<recordId>__<revision>` เก็บ snapshot ของแต่ละครั้ง ไม่อ่านทับด้วยข้อมูลล่าสุด
- Rules บังคับ snapshot ตรงกับข้อมูลที่บันทึกและ revision ใหม่ บัญชีทั่วไป/ผู้ชมอ่านคิวหรือแก้สถานะการส่งไม่ได้
- ส่งข้อมูลหลัก ข้อมูลติดตาม และปิดงาน รวมชื่อและโทรศัพท์ไปยังกลุ่มที่ตั้งค่าไว้
- เริ่มตรวจคิวทุก 5 นาที เวลาส่งจริงขึ้นกับทริกเกอร์ เครือข่าย และโควตา ไม่ใช่แจ้งเตือนทันที
- มี checkpoint แยกแต่ละส่วนของข้อความ และยืดเวลาลองใหม่เมื่อส่งผิดพลาด หากผิดพลาดถึง 20 ครั้งพักเป็น failed ให้ผู้ดูแลตรวจปัญหาแล้วตั้ง status=pending และ readyAt เป็น timestamp ปัจจุบัน (คง nextPart เพื่อส่งต่อจากส่วนที่สำเร็จ)
- ถ้า Telegram รับข้อความแล้ว แต่บันทึก checkpoint ไม่สำเร็จ อาจมีข้อความซ้ำได้ เพราะ Telegram ไม่มี idempotency key
- คิวและ Token ไม่เปิดสาธารณะ สถานะ sent และ failed เก็บไว้ตรวจสอบ ไม่ลบอัตโนมัติ
- ก่อนเปิดบอท คิวสะสมจะรอไว้ เมื่อเปิดใช้งานจะส่งคิวที่ค้างด้วย ไม่มีการส่งย้อนหลังจาก 100 รายการเดิมที่ไม่ได้กดบันทึกใหม่
- ฟรีภายในโควตา Apps Script, Firestore Spark และ Telegram; คิวเพิ่มการใช้พื้นที่และการอ่าน/เขียน หากเต็มโควตาอาจบันทึกหรือส่งไม่ได้จนโควตาคืน ควรตรวจ Usage และเก็บสำรอง/ล้างคิวที่ส่งแล้วเป็นระยะโดยผู้ดูแล
- `removeTrigger` หยุดตรวจคิว โดยไม่ลบข้อมูล

## ทดสอบโค้ดบนเครื่อง
`node --test apps-script/worker.test.cjs`
ไฟล์ Code.gs และ Message.gs รวมอยู่ใน รหัส.gs บน Apps Script; manifest ตรงกับ apps-script/appsscript.json

เอกสาร: https://developers.google.com/apps-script/guides/services/quotas และ https://firebase.google.com/docs/firestore/use-rest-api
