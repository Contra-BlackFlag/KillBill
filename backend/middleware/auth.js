const { getUserClient } = require('../config/supabase');

async function requireAuth(req, res, next) {
  const accessToken = req.session?.accessToken;
  if (!accessToken) {
    req.flash('error', 'Please sign in to continue.');
    return res.redirect('/auth/login');
  }
  try {
    const client = getUserClient(accessToken);
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) {
      req.session.destroy();
      req.flash('error', 'Session expired. Please sign in again.');
      return res.redirect('/auth/login');
    }
    // Fetch profile
    const { data: profile } = await client.from('profiles').select('*').eq('id', user.id).single();
    req.user = user;
    req.profile = profile || {};
    req.supabase = client;
    res.locals.user = user;
    res.locals.profile = profile || {};
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.redirect('/auth/login');
  }
}

function redirectIfAuth(req, res, next) {
  if (req.session?.accessToken) return res.redirect('/dashboard');
  next();
}

module.exports = { requireAuth, redirectIfAuth };
