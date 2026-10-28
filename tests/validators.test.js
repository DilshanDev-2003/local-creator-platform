const { validationResult } = require('express-validator');
const { registerRules } = require('../middleware/validators');

// Runs the register rules against a fake request and returns the error messages
async function errorsFor(body) {
  const req = { body };
  await Promise.all(registerRules.map((rule) => rule.run(req)));
  return validationResult(req).array().map((e) => e.msg);
}

const valid = {
  name: 'Nimal Perera',
  email: 'nimal@example.com',
  password: 'StrongPass1',
  confirmPassword: 'StrongPass1',
  role: 'visitor',
};

describe('register validation', () => {
  test('accepts a valid visitor', async () => {
    expect(await errorsFor(valid)).toEqual([]);
  });

  test('rejects the admin role (nobody can self-register as admin)', async () => {
    expect(await errorsFor({ ...valid, role: 'admin' })).toContain('Choose a valid account type.');
  });

  test('rejects a short password', async () => {
    const errors = await errorsFor({ ...valid, password: 'short', confirmPassword: 'short' });
    expect(errors).toContain('Password must be at least 8 characters.');
  });

  test('rejects mismatched passwords', async () => {
    const errors = await errorsFor({ ...valid, confirmPassword: 'Different1' });
    expect(errors).toContain('Passwords do not match.');
  });

  test('rejects an invalid email', async () => {
    expect(await errorsFor({ ...valid, email: 'not-an-email' })).toContain('Enter a valid email address.');
  });

  test('a creator must choose a category', async () => {
    expect(await errorsFor({ ...valid, role: 'creator' })).toContain('Creators must choose a category.');
  });

  test('a creator with a category is accepted', async () => {
    expect(await errorsFor({ ...valid, role: 'creator', categoryId: '1' })).toEqual([]);
  });
});