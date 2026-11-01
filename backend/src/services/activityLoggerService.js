const ActivityLog = require("../models/activity/ActivityLog");

/**
 * Strips IPv6-mapped IPv4 prefix, trims, and normalizes
 */
function cleanIp(rawIp) {
  if (!rawIp || typeof rawIp !== "string") return "";
  let ip = rawIp.trim();
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }
  if (ip === "::1") {
    ip = "127.0.0.1";
  }
  return ip;
}

/**
 * Checks if an IP is a local loopback/internal dev address
 */
function isLoopback(ip) {
  if (!ip) return true;
  return ip === "127.0.0.1" || ip === "::1" || ip === "localhost" || ip === "0.0.0.0";
}

/**
 * Validates basic IPv4 or IPv6 format
 */
function isValidIp(ip) {
  if (!ip || typeof ip !== "string") return false;
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Pattern = /^[0-9a-fA-F:]+$/;
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

/**
 * Extracts clean IP address, handling proxy headers, Cloudflare, custom client headers, and IPv6 formatting
 */
function extractClientIp(req) {
  if (!req) return "127.0.0.1";

  // 1. Check custom public IP passed by frontend (crucial for local testing, dev environments, or internal NAT)
  const clientPublicIp = cleanIp(req.headers ? req.headers["x-client-public-ip"] : "");
  if (clientPublicIp && isValidIp(clientPublicIp) && !isLoopback(clientPublicIp)) {
    return clientPublicIp;
  }

  // 2. Cloudflare CDN (cf-connecting-ip)
  const cfIp = cleanIp(req.headers ? req.headers["cf-connecting-ip"] : "");
  if (cfIp && isValidIp(cfIp) && !isLoopback(cfIp)) {
    return cfIp;
  }

  // 3. X-Real-IP (Nginx / Apache reverse proxy)
  const realIp = cleanIp(req.headers ? req.headers["x-real-ip"] : "");
  if (realIp && isValidIp(realIp) && !isLoopback(realIp)) {
    return realIp;
  }

  // 4. Standard X-Forwarded-For (left-most non-loopback IP is the original client)
  const forwarded = req.headers ? req.headers["x-forwarded-for"] : "";
  if (forwarded) {
    const ips = String(forwarded).split(",").map(cleanIp).filter(isValidIp);
    const nonLocalIp = ips.find((ip) => !isLoopback(ip));
    if (nonLocalIp) return nonLocalIp;
    if (ips.length > 0) return ips[0];
  }

  // 5. True-Client-IP / X-Client-IP (Akamai, AWS, custom proxies)
  const trueClientIp = cleanIp(
    req.headers ? (req.headers["true-client-ip"] || req.headers["x-client-ip"]) : ""
  );
  if (trueClientIp && isValidIp(trueClientIp) && !isLoopback(trueClientIp)) {
    return trueClientIp;
  }

  // 6. Express req.ip (now functional with trust proxy enabled)
  const expressIp = cleanIp(req.ip);
  if (expressIp && isValidIp(expressIp) && !isLoopback(expressIp)) {
    return expressIp;
  }

  // 7. Socket remoteAddress
  const socketIp = cleanIp(req.socket?.remoteAddress);
  if (socketIp && isValidIp(socketIp) && !isLoopback(socketIp)) {
    return socketIp;
  }

  // If everything resolved to loopback, but we have a clientPublicIp, return that
  if (clientPublicIp && isValidIp(clientPublicIp)) {
    return clientPublicIp;
  }

  return expressIp || socketIp || "127.0.0.1";
}

/**
 * Parses Device and Operating System information from User-Agent
 */
function parseDeviceDetails(userAgent = "") {
  if (!userAgent) return "Unknown Device";
  const ua = userAgent.toLowerCase();

  // Attack tools / Automation signatures
  if (ua.includes("sqlmap")) return "Kali Linux / SQLMap Scanner";
  if (ua.includes("nikto")) return "Kali Linux / Nikto Scanner";
  if (ua.includes("burp")) return "Burp Suite Security Proxy";
  if (ua.includes("nmap")) return "Nmap Security Tool";
  if (ua.includes("hydra")) return "Hydra Brute-Force Tool";
  if (ua.includes("gobuster") || ua.includes("dirbuster")) return "Directory Brute-Forcer";
  if (ua.includes("metasploit")) return "Metasploit Framework";
  if (ua.includes("python-requests") || ua.includes("python-urllib")) return "Python Script / Automated Bot";
  if (ua.includes("curl/")) return "cURL Command Tool";
  if (ua.includes("postman")) return "Postman API Client";

  // Standard platforms
  let os = "Desktop";
  if (ua.includes("kali")) os = "Kali Linux";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("android")) os = "Android Mobile";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS Device";

  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome") && !ua.includes("chromium")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";

  return `${os} • ${browser}`;
}

/**
 * Detects suspicious hacking tools, automated vulnerability scanners, or path probing
 */
function inspectSecurityThreat(req) {
  if (!req) return { isThreat: false };

  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  const rawUrl = (req.originalUrl || req.url || "").toLowerCase();

  // 1. Known penetration testing / hacking tools signatures (Kali Linux & common tools)
  const attackToolSignatures = [
    { pattern: "sqlmap", type: "SQLMAP_ATTACK", label: "SQLMap Automated SQL Injection Scanner" },
    { pattern: "nikto", type: "NIKTO_SCANNER", label: "Nikto Web Vulnerability Scanner" },
    { pattern: "burpcollaborator", type: "BURP_SUITE", label: "Burp Suite Security Probe" },
    { pattern: "burp", type: "BURP_SUITE", label: "Burp Suite Proxy Scanner" },
    { pattern: "nmap", type: "NMAP_SCAN", label: "Nmap Network Scanner" },
    { pattern: "hydra", type: "HYDRA_BRUTE_FORCE", label: "Hydra Brute-Force Attacker" },
    { pattern: "dirbuster", type: "DIRBUSTER_SCAN", label: "DirBuster Directory Scanner" },
    { pattern: "gobuster", type: "GOBUSTER_SCAN", label: "Gobuster Directory Scanner" },
    { pattern: "wpscan", type: "WPSCAN_TOOL", label: "WPScan Vulnerability Scanner" },
    { pattern: "masscan", type: "MASSCAN_PROBE", label: "Masscan Port Scanner" },
    { pattern: "havij", type: "HAVIJ_INJECTION", label: "Havij SQL Injection Tool" },
    { pattern: "acunetix", type: "ACUNETIX_SCAN", label: "Acunetix Vulnerability Scanner" },
  ];

  for (const tool of attackToolSignatures) {
    if (userAgent.includes(tool.pattern)) {
      return {
        isThreat: true,
        threatType: tool.type,
        reason: `Automated attack tool detected: ${tool.label} via User-Agent (${req.headers["user-agent"]})`,
      };
    }
  }

  // 2. Sensitive files and directory probing
  const sensitiveProbes = [
    "/.env",
    "/.git",
    "/wp-admin",
    "/wp-login",
    "/phpmyadmin",
    "/etc/passwd",
    "/.aws",
    "/config.json",
    "/server.js",
    "/id_rsa",
    "/cmd.exe",
    "/eval-stdin.php",
  ];

  for (const probe of sensitiveProbes) {
    if (rawUrl.includes(probe)) {
      return {
        isThreat: true,
        threatType: "SUSPICIOUS_PATH_PROBE",
        reason: `Unauthorized attempt to probe sensitive server path: ${req.originalUrl || req.url}`,
      };
    }
  }

  return { isThreat: false };
}

/**
 * Asynchronous, non-blocking activity logger
 */
function logActivity({
  req = null,
  user = null,
  action,
  module = "System",
  description,
  status = "SUCCESS",
  severity = "INFO",
  isSecurityAlert = false,
  threatType = null,
  meta = {},
}) {
  setImmediate(async () => {
    try {
      const activeUser = user || req?.user || null;
      let userName = activeUser?.name || "";
      let userEmail = activeUser?.email || "";
      let userRole = activeUser?.role || "unknown";
      let userDept = activeUser?.department || "";
      let userDeptId = activeUser?.departmentId || null;

      // If user ID exists but name or email was not in token payload, hydrate from DB
      if ((!userName || !userEmail) && (activeUser?.id || activeUser?._id)) {
        const uId = activeUser.id || activeUser._id;
        try {
          const mongoose = require("mongoose");
          if (userRole === "student") {
            const studentDoc = await mongoose.model("Student").findById(uId).select("firstName lastName email departmentName subDepartmentId");
            if (studentDoc) {
              userName = `${studentDoc.firstName || ""} ${studentDoc.lastName || ""}`.trim() || studentDoc.email;
              userEmail = studentDoc.email || "";
              userDept = studentDoc.departmentName || "";
              userDeptId = studentDoc.subDepartmentId || null;
            }
          } else {
            const userDoc = await mongoose.model("User").findById(uId).select("name email role department departmentId");
            if (userDoc) {
              userName = userDoc.name || "";
              userEmail = userDoc.email || "";
              userRole = userDoc.role || userRole;
              userDept = userDoc.department || "";
              userDeptId = userDoc.departmentId || null;
            }
          }
        } catch (_) {}
      }

      if (!userName) {
        userName = isSecurityAlert ? "Suspicious Client" : "System";
      }

      const ipAddress = extractClientIp(req);
      const userAgent = req?.headers ? req.headers["user-agent"] || "" : "";
      const device = parseDeviceDetails(userAgent);

      await ActivityLog.create({
        userId: activeUser?.id || activeUser?._id || null,
        userName,
        userEmail,
        role: userRole,
        departmentId: userDeptId,
        departmentName: userDept,
        action,
        module,
        description,
        status,
        severity,
        isSecurityAlert,
        threatType,
        ipAddress,
        userAgent,
        device,
        meta: {
          ...meta,
          method: req?.method,
          path: req?.originalUrl || req?.url,
        },
      });
    } catch (err) {
      console.error("[activityLoggerService] Failed to record log:", err.message);
    }
  });
}

module.exports = {
  extractClientIp,
  parseDeviceDetails,
  inspectSecurityThreat,
  logActivity,
};

