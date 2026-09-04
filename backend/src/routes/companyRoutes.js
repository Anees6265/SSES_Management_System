const express = require("express");
const router = express.Router();
const placementController = require("../controllers/placement/placementController");
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");

const auth = [verifyToken];
const canManageCompanies = [
  verifyToken,
  checkRole(["superadmin", "placement_officer", "admin"])
];

// Public / Authenticated Read Routes
router.get("/", ...auth, placementController.getAllCompanies);
router.get("/check-duplicate", ...auth, placementController.checkCompanyDuplicate);
router.get("/by-name/:companyName", ...auth, placementController.getCompanyByName);
router.get("/:id", ...auth, placementController.getCompanyById);

// Placement Officer / Admin Management Routes
router.post("/", ...canManageCompanies, placementController.createCompany);
router.put("/:id", ...canManageCompanies, placementController.updateCompany);
router.patch("/:id/status", ...canManageCompanies, placementController.toggleCompanyStatus);

module.exports = router;
