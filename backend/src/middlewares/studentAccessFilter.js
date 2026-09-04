const Student = require("../models/student/Student");

/**
 * Middleware to restrict non-admin users (Faculty and HOD) from accessing
 * student records, creating students, or viewing sub-departments outside
 * of their authorized sub-department boundaries.
 */
const studentAccessFilter = async (req, res, next) => {
  try {
    // If no restricted allowedSubDeptIds exist, the user is superadmin/admin and has full access
    if (!req.allowedSubDeptIds) {
      return next();
    }

    const allowedIds = req.allowedSubDeptIds.map(id => id.toString());

    // 1. Check if there is a student ID in route parameters (e.g. :id, :studentId)
    const studentId = req.params.id || req.params.studentId;
    if (studentId) {
      const student = await Student.findById(studentId).select("subDepartmentId");
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      if (!allowedIds.includes(student.subDepartmentId.toString())) {
        return res.status(403).json({ message: "Access Denied: Student belongs to another department" });
      }
      return next();
    }

    // 2. Check if creating a student (POST request) with subDepartmentId in body
    if (req.method === "POST" && req.body && req.body.subDepartmentId) {
      if (!allowedIds.includes(req.body.subDepartmentId.toString())) {
        return res.status(403).json({ message: "Access Denied: Cannot create student in another department" });
      }
      return next();
    }

    // 3. Check if there's a subDepartmentId in route parameters or query string
    const subDeptParam = req.params.subDepartmentId || req.query.subDepartmentId;
    if (subDeptParam) {
      if (!allowedIds.includes(subDeptParam.toString())) {
        return res.status(403).json({ message: "Access Denied: sub-department access not permitted" });
      }
      return next();
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Access filter error", error: error.message });
  }
};

module.exports = { studentAccessFilter };
