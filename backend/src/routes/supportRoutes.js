const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const supportController = require("../controllers/support/supportController");

const staffRoles = [
  "superadmin",
  "admin",
  "faculty",
  "hod",
  "placement_officer",
  "coordinator",
];

router.get("/developers", verifyToken, checkRole(staffRoles), supportController.getSupportOverview);
router.get("/tickets", verifyToken, checkRole(staffRoles), supportController.getSupportTickets);
router.post("/tickets", verifyToken, checkRole(staffRoles), supportController.createSupportTicket);
router.post("/quick-mail", verifyToken, checkRole(staffRoles), supportController.createSupportTicket);
router.patch("/tickets/:id/status", verifyToken, checkRole(staffRoles), supportController.updateSupportTicketStatus);
router.post("/tickets/:id/comments", verifyToken, checkRole(staffRoles), supportController.addSupportTicketComment);

module.exports = router;

