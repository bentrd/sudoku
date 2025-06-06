const secretString = process.env.JWT_SECRET || 'default_secret_key_for_jwt';
const encoder = new TextEncoder();
const secret = encoder.encode(secretString);

async function generateRefreshToken(userId) {
    const { SignJWT } = await import('jose');
    const alg = 'HS256';
    const token = await new SignJWT({ data: userId })
        .setProtectedHeader({ alg })
        .setExpirationTime('7d')
        .sign(secret);
    return token;
}

async function generateAccessToken(refreshToken) {
    const { SignJWT } = await import('jose');
    const alg = 'HS256';
    const token = await new SignJWT({ data: refreshToken })
        .setProtectedHeader({ alg })
        .setExpirationTime('15m')
        .sign(secret);
    return token;
}

async function verifyToken(token, options = {}) {
    const { jwtVerify } = await import('jose');
    try {
        const { payload } = await jwtVerify(token, secret);
        if (options.returnPayload) {
            return payload;
        }
        return true;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: authenticate the request by verifying “Authorization: Bearer <token>”
// and injecting req.userId = the integer user‐ID from the refresh‐token payload.
// ─────────────────────────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token, { returnPayload: true });
    if (!payload || !payload.data) {
      return res.status(401).json({ message: 'Invalid or expired access token' });
    }
    const refreshToken = payload.data;
    // The refresh token payload's “data” field is the userId
    const refreshPayload = await verifyToken(refreshToken, { returnPayload: true });
    if (!refreshPayload || !refreshPayload.data) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    req.userId = Number(refreshPayload.data);
    next();
  } catch (err) {
    console.error('Auth error in /match:', err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = { generateRefreshToken, generateAccessToken, verifyToken, requireAuth };