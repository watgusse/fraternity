function notFound(req, res) {
  res.status(404).render('errors/404', { title: 'ไม่พบหน้า' });
}
function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${err.name}: ${err.message}`);
  if (err.code === 'EBADCSRFTOKEN')
    return res.status(403).render('errors/500', {
      title: 'คำขอไม่ถูกต้อง',
      message: 'แบบฟอร์มหมดอายุหรือ CSRF Token ไม่ถูกต้อง กรุณากลับไปลองใหม่',
    });
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).render('errors/500', {
      title: 'ไฟล์ใหญ่เกินกำหนด',
      message: 'กรุณาแนบภาพสลิปขนาดไม่เกิน 5 MB',
    });
  if (err.name === 'MulterError')
    return res.status(422).render('errors/500', {
      title: 'ไฟล์ไม่ถูกต้อง',
      message: 'รองรับเฉพาะ JPG, JPEG, PNG และ WebP',
    });
  const status = err.status || 500;
  res.status(status).render('errors/500', {
    title: 'เกิดข้อผิดพลาด',
    message:
      process.env.NODE_ENV === 'production'
        ? 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่ภายหลัง'
        : err.message,
  });
}
module.exports = { notFound, errorHandler };
