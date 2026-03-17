const express = require('express');
const router  = express.Router();
const { supabase } = require('../config/supabase');
const { redirectIfAuth } = require('../middleware/auth');

// GET /auth/login
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('pages/login', { title: 'Sign In — ShopSathi', tab: 'login' });
});

// GET /auth/register
router.get('/register', redirectIfAuth, (req, res) => {
  res.render('pages/login', { title: 'Register — ShopSathi', tab: 'register' });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error', 'Email and password are required.');
    return res.redirect('/auth/login');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    req.flash('error', error.message);
    return res.redirect('/auth/login');
  }
  req.session.accessToken  = data.session.access_token;
  req.session.refreshToken = data.session.refresh_token;
  req.session.userId       = data.user.id;
  res.redirect('/dashboard');
});

// POST /auth/register
router.post('/register', async (req, res) => {
  const { shop_name, owner_name, email, password } = req.body;
  if (!shop_name || !email || !password) {
    req.flash('error', 'Shop name, email, and password are required.');
    return res.redirect('/auth/register');
  }
  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters.');
    return res.redirect('/auth/register');
  }
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { shop_name, owner_name } }
  });
  if (error) {
    req.flash('error', error.message);
    return res.redirect('/auth/register');
  }
  if (data.session) {
    req.session.accessToken  = data.session.access_token;
    req.session.refreshToken = data.session.refresh_token;
    req.session.userId       = data.user.id;
    req.flash('success', `Welcome to ShopSathi, ${shop_name}! 🎉`);
    return res.redirect('/dashboard');
  }
  req.flash('info', 'Account created! Please check your email to confirm, then sign in.');
  res.redirect('/auth/login');
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
});

module.exports = router;
