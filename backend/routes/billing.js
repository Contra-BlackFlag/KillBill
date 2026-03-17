const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

// GET /billing — new bill form
router.get('/', requireAuth, async (req, res) => {
  const [products, customers] = await Promise.all([
    req.supabase.from('products').select('id,name,selling_price,purchase_price,quantity,unit,gst_rate,barcode')
      .eq('user_id', req.user.id).gt('quantity', 0).order('name'),
    req.supabase.from('customers').select('id,name,phone,total_credit').eq('user_id', req.user.id).order('name')
  ]);
  res.render('pages/billing', {
    title: 'New Bill — ShopSathi',
    products: products.data || [],
    customers: customers.data || []
  });
});

// GET /billing/history — past bills
router.get('/history', requireAuth, async (req, res) => {
  const page  = parseInt(req.query.page) || 1;
  const limit = 20;
  const from  = (page - 1) * limit;
  const { data: bills, count } = await req.supabase
    .from('bills').select('*, bill_items(product_name, quantity, unit_price, total)', { count: 'exact' })
    .eq('user_id', req.user.id).order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  res.render('pages/billing-history', {
    title: 'Bill History — ShopSathi',
    bills: bills || [],
    page, totalPages: Math.ceil((count || 0) / limit)
  });
});

// GET /billing/:id — view single bill
router.get('/:id', requireAuth, async (req, res) => {
  const { data: bill } = await req.supabase.from('bills')
    .select('*, bill_items(*), customers(name,phone,address)')
    .eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!bill) { req.flash('error', 'Bill not found.'); return res.redirect('/billing/history'); }
  res.render('pages/bill-view', { title: `Bill ${bill.bill_number}`, bill, profile: req.profile });
});

// POST /billing — create bill
router.post('/', requireAuth, async (req, res) => {
  try {
    const { customer_id, payment_mode, discount, notes, items } = req.body;
    // items is JSON string from the frontend
    const billItems = JSON.parse(items || '[]');
    if (!billItems.length) {
      req.flash('error', 'Add at least one item.');
      return res.redirect('/billing');
    }
    const subtotal = billItems.reduce((s, i) => s + (parseFloat(i.unit_price) * parseInt(i.quantity)), 0);
    const gstAmt   = billItems.reduce((s, i) => s + (parseFloat(i.unit_price) * parseInt(i.quantity) * (parseFloat(i.gst_rate || 0) / 100)), 0);
    const disc     = parseFloat(discount) || 0;
    const total    = Math.max(0, subtotal + gstAmt - disc);
    const billNum  = 'BILL-' + Date.now().toString(36).toUpperCase();
    const custName = customer_id
      ? ((await req.supabase.from('customers').select('name').eq('id', customer_id).single()).data?.name || 'Customer')
      : 'Walk-in';

    const { data: bill, error: billError } = await req.supabase.from('bills').insert({
      user_id: req.user.id,
      customer_id: customer_id || null,
      customer_name: custName,
      bill_number: billNum,
      subtotal, discount: disc, gst_amount: gstAmt, total,
      payment_mode: payment_mode || 'cash',
      payment_status: payment_mode === 'credit' ? 'pending' : 'paid',
      notes: notes?.trim() || null
    }).select().single();

    if (billError) throw billError;

    // Insert items
    await req.supabase.from('bill_items').insert(
      billItems.map(i => ({
        bill_id: bill.id,
        product_id: i.product_id || null,
        product_name: i.product_name,
        quantity: parseInt(i.quantity),
        unit_price: parseFloat(i.unit_price),
        gst_rate: parseFloat(i.gst_rate || 0),
        total: parseFloat(i.unit_price) * parseInt(i.quantity) * (1 + parseFloat(i.gst_rate || 0) / 100)
      }))
    );

    // Credit record
    if (payment_mode === 'credit' && customer_id) {
      await req.supabase.from('credits').insert({
        user_id: req.user.id, customer_id, bill_id: bill.id, amount: total,
        due_date: new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0]
      });
    }

    req.flash('success', `Bill ${billNum} created! Total: ₹${total.toFixed(2)}`);
    res.redirect(`/billing/${bill.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', err.message || 'Failed to create bill.');
    res.redirect('/billing');
  }
});

module.exports = router;
