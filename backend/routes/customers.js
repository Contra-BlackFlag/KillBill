// routes/customers.js
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { data } = await req.supabase.from('customers').select('*').eq('user_id', req.user.id).order('name');
  res.render('pages/customers', { title: 'Customers — ShopSathi', customers: data || [] });
});

router.post('/', requireAuth, async (req, res) => {
  const { name, phone, address } = req.body;
  if (!name?.trim()) { req.flash('error', 'Name required.'); return res.redirect('/customers'); }
  const { error } = await req.supabase.from('customers').insert({ user_id: req.user.id, name: name.trim(), phone: phone?.trim() || null, address: address?.trim() || null });
  if (error) req.flash('error', error.message); else req.flash('success', 'Customer added.');
  res.redirect('/customers');
});

router.get('/:id', requireAuth, async (req, res) => {
  const [{ data: cust }, { data: bills }] = await Promise.all([
    req.supabase.from('customers').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single(),
    req.supabase.from('bills').select('*').eq('customer_id', req.params.id).eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(30)
  ]);
  if (!cust) { req.flash('error', 'Customer not found.'); return res.redirect('/customers'); }
  res.render('pages/customer-detail', { title: cust.name, customer: cust, bills: bills || [] });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, phone, address } = req.body;
  const { error } = await req.supabase.from('customers').update({ name: name?.trim(), phone: phone?.trim() || null, address: address?.trim() || null }).eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) req.flash('error', error.message); else req.flash('success', 'Customer updated.');
  res.redirect('/customers');
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await req.supabase.from('customers').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) req.flash('error', error.message); else req.flash('success', 'Customer deleted.');
  res.redirect('/customers');
});

module.exports = router;
