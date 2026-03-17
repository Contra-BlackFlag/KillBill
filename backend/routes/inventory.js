const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

// GET /inventory
router.get('/', requireAuth, async (req, res) => {
  const { data: products, error } = await req.supabase
    .from('products').select('*').eq('user_id', req.user.id).order('name');
  if (error) req.flash('error', error.message);
  res.render('pages/inventory', {
    title: 'Inventory — ShopSathi',
    products: products || [],
    query: req.query.q || ''
  });
});

// POST /inventory — create
router.post('/', requireAuth, async (req, res) => {
  const { name, category, purchase_price, selling_price, quantity, low_stock_alert, unit, barcode, gst_rate } = req.body;
  if (!name) { req.flash('error', 'Product name is required.'); return res.redirect('/inventory'); }
  const { error } = await req.supabase.from('products').insert({
    user_id: req.user.id,
    name: name.trim(), category: category?.trim() || null,
    purchase_price: parseFloat(purchase_price) || 0,
    selling_price: parseFloat(selling_price) || 0,
    quantity: parseInt(quantity) || 0,
    low_stock_alert: parseInt(low_stock_alert) || 5,
    unit: unit || 'pcs',
    barcode: barcode?.trim() || null,
    gst_rate: parseFloat(gst_rate) || 0
  });
  if (error) { req.flash('error', error.message); } else { req.flash('success', 'Product added!'); }
  res.redirect('/inventory');
});

// GET /inventory/:id/edit
router.get('/:id/edit', requireAuth, async (req, res) => {
  const { data: product } = await req.supabase.from('products').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!product) { req.flash('error', 'Product not found.'); return res.redirect('/inventory'); }
  res.render('pages/inventory-edit', { title: 'Edit Product', product });
});

// PUT /inventory/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { name, category, purchase_price, selling_price, quantity, low_stock_alert, unit, barcode, gst_rate } = req.body;
  const { error } = await req.supabase.from('products').update({
    name: name?.trim(), category: category?.trim() || null,
    purchase_price: parseFloat(purchase_price) || 0,
    selling_price: parseFloat(selling_price) || 0,
    quantity: parseInt(quantity) || 0,
    low_stock_alert: parseInt(low_stock_alert) || 5,
    unit: unit || 'pcs',
    barcode: barcode?.trim() || null,
    gst_rate: parseFloat(gst_rate) || 0,
    updated_at: new Date().toISOString()
  }).eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) { req.flash('error', error.message); } else { req.flash('success', 'Product updated!'); }
  res.redirect('/inventory');
});

// POST /inventory/:id/restock
router.post('/:id/restock', requireAuth, async (req, res) => {
  const qty = parseInt(req.body.qty) || 0;
  if (qty <= 0) { req.flash('error', 'Enter a valid quantity.'); return res.redirect('/inventory'); }
  const { data: p } = await req.supabase.from('products').select('quantity').eq('id', req.params.id).single();
  const update = { quantity: (p?.quantity || 0) + qty, updated_at: new Date().toISOString() };
  if (req.body.purchase_price) update.purchase_price = parseFloat(req.body.purchase_price);
  const { error } = await req.supabase.from('products').update(update).eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) { req.flash('error', error.message); } else { req.flash('success', `Restocked ${qty} units.`); }
  res.redirect('/inventory');
});

// DELETE /inventory/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await req.supabase.from('products').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) { req.flash('error', error.message); } else { req.flash('success', 'Product deleted.'); }
  res.redirect('/inventory');
});

module.exports = router;
