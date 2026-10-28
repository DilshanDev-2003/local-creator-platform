const creatorRepository = require('../repositories/creatorRepository');
const categoryRepository = require('../repositories/categoryRepository');
const portfolioRepository = require('../repositories/portfolioRepository');
const reviewRepository = require('../repositories/reviewRepository');

// Query strings can be arrays (?a=1&a=2), so only accept plain strings
const str = (v) => (typeof v === 'string' ? v.trim() : '');

function notFound(res) {
  return res.status(404).render('404', { title: 'Page not found' });
}

async function list(req, res) {
  const category = str(req.query.category);
  const location = str(req.query.location).slice(0, 100);

  try {
    const [creators, categories] = await Promise.all([
      creatorRepository.search({ categorySlug: category, location }),
      categoryRepository.findAll(),
    ]);
    res.render('creators', {
      title: 'Creators',
      creators,
      categories,
      filters: { category, location },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading creators.');
  }
}

async function show(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return notFound(res);

  try {
    const creator = await creatorRepository.findById(id);
    if (!creator) return notFound(res);

    const [portfolio, reviews] = await Promise.all([
      portfolioRepository.findByCreator(id),
      reviewRepository.findByCreator(id),
    ]);

    res.render('creator-profile', { title: creator.name, creator, portfolio, reviews });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading this creator.');
  }
}

module.exports = { list, show };