# GRID CARE — ระบบติดตามอุปกรณ์ชำรุด

HTML / CSS / JavaScript ไม่ต้อง build รองรับ Firebase Authentication และ Cloud Firestore

## ใช้งานบนเครื่อง

เปิด `index.html` หรือรัน `python -m http.server 8080` ในโฟลเดอร์นี้ แล้วเปิด http://localhost:8080

นำเข้าไฟล์ `equipment-import.json` ที่ส่งแยกต่างหากผ่านปุ่ม **นำเข้าข้อมูล**: ข้อมูลจาก Excel 100 รายการและหมายเหตุ 9 แถว ข้อมูลถูกเก็บใน localStorage ของเบราว์เซอร์นี้เท่านั้น จนกว่าจะเชื่อมต่อ Firebase และนำเข้าอีกครั้งในโหมด Firebase สำรองด้วยปุ่มส่งออก JSON ก่อนย้ายเครื่องหรือล้างเบราว์เซอร์

วันที่ต้นฉบับเก็บปี 1950–1969 จึงติดธงให้ตรวจสอบ ไม่แปลงปีโดยคาดเดา และไม่มีสถานะซ่อมในไฟล์ จึงตั้งสถานะเริ่มต้นเป็นรอตรวจสอบ ความเร่งด่วนเริ่มต้นเป็นปกติ ไม่ใช่ผลการประเมินทางวิศวกรรม

## ตั้งค่า Firebase

1. สร้างโครงการที่ https://console.firebase.google.com แล้วเพิ่ม Web app คัดลอก firebaseConfig เป็น JSON
2. สร้าง Cloud Firestore Standard ในโหมด production เลือก region ให้ตรงข้อกำหนดองค์กร (เปลี่ยนภายหลังไม่ได้)
3. ใน Firestore > Rules วางเนื้อหา `firestore.rules` แล้ว Publish
4. Authentication > Sign-in method เปิด Email/Password จากนั้น Users > Add user สร้างบัญชีด้วยตนเองและคัดลอก UID
5. ใน Firestore สร้าง collection `members` และ document ID เท่ากับ UID เพิ่ม field `role` ชนิด string ค่า `admin` (หรือ `editor` / `viewer`)
6. เปิดแอป > ตั้งค่า > วาง Firebase config แบบ JSON > เชื่อมต่อ > เข้าสู่ระบบด้วยบัญชีที่สร้าง
7. นำเข้า `equipment-import.json` ในโหมด Firebase ข้อมูลเดิมในเครื่องจะไม่ส่งขึ้นอัตโนมัติ

Rules ปฏิเสธผู้ที่ไม่ได้เป็นสมาชิก การแก้ไขสมาชิกทำผ่าน Firebase console ของผู้ดูแลเท่านั้น ไม่มี public signup ในแอป และไม่มีการลบถาวร ประวัติเป็นบันทึกประกอบการทำงาน ไม่ใช่ immutable audit log

ผู้ใช้ `viewer` อ่านได้ แต่บันทึก/นำเข้าจะถูก Rules ปฏิเสธ การอัปเดตใช้ transaction + revision เพื่อป้องกันการเขียนทับงานของคนอื่น ไม่เปิด offline queue ในโหมด cloud การนำเข้าทีละ 100 รายการอาจสำเร็จบางส่วนได้เมื่อเครือข่ายขัดข้อง ให้นำเข้าไฟล์เดิมซ้ำเพื่อเติมรายการที่เหลือ (ข้าม ID/รหัสที่มีอยู่)

แอปเก็บ config ในเบราว์เซอร์แต่ละเครื่อง ไม่เก็บรหัสผ่านเอง Config สำหรับเว็บไม่ใช่ service account/private key การควบคุมสิทธิ์อยู่ที่ Authentication และ Firestore Rules

## GitHub Pages

สร้าง repository `equipment-maintenance-tracker` อัปโหลดเฉพาะไฟล์ในโฟลเดอร์นี้ (รวม `.github/workflows/pages.yml`) ตั้ง default branch เป็น `main` และ Settings > Pages > Source เป็น GitHub Actions โค้ด workflow จะเผยแพร่เฉพาะ index.html, styles.css และ app.js

**อย่าอัปโหลดไฟล์ Excel, equipment-import.json หรือไฟล์สำรองฐานข้อมูลเข้า repository สาธารณะ** ข้อมูลจริงส่งตรงไป Firestore หลังเข้าสู่ระบบเท่านั้น

GitHub Pages สำหรับ private repository อาจต้องมีแผนที่รองรับ หากใช้ repository สาธารณะให้มีเฉพาะซอร์สโค้ดซึ่งไม่มีข้อมูลอุปกรณ์จริง

## โครงสร้างข้อมูล

- `equipment/{id}`: ข้อมูลเดิม 15 คอลัมน์, status, priority, due, dateNeedsReview, history, revision, updatedAt
- `metadata/source-notes`: หมายเหตุนอกตารางที่ไม่ใช่รายการอุปกรณ์
- `members/{uid}`: role สำหรับควบคุมสิทธิ์

ข้อมูลหมายเหตุเก็บในไฟล์สำรองและ Firestore metadata ไม่มีการตีความเป็นคำสั่งหรือรายการอุปกรณ์

## เอกสารทางการ

- https://firebase.google.com/docs/web/alt-setup
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/firestore/security/get-started

Firebase SDK ใช้เวอร์ชัน 13.0.0 จาก CDN ของ Google จึงต้องมีอินเทอร์เน็ตเพื่อใช้งาน Firebase ฟอนต์ภายนอกมี Tahoma/system font สำรอง
