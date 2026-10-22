const mongoose = require("mongoose");
const Department = require("../models/department/Department");
const SubDepartment = require("../models/department/SubDepartment");
const Level = require("../models/department/Level");
const SubLevel = require("../models/department/SubLevel");

const normalizeStr = (str) => String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Resolves or auto-provisions Department, SubDepartment, Level, and SubLevel for a student.
 * Maps 'ssismGroup' (e.g. "ITEG", "MEG", "BEG", "B.TECH") to the matching department and subdepartment.
 *
 * @param {Object} params
 * @param {string} [params.ssismGroup] - Department/Group name from Excel (e.g. "ITEG", "MEG", "BEG", "B.TECH")
 * @param {string} [params.course]     - Course/Degree (e.g. "BCA", "BBA", "B.Com", "CSE", "IT", "Biotechnology")
 * @param {string} [params.branch]     - Branch or stream name
 * @param {string|mongoose.Types.ObjectId} [params.fallbackSubDepartmentId] - Optional fallback sub-department ID
 * @returns {Promise<{
 *   department: Object,
 *   subDepartment: Object,
 *   firstLevel: Object,
 *   firstSubLevel: Object
 * }>}
 */
async function resolveStudentDepartmentHierarchy({
  ssismGroup,
  course,
  branch,
  fallbackSubDepartmentId
} = {}) {
  // Pre-fetch all active departments and subdepartments
  const allDepartments = await Department.find({ isActive: true });
  const allSubDepartments = await SubDepartment.find({ isActive: true }).populate("departmentId");

  const normGroup = normalizeStr(ssismGroup);
  const normCourse = normalizeStr(course);
  const normBranch = normalizeStr(branch);

  let matchedDept = null;
  let matchedSubDept = null;

  // 1. Try matching Department by ssismGroup (Name, Code, or normalized string)
  if (normGroup) {
    matchedDept = allDepartments.find((d) => {
      const dNormName = normalizeStr(d.name);
      const dNormCode = normalizeStr(d.code);
      return (
        dNormName === normGroup ||
        dNormCode === normGroup ||
        dNormName.includes(normGroup) ||
        normGroup.includes(dNormName)
      );
    });

    // Also check if ssismGroup directly matches a subdepartment name (e.g. "TECH" or "UI/UX")
    if (!matchedDept) {
      const directSub = allSubDepartments.find((sd) => normalizeStr(sd.name) === normGroup);
      if (directSub) {
        matchedSubDept = directSub;
        matchedDept = directSub.departmentId;
      }
    }
  }

  // 2. Try matching Department by Course if not resolved yet
  if (!matchedDept && normCourse) {
    matchedDept = allDepartments.find((d) => {
      return (d.allowedCourses || []).some((c) => {
        const cNorm = normalizeStr(c.courseName);
        return cNorm === normCourse || normCourse.includes(cNorm) || cNorm.includes(normCourse);
      });
    });
  }

  // 3. Fallback to fallbackSubDepartmentId if provided
  if (!matchedDept && fallbackSubDepartmentId) {
    const fallbackSub = allSubDepartments.find((sd) => String(sd._id) === String(fallbackSubDepartmentId));
    if (fallbackSub) {
      matchedSubDept = fallbackSub;
      matchedDept = fallbackSub.departmentId;
    }
  }

  // 4. Ultimate fallback: First active department
  if (!matchedDept) {
    matchedDept = allDepartments[0];
  }

  if (!matchedDept) {
    throw new Error("No active Department configured in system. Please configure departments first.");
  }

  // 5. Match or Auto-create SubDepartment under the resolved Department
  if (!matchedSubDept) {
    const deptSubDepts = allSubDepartments.filter(
      (sd) => String(sd.departmentId?._id || sd.departmentId) === String(matchedDept._id)
    );

    // Try finding a subdepartment that explicitly lists this course or matches branch
    if (deptSubDepts.length > 0) {
      if (normBranch) {
        matchedSubDept = deptSubDepts.find((sd) => normalizeStr(sd.name) === normBranch);
      }
      if (!matchedSubDept && normCourse) {
        matchedSubDept = deptSubDepts.find((sd) =>
          (sd.allowedCourses || []).some((c) => normalizeStr(c) === normCourse)
        );
      }
      if (!matchedSubDept) {
        matchedSubDept = deptSubDepts[0];
      }
    }

    // If Department has no SubDepartment yet, auto-create one
    if (!matchedSubDept) {
      const subDeptName = `${matchedDept.name} General`;
      const deptCourseNames = (matchedDept.allowedCourses || []).map((c) => c.courseName).filter(Boolean);

      try {
        matchedSubDept = await SubDepartment.create({
          name: subDeptName,
          departmentId: matchedDept._id,
          allowedCourses: deptCourseNames.length > 0 ? deptCourseNames : [course || "General"],
          isActive: true
        });
      } catch (err) {
        if (err.code === 11000) {
          matchedSubDept = await SubDepartment.findOne({ departmentId: matchedDept._id, name: subDeptName });
        } else {
          throw err;
        }
      }
    }
  }

  // 6. Ensure Level 1 exists for this SubDepartment
  let firstLevel = await Level.findOne({ subDepartmentId: matchedSubDept._id, isActive: true }).sort({ order: 1 });
  if (!firstLevel) {
    try {
      firstLevel = await Level.create({
        name: "Level 1",
        order: 1,
        subDepartmentId: matchedSubDept._id,
        isActive: true
      });
    } catch (err) {
      if (err.code === 11000) {
        firstLevel = await Level.findOne({ subDepartmentId: matchedSubDept._id, order: 1 });
      } else {
        throw err;
      }
    }
  }

  // 7. Ensure SubLevel 1A exists for this Level
  let firstSubLevel = await SubLevel.findOne({ levelId: firstLevel._id, isActive: true }).sort({ order: 1 });
  if (!firstSubLevel) {
    try {
      firstSubLevel = await SubLevel.create({
        name: "1A",
        order: 1.1,
        levelId: firstLevel._id,
        isActive: true
      });
    } catch (err) {
      if (err.code === 11000) {
        firstSubLevel = await SubLevel.findOne({ levelId: firstLevel._id, order: 1.1 });
      } else {
        throw err;
      }
    }
  }

  return {
    department: matchedDept,
    subDepartment: matchedSubDept,
    firstLevel,
    firstSubLevel
  };
}

module.exports = {
  resolveStudentDepartmentHierarchy,
  normalizeStr
};
