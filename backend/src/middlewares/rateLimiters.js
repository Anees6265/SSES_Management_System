const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

/**
 * Normalize client IP consistently for IPv4 and IPv6 subnets using express-rate-limit's helper.
 */
const getClientIpKey = (req) => {
  const rawIp = req.ip || req.socket?.remoteAddress || "127.0.0.1";
  return ipKeyGenerator(rawIp);
};

/**
 * Extract normalized login identifier (email or PR key) from request body.
 */
const getAccountIdentifier = (req) => {
  const raw = req.body?.email || req.body?.prkey || "";
  return String(raw).trim().toLowerCase();
};

/**
 * Campus-safe dual login rate limiter middleware array:
 * 1) Per-(IP + account email) failed-attempt limiter so students/staff behind the same
 *    router/NAT IP never block each other, and valid logins never consume quota.
 * 2) High-ceiling failed-attempt IP flood guard to stop scripted bot spraying across many emails.
 */
const createLoginRateLimiters = ({
  windowMs = 15 * 60 * 1000,
  accountMax = 10,
  ipFailedCeiling = 100,
} = {}) => {
  const perAccountLimiter = rateLimit({
    windowMs,
    max: accountMax,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      const ipKey = getClientIpKey(req);
      const account = getAccountIdentifier(req);
      return account ? `${ipKey}:acct:${account}` : `${ipKey}:anon`;
    },
    message: {
      message:
        "Too many failed login attempts for this account. Please wait 15 minutes or reset your password.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const ipFailedFloodLimiter = rateLimit({
    windowMs,
    max: ipFailedCeiling,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `ip-fail:${getClientIpKey(req)}`,
    message: {
      message:
        "Too many failed login attempts from this network. Please wait 15 minutes before trying again.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  return [perAccountLimiter, ipFailedFloodLimiter];
};

/**
 * Per-authenticated-user rate limiter so students sharing a campus router do not hit
 * shared IP limits during password updates or file uploads.
 */
const createAuthenticatedActionLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = "Too many requests. Please wait a few minutes before trying again.",
  skipSuccessfulRequests = false,
} = {}) =>
  rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    keyGenerator: (req) => {
      const userId = req.user?.id || req.user?._id;
      if (userId) return `user:${String(userId)}`;
      return `ip:${getClientIpKey(req)}`;
    },
    message: { message },
    standardHeaders: true,
    legacyHeaders: false,
  });

/**
 * Per-(IP + account email) limiter for forgot/reset password flows behind shared campus NAT.
 */
const createPasswordResetLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = "Too many password reset requests for this account. Please try again after 15 minutes.",
} = {}) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      const ipKey = getClientIpKey(req);
      const account = getAccountIdentifier(req);
      return account ? `reset:${ipKey}:acct:${account}` : `reset:${ipKey}`;
    },
    message: { message },
    standardHeaders: true,
    legacyHeaders: false,
  });

module.exports = {
  getClientIpKey,
  getAccountIdentifier,
  createLoginRateLimiters,
  createAuthenticatedActionLimiter,
  createPasswordResetLimiter,
};

