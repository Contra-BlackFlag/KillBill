# 🛒 ShopSathi — Full-Stack (Express + EJS + Supabase)

A production-ready shop management system with a proper **separate frontend and backend** architecture.

---

## 📁 Project Structure

```
shopsathi-fullstack/
├── supabase_schema.sql          ← Run once in Supabase SQL Editor
└── backend/
    ├── server.js                ← Express entry point
    ├── .env.example             ← Copy to .env and fill in
    ├── package.json
    ├── config/
    │   └── supabase.js          ← Supabase client factory
    ├── middleware/
    │   └── auth.js              ← Session-based auth guard
    ├── routes/
    │   ├── auth.js              ← Login / Register / Logout
    │   ├── dashboard.js
    │   ├── billing.js           ← New bill + Bill history
    │   ├── inventory.js         ← CRUD + Restock
    │   ├── customers.js         ← CRUD + purchase history
    │   ├── credits.js           ← Udhar + payment collection
    │   ├── expenses.js          ← CRUD + monthly filter
    │   ├── reports.js           ← Monthly analytics
    │   ├── closing.js           ← Daily closing + cash mismatch
    │   ├── settings.js          ← Shop profile
    │   └── api.js               ← JSON endpoints (search, notifs)
    ├── views/
    │   ├── partials/
    │   │   ├── head.ejs         ← <head>, fonts, CDN scripts
    │   │   ├── sidebar.ejs      ← Nav sidebar
    │   │   ├── topbar.ejs       ← Header + flash messages
    │   │   └── footer.ejs       ← </body> + shared JS init
    │   └── pages/
    │       ├── login.ejs        ← Sign in / Register
    │       ├── dashboard.ejs
    │       ├── billing.ejs      ← Interactive bill builder
    │       ├── bill-view.ejs    ← Printable bill receipt
    │       ├── billing-history.ejs
    │       ├── inventory.ejs    ← Table + inline modals
    │       ├── inventory-edit.ejs
    │       ├── customers.ejs
    │       ├── customer-detail.ejs
    │       ├── credits.ejs
    │       ├── expenses.ejs
    │       ├── reports.ejs
    │       ├── closing.ejs
    │       ├── settings.ejs
    │       ├── 404.ejs
    │       └── error.ejs
    └── public/
        ├── css/
        │   └── main.css         ← Complete design system (dark theme)
        └── js/
            └── app.js           ← Sidebar, notifications, helpers
```

---

## 🚀 Setup in 5 Steps

### Step 1 — Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up (free tier is enough)
2. Create a new project; note your **Project URL** and **anon key**
   (Settings → API)

### Step 2 — Run the Database Schema
1. In Supabase dashboard → **SQL Editor**
2. Open `supabase_schema.sql`, paste everything, click **Run**
3. You'll see: all 10 tables created, RLS policies set, triggers installed

### Step 3 — Configure the Backend
```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
SESSION_SECRET=replace_with_a_long_random_string
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
NODE_ENV=development
```

### Step 4 — Install & Run
```bash
cd backend
npm install
npm run dev     # development (nodemon)
# or
npm start       # production
```

### Step 5 — Open the App
Visit **http://localhost:3000** → Register your shop → Start managing!

---

## ✅ All Features

| Module | What it does |
|---|---|
| 🔐 Auth | Supabase email/password, session cookies, auto profile |
| 📦 Inventory | Add / edit / delete products, stock tracking, low-stock alerts, restock modal |
| 🧾 Billing | Live product search, multi-item cart, GST + discount, 4 payment modes, printable receipt |
| 📜 Bill History | Paginated list, individual bill view |
| 👥 Customers | Register customers, purchase history per customer |
| 💳 Udhar / Credit | Record credit, track due dates, overdue highlights, collect partial/full payments |
| 💸 Expenses | Monthly expense tracking, category breakdown pie chart |
| 📊 Reports | Daily sales line chart, expense category doughnut, payment mode breakdown |
| 🌙 Daily Closing | One-click shop close, cash mismatch detection, net profit summary |
| 🔔 Notifications | Low stock + credit due notifications with badge |
| ⚙️ Settings | Shop profile, GST number, owner details |

---

## 🔒 Security

- **Row-Level Security** on every Supabase table — users only access their own data
- **Session-based auth** via `express-session` (7-day cookie, httpOnly, secure in production)
- **CSRF protection** via same-origin form submissions (no external requests needed)
- **Method override** for PUT/DELETE from HTML forms
- **Input trimming** on all server routes before DB writes

---

## 🌐 Deploying to Production

### Option A — Railway / Render / Fly.io
1. Push `backend/` to a Git repo
2. Set environment variables in the platform dashboard
3. Set `NODE_ENV=production`

### Option B — VPS (Ubuntu)
```bash
npm install -g pm2
pm2 start server.js --name shopsathi
pm2 save && pm2 startup
```

Put Nginx in front as a reverse proxy on port 80/443.

---

## 📱 SMS Reminders (Optional)
To send SMS reminders for overdue credits, use the `/api` route or a Supabase
Edge Function that calls [Fast2SMS](https://fast2sms.com) or [Twilio](https://twilio.com):

```js
// Query overdue credits
const { data } = await supabase
  .from('credits')
  .select('*, customers(name, phone)')
  .eq('status', 'pending')
  .lte('due_date', new Date().toISOString().split('T')[0]);

// For each, call Fast2SMS API with customer.phone
```
