const { body } = require('express-validator');
const product = require('../config/product.json');
const clean = (v) => (typeof v === 'string' ? v.trim() : v);
const normalizeOrderItems = (req, res, next) => {
  req.body.sizes = Array.isArray(req.body.sizes)
    ? req.body.sizes
    : [req.body.sizes].filter(Boolean);
  req.body.quantities = Array.isArray(req.body.quantities)
    ? req.body.quantities
    : [req.body.quantities].filter((value) => value !== undefined && value !== '');
  next();
};
const orderValidators = [
  body('fullName').customSanitizer(clean).notEmpty().isLength({ max: 120 }),
  body('phone')
    .customSanitizer((v) => String(v || '').replace(/[\s-]/g, ''))
    .matches(/^0\d{8,9}$/),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('addressLine').customSanitizer(clean).notEmpty().isLength({ max: 300 }),
  body('subdistrict').customSanitizer(clean).notEmpty().isLength({ max: 100 }),
  body('district').customSanitizer(clean).notEmpty().isLength({ max: 100 }),
  body('province').customSanitizer(clean).notEmpty().isLength({ max: 100 }),
  body('postalCode').matches(/^\d{5}$/),
  body('sizes').isArray({ min: 1, max: product.sizes.length }),
  body('sizes.*').isIn(product.sizes.map((s) => s.name)),
  body('quantities').isArray({ min: 1, max: product.sizes.length }),
  body('quantities.*').isInt({ min: 1, max: product.maxQuantity }).toInt(),
  body().custom((_, { req }) => {
    if (req.body.sizes.length !== req.body.quantities.length) {
      throw new Error('รายการไซซ์และจำนวนไม่ตรงกัน');
    }
    const totalQuantity = req.body.quantities.reduce((sum, value) => sum + Number(value), 0);
    if (totalQuantity > product.maxQuantity) {
      throw new Error(`จำนวนเสื้อรวมต้องไม่เกิน ${product.maxQuantity} ตัว`);
    }
    return true;
  }),
  body('note').optional().customSanitizer(clean).isLength({ max: 500 }),
  body('confirmCorrect').equals('yes'),
  body('consent').equals('yes'),
];
const loginValidators = [
  body('username').trim().isLength({ min: 1, max: 80 }),
  body('password').isLength({ min: 1, max: 200 }),
];
module.exports = { normalizeOrderItems, orderValidators, loginValidators };
