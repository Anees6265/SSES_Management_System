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
router.get("/google", passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account',
    })
  );
  
router.get("/google/callback", passport.authenticate('google', { session: false }), googleAuthCallback);

router.get("/me", verifyToken, usercontroller.getCurrentUser);
router.get("/all", verifyToken, usercontroller.getAllUsers);
router.delete("/delete/:id", verifyToken, usercontroller.deleteUser);

// Permissions Management
router.get("/permissions/all", verifyToken, usercontroller.getAllPossiblePermissions);
router.get("/permissions/:id", verifyToken, usercontroller.getUserPermissions);
router.put("/permissions/:id", verifyToken, usercontroller.updateUserPermissions);


module.exports = router;

