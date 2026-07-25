const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');
const { loginValidators } = require('../middleware/validators');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที',
});
router.get('/login', controller.loginPage);
router.post('/login', loginLimiter, loginValidators, controller.login);
router.use(requireAdmin);
router.post('/logout', controller.logout);
router.get('/', controller.dashboard);
router.post('/orders/print-batch', controller.printBatch);
router.get('/orders/:id', controller.detail);
router.get('/orders/:id/edit', controller.editPage);
router.post('/orders/:id/edit', controller.edit);
router.post('/orders/:id/delete', controller.remove);
router.post('/orders/:id/share-link', controller.shareLink);
router.get('/orders/:id/slip', controller.slip);
router.post('/orders/:id/status', controller.status);
router.post('/orders/:id/note', controller.note);
router.get('/orders/:id/print', controller.print);
module.exports = router;
