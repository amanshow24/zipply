const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SECRET = 'test-secret';
const { setUser, getTokenCookieOptions } = require('../service/auth');

test('setUser signs a token with a future expiration', () => {
  const token = setUser({
    _id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'USER',
  });

  const decoded = jwt.decode(token);
  assert.ok(decoded && typeof decoded === 'object');
  assert.ok(decoded.exp > Math.floor(Date.now() / 1000));
});

test('token cookie options are persistent for 7 days', () => {
  const options = getTokenCookieOptions();

  assert.equal(options.httpOnly, true);
  assert.equal(options.path, '/');
  assert.equal(options.maxAge, 7 * 24 * 60 * 60 * 1000);
});
