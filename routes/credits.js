const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const status = req.query.status || 'all';
  let query = req.supabase.from('credits')
    .select('*, customers(name, phone)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (status !== 'all') query = query.eq('status', status);
  const { data: credits } = await query;
  const { data: customers } = await req.supabase.from('customers').select('id,name,phone').eq('user_id', req.user.id).order('name');
  const totalPending = (credits || [])
    .filter(c => c.status !== 'paid')
    .reduce((s, c) => s + parseFloat(c.amount) - parseFloat(c.paid_amount || 0), 0);
  res.render('pages/credits', { title: 'Udhar / Credit — ShopSathi', credits: credits || [], customers: customers || [], statusFilter: status, totalPending });
});

router.post('/', requireAuth, async (req, res) => {
  const { customer_id, amount, due_date, notes } = req.body;
  if (!customer_id || !amount) { req.flash('error', 'Customer and amount required.'); return res.redirect('/credits'); }
  const { error } = await req.supabase.from('credits').insert({
    user_id: req.user.id, customer_id, amount: parseFloat(amount),
    due_date: due_date || null, notes: notes?.trim() || null
  });
  if (error) req.flash('error', error.message); else req.flash('success', 'Credit recorded.');
  res.redirect('/credits');
});

// Collect payment
router.post('/:id/pay', requireAuth, async (req, res) => {
  const { amount, payment_mode } = req.body;
  if (!amount || parseFloat(amount) <= 0) { req.flash('error', 'Enter a valid amount.'); return res.redirect('/credits'); }
  const { error } = await req.supabase.from('credit_payments').insert({
    credit_id: req.params.id,
    amount: parseFloat(amount),
    payment_mode: payment_mode || 'cash'
  });
  if (error) req.flash('error', error.message); else req.flash('success', `Payment of ₹${amount} collected!`);
  res.redirect('/credits');
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await req.supabase.from('credits').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) req.flash('error', error.message); else req.flash('success', 'Credit deleted.');
  res.redirect('/credits');
});

module.exports = router;
