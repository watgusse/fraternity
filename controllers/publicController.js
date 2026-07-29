const product = require('../config/product.json');
exports.home = (req, res) => res.render('public/home', { title: 'เสื้อ Fraternity', product });
exports.orderForm = (req, res) =>
  res.render('public/order-form', { title: 'สั่งซื้อเสื้อ', product, errors: [], old: {} });
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
