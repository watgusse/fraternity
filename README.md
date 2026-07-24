# Fraternity Shirt Ordering System

ระบบรับสั่งซื้อเสื้อ Fraternity ภาษาไทย ราคา 550 บาทรวมจัดส่ง สร้างด้วย Node.js + Express + EJS เหมาะกับยอดสั่งซื้อขนาดเล็ก มีหน้าลูกค้า, Admin หลายบัญชี, สลิปแบบ private, ประวัติสถานะ และใบจ่าหน้า A6

## 1) ภาพรวมสถาปัตยกรรมและข้อจำกัด

เส้นทางคำขอคือ `Route → Controller → Order Service → Storage Adapter` ทำให้โค้ดธุรกิจใช้ชุดเดียวกันทั้ง Local และ Vercel:

- `local`: `data/orders.json` และ `uploads/slips/`; เขียน JSON ไปไฟล์ชั่วคราวแล้ว rename (atomic write) และเรียงงานเขียนภายใน process
- `vercel-blob`: `data/orders.json` และ `slips/...` ใน Private Vercel Blob; Server โหลดข้อมูลล่าสุดก่อนแก้ไขและเพิ่ม `revision`
- Admin ใช้ JWT อายุ 8 ชั่วโมงใน HttpOnly Cookie ไม่ต้องมี Session Store
- Browser ไม่ได้รับ Blob token หรือ public URL ของสลิป; รูปผ่าน route ที่ตรวจสิทธิ์ Admin เท่านั้น

JSON Blob ไม่มี transaction/lock ที่รับประกันข้าม serverless instance ทุกตัว งานเขียนพร้อมกันมากอาจเกิด lost update แม้โค้ดจะโหลดล่าสุดและ serialize ภายใน instance แล้ว จึงเหมาะเฉพาะระบบเล็ก ควรเปลี่ยนเป็นฐานข้อมูลที่มี transaction เมื่อมีผู้ใช้พร้อมกันมาก ต้องการรายงานซับซ้อน หรือมีข้อกำหนด audit สูง

## 2) คุณสมบัติ

- หน้า Mobile-first พร้อมข้อมูลสินค้า รูปหน้า/หลัง ตารางไซซ์ ผ้า วิธีซื้อ และการชำระเงิน
- เลือกเสื้อหลายไซซ์และหลายจำนวนในคำสั่งซื้อเดียวได้ รวมไม่เกิน 20 ตัว
- ตรวจข้อมูลทั้ง HTML และ Server, คำนวณยอดรวมของทุกรายการใหม่ที่ Server
- รับ JPG/JPEG/PNG/WebP ไม่เกิน 5 MB และสุ่มชื่อใหม่
- CSRF, Helmet/CSP, rate limit, body limit, bcrypt, JWT HttpOnly Cookie
- Dashboard ค้นหา/กรอง ดูสลิป เปลี่ยนสถานะ เก็บประวัติและหมายเหตุภายใน
- พิมพ์ที่อยู่ A6 รายรายการหรือเลือกหลายรายการ
- 404/500 โดยไม่เปิด stack trace ใน Production

## 3) Screenshots Placeholder

หลัง Run ให้บันทึกภาพหน้า `/`, `/order`, `/admin` แล้ววางใน `docs/screenshots/` เพื่อใช้ประกอบเอกสาร (ไม่มีภาพข้อมูลลูกค้าจริง)

## 4) Technology Stack

Node.js 22 LTS, Express 5, EJS, Bootstrap 5, bcryptjs, JWT, Multer, Vercel Blob, dotenv, Helmet, express-rate-limit, express-validator, csurf และ Node Test Runner

## 5) Project Structure

```text
api/index.js                 Vercel entry
config/                      สินค้าและผู้ส่ง
controllers/                 Public, Order, Admin
data/orders.json             Local JSON
middleware/                  Auth, CSRF, Upload, Validation, Error
public/css|js|images/        Static assets
routes/                      Route modules
scripts/                     Hash password และ seed
services/orderService.js     กฎธุรกิจ
services/storage/            Local / Vercel Blob adapters
test/                        Unit และ integration tests
uploads/slips/               Local slips (ไม่ commit)
utils/                       เลขคำสั่งซื้อ เงิน และวันที่
views/                       EJS public/admin/error/partials
app.js                       Express app / Local entry
```

## 6) Routes

| Method | Route                         | หน้าที่                                      |
| ------ | ----------------------------- | -------------------------------------------- |
| GET    | `/`                           | หน้าแรก                                      |
| GET    | `/order`                      | แบบฟอร์ม                                     |
| POST   | `/order`                      | บันทึกคำสั่งซื้อ                             |
| GET    | `/order/success/:orderNumber` | ยืนยัน (ต้องมี signed cookie จากการสั่งซื้อ) |
| GET    | `/admin/login`                | Login                                        |
| POST   | `/admin/login`                | ตรวจ Login                                   |
| POST   | `/admin/logout`               | Logout                                       |
| GET    | `/admin`                      | Dashboard                                    |
| GET    | `/admin/orders/:id`           | รายละเอียด                                   |
| GET    | `/admin/orders/:id/slip`      | สลิปสำหรับ Admin                             |
| POST   | `/admin/orders/:id/status`    | เปลี่ยนสถานะ                                 |
| POST   | `/admin/orders/:id/note`      | หมายเหตุภายใน                                |
| GET    | `/admin/orders/:id/print`     | พิมพ์ที่อยู่                                 |
| POST   | `/admin/orders/print-batch`   | พิมพ์หลายรายการ                              |

## 7) Data Structure

Root มี `revision`, `updatedAt`, `orders[]`; แต่ละ order มี UUID, order number, customer, items, total, slip metadata, payment/shipping/order status, `statusHistory`, admin note และ timestamps ตามตัวอย่างในโจทย์ ห้ามแก้ยอดเงินใน JSON ด้วยมือขณะ Server ทำงาน

## 8) Local Installation (ทีละขั้น)

### ตรวจโปรแกรม

```bash
node -v
npm -v
git --version
```

ใช้ Node 22 LTS แล้ว Clone/เข้าโฟลเดอร์:

```bash
git clone URL_ของโปรเจกต์
cd fraternity-shirt-order
npm install
```

สร้าง `.env`:

```powershell
# Windows
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

แก้ข้อมูลสินค้าที่ `config/product.json`, ผู้ส่งที่ `config/sender.json` และเปลี่ยน `public/images/qr-payment.webp` เป็น QR จริง จากนั้นตั้ง Admin ตามหัวข้อถัดไป

```bash
npm run dev
```

เปิด `http://localhost:3000`

## 9) Admin Account Setup

สร้าง hash (มี `--` เพื่อส่ง argument ให้ script):

```bash
npm run hash-password -- "รหัสผ่านที่ต้องการ"
```

คัดลอกผลลัพธ์ลง `.env` เช่น (ทั้งบรรทัดต้องเป็น JSON ที่ถูกต้อง):

```env
ADMIN_USERS_JSON=[{"username":"admin1","passwordHash":"$2b$12$HASH","role":"admin"},{"username":"admin2","passwordHash":"$2b$12$HASH2","role":"admin"}]
```

ห้ามใส่รหัสผ่านจริงใน Source/JSON/JWT และห้าม Commit `.env`

## 10) Storage Configuration

Local ใช้ `STORAGE_DRIVER=local`. ก่อนย้ายหรือแก้ `orders.json` ให้หยุด Server และสำรองก่อน การลบข้อมูลเมื่อหมดความจำเป็น: หา order ใน JSON, สำรอง, ลบ record, เพิ่ม revision แล้วลบไฟล์สลิป pathname ที่สัมพันธ์กัน (ควรทำใน maintenance window)

Production ใช้ `STORAGE_DRIVER=vercel-blob` และ token ที่ Vercel inject ให้ ห้ามใช้ Local filesystem บน Vercel เพราะข้อมูลจะหายหลัง redeploy/cold start

## 11) Vercel Blob Setup

1. เข้า Vercel Project → **Storage** → Create Database/Store → **Blob**
2. เลือก Private Blob และเชื่อมกับ Project
3. ตรวจว่า `BLOB_READ_WRITE_TOKEN` ปรากฏใน Project Environment Variables (อย่าคัดลอกลง Git)
4. เพิ่ม `STORAGE_DRIVER=vercel-blob`, `NODE_ENV=production` และ Secrets อื่น
5. Redeploy แล้วส่งคำสั่งซื้อทดสอบ
6. ตรวจ Blob paths `data/orders.json` และ `slips/...`
7. เปลี่ยนสถานะ แล้วเปิด JSON ตรวจ revision/updatedAt
8. Redeploy อีกครั้งและยืนยันว่าข้อมูลเดิมยังอยู่

สำรองโดยดาวน์โหลด `data/orders.json` และ slip objects จาก Storage dashboard ไปยังที่เข้ารหัส จำกัดสิทธิ์ และกำหนด retention. Restore โดยตรวจ schema แล้ว upload ทับ JSON ด้วยชื่อเดิมในช่วงไม่มีการรับ order. ลบ order และ Blob slip คู่กันเมื่อพ้นระยะเก็บ; ตรวจ pathname ให้ตรงก่อนลบเสมอ. Private Blob ยังเป็นข้อมูลส่วนบุคคล—จำกัดสมาชิก Project และหมุน token หากรั่ว

## 12) GitHub Deployment

สร้าง repository เปล่าบน GitHub แล้ว:

```bash
git init
git add .
git status
git commit -m "Initial fraternity shirt ordering system"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

`init` เริ่มประวัติ, `add` เตรียมไฟล์, `status` ให้ตรวจสิ่งที่จะส่ง, `commit` บันทึก snapshot, `branch -M` ตั้งชื่อ main, `remote` เชื่อม GitHub และ `push` ส่งขึ้น remote. ก่อน push ทุกครั้งใช้ `git status` และ `git ls-files` ยืนยันว่าไม่มี `.env`, secret/token, รหัสผ่านจริง, slip, orders จริง หรือ test PII

ถ้า repository มี README อยู่แล้วและ push ถูกปฏิเสธ:

```bash
git pull origin main --rebase
git push origin main
```

`pull --rebase` นำ commit ของเราไปต่อหลังของ remote; หาก conflict ให้แก้ไฟล์, `git add` และ `git rebase --continue`

## 13) Vercel Deployment และ Continuous Deployment

1. Login Vercel → Add New Project → Import Git Repository
2. เลือก repository; Framework Preset ใช้ **Other**
3. ไม่ต้องตั้ง Output Directory; `vercel.json` ส่งทุก request เข้า `api/index.js`
4. Build Command ปล่อย Default/ว่าง (หรือ `npm install` ตาม UI); Install Command ใช้ `npm install`
5. เพิ่ม Environment Variables ทุกตัวในหัวข้อ 14 และ Blob store
6. Deploy → ดู Deployment Logs → เปิด URL
7. ทดสอบหน้าแรก, form/upload, Admin, private slip และแก้ status/JSON Blob

หลังจากนั้น workflow คือ:

```bash
git add .
git commit -m "ข้อความอธิบายการแก้ไข"
git push origin main
```

Push `main` จะสร้าง Production Deployment อัตโนมัติ; branch/PR อื่นเป็น Preview (ใช้ test data/store แยกจาก Production). ดู Build/Runtime Logs ใน Deployment. Redeploy จากเมนู Deployment; Rollback/Promote deployment ก่อนหน้าได้จากรายการ deployments. การแก้ Environment Variable มีผลกับ deployment ใหม่ จึงต้อง Redeploy. อย่าแทน env ด้วย secret ใน Source

## 14) Environment Variables

| ตัวแปร                  | ใช้ทำอะไร                                                       |
| ----------------------- | --------------------------------------------------------------- |
| `NODE_ENV`              | `development`, `test`, `production`; ควบคุม Secure Cookie/error |
| `PORT`                  | พอร์ต Local                                                     |
| `APP_URL`               | URL หลักสำหรับเอกสาร/การต่อยอด                                  |
| `STORAGE_DRIVER`        | `local` หรือ `vercel-blob`                                      |
| `ADMIN_USERS_JSON`      | รายชื่อ Admin และ bcrypt hashes                                 |
| `ADMIN_JWT_SECRET`      | ลงนาม JWT; อย่างน้อย 64 random chars                            |
| `COOKIE_SECRET`         | ลงนาม CSRF/last-order cookies; คนละค่ากับ JWT                   |
| `BLOB_READ_WRITE_TOKEN` | Server-only access ไป Private Blob                              |

สร้าง secret สองชุด (PowerShell):

```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

หรือ macOS/Linux: `openssl rand -base64 64`. สร้างใหม่สองครั้งและห้ามแชร์ค่าเดียวกัน เพิ่มค่าใน Vercel: Project → Settings → Environment Variables → เลือก Production/Preview ตามความเหมาะสม → Save → Redeploy. ไม่ส่ง secret ผ่าน chat/screenshot และไม่เก็บใน GitHub

## 15) Security Notes

- EJS ใช้ `<%=` สำหรับ user input; ห้ามเปลี่ยนเป็น `<%-`
- Helmet CSP อนุญาตเฉพาะ self และ Bootstrap CDN ที่ระบุ; หาก self-host Bootstrap ให้เอา CDN ออก
- Rate limit ใช้แบบ in-memory เหมาะกับ instance เล็ก; serverless หลาย instance ไม่ได้แชร์ counter ควรเพิ่ม edge/WAF สำหรับความเสี่ยงสูง
- MIME + extension validation ลดความเสี่ยงแต่ไม่ใช่ malware scanner; Production จริงควรตรวจ magic bytes/สแกนไฟล์เพิ่ม
- Cookie เป็น HttpOnly, SameSite=Lax และ Secure ใน Production; Vercel ต้องเข้าผ่าน HTTPS
- เก็บ log เฉพาะชื่อ error ไม่ log password/JWT/token/slip/เนื้อหา PII
- จำกัดสิทธิ์ผู้ดูแลตามหน้าที่ ทบทวนบัญชี และลบข้อมูลเมื่อหมดวัตถุประสงค์

## 16) Testing

```bash
npm test
```

ครอบคลุมยอดรวม, order number, size/quantity, bcrypt, protected Admin route, invalid status, storage contract และ file type. Manual test:

1. เปิดหน้าแรก ตรวจข้อมูล/ภาพ/มือถือ
2. กดสั่งซื้อ กรอกทุกช่อง แนบรูปตัวอย่างไม่เกิน 5 MB
3. ส่งครั้งเดียว ตรวจหน้าเลขคำสั่งซื้อและ `data/orders.json`
4. Login Admin → ค้นหารายการ → เปิดรายละเอียด/สลิป
5. เปลี่ยนสถานะ ตรวจ history และหมายเหตุ
6. พิมพ์รายรายการและเลือกหลายรายการ ตรวจ A6 preview
7. ลองไฟล์ผิดชนิด, ใหญ่เกิน, quantity 0/21, CSRF เก่า และ URL Admin แบบ logout

## 17) Backup and Restore

Local: หยุด app, copy `data/orders.json` และ `uploads/slips` ไปพื้นที่เข้ารหัส; Restore ทั้งสองชุดพร้อมกันแล้วตรวจ JSON ด้วย `node -e "JSON.parse(require('fs').readFileSync('data/orders.json'))"`. Blob: ดาวน์โหลด JSON และ slips โดยผู้มีสิทธิ์; Restore ขณะปิดรับ order. เก็บ revision/timestamp และทดสอบ restore เป็นระยะ

## 18) Troubleshooting

| ปัญหา                | ตรวจ/แก้                                                               |
| -------------------- | ---------------------------------------------------------------------- |
| 404                  | ตรวจ route/method และ Vercel rewrite; success URL ต้องมี cookie เดิม   |
| EJS View ไม่พบ       | รันจาก project root และตรวจ `views/` อยู่ใน deployment includeFiles    |
| CSS ไม่ทำงาน         | เปิด `/css/style.css`, clear cache, ตรวจ CSP/CDN                       |
| Upload ไม่สำเร็จ     | ตรวจ enctype, MIME/extension, token และ Storage driver                 |
| ไฟล์ใหญ่เกิน         | ลดต่ำกว่า 5 MB; Multer จะปฏิเสธ                                        |
| Login ไม่สำเร็จ      | ตรวจ JSON syntax, username, bcrypt hash และ restart/redeploy           |
| Cookie ไม่ถูกส่ง     | ใช้ HTTPS ใน Production, domain เดียวกัน, ตรวจ SameSite/clock          |
| CSRF ไม่ถูกต้อง      | reload form; อย่าใช้ token จาก tab เก่าหรือข้าม cookie                 |
| Env ไม่ครบ           | เทียบ `.env.example`; restart/redeploy หลังแก้                         |
| Blob Token ผิด       | reconnect store, ตรวจ scope/environment แล้ว redeploy                  |
| ข้อมูลหายหลัง Deploy | ต้องใช้ `vercel-blob`, ไม่ใช้ local ใน Production                      |
| JSON เสียหาย         | หยุดเขียน, สำรองไฟล์เสีย, restore backup และตรวจ JSON                  |
| Git push ถูกปฏิเสธ   | `git pull origin main --rebase` แล้วแก้ conflict                       |
| Vercel Build Failed  | ดู log แรกที่ error, Node 22, lockfile และ env                         |
| ภาษาไทยผิด           | ไฟล์ต้อง UTF-8 และมี `<meta charset="utf-8">`                          |
| Print ไม่พอดี        | เลือก A6, scale 100%, margin none/default และปิด header/footer browser |

## 19) Known Limitations

ไม่มีฐานข้อมูล transaction, inventory lock, email/SMS, payment gateway, malware scan, per-admin authorization level หรือ distributed rate limiting. Private Blob JSON ไม่เหมาะกับ load สูง. QR และบัญชีใน repository เป็น placeholder ต้องเปลี่ยนก่อนใช้จริง

## 20) Future Improvements

ย้าย PostgreSQL เมื่อโต, magic-byte/virus scan, audit export, tracking field แยก, email receipt, inventory, retention automation, distributed lock/idempotency key, Thai address autocomplete และ automated browser/E2E tests

## Checklist ก่อนเปิดจริง

- [ ] แก้ product, sender, บัญชี และ QR จริง
- [ ] สร้าง Admin hashes ทุกบัญชีและ Secrets คนละค่า ≥64 random chars
- [ ] `.env`, slips และข้อมูลลูกค้าไม่อยู่ใน `git ls-files`
- [ ] Production ใช้ Private Blob + `STORAGE_DRIVER=vercel-blob`
- [ ] Run `npm test` ผ่านทั้งหมด
- [ ] ทดสอบ order, private slip, status history, note, logout และ print
- [ ] ตรวจ HTTPS/Secure Cookie, rate limits, 404/500 และมือถือ
- [ ] ตั้งสิทธิ์ Vercel/GitHub, backup, retention และ incident contact
- [ ] ทดสอบ redeploy แล้วข้อมูลยังอยู่
