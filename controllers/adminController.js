const adminRepository = require('../repositories/adminRepository');
const creatorRepository = require('../repositories/creatorRepository');
const userRepository = require('../repositories/userRepository');
const reviewRepository = require('../repositories/reviewRepository');

// Fixed messages: the URL only selects a key, so user text is never echoed back
const MESSAGES = {
  approved: 'Creator approved. Their profile is now public.',
  revoked: 'Creator approval removed. Their profile is no longer public.',
  blocked: 'User blocked. They are logged out on their next request.',
  unblocked: 'User unblocked.',
  hidden: 'Review hidden. It no longer counts toward ratings.',
  shown: 'Review is visible again.',
};
const WARNINGS = {
  unchanged: 'Nothing changed: not found, already in that state, or not allowed (admin accounts cannot be blocked).',
};

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function showDashboard(req, res) {
  try {
    const [stats, creators, users, reviews] = await Promise.all([
      adminRepository.getStats(),
      creatorRepository.listForAdmin(100),
      userRepository.listAll(100),
      reviewRepository.listForAdmin(50),
    ]);

    const key = typeof req.query.status === 'string' ? req.query.status : '';
    const success = Object.hasOwn(MESSAGES, key) ? MESSAGES[key] : null;
    const warning = Object.hasOwn(WARNINGS, key) ? WARNINGS[key] : null;

    res.render('admin', { title: 'Admin panel', stats, creators, users, reviews, success, warning });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading the admin panel.');
  }
}

// Builds one POST handler: validate id -> run the change -> redirect with a message
function action(change, okKey) {
  return async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).render('404', { title: 'Page not found' });

    try {
      const changed = await change(id);
      res.redirect(`/admin?status=${changed ? okKey : 'unchanged'}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Something went wrong. Please try again.');
    }
  };
}

module.exports = {
  showDashboard,
  approveCreator: action((id) => creatorRepository.setApproved(id, true), 'approved'),
  revokeCreator: action((id) => creatorRepository.setApproved(id, false), 'revoked'),
  blockUser: action((id) => userRepository.setActive(id, false), 'blocked'),
  unblockUser: action((id) => userRepository.setActive(id, true), 'unblocked'),
  hideReview: action((id) => reviewRepository.setVisible(id, false), 'hidden'),
  showReview: action((id) => reviewRepository.setVisible(id, true), 'shown'),
};