const { validationResult } = require('express-validator');
const reviewRepository = require('../repositories/reviewRepository');

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /reviews
async function create(req, res) {
  const commissionId = parseId(req.body.commissionId);
  if (!commissionId) return res.status(404).render('404', { title: 'Page not found' });

  if (!validationResult(req).isEmpty()) {
    return res.redirect('/my-commissions?status=invalid_review');
  }

  try {
    const saved = await reviewRepository.create({
      commissionId,
      clientId: req.session.user.id, // from the session, never from the form
      rating: Number.parseInt(req.body.rating, 10),
      comment: req.body.comment || null,
    });
    // Same answer for "not yours", "not completed" and "does not exist"
    res.redirect(`/my-commissions?status=${saved ? 'reviewed' : 'not_allowed'}`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.redirect('/my-commissions?status=already_reviewed');
    }
    console.error(err);
    res.status(500).send('Something went wrong saving your review.');
  }
}

module.exports = { create };