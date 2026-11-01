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
    logActivity({
      req,
      action: "SECURITY_ALERT",
      module: "Auth",
      description: `BLOCKED THREAT: ${threat.reason}`,
      status: "BLOCKED",
      severity: "CRITICAL",
      isSecurityAlert: true,
      threatType: threat.threatType,
      meta: {
        rawUrl: req.originalUrl || req.url,
        method: req.method,
      },
    });

    return res.status(403).json({
      success: false,
      message: "Access Denied: Suspicious activity detected by SSES Security Shield.",
      blocked: true,
    });
  }

  // 2. Audit response on finish for mutating methods (POST, PUT, PATCH, DELETE)
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (mutatingMethods.includes(req.method)) {
    res.on("finish", () => {
      // Don't log if custom controller already logged or if it's health/internal/login route
      if (req._alreadyLoggedActivity) return;

      const path = req.originalUrl || req.url || "";
      // Exclude high-frequency polling/internal endpoints
      if (
        path.includes("/health") ||
        path.includes("/face-auth/verify") ||
        path.includes("/generate-ai-feedback") ||
        path.includes("/activity-logs")
      ) {
        return;
      }

      // Check if mutation was successful
      if (res.statusCode >= 200 && res.statusCode < 400 && req.user) {
        let action = "UPDATE";
        if (req.method === "POST") action = "CREATE";
        if (req.method === "DELETE") action = "DELETE";

        const moduleName = resolveModuleFromPath(path);
        const userLabel = req.user.name || req.user.email || "User";
        const roleLabel = (req.user.role || "").toUpperCase();

        const description = `${roleLabel} ${userLabel} executed ${req.method} on ${path}`;

        logActivity({
          req,
          action,
          module: moduleName,
          description,
          status: "SUCCESS",
          severity: action === "DELETE" ? "WARNING" : "INFO",
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

