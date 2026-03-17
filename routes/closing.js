const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const [bills, expenses, existing] = await Promise.all([
    req.supabase.from('bills').select('total, payment_mode').eq('user_id', req.user.id)
      .gte('created_at', today + 'T00:00:00').lte('created_at', today + 'T23:59:59'),
    req.supabase.from('expenses').select('amount').eq('user_id', req.user.id).eq('expense_date', today),
    req.supabase.from('daily_closings').select('*').eq('user_id', req.user.id).eq('closing_date', today).single()
  ]);

  const bData = bills.data || [];
  const eData = expenses.data || [];
  const cash   = bData.filter(b => b.payment_mode === 'cash').reduce((s, b) => s + parseFloat(b.total || 0), 0);
  const upi    = bData.filter(b => b.payment_mode === 'upi').reduce((s, b) => s + parseFloat(b.total || 0), 0);
  const card   = bData.filter(b => b.payment_mode === 'card').reduce((s, b) => s + parseFloat(b.total || 0), 0);
  const credit = bData.filter(b => b.payment_mode === 'credit').reduce((s, b) => s + parseFloat(b.total || 0), 0);
  const totalSales = cash + upi + card + credit;
  const totalExp   = eData.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const netProfit  = totalSales - totalExp;

  res.render('pages/closing', {
    title: 'Daily Closing — ShopSathi',
    today, cash, upi, card, credit, totalSales, totalExp, netProfit,
    billCount: bData.length,
    existing: existing.data || null
  });
});

router.post('/', requireAuth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const { actual_cash, notes, cash, upi, card, credit, total_sales, total_exp, net_profit } = req.body;
  const mismatch = parseFloat(actual_cash || 0) - parseFloat(cash || 0);
  const { error } = await req.supabase.from('daily_closings').upsert({
    user_id: req.user.id, closing_date: today,
    total_sales_cash: parseFloat(cash || 0),
    total_sales_upi: parseFloat(upi || 0),
    total_sales_card: parseFloat(card || 0),
    total_sales_credit: parseFloat(credit || 0),
    total_sales: parseFloat(total_sales || 0),
    total_expenses: parseFloat(total_exp || 0),
    net_profit: parseFloat(net_profit || 0),
    expected_cash: parseFloat(cash || 0),
    actual_cash: parseFloat(actual_cash || 0),
    cash_mismatch: mismatch,
    notes: notes?.trim() || null
  }, { onConflict: 'user_id,closing_date' });

  if (error) {
    req.flash('error', error.message);
  } else {
    req.flash('success', `Shop closed! Net profit: ₹${parseFloat(net_profit || 0).toFixed(2)} 🌙`);
    if (mismatch !== 0) req.flash('info', `Cash mismatch detected: ₹${Math.abs(mismatch).toFixed(2)} ${mismatch > 0 ? 'extra' : 'short'}`);
  }
  res.redirect('/closing');
});

module.exports = router;
