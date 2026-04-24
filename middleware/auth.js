import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'bloom_secret_key_2024_change_in_prod';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
};

function extractToken(req) {
  if (req.cookies?.bloom_token) return req.cookies.bloom_token;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export const authenticate = (req, res, next) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    res.clearCookie('bloom_token', { path: '/' });
    res.status(401).json({ error: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
  }
};

export const optionalAuth = (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    try { req.user = jwt.verify(token, SECRET); } catch {}
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

export const signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: '7d' });

export const setTokenCookie = (res, token) => {
  res.cookie('bloom_token', token, COOKIE_OPTIONS);
};

export const clearTokenCookie = (res) => {
  res.clearCookie('bloom_token', { path: '/' });
};
