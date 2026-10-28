const request = require('supertest');
const bcrypt = require('bcryptjs');

// Fake the database layer so no MySQL is needed
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../repositories/userRepository');
jest.mock('../repositories/categoryRepository');
jest.mock('../repositories/creatorRepository');
jest.mock('../repositories/portfolioRepository');
jest.mock('../repositories/reviewRepository');

const userRepository = require('../repositories/userRepository');
const categoryRepository = require('../repositories/categoryRepository');
const creatorRepository = require('../repositories/creatorRepository');
const portfolioRepository = require('../repositories/portfolioRepository');
const reviewRepository = require('../repositories/reviewRepository');
const app = require('../app');

beforeEach(() => {
  jest.resetAllMocks();
  // Sensible defaults so pages can render
  categoryRepository.findAll.mockResolvedValue([{ id: 1, name: 'Painters', slug: 'painters' }]);
  categoryRepository.findAllWithCount.mockResolvedValue([]);
  categoryRepository.findBySlug.mockResolvedValue(null);
  creatorRepository.search.mockResolvedValue([]);
  creatorRepository.findTopRated.mockResolvedValue([]);
  portfolioRepository.findFeatured.mockResolvedValue([]);
  portfolioRepository.findByCreator.mockResolvedValue([]);
  reviewRepository.findLatestVisible.mockResolvedValue([]);
  reviewRepository.findByCreator.mockResolvedValue([]);
});

describe('public pages', () => {
  test('GET / renders the homepage', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Discover local creators');
  });

  test('GET /creators renders the directory', async () => {
    const res = await request(app).get('/creators');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Creator directory');
  });

  test('GET /creators/abc is a 404 without touching the database', async () => {
    const res = await request(app).get('/creators/abc');
    expect(res.status).toBe(404);
    expect(creatorRepository.findById).not.toHaveBeenCalled();
  });

  test('GET /creators/999 is a 404 when the creator does not exist', async () => {
    creatorRepository.findById.mockResolvedValue(null);
    const res = await request(app).get('/creators/999');
    expect(res.status).toBe(404);
  });

  test('GET /creators/1 shows an approved creator', async () => {
    creatorRepository.findById.mockResolvedValue({
      id: 1, user_id: 5, name: 'Kasun', bio: 'Painter', location: 'Kurunegala',
      avatar_path: null, category_name: 'Painters', category_slug: 'painters',
      avg_rating: null, review_count: 0,
    });
    const res = await request(app).get('/creators/1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Kasun');
  });

  test('unknown URLs give the 404 page', async () => {
    const res = await request(app).get('/this-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.text).toContain('404');
  });
});

describe('registration', () => {
  test('a visitor can register and is sent to /login', async () => {
    userRepository.create.mockResolvedValue(10);
    const res = await request(app).post('/register').type('form').send({
      name: 'Nimal Perera', email: 'nimal@example.com',
      password: 'StrongPass1', confirmPassword: 'StrongPass1', role: 'visitor',
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login?registered=1');
    expect(userRepository.create).toHaveBeenCalledTimes(1);
  });

  test('the password is stored hashed, never as plain text', async () => {
    userRepository.create.mockResolvedValue(10);
    await request(app).post('/register').type('form').send({
      name: 'Nimal Perera', email: 'nimal@example.com',
      password: 'StrongPass1', confirmPassword: 'StrongPass1', role: 'visitor',
    });
    const saved = userRepository.create.mock.calls[0][0];
    expect(saved.passwordHash).not.toBe('StrongPass1');
    expect(await bcrypt.compare('StrongPass1', saved.passwordHash)).toBe(true);
  });

  test('registering as admin is refused', async () => {
    const res = await request(app).post('/register').type('form').send({
      name: 'Evil User', email: 'evil@example.com',
      password: 'StrongPass1', confirmPassword: 'StrongPass1', role: 'admin',
    });
    expect(res.status).toBe(400);
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  test('a duplicate email shows a friendly error', async () => {
    userRepository.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    const res = await request(app).post('/register').type('form').send({
      name: 'Nimal Perera', email: 'nimal@example.com',
      password: 'StrongPass1', confirmPassword: 'StrongPass1', role: 'visitor',
    });
    expect(res.status).toBe(400);
    expect(res.text).toContain('already registered');
  });
});

describe('login', () => {
  const user = {
    id: 1, name: 'Nimal', role: 'visitor', is_active: 1,
    password_hash: bcrypt.hashSync('Correct123', 4),
  };

  test('correct password logs in and redirects home', async () => {
    userRepository.findByEmail.mockResolvedValue(user);
    const res = await request(app).post('/login').type('form')
      .send({ email: 'nimal@example.com', password: 'Correct123' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  test('wrong password gives the generic error', async () => {
    userRepository.findByEmail.mockResolvedValue(user);
    const res = await request(app).post('/login').type('form')
      .send({ email: 'nimal@example.com', password: 'Wrong12345' });
    expect(res.status).toBe(401);
    expect(res.text).toContain('Invalid email or password.');
  });

  test('unknown email gives the SAME generic error (no user enumeration)', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    const res = await request(app).post('/login').type('form')
      .send({ email: 'nobody@example.com', password: 'Whatever123' });
    expect(res.status).toBe(401);
    expect(res.text).toContain('Invalid email or password.');
  });

  test('a blocked account cannot log in', async () => {
    userRepository.findByEmail.mockResolvedValue({ ...user, is_active: 0 });
    const res = await request(app).post('/login').type('form')
      .send({ email: 'nimal@example.com', password: 'Correct123' });
    expect(res.status).toBe(403);
    expect(res.text).toContain('blocked');
  });
});