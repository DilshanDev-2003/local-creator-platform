const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../repositories/userRepository');
jest.mock('../repositories/categoryRepository');
jest.mock('../repositories/creatorRepository');
jest.mock('../repositories/portfolioRepository');
jest.mock('../repositories/reviewRepository');
jest.mock('../repositories/commissionRepository');
jest.mock('../repositories/adminRepository');

const userRepository = require('../repositories/userRepository');
const creatorRepository = require('../repositories/creatorRepository');
const reviewRepository = require('../repositories/reviewRepository');
const adminRepository = require('../repositories/adminRepository');
const app = require('../app');

const hash = bcrypt.hashSync('Correct123', 4);

async function loginAs(role, id = 1) {
  const agent = request.agent(app);
  const user = { id, name: 'Tester', role, is_active: 1, password_hash: hash };
  userRepository.findByEmail.mockResolvedValue(user);
  userRepository.findById.mockResolvedValue(user);
  await agent.post('/login').type('form').send({ email: 't@example.com', password: 'Correct123' });
  return agent;
}

beforeEach(() => {
  jest.resetAllMocks();
  adminRepository.getStats.mockResolvedValue({
    users: 3, creators: 1, pending_creators: 1, commissions: 2, reviews: 1,
  });
  creatorRepository.listForAdmin.mockResolvedValue([
    { id: 4, name: 'Nimal', email: 'n@x.com', category_name: 'Painters', location: 'Kurunegala', is_approved: 0, created_date: '2026-11-01' },
  ]);
  userRepository.listAll.mockResolvedValue([
    { id: 5, name: 'Sam', email: 's@x.com', role: 'visitor', is_active: 1, created_date: '2026-11-01' },
    { id: 1, name: 'Boss', email: 'a@x.com', role: 'admin', is_active: 1, created_date: '2026-10-01' },
  ]);
  reviewRepository.listForAdmin.mockResolvedValue([
    { id: 9, rating: 4, comment: 'Nice', is_visible: 1, created_date: '2026-11-02', client_name: 'Sam', creator_name: 'Nimal' },
  ]);
});

describe('access control', () => {
  test('guests are sent to /login', async () => {
    const res = await request(app).get('/admin');
    expect(res.headers.location).toBe('/login');
  });

  test.each(['visitor', 'creator'])('a %s gets 403', async (role) => {
    const agent = await loginAs(role, 7);
    const res = await agent.get('/admin');
    expect(res.status).toBe(403);
  });

  test('a visitor cannot approve a creator', async () => {
    const agent = await loginAs('visitor', 7);
    const res = await agent.post('/admin/creators/4/approve');
    expect(res.status).toBe(403);
    expect(creatorRepository.setApproved).not.toHaveBeenCalled();
  });

  test('admins land on /admin after login', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 1, name: 'Boss', role: 'admin', is_active: 1, password_hash: hash,
    });
    const res = await request(app).post('/login').type('form')
      .send({ email: 'a@x.com', password: 'Correct123' });
    expect(res.headers.location).toBe('/admin');
  });
});

describe('dashboard', () => {
  test('an admin sees stats and the tables', async () => {
    const agent = await loginAs('admin');
    const res = await agent.get('/admin');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Admin panel');
    expect(res.text).toContain('Pending creators');
    expect(res.text).toContain('Nimal');
    expect(res.text).toContain('Approve');
    expect(res.text).toContain('Sam');
  });

  test('a status message from the URL is shown from the fixed list only', async () => {
    const agent = await loginAs('admin');
    const ok = await agent.get('/admin?status=approved');
    expect(ok.text).toContain('Creator approved');
    const evil = await agent.get('/admin?status=<script>alert(1)</script>');
    expect(evil.text).not.toContain('<script>alert(1)</script>');
  });
});

describe('moderation actions', () => {
  test('approve a creator', async () => {
    creatorRepository.setApproved.mockResolvedValue(true);
    const agent = await loginAs('admin');
    const res = await agent.post('/admin/creators/4/approve');
    expect(res.headers.location).toBe('/admin?status=approved');
    expect(creatorRepository.setApproved).toHaveBeenCalledWith(4, true);
  });

  test('revoke a creator', async () => {
    creatorRepository.setApproved.mockResolvedValue(true);
    const agent = await loginAs('admin');
    const res = await agent.post('/admin/creators/4/revoke');
    expect(res.headers.location).toBe('/admin?status=revoked');
    expect(creatorRepository.setApproved).toHaveBeenCalledWith(4, false);
  });

  test('block and unblock a user', async () => {
    userRepository.setActive.mockResolvedValue(true);
    const agent = await loginAs('admin');
    const blocked = await agent.post('/admin/users/5/block');
    expect(blocked.headers.location).toBe('/admin?status=blocked');
    expect(userRepository.setActive).toHaveBeenCalledWith(5, false);
    const unblocked = await agent.post('/admin/users/5/unblock');
    expect(unblocked.headers.location).toBe('/admin?status=unblocked');
    expect(userRepository.setActive).toHaveBeenCalledWith(5, true);
  });

  test('blocking an admin changes nothing', async () => {
    userRepository.setActive.mockResolvedValue(false); // SQL excludes admin rows
    const agent = await loginAs('admin');
    const res = await agent.post('/admin/users/1/block');
    expect(res.headers.location).toBe('/admin?status=unchanged');
  });

  test('hide and show a review', async () => {
    reviewRepository.setVisible.mockResolvedValue(true);
    const agent = await loginAs('admin');
    const hidden = await agent.post('/admin/reviews/9/hide');
    expect(hidden.headers.location).toBe('/admin?status=hidden');
    expect(reviewRepository.setVisible).toHaveBeenCalledWith(9, false);
    const shown = await agent.post('/admin/reviews/9/show');
    expect(shown.headers.location).toBe('/admin?status=shown');
    expect(reviewRepository.setVisible).toHaveBeenCalledWith(9, true);
  });

  test('a bad id gives 404 without touching the database', async () => {
    const agent = await loginAs('admin');
    const res = await agent.post('/admin/creators/abc/approve');
    expect(res.status).toBe(404);
    expect(creatorRepository.setApproved).not.toHaveBeenCalled();
  });
});

describe('blocked users are logged out', () => {
  test('a user blocked mid-session is treated as a guest on the next request', async () => {
    const agent = await loginAs('visitor', 7);
    // the admin blocks them now
    userRepository.findById.mockResolvedValue({ id: 7, name: 'Tester', role: 'visitor', is_active: 0 });
    const res = await agent.get('/my-commissions');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('a role change takes effect without logging in again', async () => {
    const agent = await loginAs('visitor', 7);
    userRepository.findById.mockResolvedValue({ id: 7, name: 'Tester', role: 'admin', is_active: 1 });
    const res = await agent.get('/admin');
    expect(res.status).toBe(200);
  });
});