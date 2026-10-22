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
  year,
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

  // 6. Determine Level Order from year (e.g. "1st Year" -> 1, "2nd Year" -> 2, etc.)
  let levelOrder = 1;
  const yrStr = String(year || "").trim().toLowerCase();
  if (yrStr.includes("2") || yrStr.includes("ii") || yrStr.startsWith("2nd")) levelOrder = 2;
  else if (yrStr.includes("3") || yrStr.includes("iii") || yrStr.startsWith("3rd")) levelOrder = 3;
  else if (yrStr.includes("4") || yrStr.includes("iv") || yrStr.startsWith("4th")) levelOrder = 4;

  const levelName = `Level ${levelOrder}`;
  let targetLevel = await Level.findOne({ subDepartmentId: matchedSubDept._id, order: levelOrder });
  if (!targetLevel) {
    targetLevel = await Level.findOne({ subDepartmentId: matchedSubDept._id, name: levelName });
  }
  if (!targetLevel) {
    try {
      targetLevel = await Level.create({
        name: levelName,
        order: levelOrder,
        subDepartmentId: matchedSubDept._id,
        isActive: true
      });
    } catch (err) {
      if (err.code === 11000) {
        targetLevel = await Level.findOne({ subDepartmentId: matchedSubDept._id, order: levelOrder });
      } else {
        throw err;
      }
    }
  }

  // 7. Ensure SubLevel exists for this Level (e.g. 1A, 2A, 3A, 4A)
  const subLevelName = `${levelOrder}A`;
  let targetSubLevel = await SubLevel.findOne({ levelId: targetLevel._id, name: subLevelName });
  if (!targetSubLevel) {
    try {
      targetSubLevel = await SubLevel.create({
        name: subLevelName,
        order: levelOrder + 0.1,
        levelId: targetLevel._id,
        isActive: true
      });
    } catch (err) {
      if (err.code === 11000) {
        targetSubLevel = await SubLevel.findOne({ levelId: targetLevel._id, name: subLevelName });
      } else {
        throw err;
      }
    }
  }

  return {
    department: matchedDept,
    subDepartment: matchedSubDept,
    firstLevel: targetLevel,
    firstSubLevel: targetSubLevel,
    targetLevel,
    targetSubLevel
  };
}

module.exports = {
  resolveStudentDepartmentHierarchy,
  normalizeStr
};
