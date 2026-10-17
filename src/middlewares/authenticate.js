import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../shared/errors.js';

/** Requires a valid access token: `Authorization: Bearer <token>`. Sets req.user = { id, email, role }. */
function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next(unauthorized());
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(unauthorized());
  }
}

export default authenticate;
