const rateLimit = require('express-rate-limit');

function getUserOrIpRateLimitKey(req) {
  if (req?.user?.id) return `user:${req.user.id}`;
  return req.ip;
}

// ✅ SECURITY: Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true
});

// ✅ SECURITY: Rate limiter for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    status: 'error',
    message: 'Too many accounts created. Please try again after 1 hour.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ✅ SECURITY: General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    status: 'error',
    message: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ✅ SECURITY: Strict rate limiter for sensitive operations
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 sensitive requests per 15 minutes
  message: {
    status: 'error',
    message: 'Too many requests for this operation. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  // Allow normal read traffic (e.g. /users/transactions/me, /contributions/history)
  // while keeping stricter throttling for writes and verify-by-reference endpoints.
  skip: (req) => req.method === 'GET' && !req.path.includes('/verify/'),
  standardHeaders: true,
  legacyHeaders: false
});

// ✅ SECURITY: Rate limiter for authenticated money-moving writes
const sensitiveWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  keyGenerator: getUserOrIpRateLimitKey,
  message: {
    status: 'error',
    message: 'Too many sensitive actions. Please slow down and try again shortly.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ✅ SECURITY: Rate limiter for payment verification by reference
const paymentVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  keyGenerator: getUserOrIpRateLimitKey,
  message: {
    status: 'error',
    message: 'Too many payment verification attempts. Please wait and try again.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginLimiter,
  registerLimiter,
  apiLimiter,
  strictLimiter,
  sensitiveWriteLimiter,
  paymentVerifyLimiter
};
