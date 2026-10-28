const categoryRepository = require('../repositories/categoryRepository');
const creatorRepository = require('../repositories/creatorRepository');

async function list(req, res) {
  try {
    const categories = await categoryRepository.findAllWithCount();
    res.render('categories', { title: 'Categories', categories });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading categories.');
  }
}

async function show(req, res) {
  try {
    const category = await categoryRepository.findBySlug(req.params.slug);
    if (!category) {
      return res.status(404).render('404', { title: 'Page not found' });
    }
    const creators = await creatorRepository.search({ categorySlug: category.slug });
    res.render('category', { title: category.name, category, creators });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading this category.');
  }
}

module.exports = { list, show };