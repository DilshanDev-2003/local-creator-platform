const request = require('supertest');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../repositories/userRepository');
jest.mock('../repositories/categoryRepository');
jest.mock('../repositories/creatorRepository');
jest.mock('../repositories/portfolioRepository');
jest.mock('../repositories/reviewRepository');

const userRepository = require('../repositories/userRepository');
const creatorRepository = require('../repositories/creatorRepository');
const portfolioRepository = require('../repositories/portfolioRepository');
const app = require('../app');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const hash = bcrypt.hashSync('Correct123', 4);

// Smallest thing that starts like a PNG file (what our signature check looks at)
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

const profile = {
  id: 3, user_id: 7, bio: '', location: '', avatar_path: null,
  is_approved: 1, category_name: 'Painters',
};

async function loginAs(role) {
  const agent = request.agent(app);
  userRepository.findByEmail.mockResolvedValue({
    id: 7, name: 'Kasun', role, is_active: 1, password_hash: hash,
  });
  await agent.post('/login').type('form').send({ email: 'k@example.com', password: 'Correct123' });
  return agent;
}

const savedFiles = []; // files created by tests, deleted afterwards

beforeEach(() => {
  jest.resetAllMocks();
  creatorRepository.findByUserId.mockResolvedValue(profile);
  portfolioRepository.findByCreator.mockResolvedValue([]);
  portfolioRepository.countByCreator.mockResolvedValue(0);
});

afterEach(() => {
  portfolioRepository.create.mock.calls.forEach(([arg]) => savedFiles.push(arg.imagePath));
});

afterAll(() => {
  savedFiles.forEach((f) => fs.rmSync(path.join(UPLOAD_DIR, f), { force: true }));
});

describe('access control', () => {
  test('guests are sent to /login', async () => {
    const res = await request(app).get('/creator/dashboard');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('a visitor gets 403', async () => {
    const agent = await loginAs('visitor');
    const res = await agent.get('/creator/dashboard');
    expect(res.status).toBe(403);
  });

  test('a creator sees the dashboard', async () => {
    const agent = await loginAs('creator');
    const res = await agent.get('/creator/dashboard');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Creator dashboard');
  });

  test('creators land on the dashboard after login', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 7, name: 'Kasun', role: 'creator', is_active: 1, password_hash: hash,
    });
    const res = await request(app).post('/login').type('form')
      .send({ email: 'k@example.com', password: 'Correct123' });
    expect(res.headers.location).toBe('/creator/dashboard');
  });
});

describe('portfolio upload', () => {
  test('a valid PNG is accepted and saved with a random name', async () => {
    portfolioRepository.create.mockResolvedValue(1);
    const agent = await loginAs('creator');
    const res = await agent.post('/creator/portfolio')
      .field('title', 'Sunset')
      .attach('image', PNG, { filename: 'my photo.png', contentType: 'image/png' });

    expect(res.status).toBe(302);
    const saved = portfolioRepository.create.mock.calls[0][0];
    expect(saved.creatorId).toBe(3); // taken from the session, not the form
    expect(saved.imagePath).toMatch(/^[a-f0-9]{32}\.png$/);
    expect(fs.existsSync(path.join(UPLOAD_DIR, saved.imagePath))).toBe(true);
  });

  test('a missing image is rejected', async () => {
    const agent = await loginAs('creator');
    const res = await agent.post('/creator/portfolio').field('title', 'No image');
    expect(res.status).toBe(400);
    expect(res.text).toContain('Please choose an image.');
    expect(portfolioRepository.create).not.toHaveBeenCalled();
  });

  test('a non-image type is rejected', async () => {
    const agent = await loginAs('creator');
    const res = await agent.post('/creator/portfolio')
      .field('title', 'Script')
      .attach('image', Buffer.from('echo hi'), { filename: 'run.sh', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('Only JPG, PNG or WEBP');
    expect(portfolioRepository.create).not.toHaveBeenCalled();
  });

  test('a fake image (wrong file bytes) is rejected and not kept on disk', async () => {
    const before = fs.readdirSync(UPLOAD_DIR).length;
    const agent = await loginAs('creator');
    const res = await agent.post('/creator/portfolio')
      .field('title', 'Fake')
      .attach('image', Buffer.from('this is not an image at all'), { filename: 'evil.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('not a valid image');
    expect(portfolioRepository.create).not.toHaveBeenCalled();
    expect(fs.readdirSync(UPLOAD_DIR).length).toBe(before);
  });

  test('a file over 2 MB is rejected', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const agent = await loginAs('creator');
    const res = await agent.post('/creator/portfolio')
      .field('title', 'Huge')
      .attach('image', big, { filename: 'huge.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('2 MB or smaller');
    expect(portfolioRepository.create).not.toHaveBeenCalled();
  });

  test('the portfolio limit is enforced', async () => {
    portfolioRepository.countByCreator.mockResolvedValue(20);
    const agent = await loginAs('creator');
    const before = fs.readdirSync(UPLOAD_DIR).length;
    const res = await agent.post('/creator/portfolio')
      .field('title', 'One too many')
      .attach('image', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('at most 20 works');
    expect(fs.readdirSync(UPLOAD_DIR).length).toBe(before);
  });
});

describe('ownership', () => {
  test("deleting another creator's work gives 404", async () => {
    portfolioRepository.deleteOwned.mockResolvedValue(null);
    const agent = await loginAs('creator');
    const res = await agent.post('/creator/portfolio/99/delete');
    expect(res.status).toBe(404);
    expect(portfolioRepository.deleteOwned).toHaveBeenCalledWith(99, 3);
  });

  test('deleting your own work works', async () => {
    portfolioRepository.deleteOwned.mockResolvedValue('abc.png');
    const agent = await loginAs('creator');
    const res = await agent.post('/creator/portfolio/5/delete');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/creator/dashboard?status=deleted');
  });

  test('a bad id gives 404 without touching the database', async () => {
    const agent = await loginAs('creator');
    const res = await agent.post('/creator/portfolio/abc/delete');
    expect(res.status).toBe(404);
    expect(portfolioRepository.deleteOwned).not.toHaveBeenCalled();
  });
});