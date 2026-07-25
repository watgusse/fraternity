const { validationResult } = require('express-validator');
const product = require('../config/product.json');
const orderService = require('../services/orderService');
exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!req.file)
      errors.errors.push({
        type: 'field',
        value: '',
        msg: 'กรุณาแนบสลิปที่ถูกต้อง',
        path: 'paymentSlip',
        location: 'body',
      });
    if (!errors.isEmpty())
      return res.status(422).render('public/order-form', {
        title: 'สั่งซื้อเสื้อ',
        product,
        errors: errors.array(),
        old: req.body,
      });
    const order = await orderService.create(
      {
        customer: {
          fullName: req.body.fullName,
          phone: req.body.phone,
          email: req.body.email || '',
          addressLine: req.body.addressLine,
          subdistrict: req.body.subdistrict,
          district: req.body.district,
          province: req.body.province,
          postalCode: req.body.postalCode,
        },
        items: req.body.sizes.map((size, index) => ({
          size,
          quantity: req.body.quantities[index],
        })),
        note: req.body.note,
      },
      req.file,
    );
    req.signedCookies.lastOrder = undefined;
    res.cookie('last_order', order.id, {
      signed: true,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000,
    });
    res.redirect(`/order/success/${encodeURIComponent(order.orderNumber)}`);
  } catch (e) {
    next(e);
  }
};
exports.success = async (req, res, next) => {
  try {
    const order = await orderService.findByOrderNumber(req.params.orderNumber);
    if (!order || req.signedCookies.last_order !== order.id)
      return res.status(404).render('errors/404', { title: 'ไม่พบคำสั่งซื้อ' });
    res.render('public/order-success', { title: 'รับคำสั่งซื้อแล้ว', order });
  } catch (e) {
    next(e);
  }
};
exports.publicStatus = async (req, res, next) => {
  try {
    const order = await orderService.findByShareToken(req.params.token);
    if (!order)
      return res.status(404).render('errors/404', { title: 'ไม่พบคำสั่งซื้อหรือลิงก์หมดอายุ' });
    const labels = {
      pending_payment_verification: 'รอตรวจสอบการชำระเงิน',
      paid: 'ชำระเงินแล้ว',
      preparing: 'กำลังเตรียมสินค้า',
      shipping: 'อยู่ระหว่างการจัดส่ง',
      completed: 'จัดส่งสำเร็จ',
      payment_rejected: 'หลักฐานการชำระเงินไม่ถูกต้อง',
      cancelled: 'ยกเลิก',
    };
    res.set('Cache-Control', 'private, no-store');
    res.render('public/order-status', {
      title: `ตรวจสอบ ${order.orderNumber}`,
      order,
      statusLabel: labels[order.orderStatus] || order.orderStatus,
    });
  } catch (error) {
    next(error);
  }
};
