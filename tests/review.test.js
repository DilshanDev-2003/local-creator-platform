const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../repositories/userRepository');
jest.mock('../repositories/categoryRepository');
jest.mock('../repositories/creatorRepository');
jest.mock('../repositories/portfolioRepository');
jest.mock('../repositories/reviewRepository');
jest.mock('../repositories/commissionRepository');

const userRepository = require('../repositories/userRepository');
const reviewRepository = require('../repositories/reviewRepository');
const commissionRepository = require('../repositories/commissionRepository');
const app = require('../app');

const hash = bcrypt.hashSync('Correct123', 4);
const good = { commissionId: '12', rating: '5', comment: 'Wonderful work!' };

async function loginAs(role, id = 7) {
  const agent = request.agent(app);
  userRepository.findByEmail.mockResolvedValue({
    id, name: 'Tester', role, is_active: 1, password_hash: hash,
  });
  await agent.post('/login').type('form').send({ email: 't@example.com', password: 'Correct123' });
  return agent;
}

beforeEach(() => {
  jest.resetAllMocks();
  commissionRepository.findByClient.mockResolvedValue([]);
});

describe('submitting a review', () => {
  test('guests are sent to /login', async () => {
    const res = await request(app).post('/reviews').type('form').send(good);
    expect(res.headers.location).toBe('/login');
  });

  test('admins cannot review', async () => {
    const agent = await loginAs('admin');
    const res = await agent.post('/reviews').type('form').send(good);
    expect(res.status).toBe(403);
    expect(reviewRepository.create).not.toHaveBeenCalled();
  });

  test('a valid review is saved using the session user id', async () => {
    reviewRepository.create.mockResolvedValue(true);
    const agent = await loginAs('visitor', 7);
    const res = await agent.post('/reviews').type('form').send({ ...good, clientId: '999' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/my-commissions?status=reviewed');
    expect(reviewRepository.create).toHaveBeenCalledWith({
      commissionId: 12, clientId: 7, rating: 5, comment: 'Wonderful work!',
    });
  });

  test('an empty comment is stored as null', async () => {
    reviewRepository.create.mockResolvedValue(true);
    const agent = await loginAs('visitor');
    await agent.post('/reviews').type('form').send({ ...good, comment: '' });
    expect(reviewRepository.create.mock.calls[0][0].comment).toBeNull();
  });

  test.each(['0', '6', '3.5', 'abc', ''])('rating "%s" is rejected before the database', async (rating) => {
    const agent = await loginAs('visitor');
    const res = await agent.post('/reviews').type('form').send({ ...good, rating });
    expect(res.headers.location).toBe('/my-commissions?status=invalid_review');
    expect(reviewRepository.create).not.toHaveBeenCalled();
  });

  test('a comment over 1000 characters is rejected', async () => {
    const agent = await loginAs('visitor');
    const res = await agent.post('/reviews').type('form').send({ ...good, comment: 'x'.repeat(1001) });
    expect(res.headers.location).toBe('/my-commissions?status=invalid_review');
    expect(reviewRepository.create).not.toHaveBeenCalled();
  });

  test('a bad commission id gives 404', async () => {
    const agent = await loginAs('visitor');
    const res = await agent.post('/reviews').type('form').send({ ...good, commissionId: 'abc' });
    expect(res.status).toBe(404);
    expect(reviewRepository.create).not.toHaveBeenCalled();
  });

  test('a commission that is not yours or not completed is refused', async () => {
    reviewRepository.create.mockResolvedValue(false);
    const agent = await loginAs('visitor');
    const res = await agent.post('/reviews').type('form').send(good);
    expect(res.headers.location).toBe('/my-commissions?status=not_allowed');
  });

  test('a second review for the same commission is refused', async () => {
    reviewRepository.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    const agent = await loginAs('visitor');
    const res = await agent.post('/reviews').type('form').send(good);
    expect(res.headers.location).toBe('/my-commissions?status=already_reviewed');
  });
});

describe('review section on My Commissions', () => {
  const base = {
    id: 12, title: 'House painting', description: 'Details here', budget: null,
    deadline: null, created_date: '2026-11-01', creator_profile_id: 3, creator_name: 'Nimal',
    contact_email: 'nimal@example.com', review_id: null, review_rating: null, review_comment: null,
  };

  test('a completed commission without a review shows the form', async () => {
    commissionRepository.findByClient.mockResolvedValue([{ ...base, status: 'completed' }]);
    const agent = await loginAs('visitor');
    const res = await agent.get('/my-commissions');
    expect(res.text).toContain('Leave a review');
    expect(res.text).toContain('name="commissionId"');
  });

  test('a reviewed commission shows the review and no form', async () => {
    commissionRepository.findByClient.mockResolvedValue([
      { ...base, status: 'completed', review_id: 1, review_rating: 4, review_comment: 'Great job' },
    ]);
    const agent = await loginAs('visitor');
    const res = await agent.get('/my-commissions');
    expect(res.text).toContain('Your review');
    expect(res.text).toContain('Great job');
    expect(res.text).not.toContain('Leave a review');
  });

  test('a pending or accepted commission has no review form', async () => {
    commissionRepository.findByClient.mockResolvedValue([
      { ...base, id: 1, status: 'pending' },
      { ...base, id: 2, status: 'accepted' },
    ]);
    const agent = await loginAs('visitor');
    const res = await agent.get('/my-commissions');
    expect(res.text).not.toContain('Leave a review');
  });

  test('review text is escaped (no script injection)', async () => {
    commissionRepository.findByClient.mockResolvedValue([
      { ...base, status: 'completed', review_id: 1, review_rating: 5, review_comment: '<script>alert(1)</script>' },
    ]);
    const agent = await loginAs('visitor');
    const res = await agent.get('/my-commissions');
    expect(res.text).not.toContain('<script>alert(1)</script>');
    expect(res.text).toContain('&lt;script&gt;');
  });
});