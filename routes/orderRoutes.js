const router = require('express').Router();
const controller = require('../controllers/orderController');
const publicController = require('../controllers/publicController');
const { upload } = require('../middleware/upload');
const csrf = require('../middleware/csrf');
const { normalizeOrderItems, orderValidators } = require('../middleware/validators');
router.get('/order', publicController.orderForm);
router.post(
  '/order',
  upload.single('paymentSlip'),
  csrf,
  (req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  },
  normalizeOrderItems,
  orderValidators,
  controller.create,
);
router.get('/order/success/:orderNumber', controller.success);
module.exports = router;
