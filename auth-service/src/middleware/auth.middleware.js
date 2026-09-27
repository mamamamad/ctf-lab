import { verifyAccessToken } from '../services/token.service.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'missing bearer token' });
  }

  try {
    req.user = await verifyAccessToken(token); // { sub, role, iat, exp, jti, iss }
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}
