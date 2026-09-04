const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/authMiddleware");
const sessionSyllabusController = require("../controllers/department/sessionSyllabusController");

const adminRoles = ["superadmin", "admin"];
const auth = [verifyToken, checkRole(adminRoles)];

// GET /api/session-syllabus — get all mappings
router.get("/", verifyToken, sessionSyllabusController.getAllMappings);

// GET /api/session-syllabus/:id — get mapping by ID
router.get("/:id", verifyToken, sessionSyllabusController.getMappingById);

// GET /api/session-syllabus/active/:sessionId/:subLevelId — get active syllabus for session and sublevel
router.get("/active/:sessionId/:subLevelId", verifyToken, sessionSyllabusController.getActiveSyllabus);

// GET /api/session-syllabus/overview/:sessionId — get curriculum overview for session
router.get("/overview/:sessionId", verifyToken, sessionSyllabusController.getSessionCurriculumOverview);

// POST /api/session-syllabus — create mapping
router.post("/", ...auth, sessionSyllabusController.createMapping);

// PUT /api/session-syllabus/:id — update mapping
router.put("/:id", ...auth, sessionSyllabusController.updateMapping);

// PATCH /api/session-syllabus/:id/deactivate — deactivate mapping
router.patch("/:id/deactivate", ...auth, sessionSyllabusController.deactivateMapping);

module.exports = router;