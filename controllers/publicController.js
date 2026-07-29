const product = require('../config/product.json');
const orderService = require('../services/orderService');
exports.home = (req, res) => res.render('public/home', { title: 'เสื้อ Fraternity', product });
exports.orderForm = async (req, res, next) => {
  try {
    const availability = await orderService.getAvailability();
    res.render('public/order-form', {
      title: 'สั่งซื้อเสื้อ',
      product,
      availability,
      errors: [],
      old: {},
    });
  } catch (error) {
    next(error);
  }
};
exports.sharePage = (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const url = new URL('/share/fraternity-shirt', baseUrl).href;
  const image = new URL('/images/social/facebook-shirt-share.jpg', baseUrl).href;
  res.render('public/share-shirt', {
    title: 'เสื้อ Fraternity Thailand 9th Anniversary',
    product,
    meta: {
      title: 'เสื้อ Fraternity Thailand 9th Anniversary — พร้อมสั่งซื้อแล้ว',
      description:
        'เสื้อดำลายพิเศษฉลอง 9 ปี ราคา 550 บาท รวมค่าจัดส่ง เลือกไซซ์และสั่งซื้อออนไลน์ได้ทันที',
      url,
      image,
    },
  });
};
