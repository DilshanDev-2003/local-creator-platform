// Usage:
//   node scripts/seedDemo.js           add demo data
//   node scripts/seedDemo.js --reset   remove demo data again
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const DOMAIN = '@demo.test';
const PASSWORD = 'Demo12345';

const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// [title, description, featured, colour 1, colour 2]
const CREATORS = [
  {
    name: 'Nimali Perera', email: 'nimali', category: 'painters', location: 'Kandy',
    bio: 'Watercolour and acrylic painter inspired by hill-country landscapes and temple scenes.',
    works: [
      ['Misty Hills', 'Watercolour of the tea hills at dawn.', 1, '#2b6777', '#9ad0c2'],
      ['Temple Evening', 'Acrylic on canvas, golden hour at an old temple.', 0, '#a4508b', '#f5a623'],
    ],
  },
  {
    name: 'Kasun Silva', email: 'kasun', category: 'photographers', location: 'Kurunegala',
    bio: 'Wedding and portrait photographer who loves natural light.',
    works: [
      ['Golden Portrait', 'Outdoor portrait session at sunset.', 1, '#f2994a', '#f2c94c'],
      ['City Lights', 'Night street photography.', 0, '#232526', '#5b3df5'],
    ],
  },
  {
    name: 'Dilani Fernando', email: 'dilani', category: 'craftspeople', location: 'Galle',
    bio: 'Handmade gift boxes, batik and coconut-shell crafts.',
    works: [
      ['Batik Gift Box', 'Hand-painted batik gift box.', 1, '#e8456b', '#f7b267'],
      ['Coconut Shell Lamp', 'Carved coconut-shell table lamp.', 0, '#6b4f3a', '#d9a066'],
    ],
  },
  {
    name: 'Ravindu Jayasinghe', email: 'ravindu', category: 'digital-artists', location: 'Colombo',
    bio: 'Logo designer and digital illustrator for small businesses.',
    works: [
      ['Cafe Logo', 'Brand mark for a small cafe.', 1, '#5b3df5', '#8f6bff'],
      ['Neon Dreams', 'Digital illustration in neon colours.', 0, '#0f2027', '#e8456b'],
    ],
  },
  {
    name: 'Tharushi Weerasinghe', email: 'tharushi', category: 'painters', location: 'Kurunegala',
    bio: 'Pet portraits and courtyard murals.',
    works: [
      ['Pet Portrait', 'Oil portrait of a family dog.', 0, '#355c7d', '#c06c84'],
      ['Garden Mural', 'Mural sketch for a courtyard wall.', 1, '#1f9d63', '#c6f1d6'],
    ],
  },
];

const CLIENTS = [['Amal Rathnayake', 'amal'], ['Sanduni Madushani', 'sanduni'], ['Nuwan Pathirana', 'nuwan']];

// [client index, creator index, title, description, budget, status, [rating, comment] or null]
const COMMISSIONS = [
  [0, 0, 'Family house portrait', "A watercolour painting of our family home for my parents' anniversary.", 18000, 'completed', [5, 'Beautiful work and delivered on time. My parents loved it!']],
  [1, 0, 'Temple landscape', 'A landscape of the temple near our village, for the living room wall.', 12000, 'completed', [4, 'Lovely colours, a little slow to reply but worth the wait.']],
  [2, 1, 'Wedding photo shoot', 'Full-day photography for a small family wedding.', 45000, 'completed', [5, 'Professional and friendly. The photos were perfect.']],
  [0, 1, 'Graduation photos', 'A one-hour outdoor graduation photo session.', 15000, 'accepted', null],
  [1, 2, 'Handmade wedding gift box', 'A batik gift box for a wedding present.', 8000, 'completed', [5, 'Exactly what I imagined, beautifully crafted.']],
  [2, 3, 'Logo for a small cafe', 'A simple, modern logo for a new cafe in town.', 10000, 'completed', [4, 'Clean design and two quick revisions.']],
  [0, 3, 'Illustrated birthday card', 'A custom illustrated card for my sister.', 3500, 'pending', null],
  [1, 4, 'Pet portrait', 'An oil portrait of our dog as a gift.', 9000, 'rejected', null],
  [2, 4, 'Mural sketch', 'A sketch for a mural on our courtyard wall.', 14000, 'pending', null],
];

function svg(title, c1, c2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="800" height="600" fill="url(#g)"/>
<circle cx="620" cy="170" r="90" fill="#fff" fill-opacity=".25"/>
<circle cx="170" cy="470" r="130" fill="#fff" fill-opacity=".18"/>
<text x="400" y="320" text-anchor="middle" font-family="Georgia, serif" font-size="46" fill="#fff">${title}</text>
</svg>`;
}

async function reset() {
  // Foreign keys cascade: profiles, works, commissions and reviews go with the users
  await pool.query('DELETE FROM users WHERE email LIKE ?', ['%' + DOMAIN]);
  if (fs.existsSync(UPLOAD_DIR)) {
    fs.readdirSync(UPLOAD_DIR)
      .filter((f) => /^demo-\d+\.svg$/.test(f))
      .forEach((f) => fs.rmSync(path.join(UPLOAD_DIR, f)));
  }
  console.log('Demo data removed.');
}

async function seed() {
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM users WHERE email LIKE ?', ['%' + DOMAIN]);
  if (n > 0) {
    console.log('Demo data already exists. Run with --reset first.');
    return;
  }

  const [cats] = await pool.query('SELECT id, slug FROM categories');
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  const hash = await bcrypt.hash(PASSWORD, 10);
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const addUser = async (name, local, role) => {
    const [r] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, local + DOMAIN, hash, role]
    );
    return r.insertId;
  };

  const profileIds = [];
  let fileNo = 0;
  for (const c of CREATORS) {
    if (!catId[c.category]) throw new Error('Missing category: ' + c.category);
    const userId = await addUser(c.name, c.email, 'creator');
    const [p] = await pool.query(
      `INSERT INTO creator_profiles (user_id, category_id, bio, location, is_approved)
       VALUES (?, ?, ?, ?, 1)`,
      [userId, catId[c.category], c.bio, c.location]
    );
    profileIds.push(p.insertId);

    for (const [title, desc, featured, c1, c2] of c.works) {
      fileNo += 1;
      const file = `demo-${fileNo}.svg`;
      fs.writeFileSync(path.join(UPLOAD_DIR, file), svg(title, c1, c2));
      await pool.query(
        `INSERT INTO portfolio_items (creator_id, title, description, image_path, is_featured)
         VALUES (?, ?, ?, ?, ?)`,
        [p.insertId, title, desc, file, featured]
      );
    }
  }

  const clientIds = [];
  for (const [name, local] of CLIENTS) clientIds.push(await addUser(name, local, 'visitor'));

  for (const [ci, pi, title, description, budget, status, review] of COMMISSIONS) {
    const [r] = await pool.query(
      `INSERT INTO commission_requests
         (client_id, creator_id, title, description, budget, deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clientIds[ci], profileIds[pi], title, description, budget, inDays(30), status]
    );
    if (review) {
      await pool.query(
        'INSERT INTO reviews (commission_id, rating, comment) VALUES (?, ?, ?)',
        [r.insertId, review[0], review[1]]
      );
    }
  }

  console.log('Demo data added. Password for every demo account:', PASSWORD);
  console.log('Creators:', CREATORS.map((c) => c.email + DOMAIN).join(', '));
  console.log('Clients: ', CLIENTS.map((c) => c[1] + DOMAIN).join(', '));
}

(process.argv.includes('--reset') ? reset() : seed())
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => pool.end());