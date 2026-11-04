const express = require("express");
const usercontroller = require("../controllers/user/userController");
const passport = require("passport");
const { googleAuthCallback } = require('../controllers/user/userController');
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const superAdminOnly = [verifyToken, checkRole(["superadmin"])];
const adminRoles = ["superadmin", "admin"];
const adminOnly = [verifyToken, checkRole(adminRoles)];
const userManagementRoles = ["superadmin", "admin", "hod", "faculty", "placement_officer", "coordinator"];
const userManagementOnly = [verifyToken, checkRole(userManagementRoles)];

// Rate Limiter for Login (Anti-Brute Force: Max 10 attempts per 15 min per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts from this IP. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter for Password Reset Requests (Max 20 attempts per 15 min per IP)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many password reset requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/users/signup - Handled with permission checks in usercontroller.createUser
router.post("/signup", usercontroller.createUser);
router.post("/login", loginLimiter, usercontroller.login);
router.post("/logout", usercontroller.logout);
router.patch('/update/:id', verifyToken, usercontroller.updateUserFields);

// Change Password for authenticated user
router.patch("/change-password", verifyToken, usercontroller.changeMyPassword);

// Admin Reset Password for any user
router.patch("/admin/reset-password/:id", ...adminOnly, usercontroller.adminResetPassword);

router.post("/refresh_token", usercontroller.refreshAccessToken);

// Forgot Password - send email
router.post("/forgot_password", forgotPasswordLimiter, usercontroller.forgotPassword);

// Reset Password using link
router.post("/reset_password/:token", forgotPasswordLimiter, usercontroller.resetPassword);

router.get("/get/:id", verifyToken, usercontroller.getUserById);

// Helper to determine the accurate Google OAuth callback URL (supports both local and live servers)
const getGoogleCallbackUrl = (req) => {
  const configured = process.env.GOOGLE_CALLBACK_URL;
  const host = req.get("host") || `localhost:${process.env.PORT || 5001}`;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const dynamicCallback = `${protocol}://${host}/api/user/google/callback`;

  if (configured && !configured.includes("your-backend-vercel-url")) {
    const isReqLocal = host.includes("localhost") || host.includes("127.0.0.1");
    const isConfigLocal = configured.includes("localhost") || configured.includes("127.0.0.1");
    if (isReqLocal === isConfigLocal) {
      return configured;
    }
  }
  return dynamicCallback;
};

// Google OAuth - Initiate
router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: "Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the .env file.",
    });
  }

  // Preserve frontend origin through OAuth state
  let origin = req.query.origin;
  if (!origin && req.headers.referer) {
    try {
      origin = new URL(req.headers.referer).origin;
    } catch (e) {
      origin = null;
    }
  }
  const state = Buffer.from(JSON.stringify({ origin })).toString("base64");
  const callbackURL = getGoogleCallbackUrl(req);

  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    callbackURL,
    state,
  })(req, res, next);
});

// Google OAuth - Callback
router.get(
  "/google/callback",
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Google OAuth is not configured on the server.",
      });
    }

    let redirectBase = "";
    if (req.query.state) {
      try {
        const decodedState = JSON.parse(Buffer.from(req.query.state, "base64").toString("utf-8"));
        if (decodedState?.origin) {
          redirectBase = `${decodedState.origin}/google-success`;
        }
      } catch (e) {
        // ignore
      }
    }
    if (!redirectBase) {
      redirectBase = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5173/google-success";
    }

    const callbackURL = getGoogleCallbackUrl(req);
    passport.authenticate("google", { session: false, callbackURL }, (err, user, info) => {
      if (err || !user) {
        console.error("Passport Google Auth Failed:", err || info);
        const errorMsg = err?.message || info?.message || "Google authentication failed";
        return res.redirect(`${redirectBase}?error=auth_failed&message=${encodeURIComponent(errorMsg)}`);
      }
      req.user = user;
      return googleAuthCallback(req, res, next);
    })(req, res, next);
  }
);

router.get("/me", verifyToken, usercontroller.getCurrentUser);
router.get("/all", ...userManagementOnly, usercontroller.getAllUsers);
router.delete("/delete/:id", ...superAdminOnly, usercontroller.deleteUser);

// Permissions Management - SuperAdmin & HOD (HOD scoped to department faculties within HOD ceiling)
router.get("/permissions/all", ...userManagementOnly, usercontroller.getAllPossiblePermissions);
router.get("/permissions/:id", ...userManagementOnly, usercontroller.getUserPermissions);
router.put("/permissions/:id", ...userManagementOnly, usercontroller.updateUserPermissions);

module.exports = router;


