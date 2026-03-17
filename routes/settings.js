const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => {
  res.render('pages/settings', { title: 'Settings — ShopSathi' });
});

router.post('/', requireAuth, async (req, res) => {
  const { shop_name, owner_name, phone, address, gst_number } = req.body;
  const { error } = await req.supabase.from('profiles').update({
    shop_name: shop_name?.trim() || 'My Shop',
    owner_name: owner_name?.trim() || null,
    phone: phone?.trim() || null,
    address: address?.trim() || null,
    gst_number: gst_number?.trim() || null
  }).eq('id', req.user.id);
  if (error) req.flash('error', error.message);
  else req.flash('success', 'Settings saved!');
  res.redirect('/settings');
});

module.exports = router;
