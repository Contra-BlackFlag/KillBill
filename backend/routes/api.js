const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

// GET /api/products/search?q=
router.get('/products/search', requireAuth, async (req, res) => {
  const q = req.query.q || '';
  const { data, error } = await req.supabase
    .from('products')
    .select('id,name,selling_price,purchase_price,quantity,unit,gst_rate,barcode,category')
    .eq('user_id', req.user.id)
    .gt('quantity', 0)
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(20);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// GET /api/customers
router.get('/customers', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('customers')
    .select('id,name,phone,total_credit')
    .eq('user_id', req.user.id)
    .order('name');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// GET /api/notifications
router.get('/notifications', requireAuth, async (req, res) => {
  const { data } = await req.supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(30);
  res.json(data || []);
});

// POST /api/notifications/:id/read
router.post('/notifications/:id/read', requireAuth, async (req, res) => {
  await req.supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id);
  res.json({ ok: true });
});

// POST /api/notifications/read-all
router.post('/notifications/read-all', requireAuth, async (req, res) => {
  await req.supabase.from('notifications').update({ is_read: true })
    .eq('user_id', req.user.id).eq('is_read', false);
  res.json({ ok: true });
});

// GET /api/low-stock-count
router.get('/low-stock-count', requireAuth, async (req, res) => {
  const { data } = await req.supabase
    .from('products')
    .select('id,quantity,low_stock_alert')
    .eq('user_id', req.user.id);
  const count = (data || []).filter(p => p.quantity <= p.low_stock_alert).length;
  res.json({ count });
});

module.exports = router;
