require('dotenv').config();
const express      = require('express');
const session      = require('express-session');
const flash        = require('connect-flash');
const methodOverride = require('method-override');
const path         = require('path');

const app = express();

// ─── View Engine ───────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'shopsathi_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));
app.use(flash());

// ─── Global template locals ────────────────────────────────────
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  res.locals.info    = req.flash('info');
  res.locals.path    = req.path;
  next();
});

// ─── Routes ────────────────────────────────────────────────────
app.use('/auth',       require('./routes/auth'));
app.use('/dashboard',  require('./routes/dashboard'));
app.use('/billing',    require('./routes/billing'));
app.use('/inventory',  require('./routes/inventory'));
app.use('/customers',  require('./routes/customers'));
app.use('/credits',    require('./routes/credits'));
app.use('/expenses',   require('./routes/expenses'));
app.use('/reports',    require('./routes/reports'));
app.use('/closing',    require('./routes/closing'));
app.use('/settings',   require('./routes/settings'));
app.use('/api',        require('./routes/api'));

// Root → dashboard or login
app.get('/', (req, res) => {
  if (req.session?.accessToken) return res.redirect('/dashboard');
  res.redirect('/auth/login');
});

// 404
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/error', { title: 'Server Error', message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0",() => {
  console.log(`\n🛒 ShopSathi running at http://localhost:${PORT}\n`);
});
