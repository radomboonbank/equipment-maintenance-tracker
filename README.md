# GRID CARE

เว็บติดตามอุปกรณ์ชำรุดภาษาไทย: https://radomboonbank.github.io/equipment-maintenance-tracker/

## บัญชีและสิทธิ์
- หน้าแรกกรอก username/password หรือเลือกผู้ชมทั่วไป
- Admin สร้าง แก้ไข และลบรายการได้; editor สร้างและแก้ไขได้; ผู้ชมอ่านได้อย่างเดียว
- Firebase Authentication เก็บ credential ส่วนบัญชีและ role อยู่ใน collection `DatabaseLogin/{Firebase Auth UID}` ใน Firestore default database โครงการ `equipment-maintenance-tr-fdae3`
- Profile มี `username` (ตัวพิมพ์เล็ก), `role` (`admin` หรือ `editor`) สร้างผ่าน Firebase console เท่านั้น ผู้ใช้ยกระดับสิทธิ์ตนเองไม่ได้
- Username แมปเป็น `<username>@equipment-maintenance-tr-fdae3.firebaseapp.com` สำหรับ Firebase Auth เท่านั้น ไม่ใช่อีเมลรับข้อความ
- Credential protocol v1: SHA-256 UTF-8 ของ `GRID-CARE:v1:<username>:<password>` ส่งเข้า Firebase Email/Password Auth เพื่อรองรับ PIN เดิมที่สั้นกว่า 6 ตัว ไม่มีรหัสผ่านหรือ hash อยู่ใน Firestore/ซอร์สโค้ด วิธีนี้ไม่ได้เพิ่มความยากในการเดา PIN สั้น หากเปลี่ยนรหัสผ่านต้องใช้ protocol เดียวกัน
- ต้องเปิด Email/Password provider ก่อนสร้างบัญชี ไม่มี public signup UI; ผู้สมัครผ่าน API เองไม่ได้รับสิทธิ์เขียนเพราะไม่มี DatabaseLogin profile
- Rules อนุญาตให้อ่านเอกสาร equipment สาธารณะตามโหมดผู้ชม รวมข้อมูลติดตามและข้อมูลติดต่อ บัญชีอ่านได้เฉพาะของตน
- เข้าสู่ระบบแล้วโหลดข้อมูล realtime อัตโนมัติ ไม่เก็บรหัสผ่านใน localStorage เปิดหน้าใหม่ต้องเข้าสู่ระบบใหม่

## ข้อมูล
- 100 รายการเดิมและ 9 หมายเหตุเก็บใน Firebase; ห้ามอัปโหลดไฟล์ข้อมูลหรือสำรองเข้า repo
- วันเวลาที่แสดงใช้ พ.ศ. / Asia/Bangkok วันที่ภายในเก็บ ISO ค.ศ. เพื่อคำนวณอย่างถูกต้อง
- รหัสใหม่ `DDMMBBBB_HHmmssSSS` (BBBB = ปี พ.ศ., SSS = มิลลิวินาที) เกิดตอนบันทึก รหัสเดิมคงไว้เพราะไม่มีเวลาสร้างเดิมที่ยืนยันได้
- เลือกวัน/เดือน/ปี พ.ศ. และใช้ native time picker
- `followups` มี 3 รายการ: date,time,informant,mobile,details,follower; ข้อความ tracking เดิมยังเก็บไว้ให้อ่าน
- Transaction + revision ป้องกันเขียนทับข้อมูลที่เปลี่ยนโดยผู้ใช้อื่น
- ลบถาวรได้เฉพาะ Admin มีคำยืนยันใน UI ควรสำรองผ่าน Firebase ก่อนลบ
- ไม่มีคำสั่งนำเข้า/ส่งออกในแอป

## พัฒนาและเผยแพร่
รัน `python -m http.server 8080` จากโฟลเดอร์นี้ แล้วเปิด http://localhost:8080 (ต้องออนไลน์สำหรับ Firebase)
GitHub Actions เผยแพร่เฉพาะ index.html, styles.css, app.js, utils.js, firebase-config.js
เผยแพร่ firestore.rules ผ่าน Firebase console พร้อมตั้ง DatabaseLogin profiles ก่อนใช้งาน

เอกสาร: https://firebase.google.com/docs/reference/rest/auth และ https://firebase.google.com/docs/firestore/solutions/role-based-access

## ปิดงานและ Telegram
ส่วนปิดงานเก็บ closure: date,time,reporter,mobile,details,follower กรอกครบแล้วบันทึกเปลี่ยนสถานะเป็น resolved อัตโนมัติ ผู้ชมอ่านอย่างเดียว ประวัติเดิมคงอยู่
หากต้องการเปิดงานใหม่ ให้ล้างข้อมูลปิดงานทุกช่องและเลือกสถานะที่ยังไม่ปิดก่อนบันทึก
Telegram ใช้ Google Apps Script Web App ส่งครั้งเดียวหลังผู้ใช้กดบันทึกสำเร็จ ไม่มี timer ไม่มีการส่งเมื่อเปิดหน้า และไม่มี retry อัตโนมัติ เก็บ snapshot เพื่อป้องกันส่งซ้ำและแสดงผลส่งแยกจากผลบันทึก ดู TELEGRAM-SETUP.md สำหรับการตั้งค่าและรายละเอียดโควตาฟรี
