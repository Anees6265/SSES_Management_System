const ActivityLog = require("../../models/activity/ActivityLog");
const mongoose = require("mongoose");

const escapeRegex = (str) => (str ? str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "");

/**
 * Build Date Range filter
 */
function buildDateQuery(dateRange, startDate, endDate) {
  const now = new Date();
  if (dateRange === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { $gte: start };
  }
  if (dateRange === "yesterday") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { $gte: start, $lt: end };
  }
  if (dateRange === "7days") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { $gte: start };
  }
  if (dateRange === "30days") {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { $gte: start };
  }
  if (startDate || endDate) {
    const q = {};
    if (startDate) q.$gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      q.$lte = e;
    }
    return q;
  }
  return null;
}

/**
 * GET /api/activity-logs
 * Fetch paginated activity logs with Option B (HOD department-scoping)
 */
exports.getActivityLogs = async (req, res) => {
  try {
    const userRole = String(req.user?.role || "").toLowerCase().trim();
    const isSuperOrAdmin = ["superadmin", "admin"].includes(userRole);
    const isDeptScoped = ["hod", "faculty", "placement_officer", "coordinator"].includes(userRole);

    if (!isSuperOrAdmin && !isDeptScoped) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Only Administrators and Department Staff can view activity logs.",
      });
    }

    const {
      page = 1,
      limit = 15,
      search = "",
      userName: userNameFilter = "",
      userId: userIdFilter = "",
      action = "",
      module: moduleFilter = "",
      role: roleFilter = "",
      isSecurityAlert = "",
      threatOnly = "false",
      dateRange = "",
      startDate = "",
      endDate = "",
      departmentId = "",
    } = req.query;

    const query = {};
    const baseStatsQuery = {};

    // 1. Department Scope Enforcement (Option B)
    if (isDeptScoped) {
      // Department staff can see their own department logs OR security alerts concerning their department
      const userDeptId = req.user?.departmentId;
      const userDeptName = req.user?.department;

      const hodFilters = [];
      if (userDeptId && mongoose.Types.ObjectId.isValid(userDeptId)) {
        hodFilters.push({ departmentId: new mongoose.Types.ObjectId(userDeptId) });
      }
      if (userDeptName) {
        hodFilters.push({ departmentName: new RegExp(`^${escapeRegex(userDeptName)}$`, "i") });
      }

      if (hodFilters.length > 0) {
        query.$or = hodFilters;
        baseStatsQuery.$or = hodFilters;
      }
    } else if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
      // Admin filter by specific department
      query.departmentId = new mongoose.Types.ObjectId(departmentId);
      baseStatsQuery.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    // 2. Specific User / Source Filter
    if (userIdFilter && mongoose.Types.ObjectId.isValid(userIdFilter)) {
      query.userId = new mongoose.Types.ObjectId(userIdFilter);
    } else if (userNameFilter && userNameFilter !== "ALL") {
      query.userName = new RegExp(escapeRegex(userNameFilter.trim()), "i");
    }

    // 3. Action Filter
    if (action && action !== "ALL") {
      query.action = action;
    }

    // 4. Module Filter
    if (moduleFilter && moduleFilter !== "ALL") {
      query.module = moduleFilter;
    }

    // 5. Role Filter
    if (roleFilter && roleFilter !== "ALL") {
      query.role = new RegExp(`^${escapeRegex(roleFilter)}$`, "i");
    }

    // 6. Security Threat filter
    if (threatOnly === "true" || isSecurityAlert === "true") {
      query.isSecurityAlert = true;
    } else if (isSecurityAlert === "false") {
      query.isSecurityAlert = false;
    }

    // 7. Search filter (User Name, Email, Description, IP)
    if (search && search.trim()) {
      const s = search.trim();
      const searchRegex = new RegExp(escapeRegex(s), "i");
      const searchConditions = [
        { userName: searchRegex },
        { userEmail: searchRegex },
        { description: searchRegex },
        { ipAddress: searchRegex },
        { threatType: searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // 7. Date Range Filter
    const dateQuery = buildDateQuery(dateRange, startDate, endDate);
    if (dateQuery) {
      query.createdAt = dateQuery;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    // Calculate Summary Stats for Dashboard Cards
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalToday, loginsToday, modificationsToday, blockedThreatsToday, totalAlerts] = await Promise.all([
      ActivityLog.countDocuments({ ...baseStatsQuery, createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ ...baseStatsQuery, action: "LOGIN", status: "SUCCESS", createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ ...baseStatsQuery, action: { $in: ["CREATE", "UPDATE", "DELETE"] }, createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ ...baseStatsQuery, isSecurityAlert: true, createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ ...baseStatsQuery, isSecurityAlert: true }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
        stats: {
          totalToday,
          loginsToday,
          modificationsToday,
          blockedThreatsToday,
          totalAlerts,
        },
      },
    });
  } catch (err) {
    console.error("[activityLogController] getActivityLogs error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch activity logs",
      error: err.message,
    });
  }
};

/**
 * GET /api/activity-logs/stats
 * Quick stats overview
 */
exports.getActivityStats = async (req, res) => {
  try {
    const userRole = String(req.user?.role || "").toLowerCase().trim();
    const isDeptScoped = ["hod", "faculty", "placement_officer", "coordinator"].includes(userRole);

    const baseQuery = {};
    if (isDeptScoped) {
      const userDeptId = req.user.departmentId;
      const userDeptName = req.user.department;
      const orClauses = [];
      if (userDeptId && mongoose.Types.ObjectId.isValid(userDeptId)) {
        orClauses.push({ departmentId: new mongoose.Types.ObjectId(userDeptId) });
      }
      if (userDeptName) {
        orClauses.push({ departmentName: new RegExp(`^${escapeRegex(userDeptName)}$`, "i") });
      }
      if (orClauses.length > 0) baseQuery.$or = orClauses;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalToday, loginsToday, modificationsToday, blockedThreatsToday, totalAlerts] = await Promise.all([
      ActivityLog.countDocuments({ ...baseQuery, createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ ...baseQuery, action: "LOGIN", status: "SUCCESS", createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ ...baseQuery, action: { $in: ["CREATE", "UPDATE", "DELETE"] }, createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ ...baseQuery, isSecurityAlert: true, createdAt: { $gte: todayStart } }),
      ActivityLog.countDocuments({ ...baseQuery, isSecurityAlert: true }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalToday,
        loginsToday,
        modificationsToday,
        blockedThreatsToday,
        totalAlerts,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/activity-logs/users
 * Returns distinct users present in activity logs
 */
exports.getActivityLogUsers = async (req, res) => {
  try {
    const userRole = String(req.user?.role || "").toLowerCase().trim();
    const isDeptScoped = ["hod", "faculty", "placement_officer", "coordinator"].includes(userRole);

    const baseQuery = {};
    if (isDeptScoped) {
      const userDeptId = req.user.departmentId;
      const userDeptName = req.user.department;
      const orClauses = [];
      if (userDeptId && mongoose.Types.ObjectId.isValid(userDeptId)) {
        orClauses.push({ departmentId: new mongoose.Types.ObjectId(userDeptId) });
      }
      if (userDeptName) {
        orClauses.push({ departmentName: new RegExp(`^${escapeRegex(userDeptName)}$`, "i") });
      }
      if (orClauses.length > 0) baseQuery.$or = orClauses;
    }

    const users = await ActivityLog.aggregate([
      {
        $match: {
          ...baseQuery,
          userName: { $nin: ["", null, "System", "Suspicious Client"] },
        },
      },
      {
        $group: {
          _id: "$userName",
          userName: { $first: "$userName" },
          userEmail: { $first: "$userEmail" },
          role: { $first: "$role" },
          departmentName: { $first: "$departmentName" },
          count: { $sum: 1 },
        },
      },
      { $sort: { userName: 1 } },
    ]);

    res.status(200).json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

