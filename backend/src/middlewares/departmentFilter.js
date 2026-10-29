const SubDepartment = require("../models/department/SubDepartment");
const Department = require("../models/department/Department");

const GLOBAL_ROLES = ["superadmin", "admin"];

// In-memory cache: departmentId (string) -> { ids: ObjectId[], expiresAt: number }
// Eliminates 1-2 DB queries per faculty request.
// TTL: 5 minutes. Invalidated explicitly when departments/subdepartments change.
const _cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

const getCached = (departmentId) => {
  const entry = _cache.get(departmentId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(departmentId); return null; }
  return entry.ids;
};

const setCache = (departmentId, ids) => {
  _cache.set(departmentId, { ids, expiresAt: Date.now() + CACHE_TTL_MS });
};

// Call this whenever a Department or SubDepartment is created/updated/deleted
const invalidateDeptCache = (departmentId) => {
  if (departmentId) _cache.delete(departmentId.toString());
  else _cache.clear();
};

/**
 * Resolves allowed subDepartment IDs for the requesting user.
 *
 * superadmin / admin -> no restriction (req.subDeptFilter = null)
 *                       optionally accepts ?departmentId or ?subDepartmentId query param
 * faculty (others)   -> restricted to their own department (uses departmentId from JWT if present,
 *                       falls back to department name lookup for backward compatibility)
 *
 * Sets req.subDeptFilter = { subDepartmentId: { $in: [...] } } OR null
 * Sets req.allowedSubDeptIds = ObjectId[] OR null
 */
const isUiUxSubDepartment = async (subDeptId) => {
  if (!subDeptId) return false;
  try {
    const sd = await SubDepartment.findById(subDeptId).lean();
    const name = String(sd?.name || "").toUpperCase();
    return name.includes("UI/UX") || name.includes("UIUX");
  } catch (e) {
    return false;
  }
};

const isItegSubDepartment = async (subDeptId) => {
  if (!subDeptId) return false;
  try {
    const sd = await SubDepartment.findById(subDeptId).populate("departmentId").lean();
    return String(sd?.departmentId?.name || "").toUpperCase().includes("ITEG") || String(sd?.name || "").toUpperCase().includes("ITEG");
  } catch (e) {
    return false;
  }
};

const isItegDepartment = async (deptId) => {
  if (!deptId) return false;
  try {
    const d = await Department.findById(deptId).lean();
    return String(d?.name || "").toUpperCase().includes("ITEG");
  } catch (e) {
    return false;
  }
};

const departmentFilter = async (req, res, next) => {
  try {
    const { role, department, departmentId: jwtDeptId } = req.user;

    // Admin / Superadmin
    if (GLOBAL_ROLES.includes(role)) {
      const { departmentId, subDepartmentId } = req.query;

      if (subDepartmentId) {
        req.allowedSubDeptIds = [subDepartmentId];
        const isUiUx = await isUiUxSubDepartment(subDepartmentId);
        const isIteg = await isItegSubDepartment(subDepartmentId);
        if (isUiUx) {
          req.subDeptFilter = { $or: [{ subDepartmentId }, { isUIUX: true }] };
        } else if (isIteg) {
          req.subDeptFilter = { $or: [{ subDepartmentId }, { withITEG: true }] };
        } else {
          req.subDeptFilter = { subDepartmentId };
        }
      } else if (departmentId) {
        const subDepts = await SubDepartment.find({ departmentId, isActive: true }).select("_id");
        const ids = subDepts.map((s) => s._id);
        req.allowedSubDeptIds = ids;
        const isIteg = await isItegDepartment(departmentId);
        if (isIteg) {
          req.subDeptFilter = ids.length ? { $or: [{ subDepartmentId: { $in: ids } }, { withITEG: true }] } : { withITEG: true };
        } else {
          req.subDeptFilter = ids.length ? { subDepartmentId: { $in: ids } } : null;
        }
      } else {
        req.allowedSubDeptIds = null;
        req.subDeptFilter = null;
      }

      return next();
    }

    // Faculty / Other roles
    let resolvedDeptId = jwtDeptId || null;
    let resolvedDeptName = department || "";

    if (!resolvedDeptId && !resolvedDeptName && (req.user?.id || req.user?._id)) {
      try {
        const User = require("../models/user/user");
        const dbUser = await User.findById(req.user.id || req.user._id).select("department departmentId");
        if (dbUser) {
          if (dbUser.departmentId) resolvedDeptId = dbUser.departmentId.toString();
          if (dbUser.department) resolvedDeptName = dbUser.department;
          req.user.department = resolvedDeptName;
          req.user.departmentId = resolvedDeptId;
        }
      } catch (_) {}
    }

    if (!resolvedDeptId) {
      if (!resolvedDeptName) {
        return res.status(403).json({ message: "Department not assigned to your account." });
      }
      const dept = await Department.findOne({ name: resolvedDeptName, isActive: true }).select("_id name");
      if (!dept) {
        return res.status(403).json({ message: `Department '${resolvedDeptName}' not found or inactive.` });
      }
      resolvedDeptId = dept._id.toString();
      resolvedDeptName = dept.name;
    }

    // Check cache first
    let ids = getCached(resolvedDeptId.toString());

    if (!ids) {
      const subDepts = await SubDepartment.find({ departmentId: resolvedDeptId, isActive: true }).select("_id");
      if (!subDepts.length) {
        ids = [];
      } else {
        ids = subDepts.map((s) => s._id);
      }
      setCache(resolvedDeptId.toString(), ids);
    }

    req.allowedSubDeptIds = ids;

    const isIteg = String(resolvedDeptName || "").toUpperCase().includes("ITEG") || await isItegDepartment(resolvedDeptId);

    if (req.query.subDepartmentId) {
      const requestedSubDeptId = req.query.subDepartmentId.toString();
      const isAllowed = ids.some((id) => id.toString() === requestedSubDeptId);
      if (!isAllowed) {
        return res.status(403).json({ message: "Access denied for this sub-department." });
      }
      const isUiUx = await isUiUxSubDepartment(req.query.subDepartmentId);
      if (isUiUx) {
        req.subDeptFilter = { $or: [{ subDepartmentId: req.query.subDepartmentId }, { isUIUX: true }] };
      } else if (isIteg) {
        req.subDeptFilter = { $or: [{ subDepartmentId: req.query.subDepartmentId }, { withITEG: true }] };
      } else {
        req.subDeptFilter = { subDepartmentId: req.query.subDepartmentId };
      }
    } else {
      req.subDeptFilter = isIteg
        ? (ids.length ? { $or: [{ subDepartmentId: { $in: ids } }, { withITEG: true }] } : { withITEG: true })
        : { subDepartmentId: { $in: ids } };
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Department filter error", error: err.message });
  }
};

module.exports = { departmentFilter, GLOBAL_ROLES, invalidateDeptCache };
