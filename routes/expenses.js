const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

const CATEGORIES = ['Rent','Electricity','Salary','Purchase','Transport','Marketing','Maintenance','Other'];

router.get('/', requireAuth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const start = month + '-01';
  const end   = new Date(new Date(start).setMonth(new Date(start).getMonth() + 1)).toISOString().split('T')[0];
  const { data: expenses } = await req.supabase.from('expenses')
    .select('*').eq('user_id', req.user.id)
    .gte('expense_date', start).lt('expense_date', end)
    .order('expense_date', { ascending: false });
  const total = (expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const byCategory = CATEGORIES.map(c => ({
    cat: c,
    total: (expenses || []).filter(e => e.category === c).reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  })).filter(x => x.total > 0);
  res.render('pages/expenses', {
    title: 'Expenses — ShopSathi',
    expenses: expenses || [], total, byCategory, month,
    categories: CATEGORIES,
    catLabels: JSON.stringify(byCategory.map(x => x.cat)),
    catData: JSON.stringify(byCategory.map(x => x.total))
  });
});

router.post('/', requireAuth, async (req, res) => {
  const { category, amount, expense_date, payment_mode, description } = req.body;
  if (!amount || !category) { req.flash('error', 'Category and amount required.'); return res.redirect('/expenses'); }
  const { error } = await req.supabase.from('expenses').insert({
    user_id: req.user.id, category,
    amount: parseFloat(amount),
    expense_date: expense_date || new Date().toISOString().split('T')[0],
    payment_mode: payment_mode || 'cash',
    description: description?.trim() || null
  });
  if (error) req.flash('error', error.message); else req.flash('success', 'Expense added.');
  res.redirect('/expenses');
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await req.supabase.from('expenses').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) req.flash('error', error.message); else req.flash('success', 'Expense deleted.');
  res.redirect('/expenses');
});

module.exports = router;
