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
const departmentFilter = async (req, res, next) => {
  try {
    const { role, department, departmentId: jwtDeptId } = req.user;

    // Admin / Superadmin
    if (GLOBAL_ROLES.includes(role)) {
      const { departmentId, subDepartmentId } = req.query;

      if (subDepartmentId) {
        req.allowedSubDeptIds = [subDepartmentId];
        req.subDeptFilter = { subDepartmentId };
      } else if (departmentId) {
        const subDepts = await SubDepartment.find({ departmentId, isActive: true }).select("_id");
        const ids = subDepts.map((s) => s._id);
        req.allowedSubDeptIds = ids;
        req.subDeptFilter = ids.length ? { subDepartmentId: { $in: ids } } : null;
      } else {
        req.allowedSubDeptIds = null;
        req.subDeptFilter = null;
      }

      return next();
    }

    // Faculty / Other roles
    // Prefer departmentId ObjectId from JWT (Phase 2.2 migration)
    // Fall back to department name lookup for users created before the migration
    let resolvedDeptId = jwtDeptId || null;

    if (!resolvedDeptId) {
      if (!department) {
        return res.status(403).json({ message: "Department not assigned to your account." });
      }
      const dept = await Department.findOne({ name: department, isActive: true }).select("_id");
      if (!dept) {
        return res.status(403).json({ message: `Department '${department}' not found or inactive.` });
      }
      resolvedDeptId = dept._id.toString();
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

    if (req.query.subDepartmentId) {
      const requestedSubDeptId = req.query.subDepartmentId.toString();
      const isAllowed = ids.some((id) => id.toString() === requestedSubDeptId);
      if (!isAllowed) {
        return res.status(403).json({ message: "Access denied for this sub-department." });
      }
      req.subDeptFilter = { subDepartmentId: req.query.subDepartmentId };
    } else {
      req.subDeptFilter = { subDepartmentId: { $in: ids } };
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Department filter error", error: err.message });
  }
};

module.exports = { departmentFilter, GLOBAL_ROLES, invalidateDeptCache };
