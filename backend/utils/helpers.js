const { TextEncoder } = require('util');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test_secret_key';
const jwtSecret = new TextEncoder().encode(JWT_SECRET_KEY);

/**
 * Verifies a JWT token using jose.jwtVerify
 */
async function verifyToken(token, { returnPayload = false } = {}) {
  try {
    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(token, jwtSecret);
    return returnPayload ? payload : true;
  } catch (err) {
    return false;
  }
}

/**
 * Generates a refresh token containing the provided data.
 * Expires in 30 days.
 */
async function generateRefreshToken(data) {
  const { SignJWT } = await import('jose');
  return await new SignJWT({ data })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(jwtSecret);
}

/**
 * Generates an access token containing the provided refresh token string.
 * Expires in 15 minutes.
 */
async function generateAccessToken(refreshToken) {
  const { SignJWT } = await import('jose');
  return await new SignJWT({ data: refreshToken })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(jwtSecret);
}

module.exports = {
  verifyToken,
  generateRefreshToken,
  generateAccessToken,
};