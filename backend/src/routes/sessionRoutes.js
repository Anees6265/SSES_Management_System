const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const sessionController = require("../controllers/department/sessionController");

const adminRoles = ["superadmin", "admin"];
const auth = [verifyToken, checkRole(adminRoles)];

// GET /api/sessions — all sessions (active + inactive for admin view)
router.get("/", verifyToken, sessionController.getAllSessions);

// GET /api/sessions/active — get current active session
router.get("/active", verifyToken, sessionController.getActiveSession);

// GET /api/sessions/:id — get session by ID
router.get("/:id", verifyToken, sessionController.getSessionById);

// POST /api/sessions — create session
router.post("/", ...auth, sessionController.createSession);

// PUT /api/sessions/:id — update session
router.put("/:id", ...auth, sessionController.updateSession);

// PATCH /api/sessions/:id/activate — set this session as the active one
router.patch("/:id/activate", ...auth, async (req, res) => {
  try {
    const Session = require("../models/Session");
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const now = new Date();

    // Deactivate all other sessions and adjust any that had status 'active'
    const otherSessions = await Session.find({ _id: { $ne: req.params.id } });
    for (const other of otherSessions) {
      let changed = false;
      if (other.isActive) {
        other.isActive = false;
        changed = true;
      }
      if (other.status === 'active') {
        other.status = now > new Date(other.endDate) ? 'completed' : 'upcoming';
        changed = true;
      }
      if (changed) {
        await other.save();
      }
    }

    session.isActive = true;
    session.status = 'active';
    await session.save();

    res.status(200).json({ success: true, message: "Session activated successfully", data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/sessions/:id/deactivate — deactivate a session
router.patch("/:id/deactivate", ...auth, async (req, res) => {
  try {
    const Session = require("../models/Session");
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    session.isActive = false;
    if (session.status === 'active') {
      const now = new Date();
      session.status = now > new Date(session.endDate) ? 'completed' : 'archived';
    }
    await session.save();

    res.status(200).json({ success: true, message: "Session deactivated successfully", data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/sessions/:id/status — update session status
router.patch("/:id/status", ...auth, sessionController.updateSessionStatus);

// DELETE /api/sessions/:id — soft delete
router.delete("/:id", ...auth, sessionController.deleteSession);

module.exports = router;
