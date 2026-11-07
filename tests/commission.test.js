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
const creatorRepository = require('../repositories/creatorRepository');
const portfolioRepository = require('../repositories/portfolioRepository');
const reviewRepository = require('../repositories/reviewRepository');
const commissionRepository = require('../repositories/commissionRepository');
const app = require('../app');

const hash = bcrypt.hashSync('Correct123', 4);

const target = {
  id: 3, user_id: 5, name: 'Nimal', bio: '', location: '', avatar_path: null,
  category_name: 'Painters', category_slug: 'painters', avg_rating: null, review_count: 0,
};

const validBody = {
  creatorId: '3',
  title: 'Family house painting',
  description: 'A custom painting of my family home.',
  budget: '15000',
  deadline: '2999-12-31',
};

async function loginAs(role, id = 7) {
  const agent = request.agent(app);
  const user = { id, name: 'Tester', role, is_active: 1, password_hash: hash };
  userRepository.findByEmail.mockResolvedValue(user);
  userRepository.findById.mockResolvedValue(user);
  await agent.post('/login').type('form').send({ email: 't@example.com', password: 'Correct123' });
  return agent;
}

beforeEach(() => {
  jest.resetAllMocks();
  creatorRepository.findById.mockResolvedValue(target);
  creatorRepository.findByUserId.mockResolvedValue({ id: 3, user_id: 5 });
  portfolioRepository.findByCreator.mockResolvedValue([]);
  reviewRepository.findByCreator.mockResolvedValue([]);
  commissionRepository.hasPending.mockResolvedValue(false);
  commissionRepository.findByClient.mockResolvedValue([]);
});

describe('sending a request', () => {
  test('guests are sent to /login', async () => {
    const res = await request(app).post('/commissions').type('form').send(validBody);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('admins cannot send requests', async () => {
    const agent = await loginAs('admin');
    const res = await agent.post('/commissions').type('form').send(validBody);
    expect(res.status).toBe(403);
    expect(commissionRepository.create).not.toHaveBeenCalled();
  });

  test('a visitor can send a request', async () => {
    commissionRepository.create.mockResolvedValue(1);
    const agent = await loginAs('visitor');
    const res = await agent.post('/commissions').type('form').send(validBody);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/my-commissions?status=sent');
    expect(commissionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 7, creatorId: 3, title: 'Family house painting' })
    );
  });

  test('a client id typed into the form is ignored (session wins)', async () => {
    commissionRepository.create.mockResolvedValue(1);
    const agent = await loginAs('visitor');
    await agent.post('/commissions').type('form').send({ ...validBody, clientId: '999' });
    expect(commissionRepository.create.mock.calls[0][0].clientId).toBe(7);
  });

  test('you cannot request from yourself', async () => {
    const agent = await loginAs('creator', 5); // same user id as the target creator
    const res = await agent.post('/commissions').type('form').send(validBody);
    expect(res.status).toBe(403);
    expect(commissionRepository.create).not.toHaveBeenCalled();
  });

  test('an unknown or unapproved creator gives 404', async () => {
    creatorRepository.findById.mockResolvedValue(null);
    const agent = await loginAs('visitor');
    const res = await agent.post('/commissions').type('form').send(validBody);
    expect(res.status).toBe(404);
    expect(commissionRepository.create).not.toHaveBeenCalled();
  });

  test('a bad creator id gives 404', async () => {
    const agent = await loginAs('visitor');
    const res = await agent.post('/commissions').type('form').send({ ...validBody, creatorId: 'abc' });
    expect(res.status).toBe(404);
  });

  test('a second pending request to the same creator is refused', async () => {
    commissionRepository.hasPending.mockResolvedValue(true);
    const agent = await loginAs('visitor');
    const res = await agent.post('/commissions').type('form').send(validBody);
    expect(res.status).toBe(400);
    expect(res.text).toContain('already have a pending request');
    expect(commissionRepository.create).not.toHaveBeenCalled();
  });

  test('a short description is rejected', async () => {
    const agent = await loginAs('visitor');
    const res = await agent.post('/commissions').type('form').send({ ...validBody, description: 'short' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('Description must be 10-2000 characters.');
  });

  test('a deadline in the past is rejected', async () => {
    const agent = await loginAs('visitor');
    const res = await agent.post('/commissions').type('form').send({ ...validBody, deadline: '2020-01-01' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('Deadline cannot be in the past.');
  });

  test('a negative budget is rejected', async () => {
    const agent = await loginAs('visitor');
    const res = await agent.post('/commissions').type('form').send({ ...validBody, budget: '-5' });
    expect(res.status).toBe(400);
    expect(res.text).toContain('Budget must be a number');
  });

  test('budget and deadline are optional', async () => {
    commissionRepository.create.mockResolvedValue(1);
    const agent = await loginAs('visitor');
    const res = await agent.post('/commissions').type('form')
      .send({ ...validBody, budget: '', deadline: '' });
    expect(res.status).toBe(302);
    expect(commissionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ budget: null, deadline: null })
    );
  });

  test('a failed request keeps what the user typed', async () => {
    const agent = await loginAs('visitor');
    const res = await agent.post('/commissions').type('form')
      .send({ ...validBody, description: 'short', title: 'My special title' });
    expect(res.text).toContain('My special title');
  });
});

describe('creator status changes', () => {
  test('a creator can accept a request', async () => {
    commissionRepository.updateStatus.mockResolvedValue(true);
    const agent = await loginAs('creator', 5);
    const res = await agent.post('/creator/commissions/12/status').type('form').send({ status: 'accepted' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/creator/dashboard?status=updated');
    expect(commissionRepository.updateStatus).toHaveBeenCalledWith(12, 3, 'accepted');
  });

  test('an invalid status value is refused before the database', async () => {
    const agent = await loginAs('creator', 5);
    const res = await agent.post('/creator/commissions/12/status').type('form').send({ status: 'hacked' });
    expect(res.status).toBe(400);
    expect(commissionRepository.updateStatus).not.toHaveBeenCalled();
  });

  test('a change that is not allowed gives the "unchanged" message', async () => {
    commissionRepository.updateStatus.mockResolvedValue(false);
    const agent = await loginAs('creator', 5);
    const res = await agent.post('/creator/commissions/12/status').type('form').send({ status: 'completed' });
    expect(res.headers.location).toBe('/creator/dashboard?status=unchanged');
  });

  test('visitors cannot change statuses', async () => {
    const agent = await loginAs('visitor');
    const res = await agent.post('/creator/commissions/12/status').type('form').send({ status: 'accepted' });
    expect(res.status).toBe(403);
    expect(commissionRepository.updateStatus).not.toHaveBeenCalled();
  });

  test('a bad request id gives 404', async () => {
    const agent = await loginAs('creator', 5);
    const res = await agent.post('/creator/commissions/abc/status').type('form').send({ status: 'accepted' });
    expect(res.status).toBe(404);
  });
});

describe('my commissions', () => {
  const base = {
    id: 1, title: 'Family house painting', description: 'Details here', budget: '15000.00',
    deadline: '2999-12-31', created_date: '2026-11-01', creator_profile_id: 3, creator_name: 'Nimal',
  };

  test('guests are sent to /login', async () => {
    const res = await request(app).get('/my-commissions');
    expect(res.headers.location).toBe('/login');
  });

  test('an accepted request shows the creator contact', async () => {
    commissionRepository.findByClient.mockResolvedValue([
      { ...base, status: 'accepted', contact_email: 'nimal@example.com' },
    ]);
    const agent = await loginAs('visitor');
    const res = await agent.get('/my-commissions');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Family house painting');
    expect(res.text).toContain('nimal@example.com');
  });

  test('a pending request shows no contact details', async () => {
    commissionRepository.findByClient.mockResolvedValue([
      { ...base, status: 'pending', contact_email: null },
    ]);
    const agent = await loginAs('visitor');
    const res = await agent.get('/my-commissions');
    expect(res.text).not.toContain('Creator contact');
    expect(res.text).toContain('Waiting for the creator');
  });
});