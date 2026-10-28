const categoryRepository = require('../repositories/categoryRepository');
const creatorRepository = require('../repositories/creatorRepository');
const portfolioRepository = require('../repositories/portfolioRepository');
const reviewRepository = require('../repositories/reviewRepository');

async function showHome(req, res) {
  try {
    // Independent queries run in parallel (faster than one after another)
    const [categories, featuredWorks, creators, reviews] = await Promise.all([
      categoryRepository.findAllWithCount(),
      portfolioRepository.findFeatured(5),
      creatorRepository.findTopRated(6),
      reviewRepository.findLatestVisible(3),
    ]);

    res.render('index', { title: 'Home', categories, featuredWorks, creators, reviews });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading the homepage.');
  }
}

module.exports = { showHome };