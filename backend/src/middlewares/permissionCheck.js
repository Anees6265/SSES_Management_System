// Checks that the authenticated user has a specific feature permission.
// Usage: requirePermission('Page_UserManagement', 'read')
//
// Falls back gracefully — if user has no permissions array (old token),
// superadmin and admin are allowed through by default.
const requirePermission = (feature, access) => (req, res, next) => {
  const { role, permissions } = req.user;

  // Superadmin always passes — they have all permissions
  if (role === "superadmin") return next();

  if (!permissions || permissions.length === 0) {
    // No permissions in token — block non-superadmin
    return res.status(403).json({ message: "Permission denied" });
  }

  const perm = permissions.find((p) => p.feature === feature);
  if (!perm || !perm.access.includes(access)) {
    return res.status(403).json({ message: `Permission denied: ${feature}:${access}` });
  }

  next();
};

module.exports = { requirePermission };
