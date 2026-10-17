import { forbidden } from '../shared/errors.js';

/** Usage: router.get('/clients', requireRole('ACCOUNTANT', 'ADMIN'), handler). Run after `authenticate`. */
const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
  next();
};

export default requireRole;
