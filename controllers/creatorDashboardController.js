const { validationResult } = require('express-validator');
const creatorRepository = require('../repositories/creatorRepository');
const portfolioRepository = require('../repositories/portfolioRepository');
const { removeFile } = require('../middleware/upload');

const MAX_WORKS = 20;

// Fixed messages. The URL only selects a key, so user text is never echoed back.
const MESSAGES = {
  profile: 'Profile updated.',
  added: 'Work added to your portfolio.',
  deleted: 'Work deleted.',
  featured: 'Featured setting updated.',
};

async function renderDashboard(req, res, { errors = [], status = 200 } = {}) {
  const profile = await creatorRepository.findByUserId(req.session.user.id);
  if (!profile) return res.status(403).send('403 - No creator profile found for this account.');

  const portfolio = await portfolioRepository.findByCreator(profile.id);
  const key = typeof req.query.status === 'string' ? req.query.status : '';
  const success = Object.hasOwn(MESSAGES, key) ? MESSAGES[key] : null;

  res.status(status).render('creator-dashboard', {
    title: 'Creator dashboard',
    profile,
    portfolio,
    errors,
    success,
    maxWorks: MAX_WORKS,
  });
}

// Collects upload + validation errors into one list
function collectErrors(req) {
  const errors = [];
  if (req.uploadError) errors.push(req.uploadError);
  const result = validationResult(req);
  if (!result.isEmpty()) errors.push(...result.array().map((e) => e.msg));
  return errors;
}

async function showDashboard(req, res) {
  try {
    await renderDashboard(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading your dashboard.');
  }
}

async function updateProfile(req, res) {
  const errors = collectErrors(req);
  if (errors.length) {
    if (req.file) removeFile(req.file.filename); // do not keep files from failed requests
    return renderDashboard(req, res, { errors, status: 400 }).catch(() => res.status(500).send('Error'));
  }

  try {
    const profile = await creatorRepository.findByUserId(req.session.user.id);
    if (!profile) {
      if (req.file) removeFile(req.file.filename);
      return res.status(403).send('403 - No creator profile found for this account.');
    }

    await creatorRepository.updateProfile(req.session.user.id, {
      bio: req.body.bio,
      location: req.body.location,
      avatarPath: req.file ? req.file.filename : null,
    });

    // Replace the old avatar file only after the database update succeeded
    if (req.file && profile.avatar_path) removeFile(profile.avatar_path);
    res.redirect('/creator/dashboard?status=profile');
  } catch (err) {
    if (req.file) removeFile(req.file.filename);
    console.error(err);
    res.status(500).send('Something went wrong saving your profile.');
  }
}

async function addWork(req, res) {
  const errors = collectErrors(req);
  if (!req.file && !req.uploadError) errors.push('Please choose an image.');

  try {
    const profile = await creatorRepository.findByUserId(req.session.user.id);
    if (!profile) {
      if (req.file) removeFile(req.file.filename);
      return res.status(403).send('403 - No creator profile found for this account.');
    }

    if (!errors.length && (await portfolioRepository.countByCreator(profile.id)) >= MAX_WORKS) {
      errors.push(`You can have at most ${MAX_WORKS} works. Delete one to add another.`);
    }

    if (errors.length) {
      if (req.file) removeFile(req.file.filename);
      return await renderDashboard(req, res, { errors, status: 400 });
    }

    await portfolioRepository.create({
      creatorId: profile.id,
      title: req.body.title,
      description: req.body.description,
      imagePath: req.file.filename,
      isFeatured: req.body.is_featured === 'on',
    });
    res.redirect('/creator/dashboard?status=added');
  } catch (err) {
    if (req.file) removeFile(req.file.filename);
    console.error(err);
    res.status(500).send('Something went wrong adding your work.');
  }
}

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function deleteWork(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).render('404', { title: 'Page not found' });

  try {
    const profile = await creatorRepository.findByUserId(req.session.user.id);
    if (!profile) return res.status(403).send('403 - No creator profile found for this account.');

    const imagePath = await portfolioRepository.deleteOwned(id, profile.id);
    if (!imagePath) return res.status(404).render('404', { title: 'Page not found' });

    removeFile(imagePath);
    res.redirect('/creator/dashboard?status=deleted');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong deleting that work.');
  }
}

async function toggleFeatured(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).render('404', { title: 'Page not found' });

  try {
    const profile = await creatorRepository.findByUserId(req.session.user.id);
    if (!profile) return res.status(403).send('403 - No creator profile found for this account.');

    const changed = await portfolioRepository.toggleFeatured(id, profile.id);
    if (!changed) return res.status(404).render('404', { title: 'Page not found' });

    res.redirect('/creator/dashboard?status=featured');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong updating that work.');
  }
}

module.exports = { showDashboard, updateProfile, addWork, deleteWork, toggleFeatured };