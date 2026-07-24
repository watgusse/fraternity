require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const methodOverride = require('method-override');
const csrf = require('./middleware/csrf');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const formatCurrency = require('./utils/formatCurrency');
const formatDate = require('./utils/formatDate');
function createApp() {
  const app = express();
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
        },
      },
    }),
  );
  app.use(
    express.static(path.join(__dirname, 'public'), {
      maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser(process.env.COOKIE_SECRET || 'development-only-cookie-secret'));
  app.use(methodOverride('_method'));
  app.use((req, res, next) => {
    res.locals.formatCurrency = formatCurrency;
    res.locals.formatDate = formatDate;
    res.locals.currentPath = req.path;
    next();
  });
  app.use((req, res, next) =>
    req.method === 'POST' && req.path === '/order' ? next() : csrf(req, res, next),
  );
  app.use((req, res, next) => {
    if (typeof req.csrfToken === 'function') res.locals.csrfToken = req.csrfToken();
    next();
  });
  app.use('/', require('./routes/publicRoutes'));
  app.use(
    '/',
    rateLimit({
      windowMs: 10 * 60 * 1000,
      limit: 40,
      skip: (req) => req.method !== 'POST' || req.path !== '/order',
    }),
    require('./routes/orderRoutes'),
  );
  app.use('/admin', require('./routes/adminRoutes'));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
const app = createApp();
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Fraternity Order running at http://localhost:${port}`));
}
module.exports = { app, createApp };
