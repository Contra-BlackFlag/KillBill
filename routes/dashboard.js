const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const db = req.supabase;
    const uid = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 8) + '01';

    const [todayBills, monthBills, todayExp, pendingCredits, products] = await Promise.all([
      db.from('bills').select('total, payment_mode').eq('user_id', uid)
        .gte('created_at', today + 'T00:00:00').lte('created_at', today + 'T23:59:59'),
      db.from('bills').select('total, created_at, payment_mode').eq('user_id', uid)
        .gte('created_at', monthStart),
      db.from('expenses').select('amount').eq('user_id', uid).eq('expense_date', today),
      db.from('credits').select('amount, paid_amount, status, customers(name, phone)')
        .eq('user_id', uid).neq('status', 'paid').order('created_at', { ascending: false }).limit(5),
      db.from('products').select('id, name, quantity, low_stock_alert, unit').eq('user_id', uid)
    ]);

    const todaySales   = sum(todayBills.data, 'total');
    const todayExpSum  = sum(todayExp.data, 'amount');
    const monthSales   = sum(monthBills.data, 'total');
    const pendingAmt   = (pendingCredits.data || []).reduce((s, c) =>
      s + (parseFloat(c.amount) - parseFloat(c.paid_amount || 0)), 0);
    const lowStock     = (products.data || []).filter(p => p.quantity <= p.low_stock_alert);

    // Payment modes today
    const modes = { cash: 0, upi: 0, card: 0, credit: 0 };
    (todayBills.data || []).forEach(b => {
      modes[b.payment_mode] = (modes[b.payment_mode] || 0) + parseFloat(b.total || 0);
    });

    // Last 7 days sales
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      last7.push(d.toISOString().split('T')[0]);
    }
    const dailyMap = {};
    last7.forEach(d => { dailyMap[d] = 0; });
    (monthBills.data || []).forEach(b => {
      const d = b.created_at.split('T')[0];
      if (dailyMap[d] !== undefined) dailyMap[d] += parseFloat(b.total || 0);
    });

    res.render('pages/dashboard', {
      title: 'Dashboard — ShopSathi',
      todaySales, todayExpSum, monthSales, pendingAmt,
      todayBillCount: (todayBills.data || []).length,
      monthBillCount: (monthBills.data || []).length,
      lowStock,
      pendingCredits: pendingCredits.data || [],
      modes,
      last7Labels: last7.map(d => {
        const dt = new Date(d);
        return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      }),
      last7Data: last7.map(d => dailyMap[d] || 0),
      modesLabels: JSON.stringify(Object.keys(modes).map(k => k.toUpperCase())),
      modesData: JSON.stringify(Object.values(modes))
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load dashboard.');
    res.render('pages/dashboard', { title: 'Dashboard', error: err.message });
  }
});

function sum(arr, field) {
  return (arr || []).reduce((s, r) => s + parseFloat(r[field] || 0), 0);
}

module.exports = router;
