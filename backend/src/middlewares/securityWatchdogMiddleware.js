const { inspectSecurityThreat, logActivity } = require("../services/activityLoggerService");

/**
 * Determine module name from URL path
 */
function resolveModuleFromPath(path = "") {
  const p = path.toLowerCase();
  if (p.includes("/user") || p.includes("/roles")) return "User Management";
  if (p.includes("/student") || p.includes("/admitted")) return "Students";
  if (p.includes("/task")) return "Task Management";
  if (p.includes("/syllabus") || p.includes("/curriculum") || p.includes("/session")) return "Curriculum";
  if (p.includes("/reportcard")) return "Report Cards";
  if (p.includes("/placement") || p.includes("/company")) return "Placements";
  if (p.includes("/department") || p.includes("/level")) return "System";
  return "System";
}

/**
 * Security Watchdog & Audit Middleware
 * Intercepts attack signatures (Kali Linux tools, scanners, path probes) and auto-audits mutations.
 */
function securityWatchdogMiddleware(req, res, next) {
  // 1. Threat Detection Check (Kali Linux, SQLMap, Nikto, Burp Suite, Path Probing)
  const threat = inspectSecurityThreat(req);
  if (threat.isThreat) {
    return res.status(403).json({
      success: false,
      message: "Access Denied: Suspicious activity detected by SSES Security Shield.",
      blocked: true,
    });
  }

  // 2. Audit response only for Student Deletion as a fallback if not logged by controller
  if (req.method === "DELETE") {
    res.on("finish", () => {
      if (req._alreadyLoggedActivity) return;

      const path = (req.originalUrl || req.url || "").toLowerCase();
      const isStudentEndpoint = path.includes("/student");

      if (isStudentEndpoint && res.statusCode >= 200 && res.statusCode < 400 && req.user) {
        const userLabel = req.user.name || req.user.email || "User";
        const roleLabel = (req.user.role || "").toUpperCase();
        const description = `${roleLabel} ${userLabel} deleted student data via DELETE on ${req.originalUrl || req.url}`;

        logActivity({
          req,
          action: "DELETE",
          module: "Students",
          description,
          status: "SUCCESS",
          severity: "WARNING",
          meta: {
            statusCode: res.statusCode,
          },
        });
      }
    });
  }

  next();
}

module.exports = securityWatchdogMiddleware;

