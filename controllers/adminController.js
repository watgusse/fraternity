const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const orderService = require('../services/orderService');
const storage = require('../services/storage');
const { issueAdmin, logout } = require('../middleware/auth');
const labels = {
  pending_payment_verification: 'รอตรวจสอบการชำระเงิน',
  paid: 'ชำระเงินแล้ว',
  preparing: 'กำลังเตรียมสินค้า',
  shipping: 'อยู่ระหว่างการจัดส่ง',
  completed: 'ส่งเรียบร้อยแล้ว',
  payment_rejected: 'หลักฐานไม่ถูกต้อง',
  cancelled: 'ยกเลิก',
};
function admins() {
  try {
    return JSON.parse(process.env.ADMIN_USERS_JSON || '[]');
  } catch {
    return [];
  }
}
exports.loginPage = (req, res) =>
  res.render('admin/login', { title: 'เข้าสู่ระบบผู้ดูแล', error: null });
exports.login = async (req, res, next) => {
  try {
    if (!validationResult(req).isEmpty())
      return res.status(401).render('admin/login', {
        title: 'เข้าสู่ระบบผู้ดูแล',
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      });
    const user = admins().find((u) => u.username === req.body.username);
    const ok = user && (await bcrypt.compare(req.body.password, user.passwordHash));
    if (!ok)
      return res.status(401).render('admin/login', {
        title: 'เข้าสู่ระบบผู้ดูแล',
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      });
    issueAdmin(res, user);
    res.redirect('/admin');
  } catch (e) {
    next(e);
  }
};
exports.logout = (req, res) => {
  logout(res);
  res.redirect('/admin/login');
};
exports.dashboard = async (req, res, next) => {
  try {
    let orders = await orderService.list();
    const all = orders;
    const q = String(req.query.search || '').toLowerCase(),
      status = req.query.status || '',
      size = req.query.size || '',
      date = req.query.date || '';
    orders = orders.filter(
      (o) =>
        (!q ||
          [o.orderNumber, o.customer.fullName, o.customer.phone].some((v) =>
            v.toLowerCase().includes(q),
          )) &&
        (!status || o.orderStatus === status) &&
        (!size || o.items.some((item) => item.size === size)) &&
        (!date || o.createdAt.startsWith(date)),
    );
    const summary = {
      all: all.length,
      pending: all.filter((o) => o.orderStatus === 'pending_payment_verification').length,
      paid: all.filter((o) => o.orderStatus === 'paid').length,
      shipping: all.filter((o) => o.orderStatus === 'shipping').length,
      completed: all.filter((o) => o.orderStatus === 'completed').length,
      shirts: all.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0),
      amount: all.reduce((s, o) => s + o.totalAmount, 0),
    };
    res.render('admin/dashboard', {
      title: 'Dashboard',
      orders,
      summary,
      labels,
      filters: { q, status, size, date },
    });
  } catch (e) {
    next(e);
  }
};
exports.detail = async (req, res, next) => {
  try {
    const order = await orderService.findById(req.params.id);
    if (!order) return res.status(404).render('errors/404', { title: 'ไม่พบรายการ' });
    res.render('admin/order-detail', {
      title: order.orderNumber,
      order,
      labels,
      statuses: orderService.STATUSES,
    });
  } catch (e) {
    next(e);
  }
};
exports.slip = async (req, res, next) => {
  try {
    const order = await orderService.findById(req.params.id);
    if (!order) return res.sendStatus(404);
    const file = await storage().getSlip(order.paymentSlip.pathname);
    res
      .set({
        'Content-Type': order.paymentSlip.contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(file.buffer);
  } catch (e) {
    next(e);
  }
};
exports.status = async (req, res, next) => {
  try {
    const order = await orderService.updateStatus(
      req.params.id,
      req.body.status,
      req.admin.username,
    );
    if (!order) return res.sendStatus(404);
    res.redirect(`/admin/orders/${order.id}?updated=status`);
  } catch (e) {
    if (e.message === 'สถานะไม่ถูกต้อง') return res.status(400).send('Invalid status');
    next(e);
  }
};
exports.note = async (req, res, next) => {
  try {
    const note = String(req.body.adminNote || '')
      .trim()
      .slice(0, 1000);
    const order = await orderService.updateNote(req.params.id, note);
    if (!order) return res.sendStatus(404);
    res.redirect(`/admin/orders/${order.id}?updated=note`);
  } catch (e) {
    next(e);
  }
};
exports.print = async (req, res, next) => {
  try {
    const order = await orderService.findById(req.params.id);
    if (!order) return res.sendStatus(404);
    res.render('admin/print-label', {
      title: 'พิมพ์ที่อยู่',
      order,
      sender: require('../config/sender.json'),
    });
  } catch (e) {
    next(e);
  }
};
exports.printBatch = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.orderIds)
      ? req.body.orderIds
      : [req.body.orderIds].filter(Boolean);
    const orders = (await orderService.list()).filter((o) => ids.includes(o.id));
    if (!orders.length) return res.redirect('/admin');
    res.render('admin/print-batch', {
      title: 'พิมพ์หลายรายการ',
      orders,
      sender: require('../config/sender.json'),
    });
  } catch (e) {
    next(e);
  }
};
exports.labels = labels;
exports._admins = admins;
