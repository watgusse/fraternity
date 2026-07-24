const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password) {
  console.error('วิธีใช้: npm run hash-password -- "รหัสผ่าน"');
  process.exit(1);
}
bcrypt.hash(password, 12).then((hash) => {
  console.log(hash);
  console.log('\nนำ Hash นี้ไปใส่ใน ADMIN_USERS_JSON (อย่า Commit รหัสผ่านจริง)');
});
