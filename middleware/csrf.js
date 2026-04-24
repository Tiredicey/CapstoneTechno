import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || 'bloom_csrf_2024_change_in_prod';
const TOKEN_TTL = 3600000;

function generateToken(sessionId) {
  const ts = Date.now().toString(36);
  const payload = sessionId + ':' + ts;
  const sig = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex').slice(0, 16);
  return payload + ':' + sig;
}

function verifyToken(token, sessionId) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [sid, ts, sig] = parts;
  if (sid !== sessionId) return false;
  const age = Date.now() - parseInt(ts, 36);
  if (age > TOKEN_TTL || age < 0) return false;
  const expected = crypto.createHmac('sha256', CSRF_SECRET).update(sid + ':' + ts).digest('hex').slice(0, 16);
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export const csrfToken = (req, res, next) => {
  const sessionId = req.cookies?.bloom_session || req.headers['x-session-id'] || 'anon';
  req.csrfToken = generateToken(sessionId);
  next();
};

export const csrfProtect = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const sessionId = req.cookies?.bloom_session || req.headers['x-session-id'] || 'anon';
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  if (!verifyToken(token, sessionId)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
};
