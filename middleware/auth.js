const jwt = require('jsonwebtoken');
const COOKIE = 'frt_admin';
function requireAdmin(req, res, next) {
  try {
    req.admin = jwt.verify(req.cookies[COOKIE], process.env.ADMIN_JWT_SECRET, {
      issuer: 'fraternity-order',
    });
    return next();
  } catch {
    return res.redirect('/admin/login');
  }
}
function issueAdmin(res, user) {
  const token = jwt.sign(
    { username: user.username, role: user.role || 'admin' },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: '8h', issuer: 'fraternity-order' },
  );
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}
function logout(res) {
  res.clearCookie(COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}
module.exports = { requireAdmin, issueAdmin, logout, COOKIE };
