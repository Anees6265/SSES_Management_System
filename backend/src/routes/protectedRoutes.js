const express = require("express");
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");

const router = express.Router();

// Route only accessible by Super Admin
router.get("/super-admin", verifyToken, checkRole(["Super Admin"]), (req, res) => {
    res.status(200).json({ message: "Welcome Super Admin!" });
});

// Route accessible by both Admin & Super Admin
router.get("/admin", verifyToken, checkRole(["Admin", "Super Admin"]), (req, res) => {
    res.status(200).json({ message: "Welcome Admin!" });
});

// Route accessible by Faculty, Admin & Super Admin
router.get("/faculty", verifyToken, checkRole(["Faculty", "Admin", "Super Admin"]), (req, res) => {
    res.status(200).json({ message: "Welcome Faculty!" });
});

module.exports = router;
