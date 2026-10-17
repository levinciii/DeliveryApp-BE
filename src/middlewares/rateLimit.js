import rateLimit from 'express-rate-limit';

const make = (limit) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many requests, please slow down', statusCode: 429 },
  });

export const apiLimiter = make(120); // everything under /api
export const authLimiter = make(10); // login / register / refresh
