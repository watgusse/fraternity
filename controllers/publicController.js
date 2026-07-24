const product = require('../config/product.json');
exports.home = (req, res) => res.render('public/home', { title: 'เสื้อ Fraternity', product });
exports.orderForm = (req, res) =>
  res.render('public/order-form', { title: 'สั่งซื้อเสื้อ', product, errors: [], old: {} });
