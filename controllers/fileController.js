const fileRepository = require('../repositories/fileRepository');

// Our own file names are 32 random hex characters plus an extension, nothing else.
// This blocks any attempt at path tricks before we touch the database.
const NAME_PATTERN = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

async function serve(req, res) {
  const name = req.params.filename;
  if (!NAME_PATTERN.test(name)) return res.status(404).type('text/plain').send('Not found');

  try {
    const file = await fileRepository.find(name);
    if (!file) return res.status(404).type('text/plain').send('Not found');

    res.set({
      'Content-Type': file.mime_type,
      'Cache-Control': 'public, max-age=31536000, immutable', // names are random and never reused
      'X-Content-Type-Options': 'nosniff', // the browser must not guess another type
    });
    res.send(file.data);
  } catch (err) {
    console.error(err);
    res.status(500).type('text/plain').send('Error');
  }
}

module.exports = { serve };