const { requireLogin, requireRole } = require('../middleware/auth');

function fakeRes() {
  return {
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
}

describe('requireLogin', () => {
  test('redirects guests to /login', () => {
    const res = fakeRes();
    const next = jest.fn();
    requireLogin({ session: {} }, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(next).not.toHaveBeenCalled();
  });

  test('lets a logged-in user through', () => {
    const next = jest.fn();
    requireLogin({ session: { user: { id: 1, role: 'visitor' } } }, fakeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  test('blocks the wrong role with 403', () => {
    const res = fakeRes();
    const next = jest.fn();
    requireRole('creator')({ session: { user: { id: 1, role: 'visitor' } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('allows the right role', () => {
    const next = jest.fn();
    requireRole('creator')({ session: { user: { id: 2, role: 'creator' } } }, fakeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('sends guests to /login', () => {
    const res = fakeRes();
    requireRole('admin')({ session: {} }, res, jest.fn());
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});