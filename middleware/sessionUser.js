const userRepository = require('../repositories/userRepository');

// On every request from a logged-in user, re-read the account from the database:
//  - a blocked or deleted user is logged out immediately
//  - a changed role (e.g. promoted to admin) takes effect without logging in again
async function refreshSessionUser(req, res, next) {
  const sessionUser = req.session && req.session.user;
  if (!sessionUser) return next();

  try {
    const user = await userRepository.findById(sessionUser.id);
    if (!user || !user.is_active) {
      delete req.session.user; // continue as a guest; protected pages redirect to /login
      return next();
    }
    req.session.user = { id: user.id, name: user.name, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { refreshSessionUser };