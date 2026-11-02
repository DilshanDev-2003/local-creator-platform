const { validationResult } = require('express-validator');
const commissionRepository = require('../repositories/commissionRepository');
const creatorRepository = require('../repositories/creatorRepository');
const { renderProfile } = require('./creatorController');

const MESSAGES = {
  sent: 'Your commission request has been sent.',
  reviewed: 'Thank you! Your review has been saved.',
};

const WARNINGS = {
  invalid_review: 'Please choose a rating from 1 to 5 (comment up to 1000 characters).',
  not_allowed: 'That commission cannot be reviewed.',
  already_reviewed: 'You have already reviewed this commission.',
};

const ALLOWED_STATUSES = ['accepted', 'rejected', 'completed'];

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const notFound = (res) => res.status(404).render('404', { title: 'Page not found' });

// POST /commissions  (client sends a request)
async function create(req, res) {
  const creatorId = parseId(req.body.creatorId);
  if (!creatorId) return notFound(res);

  try {
    // Must exist, be approved and be active (findById only returns those)
    const creator = await creatorRepository.findById(creatorId);
    if (!creator) return notFound(res);

    const clientId = req.session.user.id; // from the session, never from the form
    if (creator.user_id === clientId) {
      return res.status(403).send('403 - You cannot request a commission from yourself.');
    }

    const errors = [];
    const result = validationResult(req);
    if (!result.isEmpty()) errors.push(...result.array().map((e) => e.msg));

    if (!errors.length && (await commissionRepository.hasPending(clientId, creatorId))) {
      errors.push('You already have a pending request with this creator. Please wait for their reply.');
    }

    if (errors.length) {
      return await renderProfile(req, res, { creatorId, errors, old: req.body, status: 400 });
    }

    await commissionRepository.create({
      clientId,
      creatorId,
      title: req.body.title,
      description: req.body.description,
      budget: req.body.budget || null,
      deadline: req.body.deadline || null,
    });
    res.redirect('/my-commissions?status=sent');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong sending your request.');
  }
}

async function listMine(req, res) {
  try {
    const requests = await commissionRepository.findByClient(req.session.user.id);
    const key = typeof req.query.status === 'string' ? req.query.status : '';
    const success = Object.hasOwn(MESSAGES, key) ? MESSAGES[key] : null;
    const warning = Object.hasOwn(WARNINGS, key) ? WARNINGS[key] : null;
    res.render('my-commissions', { title: 'My commissions', requests, success, warning });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading your requests.');
  }
}

// POST /creator/commissions/:id/status  (creator accepts / rejects / completes)
async function updateStatus(req, res) {
  const id = parseId(req.params.id);
  if (!id) return notFound(res);

  const newStatus = req.body.status;
  if (!ALLOWED_STATUSES.includes(newStatus)) {
    return res.status(400).send('400 - Invalid status.');
  }

  try {
    const profile = await creatorRepository.findByUserId(req.session.user.id);
    if (!profile) return res.status(403).send('403 - No creator profile found for this account.');

    const changed = await commissionRepository.updateStatus(id, profile.id, newStatus);
    // Same message whether the id is not yours or the change is not allowed:
    // we never reveal whether another creator's request exists.
    res.redirect(`/creator/dashboard?status=${changed ? 'updated' : 'unchanged'}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong updating that request.');
  }
}

module.exports = { create, listMine, updateStatus };