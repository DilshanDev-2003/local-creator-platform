function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Usage later: router.get('/admin', requireRole('admin'), handler)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).send('403 - You do not have permission to view this page.');
    }
    next();
  };
}

// Stops logged-in users from seeing the login/register pages again
function redirectIfLoggedIn(req, res, next) {
  if (req.session.user) return res.redirect('/');
  next();
}

module.exports = { requireLogin, requireRole, redirectIfLoggedIn };