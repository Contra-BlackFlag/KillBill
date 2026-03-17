// routes/reports.js
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const today = new Date();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const y = today.getFullYear();
  const month = req.query.month || `${y}-${m}`;
  const start = month + '-01';
  const end   = new Date(new Date(start).setMonth(new Date(start).getMonth() + 1)).toISOString().split('T')[0];

  const [bills, expenses, products] = await Promise.all([
    req.supabase.from('bills').select('total, payment_mode, created_at, gst_amount, discount, subtotal')
      .eq('user_id', req.user.id).gte('created_at', start).lt('created_at', end),
    req.supabase.from('expenses').select('amount, category, expense_date')
      .eq('user_id', req.user.id).gte('expense_date', start).lt('expense_date', end),
    req.supabase.from('products').select('id, name, selling_price, purchase_price')
      .eq('user_id', req.user.id)
  ]);

  const bData = bills.data || [];
  const eData = expenses.data || [];

  const totalSales  = bData.reduce((s, b) => s + parseFloat(b.total || 0), 0);
  const totalExp    = eData.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalGST    = bData.reduce((s, b) => s + parseFloat(b.gst_amount || 0), 0);
  const totalDisc   = bData.reduce((s, b) => s + parseFloat(b.discount || 0), 0);
  const netProfit   = totalSales - totalExp;

  // Daily sales map
  const daysInMonth = new Date(y, parseInt(m), 0).getDate();
  const dailyLabels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
  const dailyData   = dailyLabels.map(d => {
    const key = `${month}-${d}`;
    return bData.filter(b => b.created_at.startsWith(key)).reduce((s, b) => s + parseFloat(b.total || 0), 0);
  });

  // Payment modes
  const modes = { cash: 0, upi: 0, card: 0, credit: 0 };
  bData.forEach(b => { modes[b.payment_mode] = (modes[b.payment_mode] || 0) + parseFloat(b.total || 0); });

  // Expense by category
  const expCats = {};
  eData.forEach(e => { expCats[e.category] = (expCats[e.category] || 0) + parseFloat(e.amount || 0); });

  res.render('pages/reports', {
    title: 'Reports — ShopSathi', month,
    totalSales, totalExp, totalGST, totalDisc, netProfit,
    billCount: bData.length,
    dailyLabels: JSON.stringify(dailyLabels),
    dailyData: JSON.stringify(dailyData),
    modesLabels: JSON.stringify(Object.keys(modes).map(k => k.toUpperCase())),
    modesData: JSON.stringify(Object.values(modes)),
    expCatLabels: JSON.stringify(Object.keys(expCats)),
    expCatData: JSON.stringify(Object.values(expCats)),
    margin: totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0'
  });
});

module.exports = router;
