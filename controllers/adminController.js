const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const product = require('../config/product.json');
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
  const raw = process.env.ADMIN_USERS_JSON;
  if (!raw) throw new Error('ADMIN_USERS_JSON is missing');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`ADMIN_USERS_JSON is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0)
    throw new Error('ADMIN_USERS_JSON must contain at least one admin');
  for (const user of parsed) {
    if (!user || typeof user.username !== 'string' || !user.username.trim())
      throw new Error('ADMIN_USERS_JSON contains an invalid username');
    if (
      typeof user.passwordHash !== 'string' ||
      !/^\$2[aby]\$\d{2}\$.{53}$/.test(user.passwordHash)
    )
      throw new Error(`ADMIN_USERS_JSON contains an invalid passwordHash for ${user.username}`);
  }
  return parsed;
}
function assertAdminAuthConfigured() {
  if (!process.env.ADMIN_JWT_SECRET || process.env.ADMIN_JWT_SECRET.length < 32)
    throw new Error('ADMIN_JWT_SECRET is missing or shorter than 32 characters');
}
function buildSummary(orders) {
  const paidOrders = orders.filter((order) => order.paymentStatus === 'paid');
  const sizeCounts = Object.fromEntries(product.sizes.map((size) => [size.name, 0]));
  for (const order of orders) {
    for (const item of order.items) {
      if (Object.hasOwn(sizeCounts, item.size)) sizeCounts[item.size] += item.quantity;
    }
  }
  return {
    all: orders.length,
    pending: orders.filter((order) => order.orderStatus === 'pending_payment_verification').length,
    paid: paidOrders.length,
    shipping: orders.filter((order) => order.orderStatus === 'shipping').length,
    completed: orders.filter((order) => order.orderStatus === 'completed').length,
    shirts: orders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    ),
    amount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
    paidAmount: paidOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    sizeCounts,
  };
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
    let configuredAdmins;
    try {
      assertAdminAuthConfigured();
      configuredAdmins = admins();
    } catch (error) {
      console.error(`[Admin auth configuration] ${error.message}`);
      return res.status(503).render('admin/login', {
        title: 'Admin login',
        error: 'ระบบผู้ดูแลยังตั้งค่าไม่สมบูรณ์ กรุณาตรวจสอบ Environment Variables',
      });
    }
    const user = configuredAdmins.find((u) => u.username === req.body.username);
    const ok = user && (await bcrypt.compare(req.body.password, user.passwordHash));
    if (!ok) {
      console.warn('[Admin auth] Login rejected: invalid credentials');
      return res.status(401).render('admin/login', {
        title: 'เข้าสู่ระบบผู้ดูแล',
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      });
    }
    issueAdmin(res, user);
    console.info(`[Admin auth] Login succeeded for ${user.username}`);
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
    const summary = buildSummary(all);
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
function editInput(body) {
  const text = (name, max) =>
    String(body[name] || '')
      .trim()
      .slice(0, max);
  const customer = {
    fullName: text('fullName', 120),
    phone: text('phone', 20).replace(/[\s-]/g, ''),
    email: text('email', 160),
    addressLine: text('addressLine', 300),
    subdistrict: text('subdistrict', 100),
    district: text('district', 100),
    province: text('province', 100),
    postalCode: text('postalCode', 5),
  };
  if (
    !customer.fullName ||
    !/^0\d{8,9}$/.test(customer.phone) ||
    !customer.addressLine ||
    !customer.subdistrict ||
    !customer.district ||
    !customer.province ||
    !/^\d{5}$/.test(customer.postalCode) ||
    (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))
  )
    throw new Error('กรุณาตรวจสอบข้อมูลลูกค้าให้ถูกต้อง');
  const items = product.sizes
    .map(({ name }) => ({ size: name, quantity: Number(body[`quantity_${name}`] || 0) }))
    .filter((item) => item.quantity > 0);
  return { customer, items, note: text('note', 500) };
}
exports.editPage = async (req, res, next) => {
  try {
    const order = await orderService.findById(req.params.id);
    if (!order) return res.sendStatus(404);
    res.render('admin/order-edit', {
      title: `แก้ไข ${order.orderNumber}`,
      order,
      product,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
exports.edit = async (req, res, next) => {
  try {
    const order = await orderService.updateOrder(
      req.params.id,
      editInput(req.body),
      req.admin.username,
    );
    if (!order) return res.sendStatus(404);
    res.redirect(`/admin/orders/${order.id}?updated=order`);
  } catch (error) {
    if (error.message.includes('ไม่ถูกต้อง') || error.message.includes('เกิน')) {
      const order = await orderService.findById(req.params.id);
      if (!order) return res.sendStatus(404);
      return res.status(422).render('admin/order-edit', {
        title: `แก้ไข ${order.orderNumber}`,
        order,
        product,
        error: error.message,
      });
    }
    next(error);
  }
};
exports.remove = async (req, res, next) => {
  try {
    const order = await orderService.deleteOrder(req.params.id);
    if (!order) return res.sendStatus(404);
    console.info(`[Admin order] ${req.admin.username} deleted ${order.orderNumber}`);
    res.redirect('/admin?deleted=1');
  } catch (error) {
    next(error);
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
exports._assertAdminAuthConfigured = assertAdminAuthConfigured;
exports._buildSummary = buildSummary;
