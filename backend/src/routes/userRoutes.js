const express = require("express");
const usercontroller = require("../controllers/user/userController");
const passport = require("passport");
const { googleAuthCallback } = require('../controllers/user/userController');
const { verifyToken } = require("../middlewares/authMiddleware");

const router = express.Router();

// POST /api/users/create
router.post("/signup", usercontroller.createUser);
router.post("/login", usercontroller.login);
router.post("/logout", usercontroller.logout);
router.patch('/update/:id', verifyToken, usercontroller.updateUserFields);

router.post("/refresh_token", usercontroller.refreshAccessToken);

// Forgot Password - send email
router.post("/forgot_password", usercontroller.forgotPassword);

// Reset Password using link
router.post("/reset_password/:token", usercontroller.resetPassword);

router.get("/get/:id", verifyToken, usercontroller.getUserById);

// Google OAuth
router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: "Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the .env file.",
    });
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Google OAuth is not configured on the server.",
      });
    }
    passport.authenticate('google', { session: false })(req, res, next);
  },
  googleAuthCallback
);

router.get("/me", verifyToken, usercontroller.getCurrentUser);
router.get("/all", verifyToken, usercontroller.getAllUsers);
router.delete("/delete/:id", verifyToken, usercontroller.deleteUser);

// Permissions Management
router.get("/permissions/all", verifyToken, usercontroller.getAllPossiblePermissions);
router.get("/permissions/:id", verifyToken, usercontroller.getUserPermissions);
router.put("/permissions/:id", verifyToken, usercontroller.updateUserPermissions);


module.exports = router;

